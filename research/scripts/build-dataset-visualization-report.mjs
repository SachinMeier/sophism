import { readFileSync, writeFileSync } from 'node:fs';

const OUTPUT_PATH = 'research/dataset-visualizations.html';

const datasetConfigs = [
  {
    id: 'battles',
    label: 'Battles',
    dataPath: 'data/battles.json',
    accent: '#0f766e',
    accentAlt: '#7c3aed',
    builder: buildBattleReport,
  },
  {
    id: 'paintings',
    label: 'Paintings',
    dataPath: 'data/paintings.json',
    accent: '#9f4b1e',
    accentAlt: '#2563eb',
    builder: buildPaintingReport,
  },
  {
    id: 'buildings',
    label: 'Buildings',
    dataPath: 'data/buildings.json',
    accent: '#2563eb',
    accentAlt: '#b45309',
    builder: buildBuildingReport,
  },
];

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function jsonForScript(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function asList(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  return value ? [value] : [];
}

function formatValue(value) {
  const list = asList(value);
  return list.length ? list.join(', ') : 'Unknown';
}

function countBy(items, getter, options = {}) {
  const counts = new Map();
  for (const item of items) {
    const keys = asList(getter(item));
    for (const key of keys.length ? keys : ['Unknown']) {
      counts.set(String(key), (counts.get(String(key)) || 0) + 1);
    }
  }
  const rows = [...counts.entries()];
  if (options.order) {
    const orderMap = new Map(options.order.map((label, index) => [label, index]));
    return rows.sort((a, b) => {
      const ai = orderMap.has(a[0]) ? orderMap.get(a[0]) : Number.MAX_SAFE_INTEGER;
      const bi = orderMap.has(b[0]) ? orderMap.get(b[0]) : Number.MAX_SAFE_INTEGER;
      return ai - bi || a[0].localeCompare(b[0]);
    });
  }
  if (options.sort === 'label') return rows.sort((a, b) => a[0].localeCompare(b[0]));
  if (options.sort === 'custom') return rows.sort(options.compare);
  return rows.sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function groupBy(items, getter, options = {}) {
  const groups = new Map();
  for (const item of items) {
    const key = String(getter(item) || 'Unknown');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.entries()]
    .map(([label, groupItems]) => ({
      label,
      count: groupItems.length,
      items: groupItems.sort(options.itemCompare || compareBySeriesThenTitle),
    }))
    .sort((a, b) => {
      if (options.sort === 'label') return a.label.localeCompare(b.label);
      return b.count - a.count || a.label.localeCompare(b.label);
    });
}

function compareBySeriesThenTitle(a, b) {
  const ao = Number(a.details.series?.order ?? 0);
  const bo = Number(b.details.series?.order ?? 0);
  return ao - bo || String(itemYear(a)).localeCompare(String(itemYear(b))) || a.title.localeCompare(b.title);
}

function itemYear(item) {
  return item.details.year || item.details.constructionDates || '';
}

function centuryRank(label) {
  if (/earlier/i.test(label)) return 0;
  const match = String(label).match(/(\d+)/);
  return match ? Number(match[1]) : Number.MAX_SAFE_INTEGER;
}

function compareCenturyRows(a, b) {
  return centuryRank(a[0]) - centuryRank(b[0]) || a[0].localeCompare(b[0]);
}

function barChart(rows, className = '') {
  const max = Math.max(...rows.map(([, count]) => count), 1);
  return `<div class="bars ${escapeHtml(className)}">
${rows.map(([label, count]) => {
  const width = Math.max(4, Math.round((count / max) * 100));
  return `<div class="bar-row">
  <div class="bar-label">${escapeHtml(label)}</div>
  <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
  <div class="bar-count">${count}</div>
</div>`;
}).join('\n')}
</div>`;
}

function statGrid(stats) {
  return `<div class="stats">
${stats.map((stat) => `<div class="stat"><strong>${escapeHtml(stat.value)}</strong><span>${escapeHtml(stat.label)}</span></div>`).join('\n')}
</div>`;
}

function groupDetails(groups, idPrefix, lineRenderer, note) {
  return `<section class="groups-section">
  <h2>Series Groups</h2>
  ${note ? `<p class="note">${escapeHtml(note)}</p>` : ''}
  <div class="details-list">
    ${groups.map((group, index) => `<details ${index < 10 ? 'open' : ''}>
  <summary>
    <span>${escapeHtml(group.label)}</span>
    <strong>${group.count}</strong>
  </summary>
  <ol id="${idPrefix}-${index}">
    ${group.items.map(lineRenderer).join('\n')}
  </ol>
</details>`).join('\n')}
  </div>
</section>`;
}

function secondaryGroupDetails(title, groups, idPrefix, lineRenderer, note) {
  return `<section>
  <h2>${escapeHtml(title)}</h2>
  ${note ? `<p class="note">${escapeHtml(note)}</p>` : ''}
  <div class="details-list">
    ${groups.map((group, index) => `<details ${index < 10 ? 'open' : ''}>
  <summary>
    <span>${escapeHtml(group.label)}</span>
    <strong>${group.count}</strong>
  </summary>
  <ol id="${idPrefix}-${index}">
    ${group.items.map(lineRenderer).join('\n')}
  </ol>
</details>`).join('\n')}
  </div>
</section>`;
}

function sourceLinks(item) {
  return item.sources
    .map((source) => `<a href="${escapeHtml(source.url)}">${escapeHtml(source.label)}</a>`)
    .join(', ');
}

function simpleTable(headers, rows) {
  return `<div class="table-wrap">
  <table>
    <thead>
      <tr>${headers.map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
    </thead>
    <tbody>
${rows.join('\n')}
    </tbody>
  </table>
</div>`;
}

function itemTitleButton(item) {
  return `<button class="item-title item-title-button" type="button">${escapeHtml(item.title)}</button>`;
}

function buildBattleReport(config, battles) {
  const epochOrder = ['Ancient', 'Medieval', 'Early Modern', 'Modern', 'World Wars', 'Contemporary'];
  const seriesGroups = groupBy(battles, (battle) => battle.details.series?.label, { sort: 'label' });
  const continentCounts = countBy(battles, (battle) => battle.details.continent);
  const epochCounts = countBy(battles, (battle) => battle.details.epoch, { order: epochOrder });
  const missingCasualties = battles
    .filter((battle) => !battle.details.casualties)
    .sort((a, b) => a.details.epoch.localeCompare(b.details.epoch) || a.details.continent.localeCompare(b.details.continent) || a.title.localeCompare(b.title));
  const sideCasualties = battles.filter((battle) => /^[^:;]+: .+; [^:;]+: /.test(battle.details.casualties || ''));

  return {
    stats: [
      { value: battles.length, label: 'Total battles' },
      { value: seriesGroups.length, label: 'Series groups' },
      { value: battles.length - missingCasualties.length, label: 'With casualty data' },
      { value: sideCasualties.length, label: 'Side-by-side casualties' },
    ],
    sections: `
      <div class="grid">
        <section>
          <h2>Distribution By Continent</h2>
          ${barChart(continentCounts, 'primary-bars')}
        </section>
        <section>
          <h2>Distribution By Epoch</h2>
          ${barChart(epochCounts, 'secondary-bars')}
        </section>
      </div>

      ${groupDetails(seriesGroups, `${config.id}-series`, battleLine, 'Series are sorted alphabetically; battles inside each series use their series order.')}

      <section>
        <h2>Battles With No Casualty Data</h2>
        <p class="note">${missingCasualties.length} battles currently omit details.casualties because the value is optional and should only be shown when cleanly sourced.</p>
        ${simpleTable(['Battle', 'Year', 'War', 'Series', 'Continent', 'Epoch'], missingCasualties.map((battle) => `<tr data-item-id="${escapeHtml(battle.id)}">
  <td>${itemTitleButton(battle)}</td>
  <td>${escapeHtml(battle.details.year)}</td>
  <td>${escapeHtml(battle.details.war)}</td>
  <td>${escapeHtml(battle.details.series?.label)}</td>
  <td>${escapeHtml(battle.details.continent)}</td>
  <td>${escapeHtml(battle.details.epoch)}</td>
</tr>`))}
      </section>
    `,
  };
}

function battleLine(battle) {
  const casualty = battle.details.casualties
    ? `<span class="inline-note casualty">${escapeHtml(battle.details.casualties)}</span>`
    : '<span class="inline-note muted">no casualty data</span>';
  return `<li data-item-id="${escapeHtml(battle.id)}">
    ${itemTitleButton(battle)}
    <span class="meta">${escapeHtml(battle.details.year)} · ${escapeHtml(battle.details.continent)} · ${escapeHtml(battle.details.epoch)}</span>
    ${casualty}
  </li>`;
}

function buildPaintingReport(config, paintings) {
  const seriesGroups = groupBy(paintings, (painting) => painting.details.series?.label || painting.details.artist);
  const movementGroups = groupBy(paintings, (painting) => painting.details.movement);
  const movementCounts = countBy(paintings, (painting) => painting.details.movement);
  const centuryCounts = countBy(paintings, (painting) => painting.details.century, { sort: 'custom', compare: compareCenturyRows });
  const sourceCounts = countBy(paintings, (painting) => `${painting.sources.length} source${painting.sources.length === 1 ? '' : 's'}`, { sort: 'label' });
  const singleSourcePaintings = paintings
    .filter((painting) => painting.sources.length < 2)
    .sort((a, b) => a.details.movement.localeCompare(b.details.movement) || a.details.artist.localeCompare(b.details.artist) || a.title.localeCompare(b.title));

  return {
    stats: [
      { value: paintings.length, label: 'Total paintings' },
      { value: seriesGroups.length, label: 'Artist series groups' },
      { value: movementCounts.length, label: 'Movement labels' },
      { value: centuryCounts.length, label: 'Century labels' },
      { value: singleSourcePaintings.length, label: 'One-source records' },
    ],
    sections: `
      <div class="grid">
        <section>
          <h2>Distribution By Movement</h2>
          ${barChart(movementCounts, 'primary-bars')}
        </section>
        <section>
          <h2>Distribution By Century</h2>
          ${barChart(centuryCounts, 'secondary-bars')}
        </section>
        <section class="wide">
          <h2>Source Coverage</h2>
          <p class="note">Shows how many source links are attached to each painting record.</p>
          ${barChart(sourceCounts, 'tertiary-bars')}
        </section>
      </div>

      ${groupDetails(seriesGroups, `${config.id}-series`, paintingLine, 'Series are artist-based navigation groups; the largest ten groups are expanded.')}

      ${secondaryGroupDetails('Movement Groups', movementGroups, `${config.id}-movement`, paintingLine, 'Grouped by details.movement for a quick taxonomy audit.')}

      <section>
        <h2>Paintings With One Source</h2>
        <p class="note">${singleSourcePaintings.length} paintings have fewer than two source links.</p>
        ${simpleTable(['Painting', 'Artist', 'Year', 'Movement', 'Series', 'Sources'], singleSourcePaintings.map((painting) => `<tr data-item-id="${escapeHtml(painting.id)}">
  <td>${itemTitleButton(painting)}</td>
  <td>${escapeHtml(painting.details.artist)}</td>
  <td>${escapeHtml(painting.details.year)}</td>
  <td>${escapeHtml(painting.details.movement)}</td>
  <td>${escapeHtml(painting.details.series?.label)}</td>
  <td>${sourceLinks(painting)}</td>
</tr>`))}
      </section>
    `,
  };
}

function paintingLine(painting) {
  return `<li data-item-id="${escapeHtml(painting.id)}">
    ${itemTitleButton(painting)}
    <span class="meta">${escapeHtml(painting.details.year)} · ${escapeHtml(painting.details.artist)} · ${escapeHtml(painting.details.movement)}</span>
  </li>`;
}

function buildBuildingReport(config, buildings) {
  const epochOrder = ['Ancient', 'Medieval', 'Early Modern', 'Industrial', 'Modern', 'Contemporary'];
  const seriesGroups = groupBy(buildings, (building) => building.details.series?.label);
  const countryGroups = groupBy(buildings, (building) => building.details.country);
  const styleCounts = countBy(buildings, (building) => building.details.style);
  const epochCounts = countBy(buildings, (building) => building.details.epoch, { order: epochOrder });
  const countryCounts = countBy(buildings, (building) => building.details.country);
  const architectLabels = new Set(buildings.map((building) => building.details.architect).filter(Boolean));

  return {
    stats: [
      { value: buildings.length, label: 'Total buildings' },
      { value: seriesGroups.length, label: 'Series groups' },
      { value: countryGroups.length, label: 'Countries' },
      { value: styleCounts.length, label: 'Style labels' },
      { value: architectLabels.size, label: 'Architect labels' },
    ],
    sections: `
      <div class="grid">
        <section>
          <h2>Distribution By Style / Movement</h2>
          ${barChart(styleCounts, 'primary-bars')}
        </section>
        <section>
          <h2>Distribution By Epoch</h2>
          ${barChart(epochCounts, 'secondary-bars')}
        </section>
        <section class="wide">
          <h2>Distribution By Country</h2>
          ${barChart(countryCounts, 'tertiary-bars')}
        </section>
      </div>

      ${groupDetails(seriesGroups, `${config.id}-series`, buildingLine, 'Series are the navigation groups used by the flashcard app; the largest ten groups are expanded.')}

      ${secondaryGroupDetails('Country Groups', countryGroups, `${config.id}-country`, buildingLine, 'Grouped by details.country, keeping each building date, style, and location visible.')}
    `,
  };
}

function buildingLine(building) {
  return `<li data-item-id="${escapeHtml(building.id)}">
    ${itemTitleButton(building)}
    <span class="meta">${escapeHtml(building.details.constructionDates)} · ${escapeHtml(formatValue(building.details.style))} · ${escapeHtml(building.details.location)}</span>
  </li>`;
}

const reports = datasetConfigs.map((config) => {
  const items = JSON.parse(readFileSync(config.dataPath, 'utf8'));
  const report = config.builder(config, items);
  return { ...config, items, report };
});
const manifests = JSON.parse(readFileSync('data/datasets.json', 'utf8'));
const embeddedData = {
  manifests,
  datasets: Object.fromEntries(reports.map((report) => [report.id, report.items])),
};

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Dataset Visualizations</title>
  <style>
    :root {
      color-scheme: light;
      --ink: #1b2430;
      --muted: #687386;
      --line: #d8dee8;
      --paper: #f5f7fa;
      --panel: #ffffff;
      --accent: #0f766e;
      --accent-alt: #7c3aed;
      --accent-third: #b45309;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--ink);
      background: var(--paper);
      line-height: 1.45;
    }
    header {
      position: sticky;
      top: 0;
      z-index: 10;
      padding: 22px 32px 18px;
      background: rgba(255, 255, 255, 0.96);
      border-bottom: 1px solid var(--line);
      backdrop-filter: blur(10px);
    }
    .header-row {
      display: flex;
      justify-content: space-between;
      align-items: end;
      gap: 18px;
    }
    h1, h2 { margin: 0; letter-spacing: 0; }
    h1 { font-size: 28px; }
    h2 { font-size: 20px; margin-bottom: 12px; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; }
    a { color: inherit; text-decoration: none; }
    a:hover { color: var(--accent); }
    main { padding: 24px 32px 48px; max-width: 1440px; margin: 0 auto; }
    label {
      display: block;
      color: var(--muted);
      font-size: 12px;
      font-weight: 700;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    select {
      min-width: 220px;
      min-height: 42px;
      padding: 0 40px 0 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      font: inherit;
    }
    .subtitle { color: var(--muted); margin: 6px 0 0; }
    .dataset-panel { display: none; }
    .dataset-panel.active { display: block; }
    .dataset-heading {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 18px;
      margin-bottom: 16px;
    }
    .dataset-heading p { margin: 0; color: var(--muted); }
    .stats {
      display: grid;
      grid-template-columns: repeat(5, minmax(140px, 1fr));
      gap: 12px;
      margin-bottom: 16px;
    }
    .stat, section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    .stat { padding: 14px 16px; }
    .stat strong { display: block; font-size: 26px; }
    .stat span { color: var(--muted); font-size: 13px; }
    .grid {
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
      gap: 16px;
      margin-top: 16px;
    }
    section {
      padding: 18px;
      overflow: hidden;
      margin-top: 16px;
    }
    .grid section { margin-top: 0; }
    .wide { grid-column: 1 / -1; }
    .bar-row {
      display: grid;
      grid-template-columns: minmax(120px, 220px) minmax(120px, 1fr) 48px;
      gap: 12px;
      align-items: center;
      min-height: 30px;
    }
    .bar-label, .bar-count { font-size: 14px; }
    .bar-count { text-align: right; color: var(--muted); font-variant-numeric: tabular-nums; }
    .bar-track {
      height: 12px;
      background: #edf1f6;
      border-radius: 999px;
      overflow: hidden;
    }
    .bar-fill { height: 100%; border-radius: inherit; background: var(--accent); }
    .secondary-bars .bar-fill { background: var(--accent-alt); }
    .tertiary-bars .bar-fill { background: var(--accent-third); }
    .details-list {
      display: grid;
      grid-template-columns: minmax(0, 1fr);
    }
    details {
      border-top: 1px solid var(--line);
      padding: 0;
    }
    details:first-of-type { border-top: 0; }
    summary {
      cursor: pointer;
      display: flex;
      justify-content: space-between;
      gap: 16px;
      padding: 10px 2px;
      font-weight: 650;
    }
    summary strong {
      color: var(--muted);
      font-variant-numeric: tabular-nums;
    }
    ol { margin: 0 0 12px 22px; padding: 0; }
    li { padding: 6px 0; }
    .item-title { font-weight: 650; }
    .meta { color: var(--muted); margin-left: 6px; font-size: 13px; }
    .inline-note {
      display: inline-block;
      margin-left: 6px;
      color: #115e59;
      font-size: 12px;
      vertical-align: 1px;
    }
    .inline-note.muted { color: var(--muted); }
    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th, td {
      text-align: left;
      border-bottom: 1px solid var(--line);
      padding: 8px 10px;
      vertical-align: top;
    }
    th {
      position: sticky;
      top: 0;
      background: #f9fafc;
      z-index: 1;
    }
    .table-wrap {
      max-height: 620px;
      overflow: auto;
      border: 1px solid var(--line);
      border-radius: 8px;
    }
    .note { color: var(--muted); margin: 0 0 12px; }
    .dataset-panel li[data-item-id],
    .dataset-panel tr[data-item-id] {
      border-radius: 6px;
      cursor: pointer;
      transition: background-color 120ms ease, box-shadow 120ms ease;
    }
    .dataset-panel li[data-item-id]:hover,
    .dataset-panel li[data-item-id]:focus-within,
    .dataset-panel tr[data-item-id]:hover,
    .dataset-panel tr[data-item-id]:focus-within {
      background: #eef8f6;
      box-shadow: 0 0 0 4px #eef8f6;
    }
    .item-title-button {
      display: inline;
      padding: 0;
      border: 0;
      background: transparent;
      color: inherit;
      cursor: pointer;
      font: inherit;
      font-weight: 650;
      text-align: left;
      text-decoration: none;
    }
    .item-title-button:hover,
    .item-title-button:focus-visible {
      color: #0f766e;
      outline: none;
    }
    .item-title-button:focus-visible {
      box-shadow: 0 2px 0 #0f766e;
    }
    .command-overlay[hidden] { display: none; }
    .command-overlay {
      position: fixed;
      inset: 0;
      z-index: 40;
      display: grid;
      align-items: start;
      justify-items: center;
      padding: 9vh 18px 24px;
      background: rgba(16, 24, 40, 0.38);
    }
    .command-palette,
    .dataset-modal {
      width: min(760px, calc(100vw - 36px));
      background: #fff;
      border: 1px solid var(--line);
      border-radius: 10px;
      box-shadow: 0 22px 70px rgba(16, 24, 40, 0.24);
      overflow: hidden;
    }
    .command-head,
    .modal-head {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 14px;
      padding: 14px 16px;
      border-bottom: 1px solid var(--line);
      background: #fbfcfe;
    }
    .command-head h2,
    .modal-head h2 {
      margin: 0;
      font-size: 16px;
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .modal-actions {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      gap: 6px;
    }
    .icon-button {
      display: inline-grid;
      width: 34px;
      height: 34px;
      place-items: center;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fff;
      color: var(--ink);
      cursor: pointer;
      font: inherit;
      line-height: 1;
    }
    .icon-button:hover { border-color: #aeb8c8; background: #f7fafc; }
    .icon-button:disabled {
      color: #a8b2c0;
      cursor: not-allowed;
      background: #f4f6f8;
    }
    .modal-nav-button {
      font-size: 22px;
      font-weight: 650;
    }
    .command-body { padding: 14px 16px 16px; }
    .command-input {
      width: 100%;
      min-height: 44px;
      padding: 0 12px;
      border: 1px solid var(--line);
      border-radius: 8px;
      color: var(--ink);
      font: inherit;
      outline: none;
    }
    .command-input:focus {
      border-color: var(--accent);
      box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14);
    }
    .command-results {
      display: grid;
      gap: 4px;
      max-height: min(56vh, 520px);
      margin: 12px 0 0;
      padding: 0;
      list-style: none;
      overflow: auto;
    }
    .command-result {
      width: 100%;
      padding: 10px 12px;
      border: 0;
      border-radius: 8px;
      background: transparent;
      color: var(--ink);
      cursor: pointer;
      font: inherit;
      text-align: left;
    }
    .command-result:hover,
    .command-result.active {
      background: #eef8f6;
    }
    .command-result strong {
      display: block;
      font-size: 14px;
    }
    .command-result span {
      display: block;
      color: var(--muted);
      font-size: 12px;
      margin-top: 2px;
    }
    .command-empty {
      margin: 14px 2px 0;
      color: var(--muted);
      font-size: 14px;
    }
    dialog.dataset-modal {
      max-width: none;
      max-height: min(88vh, 900px);
      padding: 0;
    }
    dialog.dataset-modal::backdrop {
      background: rgba(16, 24, 40, 0.42);
    }
    .modal-body {
      max-height: calc(min(88vh, 900px) - 64px);
      padding: 16px;
      overflow: auto;
    }
    .modal-figure {
      display: block;
      max-width: 100%;
      margin: 0 0 14px;
      border: 1px solid var(--line);
      border-radius: 8px;
      overflow: hidden;
      background: #f8fafc;
      width: fit-content;
      margin-inline: auto;
    }
    .modal-figure img {
      display: block;
      max-width: min(100%, 680px);
      max-height: 420px;
      width: auto;
      height: auto;
      object-fit: contain;
    }
    .modal-fields {
      display: grid;
      gap: 8px;
      margin: 0 0 14px;
    }
    .modal-field {
      display: grid;
      grid-template-columns: minmax(110px, 160px) minmax(0, 1fr);
      gap: 10px;
      align-items: baseline;
      padding: 8px 10px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #fbfcfe;
    }
    .modal-field dt {
      color: var(--muted);
      font-size: 12px;
      font-weight: 750;
      text-transform: uppercase;
    }
    .modal-field dd {
      margin: 0;
      font-weight: 650;
    }
    .modal-section {
      margin-top: 14px;
      padding: 0;
      border: 0;
      border-radius: 0;
      background: transparent;
      overflow: visible;
    }
    .modal-section h3 {
      margin: 0 0 6px;
      font-size: 13px;
      text-transform: uppercase;
      color: var(--muted);
    }
    .source-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 0;
      padding: 0;
      list-style: none;
    }
    .source-list a {
      display: inline-block;
      padding: 5px 8px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: #fff;
      font-size: 12px;
    }
    body[data-dataset="battles"] { --accent: #0f766e; --accent-alt: #7c3aed; --accent-third: #b45309; }
    body[data-dataset="paintings"] { --accent: #9f4b1e; --accent-alt: #2563eb; --accent-third: #0f766e; }
    body[data-dataset="buildings"] { --accent: #2563eb; --accent-alt: #b45309; --accent-third: #0f766e; }
    @media (max-width: 980px) {
      header, main { padding-left: 18px; padding-right: 18px; }
      .header-row, .dataset-heading { align-items: stretch; flex-direction: column; }
      .stats, .grid { grid-template-columns: 1fr; }
      .wide { grid-column: auto; }
      select { width: 100%; }
      .bar-row { grid-template-columns: minmax(90px, 150px) minmax(90px, 1fr) 42px; }
      .command-overlay { padding-top: 64px; }
      .modal-head { align-items: flex-start; }
      .modal-actions { gap: 4px; }
      .modal-field { grid-template-columns: 1fr; gap: 2px; }
      .modal-figure img { max-height: 320px; }
    }
  </style>
</head>
<body data-dataset="${escapeHtml(reports[0].id)}">
  <header>
    <div class="header-row">
      <div>
        <h1>Dataset Visualizations</h1>
        <p class="subtitle">Generated from the current battles, paintings, and buildings JSON datasets.</p>
      </div>
      <div class="control">
        <label for="dataset-select">Dataset</label>
        <select id="dataset-select">
          ${reports.map((report) => `<option value="${escapeHtml(report.id)}">${escapeHtml(report.label)}</option>`).join('\n')}
        </select>
      </div>
    </div>
  </header>
  <main>
    ${reports.map((report, index) => `<article class="dataset-panel ${index === 0 ? 'active' : ''}" data-dataset-panel="${escapeHtml(report.id)}">
      <div class="dataset-heading">
        <div>
          <h2>${escapeHtml(report.label)}</h2>
          <p>Generated from <code>${escapeHtml(report.dataPath)}</code>.</p>
        </div>
      </div>
      ${statGrid(report.report.stats)}
      ${report.report.sections}
    </article>`).join('\n')}
  </main>
  <div class="command-overlay" id="datasetSearchOverlay" hidden>
    <div class="command-palette" role="dialog" aria-modal="true" aria-labelledby="datasetSearchTitle">
      <div class="command-head">
        <h2 id="datasetSearchTitle">Search</h2>
        <button class="icon-button" id="datasetSearchClose" type="button" aria-label="Close">&times;</button>
      </div>
      <div class="command-body">
        <input class="command-input" id="datasetSearchInput" type="search" autocomplete="off" placeholder="Search this dataset">
        <ol class="command-results" id="datasetSearchResults"></ol>
        <p class="command-empty" id="datasetSearchEmpty" hidden>No results.</p>
      </div>
    </div>
  </div>
  <dialog class="dataset-modal" id="datasetItemModal" aria-labelledby="datasetItemModalTitle">
    <div class="modal-head">
      <h2 id="datasetItemModalTitle">Item</h2>
      <div class="modal-actions">
        <button class="icon-button modal-nav-button" id="datasetItemModalPrev" type="button" aria-label="Previous item" title="Previous item">&lsaquo;</button>
        <button class="icon-button modal-nav-button" id="datasetItemModalNext" type="button" aria-label="Next item" title="Next item">&rsaquo;</button>
        <button class="icon-button" id="datasetItemModalClose" type="button" aria-label="Close">&times;</button>
      </div>
    </div>
    <div class="modal-body" id="datasetItemModalBody"></div>
  </dialog>
  <script type="application/json" id="datasetVisualizationData">${jsonForScript(embeddedData)}</script>
  <script>
    const select = document.getElementById('dataset-select');
    const panels = [...document.querySelectorAll('[data-dataset-panel]')];
    const ids = panels.map((panel) => panel.dataset.datasetPanel);
    const searchOverlay = document.getElementById('datasetSearchOverlay');
    const searchTitle = document.getElementById('datasetSearchTitle');
    const searchInput = document.getElementById('datasetSearchInput');
    const searchResults = document.getElementById('datasetSearchResults');
    const searchEmpty = document.getElementById('datasetSearchEmpty');
    const searchClose = document.getElementById('datasetSearchClose');
    const itemModal = document.getElementById('datasetItemModal');
    const itemModalTitle = document.getElementById('datasetItemModalTitle');
    const itemModalBody = document.getElementById('datasetItemModalBody');
    const itemModalClose = document.getElementById('datasetItemModalClose');
    const itemModalPrev = document.getElementById('datasetItemModalPrev');
    const itemModalNext = document.getElementById('datasetItemModalNext');
    const embeddedDataElement = document.getElementById('datasetVisualizationData');
    const embeddedData = (() => {
      try {
        return JSON.parse(embeddedDataElement?.textContent || '{}');
      } catch (error) {
        console.error(error);
        return {};
      }
    })();

    const state = {
      activeDatasetId: ids[0],
      manifests: new Map(),
      datasets: new Map(),
      searchMatches: [],
      activeSearchIndex: 0,
      lastFocusedElement: null,
      manifestPromise: null,
      modalDatasetId: null,
      modalItems: [],
      modalIndex: -1,
    };

    const labelOverrides = {
      architect: 'Architect',
      casualties: 'Casualties',
      city: 'City',
      combatants: 'Combatants',
      constructionDates: 'Construction',
      continent: 'Continent',
      country: 'Country',
      epoch: 'Epoch',
      gloss: 'Gloss',
      location: 'Location',
      movement: 'Movement',
      outcome: 'Outcome',
      series: 'Series',
      style: 'Style',
      war: 'War',
      year: 'Year',
    };

    function showDataset(id, shouldUpdateHash = true) {
      const nextId = ids.includes(id) ? id : ids[0];
      state.activeDatasetId = nextId;
      document.body.dataset.dataset = nextId;
      select.value = nextId;
      for (const panel of panels) {
        panel.classList.toggle('active', panel.dataset.datasetPanel === nextId);
      }
      if (shouldUpdateHash) history.replaceState(null, '', '#' + nextId);
    }

    function escapeHtml(value) {
      return String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function normalizeText(value) {
      return String(value ?? '').toLowerCase().replace(/\\s+/g, ' ').trim();
    }

    function valueAt(item, path) {
      if (!path) return undefined;
      return path.split('.').reduce((value, key) => {
        if (value == null) return undefined;
        return value[key];
      }, item);
    }

    function labelForKey(key) {
      if (labelOverrides[key]) return labelOverrides[key];
      return String(key)
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/^\\w/, (letter) => letter.toUpperCase());
    }

    function pathKey(path) {
      return path?.replace(/^details\\./, '');
    }

    function formatValue(value) {
      if (Array.isArray(value)) return value.join(' vs ');
      if (value && typeof value === 'object') {
        if ('label' in value && 'order' in value) return value.label + ' (' + value.order + ')';
        if ('label' in value) return value.label;
        return Object.entries(value)
          .filter(([, entryValue]) => entryValue != null && entryValue !== '')
          .map(([key, entryValue]) => labelForKey(key) + ': ' + formatValue(entryValue))
          .join(', ');
      }
      return value ?? '';
    }

    function visualizationPath(path) {
      if (!path) return '';
      return path.startsWith('/') ? '..' + path : '../' + path;
    }

    function cacheManifests(manifests) {
      for (const manifest of manifests ?? []) state.manifests.set(manifest.id, manifest);
      return manifests ?? [];
    }

    async function loadManifests() {
      if (!state.manifestPromise) {
        state.manifestPromise = Promise.resolve().then(async () => {
          if (Array.isArray(embeddedData.manifests) && embeddedData.manifests.length) {
            return cacheManifests(embeddedData.manifests);
          }
          const response = await fetch('../data/datasets.json');
          if (!response.ok) throw new Error('Could not load datasets.json (' + response.status + ')');
          return cacheManifests(await response.json());
        });
      }
      return state.manifestPromise;
    }

    async function loadDataset(datasetId) {
      await loadManifests();
      if (state.datasets.has(datasetId)) return state.datasets.get(datasetId);
      const manifest = state.manifests.get(datasetId);
      if (!manifest) throw new Error('Unknown dataset: ' + datasetId);
      if (Array.isArray(embeddedData.datasets?.[datasetId])) {
        state.datasets.set(datasetId, embeddedData.datasets[datasetId]);
        return embeddedData.datasets[datasetId];
      }
      const response = await fetch(visualizationPath(manifest.dataPath));
      if (!response.ok) throw new Error('Could not load ' + manifest.dataPath + ' (' + response.status + ')');
      const data = await response.json();
      state.datasets.set(datasetId, data);
      return data;
    }

    function fieldsFromTemplate(manifest) {
      const fields = [];
      for (const part of manifest?.backTemplate ?? []) {
        for (const field of part.fields ?? []) fields.push(field);
      }
      return fields;
    }

    function modalFields(manifest, item) {
      const fields = [];
      const seen = new Set();

      function addField(label, path) {
        const key = pathKey(path);
        if (!key || key === 'gloss' || key === 'series' || seen.has(key)) return;
        const value = valueAt(item, path);
        const formatted = formatValue(value);
        if (!formatted) return;
        seen.add(key);
        fields.push({ label, value: formatted });
      }

      for (const field of fieldsFromTemplate(manifest)) {
        addField(field.label ?? labelForKey(pathKey(field.path)), field.path);
      }

      for (const key of [...(manifest?.requiredDetailFields ?? []), ...(manifest?.optionalDetailFields ?? [])]) {
        addField(labelForKey(key), 'details.' + key);
      }

      return fields;
    }

    function metaValues(manifest, item) {
      const paths = new Set([...(manifest?.searchFields ?? [])]);
      for (const field of fieldsFromTemplate(manifest)) paths.add(field.path);
      return [...paths]
        .filter((path) => path && path !== 'title')
        .map((path) => formatValue(valueAt(item, path)))
        .filter(Boolean)
        .slice(0, 4);
    }

    function searchHaystack(manifest, item) {
      const pieces = [item.title, item.id];
      for (const path of manifest?.searchFields ?? []) pieces.push(formatValue(valueAt(item, path)));
      for (const key of manifest?.requiredDetailFields ?? []) pieces.push(formatValue(valueAt(item, 'details.' + key)));
      return normalizeText(pieces.filter(Boolean).join(' '));
    }

    function scoreItem(manifest, item, query) {
      const normalizedQuery = normalizeText(query);
      if (!normalizedQuery) return 1;
      const title = normalizeText(item.title);
      const haystack = searchHaystack(manifest, item);
      if (title === normalizedQuery) return 1000;
      let score = title.includes(normalizedQuery) ? 600 : 0;
      if (haystack.includes(normalizedQuery)) score += 120;
      for (const token of normalizedQuery.split(' ').filter(Boolean)) {
        if (title.includes(token)) score += 40;
        if (haystack.includes(token)) score += 10;
      }
      return score;
    }

    async function updateSearchResults() {
      const datasetId = state.activeDatasetId;
      const manifest = state.manifests.get(datasetId);
      const query = searchInput.value;
      searchResults.innerHTML = '<li class="command-empty">Loading...</li>';
      searchEmpty.hidden = true;

      try {
        const data = await loadDataset(datasetId);
        const matches = data
          .map((item) => ({ item, score: scoreItem(manifest, item, query) }))
          .filter((match) => match.score > 0)
          .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
          .slice(0, 12)
          .map((match) => match.item);
        state.searchMatches = matches;
        state.activeSearchIndex = 0;
        renderSearchResults();
      } catch (error) {
        searchResults.innerHTML = '';
        searchEmpty.hidden = false;
        searchEmpty.textContent = error.message;
      }
    }

    function renderSearchResults() {
      const manifest = state.manifests.get(state.activeDatasetId);
      searchResults.innerHTML = state.searchMatches.map((item, index) => {
        const meta = metaValues(manifest, item).join(' · ');
        return '<li><button class="command-result ' + (index === state.activeSearchIndex ? 'active' : '') + '" type="button" data-item-id="' + escapeHtml(item.id) + '"><strong>' + escapeHtml(item.title) + '</strong>' + (meta ? '<span>' + escapeHtml(meta) + '</span>' : '') + '</button></li>';
      }).join('');
      searchEmpty.hidden = state.searchMatches.length > 0;
      searchEmpty.textContent = 'No results.';
    }

    async function openSearch() {
      state.lastFocusedElement = document.activeElement;
      searchInput.value = '';
      searchOverlay.hidden = false;
      searchTitle.textContent = 'Search ' + state.activeDatasetId;
      searchInput.placeholder = 'Search this dataset';
      searchResults.innerHTML = '<li class="command-empty">Loading...</li>';
      searchEmpty.hidden = true;
      searchInput.focus();
      try {
        await loadManifests();
        const manifest = state.manifests.get(state.activeDatasetId);
        searchTitle.textContent = 'Search ' + (manifest?.label ?? state.activeDatasetId);
        searchInput.placeholder = 'Search ' + (manifest?.label ?? 'this dataset');
        await updateSearchResults();
      } catch (error) {
        searchResults.innerHTML = '';
        searchEmpty.hidden = false;
        searchEmpty.textContent = error.message;
      }
    }

    function closeSearch() {
      searchOverlay.hidden = true;
      state.searchMatches = [];
      searchResults.innerHTML = '';
      if (state.lastFocusedElement?.focus) state.lastFocusedElement.focus();
    }

    function modalSequence(datasetId, items) {
      const panel = panels.find((candidate) => candidate.dataset.datasetPanel === datasetId);
      const itemById = new Map((items ?? []).map((item) => [item.id, item]));
      const seen = new Set();
      const sequence = [];
      for (const element of panel?.querySelectorAll('[data-item-id]') ?? []) {
        const id = element.dataset.itemId;
        if (!id || seen.has(id)) continue;
        const item = itemById.get(id);
        if (!item) continue;
        seen.add(id);
        sequence.push(item);
      }
      return sequence.length ? sequence : (items ?? []);
    }

    function setModalContext(datasetId, items, item) {
      const sequence = modalSequence(datasetId, items);
      let index = sequence.findIndex((candidate) => candidate.id === item.id);
      if (index === -1) {
        sequence.push(item);
        index = sequence.length - 1;
      }
      state.modalDatasetId = datasetId;
      state.modalItems = sequence;
      state.modalIndex = index;
      updateModalNavigation();
    }

    function updateModalNavigation() {
      const hasPrevious = state.modalIndex > 0;
      const hasNext = state.modalIndex >= 0 && state.modalIndex < state.modalItems.length - 1;
      itemModalPrev.disabled = !hasPrevious;
      itemModalNext.disabled = !hasNext;
      itemModalPrev.title = hasPrevious ? 'Previous item' : 'No previous item';
      itemModalNext.title = hasNext ? 'Next item' : 'No next item';
    }

    function openModal(manifest, item, datasetId = state.activeDatasetId, items = state.datasets.get(datasetId) ?? []) {
      setModalContext(datasetId, items, item);
      const details = item.details ?? {};
      const fields = modalFields(manifest, item);
      const series = details.series?.label ? formatValue(details.series) : '';
      const image = item.image?.src
        ? '<figure class="modal-figure"><img src="' + escapeHtml(item.image.src) + '" alt="' + escapeHtml(item.image.alt ?? item.title) + '" loading="eager" decoding="async"></figure>'
        : '';
      const sources = (item.sources ?? []).map((source) => '<li><a href="' + escapeHtml(source.url) + '" target="_blank" rel="noreferrer">' + escapeHtml(source.label ?? source.url) + '</a></li>').join('');
      const fieldRows = fields.map((field) => '<div class="modal-field"><dt>' + escapeHtml(field.label) + '</dt><dd>' + escapeHtml(field.value) + '</dd></div>').join('');
      const seriesRow = series ? '<div class="modal-field"><dt>' + escapeHtml(manifest?.series?.label ?? 'Series') + '</dt><dd>' + escapeHtml(series) + '</dd></div>' : '';
      const gloss = details.gloss ? '<section class="modal-section"><h3>Gloss</h3><p>' + escapeHtml(details.gloss) + '</p></section>' : '';
      const imageMeta = item.image?.sourceUrl || item.image?.license || item.image?.attribution
        ? '<section class="modal-section"><h3>Image</h3><p>' + (item.image?.sourceUrl ? '<a href="' + escapeHtml(item.image.sourceUrl) + '" target="_blank" rel="noreferrer">Image source</a>' : '') + (item.image?.license ? ' ' + escapeHtml(item.image.license) : '') + (item.image?.attribution ? ' ' + escapeHtml(item.image.attribution) : '') + '</p></section>'
        : '';
      const sourceSection = sources ? '<section class="modal-section"><h3>Sources</h3><ul class="source-list">' + sources + '</ul></section>' : '';

      itemModalTitle.textContent = item.title;
      itemModalBody.innerHTML = image + '<dl class="modal-fields">' + fieldRows + seriesRow + '</dl>' + gloss + imageMeta + sourceSection;
      itemModalBody.scrollTop = 0;
      if (!itemModal.open) itemModal.showModal();
    }

    function navigateModal(direction) {
      if (!itemModal.open || !state.modalDatasetId) return;
      const nextIndex = state.modalIndex + direction;
      if (nextIndex < 0 || nextIndex >= state.modalItems.length) return;
      const item = state.modalItems[nextIndex];
      const manifest = state.manifests.get(state.modalDatasetId);
      if (item && manifest) openModal(manifest, item, state.modalDatasetId, state.modalItems);
    }

    async function openDatasetItem(target, datasetId) {
      const [items] = await Promise.all([loadDataset(datasetId), loadManifests()]);
      const manifest = state.manifests.get(datasetId);
      const item = items.find((candidate) => candidate.id === target.dataset.itemId);
      if (item) openModal(manifest, item, datasetId, items);
    }

    select.addEventListener('change', () => showDataset(select.value));
    window.addEventListener('hashchange', () => showDataset(location.hash.slice(1), false));
    searchClose.addEventListener('click', closeSearch);
    itemModalClose.addEventListener('click', () => itemModal.close());
    itemModalPrev.addEventListener('click', () => navigateModal(-1));
    itemModalNext.addEventListener('click', () => navigateModal(1));
    itemModal.addEventListener('close', () => {
      state.modalDatasetId = null;
      state.modalItems = [];
      state.modalIndex = -1;
      updateModalNavigation();
    });
    itemModal.addEventListener('click', (event) => {
      if (event.target === itemModal) itemModal.close();
    });

    searchOverlay.addEventListener('click', (event) => {
      if (event.target === searchOverlay) closeSearch();
    });

    searchInput.addEventListener('input', updateSearchResults);
    searchInput.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') {
        closeSearch();
        return;
      }
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault();
        const direction = event.key === 'ArrowDown' ? 1 : -1;
        const length = state.searchMatches.length;
        if (!length) return;
        state.activeSearchIndex = (state.activeSearchIndex + direction + length) % length;
        renderSearchResults();
        searchResults.querySelector('.command-result.active')?.scrollIntoView({ block: 'nearest' });
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        const item = state.searchMatches[state.activeSearchIndex];
        const manifest = state.manifests.get(state.activeDatasetId);
        if (item) {
          closeSearch();
          openModal(manifest, item, state.activeDatasetId, state.datasets.get(state.activeDatasetId) ?? state.searchMatches);
        }
      }
    });

    searchResults.addEventListener('click', (event) => {
      const button = event.target.closest('.command-result');
      if (!button) return;
      const item = state.searchMatches.find((match) => match.id === button.dataset.itemId);
      const manifest = state.manifests.get(state.activeDatasetId);
      if (item) {
        closeSearch();
        openModal(manifest, item, state.activeDatasetId, state.datasets.get(state.activeDatasetId) ?? state.searchMatches);
      }
    });

    document.addEventListener('click', (event) => {
      const target = event.target.closest('.dataset-panel [data-item-id]');
      if (!target) return;
      const panel = target.closest('[data-dataset-panel]');
      if (!panel) return;
      openDatasetItem(target, panel.dataset.datasetPanel);
    });

    document.addEventListener('keydown', (event) => {
      if (itemModal.open && event.key === 'ArrowLeft') {
        event.preventDefault();
        navigateModal(-1);
        return;
      }
      if (itemModal.open && event.key === 'ArrowRight') {
        event.preventDefault();
        navigateModal(1);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openSearch();
      }
      if (event.key === 'Escape' && !searchOverlay.hidden) closeSearch();
    });

    showDataset(location.hash.slice(1), false);
    loadManifests().catch((error) => {
      console.error(error);
    });
  </script>
</body>
</html>`;

writeFileSync(OUTPUT_PATH, html);
console.log(`Wrote ${OUTPUT_PATH}`);
console.log(JSON.stringify(Object.fromEntries(reports.map((report) => [
  report.id,
  {
    records: report.items.length,
    stats: Object.fromEntries(report.report.stats.map((stat) => [stat.label, stat.value])),
  },
])), null, 2));
