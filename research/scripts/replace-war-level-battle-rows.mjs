import { readFileSync, writeFileSync } from 'node:fs';

const TSV_PATH = 'research/candidates/battles.tsv';
const DETAILS_PATH = 'research/candidates/battle-details.json';

const removeIds = new Set(['six-day-war-1967', 'yom-kippur-war-1973']);

const replacements = [
  {
    row: ['battle-abu-ageila-1967', 'Battle of Abu-Ageila', 'Asia', 'Contemporary', 'armored', 'research-pending', 'needs-row-level-source', 'regional-balance', 'https://en.wikipedia.org/wiki/Battle_of_Abu-Ageila_(1967)', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Abu-Ageila%201967', 'Six-Day War Sinai battle.'],
    details: {
      year: 'AD 1967',
      combatants: ['Israel', 'Egypt'],
      outcome: 'Israeli victory',
      war: 'Six-Day War',
      location: 'Abu-Ageila, Sinai Peninsula',
      series: { key: 'six-day-war', label: 'Six-Day War', order: 1 },
      gloss: 'Israeli forces broke through Egyptian defenses at Abu-Ageila in a coordinated night attack. The victory opened the route across Sinai during the Six-Day War.',
    },
  },
  {
    row: ['battle-chinese-farm-1973', 'Battle of the Chinese Farm', 'Asia', 'Contemporary', 'armored', 'research-pending', 'needs-row-level-source', 'regional-balance', 'https://en.wikipedia.org/wiki/Battle_of_the_Chinese_Farm', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20the%20Chinese%20Farm', 'Yom Kippur War Sinai battle.'],
    details: {
      year: 'AD 1973',
      combatants: ['Israel', 'Egypt'],
      outcome: 'Israeli victory',
      war: 'Yom Kippur War',
      location: 'Sinai Peninsula near the Suez Canal',
      series: { key: 'yom-kippur-war', label: 'Yom Kippur War', order: 1 },
      gloss: "Israeli and Egyptian forces fought around the Chinese Farm during Israel's counteroffensive in Sinai. The battle helped secure Israel's bridgehead across the Suez Canal.",
    },
  },
];

const lines = readFileSync(TSV_PATH, 'utf8').trimEnd().split('\n');
const header = lines[0];
let body = lines.slice(1).filter((line) => !removeIds.has(line.split('\t')[1]));

const presentIds = new Set(body.map((line) => line.split('\t')[1]));
for (const { row } of replacements) {
  if (!presentIds.has(row[0])) {
    body.push(['0', ...row].join('\t'));
    presentIds.add(row[0]);
  }
}

body = body.map((line, index) => {
  const cells = line.split('\t');
  cells[0] = String(index + 1);
  return cells.join('\t');
});

const details = JSON.parse(readFileSync(DETAILS_PATH, 'utf8'));
for (const id of removeIds) {
  delete details[id];
}
for (const { row, details: replacementDetails } of replacements) {
  details[row[0]] = replacementDetails;
}

writeFileSync(TSV_PATH, `${header}\n${body.join('\n')}\n`);
writeFileSync(DETAILS_PATH, `${JSON.stringify(details, null, 2)}\n`);

console.log(`Candidate rows: ${body.length}`);
console.log(`Detail rows: ${Object.keys(details).length}`);
