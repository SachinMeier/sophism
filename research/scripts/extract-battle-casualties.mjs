import { readFileSync, writeFileSync } from 'node:fs';

const SOURCE_URL = 'https://en.wikipedia.org/wiki/List_of_battles_by_casualties';
const LEDGER_PATH = 'research/candidates/battles.tsv';

function decodeEntities(value) {
  return String(value)
    .replace(/&#(x?[0-9a-fA-F]+);/g, (_, number) => {
      const codePoint = number[0].toLowerCase() === 'x'
        ? parseInt(number.slice(1), 16)
        : parseInt(number, 10);
      return String.fromCodePoint(codePoint);
    })
    .replace(/&nbsp;|&#160;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&ndash;|&#8211;/g, '-')
    .replace(/&mdash;|&#8212;/g, '-')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'");
}

function cleanHtml(value) {
  return decodeEntities(
    String(value)
      .replace(/<sup[\s\S]*?<\/sup>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?\s*>/gi, '; ')
      .replace(/<[^>]+>/g, ' '),
  )
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u201c\u201d]/g, '"')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function normalize(value) {
  return cleanHtml(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function slugFromWikiUrl(value) {
  const match = String(value).match(/\/wiki\/([^#?]+)/);
  if (!match) return '';
  return decodeURIComponent(match[1])
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/_/g, ' ')
    .trim();
}

function casualtyDisplay(cells) {
  if (cells.length >= 5) {
    const high = cleanHtml(cells[3]);
    const low = cleanHtml(cells[4]);
    if (high && low && high !== low) {
      return `Low est. ${low}; high est. ${high}`;
    }
    return high || low;
  }

  return cleanHtml(cells[3]);
}

function buildCasualtyIndex(html) {
  const rowsByKey = new Map();
  const tables = [...html.matchAll(/<table[^>]*class="[^"]*wikitable[^"]*"[\s\S]*?<\/table>/g)]
    .map((match) => match[0]);

  for (const table of tables) {
    const rows = table.matchAll(/<tr[\s\S]*?<\/tr>/g);

    for (const rowMatch of rows) {
      const row = rowMatch[0];
      const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((match) => match[1]);
      if (cells.length < 4) continue;

      const firstCell = cells[0];
      const link = firstCell.match(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
      if (!link) continue;

      const title = cleanHtml(firstCell);
      const casualties = casualtyDisplay(cells);
      if (!title || !casualties) continue;

      const item = {
        title,
        casualties,
        source: SOURCE_URL,
      };

      rowsByKey.set(`slug:${slugFromWikiUrl(link[1])}`, item);
      rowsByKey.set(`title:${normalize(title)}`, item);
    }
  }

  return rowsByKey;
}

function matchCasualty(row, indexByKey, headerIndex) {
  const keys = [
    `slug:${slugFromWikiUrl(row[headerIndex.event_source_target])}`,
    `title:${normalize(row[headerIndex.title])}`,
  ];

  return keys.map((key) => indexByKey.get(key)).find(Boolean) || null;
}

const response = await fetch(SOURCE_URL);
if (!response.ok) {
  throw new Error(`Failed to fetch ${SOURCE_URL}: ${response.status}`);
}

const html = await response.text();
const indexByKey = buildCasualtyIndex(html);
const lines = readFileSync(LEDGER_PATH, 'utf8').trimEnd().split('\n');
const header = lines[0].split('\t');
const headerIndex = Object.fromEntries(header.map((name, index) => [name, index]));

for (const required of ['title', 'casualties', 'casualties_status', 'event_source_target']) {
  if (!(required in headerIndex)) {
    throw new Error(`Missing required ledger column: ${required}`);
  }
}

let matched = 0;
const misses = [];
const output = [lines[0]];

for (const line of lines.slice(1)) {
  const row = line.split('\t');
  const hit = matchCasualty(row, indexByKey, headerIndex);

  if (hit) {
    row[headerIndex.casualties] = hit.casualties;
    row[headerIndex.casualties_status] = 'draft-from-casualty-list;needs-cross-check';
    matched += 1;
  } else {
    misses.push(`${row[headerIndex.title]} (${row[headerIndex.event_source_target]})`);
  }

  output.push(row.join('\t'));
}

writeFileSync(LEDGER_PATH, `${output.join('\n')}\n`);

console.log(`Updated ${matched} rows in ${LEDGER_PATH}.`);
console.log(`Unmatched rows: ${misses.length}`);
for (const miss of misses) {
  console.log(`- ${miss}`);
}
