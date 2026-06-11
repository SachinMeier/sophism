# Multi-Subject Flashcard Study App Spec

## Purpose

Build Sophism as a mobile-first, single-page flashcard study app modeled on the interaction logic in `../gquiz`, but generalized beyond geography. The app should let a learner choose a subject dataset, narrow the active deck with subject-specific filters, swipe or button-grade cards as correct/incorrect, and track progress through the chosen subset.

Initial datasets:

- Historical Battles.
- Famous Paintings.
- Famous Buildings.

This document covers the target behavior, data model, research method, and implementation plan. It does not yet populate the datasets.

## Reference Behavior From `../gquiz`

The existing `gquiz` app is a useful behavioral template:

- Static frontend with `index.html`, `styles.css`, `app.js`, and JSON data files.
- Single card shown at a time.
- Tap/click flips the card.
- Swipe right or the right button marks correct.
- Swipe left or the wrong button marks incorrect.
- Correct cards are removed from the active deck until the correct list is cleared.
- Incorrect cards stay in rotation and are tracked separately.
- Correct/incorrect counters are persisted in `localStorage`.
- Score counters open a modal showing the current right/wrong list.
- Score lists are scoped to the active filters.
- A back button restores the previously graded card.
- Keyboard shortcuts mirror touch/button interactions.
- A dropdown selects the current study mode.
- A multi-select filter dropdown controls the active subset.
- Tests mock JSON data and verify rendering, scoring, filtering, completion, and load failures.

The new app should preserve this interaction model but replace the country-specific assumptions with a subject-aware deck engine.

## Product Scope

### In Scope

- A single-page static study app.
- Dataset selector dropdown with:
  - Historical Battles.
  - Famous Paintings.
  - Famous Buildings.
- Dynamic filter controls that change based on selected dataset.
- Search within the active dataset.
- Correct and incorrect counters.
- Filter-scoped score lists.
- Persisted study state per dataset.
- Completion state for the active filtered deck.
- Randomized active study order by default.
- Local JSON data files.
- Image display on the front of every card.
- Config-driven dataset definitions so new subjects can be added without changing the study engine.
- Optional series navigation so a card can link to the previous/next card in the same ordered learning sequence.
- Research and curation workflow for dataset creation.
- Basic data validation tests.
- Playwright interaction tests adapted from `gquiz`.

### Out of Scope For Initial Version

- User accounts.
- Server-side persistence.
- Spaced repetition scheduling.
- AI-generated quiz answers.
- Multi-choice mode.
- Import/export of personal decks.
- Audio narration.
- Full offline mirroring of every remote source page.
- Nested series hierarchies or timeline browsing beyond compact previous/next card navigation.

## Dataset Selector And Filters

The dataset dropdown is the top-level mode selector. Changing it should:

- Load or switch to the selected dataset.
- Reset the visible card index.
- Preserve that dataset's score state independently from other datasets.
- Render only filters relevant to that dataset.
- Update search placeholder text.
- Update card front/back templates.

### Historical Battles Filters

- Continent: multi-select.
- Epoch: multi-select.

Proposed continent values:

- Africa.
- Asia.
- Europe.
- North America.
- South America.
- Oceania.

Selecting all continents is a UI state, not a card value.

Proposed epoch values:

- Ancient, before AD 500.
- Medieval, 500-1499.
- Early Modern, 1500-1799.
- Modern, 1800-1913.
- World Wars, 1914-1945.
- Contemporary, 1946-present.

### Famous Paintings Filters

- Movement: multi-select.

Card layout:

- Front: painting image only.
- Back: name, artist, year, artistic movement, and a concise gloss.

Proposed movement values should be normalized from source data, for example:

- Renaissance.
- Neo-Renaissance.
- Baroque.
- Rococo.
- Neoclassicism.
- Romanticism.
- Realism.
- Impressionism.
- Post-Impressionism.
- Expressionism.
- Cubism.
- Surrealism.
- Abstract Expressionism.
- Pop Art.
- Contemporary.

### Famous Buildings Filters

- Epoch: multi-select.
- Style/Movement: multi-select.

Card layout:

- Front: building image only.
- Back: name, architect, construction dates, style, city/country location, and a concise gloss.

Proposed building epoch values:

- Ancient, before AD 500.
- Medieval, 500-1499.
- Early Modern, 1500-1799.
- Industrial, 1800-1913.
- Modern, 1914-1979.
- Contemporary, 1980-present.

Proposed building style/movement values should be normalized from source data, for example:

- Ancient Egyptian.
- Classical.
- Ancient Roman.
- Byzantine.
- Romanesque.
- Gothic.
- Islamic.
- Renaissance.
- Neo-Renaissance.
- Baroque.
- Georgian.
- Neoclassical.
- Beaux-Arts.
- Italianate or Eclectic.
- Indo-Saracenic.
- Art Nouveau.
- Art Deco.
- Iron and Glass.
- Modernist.
- Brutalist.
- Postmodern.
- High-Tech.
- Contemporary.
- Vernacular or Traditional.

## Dataset-Agnostic Architecture

The app should treat datasets as plug-in style configuration plus data. The core study engine should not know what a battle, painting, or building is.

Adding a new dataset should require:

- Adding a manifest entry in `data/datasets.json`.
- Adding one dataset JSON file.
- Adding image assets or stable image URLs.
- Adding optional fixture cards for tests.

Adding a new dataset should not require:

- Rewriting grading logic.
- Rewriting swipe/flip logic.
- Rewriting score counting.
- Rewriting filter state management.
- Adding dataset-specific branches throughout `app.js`.

The manifest should declare:

- Dataset id and label.
- Data file path.
- Filter definitions, data paths, required status, and allowed values.
- Search fields.
- Optional series definition, including key, label, and order paths.
- Required shared fields.
- Required `details` fields.
- Gloss brevity guidance.
- Front and back card template.

The renderer should build cards from manifest templates, using reusable primitives such as image, title, stat grid, field list, and prose. If a future subject needs a genuinely new primitive, add that primitive once and make it available to every dataset.

### Series Navigation Contract

Datasets may declare an ordered `series` relationship for previous/next card navigation. Series navigation is separate from filters: filters define the active study subset, while series defines an editorial learning sequence within the selected dataset.

The app should not store hand-authored `prevId` or `nextId` fields. Previous and next cards should be computed from data:

1. Find cards in the selected dataset with the same configured series key.
2. Sort those cards by the configured series order.
3. The adjacent cards become previous and next.

The manifest should declare series paths instead of hardcoding subject names:

```json
{
  "series": {
    "label": "Series",
    "keyPath": "details.series.key",
    "labelPath": "details.series.label",
    "orderPath": "details.series.order"
  }
}
```

If a dataset declares `series`, every card in that dataset should include:

```json
{
  "details": {
    "series": {
      "key": "wwii-western-front",
      "label": "World War II: Western Front",
      "order": 19440606
    }
  }
}
```

Rules:

- `series.key` is the machine-stable grouping id.
- `series.label` is the user-facing navigation label.
- `series.order` is an internal sortable value, not a display date.
- `series.order` must be unique within a given `series.key`.
- Displayed dates should continue to use BC/AD strings; `series.order` only exists to sort.
- For date-like ordering, prefer sortable integers such as `19440606` for AD dates and negative equivalents for BC dates. Approximate or range dates should use the most defensible ordering point for the series.
- Cards without a manifest-level series declaration should not render previous/next controls.
- A series with only one card should not render previous/next controls.
- The initial three datasets should all declare series, and `series` should be included in each dataset's `requiredDetailFields`.

For battles, `details.war` remains a display/stat field. `details.series` is the navigation group. Smaller wars can use one series whose label matches the war. Larger wars should be split into flat top-level series by theater or campaign, without parent/sub-series nesting.

For battles, `details.combatants` is a two-item array of opposing display sides, not a raw list of every polity or force present. Coalition members should be grouped into one side string, for example `["Macedon", "Athens and Thebes"]`, so the UI does not imply a three-way battle.

Example single-series war:

```json
{
  "details": {
    "war": "Norman Conquest of England",
    "series": {
      "key": "norman-conquest-england",
      "label": "Norman Conquest of England",
      "order": 10661014
    }
  }
}
```

Example large war split by theater:

```json
{
  "details": {
    "war": "World War II",
    "series": {
      "key": "wwii-western-front",
      "label": "World War II: Western Front",
      "order": 19440606
    }
  }
}
```

For paintings, the series is the artist, ordered chronologically ascending by creation date, for example `vincent-van-gogh`. Every painting declares series data even when the artist has only one painting in the dataset; single-card series simply render no previous/next controls. For buildings, the series should usually be the style/movement, for example `Modernist` or `High-Tech`. These use the same flat series shape as battles.

Series navigation should be computed across the selected dataset's full loaded data, not only the currently filtered active deck. That way a user studying one filtered subset can still understand where the current card sits in its broader sequence. Navigating by series should not count as a correct or incorrect answer.

### Filter Data Contract

Every UI filter must map to a required field in the card data. A filter cannot exist only in the UI.

Filterable values should live as ordinary fields inside `details`. The manifest filter points to the field with `path`.

- Battles require `details.continent` and `details.epoch`.
- Paintings require `details.movement`.
- Buildings require `details.epoch` and `details.style`.

The filter engine should accept either a scalar value or a non-empty array at the configured path. This keeps simple cards readable while allowing future datasets to support cards with multiple applicable values. Validation should fail if a required filter field is missing, empty, or contains a value not listed in the manifest options.

For battles specifically, `details.continent` should contain exactly one continent value. Selecting all continents is handled by the UI, not by a special card value.

## Core Study Logic

The study engine should be dataset-neutral. Cards should have a shared envelope plus subject-specific details.

Expected state:

- `selectedDataset`.
- `selectedFiltersByDataset`.
- `rightIdsByDataset`.
- `wrongIdsByDataset`.
- `activeCards`.
- `currentIndex`.
- `history`.
- `flipped`.
- `gradingInProgress`.
- `passSize`.
- `passIndex`.

Correct behavior:

- The same grading, deck filtering, history, completion, and score-list code should run for every dataset.
- Active study cards should be shuffled when a dataset/filter subset starts a new pass.
- The app should preserve the current shuffled pass order as cards are graded, instead of falling back to source data order after every card.
- Source data order should remain available internally for loading and validation, but the learner should not see cards in source order by default.
- Marking correct adds the card id to the dataset's right set and removes it from the wrong set.
- Marking incorrect adds the card id to the dataset's wrong set and removes it from the right set.
- Correct cards are excluded from the active deck until cleared.
- Incorrect cards remain eligible.
- Score counts are filtered to the current dataset and active filters.
- Clearing a score list only clears ids visible under the current dataset and active filters.
- Switching datasets should not erase state for other datasets.
- Switching filters should recompute active cards, score counts, and a fresh shuffled pass order.
- If the active deck is empty because all filtered cards are correct, show completion with a clear-correct action.
- Series previous/next navigation remains ordered by `series.order` and should not use the randomized study stack order.

Suggested localStorage keys:

- `sophismFlashcards.dataset`.
- `sophismFlashcards.filters.<datasetId>`.
- `sophismFlashcards.right.<datasetId>`.
- `sophismFlashcards.wrong.<datasetId>`.

## Card Templates

Templates should be declared in the dataset manifest and rendered by generic UI primitives.

Recommended template primitives:

- `image`: renders `image.src` with `image.alt`.
- `title`: renders the shared `title`.
- `field`: renders one labeled value from `details`.
- `fieldList`: renders several labeled values.
- `statGrid`: renders compact labeled stats.
- `gloss`: renders `details.gloss`.
- `seriesNav`: renders compact previous/next controls when the selected dataset declares series and the current card has adjacent cards in that series.

### Shared Front Requirements

- Primary image fills most of the card without cropping important content.
- Dataset templates define whether the title appears on the front; paintings and buildings use image-only fronts.
- No answer stats on the front.
- Missing image state should be visually clear but not crash the app.

### Historical Battles Front

- Image or painting.
- Battle name below.

### Historical Battles Back

Stats at top:

- Year.
- Location, formatted as City, Country.
- Combatants.
- Victor or outcome.
- War or campaign.
- Estimated casualties, when available. This field is optional and should be omitted when the data is not trustworthy enough to display.

Below stats:

- Concise gloss.
- Previous/next series controls when another card exists in the same battle series.

### Famous Paintings Front

- Painting image only.

### Famous Paintings Back

- Name.
- Artist.
- Year.
- Artistic movement.
- Concise gloss.
- Previous/next series controls when another card exists in the same movement series.

### Famous Buildings Front

- Building image only.

### Famous Buildings Back

- Name.
- Architect.
- Construction dates as a flexible display string.
- Style.
- Location, city and country.
- Concise gloss.
- Previous/next series controls when another card exists in the same style/movement series.

## Data Architecture

Use one manifest file plus one JSON file per dataset. The manifest is the source of truth for how datasets are loaded, filtered, searched, validated, and rendered.

Proposed files:

```text
data/datasets.json
data/battles.json
data/paintings.json
data/buildings.json
data/attributions.json
```

### Dataset Manifest

`requiredDetailFields` lists required fields inside `details`, including fields used only for filtering. A battle's continent requirement is expressed both as a required detail field and as the filter path:

```json
{ "id": "continent", "path": "details.continent", "required": true }
```

```json
[
  {
    "id": "battles",
    "label": "Historical Battles",
    "dataPath": "/data/battles.json",
    "searchFields": ["title", "details.war", "details.combatants", "details.location"],
    "series": {
      "label": "Battle Series",
      "keyPath": "details.series.key",
      "labelPath": "details.series.label",
      "orderPath": "details.series.order"
    },
    "filters": [
      {
        "id": "continent",
        "label": "Continent",
        "type": "multi",
        "path": "details.continent",
        "required": true,
        "options": ["Africa", "Asia", "Europe", "North America", "South America", "Oceania"]
      },
      {
        "id": "epoch",
        "label": "Epoch",
        "type": "multi",
        "path": "details.epoch",
        "required": true,
        "options": ["Ancient", "Medieval", "Early Modern", "Modern", "World Wars", "Contemporary"]
      }
    ],
    "requiredDetailFields": ["year", "location", "combatants", "outcome", "war", "continent", "epoch", "series", "gloss"],
    "optionalDetailFields": ["casualties"],
    "glossGuidance": { "style": "concise", "maxCharacters": 280 },
    "frontTemplate": [
      { "type": "image" },
      { "type": "title" }
    ],
    "backTemplate": [
      {
        "type": "statGrid",
        "fields": [
          { "label": "Year", "path": "details.year" },
          { "label": "Location", "path": "details.location" },
          { "label": "Combatants", "path": "details.combatants" },
          { "label": "Outcome", "path": "details.outcome" },
          { "label": "War", "path": "details.war" },
          { "label": "Casualties", "path": "details.casualties", "optional": true }
        ]
      },
      { "type": "gloss", "path": "details.gloss" }
    ]
  }
]
```

Example image-only front for paintings and buildings:

```json
{
  "frontTemplate": [
    { "type": "image" }
  ],
  "backTemplate": [
    { "type": "title" },
    {
      "type": "fieldList",
      "fields": [
        { "label": "Artist", "path": "details.artist" },
        { "label": "Year", "path": "details.year" },
        { "label": "Movement", "path": "details.movement" }
      ]
    },
    { "type": "gloss", "path": "details.gloss" }
  ]
}
```

### Shared Card Envelope

```json
{
  "id": "battle-hastings-1066",
  "dataset": "battles",
  "title": "Battle of Hastings",
  "image": {
    "src": "/assets/images/battles/battle-hastings-1066.jpg",
    "alt": "The Bayeux Tapestry showing Norman cavalry at the Battle of Hastings",
    "sourceUrl": "https://...",
    "license": "Public domain",
    "attribution": "..."
  },
  "details": {},
  "sources": []
}
```

### Adding Future Datasets

Future datasets should use the same envelope. A new subject, for example composers or scientific discoveries, should define its own `details` fields and filter taxonomy but still use the shared fields:

- `id`.
- `dataset`.
- `title`.
- `image`.
- `details`.
- `sources`.

The app should use manifest paths like `details.artist`, `details.constructionDates`, or `details.epoch` instead of hardcoded property names. Validation should also be manifest-driven: each dataset's `requiredDetailFields`, required filter paths/options, and gloss guidance determine the test expectations.

Series validation should also be manifest-driven. If a dataset declares `series`, tests should verify that every card has a non-empty series key, label, and order, and that `series.order` is unique within each `series.key`.

### Battles Card Shape

```json
{
  "id": "battle-hastings-1066",
  "dataset": "battles",
  "title": "Battle of Hastings",
  "image": {
    "src": "/assets/images/battles/battle-hastings-1066.jpg",
    "alt": "The Bayeux Tapestry showing Norman cavalry at the Battle of Hastings",
    "sourceUrl": "https://commons.wikimedia.org/wiki/...",
    "license": "Public domain",
    "attribution": "Bayeux Tapestry"
  },
  "details": {
    "year": "1066",
    "combatants": ["Normans", "Anglo-Saxons"],
    "outcome": "Norman victory",
    "war": "Norman Conquest of England",
    "casualties": "Estimates vary; exact total is disputed.",
    "location": "Hastings, England",
    "continent": "Europe",
    "epoch": "Medieval",
    "series": {
      "key": "norman-conquest-england",
      "label": "Norman Conquest of England",
      "order": 10661014
    },
    "gloss": "William, Duke of Normandy defeated King Harold II, ending Anglo-Saxon rule in England. The battle reshaped English politics, aristocracy, language, and landholding."
  },
  "sources": [
    {
      "label": "Wikidata",
      "url": "https://www.wikidata.org/wiki/Q..."
    },
    {
      "label": "Encyclopaedia Britannica",
      "url": "https://www.britannica.com/event/Battle-of-Hastings"
    }
  ]
}
```

### Paintings Card Shape

```json
{
  "id": "painting-mona-lisa",
  "dataset": "paintings",
  "title": "Mona Lisa",
  "image": {
    "src": "/assets/images/paintings/painting-mona-lisa.jpg",
    "alt": "Leonardo da Vinci's Mona Lisa",
    "sourceUrl": "https://...",
    "license": "Public domain",
    "attribution": "Leonardo da Vinci"
  },
  "details": {
    "artist": "Leonardo da Vinci",
    "year": "c. 1503-1506",
    "movement": "Renaissance",
    "series": {
      "key": "leonardo-da-vinci",
      "label": "Leonardo da Vinci",
      "order": 15030000
    },
    "gloss": "Leonardo's portrait is famous for its subtle expression, atmospheric landscape, and delicate sfumato modeling. It became one of the central images of Renaissance portraiture and later museum culture."
  },
  "sources": []
}
```

### Buildings Card Shape

```json
{
  "id": "building-pantheon-rome",
  "dataset": "buildings",
  "title": "Pantheon",
  "image": {
    "src": "/assets/images/buildings/building-pantheon-rome.jpg",
    "alt": "Exterior of the Pantheon in Rome",
    "sourceUrl": "https://...",
    "license": "CC BY-SA 4.0",
    "attribution": "..."
  },
  "details": {
    "architect": "Unknown; commissioned under Hadrian",
    "constructionDates": "c. AD 118-c. AD 126",
    "style": "Ancient Roman",
    "epoch": "Ancient",
    "city": "Rome",
    "country": "Italy",
    "location": "Rome, Italy",
    "series": {
      "key": "ancient-roman",
      "label": "Ancient Roman",
      "order": 1260000
    },
    "gloss": "The Pantheon is celebrated for its vast concrete dome and central oculus. Its engineering and preservation made it one of the most influential monuments of Roman architecture."
  },
  "sources": []
}
```

## Research Method

### General Rules

- Prefer public-domain or openly licensed images.
- Prefer stable sources with structured metadata: Wikidata, Wikimedia Commons, museum APIs, official monument/museum pages, Britannica, World History Encyclopedia, and reputable educational institutions.
- Store source URLs and image license metadata in each card.
- Do not copy long descriptions from sources. Write original, concise glosses after cross-checking facts.
- Cross-check each card against at least two sources when possible.
- Keep a curation notes file with inclusion rationale and unresolved uncertainties.
- Normalize uncertain dates to display strings while keeping optional sortable year fields.
- Use BC/AD for all displayed historical dates, not BCE/CE.

### Image Handling

Recommended approach:

- Remote images are acceptable for the MVP.
- Keep the image `src` flexible: it may be a remote URL or a local path.
- Local resized images under `assets/images/<dataset>/` can be added later for reliability/performance.
- Keep original source URL, license, creator, and attribution in JSON.
- If images are localized later, generate filenames from stable card ids and resize to a practical max dimension, for example 1400px on the long edge.
- Use `scripts/localize_images.py` for the localization pipeline. It reads dataset JSON, downloads remote `image.src` values, writes optimized images under `assets/images/<dataset>/`, and can rewrite dataset JSON when run with `--rewrite-json`.
- Run a dry pass first, for example `python3 scripts/localize_images.py --dry-run --dataset paintings`.
- Actual conversion requires Pillow: `python3 -m pip install -r requirements.txt`.
- Use JPEG/WebP for photos and paintings, PNG only when transparency or source quality requires it.

Image acceptance criteria:

- Subject is clearly identifiable.
- Image is not overly dark, tiny, watermarked, or dependent on a caption to understand.
- License allows reuse.
- Attribution is recorded.
- Alt text describes the visual, not just the title.

### Battles Research Plan

Primary inclusion guide:

- Use Wikipedia and Wikidata as the practical starting point for the first pass.
- Grow the dataset through vetted additions up to the 500-card target, preserving existing cards and adding the most consequential missing battles first.
- `1001 Battles That Changed the Course of History` can be used as optional inspiration if available later, but the dataset should not depend on access to it.
- Do not copy descriptions from source pages. Write original summaries after checking the facts.

Selection principles:

- Prioritize historically consequential battles across eras and regions.
- Prioritize historically consequential, well-known battles first; use regional, chronological, and series balance as secondary constraints rather than replacing major omissions with lower-impact balance rows.
- Include a mix of land, naval, siege, and air/combined-arms battles where image availability permits.
- Prefer battles with a usable public-domain painting, map, artifact image, or historically relevant illustration.

Fields to research:

- Name.
- Year or date range.
- Combatants as exactly two opposing display sides; group allied participants into one side string.
- Victor/outcome.
- War/campaign/conflict.
- Series key, label, and order. Use the war itself for smaller conflicts; use a flat theater/campaign series for larger wars such as the Seven Years' War, World War I, or World War II.
- Casualties as an optional display string, including uncertainty or scope when useful, for example whether estimates include killed only, wounded, prisoners, or civilians. Prefer side-by-side casualty strings when the source supports them.
- Location, formatted as City, Country.
- Continent, for filtering only.
- Epoch, for filtering only.
- Concise gloss.
- Image and attribution.
- Sources.

Candidate source workflow:

1. Build a candidate list of 120-150 battles from Wikipedia list pages, Wikidata queries, and cross-check lists.
2. Assign continent, epoch, and series.
3. Use Wikipedia/Wikidata for structured fields and image candidates.
4. Verify high-importance facts with Britannica, World History Encyclopedia, official museum pages, military history references, or academic sources.
5. For broad wars, split battles into flat top-level theater/campaign series rather than nested sub-series.
6. Select battle additions by historical impact first, then regional balance, series coverage, and image availability.
7. Write original glosses.
8. Validate every card has required fields.

### Paintings Research Plan

Goal: build a curated set of canonical works for image recognition and lightweight art-historical context, with no fixed upper limit.

Fields to research:

- Name.
- Artist.
- Year.
- Artistic movement.
- Series key, label, and order, based on the artist and ordered by creation date.
- Concise gloss.
- Image and attribution.
- Sources.

Candidate source workflow:

1. Start with public-domain, high-recognition works from museum collections, Wikidata, and art-history survey lists.
2. Target a balanced list across centuries and movements.
3. Prefer works whose images are public domain or officially provided by museums.
4. Use museum APIs/pages for authoritative name, artist, year/date, and movement/context.
5. Use Wikidata as a discovery and cross-check layer, not the only authority.
6. Normalize movements into the filter taxonomy and assign artist-based series values.
7. Write original glosses focused on recognition, style, and significance.

Suggested sources:

- The Metropolitan Museum of Art Collection API.
- Rijksmuseum API.
- Art Institute of Chicago API.
- National Gallery of Art open data.
- Louvre official pages where accessible.
- Wikimedia Commons and Wikidata.

### Buildings Research Plan

Fields to research:

- Name.
- Architect.
- Construction dates as a flexible display string.
- Style.
- Location, city and country.
- Epoch.
- Style/movement filter value.
- Series key, label, and order, usually based on style/movement.
- Concise gloss.
- Image attribution.
- Sources.

Construction dates should be stored in one string field, `details.constructionDates`, so complex histories can be represented naturally, for example: `Built 1884-1894; rebuilt 1961-1964; restored 1995-1999`.

Candidate source workflow:

1. Start from UNESCO World Heritage, architectural survey lists, Wikidata, and official site pages.
2. Include a mix of ancient monuments, sacred architecture, civic buildings, palaces, towers, modern landmarks, and contemporary architecture.
3. Normalize dates into the epoch taxonomy and architectural labels into the style/movement taxonomy.
4. Prefer official site or Wikimedia Commons images with clear licensing.
5. Assign style/movement-based series values.
6. Cross-check construction dates and architect attribution, especially for ancient/vernacular buildings where authorship may be unknown.
7. Write original glosses that explain form, context, and why the building matters.

Suggested sources:

- UNESCO World Heritage Centre.
- Official building/site pages.
- Architectural museum or foundation pages.
- Britannica.
- Khan Academy or Smarthistory for context.
- Wikimedia Commons and Wikidata.

## Proposed Implementation Plan

### Phase 1: Specification And App Skeleton

- Create static app structure.
- Port the `gquiz` swipe/flip/grade engine into dataset-neutral functions.
- Add dataset selector generated from `data/datasets.json`.
- Add dynamic filter dropdown generated from the selected dataset manifest.
- Add dynamic search driven by manifest `searchFields`.
- Add generic score modal.
- Add manifest-driven card renderer with reusable template primitives.
- Add manifest-driven previous/next series navigation on the card back.
- Use tiny fixture datasets for all three subjects.

### Phase 2: Data Schema And Validation

- Add `data/datasets.json`.
- Add fixture-quality `data/battles.json`, `data/paintings.json`, and `data/buildings.json`.
- Add validation tests for:
  - Unique ids.
  - Required shared fields.
  - Required detail fields from each dataset manifest.
  - Every manifest filter path resolves to a required, non-empty card field.
  - Filter values match manifest options.
  - Series key, label, and order resolve when a dataset declares series.
  - Series order is unique within each series key.
  - Image `src`, `alt`, `sourceUrl`, and `license` exist.
  - Gloss is present and follows manifest brevity guidance when configured.
  - Template paths resolve for every card.

### Phase 3: Research Pipeline

- Create a research notes file per dataset.
- Gather candidate lists.
- Select vetted cards based on consequence, recognizability, source quality, and image availability; datasets are not limited by fixed card counts.
- Save source URLs and attribution.
- Download/resize images where licensing allows.
- Write original glosses.

### Phase 4: Visual Polish And Accessibility

- Ensure image cards work on mobile and desktop.
- Keep the first screen as the actual study app, not a landing page.
- Add responsive image constraints so long titles and stats do not overflow.
- Add meaningful alt text.
- Respect reduced-motion preferences.
- Preserve keyboard control.

### Phase 5: Full Test Pass

- Adapt `gquiz` Playwright tests for:
  - Dataset switching.
  - Dataset-specific filters.
  - Correct/incorrect state isolation per dataset.
  - Search in active dataset only.
  - Completion and clear-correct behavior.
  - Load failure for one dataset.
  - Card rendering for each subject template.
  - Previous/next series navigation without changing correct/incorrect counts.
- Add data-integrity tests for all JSON files and image metadata.
- If local images are added, validate local image paths exist.

## Acceptance Criteria

- User can select Historical Battles, Famous Paintings, or Famous Buildings.
- The visible filters update for the selected dataset.
- Every visible filter maps to a required data field validated against the dataset manifest.
- User can study a filtered subset on one page.
- The default study stack appears in randomized order rather than source data order.
- User can flip, swipe, and button-grade cards.
- Correct and incorrect counts update immediately.
- Score lists only show cards matching the selected dataset and active filters.
- Correct cards disappear from the active deck until cleared.
- Wrong cards remain in rotation.
- Search only searches the selected dataset and active filters.
- Cards in a multi-card series show compact previous/next navigation on the back.
- Series navigation is computed from `series.key` and `series.order`, with no hand-authored `prevId` or `nextId`.
- Large-war battle series can be split by theater or campaign as flat top-level series.
- Using previous/next navigation does not mark a card correct or incorrect.
- Data files include source and attribution metadata.
- A new dataset can be added by adding manifest/data/assets, with no changes to grading, swipe, score, or filter state logic.
- Tests cover core study behavior and data integrity.
