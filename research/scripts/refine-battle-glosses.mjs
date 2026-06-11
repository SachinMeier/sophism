import { readFileSync, writeFileSync } from 'node:fs';

const DETAILS_PATH = 'research/candidates/battle-details.json';
const MAX_GLOSS_CHARACTERS = 280;

const refinedGlosses = {
  'battle-monte-cassino-1944': 'Allied armies fought through the Gustav Line around Monte Cassino after repeated assaults and the abbey bombing. The victory opened the Liri Valley and the road to Rome, but its cost made the campaign controversial.',
  'siege-vicksburg-1863': "Grant's campaign and siege forced the surrender of Vicksburg. The victory gave the Union control of the Mississippi River and split the Confederacy in two.",
  'battle-panipat-1526': 'Babur defeated Ibrahim Lodi with field artillery, matchlocks, and mobile tactics. The battle established Mughal power in northern India and began a new imperial era.',
  'battle-tanga-1914': 'German colonial forces under Paul von Lettow-Vorbeck defeated a larger British landing at Tanga. The battle embarrassed Britain and shaped the early East African campaign.',
  'battle-golden-spurs-1302': 'Flemish infantry defeated French cavalry near Kortrijk. The battle challenged assumptions about knightly dominance and became a founding memory for Flemish civic resistance.',
  'battle-bunker-hill-1775': 'British troops took the heights near Boston but suffered heavy losses. Bunker Hill proved colonial forces would stand against regulars and hardened the Revolutionary War.',
  'battle-minden-1759': 'An Allied army defeated French forces at Minden during the Seven Years War. The battle checked French power in western Germany and became famous for the advance of British infantry.',
  'battle-loos-1915': 'British forces attacked at Loos and used poison gas for the first time. The battle produced heavy casualties for limited gains and exposed problems in British command and supply.',
  'battle-vimy-ridge-1917': 'Canadian forces captured Vimy Ridge during the Arras offensive through careful planning and artillery coordination. The battle became a central moment in Canadian military memory.',
  'battle-manila-1945': 'Allied forces retook Manila in destructive urban combat against Japanese defenders. The battle devastated the city, caused catastrophic civilian losses, and marked the liberation of the Philippine capital.',
  'battle-pydna-168bc': 'Rome defeated Perseus of Macedon and ended the Antigonid monarchy. Pydna completed Macedon\'s fall as an independent great power and confirmed Roman dominance in Greece.',
  'battle-bannockburn-1314': 'Robert Bruce defeated a larger English army near Stirling. Bannockburn secured Scottish momentum in the independence war and became a national landmark.',
  'battle-coral-sea-1942': "Carrier aircraft fought while the opposing surface fleets never sighted each other. Coral Sea checked Japan's move toward Port Moresby and foreshadowed carrier warfare at Midway.",
  'battle-changping-260bc': "Qin defeated Zhao in a catastrophic campaign that broke a major rival. Changping accelerated Qin's movement toward unifying China and became infamous for mass killing.",
  'battle-ajnadayn-634': 'Rashidun forces defeated a Byzantine field army in Palestine. Ajnadayn opened the way for further Muslim advances in the Levant before Yarmouk decided the campaign.',
  'battle-alamo-1836': 'Mexican forces stormed the Alamo after a thirteen-day siege. The defeat became a rallying symbol for Texian independence and fed the cry remembered at San Jacinto.',
  'battle-baekgang-663': 'Tang and Silla forces defeated Baekje loyalists and their Yamato allies at Baekgang. The battle ended hopes of restoring Baekje and reshaped power on the Korean peninsula.',
  'battle-morgarten-1315': "Swiss forces ambushed a Habsburg army at Morgarten. The battle strengthened the early Swiss Confederation's military reputation and became part of Swiss foundation memory.",
  'battle-blue-waters-1362': 'Lithuanian forces defeated Golden Horde armies at Blue Waters. The battle expanded Lithuanian influence across parts of Ukraine and weakened steppe control in the region.',
  'battle-tinian-1944': 'US forces captured Tinian after an efficient amphibious landing in the Marianas. The island became a major B-29 base, including for the atomic bombing missions against Japan.',
  'battle-san-jacinto-1836': "Sam Houston's army surprised and defeated Santa Anna at San Jacinto. The battle effectively secured Texas independence from Mexico in a fight lasting less than twenty minutes.",
  'battle-tel-el-kebir-1882': 'British forces launched a dawn assault on Egyptian entrenchments at Tel el-Kebir. The victory secured British control over Egypt and the Suez route.',
  'battle-nahavand-642': 'Arab Muslim forces defeated a major Sasanian army in western Iran. Nahavand accelerated the disintegration of Sasanian resistance and became known as the victory of victories.',
  'battle-boyaca-1819': "Bolivar's army defeated royalist forces and captured the road to Bogota. Boyaca secured New Granada for the independence movement and strengthened Gran Colombia.",
  'battle-guandu-200': 'Cao Cao defeated Yuan Shao despite being outnumbered. Guandu set the balance of power in northern China before the Three Kingdoms and showed Cao Cao\'s strategic skill.',
  'battle-ascalon-1099': 'Crusader forces defeated a Fatimid army soon after the capture of Jerusalem. Ascalon secured the first wave of crusader conquests and protected the newborn Kingdom of Jerusalem.',
  'battle-karbala-680': 'Umayyad forces killed Husayn ibn Ali and his small party at Karbala. The battle became central to Shia memory and made martyrdom a defining theme in Islamic history.',
  'battle-civitate-1053': 'Norman forces defeated a papal-led army at Civitate and captured Pope Leo IX. The battle confirmed Norman power in southern Italy and pushed the papacy toward accommodation.',
  'battle-asculum-279bc': 'Pyrrhus won again at Asculum but at severe cost against Rome. The battle gave rise to the idea of a victory so costly it undermines the victor.',
  'battle-camden-1780': 'British forces under Cornwallis routed an American army at Camden. The defeat deepened the Patriot crisis in the South and led to new American command under Nathanael Greene.',
  'battle-khanwa-1527': "Babur defeated Rana Sanga's Rajput-led coalition soon after Panipat. Khanwa proved the Mughals could survive beyond a single victory and helped secure their hold in northern India.",
  'battle-wagram-1809': "Napoleon defeated Archduke Charles in a massive two-day battle near Vienna. Wagram ended the War of the Fifth Coalition, though its cost showed Napoleon's wars becoming harder to win cleanly.",
  'battle-kunersdorf-1759': "Russian and Austrian forces nearly destroyed Frederick the Great's army. Kunersdorf brought Prussia close to disaster and exposed how fragile Frederick's position was in the Seven Years War.",
  'battle-kleidion-1014': "Basil II crushed the Bulgarian army at Kleidion after a long Byzantine-Bulgarian struggle. The victory broke Bulgarian resistance and helped bring the empire under Byzantine control.",
  'battle-guam-1944': 'US Marines and Army troops recaptured Guam after weeks of fighting. The island became a major B-29 and naval base for the final campaigns against Japan.',
  'battle-salamanca-1812': 'Wellington exploited a French deployment error and won a sharp victory in Spain. Salamanca opened the road to Madrid and proved that French armies could be beaten in open battle.',
  'battle-hulao-621': 'Li Shimin defeated rival claimants at Hulao Pass during the Tang struggle for supremacy. The victory helped secure Tang rule and enhanced Li Shimin\'s reputation before he became Emperor Taizong.',
  'battle-bosworth-field-1485': 'Henry Tudor defeated Richard III, who was killed on the field. Bosworth ended Plantagenet rule, began the Tudor dynasty, and closed the main phase of the Wars of the Roses.',
  'siege-tobruk-1941': "Allied defenders held Tobruk against Rommel's Axis siege for months. The defense disrupted Axis operations in North Africa and made the garrison a symbol of resistance.",
  'battle-formigny-1450': 'French forces used artillery and cavalry to defeat an English army in Normandy. Formigny helped end English control of Normandy and pointed toward the closing phase of the Hundred Years War.',
  'battle-chapultepec-1847': 'US forces stormed Chapultepec Castle during the campaign for Mexico City. The victory opened the capital and became famous in US Marine Corps memory.',
  'battle-tarawa-1943': 'US Marines captured Betio after a costly amphibious assault against fortified Japanese defenses. Tarawa taught hard lessons in landing craft, naval fire, and reef operations for later Pacific campaigns.',
  'battle-navarino-1827': 'British, French, and Russian fleets destroyed the Ottoman-Egyptian fleet at Navarino. The naval victory helped secure Greek independence and was the last major battle fought entirely by sailing warships.',
  'battle-sedan-1870': "German forces encircled and captured Napoleon III's army. Sedan collapsed the Second Empire, transformed the Franco-Prussian War, and cleared the way for German unification.",
  'battle-mantinea-362bc': 'Epaminondas won at Mantinea but was killed in the fighting. The battle ended the brief peak of Theban power and left Greece without a stable hegemon.',
  'battle-beroia-1122': 'John II Komnenos defeated the Pechenegs near Beroia. The victory ended the Pechenegs as a major threat to Byzantium and strengthened Komnenian recovery in the Balkans.',
  'battle-waterloo-1815': "Wellington and Blucher defeated Napoleon's final army after a tense campaign in Belgium. Waterloo ended the Hundred Days, sent Napoleon into exile, and closed the Napoleonic era.",
  'battle-carabobo-1821': "Bolivar's forces defeated the main royalist army in Venezuela. Carabobo made Spanish control of the region untenable and secured a major step toward Gran Colombia.",
  'battle-edessa-260': 'Shapur I defeated the Romans and captured Emperor Valerian. Edessa became one of Rome\'s most humiliating imperial defeats and advertised Sasanian power.',
  'battle-malplaquet-1709': 'Marlborough and Eugene forced the French from the field but suffered heavy losses. Malplaquet showed the rising cost of the War of the Spanish Succession and blunted Allied momentum.',
  'battle-ivry-1590': "Henry IV defeated the Catholic League at Ivry during his fight for the French crown. The victory strengthened his claim and became linked to his famous white-plume legend.",
  'battle-oudenarde-1708': 'Marlborough and Eugene defeated a French army at Oudenarde. The victory opened the way to the siege of Lille and kept France under pressure in the Spanish Succession war.',
  'battle-aachen-1944': 'US forces captured Aachen after intense urban combat on the German frontier. It was the first major German city taken by the western Allies and previewed the cost of fighting into the Reich.',
  'attack-pearl-harbor-1941': 'Japanese carrier aircraft struck the US Pacific Fleet at Pearl Harbor. The attack brought the United States into World War II and made carrier air power central to the Pacific War.',
  'battle-haldighati-1576': "Mughal forces fought Rana Pratap's army in the Aravalli hills. Though tactically indecisive, Haldighati became a powerful symbol of Rajput resistance to Mughal expansion.",
  'battle-brunanburh-937': 'Athelstan defeated a northern coalition at Brunanburh. The victory helped secure the idea of a unified English kingdom and became celebrated in Old English verse.',
  'battle-chacabuco-1817': "San Martin's Army of the Andes defeated royalists after crossing from Argentina into Chile. Chacabuco opened the road to Santiago and revived the Chilean independence cause.",
  'siege-orleans-1429': "French forces relieved Orleans after Joan of Arc's arrival transformed morale. The victory reversed momentum in the later Hundred Years War and led toward Charles VII's coronation.",
  'battle-flodden-1513': 'English forces defeated the Scots and killed King James IV. Flodden became one of Scotland\'s most severe military disasters and reshaped Anglo-Scottish politics.',
  'battle-first-bull-run-1861': 'The first major battle of the Civil War ended in a Confederate victory near Manassas. Bull Run shattered expectations of a short war and forced both sides to prepare for a longer conflict.',
  'battle-cerro-cora-1870': 'Brazilian forces killed Paraguayan president Francisco Solano Lopez at Cerro Cora. The battle ended the Paraguayan War and left Paraguay devastated.',
  'battle-makin-1943': 'US forces captured Makin during the Gilbert Islands campaign. The operation accompanied Tarawa and helped refine American amphibious methods in the central Pacific.',
  'battle-naseby-1645': "The New Model Army destroyed Charles I's main field army. Naseby made Parliament's victory in the first English Civil War likely and exposed the king's captured correspondence.",
  'battle-saipan-1944': 'US forces captured Saipan, putting Japan within range of B-29 bombers. The defeat triggered a political crisis in Tokyo and brought the home islands under sustained air attack.',
  'battle-philippine-sea-1944': 'US carrier forces defeated a major Japanese fleet sortie near the Marianas. The battle crippled Japanese naval aviation and became known as the Great Marianas Turkey Shoot.',
  'siege-acre-1189': 'The long siege of Acre became the central operation of the Third Crusade. Its capture gave the Crusaders a coastal base and drew leaders such as Richard I and Philip II into the campaign.',
  'battle-guilford-court-house-1781': 'Cornwallis won the field but took heavy losses against Nathanael Greene. Guilford Court House weakened the British southern army before the Yorktown campaign.',
  'battle-drepana-249bc': "Carthaginian ships destroyed a Roman fleet at Drepana. The defeat was Rome's worst naval setback of the First Punic War and delayed its command of the sea.",
  'battle-anchialus-917': "Simeon I's Bulgarians crushed a Byzantine army near Anchialus. The battle confirmed Bulgaria as a dominant Balkan power during Simeon's imperial ambitions.",
  'gorlice-tarnow-offensive-1915': 'German and Austro-Hungarian forces broke through Russian lines in Galicia. Gorlice-Tarnow forced a major Russian retreat and restored Central Powers momentum in the east.',
  'battle-angamos-1879': 'Chile captured the Peruvian ironclad Huascar at Angamos. The battle gave Chile naval dominance in the War of the Pacific and opened the way for coastal operations.',
  'battle-saint-gotthard-1664': 'A Habsburg-led army defeated Ottoman forces near Saint Gotthard. The victory checked Ottoman pressure in western Hungary and shaped the uneasy peace that followed.',
  'battle-hohenlinden-1800': "Moreau's French army defeated Austrian and Bavarian forces at Hohenlinden. The victory helped force Austria toward peace and strengthened France's position under the Consulate.",
  'battle-saratoga-1777': "American forces forced Burgoyne's army to surrender in upstate New York. Saratoga helped bring France openly into the war and turned the Revolution into a global conflict.",
  'battle-puebla-1862': 'Mexican forces under Ignacio Zaragoza repelled a French assault on Puebla. The victory became a symbol of resistance celebrated as Cinco de Mayo.',
  'battle-leuctra-371bc': 'Epaminondas and the Thebans broke Spartan battlefield dominance with an innovative deep formation. Leuctra reshaped Greek politics and military tactics.',
  'battle-lake-trasimene-217bc': 'Hannibal ambushed a Roman army beside Lake Trasimene. It became one of the largest successful ambushes in ancient warfare and deepened Rome\'s crisis in Italy.',
  'battle-ramillies-1706': 'Marlborough defeated the French army in the Spanish Netherlands. Ramillies opened much of the region to Allied occupation and confirmed his reputation after Blenheim.',
  'battle-magnesia-190bc': 'Roman and allied forces defeated Antiochus III at Magnesia. The battle confirmed Roman power in the eastern Mediterranean and weakened the Seleucid Empire.',
  'battle-bailen-1808': "Spanish forces forced a French corps to surrender at Bailen. The defeat shattered Napoleon's aura of invincibility in Spain and encouraged wider resistance.",
  'battle-imphal-1944': "Slim's Fourteenth Army defeated a Japanese invasion attempt in northeastern India. Imphal, with Kohima, turned the Burma campaign and ended Japan's hopes of breaking into India.",
  'battle-riachuelo-1865': 'Brazilian warships defeated Paraguay on the Parana River. Riachuelo secured Allied river control during the Paraguayan War and protected the supply route into Paraguay.',
  'battle-lake-poyang-1363': 'Zhu Yuanzhang defeated Chen Youliang in a vast naval battle. The victory cleared Zhu\'s path toward founding the Ming dynasty and deciding the Red Turban struggle.',
  'battle-wandiwash-1760': 'British forces defeated the French in southern India during the Carnatic struggle. Wandiwash helped end French hopes of matching British power in India.',
  'battle-kulikovo-1380': "Dmitry Donskoy defeated Mamai's forces at Kulikovo. The battle became central to Russian memory of resistance to Horde power, even though Mongol influence continued.",
  'battle-quatre-bras-1815': 'Wellington blocked Ney at Quatre Bras while the Prussians fought at Ligny. The battle shaped the movements before Waterloo and helped keep Allied armies from being separated.',
  'siege-kiev-1240': "Mongol forces stormed Kiev after a siege in 1240. The city's fall symbolized the devastation of the Mongol invasion of Rus and shifted power away from old Kievan centers.",
  'battle-rossbach-1757': "Frederick the Great crushed a larger Franco-Imperial army by maneuver. Rossbach became one of Prussia's most famous victories and boosted Frederick's European prestige.",
  'battle-chickamauga-1863': "Confederate forces routed much of the Union Army of the Cumberland in northern Georgia. Chickamauga was the Confederacy's major western victory but failed to recover Chattanooga.",
  'battle-france-1940': 'Germany defeated France and the Allied armies in a rapid campaign built around armored breakthroughs. The fall of France transformed World War II and left Britain fighting on alone.',
  'battle-munda-45bc': 'Caesar defeated the last major Pompeian army at Munda. The battle ended organized resistance to his rule in the Roman world and left the dictatorship uncontested.',
  'battle-philippi-42bc': 'Antony and Octavian defeated Brutus and Cassius at Philippi. The battle ended the republican faction that had killed Caesar and pushed Rome toward triumviral rule.',
  'battle-boyne-1690': "William III defeated James II's forces at the Boyne. The battle became a defining event in Irish and British political memory and secured Williamite control.",
  'battle-castillon-1453': 'French artillery and field defenses destroyed an English attack. Castillon effectively ended the Hundred Years War in France and showed the growing power of gunpowder defenses.',
  'battle-chancellorsville-1863': 'Lee divided his army and defeated a larger Union force under Hooker. Chancellorsville was his greatest victory but cost Stonewall Jackson, making it strategically bittersweet.',
  'battle-pharsalus-48bc': 'Caesar defeated Pompey in Greece despite being outnumbered. Pharsalus made Caesar the dominant figure in the Roman civil war and sent Pompey fleeing to Egypt.',
  'battle-marj-dabiq-1516': 'Selim I defeated the Mamluks at Marj Dabiq, opening Syria to Ottoman conquest. The battle began the collapse of Mamluk power and shifted the eastern Mediterranean balance.',
  'battle-balaclava-1854': 'Allied forces held the port of Balaclava against Russian attack. The battle is remembered for the Charge of the Light Brigade and the confusion of Crimean War command.',
  'battle-seelow-heights-1945': 'Soviet armies broke through German defenses east of Berlin under Zhukov and Konev. Seelow Heights opened the final assault on the German capital.',
  'second-ypres-1915': 'German forces used poison gas on a large scale near Ypres. The battle introduced a terrifying new weapon to the Western Front and hardened the war\'s industrial character.',
  'battle-gazala-1942': "Rommel defeated the Eighth Army around Gazala and captured Tobruk soon after. The battle opened the Axis advance toward Egypt before El Alamein halted it.",
  'battle-didgori-1121': 'David IV of Georgia defeated a much larger Seljuk-led coalition at Didgori. The victory helped launch the Georgian Golden Age and became central to Georgian national memory.',
  'battle-guadalete-711': 'Umayyad-led forces defeated the Visigothic army of King Roderic. The battle opened the rapid Muslim conquest of most of Iberia and transformed western Mediterranean history.',
  'battle-assaye-1803': "Arthur Wellesley defeated a larger Maratha army in western India. Assaye strengthened Company control and built Wellesley's reputation before his later fame as Wellington.",
  'battle-trebia-218bc': 'Hannibal lured Roman forces into a cold river crossing and enveloped them. Trebia confirmed the danger of his Italian invasion and began a run of Carthaginian victories.',
  'battle-strasbourg-357': 'Julian defeated a larger Alamannic force near Strasbourg. The battle restored Roman authority along part of the Rhine frontier and enhanced Julian\'s military reputation.',
  'battle-dara-530': 'Belisarius used fieldworks and maneuver to defeat a Sasanian army. Dara became one of the best-known early Byzantine victories and displayed Justinian\'s revived eastern defenses.',
  'battle-vercellae-101bc': 'Marius and Catulus destroyed the Cimbri at Vercellae. The battle ended one of the gravest threats Rome had faced since Hannibal and raised Marius\' political prestige.',
  'battle-allia-390bc': 'A Gallic army routed Roman forces near the Allia River. The defeat opened the way for the sack of Rome and left a deep mark on Roman memory and military reform.',
  'battle-sentinum-295bc': 'Rome defeated a coalition of Samnites, Gauls, and other enemies at Sentinum. The battle helped secure Roman dominance in central Italy and close the Third Samnite War.',
  'battle-heraclea-280bc': 'Pyrrhus defeated a Roman army using Hellenistic tactics and war elephants. The battle introduced Rome to a formidable eastern Mediterranean style of warfare.',
  'battle-ilipa-206bc': 'Scipio Africanus defeated the main Carthaginian army in Hispania at Ilipa. The victory cleared the way for Rome to attack Carthaginian power directly in Africa.',
  'battle-mylae-260bc': 'Rome won its first major naval victory against Carthage at Mylae. The battle showed that Roman boarding tactics could offset Carthaginian seamanship.',
  'battle-watling-street-60': "A smaller Roman army crushed Boudica's rebel forces somewhere along Watling Street. The victory secured Roman control in Britain after a major uprising.",
  'battle-zab-750': 'Abbasid forces defeated the Umayyad army near the Zab River. The battle ended Umayyad rule in the central caliphate and opened the Abbasid era.',
  'battle-yehuling-1211': "Genghis Khan's army defeated a much larger Jin force at Yehuling. The battle opened northern China to sustained Mongol pressure and began the fall of Jin power.",
  'battle-kolin-1757': 'Austrian forces defeated Frederick the Great at Kolin. The battle forced Prussia to abandon the siege of Prague and widened the Seven Years War.',
  'battle-rivoli-1797': "Napoleon defeated an Austrian relief attempt at Rivoli. The victory secured French control in northern Italy and confirmed his operational brilliance.",
  'battle-ulm-1805': "Napoleon encircled Mack's Austrian army around Ulm and forced its surrender. The operation showed the strategic power of rapid corps maneuver before Austerlitz.",
  'battle-bautzen-1813': 'Napoleon defeated Russo-Prussian forces at Bautzen but failed to destroy them. The incomplete victory contributed to an armistice that let the coalition recover.',
  'battle-dresden-1813': 'Napoleon defeated a large coalition army at Dresden. It was one of his last major victories before the strategic disaster at Leipzig.',
  'second-bull-run-1862': "Robert E. Lee and Stonewall Jackson defeated John Pope's Union army at Second Bull Run. The victory opened the way for Lee's first invasion of the North.",
  'battle-masurian-lakes-1914': "German forces drove the Russian First Army out of East Prussia after Tannenberg. The battle stabilized Germany's northeastern frontier in 1914.",
  'battle-dobro-pole-1918': "Allied forces broke through Bulgarian positions at Dobro Pole. The defeat pushed Bulgaria toward armistice and opened the Central Powers' Balkan flank.",
  'battle-santa-cruz-islands-1942': 'Japanese carriers inflicted heavy losses on the US Navy near the Santa Cruz Islands. The battle cost Japan experienced aircrews it could not replace and helped decide the Guadalcanal struggle.',
  'battle-rimini-1944': 'Allied forces broke through toward Rimini during attacks on the Gothic Line. The battle was one of the heaviest fought in Italy in 1944 and helped open the Adriatic flank.',
  'battle-bibracte-58bc': 'Caesar defeated the Helvetii-led migration near Bibracte, halting their movement through Gaul. It was the first major battle of the Gallic Wars and justified deeper Roman intervention.',
  'battle-gergovia-52bc': "Caesar's attempt to storm Vercingetorix's stronghold at Gergovia collapsed after confusion near the walls. The defeat forced Caesar to retreat before the later campaign at Alesia.",
  'fall-granada-1492': 'Granada surrendered to Ferdinand and Isabella after the final campaigns against the Nasrid emirate. The capitulation ended Muslim rule in Iberia and closed the Reconquista.',
  'battle-curupayty-1866': 'Paraguayan defenders used prepared trenches and artillery to repulse Allied frontal assaults. Curupayty was a severe Triple Alliance setback and slowed the Humaita campaign.',
  'battle-acosta-nu-1869': "Brazilian and Argentine forces destroyed a Paraguayan force that included many boys late in the war. The battle is remembered in Paraguay as the Children's Battle.",
};

const replacements = [
  [/\bRome most\b/g, "Rome's most"],
  [/\bPrussia most\b/g, "Prussia's most"],
  [/\bScotland most\b/g, "Scotland's most"],
  [/\bKorea most\b/g, "Korea's most"],
  [/\bAustralia best-known\b/g, "Australia's best-known"],
  [/\bFrance major\b/g, "France's major"],
  [/\bRussia most successful\b/g, "Russia's most successful"],
  [/\bJapan ability\b/g, "Japan's ability"],
  [/\bJapan conquest\b/g, "Japan's conquest"],
  [/\bJapan opening\b/g, "Japan's opening"],
  [/\bJapan experienced\b/g, "Japan's experienced"],
  [/\bGermany final\b/g, "Germany's final"],
  [/\bGermany greatest\b/g, "Germany's greatest"],
  [/\bNapoleon aura\b/g, "Napoleon's aura"],
  [/\bNapoleon image\b/g, "Napoleon's image"],
  [/\bNapoleon first\b/g, "Napoleon's first"],
  [/\bFrederick army\b/g, "Frederick's army"],
  [/\bWellesley reputation\b/g, "Wellesley's reputation"],
  [/\bLee invasion\b/g, "Lee's invasion"],
  [/\bLincoln reelection\b/g, "Lincoln's reelection"],
  [/\bSherman campaign\b/g, "Sherman's campaign"],
  [/\bKing John position\b/g, "King John's position"],
  [/\bMamai forces\b/g, "Mamai's forces"],
  [/\bZhu path\b/g, "Zhu's path"],
  [/\bRana Sanga coalition\b/g, "Rana Sanga's coalition"],
  [/\bRana Pratap army\b/g, "Rana Pratap's army"],
  [/\bJackson forces\b/g, "Jackson's forces"],
  [/\bBurgoyne army\b/g, "Burgoyne's army"],
  [/\bBulgaria under\b/g, 'Bulgaria under'],
  [/\bAsuncion\b/g, 'Asuncion'],
  [/\bHumaita\b/g, 'Humaita'],
];

function sentenceCount(gloss) {
  return (gloss.match(/[.!?](?=\s|$)/g) || []).length;
}

function polish(gloss) {
  let result = String(gloss || '').replace(/\s+/g, ' ').trim();
  for (const [pattern, replacement] of replacements) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function assertGloss(id, gloss) {
  if (gloss.length > MAX_GLOSS_CHARACTERS) {
    throw new Error(`${id} gloss exceeds ${MAX_GLOSS_CHARACTERS} characters (${gloss.length})`);
  }
  const sentences = sentenceCount(gloss);
  if (sentences < 1 || sentences > 4) {
    throw new Error(`${id} gloss must be 1-4 sentences, got ${sentences}: ${gloss}`);
  }
}

const details = JSON.parse(readFileSync(DETAILS_PATH, 'utf8'));
let refined = 0;
let polished = 0;

for (const [id, gloss] of Object.entries(refinedGlosses)) {
  if (!details[id]) throw new Error(`Missing battle details for ${id}`);
  assertGloss(id, gloss);
  details[id].gloss = gloss;
  refined += 1;
}

for (const [id, detail] of Object.entries(details)) {
  const nextGloss = polish(detail.gloss);
  assertGloss(id, nextGloss);
  if (nextGloss !== detail.gloss) polished += 1;
  detail.gloss = nextGloss;
}

writeFileSync(DETAILS_PATH, `${JSON.stringify(details, null, 2)}\n`);
console.log(`Refined ${refined} battle glosses and polished ${polished} more.`);
