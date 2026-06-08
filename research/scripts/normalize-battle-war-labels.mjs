import { readFileSync, writeFileSync } from 'node:fs';

const DETAILS_PATH = 'research/candidates/battle-details.json';

const updates = {
  'battle-harran-1104': 'Crusader states in northern Syria',
  'battle-montgisard-1177': 'Kingdom of Jerusalem-Ayyubid conflict',
  'battle-hattin-1187': 'Kingdom of Jerusalem-Ayyubid conflict',
  'battle-la-forbie-1244': "Barons' Crusade aftermath",
};

const details = JSON.parse(readFileSync(DETAILS_PATH, 'utf8'));

for (const [id, war] of Object.entries(updates)) {
  if (!details[id]) {
    throw new Error(`Missing battle details for ${id}`);
  }
  details[id].war = war;
}

writeFileSync(DETAILS_PATH, `${JSON.stringify(details, null, 2)}\n`);
console.log(`Normalized war labels for ${Object.keys(updates).length} battle records.`);
