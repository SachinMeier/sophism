# Paintings Dataset Curation Notes

## Current Slice

- `data/paintings.json`: 312 cards after the batch-300 expansion (100 → 200 → 300) plus the
  12-card non-Western batch.
- `candidates/paintings-batch-300.json`: the 100-card batch-300 candidate list with curated facts and original glosses.
- `candidates/paintings-batch-non-western.json`: 12 famous non-Western works (Japanese, Chinese, Korean, Persian, Mughal).
- `candidates/painting-media-audit-300.json` / `painting-media-audit-non-western.json`: Wikipedia/Commons media audits.
- `scripts/add-painting-batch-300.mjs`: audit + promotion script (`--candidates=`/`--audit=` select a batch; `--promote` writes production data).
- `scripts/verify-painting-overrides-300.mjs`: one-off lookups used to fix audit misses.

## Non-Western Batch

Movement taxonomy was extended in `data/datasets.json` with five tradition-level options:
Ukiyo-e (Great Wave, Red Fuji, Hiroshige's Sudden Shower, Utamaro's Three Beauties),
Japanese Painting (Tohaku's Pine Trees, Sotatsu's Wind God and Thunder God),
Chinese Painting (Qingming scroll, A Thousand Li of Rivers and Mountains, Fan Kuan's
Travelers), Korean Painting (Irworobongdo), and Persian and Mughal Miniature (The Court
of Gayumars, Jahangir Preferring a Sufi Shaikh to Kings). Tradition-level labels were
chosen over a single crude "Non-Western" bucket; all twelve images are public-domain
Wikimedia Commons files. Three works have no dedicated en.wikipedia article (Fan Kuan,
Court of Gayumars, Sotatsu screens) and source the artist article instead, with the
Wikidata source omitted.

## Batch-300 Selection Principles

- Canonical, high-recognition works first, then balance toward movements that were
  under-represented at 200 cards: Medieval, Mannerism, Rococo, Symbolism, Futurism,
  Pre-Raphaelite, Abstract Expressionism, Pop Art, Contemporary.
- Filled major omissions flagged during review: no Durer existed before this batch;
  also added View of Toledo, The Floor Scrapers, Isle of the Dead, The Son of Man,
  Nude Descending a Staircase No. 2, Madame X, The Goldfinch.
- Deepened existing artist series (Van Gogh nocturnes, Caravaggio, Rembrandt, Monet,
  Friedrich, Ingres) without letting any single artist dominate further.

## Conventions (match existing 200 cards exactly)

- ASCII-folded display names: "Edouard Manet", "Albrecht Durer", "Rene Magritte".
- `details.century` derived from the primary creation year; pre-1301 works use
  "13th century and earlier".
- Series key is the artist slug; `series.order` is a YYYYMMDD-style sortable integer.
  Month/day digits are only used to break ties within an artist (they are sort keys,
  not display dates).
- Joint attributions use "X and Y" in both artist and series key, mirroring
  "Andrea del Verrocchio and Leonardo da Vinci" (batch 300 adds
  "Ivan Shishkin and Konstantin Savitsky").
- Movement normalization precedents: Fauvism/Kandinsky → Expressionism,
  Hopper/American Gothic → Realism, Malevich/Matisse cutout era → Modernism,
  Italian proto-Renaissance (Giotto, Duccio) → Renaissance, Klimt → Symbolism,
  Kahlo → Surrealism, Bacon/Freud/Richter/Close → Contemporary.
- Image source preference: Wikimedia Commons (license string
  "Public domain or freely licensed via Wikimedia Commons"); en.wikipedia-hosted
  lead images for copyrighted works use the fair-use placeholder license string,
  consistent with the 30 fair-use cards already in the dataset.

## Risk Notes / Unresolved Uncertainty

- `painting-portrait-of-henry-viii`: the Whitehall original burned in 1698; the card
  uses the Google Art Project image of a contemporary workshop version. Attribution
  stays "Hans Holbein the Younger" for study purposes; the gloss notes the copies.
- `painting-morning-in-a-pine-forest`: bears were painted by Savitsky; Tretyakov
  credits Shishkin alone after Tretyakov erased Savitsky's signature. Card uses joint
  attribution and the gloss explains the split.
- `painting-the-ten-largest-no-7-adulthood`, `painting-self-portrait-with-physalis`,
  `painting-violin-and-candlestick`: no dedicated en.wikipedia article; sources point
  to the artist article and the Wikidata source is intentionally omitted.
- `painting-the-dog`: Wikipedia's lead image is an 1874 archival photograph of the
  mural; the card overrides it with the standard Prado image of the transferred work.
- Fair-use images (post-1930 copyrighted works) keep the existing dataset's
  "replace before production" license string and should be revisited if the app is
  ever distributed beyond personal study use.
- Dates for c.-dated works use the most defensible display string from the painting's
  Wikipedia/museum page; series order uses the earliest defensible year.
- `painting-along-the-river-during-the-qingming-festival`: the full 5m handscroll is
  unusable at card aspect; the card uses Wikipedia's lead detail (city gate section).
  Swap to a rainbow-bridge detail crop if a clean Commons file appears.
