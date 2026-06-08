const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

function getPath(obj, keyPath) {
  return String(keyPath || '')
    .split('.')
    .filter(Boolean)
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function valuesAtPath(obj, keyPath) {
  const value = getPath(obj, keyPath);
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

function assertRequired(value, message) {
  if (Array.isArray(value)) {
    assert.ok(value.length > 0, message);
    for (const item of value) assert.ok(String(item).trim(), message);
    return;
  }
  assert.ok(value !== undefined && value !== null && String(value).trim(), message);
}

function templatePaths(template) {
  const paths = [];
  for (const part of template || []) {
    if (part.path) paths.push({ path: part.path, optional: Boolean(part.optional) });
    for (const field of part.fields || []) {
      if (field.path) paths.push({ path: field.path, optional: Boolean(field.optional) });
    }
  }
  return paths;
}

async function readJson(file) {
  return JSON.parse(await fs.readFile(path.join(root, file), 'utf8'));
}

(async function main() {
  const battleDetails = await readJson('research/candidates/battle-details.json');
  for (const [id, details] of Object.entries(battleDetails)) {
    assert.equal(
      valuesAtPath({ details }, 'details.combatants').length,
      2,
      `${id} source combatants must be exactly two display sides`
    );
  }

  const manifests = await readJson('data/datasets.json');
  assert.ok(Array.isArray(manifests), 'datasets manifest must be an array');
  assert.ok(manifests.length >= 3, 'expected at least three datasets');

  const seenDatasetIds = new Set();

  for (const manifest of manifests) {
    assertRequired(manifest.id, 'dataset id is required');
    assertRequired(manifest.label, `${manifest.id} label is required`);
    assertRequired(manifest.dataPath, `${manifest.id} dataPath is required`);
    assert.ok(!seenDatasetIds.has(manifest.id), `duplicate dataset id ${manifest.id}`);
    seenDatasetIds.add(manifest.id);

    const cards = await readJson(manifest.dataPath.replace(/^\//, ''));
    assert.ok(Array.isArray(cards), `${manifest.id} cards must be an array`);
    assert.ok(cards.length > 0, `${manifest.id} needs fixture cards`);

    const seenCardIds = new Set();
    const seenSeriesOrders = new Map();
    const allTemplatePaths = [
      ...templatePaths(manifest.frontTemplate),
      ...templatePaths(manifest.backTemplate),
    ];

    for (const card of cards) {
      assertRequired(card.id, `${manifest.id} card id is required`);
      assert.ok(!seenCardIds.has(card.id), `duplicate card id ${card.id}`);
      seenCardIds.add(card.id);
      assert.equal(card.dataset, manifest.id, `${card.id} dataset must match manifest`);
      assertRequired(card.title, `${card.id} title is required`);
      assertRequired(card.details, `${card.id} details are required`);
      assertRequired(card.image?.src, `${card.id} image.src is required`);
      assertRequired(card.image?.alt, `${card.id} image.alt is required`);
      assertRequired(card.image?.sourceUrl, `${card.id} image.sourceUrl is required`);
      assertRequired(card.image?.license, `${card.id} image.license is required`);
      assertRequired(card.image?.attribution, `${card.id} image.attribution is required`);
      assert.ok(Array.isArray(card.sources) && card.sources.length > 0, `${card.id} needs sources`);

      for (const field of manifest.requiredDetailFields || []) {
        assertRequired(card.details[field], `${card.id} details.${field} is required`);
      }

      for (const filter of manifest.filters || []) {
        assertRequired(filter.path, `${manifest.id} filter ${filter.id} needs a path`);
        const values = valuesAtPath(card, filter.path);
        assert.ok(values.length > 0, `${card.id} filter ${filter.id} resolves empty`);
        for (const value of values) {
          assert.ok(
            filter.options.includes(value),
            `${card.id} filter ${filter.id} has invalid value ${value}`
          );
        }
      }

      if (manifest.series) {
        const seriesKey = getPath(card, manifest.series.keyPath);
        const seriesLabel = getPath(card, manifest.series.labelPath || manifest.series.keyPath);
        const seriesOrder = getPath(card, manifest.series.orderPath);
        assertRequired(seriesKey, `${card.id} series key is required`);
        assertRequired(seriesLabel, `${card.id} series label is required`);
        assert.ok(Number.isFinite(seriesOrder), `${card.id} series order must be a finite number`);
        if (!seenSeriesOrders.has(seriesKey)) seenSeriesOrders.set(seriesKey, new Set());
        assert.ok(
          !seenSeriesOrders.get(seriesKey).has(seriesOrder),
          `${card.id} duplicate series order ${seriesOrder} in ${seriesKey}`
        );
        seenSeriesOrders.get(seriesKey).add(seriesOrder);
      }

      if (manifest.id === 'battles') {
        assert.equal(valuesAtPath(card, 'details.continent').length, 1, `${card.id} must have exactly one continent`);
        assert.equal(valuesAtPath(card, 'details.combatants').length, 2, `${card.id} combatants must be exactly two display sides`);
      }

      for (const templatePath of allTemplatePaths) {
        if (templatePath.optional && valuesAtPath(card, templatePath.path).length === 0) continue;
        assertRequired(getPath(card, templatePath.path), `${card.id} template path ${templatePath.path} is required`);
      }

      const gloss = String(card.details.gloss || '');
      assertRequired(gloss, `${card.id} gloss is required`);
      if (manifest.glossGuidance?.maxCharacters) {
        assert.ok(
          gloss.length <= manifest.glossGuidance.maxCharacters,
          `${card.id} gloss exceeds ${manifest.glossGuidance.maxCharacters} characters`
        );
      }
    }
  }

  console.log(`Validated ${manifests.length} datasets.`);
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
