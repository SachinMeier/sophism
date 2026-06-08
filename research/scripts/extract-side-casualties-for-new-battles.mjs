import { readFileSync, writeFileSync } from 'node:fs';

const TSV_PATH = 'research/candidates/battles.tsv';
const DETAILS_PATH = 'research/candidates/battle-details.json';
const START_RANK = Number(process.argv[2] || 368);

function pageTitleFromUrl(value) {
  const match = String(value).match(/\/wiki\/([^#?]+)/);
  return match ? decodeURIComponent(match[1]).replace(/_/g, ' ') : '';
}

function readRows() {
  const lines = readFileSync(TSV_PATH, 'utf8').trimEnd().split('\n');
  const header = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    return Object.fromEntries(header.map((name, index) => [name, cells[index] || '']));
  });
}

function braceDelta(value) {
  const opens = String(value).match(/{{/g)?.length || 0;
  const closes = String(value).match(/}}/g)?.length || 0;
  return opens - closes;
}

function extractParam(wikitext, name) {
  const lines = String(wikitext).split('\n');
  const paramPattern = new RegExp(`^\\|\\s*${name}\\s*=\\s*(.*)$`, 'i');
  let collecting = false;
  let depth = 0;
  const collected = [];

  for (const line of lines) {
    if (!collecting) {
      const match = line.match(paramPattern);
      if (!match) continue;
      collecting = true;
      collected.push(match[1]);
      depth += braceDelta(match[1]);
      continue;
    }

    if (depth <= 0 && (/^\|\s*[\w ]+\s*=/.test(line) || /^}}/.test(line))) {
      break;
    }
    collected.push(line);
    depth += braceDelta(line);
  }

  return collected.join('\n').trim();
}

function simplifyTemplate(name, value) {
  const pattern = new RegExp(`{{\\s*${name}\\s*\\|([^{}]*)}}`, 'gi');
  return value.replace(pattern, (_, inner) => inner.split('|').filter(Boolean).pop() || '');
}

function cleanCasualtyValue(raw) {
  let value = String(raw || '');
  value = value
    .replace(/<ref[\s\S]*?<\/ref>/gi, '')
    .replace(/<ref[^>]*\/>/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<br\s*\/?>/gi, '; ')
    .replace(/\n[*#;:]?/g, '; ')
    .replace(/\[\[([^|\]]+)\|([^\]]+)]]/g, '$2')
    .replace(/\[\[([^\]]+)]]/g, '$1');

  for (const name of ['nowrap', 'small', 'formatnum', 'circa', 'c.', 'lang', 'ill']) {
    value = simplifyTemplate(name, value);
  }

  value = value
    .replace(/{{\s*(ubl|plainlist|unbulleted list|bulleted list)\s*\|/gi, '')
    .replace(/{{\s*flagicon\s*\|[^{}]*}}/gi, '')
    .replace(/{{\s*flag\s*\|([^{}|]+)(?:\|[^{}]*)?}}/gi, '$1')
    .replace(/{{\s*nowrap begin\s*}}|{{\s*nowrap end\s*}}/gi, '')
    .replace(/'''?/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&ndash;|–/g, '-')
    .replace(/&mdash;|—/g, '-')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s*;\s*/g, '; ')
    .replace(/\s+/g, ' ')
    .replace(/;\s*;/g, ';')
    .replace(/^;\s*/, '')
    .replace(/\s*;\s*$/, '')
    .trim();

  if (!value || value.length > 260) return '';
  if (/[{}[\]<>]/.test(value)) return '';
  if (/unknown|not known|see above/i.test(value)) return '';
  return value;
}

async function fetchWikitext(title) {
  const url = new URL('https://en.wikipedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('format', 'json');
  url.searchParams.set('redirects', '1');
  url.searchParams.set('prop', 'revisions');
  url.searchParams.set('rvprop', 'content');
  url.searchParams.set('rvslots', 'main');
  url.searchParams.set('titles', title);

  for (let attempt = 0; attempt < 6; attempt += 1) {
    const response = await fetch(url, {
      headers: { 'User-Agent': 'SophismBattleResearch/0.1 (local curation script)' },
    });
    if (response.ok) {
      const data = await response.json();
      const page = Object.values(data.query?.pages || {})[0];
      return page?.revisions?.[0]?.slots?.main?.['*'] || '';
    }
    if (response.status === 429 || response.status >= 500) {
      await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      continue;
    }
    throw new Error(`Fetch failed ${response.status}: ${title}`);
  }
  throw new Error(`Fetch failed after retries: ${title}`);
}

const rows = readRows().filter((row) => Number(row.rank) >= START_RANK);
const details = JSON.parse(readFileSync(DETAILS_PATH, 'utf8'));
const applied = [];
const skipped = [];

for (const row of rows) {
  const detail = details[row.id];
  if (!detail || detail.casualties) continue;

  const title = pageTitleFromUrl(row.event_source_target);
  let wikitext = '';
  try {
    wikitext = await fetchWikitext(title);
  } catch (error) {
    skipped.push(`${row.id} (${error.message})`);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    continue;
  }
  const casualty1 = cleanCasualtyValue(extractParam(wikitext, 'casualties1'));
  const casualty2 = cleanCasualtyValue(extractParam(wikitext, 'casualties2'));

  if (casualty1 && casualty2) {
    detail.casualties = `${detail.combatants[0]}: ${casualty1}; ${detail.combatants[1]}: ${casualty2}`;
    applied.push(`${row.id}: ${detail.casualties}`);
  } else {
    skipped.push(row.id);
  }

  await new Promise((resolve) => setTimeout(resolve, 1000));
}

writeFileSync(DETAILS_PATH, `${JSON.stringify(details, null, 2)}\n`);

console.log(`Applied side casualty splits: ${applied.length}`);
for (const line of applied) console.log(`- ${line}`);
console.log(`Skipped without clean side split: ${skipped.length}`);
