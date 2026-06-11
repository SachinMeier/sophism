# Famous Buildings Research Notes

Target count: 100 cards first pass; expanded in later passes.

Production count: 263 cards in `data/buildings.json`.

## Series Assignment

Every building card carries `details.series` keyed by style/movement, per the spec's series contract.

- `series.key` is the kebab-case slug of the style, for example `high-tech` or `vernacular-or-traditional`.
- `series.label` is the style name exactly as it appears in the manifest filter options.
- `series.order` is the construction completion date encoded as a sortable integer (`year * 10000 + month * 100 + day`, zeros when month/day are unknown, negative for BC). Display dates remain the `details.constructionDates` strings.
- Completion means the original principal completion, not later restorations, expansions, or facade additions. Kinkaku-ji sorts at its original 1397 completion, not the 1955 reconstruction; Westminster Abbey sorts at the 1517 main rebuild, not the 1745 west towers.
- Cards with multiple style values use the first-listed style as the series key: Florence Cathedral (`Gothic`/`Renaissance`) sits in the Gothic series at its 1436 dome completion; St Peter's Basilica (`Renaissance`/`Baroque`) sits in the Renaissance series at 1626.

## Ordering Judgment Calls

- White House vs US Capitol: both Neoclassical and both completed in 1800, so day-level orders disambiguate — White House occupied 1 Nov 1800 (`18001101`), Capitol's Senate wing occupied 17 Nov 1800 (`18001117`).
- Burj Khalifa vs Marina Bay Sands: both Contemporary, both 2010 — opening dates disambiguate (`20100104` vs `20100623`).
- Temple of Heaven: the original complex finished in 1420 alongside the Forbidden City (same Vernacular or Traditional series), but the defining circular Hall of Prayer layout dates to the 1545 Jiajing expansion, so it orders at `15450000`. This also keeps orders unique within the series.
- Sagrada Família: unfinished, so no real completion date exists. It orders at the announced target completion (`20260000`) so it sorts last in the Art Nouveau series. Revisit if the projected date changes materially.
- Sanchi Stupa: enlargement and toranas span the 2nd-1st centuries BC; ordered at c. 50 BC (`-500000`).
- El Castillo (Chichén Itzá): construction spans the 8th-12th centuries; ordered at c. AD 1100 (`11000000`).
- Neuschwanstein: never finished; ordered at 1886, when construction effectively halted.
- The former `Other or Unknown` bucket was removed. Its cards now sit in more specific style series: `Georgian`, `Indo-Saracenic`, `Italianate or Eclectic`, `Iron and Glass`, or `Modernist`.

## Second Pass (Cards 101-150)

Fifty additional high-recognition buildings researched in parallel (one research agent per card), with facts and image licensing verified against the Wikipedia/Wikimedia Commons APIs at curation time. Selection favored regional balance: new coverage includes Ethiopia (Lalibela), Zimbabwe (Great Zimbabwe), Mali (Djenné), Iraq (Ur), Peru (Machu Picchu), Myanmar (Shwedagon), Morocco, Azerbaijan, Iceland, and Canada.

Judgment calls in the second pass:

- Unité d'Habitation (Marseille) was selected but dropped: France has no freedom of panorama and Le Corbusier's works are under copyright until 2036, so Commons has no free photos *of* the building (only views *from* it). A Berlin Corbusierhaus stand-in photo was rejected as misleading for image recognition. Geisel Library (Pereira, 1970) took its Brutalist slot. Revisit Unité after 2036 or if an officially licensed image becomes available.
- Karnak's image file is named "Temple de Louxor 68.jpg" but its Commons description and categories confirm it depicts the Great Hypostyle Hall of Karnak.
- Ziggurat of Ur: today's appearance owes much to the 1980s partial reconstruction over the excavated Ur-Nammu base; ordered at the original c. 2100 BC completion.
- Great Wall of China is represented by the Ming-era Badaling section (c. 1570 completion order); the display string notes the multi-dynasty history back to the 7th century BC.
- Epoch follows the era the building substantially belongs to, matching the first-pass Cologne Cathedral convention: St. Vitus Cathedral (completed 1929) and Seville Cathedral (completed 1506) are both epoch Medieval, while their series orders still use real completion dates.
- Same-year ties within a series again use day-level dates: Space Needle (19620421) vs TWA Flight Center, Gateway Arch (19651028) vs Salk Institute, Willis Tower (19730503) vs Sydney Opera House, Heydar Aliyev Center (20120510) vs The Shard (20120705) vs CCTV Headquarters.
- Sistine Chapel sits in the Renaissance series at its 1481 structural completion; Michelangelo's frescoes (1508-1512, 1535-1541) are noted in the display dates but do not move the order.
- Buckingham Palace orders at 1837 (became the monarch's official residence at Victoria's accession); the 1913 Webb refacing is display-only.

## Known Curation Risks

- Style taxonomy compresses real art-historical nuance: revival styles share series with their originals (Neuschwanstein's Romanesque Revival sits in `romanesque`, the Woolworth Building's Gothic Revival in `gothic`, the Palace of Westminster's Gothic Revival in `gothic`). If this reads badly during study, consider adding explicit Revival styles to the manifest options.
- The `vernacular-or-traditional` series spans Maya, Khmer, Japanese, Chinese, Tibetan, and Russian traditions; chronological adjacency there crosses cultures and may feel arbitrary as a learning sequence. A future pass could split it by tradition the way large wars are split by theater.
- Ancient completion dates are scholarly estimates; orders use the most defensible single point, and shifting consensus may justify reordering within Ancient Egyptian and early Vernacular cards.
