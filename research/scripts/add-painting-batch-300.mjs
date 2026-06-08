import { readFileSync, writeFileSync } from 'node:fs';

function argValue(name, fallback) {
  const match = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return match ? match.slice(name.length + 3) : fallback;
}

const CANDIDATES_PATH = argValue('candidates', 'research/candidates/paintings-batch-300.json');
const AUDIT_PATH = argValue('audit', 'research/candidates/painting-media-audit-300.json');
const DATA_PATH = 'data/paintings.json';

const COMMONS_LICENSE = 'Public domain or freely licensed via Wikimedia Commons';
const FAIR_USE_LICENSE = 'Fair use in source context; replace with licensed image before production if needed';
const USER_AGENT = 'SophismFlashcards/1.0 (dataset curation; contact: local research script)';

const promote = process.argv.includes('--promote');

function loadJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

async function apiQuery(titles, attempt = 0) {
  const params = new URLSearchParams({
    action: 'query',
    titles: titles.join('|'),
    prop: 'pageimages|pageprops',
    piprop: 'thumbnail|original|name',
    pithumbsize: '1280',
    redirects: '1',
    format: 'json',
    formatversion: '2',
  });
  const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (response.status === 429 && attempt < 5) {
    const wait = Number(response.headers.get('retry-after')) * 1000 || (attempt + 1) * 5000;
    await new Promise((resolve) => setTimeout(resolve, wait));
    return apiQuery(titles, attempt + 1);
  }
  if (!response.ok) throw new Error(`API ${response.status} for ${titles[0]}...`);
  return response.json();
}

// Map every requested title (following redirects/normalization) to its page object.
async function fetchPages(titles) {
  const byRequestedTitle = new Map();
  for (let i = 0; i < titles.length; i += 25) {
    const chunk = titles.slice(i, i + 25);
    const body = await apiQuery(chunk);
    const normalized = new Map((body?.query?.normalized || []).map((n) => [n.from, n.to]));
    const redirected = new Map((body?.query?.redirects || []).map((r) => [r.from, r.to]));
    const pages = new Map((body?.query?.pages || []).map((p) => [p.title, p]));
    for (const requested of chunk) {
      let title = normalized.get(requested) || requested;
      const seen = new Set();
      while (redirected.has(title) && !seen.has(title)) {
        seen.add(title);
        title = redirected.get(title);
      }
      const page = pages.get(title);
      if (page && !page.missing) byRequestedTitle.set(requested, page);
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return byRequestedTitle;
}

async function headOk(url) {
  const response = await fetch(url, { method: 'HEAD', headers: { 'User-Agent': USER_AGENT } });
  return response.ok;
}

const JUNK_IMAGE = /commons-logo|question_book|edit-icon|wiki_letter|ambox|padlock|magnify|red_pencil|crystal_clear|symbol_|disambig|p_vip|star_full|folder_hexagonal|searchtool|text_document|nuvola|gnome|increase2|decrease2|\.svg$/i;

// Page-order image list (action=parse), for articles whose lead image is non-free
// and therefore invisible to prop=pageimages.
async function leadImageFile(title, attempt = 0) {
  const params = new URLSearchParams({
    action: 'parse',
    page: title,
    prop: 'images',
    redirects: '1',
    format: 'json',
    formatversion: '2',
  });
  const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (response.status === 429 && attempt < 5) {
    await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 5000));
    return leadImageFile(title, attempt + 1);
  }
  if (!response.ok) return null;
  const body = await response.json();
  const images = body?.parse?.images || [];
  return { file: images.find((file) => !JUNK_IMAGE.test(file)) || null, resolvedTitle: body?.parse?.title || title };
}

// Resolve a File: name (local enwiki or Commons) to a display URL.
async function imageInfo(fileName, attempt = 0) {
  const params = new URLSearchParams({
    action: 'query',
    titles: `File:${fileName}`,
    prop: 'imageinfo',
    iiprop: 'url|size',
    iiurlwidth: '1280',
    format: 'json',
    formatversion: '2',
  });
  const response = await fetch(`https://en.wikipedia.org/w/api.php?${params}`, {
    headers: { 'User-Agent': USER_AGENT },
  });
  if (response.status === 429 && attempt < 5) {
    await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 5000));
    return imageInfo(fileName, attempt + 1);
  }
  if (!response.ok) return null;
  const body = await response.json();
  const info = body?.query?.pages?.[0]?.imageinfo?.[0];
  if (!info) return null;
  const isCommons = String(info.url).includes('/wikipedia/commons/');
  // Commons originals can be huge; use the 1280 thumb there. Fair-use locals are small already.
  const src = isCommons && info.thumburl && info.width > 1280 ? info.thumburl : info.url;
  return { src };
}

function fileSourceUrl(src, fileName) {
  const encoded = encodeURIComponent(fileName.replace(/ /g, '_'));
  if (src.includes('/wikipedia/commons/')) {
    return { sourceUrl: `https://commons.wikimedia.org/wiki/File:${encoded}`, license: COMMONS_LICENSE };
  }
  return { sourceUrl: `https://en.wikipedia.org/wiki/File:${encoded}`, license: FAIR_USE_LICENSE };
}

async function main() {
  const candidates = loadJson(CANDIDATES_PATH);
  const existing = loadJson(DATA_PATH);

  // Preflight: id and per-series order uniqueness across existing + candidates.
  const ids = new Set(existing.map((card) => card.id));
  const orders = new Map();
  for (const card of existing) {
    const key = card.details.series.key;
    if (!orders.has(key)) orders.set(key, new Set());
    orders.get(key).add(card.details.series.order);
  }
  const labelByKey = new Map();
  const artistByKey = new Map();
  for (const card of existing) {
    labelByKey.set(card.details.series.key, card.details.series.label);
    artistByKey.set(card.details.series.key, card.details.artist);
  }
  const problems = [];
  for (const candidate of candidates) {
    const id = `painting-${candidate.slug}`;
    if (ids.has(id)) problems.push(`duplicate id ${id}`);
    ids.add(id);
    if (!orders.has(candidate.artistKey)) orders.set(candidate.artistKey, new Set());
    if (orders.get(candidate.artistKey).has(candidate.order)) {
      problems.push(`duplicate series order ${candidate.order} in ${candidate.artistKey}`);
    }
    orders.get(candidate.artistKey).add(candidate.order);
    if (candidate.gloss.length > 240) problems.push(`${id} gloss is ${candidate.gloss.length} chars`);
  }
  if (problems.length) {
    console.error('Preflight failed:');
    for (const problem of problems) console.error(`- ${problem}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Preflight passed for ${candidates.length} candidates.`);

  const allTitles = [...new Set(candidates.flatMap((candidate) => candidate.wikipedia))];
  const pagesByTitle = await fetchPages(allTitles);

  const audit = [];
  for (const candidate of candidates) {
    const id = `painting-${candidate.slug}`;
    // The source page is the first existing article, image or not.
    let sourcePage = null;
    for (const title of candidate.wikipedia) {
      const found = pagesByTitle.get(title);
      if (found) {
        sourcePage = found;
        break;
      }
    }
    if (!sourcePage) {
      audit.push({ id, status: 'no-article', tried: candidate.wikipedia });
      console.log(`MISS  ${id} (${candidate.wikipedia.join(' | ')})`);
      continue;
    }

    // Image: explicit override > free lead image > page-order image list (fair use).
    let src = '';
    let fileName = candidate.imageFile || '';
    if (fileName) {
      const info = await imageInfo(fileName);
      src = info?.src || '';
    } else if (sourcePage.thumbnail?.source) {
      src = sourcePage.thumbnail.source;
      fileName = sourcePage.pageimage || '';
    } else {
      const lead = await leadImageFile(sourcePage.title);
      if (lead?.file) {
        fileName = lead.file;
        const info = await imageInfo(fileName);
        src = info?.src || '';
      }
    }
    if (!src) {
      audit.push({ id, status: 'no-image', resolvedTitle: sourcePage.title, tried: candidate.wikipedia });
      console.log(`MISS  ${id} (${sourcePage.title}: no usable image)`);
      continue;
    }

    const { sourceUrl, license } = fileSourceUrl(src, fileName);
    const ok = await headOk(src);
    const qid = candidate.skipWikidata ? '' : sourcePage.pageprops?.wikibase_item || '';
    audit.push({
      id,
      status: ok ? 'ok' : 'image-head-failed',
      resolvedTitle: sourcePage.title,
      imageFile: fileName,
      src,
      sourceUrl,
      license,
      wikidata: qid,
    });
    console.log(`${ok ? 'OK   ' : 'HEAD!'} ${id} -> ${fileName} [${license === COMMONS_LICENSE ? 'commons' : 'fair-use'}]`);
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  writeFileSync(AUDIT_PATH, `${JSON.stringify(audit, null, 2)}\n`);
  const misses = audit.filter((row) => row.status !== 'ok');
  console.log(`Audit written: ${audit.length} rows, ${misses.length} need attention.`);

  if (!promote) {
    console.log('Run with --promote to write data/paintings.json once the audit is clean.');
    return;
  }
  if (misses.length) {
    console.error('Refusing to promote with unresolved audit rows.');
    process.exitCode = 1;
    return;
  }

  const auditById = new Map(audit.map((row) => [row.id, row]));
  const cards = candidates.map((candidate) => {
    const id = `painting-${candidate.slug}`;
    const media = auditById.get(id);
    // Keep display name and series label consistent with existing cards for reused artists.
    const artist = artistByKey.get(candidate.artistKey) || candidate.artist;
    const label = labelByKey.get(candidate.artistKey) || candidate.artist;
    const sources = [
      { label: 'Wikipedia', url: `https://en.wikipedia.org/wiki/${encodeURIComponent(media.resolvedTitle.replace(/ /g, '_'))}` },
    ];
    if (media.wikidata) {
      sources.push({ label: 'Wikidata', url: `https://www.wikidata.org/wiki/${media.wikidata}` });
    }
    return {
      id,
      dataset: 'paintings',
      title: candidate.title,
      image: {
        src: media.src,
        alt: `${artist}'s ${candidate.title}`,
        sourceUrl: media.sourceUrl,
        license: media.license,
        attribution: artist,
      },
      details: {
        artist,
        year: candidate.year,
        century: candidate.century,
        movement: candidate.movement,
        series: { key: candidate.artistKey, label, order: candidate.order },
        gloss: candidate.gloss,
      },
      sources,
    };
  });

  writeFileSync(DATA_PATH, `${JSON.stringify([...existing, ...cards], null, 2)}\n`);
  console.log(`Promoted ${cards.length} cards; paintings.json now has ${existing.length + cards.length} cards.`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
