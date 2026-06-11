import { readFileSync, writeFileSync } from 'node:fs';

const DETAILS_PATH = 'research/candidates/battle-details.json';

const updates = {
  'battle-long-island-1776': 'Great Britain: 388 casualties; United States: about 2,000-2,200 casualties',
  'battle-princeton-1777': 'United States: about 40 casualties; Great Britain: about 275 casualties',
  'battle-camden-1780': 'Great Britain: 324 casualties; United States: about 1,900 casualties',
  'battle-kings-mountain-1780': 'Patriot militia: 88 casualties; Loyalist militia: about 1,100 killed, wounded, or captured',
  'second-bull-run-1862': 'Confederate States: 7,298 casualties; United States: 14,462 casualties',
  'battle-chattanooga-1863': 'United States: 5,824 casualties; Confederate States: 6,667 casualties',
  'battle-mobile-bay-1864': 'United States Navy: about 320 casualties; Confederate States: about 1,500 killed, wounded, or captured',
  'battle-gravelotte-1870': 'Prussia and German allies: about 20,000 casualties; France: about 12,000 casualties',
  'battle-mars-la-tour-1870': 'Prussia: about 16,000 casualties; France: about 17,000 casualties',
  'battle-worth-1870': 'Prussia and German allies: about 10,600 casualties; France: about 19,000 casualties',
  'battle-paardeberg-1900': 'British Empire: about 1,270 casualties; Boer republics: about 4,100 killed, wounded, or captured',
  'battle-coronel-1914': 'German East Asia Squadron: 3 wounded; Royal Navy: 1,654 killed',
  'battle-dogger-bank-1915': 'Royal Navy: 95 casualties; Imperial German Navy: about 950 casualties',
  'battle-sidi-barrani-1940': 'British Commonwealth forces: about 624 casualties; Italy: about 38,000 captured plus killed and wounded',
  'battle-beda-fomm-1941': 'British Commonwealth forces: about 500 casualties; Italy: about 25,000 captured',
  'battle-monte-cassino-1944': 'Allied forces: about 55,000 casualties; Nazi Germany: about 20,000 killed or wounded',
  'battle-nieuwpoort-1600': 'Dutch Republic and England: about 1,700-2,700 dead or wounded; Spain: about 4,000 killed, wounded, or captured',
  'battle-tinian-1944': 'United States: 328 killed and 1,571 wounded; Empire of Japan: about 8,000 killed and 300 captured',
  'battle-eastern-solomons-1942': 'Allied naval forces: about 90 killed; Imperial Japanese Navy: about 290 killed',
  'battle-santa-cruz-islands-1942': 'Imperial Japanese Navy: about 400-500 killed; United States Navy: 266 killed',
  'naval-guadalcanal-1942': 'United States Navy: about 1,700 killed; Imperial Japanese Navy: about 1,900 killed',
  'battle-pusan-perimeter-1950': 'United Nations Command: about 60,000 casualties; North Korea: about 58,000 casualties',
  'battle-inchon-1950': 'United Nations Command: 224 killed and 809 wounded; North Korea: about 1,350 killed',
  'battle-chosin-reservoir-1950': 'United Nations Command: about 17,100 casualties including non-battle casualties; China: about 52,000 casualties including non-battle casualties',
  'battle-kapyong-1951': 'United Nations Command: about 100 casualties; China: about 1,000 casualties',
  'battle-bloody-ridge-1951': 'United Nations Command: about 2,700 casualties; North Korea: about 15,000 casualties',
  'battle-heartbreak-ridge-1951': 'United Nations Command: about 3,700 casualties; North Korea and China: about 25,000 casualties',
  'battle-ap-bac-1963': 'Viet Cong: about 57 casualties; South Vietnam and United States advisers: about 220 casualties',
  'battle-ammunition-hill-1967': 'Israel: 36 killed; Jordan: about 70 killed',
};

const details = JSON.parse(readFileSync(DETAILS_PATH, 'utf8'));

for (const [id, casualties] of Object.entries(updates)) {
  if (!details[id]) {
    throw new Error(`Missing battle details for ${id}`);
  }
  details[id].casualties = casualties;
}

writeFileSync(DETAILS_PATH, `${JSON.stringify(details, null, 2)}\n`);
console.log(`Applied ${Object.keys(updates).length} side casualty overrides.`);
