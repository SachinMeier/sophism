import { readFileSync, writeFileSync } from 'node:fs';

const DETAILS_PATH = 'research/candidates/battle-details.json';

// `combatants` is rendered as opposing sides. Coalition members should be
// grouped into a single display string for their side.
const updates = {
  'battle-marathon-490bc': ['Athens and Plataea', 'Achaemenid Empire'],
  'battle-zama-202bc': ['Roman Republic and Numidian allies', 'Carthage'],
  'battle-talas-751': ['Abbasid Caliphate and Tibetan allies', 'Tang dynasty'],
  'battle-alcacer-quibir-1578': ['Saadi Morocco', 'Portugal and Moroccan claimant forces'],
  'battle-breitenfeld-1631': ['Sweden and Saxony', 'Catholic League'],
  'battle-blenheim-1704': ['Grand Alliance', 'France and Bavaria'],
  'battle-plassey-1757': ['British East India Company', 'Nawab of Bengal and French allies'],
  'siege-yorktown-1781': ['United States and France', 'Great Britain'],
  'battle-austerlitz-1805': ['French Empire', 'Russian and Austrian Empires'],
  'battle-trafalgar-1805': ['Royal Navy', 'French and Spanish navies'],
  'siege-sevastopol-1854': ['Russian Empire', 'France, Britain, Ottoman Empire, and Sardinia'],
  'battle-solferino-1859': ['France and Kingdom of Sardinia', 'Austrian Empire'],
  'battle-koniggratz-1866': ['Kingdom of Prussia', 'Austrian Empire and Kingdom of Saxony'],
  'battle-marne-1914': ['France and United Kingdom', 'German Empire'],
  'battle-somme-1916': ['United Kingdom and France', 'German Empire'],
  'battle-passchendaele-1917': ['British Empire and France', 'German Empire'],
  'battle-caporetto-1917': ['Austria-Hungary and German Empire', 'Kingdom of Italy'],
  'battle-megiddo-1918': ['British Empire and Arab allies', 'Ottoman Empire'],
  'battle-bataan-1942': ['United States and Philippines', 'Empire of Japan'],
  'battle-stalingrad-1942': ['Soviet Union', 'Nazi Germany and Axis allies'],
  'battle-leyte-gulf-1944': ['Allied naval forces', 'Imperial Japanese Navy'],
  'battle-okinawa-1945': ['United States and United Kingdom', 'Empire of Japan'],
  'battle-manila-1945': ['United States and Philippine Commonwealth', 'Empire of Japan'],
  'battle-hue-1968': ['South Vietnam and United States', 'North Vietnam and Viet Cong'],
  'battle-fallujah-2004': ['United States and Iraqi government forces', 'Iraqi insurgents'],
  'battle-tuyuti-1866': ['Paraguay', 'Brazil, Argentina, and Uruguay'],
  'battle-cuito-cuanavale-1987': ['Angola, Cuba, and SWAPO', 'South Africa and UNITA'],
  'battle-chaeronea-338bc': ['Macedon', 'Athens and Thebes'],
  'battle-khartoum-1885': ['Mahdist State', 'Egyptian garrison and British officers'],
  'siege-malta-1565': ['Knights Hospitaller and Spanish allies', 'Ottoman Empire'],
  'battle-balaclava-1854': ['Russian Empire', 'British Empire, France, and Ottoman Empire'],
  'battle-little-bighorn-1876': ['Lakota, Northern Cheyenne, and Arapaho', 'United States'],
  'battle-san-juan-hill-1898': ['United States and Cuban rebels', 'Spain'],
  'battle-belleau-wood-1918': ['United States and France', 'German Empire'],
  'battle-khalkhin-gol-1939': ['Soviet Union and Mongolia', 'Empire of Japan and Manchukuo'],
  'battle-coral-sea-1942': ['United States and Australia', 'Empire of Japan'],
  'battle-kasserine-pass-1943': ['Axis forces', 'United States and Allied forces'],
  'battle-imphal-1944': ['British Empire and India', 'Empire of Japan'],
  'battle-kohima-1944': ['British Empire and India', 'Empire of Japan'],
  'battle-crete-1941': ['Nazi Germany', 'Allied and Greek forces'],
  'battle-khe-sanh-1968': ['United States and South Vietnam', 'North Vietnam'],
  'battle-ia-drang-1965': ['United States and South Vietnam', 'North Vietnam'],
  'battle-73-easting-1991': ['United States and United Kingdom', 'Iraq'],
  'battle-mogadishu-1993': ['United States and UNOSOM II', 'Somali National Alliance'],
  'battle-tora-bora-2001': ['United States and Afghan allies', 'al-Qaeda'],
  'battle-milne-bay-1942': ['Australia and United States', 'Empire of Japan'],
  'kokoda-track-campaign-1942': ['Australia and United States', 'Empire of Japan'],
  'battle-nordlingen-1634': ['Holy Roman Empire and Spain', 'Sweden and German Protestant allies'],
  'siege-leningrad-1941': ['Soviet Union', 'Nazi Germany and Finland'],
  'battle-long-tan-1966': ['Australia and New Zealand', 'North Vietnam and Viet Cong'],
  'battle-eylau-1807': ['French Empire', 'Russian Empire and Prussia'],
  'brusilov-offensive-1916': ['Russian Empire', 'Austria-Hungary and German Empire'],
  'battle-france-1940': ['Nazi Germany', 'France, Britain, and Allied forces'],
};

const details = JSON.parse(readFileSync(DETAILS_PATH, 'utf8'));

for (const [id, combatants] of Object.entries(updates)) {
  if (!details[id]) {
    throw new Error(`Missing battle details for ${id}`);
  }
  details[id].combatants = combatants;
}

const remaining = Object.entries(details)
  .filter(([, value]) => !Array.isArray(value.combatants) || value.combatants.length !== 2)
  .map(([id, value]) => `${id}: ${(value.combatants || []).join(' | ')}`);

if (remaining.length) {
  throw new Error(`Battle combatants must be exactly two display sides:\n${remaining.join('\n')}`);
}

writeFileSync(DETAILS_PATH, `${JSON.stringify(details, null, 2)}\n`);
console.log(`Normalized combatant sides for ${Object.keys(updates).length} battle records.`);
