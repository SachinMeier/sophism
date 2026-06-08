import { readFileSync, writeFileSync } from 'node:fs';

const TSV_PATH = 'research/candidates/battles.tsv';
const DETAILS_PATH = 'research/candidates/battle-details.json';

const rows = [
  ['battle-fei-river-383', 'Battle of Fei River', 'Asia', 'Ancient', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Fei_River', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Fei%20River', 'Major Chinese battle; checked Former Qin expansion.'],
  ['battle-siffin-657', 'Battle of Siffin', 'Asia', 'Medieval', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Siffin', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Siffin', 'Major First Fitna battle.'],
  ['battle-guadalete-711', 'Battle of Guadalete', 'Europe', 'Medieval', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Guadalete', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Guadalete', 'Opened Muslim conquest of Iberia.'],
  ['battle-stamford-bridge-1066', 'Battle of Stamford Bridge', 'Europe', 'Medieval', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Stamford_Bridge', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Stamford%20Bridge', '1066 succession crisis.'],
  ['battle-myriokephalon-1176', 'Battle of Myriokephalon', 'Asia', 'Medieval', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Myriokephalon', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Myriokephalon', 'Byzantine-Seljuk turning point.'],
  ['battle-arsuf-1191', 'Battle of Arsuf', 'Asia', 'Medieval', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Arsuf', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Arsuf', 'Major Third Crusade battle.'],
  ['battle-las-navas-1212', 'Battle of Las Navas de Tolosa', 'Europe', 'Medieval', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Las_Navas_de_Tolosa', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Las%20Navas%20de%20Tolosa', 'Major Reconquista battle.'],
  ['battle-crecy-1346', 'Battle of Crecy', 'Europe', 'Medieval', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Cr%C3%A9cy', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Crecy', 'Hundred Years War; longbow victory.'],
  ['battle-poitiers-1356', 'Battle of Poitiers', 'Europe', 'Medieval', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Poitiers_(1356)', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Poitiers%201356', 'Hundred Years War; French king captured.'],
  ['battle-lake-poyang-1363', 'Battle of Lake Poyang', 'Asia', 'Medieval', 'naval', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Lake_Poyang', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Lake%20Poyang', 'Huge naval battle before the Ming dynasty.'],
  ['battle-ankara-1402', 'Battle of Ankara', 'Asia', 'Medieval', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Ankara', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Ankara', 'Timur defeated Bayezid I.'],
  ['battle-lutzen-1632', 'Battle of Lutzen', 'Europe', 'Early Modern', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_L%C3%BCtzen_(1632)', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Lutzen%201632', 'Thirty Years War; Gustavus Adolphus killed.'],
  ['battle-nordlingen-1634', 'Battle of Nordlingen', 'Europe', 'Early Modern', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_N%C3%B6rdlingen_(1634)', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Nordlingen%201634', 'Thirty Years War Imperial-Spanish victory.'],
  ['battle-fontenoy-1745', 'Battle of Fontenoy', 'Europe', 'Early Modern', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Fontenoy', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Fontenoy', 'Major War of the Austrian Succession battle.'],
  ['battle-leuthen-1757', 'Battle of Leuthen', 'Europe', 'Early Modern', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Leuthen', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Leuthen', 'Frederick the Great victory in the Seven Years War.'],
  ['battle-wandiwash-1760', 'Battle of Wandiwash', 'Asia', 'Early Modern', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Wandiwash', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Wandiwash', 'Decisive British-French battle in India.'],
  ['battle-panipat-1761', 'Third Battle of Panipat', 'Asia', 'Early Modern', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Third_Battle_of_Panipat', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Third%20Battle%20of%20Panipat', 'One of the largest eighteenth-century battles.'],
  ['battle-assaye-1803', 'Battle of Assaye', 'Asia', 'Modern', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Assaye', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Assaye', 'Major Company victory in India.'],
  ['battle-shiloh-1862', 'Battle of Shiloh', 'North America', 'Modern', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Shiloh', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Shiloh', 'Major early American Civil War battle.'],
  ['battle-antietam-1862', 'Battle of Antietam', 'North America', 'Modern', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Antietam', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Antietam', 'Bloodiest single day in American military history.'],
  ['second-marne-1918', 'Second Battle of the Marne', 'Europe', 'World Wars', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Second_Battle_of_the_Marne', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Second%20Battle%20of%20the%20Marne', 'Turned the final German offensives in World War I.'],
  ['battle-nanking-1937', 'Battle of Nanking', 'Asia', 'World Wars', 'urban', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Nanking', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Nanking', 'Major Second Sino-Japanese War battle.'],
  ['battle-wuhan-1938', 'Battle of Wuhan', 'Asia', 'World Wars', 'operation', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Wuhan', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Wuhan', 'Large, consequential Second Sino-Japanese War battle.'],
  ['battle-suomussalmi-1939', 'Battle of Suomussalmi', 'Europe', 'World Wars', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Suomussalmi', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Suomussalmi', 'Famous Finnish Winter War victory.'],
  ['siege-leningrad-1941', 'Siege of Leningrad', 'Europe', 'World Wars', 'siege', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Siege_of_Leningrad', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Siege%20of%20Leningrad', 'One of World War II longest and deadliest sieges.'],
  ['battle-brody-1941', 'Battle of Brody', 'Europe', 'World Wars', 'armored', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Brody_(1941)', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Brody%201941', 'Large early Eastern Front tank battle.'],
  ['battle-bismarck-sea-1943', 'Battle of the Bismarck Sea', 'Oceania', 'World Wars', 'air-naval', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_the_Bismarck_Sea', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20the%20Bismarck%20Sea', 'Important Allied air-sea victory near New Guinea.'],
  ['battle-philippine-sea-1944', 'Battle of the Philippine Sea', 'Oceania', 'World Wars', 'naval', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_the_Philippine_Sea', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20the%20Philippine%20Sea', 'Decisive carrier battle in the Pacific War.'],
  ['battle-seelow-heights-1945', 'Battle of the Seelow Heights', 'Europe', 'World Wars', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_the_Seelow_Heights', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20the%20Seelow%20Heights', 'Final Soviet assault before Berlin.'],
  ['battle-long-tan-1966', 'Battle of Long Tan', 'Asia', 'Contemporary', 'classical', 'research-pending', 'needs-row-level-source', 'priority-omission', 'https://en.wikipedia.org/wiki/Battle_of_Long_Tan', 'https://commons.wikimedia.org/wiki/Special:MediaSearch?type=image&search=Battle%20of%20Long%20Tan', 'Well-known Australian battle in the Vietnam War.'],
];

const detailRows = [
  ['battle-fei-river-383', 'AD 383', ['Former Qin', 'Eastern Jin'], 'Eastern Jin victory', 'Former Qin-Jin War', 'Fei River, China', ['east-asian-imperial-battles', 'East Asian imperial battles', 2], 'Eastern Jin forces routed a much larger Former Qin army. The defeat fractured Former Qin power and preserved southern Chinese independence.'],
  ['battle-siffin-657', 'AD 657', ['Forces of Ali', 'Forces of Muawiya'], 'Indecisive; arbitration followed', 'First Fitna', 'Near Raqqa, Syria', ['early-islamic-civil-wars', 'Early Islamic civil wars', 1], 'The armies of Ali and Muawiya fought during the first major Islamic civil war. Siffin deepened the political and religious divisions of the early caliphate.'],
  ['battle-guadalete-711', 'AD 711', ['Umayyad Caliphate', 'Visigothic Kingdom'], 'Umayyad victory', 'Umayyad conquest of Hispania', 'Near the Guadalete River, Spain', ['iberian-islamic-frontier', 'Iberian Islamic frontier', 1], 'Umayyad-led forces defeated the Visigothic army of King Roderic. The battle opened the rapid Muslim conquest of most of Iberia.'],
  ['battle-stamford-bridge-1066', 'AD 1066', ['Kingdom of England', 'Norwegian invaders'], 'English victory', 'Norwegian invasion of England', 'Stamford Bridge, England', ['medieval-european-turning-points', 'Medieval European turning points', 0], 'Harold Godwinson defeated Harald Hardrada and Tostig Godwinson in northern England. The victory ended the Norwegian invasion but left England exposed before Hastings.'],
  ['battle-myriokephalon-1176', 'AD 1176', ['Byzantine Empire', 'Sultanate of Rum'], 'Seljuk victory', 'Byzantine-Seljuk wars', 'Near Myriokephalon, Anatolia', ['byzantine-and-crusader-world', 'Byzantine and Crusader world', 1.5], 'Seljuk forces ambushed a Byzantine army in Anatolia. The battle damaged Byzantine hopes of restoring control over the interior of Asia Minor.'],
  ['battle-arsuf-1191', 'AD 1191', ['Crusader forces', 'Ayyubid Sultanate'], 'Crusader victory', 'Third Crusade', 'Arsuf, Levant', ['byzantine-and-crusader-world', 'Byzantine and Crusader world', 3], 'Richard I defeated Saladin near Arsuf during the Third Crusade. The victory restored Crusader morale and secured the coastal march toward Jaffa.'],
  ['battle-las-navas-1212', 'AD 1212', ['Christian kingdoms of Iberia', 'Almohad Caliphate'], 'Christian coalition victory', 'Reconquista', 'Near Las Navas de Tolosa, Spain', ['iberian-islamic-frontier', 'Iberian Islamic frontier', 2], 'A coalition of Iberian kingdoms defeated the Almohad army in Andalusia. The battle shifted the long-term balance of power in the Reconquista.'],
  ['battle-crecy-1346', 'AD 1346', ['Kingdom of England', 'Kingdom of France'], 'English victory', 'Hundred Years War', 'Crecy-en-Ponthieu, France', ['hundred-years-war-and-roses', 'Hundred Years War and Wars of the Roses', 1], 'English longbowmen and defensive positioning defeated repeated French attacks. Crecy became a landmark battle in the Hundred Years War.'],
  ['battle-poitiers-1356', 'AD 1356', ['Kingdom of England', 'Kingdom of France'], 'English victory', 'Hundred Years War', 'Near Poitiers, France', ['hundred-years-war-and-roses', 'Hundred Years War and Wars of the Roses', 2], 'Edward the Black Prince defeated a larger French army and captured King John II. Poitiers intensified the political crisis in France.'],
  ['battle-lake-poyang-1363', 'AD 1363', ['Ming rebel forces', 'Han rebel forces'], 'Zhu Yuanzhang victory', 'Red Turban Rebellion', 'Lake Poyang, China', ['east-asian-imperial-battles', 'East Asian imperial battles', 3], 'Zhu Yuanzhang defeated Chen Youliang in a vast naval battle. The victory cleared Zhu path toward founding the Ming dynasty.'],
  ['battle-ankara-1402', 'AD 1402', ['Timurid Empire', 'Ottoman Empire'], 'Timurid victory', 'Timurid-Ottoman conflict', 'Near Ankara, Anatolia', ['timurid-and-ottoman-wars', 'Timurid and Ottoman wars', 1], 'Timur defeated and captured Ottoman sultan Bayezid I. Ankara plunged the Ottoman state into an interregnum and delayed its expansion.'],
  ['battle-lutzen-1632', 'AD 1632', ['Sweden', 'Holy Roman Empire'], 'Swedish tactical victory', 'Thirty Years War', 'Lutzen, Germany', ['thirty-years-war', 'Thirty Years War', 3], 'Swedish forces defeated an Imperial army, but Gustavus Adolphus was killed. The battle preserved Swedish influence while changing the war leadership.'],
  ['battle-nordlingen-1634', 'AD 1634', ['Holy Roman Empire and Spain', 'Sweden and German Protestant allies'], 'Imperial-Spanish victory', 'Thirty Years War', 'Nordlingen, Germany', ['thirty-years-war', 'Thirty Years War', 4], 'Imperial and Spanish forces crushed the Protestant field army. Nordlingen reversed Swedish momentum and pushed France toward direct intervention.'],
  ['battle-fontenoy-1745', 'AD 1745', ['France', 'Pragmatic Army'], 'French victory', 'War of the Austrian Succession', 'Fontenoy, Austrian Netherlands', ['european-great-power-wars', 'European great-power wars', 1], 'French forces defeated an Allied army in the Austrian Netherlands. Fontenoy became one of France major eighteenth-century battlefield victories.'],
  ['battle-leuthen-1757', 'AD 1757', ['Prussia', 'Habsburg Monarchy'], 'Prussian victory', 'Seven Years War', 'Leuthen, Silesia', ['seven-years-war', 'Seven Years War', 2], 'Frederick the Great used an oblique attack to defeat a larger Austrian army. Leuthen is often treated as one of his finest victories.'],
  ['battle-wandiwash-1760', 'AD 1760', ['British East India Company', 'French East India Company'], 'British victory', 'Carnatic Wars', 'Vandavasi, India', ['imperial-expansion', 'Imperial expansion', 2], 'British forces defeated the French in southern India. Wandiwash helped end French hopes of matching British power in India.'],
  ['battle-panipat-1761', 'AD 1761', ['Durrani Empire', 'Maratha Confederacy'], 'Durrani victory', 'Afghan-Maratha conflict', 'Panipat, India', ['early-modern-asia', 'Early modern Asian state formation', 2], 'Ahmad Shah Durrani defeated the Maratha Confederacy in a huge and costly battle. Panipat reshaped power politics across northern India.'],
  ['battle-assaye-1803', 'AD 1803', ['British East India Company', 'Maratha Confederacy'], 'British victory', 'Second Anglo-Maratha War', 'Assaye, India', ['imperial-expansion', 'Imperial expansion', 4], 'Arthur Wellesley defeated a larger Maratha army in western India. Assaye strengthened Company control and Wellesley reputation.'],
  ['battle-shiloh-1862', 'AD 1862', ['United States', 'Confederate States'], 'Union victory', 'American Civil War', 'Shiloh, United States', ['american-civil-war', 'American Civil War', 1], 'Union forces survived a surprise Confederate attack and counterattacked the next day. Shiloh revealed how costly the Civil War would become.'],
  ['battle-antietam-1862', 'AD 1862', ['United States', 'Confederate States'], 'Union strategic victory', 'American Civil War', 'Maryland, United States', ['american-civil-war', 'American Civil War', 2], 'Antietam halted Lee invasion of Maryland after the bloodiest single day of the war. The result gave Lincoln space to issue the Emancipation Proclamation.'],
  ['second-marne-1918', 'AD 1918', ['Allied forces', 'German Empire'], 'Allied victory', 'World War I', 'Marne River, France', ['world-war-i', 'World War I', 13], 'Allied forces stopped Germany final major offensive and began the counteroffensive phase of 1918. The battle marked a decisive turn toward Allied victory.'],
  ['battle-nanking-1937', 'AD 1937', ['Republic of China', 'Empire of Japan'], 'Japanese victory', 'Second Sino-Japanese War', 'Nanking, China', ['second-sino-japanese-war', 'Second Sino-Japanese War', 2], 'Japanese forces captured the Chinese capital after hard fighting. The battle was followed by the Nanjing Massacre and became central to wartime memory.'],
  ['battle-wuhan-1938', 'AD 1938', ['Republic of China', 'Empire of Japan'], 'Japanese operational victory', 'Second Sino-Japanese War', 'Wuhan, China', ['second-sino-japanese-war', 'Second Sino-Japanese War', 3], 'Chinese forces fought a long defense around Wuhan before withdrawing. The battle slowed Japan and moved the war into a prolonged phase.'],
  ['battle-suomussalmi-1939', 'AD 1939-1940', ['Finland', 'Soviet Union'], 'Finnish victory', 'Winter War', 'Suomussalmi, Finland', ['winter-war', 'Winter War', 1], 'Finnish troops destroyed Soviet columns in deep winter conditions. Suomussalmi became a classic example of mobility, terrain, and small-unit tactics.'],
  ['siege-leningrad-1941', 'AD 1941-1944', ['Soviet Union', 'Nazi Germany and Finland'], 'Soviet defensive victory', 'World War II', 'Leningrad, Soviet Union', ['world-war-ii-europe', 'World War II in Europe', 5], 'Axis forces encircled Leningrad for nearly 900 days, causing mass civilian starvation. The city endured until Soviet offensives broke the siege.'],
  ['battle-brody-1941', 'AD 1941', ['Soviet Union', 'Nazi Germany'], 'German victory', 'World War II', 'Western Ukraine', ['world-war-ii-europe', 'World War II in Europe', 4.5], 'Soviet mechanized corps counterattacked German armor in one of the largest tank battles of 1941. The defeat exposed early Soviet command and coordination problems.'],
  ['battle-bismarck-sea-1943', 'AD 1943', ['Allied air forces', 'Empire of Japan'], 'Allied victory', 'World War II', 'Bismarck Sea, Pacific Ocean', ['new-guinea-campaign', 'New Guinea campaign', 4], 'Allied aircraft destroyed a Japanese convoy bound for New Guinea. The battle sharply limited Japan ability to reinforce the theater.'],
  ['battle-philippine-sea-1944', 'AD 1944', ['United States', 'Empire of Japan'], 'American victory', 'World War II', 'Philippine Sea', ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 10], 'US carrier forces defeated a major Japanese fleet sortie near the Marianas. The battle crippled Japanese naval aviation.'],
  ['battle-seelow-heights-1945', 'AD 1945', ['Soviet Union', 'Nazi Germany'], 'Soviet victory', 'World War II', 'Seelow Heights, Germany', ['world-war-ii-europe', 'World War II in Europe', 14], 'Soviet armies broke through the German defenses east of Berlin. Seelow Heights opened the final assault on the German capital.'],
  ['battle-long-tan-1966', 'AD 1966', ['Australia and New Zealand', 'North Vietnam and Viet Cong'], 'Australian-New Zealand victory', 'Vietnam War', 'Long Tan, Vietnam', ['cold-war-asia', 'Cold War conflicts in Asia', 5], 'Australian and New Zealand troops fought a much larger force in a rubber plantation. Long Tan became one of Australia best-known Vietnam War battles.'],
];

const seriesOrderUpdates = {
  'battle-hastings-1066': ['medieval-european-turning-points', 'Medieval European turning points', 2],
  'battle-white-mountain-1620': ['thirty-years-war', 'Thirty Years War', 1],
  'battle-breitenfeld-1631': ['thirty-years-war', 'Thirty Years War', 2],
  'battle-rocroi-1643': ['thirty-years-war', 'Thirty Years War', 5],
  'battle-plassey-1757': ['imperial-expansion', 'Imperial expansion', 1],
  'battle-buxar-1764': ['imperial-expansion', 'Imperial expansion', 3],
  'battle-gettysburg-1863': ['american-civil-war', 'American Civil War', 3],
  'siege-vicksburg-1863': ['american-civil-war', 'American Civil War', 4],
  'battle-agincourt-1415': ['hundred-years-war-and-roses', 'Hundred Years War and Wars of the Roses', 3],
  'battle-castillon-1453': ['hundred-years-war-and-roses', 'Hundred Years War and Wars of the Roses', 4],
  'battle-towton-1461': ['hundred-years-war-and-roses', 'Hundred Years War and Wars of the Roses', 5],
  'battle-khalkhin-gol-1939': ['soviet-japanese-border-conflicts', 'Soviet-Japanese border conflicts', 1],
  'battle-britain-1940': ['world-war-ii-europe', 'World War II in Europe', 3],
  'battle-kiev-1941': ['world-war-ii-europe', 'World War II in Europe', 4],
  'battle-moscow-1941': ['world-war-ii-europe', 'World War II in Europe', 6],
  'battle-stalingrad-1942': ['world-war-ii-europe', 'World War II in Europe', 7],
  'battle-kursk-1943': ['world-war-ii-europe', 'World War II in Europe', 8],
  'battle-monte-cassino-1944': ['world-war-ii-europe', 'World War II in Europe', 9],
  'battle-normandy-1944': ['world-war-ii-europe', 'World War II in Europe', 10],
  'operation-market-garden-1944': ['world-war-ii-europe', 'World War II in Europe', 11],
  'battle-hurtgen-forest-1944': ['world-war-ii-europe', 'World War II in Europe', 12],
  'battle-bulge-1944': ['world-war-ii-europe', 'World War II in Europe', 13],
  'battle-berlin-1945': ['world-war-ii-europe', 'World War II in Europe', 15],
  'attack-pearl-harbor-1941': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 1],
  'battle-wake-island-1941': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 2],
  'battle-singapore-1942': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 3],
  'battle-bataan-1942': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 4],
  'battle-coral-sea-1942': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 5],
  'battle-midway-1942': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 6],
  'guadalcanal-campaign-1942': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 7],
  'battle-tarawa-1943': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 8],
  'battle-saipan-1944': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 9],
  'battle-guam-1944': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 11],
  'battle-peleliu-1944': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 12],
  'battle-leyte-gulf-1944': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 13],
  'battle-manila-1945': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 14],
  'battle-iwo-jima-1945': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 15],
  'battle-okinawa-1945': ['world-war-ii-pacific', 'World War II in Asia and the Pacific', 16],
  'kokoda-track-campaign-1942': ['new-guinea-campaign', 'New Guinea campaign', 1],
  'battle-milne-bay-1942': ['new-guinea-campaign', 'New Guinea campaign', 2],
  'battle-buna-gona-1942': ['new-guinea-campaign', 'New Guinea campaign', 3],
  'battle-lae-1943': ['new-guinea-campaign', 'New Guinea campaign', 5],
};

function readTsv(path) {
  const lines = readFileSync(path, 'utf8').trimEnd().split('\n');
  return {
    header: lines[0],
    body: lines.slice(1),
  };
}

const { header, body } = readTsv(TSV_PATH);
const existingIds = new Set(body.map((line) => line.split('\t')[1]));
const nextBody = [...body];

for (const row of rows) {
  if (existingIds.has(row[0])) continue;
  nextBody.push([nextBody.length + 1, ...row].join('\t'));
}

writeFileSync(TSV_PATH, `${header}\n${nextBody.join('\n')}\n`);

const details = JSON.parse(readFileSync(DETAILS_PATH, 'utf8'));
for (const row of detailRows) {
  const [id, year, combatants, outcome, war, location, series, gloss] = row;
  details[id] = {
    year,
    combatants,
    outcome,
    war,
    location,
    series: {
      key: series[0],
      label: series[1],
      order: series[2],
    },
    gloss,
  };
}

for (const [id, series] of Object.entries(seriesOrderUpdates)) {
  if (!details[id]) continue;
  details[id].series = {
    key: series[0],
    label: series[1],
    order: series[2],
  };
}

writeFileSync(DETAILS_PATH, `${JSON.stringify(details, null, 2)}\n`);

console.log(`Rows in ${TSV_PATH}: ${nextBody.length}`);
console.log(`Details in ${DETAILS_PATH}: ${Object.keys(details).length}`);
