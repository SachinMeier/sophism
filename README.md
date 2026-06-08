# Sophism

Single-page flashcard study app for learning from image-backed card datasets.

## Run Locally

```sh
npm install
npm start
```

Open `http://127.0.0.1:8080`.

## GitHub Pages

The Pages deployment publishes two entry points:

- Flashcards: `/`
- Dataset visualization report: `/research/dataset-visualizations.html`

The visualization report is generated during the Pages workflow on every push to `master`, then included in the deployed artifact.

## Test

```sh
npm test
```

The test command runs dataset integrity checks and Playwright browser tests.

## Data Policy

Tracked in git:

- `data/*.json`: runtime card datasets and manifest used by the app.
- `research/candidates/*`: curation source files, including TSV ledgers and media/detail JSON.
- `research/scripts/*`: repeatable promotion, normalization, audit, and report scripts.
- `research/*.md`: curation notes and working rules.

Ignored:

- `node_modules/`, Playwright reports, test output, caches, and local env files.
- `research/dataset-visualizations.html`, because it is generated and embeds the datasets.
- Scratch exports such as `research/tmp/`, `research/scratch/`, `*.scratch.tsv`, and `*.tmp.tsv`.

Current TSV files under `research/candidates/` are source ledgers, not disposable staging files. Keep them tracked unless a future file is clearly a temporary export.

## Data Commands

Promote the battle curation ledger into the runtime dataset:

```sh
npm run promote:battles
```

Regenerate the local dataset visualization report:

```sh
npm run report
```

Build the GitHub Pages artifact locally:

```sh
npm run build:pages
```
