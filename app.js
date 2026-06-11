const app = document.getElementById('app');
const datasetSelect = document.getElementById('datasetSelect');
const filterMenu = document.getElementById('filterMenu');
const filterButton = document.getElementById('filterButton');
const filterPanel = document.getElementById('filterPanel');
const cardSearch = document.getElementById('cardSearch');
const searchResults = document.getElementById('searchResults');
const searchToggle = document.getElementById('searchToggle');
const progressEl = document.getElementById('progress');
const rightScoreEl = document.getElementById('rightScore');
const wrongScoreEl = document.getElementById('wrongScore');
const card = document.getElementById('card');
const front = document.getElementById('front');
const back = document.getElementById('back');
const wrongBtn = document.getElementById('wrongBtn');
const rightBtn = document.getElementById('rightBtn');
const flipBtn = document.getElementById('flipBtn');
const backBtn = document.getElementById('backBtn');
const toast = document.getElementById('toast');
const scoreModal = document.getElementById('scoreModal');
const scoreModalTitle = document.getElementById('scoreModalTitle');
const scoreModalList = document.getElementById('scoreModalList');
const clearListBtn = document.getElementById('clearListBtn');

const STORAGE_PREFIX = 'sophismFlashcards';
const DATASET_KEY = `${STORAGE_PREFIX}.dataset`;
const SWIPE_THRESHOLD = 70;
const SWIPE_EXIT_ROTATION = 12;

let manifests = [];
let manifestById = new Map();
let cardCache = new Map();
let currentManifest = null;
let datasetId = localStorage.getItem(DATASET_KEY) || '';
let selectedFilters = {};
let allCards = [];
let activeCards = [];
let currentIndex = 0;
let passSize = 0;
let passIndex = 0;
let rightIds = new Set();
let wrongIds = new Set();
let history = [];
let flipped = false;
let cardsLoaded = false;
let initError = null;
let gradingInProgress = false;
let activeGradeToken = 0;
let toastTimer = null;
let activeModalType = null;
let searchMatches = [];
let searchActiveIndex = 0;
let imagePreloadCache = new Map();
let startX = 0;
let startY = 0;
let currentX = 0;
let currentY = 0;
let dragging = false;
let verticalBackScroll = false;
const mobileSearchMedia = window.matchMedia('(max-width: 768px)');

function storageKey(kind, id = datasetId) {
  return `${STORAGE_PREFIX}.${kind}.${id}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function getPath(obj, path) {
  return String(path || '')
    .split('.')
    .filter(Boolean)
    .reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
}

function valuesAtPath(obj, path) {
  const value = getPath(obj, path);
  if (Array.isArray(value)) {
    return value.map((item) => String(item)).filter((item) => item.trim());
  }
  if (value === undefined || value === null || value === '') return [];
  return [String(value)];
}

function formatValue(value, label = '') {
  if (Array.isArray(value)) {
    const joiner = label.toLowerCase() === 'combatants' ? ' vs ' : ', ';
    return value.map((item) => String(item)).join(joiner);
  }
  return String(value ?? '');
}

function imageSrcForCard(cardItem) {
  return String(cardItem?.image?.src || '').trim();
}

function preloadImage(src) {
  if (!src) return Promise.resolve();
  if (imagePreloadCache.has(src)) return imagePreloadCache.get(src);

  const preload = new Promise((resolve) => {
    const image = new Image();
    image.decoding = 'async';
    image.loading = 'eager';
    image.onload = () => {
      if (typeof image.decode === 'function') {
        image.decode().then(resolve).catch(resolve);
      } else {
        resolve();
      }
    };
    image.onerror = resolve;
    image.src = src;
  });

  imagePreloadCache.set(src, preload);
  return preload;
}

function preloadCardImages(cards) {
  for (const cardItem of cards) {
    preloadImage(imageSrcForCard(cardItem));
  }
}

function hasCards() {
  return cardsLoaded && activeCards.length > 0;
}

function loadSet(key) {
  try {
    const raw = localStorage.getItem(key);
    const parsed = JSON.parse(raw || '[]');
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

function persistSet(kind, set) {
  localStorage.setItem(storageKey(kind), JSON.stringify([...set]));
}

function loadSelectedFilters(manifest) {
  let saved = {};
  try {
    saved = JSON.parse(localStorage.getItem(storageKey('filters', manifest.id)) || '{}');
  } catch {
    saved = {};
  }

  const next = {};
  for (const filter of manifest.filters || []) {
    const allowed = new Set(filter.options || []);
    const raw = Array.isArray(saved[filter.id]) ? saved[filter.id] : filter.options;
    next[filter.id] = raw.filter((value) => allowed.has(value));
  }
  return next;
}

function persistFilters() {
  localStorage.setItem(storageKey('filters'), JSON.stringify(selectedFilters));
}

function setGameplayEnabled(enabled) {
  wrongBtn.disabled = !enabled;
  rightBtn.disabled = !enabled;
  flipBtn.disabled = !enabled;
  card.setAttribute('aria-disabled', enabled ? 'false' : 'true');
}

function cancelPendingGrade() {
  activeGradeToken += 1;
  gradingInProgress = false;
}

function getSelectedValues(filter) {
  return selectedFilters[filter.id] || [];
}

function matchesFilters(cardItem) {
  if (!currentManifest) return false;

  for (const filter of currentManifest.filters || []) {
    const selected = getSelectedValues(filter);
    const values = valuesAtPath(cardItem, filter.path);

    if (selected.length === 0) return false;
    if (values.length === 0) return false;
    if (!values.some((value) => selected.includes(value))) return false;
  }

  return true;
}

function getFilterEligibleCards() {
  return allCards.filter(matchesFilters);
}

function shuffleCards(cards) {
  const shuffled = [...cards];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  return shuffled;
}

function preserveActiveOrder(cards) {
  const byId = new Map(cards.map((item) => [item.id, item]));
  const ordered = [];

  for (const item of activeCards) {
    const next = byId.get(item.id);
    if (!next) continue;
    ordered.push(next);
    byId.delete(item.id);
  }

  return [...ordered, ...shuffleCards([...byId.values()])];
}

function getFilteredScoreIds(sourceSet) {
  const eligibleIds = new Set(getFilterEligibleCards().map((item) => item.id));
  return [...sourceSet].filter((id) => eligibleIds.has(id));
}

function getFilteredScoreCount(sourceSet) {
  return getFilteredScoreIds(sourceSet).length;
}

function refreshActiveCards({ preserveId = null, resetPass = false } = {}) {
  const eligibleCards = getFilterEligibleCards().filter((item) => !rightIds.has(item.id));
  activeCards = resetPass || activeCards.length === 0 ? shuffleCards(eligibleCards) : preserveActiveOrder(eligibleCards);

  if (preserveId) {
    const idx = activeCards.findIndex((item) => item.id === preserveId);
    currentIndex = idx >= 0 ? idx : Math.min(currentIndex, Math.max(activeCards.length - 1, 0));
  } else if (currentIndex >= activeCards.length || resetPass) {
    currentIndex = 0;
  }

  if (resetPass || passSize === 0) {
    passSize = activeCards.length;
    passIndex = activeCards.length > 0 ? currentIndex : 0;
  } else {
    passIndex = Math.min(passIndex, Math.max(passSize - 1, 0));
  }
}

function applyFilters({ preserveId = null } = {}) {
  cancelPendingGrade();
  refreshActiveCards({ preserveId, resetPass: true });
  hideSearchResults();
  flipped = false;
  resetCardVisualState();
  render();
}

function updateFilterButtonLabel() {
  if (!currentManifest) {
    filterButton.textContent = 'Filters';
    return;
  }

  const changed = (currentManifest.filters || []).filter((filter) => {
    const selected = getSelectedValues(filter);
    return selected.length !== (filter.options || []).length;
  });

  if (changed.length === 0) {
    filterButton.textContent = 'All Filters';
  } else if (changed.length === 1) {
    const filter = changed[0];
    const count = getSelectedValues(filter).length;
    filterButton.textContent = `${filter.label}: ${count}`;
  } else {
    filterButton.textContent = `${changed.length} Filters`;
  }
}

function renderFilters() {
  if (!currentManifest) {
    filterPanel.innerHTML = '';
    updateFilterButtonLabel();
    return;
  }

  filterPanel.innerHTML = (currentManifest.filters || [])
    .map((filter) => {
      const selected = new Set(getSelectedValues(filter));
      const options = (filter.options || [])
        .map((option) => `
          <label class="filter-option">
            <input type="checkbox" data-filter-id="${escapeHtml(filter.id)}" value="${escapeHtml(option)}" ${selected.has(option) ? 'checked' : ''} />
            <span>${escapeHtml(option)}</span>
          </label>
        `)
        .join('');
      return `
        <section class="filter-group" aria-label="${escapeHtml(filter.label)}">
          <div class="filter-group-header">
            <div class="filter-group-title">${escapeHtml(filter.label)}</div>
            <div class="filter-group-actions" aria-label="${escapeHtml(filter.label)} selection controls">
              <button type="button" class="filter-group-action" data-filter-id="${escapeHtml(filter.id)}" data-filter-bulk="all" aria-label="Select all ${escapeHtml(filter.label)}">All</button>
              <button type="button" class="filter-group-action" data-filter-id="${escapeHtml(filter.id)}" data-filter-bulk="none" aria-label="Select no ${escapeHtml(filter.label)}">None</button>
            </div>
          </div>
          ${options}
        </section>
      `;
    })
    .join('');

  updateFilterButtonLabel();
}

function renderDatasetOptions() {
  datasetSelect.innerHTML = manifests
    .map((manifest) => `<option value="${escapeHtml(manifest.id)}">${escapeHtml(manifest.label)}</option>`)
    .join('');
  datasetSelect.value = datasetId;
}

function renderTemplate(template, cardItem) {
  return (template || []).map((part) => renderPart(part, cardItem)).join('');
}

function renderBackFace(cardItem) {
  const backTemplate = currentManifest.backTemplate || [];
  const studyTemplate = backTemplate.filter((part) => part.type !== 'seriesNav');
  const seriesNav = renderSeriesNav(cardItem);

  return `
    <div class="back-scroll">
      ${renderTemplate(studyTemplate, cardItem)}
    </div>
    ${seriesNav ? `<div class="back-series-shell">${seriesNav}</div>` : ''}
  `;
}

function getSeriesConfig(cardItem) {
  if (currentManifest?.series?.keyPath && currentManifest.series.orderPath) {
    return {
      label: currentManifest.series.label || 'Series',
      keyPath: currentManifest.series.keyPath,
      labelPath: currentManifest.series.labelPath || currentManifest.series.keyPath,
      orderPath: currentManifest.series.orderPath,
    };
  }

  if (getPath(cardItem, 'details.series.key') !== undefined && getPath(cardItem, 'details.series.order') !== undefined) {
    return {
      label: 'Series',
      keyPath: 'details.series.key',
      labelPath: 'details.series.label',
      orderPath: 'details.series.order',
    };
  }

  return null;
}

function getSeriesInfo(cardItem, config) {
  if (!cardItem || !config) return null;
  const key = String(getPath(cardItem, config.keyPath) ?? '').trim();
  const label = String(getPath(cardItem, config.labelPath) ?? key).trim();
  const order = getPath(cardItem, config.orderPath);

  if (!key || order === undefined || order === null || String(order).trim() === '') {
    return null;
  }

  return { key, label: label || key, order };
}

function sortableSeriesOrder(value) {
  const text = String(value ?? '').trim();
  const number = Number(text);
  return {
    text,
    number: text && Number.isFinite(number) ? number : null,
  };
}

function compareSeriesEntries(a, b) {
  const orderA = sortableSeriesOrder(a.info.order);
  const orderB = sortableSeriesOrder(b.info.order);

  if (orderA.number !== null && orderB.number !== null && orderA.number !== orderB.number) {
    return orderA.number - orderB.number;
  }

  if (orderA.text !== orderB.text) {
    return orderA.text.localeCompare(orderB.text, undefined, { numeric: true });
  }

  return a.card.title.localeCompare(b.card.title) || a.card.id.localeCompare(b.card.id);
}

function getSeriesNeighbors(cardItem) {
  const config = getSeriesConfig(cardItem);
  const currentInfo = getSeriesInfo(cardItem, config);
  if (!currentInfo) return null;

  const seriesCards = allCards
    .map((item) => ({ card: item, info: getSeriesInfo(item, config) }))
    .filter((item) => item.info?.key === currentInfo.key)
    .sort(compareSeriesEntries);

  if (seriesCards.length <= 1) return null;

  const currentSeriesIndex = seriesCards.findIndex((item) => item.card.id === cardItem.id);
  if (currentSeriesIndex < 0) return null;

  return {
    label: currentInfo.label,
    previous: seriesCards[currentSeriesIndex - 1]?.card || null,
    next: seriesCards[currentSeriesIndex + 1]?.card || null,
  };
}

function renderSeriesButton(cardItem, direction) {
  if (!cardItem) return '<span class="series-placeholder" aria-hidden="true"></span>';
  const label = direction === 'previous' ? 'Prev' : 'Next';
  return `
    <button type="button" class="series-btn ${direction}" data-series-target="${escapeHtml(cardItem.id)}" aria-label="${label}: ${escapeHtml(cardItem.title)}">
      <span class="series-dir">${label}</span>
      <span class="series-card-title">${escapeHtml(cardItem.title)}</span>
    </button>
  `;
}

function renderSeriesNav(cardItem) {
  const neighbors = getSeriesNeighbors(cardItem);
  if (!neighbors) return '';

  return `
    <nav class="series-nav" aria-label="${escapeHtml(neighbors.label)} series navigation">
      ${renderSeriesButton(neighbors.previous, 'previous')}
      ${renderSeriesButton(neighbors.next, 'next')}
    </nav>
  `;
}

function renderPart(part, cardItem) {
  if (part.type === 'image') {
    const image = cardItem.image || {};
    return `
      <figure class="card-image">
        <img src="${escapeHtml(image.src)}" alt="${escapeHtml(image.alt || cardItem.title)}" loading="eager" decoding="async" fetchpriority="high" />
      </figure>
    `;
  }

  if (part.type === 'title') {
    return `<h2 class="card-title">${escapeHtml(cardItem.title)}</h2>`;
  }

  if (part.type === 'statGrid') {
    const fields = (part.fields || [])
      .filter((field) => {
        const value = getPath(cardItem, field.path);
        return !field.optional || valuesAtPath(cardItem, field.path).length > 0 || (Array.isArray(value) && value.length > 0);
      })
      .map((field) => {
        const value = getPath(cardItem, field.path);
        return `
          <div class="stat-item">
            <dt>${escapeHtml(field.label)}</dt>
            <dd>${escapeHtml(formatValue(value, field.label))}</dd>
          </div>
        `;
      })
      .join('');
    return `<dl class="stat-grid">${fields}</dl>`;
  }

  if (part.type === 'fieldList') {
    const fields = (part.fields || [])
      .filter((field) => {
        const value = getPath(cardItem, field.path);
        return !field.optional || valuesAtPath(cardItem, field.path).length > 0 || (Array.isArray(value) && value.length > 0);
      })
      .map((field) => {
        const value = getPath(cardItem, field.path);
        return `
          <div class="field-row">
            <span>${escapeHtml(field.label)}</span>
            <strong>${escapeHtml(formatValue(value, field.label))}</strong>
          </div>
        `;
      })
      .join('');
    return `<div class="field-list">${fields}</div>`;
  }

  if (part.type === 'field') {
    const value = getPath(cardItem, part.path);
    if (part.optional && valuesAtPath(cardItem, part.path).length === 0) return '';
    return `
      <div class="field-row">
        <span>${escapeHtml(part.label || '')}</span>
        <strong>${escapeHtml(formatValue(value, part.label))}</strong>
      </div>
    `;
  }

  if (part.type === 'gloss') {
    const value = getPath(cardItem, part.path || 'details.gloss');
    return `<p class="gloss">${escapeHtml(value)}</p>`;
  }

  if (part.type === 'seriesNav') {
    return renderSeriesNav(cardItem);
  }

  return '';
}

function renderScore() {
  rightScoreEl.textContent = `✅ ${getFilteredScoreCount(rightIds)}`;
  wrongScoreEl.textContent = `❌ ${getFilteredScoreCount(wrongIds)}`;
}

function renderEmptyState(message, subMessage = '') {
  const sub = subMessage ? `<p class="empty-sub">${escapeHtml(subMessage)}</p>` : '';
  const content = `<div class="empty-state"><h2>${escapeHtml(message)}</h2>${sub}</div>`;
  front.innerHTML = content;
  back.innerHTML = content;
  card.classList.remove('flipped');
}

function render() {
  renderScore();
  backBtn.disabled = history.length === 0;

  if (initError) {
    setGameplayEnabled(false);
    progressEl.textContent = '0 / 0';
    renderEmptyState('Unable to load cards', 'Refresh to try again.');
    return;
  }

  if (!hasCards()) {
    setGameplayEnabled(false);
    const total = getFilterEligibleCards().length;
    progressEl.textContent = total > 0 ? `${total} / ${total}` : '0 / 0';

    if (cardsLoaded && total > 0) {
      const content = `
        <div class="empty-state">
          <p class="eyebrow">Complete</p>
          <h2>Deck cleared</h2>
          <p class="empty-sub">Clear the current correct list or change filters to study more cards.</p>
          <button type="button" class="action-btn neutral complete-reset" data-action="clear-filtered-correct">Clear Correct</button>
        </div>
      `;
      front.innerHTML = content;
      back.innerHTML = content;
      card.classList.remove('flipped');
    } else {
      renderEmptyState('No cards match', 'Adjust filters to bring cards back into the deck.');
    }
    return;
  }

  setGameplayEnabled(true);
  if (currentIndex >= activeCards.length || currentIndex < 0) currentIndex = 0;

  const current = activeCards[currentIndex];
  const next = activeCards[(currentIndex + 1) % activeCards.length];
  preloadCardImages([current, next]);
  front.innerHTML = renderTemplate(currentManifest.frontTemplate, current);
  back.innerHTML = renderBackFace(current);
  card.classList.toggle('flipped', flipped);

  const size = passSize || activeCards.length;
  const displayIndex = Math.min(passIndex + 1, size || activeCards.length);
  progressEl.textContent = `${displayIndex} / ${size || activeCards.length}`;
}

function showToast(message) {
  if (toastTimer) clearTimeout(toastTimer);
  toast.textContent = message;
  toast.classList.add('show');
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
    toastTimer = null;
  }, 1000);
}

function flashCard(kind) {
  card.classList.remove('correct-flash', 'wrong-flash');
  card.classList.add(kind === 'right' ? 'correct-flash' : 'wrong-flash');
}

function clearCardFeedback() {
  card.classList.remove('correct-flash', 'wrong-flash');
}

function clearSwipeFeedback() {
  app.classList.remove('swipe-right', 'swipe-left');
}

function setSwipeFeedback(dx) {
  app.classList.remove('swipe-right', 'swipe-left');
  if (Math.abs(dx) < 8) return;
  app.classList.add(dx > 0 ? 'swipe-right' : 'swipe-left');
}

function resetCardTransform() {
  card.classList.remove('swipe-out-right', 'swipe-out-left');
  card.style.transition = '';
  card.style.transform = '';
  card.style.opacity = '';
  clearSwipeFeedback();
}

function resetCardVisualState() {
  clearCardFeedback();
  resetCardTransform();
}

function trackCard(id, ok) {
  if (ok) {
    rightIds.add(id);
    wrongIds.delete(id);
  } else {
    wrongIds.add(id);
    rightIds.delete(id);
  }
  persistSet('right', rightIds);
  persistSet('wrong', wrongIds);
}

function advanceAfterGrade(id, ok) {
  if (ok) {
    const completedPass = passIndex + 1 >= passSize;
    refreshActiveCards({ resetPass: completedPass });
    if (!completedPass && passSize > 0) {
      passIndex = Math.min(passIndex + 1, passSize - 1);
    }
  } else {
    currentIndex = currentIndex + 1 >= activeCards.length ? 0 : currentIndex + 1;
    passIndex = passIndex + 1 >= passSize ? 0 : Math.min(passIndex + 1, passSize - 1);
    if (passIndex === 0) {
      refreshActiveCards({ preserveId: activeCards[currentIndex]?.id || id, resetPass: true });
    }
  }
  flipped = false;
  resetCardVisualState();
  render();
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function grade(ok) {
  if (!hasCards() || gradingInProgress) return;
  gradingInProgress = true;
  const gradeToken = ++activeGradeToken;
  const current = activeCards[currentIndex];
  history.push(current.id);

  trackCard(current.id, ok);
  flashCard(ok ? 'right' : 'wrong');
  showToast(ok ? 'Correct' : 'Wrong');
  render();

  try {
    await sleep(900);
    if (gradeToken !== activeGradeToken) return;
    advanceAfterGrade(current.id, ok);
  } finally {
    if (gradeToken === activeGradeToken) gradingInProgress = false;
  }
}

async function gradeFromSwipe(ok, dx) {
  if (!hasCards() || gradingInProgress) return;
  gradingInProgress = true;
  const gradeToken = ++activeGradeToken;
  const current = activeCards[currentIndex];
  history.push(current.id);
  trackCard(current.id, ok);
  flashCard(ok ? 'right' : 'wrong');
  showToast(ok ? 'Correct' : 'Wrong');
  render();

  const exitX = (dx > 0 ? 1 : -1) * Math.max(window.innerWidth * 0.9, 320);
  card.style.transition = 'transform 220ms ease-out';
  card.style.transform = `translateX(${exitX}px) rotate(${dx > 0 ? SWIPE_EXIT_ROTATION : -SWIPE_EXIT_ROTATION}deg)${flipped ? ' rotateY(180deg)' : ''}`;

  try {
    await sleep(240);
    if (gradeToken !== activeGradeToken) return;
    advanceAfterGrade(current.id, ok);
    card.style.transition = 'none';
    card.style.transform = 'translateY(42px)';
    card.style.opacity = '0';
    void card.offsetHeight;
    card.style.transition = 'transform 240ms ease, opacity 240ms ease';
    card.style.transform = '';
    card.style.opacity = '1';
    await sleep(250);
  } finally {
    if (gradeToken === activeGradeToken) {
      gradingInProgress = false;
      card.style.transition = '';
      card.style.opacity = '';
    }
  }
}

function toggleFlip() {
  if (!hasCards() || gradingInProgress) return;
  flipped = !flipped;
  card.classList.toggle('flipped', flipped);
}

function goBack() {
  if (!history.length) return;
  cancelPendingGrade();
  const id = history.pop();
  rightIds.delete(id);
  wrongIds.delete(id);
  persistSet('right', rightIds);
  persistSet('wrong', wrongIds);
  refreshActiveCards({ preserveId: id, resetPass: true });
  flipped = false;
  resetCardVisualState();
  render();
}

function clearFilteredScore(kind) {
  const set = kind === 'right' ? rightIds : wrongIds;
  const ids = getFilteredScoreIds(set);
  if (ids.length === 0) return false;

  for (const id of ids) {
    set.delete(id);
  }
  persistSet(kind, set);
  if (kind === 'right') {
    refreshActiveCards({ resetPass: true });
  }
  render();
  return true;
}

function openScoreModal(kind) {
  activeModalType = kind;
  const sourceSet = kind === 'right' ? rightIds : wrongIds;
  const ids = getFilteredScoreIds(sourceSet);
  scoreModalTitle.textContent = kind === 'right' ? 'Right Answers' : 'Wrong Answers';
  clearListBtn.disabled = ids.length === 0;

  if (ids.length === 0) {
    scoreModalList.innerHTML = '<li class="empty-list">No items yet.</li>';
  } else {
    scoreModalList.innerHTML = ids
      .map((id) => allCards.find((item) => item.id === id))
      .filter(Boolean)
      .sort((a, b) => a.title.localeCompare(b.title))
      .map((item) => `
        <li>
          <span>${escapeHtml(item.title)}</span>
          <button type="button" class="remove-btn" data-id="${escapeHtml(item.id)}" aria-label="Remove ${escapeHtml(item.title)}">&times;</button>
        </li>
      `)
      .join('');
  }

  if (!scoreModal.open) {
    scoreModal.showModal();
  }
}

function scoreMatch(cardItem, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return -1;

  const haystack = [
    cardItem.title,
    ...(currentManifest.searchFields || []).map((path) => formatValue(getPath(cardItem, path))),
  ]
    .join(' ')
    .toLowerCase();
  const title = cardItem.title.toLowerCase();

  if (title === q) return 1000;
  if (title.startsWith(q)) return 850 - (title.length - q.length);
  if (haystack.includes(q)) return 650 - haystack.indexOf(q);

  let qi = 0;
  for (const ch of title) {
    if (ch === q[qi]) qi += 1;
    if (qi === q.length) return 350;
  }

  return -1;
}

function hideSearchResults() {
  searchResults.classList.add('hidden');
  searchResults.innerHTML = '';
  searchMatches = [];
  searchActiveIndex = 0;
}

function setMobileSearchOpen(open, { focus = false } = {}) {
  app.classList.toggle('search-open', open);
  searchToggle.setAttribute('aria-expanded', String(open));
  searchToggle.setAttribute('aria-label', open ? 'Close card search' : 'Open card search');

  if (!open) {
    hideSearchResults();
    if (document.activeElement === cardSearch) {
      cardSearch.blur();
    }
    return;
  }

  if (focus) {
    cardSearch.focus();
  }
}

function closeMobileSearch() {
  if (mobileSearchMedia.matches) {
    setMobileSearchOpen(false);
  }
}

function renderSearchResults() {
  if (!searchMatches.length) {
    hideSearchResults();
    return;
  }

  searchResults.innerHTML = searchMatches
    .map((item, index) => `
      <li class="${index === searchActiveIndex ? 'active' : ''}" data-id="${escapeHtml(item.id)}">
        <span>${escapeHtml(item.title)}</span>
        <small>${escapeHtml(currentManifest.label)}</small>
      </li>
    `)
    .join('');
  searchResults.classList.remove('hidden');
}

function jumpToCard(id) {
  const idx = activeCards.findIndex((item) => item.id === id);
  if (idx < 0) return;
  cancelPendingGrade();
  currentIndex = idx;
  passIndex = idx;
  flipped = false;
  resetCardVisualState();
  hideSearchResults();
  closeMobileSearch();
  render();
}

function jumpToSeriesCard(id) {
  const target = allCards.find((item) => item.id === id);
  if (!target) return;

  cancelPendingGrade();
  let idx = activeCards.findIndex((item) => item.id === id);

  if (idx < 0) {
    const insertAt = Math.min(currentIndex + 1, activeCards.length);
    activeCards.splice(insertAt, 0, target);
    idx = insertAt;
    passSize = Math.max(passSize || 0, activeCards.length);
  }

  currentIndex = idx;
  passIndex = Math.min(idx, Math.max((passSize || activeCards.length) - 1, 0));
  flipped = false;
  resetCardVisualState();
  hideSearchResults();
  closeMobileSearch();
  render();
}

async function loadCards(manifest) {
  if (cardCache.has(manifest.id)) return cardCache.get(manifest.id);
  const response = await fetch(manifest.dataPath);
  if (!response.ok) throw new Error(`Failed to load ${manifest.label}: HTTP ${response.status}`);
  const cards = await response.json();
  if (!Array.isArray(cards)) throw new Error(`${manifest.label} data is not an array`);
  cardCache.set(manifest.id, cards);
  return cards;
}

async function selectDataset(nextId) {
  const nextManifest = manifestById.get(nextId);
  if (!nextManifest) return;

  cancelPendingGrade();
  datasetId = nextId;
  currentManifest = nextManifest;
  localStorage.setItem(DATASET_KEY, datasetId);
  rightIds = loadSet(storageKey('right'));
  wrongIds = loadSet(storageKey('wrong'));
  selectedFilters = loadSelectedFilters(currentManifest);
  history = [];
  currentIndex = 0;
  passIndex = 0;
  passSize = 0;
  flipped = false;
  cardsLoaded = false;
  initError = null;
  setGameplayEnabled(false);
  renderDatasetOptions();
  renderFilters();
  cardSearch.value = '';
  cardSearch.placeholder = `Search ${currentManifest.label.toLowerCase()}`;
  hideSearchResults();
  closeMobileSearch();
  renderEmptyState('Loading cards');

  try {
    allCards = await loadCards(currentManifest);
    cardsLoaded = true;
    refreshActiveCards({ resetPass: true });
  } catch (error) {
    console.error(error);
    initError = error;
    allCards = [];
    activeCards = [];
    cardsLoaded = false;
    showToast('Could not load cards');
  }

  render();
}

filterButton.addEventListener('click', () => {
  const hidden = filterPanel.classList.toggle('hidden');
  filterButton.setAttribute('aria-expanded', hidden ? 'false' : 'true');
});

searchToggle.addEventListener('click', () => {
  const shouldOpen = !app.classList.contains('search-open');
  setMobileSearchOpen(shouldOpen, { focus: shouldOpen });
});

filterPanel.addEventListener('change', (event) => {
  const target = event.target instanceof HTMLInputElement ? event.target : null;
  if (!target || !target.dataset.filterId) return;

  const filterId = target.dataset.filterId;
  const current = new Set(selectedFilters[filterId] || []);
  if (target.checked) {
    current.add(target.value);
  } else {
    current.delete(target.value);
  }
  selectedFilters[filterId] = [...current];
  persistFilters();
  updateFilterButtonLabel();
  applyFilters();
});

filterPanel.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target.closest('[data-filter-bulk]') : null;
  if (!(target instanceof HTMLButtonElement)) return;
  event.stopPropagation();

  const filterId = target.dataset.filterId;
  const filter = (currentManifest?.filters || []).find((item) => item.id === filterId);
  if (!filter) return;

  selectedFilters[filter.id] = target.dataset.filterBulk === 'all' ? [...(filter.options || [])] : [];
  persistFilters();
  renderFilters();
  applyFilters();
});

datasetSelect.addEventListener('change', () => {
  selectDataset(datasetSelect.value);
});

card.addEventListener('click', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const seriesButton = target?.closest('[data-series-target]');
  if (seriesButton) {
    jumpToSeriesCard(seriesButton.dataset.seriesTarget);
    return;
  }

  if (target?.closest('[data-action="clear-filtered-correct"]')) {
    clearFilteredScore('right');
    showToast('Correct list cleared');
    return;
  }
  toggleFlip();
});

wrongBtn.addEventListener('click', () => grade(false));
rightBtn.addEventListener('click', () => grade(true));
flipBtn.addEventListener('click', toggleFlip);
backBtn.addEventListener('click', goBack);
rightScoreEl.addEventListener('click', () => openScoreModal('right'));
wrongScoreEl.addEventListener('click', () => openScoreModal('wrong'));

scoreModal.addEventListener('click', (event) => {
  if (event.target === scoreModal) {
    scoreModal.close();
    return;
  }

  const target = event.target instanceof Element ? event.target : null;
  const button = target?.closest('.remove-btn');
  if (!button || !activeModalType) return;

  const id = button.dataset.id;
  if (activeModalType === 'right') {
    rightIds.delete(id);
    persistSet('right', rightIds);
    refreshActiveCards({ resetPass: true });
  } else {
    wrongIds.delete(id);
    persistSet('wrong', wrongIds);
  }
  render();
  openScoreModal(activeModalType);
});

clearListBtn.addEventListener('click', () => {
  if (!activeModalType) return;
  clearFilteredScore(activeModalType);
  scoreModalList.innerHTML = '<li class="empty-list">No items yet.</li>';
  clearListBtn.disabled = true;
});

cardSearch.addEventListener('focus', () => {
  cardSearch.value = '';
  hideSearchResults();
});

cardSearch.addEventListener('input', () => {
  const query = cardSearch.value;
  if (!query.trim() || !hasCards()) {
    hideSearchResults();
    return;
  }

  searchMatches = activeCards
    .map((item) => ({ item, score: scoreMatch(item, query) }))
    .filter((item) => item.score >= 0)
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .slice(0, 8)
    .map((item) => item.item);
  searchActiveIndex = 0;
  renderSearchResults();
});

cardSearch.addEventListener('keydown', (event) => {
  if (!searchMatches.length) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    searchActiveIndex = (searchActiveIndex + 1) % searchMatches.length;
    renderSearchResults();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    searchActiveIndex = (searchActiveIndex - 1 + searchMatches.length) % searchMatches.length;
    renderSearchResults();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    const chosen = searchMatches[searchActiveIndex];
    if (!chosen) return;
    jumpToCard(chosen.id);
    cardSearch.value = chosen.title;
  } else if (event.key === 'Escape') {
    hideSearchResults();
  }
});

searchResults.addEventListener('mousedown', (event) => {
  const target = event.target instanceof Element ? event.target : null;
  const li = target?.closest('li[data-id]');
  if (!li) return;
  const chosen = searchMatches.find((item) => item.id === li.dataset.id);
  if (!chosen) return;
  jumpToCard(chosen.id);
  cardSearch.value = chosen.title;
});

window.addEventListener('keydown', (event) => {
  const tag = (document.activeElement?.tagName || '').toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

  if (event.key === ' ' || event.key === 'ArrowUp') {
    event.preventDefault();
    toggleFlip();
  } else if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
    event.preventDefault();
    grade(false);
  } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
    event.preventDefault();
    grade(true);
  } else if (event.key === 'ArrowDown' || event.key.toLowerCase() === 'b') {
    event.preventDefault();
    goBack();
  }
});

card.addEventListener('touchstart', (event) => {
  if (!hasCards() || gradingInProgress) return;
  startX = event.touches[0].clientX;
  startY = event.touches[0].clientY;
  currentX = startX;
  currentY = startY;
  dragging = true;
  verticalBackScroll = false;
  card.style.transition = '';
  clearSwipeFeedback();
}, { passive: true });

card.addEventListener('touchmove', (event) => {
  if (!dragging || gradingInProgress || !hasCards()) return;
  currentX = event.touches[0].clientX;
  currentY = event.touches[0].clientY;
  const dx = currentX - startX;
  const dy = currentY - startY;
  const target = event.target instanceof Element ? event.target : null;

  if (flipped && target?.closest('.back') && Math.abs(dy) > Math.abs(dx) + 6) {
    verticalBackScroll = true;
    card.style.transition = '';
    card.style.transform = 'rotateY(180deg)';
    clearSwipeFeedback();
    return;
  }

  if (verticalBackScroll) return;

  setSwipeFeedback(dx);
  card.style.transform = `translateX(${dx}px) rotate(${dx * 0.018}deg)${flipped ? ' rotateY(180deg)' : ''}`;
}, { passive: true });

card.addEventListener('touchend', () => {
  if (!dragging || gradingInProgress || !hasCards()) return;
  dragging = false;
  if (verticalBackScroll) {
    verticalBackScroll = false;
    card.style.transition = '';
    card.style.transform = '';
    clearSwipeFeedback();
    return;
  }
  const dx = currentX - startX;

  if (dx > SWIPE_THRESHOLD) {
    gradeFromSwipe(true, dx);
  } else if (dx < -SWIPE_THRESHOLD) {
    gradeFromSwipe(false, dx);
  } else {
    card.style.transition = 'transform 180ms ease-out';
    card.style.transform = flipped ? 'rotateY(180deg)' : '';
    clearSwipeFeedback();
    setTimeout(() => {
      card.style.transition = '';
      card.style.transform = '';
    }, 200);
  }
});

document.addEventListener('click', (event) => {
  const target = event.target;
  if (!filterMenu.contains(target)) {
    filterPanel.classList.add('hidden');
    filterButton.setAttribute('aria-expanded', 'false');
  }
  if (target !== cardSearch && !searchResults.contains(target) && !searchToggle.contains(target)) {
    hideSearchResults();
    closeMobileSearch();
  }
});

(async function init() {
  setGameplayEnabled(false);
  renderEmptyState('Loading cards');

  try {
    const response = await fetch('/data/datasets.json');
    if (!response.ok) throw new Error(`Failed to load dataset manifest: HTTP ${response.status}`);
    manifests = await response.json();
    if (!Array.isArray(manifests) || manifests.length === 0) {
      throw new Error('Dataset manifest is empty');
    }
    manifestById = new Map(manifests.map((manifest) => [manifest.id, manifest]));
    if (!datasetId || !manifestById.has(datasetId)) {
      datasetId = manifests[0].id;
    }
    await selectDataset(datasetId);
  } catch (error) {
    console.error(error);
    initError = error;
    cardsLoaded = false;
    setGameplayEnabled(false);
    showToast('Could not load cards');
    render();
  }
})();
