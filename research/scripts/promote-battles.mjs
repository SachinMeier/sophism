import { readFileSync, writeFileSync } from 'node:fs';

const LEDGER_PATH = 'research/candidates/battles.tsv';
const MEDIA_AUDIT_PATH = 'research/candidates/battle-media-audit.json';
const DETAILS_PATH = 'research/candidates/battle-details.json';
const OUTPUT_PATH = 'data/battles.json';
const CASUALTY_LIST_URL = 'https://en.wikipedia.org/wiki/List_of_battles_by_casualties';

function readTsv(path) {
  const lines = readFileSync(path, 'utf8').trimEnd().split('\n');
  const header = lines[0].split('\t');
  return lines.slice(1).map((line) => {
    const cells = line.split('\t');
    return Object.fromEntries(header.map((name, index) => [name, cells[index] || '']));
  });
}

function titleToWikiUrl(title) {
  return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`;
}

function cleanValue(value) {
  let cleaned = String(value || '')
    .replace(/\s+-/g, '-')
    .replace(/-\s+/g, '-')
    .replace(/\s+,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
  cleaned = cleaned.replace(/^Low est\. ([^;]+); high est\. ([^;]+); \((.+)\)$/, '$1-$2 ($3)');
  cleaned = cleaned.replace(/^Low est\. ([^;]+); high est\. ([^;]+)$/, '$1-$2');
  return cleaned;
}

function shouldIncludeCasualties(row) {
  return row.casualties
    && row.casualties !== 'research-pending'
    && row.casualties_status.includes('draft-from-casualty-list');
}

function imageAlt(cardTitle, card, media) {
  if (card.imageAlt) return card.imageAlt;

  const fileLabel = (media.pageImage || '')
    .replace(/\.[^.]+$/, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const isMap = /\b(map|diagram|plan|chart)\b/i.test(fileLabel)
    || /\b(operation|campaign)\b.*\b(map|diagram|plan|chart)\b/i.test(fileLabel);
  const prefix = isMap ? 'Map or diagram' : 'Historical image';
  return `${prefix} associated with ${cardTitle}: ${fileLabel}`;
}

const rows = readTsv(LEDGER_PATH);
const mediaById = new Map(JSON.parse(readFileSync(MEDIA_AUDIT_PATH, 'utf8')).map((item) => [item.id, item]));
const detailsById = JSON.parse(readFileSync(DETAILS_PATH, 'utf8'));

const cards = rows.map((row) => {
  const details = detailsById[row.id];
  if (!details) {
    throw new Error(`Missing battle details for ${row.id}`);
  }

  const media = mediaById.get(row.id);
  if (!media) {
    throw new Error(`Missing media audit for ${row.id}`);
  }
  if (!media.wikidataId || !media.imageSrc || !media.imageSourceUrl || !media.imageLicense) {
    throw new Error(`Incomplete media audit for ${row.id}`);
  }

  const cardDetails = {
    year: details.year,
    combatants: details.combatants,
    outcome: details.outcome,
    war: details.war,
    location: details.location,
    continent: row.continent,
    epoch: row.epoch,
    series: details.series,
    gloss: details.gloss,
  };

  if (shouldIncludeCasualties(row)) {
    cardDetails.casualties = cleanValue(row.casualties);
  }
  if (details.casualties) {
    cardDetails.casualties = details.casualties;
  }

  const sources = [
    {
      label: 'Wikipedia',
      url: titleToWikiUrl(media.resolvedTitle || media.requestedTitle || row.title),
    },
    {
      label: 'Wikidata',
      url: `https://www.wikidata.org/wiki/${media.wikidataId}`,
    },
  ];

  if (shouldIncludeCasualties(row)) {
    sources.push({
      label: 'Wikipedia casualty list',
      url: CASUALTY_LIST_URL,
    });
  }

  for (const source of details.extraSources || []) {
    sources.push(source);
  }

  return {
    id: row.id,
    dataset: 'battles',
    title: details.title || row.title,
    image: {
      src: media.imageSrc,
      alt: imageAlt(details.title || row.title, details, media),
      sourceUrl: media.imageSourceUrl,
      license: media.imageLicense,
      attribution: media.imageAttribution || media.pageImage,
    },
    details: cardDetails,
    sources,
  };
});

writeFileSync(OUTPUT_PATH, `${JSON.stringify(cards, null, 2)}\n`);
console.log(`Wrote ${cards.length} battle cards to ${OUTPUT_PATH}`);
