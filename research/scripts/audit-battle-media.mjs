import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const LEDGER_PATH = 'research/candidates/battles.tsv';
const OUTPUT_PATH = 'research/candidates/battle-media-audit.json';

const TITLE_OVERRIDES = {
  'battle-bach-dang-1288': 'Battle of B\u1ea1ch \u0110\u1eb1ng (1288)',
  'battle-mohacs-1526': 'Battle of Moh\u00e1cs',
  'battle-alcacer-quibir-1578': 'Battle of Alc\u00e1cer Quibir',
  'siege-sevastopol-1854': 'Siege of Sevastopol (1854\u20131855)',
  'battle-koniggratz-1866': 'Battle of K\u00f6niggr\u00e4tz',
  'battle-singapore-1942': 'Fall of Singapore',
  'battle-hue-1968': 'Battle of Hu\u1ebf',
  'battle-grozny-1994': 'Battle of Grozny (1994\u20131995)',
  'battle-mosul-2016': 'Battle of Mosul (2016\u20132017)',
  'battle-abu-ageila-1967': 'Battle of Abu-Ageila',
  'battle-tuyuti-1866': 'Battle of Tuyut\u00ed',
  'battle-marawi-2017': 'Siege of Marawi',
  'battle-gate-pa-1864': 'Tauranga campaign',
  'battle-poitiers-1356': 'Battle of Poitiers',
  'siege-baghdad-1258': 'Siege of Baghdad',
  'siege-orleans-1429': 'Siege of Orl\u00e9ans (1428\u20131429)',
  'battle-aspern-essling-1809': 'Battle of Aspern\u2013Essling',
  'siege-jerusalem-637': 'First Muslim conquest of Jerusalem',
  'battle-la-forbie-1244': 'Battle of Forbie',
  'battle-mansurah-1250': 'Battle of Mansurah (1250)',
  'battle-watling-street-60': 'Boudican revolt',
  'battle-anchialus-917': 'Battle of Achelous (917)',
  'battle-indus-1221': 'Battle of the Indus',
  'battle-gravelines-1588': 'Battle of Gravelines',
  'battle-la-hogue-1692': 'Battles of Barfleur and La Hougue',
  'battle-prague-1757': 'Battle of \u0160t\u011brboholy',
  'battle-kolin-1757': 'Battle of Kol\u00edn',
  'battle-colenso-1899': 'Second Battle of Colenso',
  'battle-tel-el-kebir-1882': 'Battle of Tell El Kebir',
  'siege-delhi-1857': 'Siege of Delhi (1857)',
  'siege-odessa-1941': 'Siege of Odessa',
  'battle-korsun-1944': 'Battle of Korsun\u2013Cherkassy',
  'battle-pusan-perimeter-1950': 'Battle of the Pusan Perimeter',
  'battle-ammunition-hill-1967': 'Battle of Ammunition Hill',
};

const IMAGE_OVERRIDES = {
  'battle-goose-green-1982': 'Battle_of_Goose_Green.png',
  'battle-cuito-cuanavale-1987': 'Operation_Moduler_(Defensive_phase).svg',
  'battle-longewala-1971': 'Tank tracks during the Battle of Longewala in 1971.jpg',
  'battle-marawi-2017': 'Marawi crisis troops.jpg',
  'battle-gate-pa-1864': 'Attack at Gate P\u0101.jpg',
  'battle-poitiers-1356': 'Battle-poitiers(1356).jpg',
  'battle-lake-poyang-1363': '\u660e\u7956\u9131\u967d\u6ec5\u53cb\u8ad2\uff08\u5eff\u4e00\u53f2\u901a\u4fd7\u884d\u7fa9\uff09.jpg',
  'battle-naissus-269': 'GothicInvasions 267-269-en.svg',
  'battle-strasbourg-357': 'Battle of Argentoratum.svg',
  'battle-ajnadayn-634': 'Mohammad adil-Muslims Invasion of Syria.PNG',
  'siege-baghdad-1258': 'Baghdad 1258.jpg',
  'siege-orleans-1429': 'SiegeOfOrleans1429.jpg',
  'battle-talikota-1565': 'Battle of Raksas Tagdi 01.jpg',
  'battle-aspern-essling-1809': 'Archduke Charles, Duke of Teschen, with his Staff at the Battle of Aspern-Essling, 21\u201322 May 1809 (by Johann Peter Krafft, 1820).jpg',
  'battle-aegospotami-405bc': 'Battle of Aegospotami.png',
  'siege-jerusalem-637': 'Otto Clemens Fikentscher - Omar\'s arrival to Jerusalem (engraving).jpg',
  'battle-la-forbie-1244': 'La Forbie.jpg',
  'battle-mansurah-1250': 'Mansura.jpg',
  'battle-halidon-hill-1333': 'Charge of the Scots at Halidon Hill.jpg',
  'battle-sentinum-295bc': 'Carte TroisGuerreSamnite 298avJC.png',
  'battle-arginusae-406bc': 'Battle of Arginusae New Map.jpg',
  'battle-drepana-249bc': 'Battle of drepana map.png',
  'battle-watling-street-60': 'Schlacht an der Watling Street, schematisch.PNG',
  'battle-anchialus-917': 'Battle of Anchialos (917) es.svg',
  'battle-dyrrachium-1081': 'Bataille de Dyrrachion (1081) - BnF Latin 4915.jpg',
  'first-battle-tarain-1191': 'Prithvi Raj Chauhan (Edited).jpg',
  'battle-chandawar-1194': 'Photograph of an Indian miniature painting depicting Muhammad of Ghor of the Ghurid Dynasty, published in \'Tawarikh-i-Ghuri\' by Munshi Bulaqi Das Sahib (1881).jpg',
  'siege-xiangyang-1267': 'Trebuchet2.png',
  'battle-blue-waters-1362': 'Stamp 2012 Bytva Syni Vody (1).jpg',
  'battle-gravelines-1588': 'Battle of Gravelines, second stage Wellcome M0012866.jpg',
  'battle-chattanooga-1863': 'Battle of Chattanooga Thulstrup.jpg',
};

function pageTitleFromUrl(value) {
  const match = String(value).match(/\/wiki\/([^#?]+)/);
  if (!match) return '';
  return decodeURIComponent(match[1]).replace(/_/g, ' ');
}

function normalizeTitle(value) {
  return String(value || '').replace(/_/g, ' ').trim().toLowerCase();
}

function chunk(values, size) {
  const chunks = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function stripHtml(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

async function fetchJson(url) {
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SophismBattleResearch/0.1 (local curation script)',
      },
    });
    if (response.ok) {
      return response.json();
    }
    if (response.status === 429 || response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    throw new Error(`Fetch failed ${response.status}: ${url}`);
  }
  throw new Error(`Fetch failed after retries: ${url}`);
}

async function fetchEnwikiPages(titles) {
  const pages = new Map();

  for (const titleChunk of chunk(titles, 20)) {
    const url = new URL('https://en.wikipedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('format', 'json');
    url.searchParams.set('redirects', '1');
    url.searchParams.set('prop', 'pageimages|pageprops|extracts');
    url.searchParams.set('piprop', 'name|original');
    url.searchParams.set('exintro', '1');
    url.searchParams.set('explaintext', '1');
    url.searchParams.set('titles', titleChunk.join('|'));

    let data;
    try {
      data = await fetchJson(url);
    } catch (error) {
      console.warn(`Skipping English Wikipedia metadata chunk after retries: ${titleChunk.join(', ')}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      continue;
    }
    for (const page of Object.values(data.query?.pages || {})) {
      pages.set(page.title, page);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return pages;
}

async function fetchCommonsInfo(fileNames) {
  const files = new Map();

  for (const fileChunk of chunk(fileNames.filter(Boolean), 3)) {
    const url = new URL('https://commons.wikimedia.org/w/api.php');
    url.searchParams.set('action', 'query');
    url.searchParams.set('format', 'json');
    url.searchParams.set('prop', 'imageinfo');
    url.searchParams.set('iiprop', 'url|extmetadata');
    url.searchParams.set('titles', fileChunk.map((name) => `File:${name}`).join('|'));

    let data;
    try {
      data = await fetchJson(url);
    } catch {
      console.warn(`Skipping Commons metadata chunk after retries: ${fileChunk.join(', ')}`);
      await new Promise((resolve) => setTimeout(resolve, 1500));
      continue;
    }
    for (const page of Object.values(data.query?.pages || {})) {
      const info = page.imageinfo?.[0];
      const fileName = page.title.replace(/^File:/, '');
      const item = {
        pageTitle: page.title,
        descriptionUrl: info?.descriptionurl || '',
        url: info?.url || '',
        license: info?.extmetadata?.LicenseShortName?.value || '',
        licenseUrl: info?.extmetadata?.LicenseUrl?.value || '',
        artist: stripHtml(info?.extmetadata?.Artist?.value),
        credit: stripHtml(info?.extmetadata?.Credit?.value),
        objectName: stripHtml(info?.extmetadata?.ObjectName?.value),
      };
      files.set(fileName, item);
      files.set(fileName.replace(/ /g, '_'), item);
      files.set(normalizeTitle(fileName), item);
    }
    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  return files;
}

const lines = readFileSync(LEDGER_PATH, 'utf8').trimEnd().split('\n');
const header = lines[0].split('\t');
const index = Object.fromEntries(header.map((name, column) => [name, column]));
const rows = lines.slice(1).map((line) => {
  const cells = line.split('\t');
  return Object.fromEntries(header.map((name, column) => [name, cells[column]]));
});

const cachedAudit = existsSync(OUTPUT_PATH)
  ? JSON.parse(readFileSync(OUTPUT_PATH, 'utf8'))
  : [];
const cachedById = new Map(cachedAudit
  .filter((row) => row.wikidataId && row.imageSrc && row.imageSourceUrl && row.imageLicense)
  .map((row) => [row.id, row]));
const rowsToFetch = rows.filter((row) => !cachedById.has(row.id));

const titles = rowsToFetch.map((row) => TITLE_OVERRIDES[row.id] || pageTitleFromUrl(row.event_source_target));
const pagesByTitle = await fetchEnwikiPages(titles);
const pageByRequestedTitle = new Map();

for (const page of pagesByTitle.values()) {
  pageByRequestedTitle.set(page.title, page);
  pageByRequestedTitle.set(normalizeTitle(page.title), page);
}

const pageImages = rowsToFetch.map((row) => {
  const requestedTitle = TITLE_OVERRIDES[row.id] || pageTitleFromUrl(row.event_source_target);
  const page = pageByRequestedTitle.get(requestedTitle)
    || pageByRequestedTitle.get(normalizeTitle(requestedTitle));
  return {
    ...row,
    requestedTitle,
    resolvedTitle: page?.title || '',
    wikidataId: page?.pageprops?.wikibase_item || '',
    pageImage: IMAGE_OVERRIDES[row.id] || page?.pageimage || '',
    originalImage: IMAGE_OVERRIDES[row.id] ? '' : page?.original?.source || '',
    extract: page?.extract || '',
  };
});

const commonsByFile = await fetchCommonsInfo([...new Set(pageImages.map((row) => row.pageImage).filter(Boolean))]);
const fetchedAudit = pageImages.map((row) => {
  const commons = commonsByFile.get(row.pageImage) || commonsByFile.get(normalizeTitle(row.pageImage)) || {};
  const fallbackSourceUrl = row.pageImage
    ? `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(row.pageImage).replace(/%20/g, '_')}`
    : '';
  return {
    id: row.id,
    title: row.title,
    requestedTitle: row.requestedTitle,
    resolvedTitle: row.resolvedTitle,
    wikidataId: row.wikidataId,
    pageImage: row.pageImage,
    imageSrc: row.originalImage || commons.url || '',
    imageSourceUrl: commons.descriptionUrl || fallbackSourceUrl,
    imageLicense: commons.license || (row.pageImage ? 'See Wikimedia Commons source page' : ''),
    imageAttribution: commons.artist || commons.credit || commons.objectName || '',
    extract: row.extract,
  };
});

const fetchedById = new Map(fetchedAudit.map((row) => [row.id, row]));
const audit = rows.map((row) => fetchedById.get(row.id) || cachedById.get(row.id) || {
  id: row.id,
  title: row.title,
  requestedTitle: TITLE_OVERRIDES[row.id] || pageTitleFromUrl(row.event_source_target),
  resolvedTitle: '',
  wikidataId: '',
  pageImage: '',
  imageSrc: '',
  imageSourceUrl: '',
  imageLicense: '',
  imageAttribution: '',
  extract: '',
});

writeFileSync(OUTPUT_PATH, `${JSON.stringify(audit, null, 2)}\n`);

const missingImage = audit.filter((row) => !row.imageSrc || !row.imageSourceUrl || !row.imageLicense);
const missingWikidata = audit.filter((row) => !row.wikidataId);
console.log(`Wrote ${OUTPUT_PATH}`);
console.log(`Rows: ${audit.length}`);
console.log(`Missing image metadata: ${missingImage.length}`);
for (const row of missingImage.slice(0, 20)) {
  console.log(`- ${row.id}: ${row.title}`);
}
console.log(`Missing Wikidata ids: ${missingWikidata.length}`);
