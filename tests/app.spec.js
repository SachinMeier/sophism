const { test, expect } = require('@playwright/test');
const manifests = require('../data/datasets.json');
const buildingCards = require('../data/buildings.json');

async function boot(page, options = {}) {
  const randomValue = options.randomValue ?? 0.99;

  await page.route('https://commons.wikimedia.org/**', async (route) => {
    options.onImageRequest?.(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'image/svg+xml',
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="520"><rect width="800" height="520" fill="#d8c69e"/><path d="M120 390L360 120L680 390Z" fill="#1f5f7a"/></svg>',
    });
  });

  await page.addInitScript((value) => {
    Math.random = () => value;
  }, randomValue);

  await page.addInitScript(() => {
    window.localStorage.clear();
  });

  await page.goto('/');
  await expect(page.locator('#progress')).toHaveText(/^\d+ \/ \d+$/);
  await expect(page.locator('#wrongBtn')).toBeEnabled();
}

async function openFilters(page) {
  const panel = page.locator('#filterPanel');
  if (await panel.evaluate((element) => element.classList.contains('hidden'))) {
    await page.locator('#filterButton').click();
  }
}

test('renders and grades a battle card with manifest-driven stats', async ({ page }) => {
  await boot(page);

  await expect(page.locator('#datasetSelect')).toHaveValue('battles');
  await expect(page.locator('#front')).toContainText('Battle of Megiddo');

  await page.locator('#flipBtn').click();
  await expect(page.locator('#back')).toContainText('Location');
  await expect(page.locator('#back')).toContainText('Megiddo, Israel');
  await expect(page.locator('#back')).toContainText("Thutmose III's first campaign");
  await page.locator('#flipBtn').click();
  await expect(page.locator('#card')).not.toHaveClass(/flipped/);

  await page.locator('#rightBtn').click();
  await expect(page.locator('#card')).not.toHaveClass(/flipped/);
  await expect(page.locator('#rightScore')).toHaveText('✅ 1');
  await expect(page.locator('#toast')).toHaveText('Correct');
  await page.locator('#rightScore').click();
  await expect(page.locator('.modal-close-btn')).toHaveText('×');
  await expect(page.locator('.modal-close-btn')).toHaveAttribute('aria-label', 'Close');
  await expect(page.locator('.remove-btn')).toHaveText('×');
  await expect(page.locator('.remove-btn')).toHaveAttribute('aria-label', 'Remove Battle of Megiddo');
  await expect(page.locator('#clearListBtn')).toBeEnabled();
  await page.locator('.modal-close-btn').click();

  await page.locator('#wrongScore').click();
  await expect(page.locator('#scoreModalList')).toContainText('No items yet.');
  await expect(page.locator('#scoreModalList')).not.toContainText('No cards yet.');
  await expect(page.locator('#clearListBtn')).toBeDisabled();
  await page.locator('.modal-close-btn').click();

  await page.locator('#backBtn').click();
  await expect(page.locator('#rightScore')).toHaveText('✅ 0');
  await expect(page.locator('#front')).toContainText('Battle of Megiddo');
});

test('switches datasets and uses image-only fronts for paintings and buildings', async ({ page }) => {
  await boot(page);

  await page.locator('#datasetSelect').selectOption('paintings');
  await expect(page.locator('#front img')).toBeVisible();
  await expect(page.locator('#front')).not.toContainText('Mona Lisa');
  await page.locator('#flipBtn').click();
  await expect(page.locator('#back')).toContainText('Mona Lisa');
  await expect(page.locator('#back')).toContainText('Leonardo da Vinci');

  await page.locator('#datasetSelect').selectOption('buildings');
  await expect(page.locator('#front img')).toBeVisible();
  await expect(page.locator('#front')).not.toContainText('Great Pyramid of Giza');
  await page.locator('#flipBtn').click();
  await expect(page.locator('#back')).toContainText('Construction');
  await expect(page.locator('#back')).toContainText('Giza, Egypt');
});

test('builds filters from manifest paths and filters building styles', async ({ page }) => {
  const highTechCount = buildingCards.filter((card) => {
    const style = card.details?.style;
    return Array.isArray(style) ? style.includes('High-Tech') : style === 'High-Tech';
  }).length;

  await boot(page);
  await page.locator('#datasetSelect').selectOption('buildings');
  await openFilters(page);

  await expect(page.locator('#filterPanel')).toContainText('Style/Movement');
  const styleOptions = page.locator('#filterPanel input[data-filter-id="style"]');
  const count = await styleOptions.count();
  for (let index = 0; index < count; index += 1) {
    await styleOptions.nth(index).setChecked(false);
  }
  await page.locator('#filterPanel input[data-filter-id="style"][value="High-Tech"]').setChecked(true);

  await expect(page.locator('#progress')).toHaveText(`1 / ${highTechCount}`);
  await page.locator('#cardSearch').fill('Pompidou');
  await expect(page.locator('#searchResults li')).toContainText('Centre Pompidou');
  await page.locator('#searchResults li').first().click();
  await page.locator('#flipBtn').click();
  await expect(page.locator('#back')).toContainText('High-Tech');
});

test('shuffles the study deck by default', async ({ page }) => {
  await page.route('**/data/datasets.json', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'shuffle-test',
          label: 'Shuffle Test',
          dataPath: '/data/shuffle-test.json',
          searchFields: ['title'],
          filters: [],
          requiredDetailFields: ['gloss'],
          frontTemplate: [
            { type: 'image' },
            { type: 'title' },
          ],
          backTemplate: [
            { type: 'title' },
            { type: 'gloss', path: 'details.gloss' },
          ],
        },
      ]),
    });
  });

  await page.route('**/data/shuffle-test.json', async (route) => {
    const makeCard = (id, title) => ({
      id,
      dataset: 'shuffle-test',
      title,
      image: {
        src: `https://commons.wikimedia.org/example-${id}.svg`,
        alt: title,
        sourceUrl: 'https://commons.wikimedia.org',
        license: 'Public domain',
        attribution: 'Fixture',
      },
      details: {
        gloss: `${title} gloss.`,
      },
      sources: [{ label: 'Fixture', url: 'https://example.test' }],
    });

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        makeCard('card-alpha', 'Alpha'),
        makeCard('card-beta', 'Beta'),
        makeCard('card-gamma', 'Gamma'),
      ]),
    });
  });

  await boot(page, { randomValue: 0 });
  await expect(page.locator('#front')).toContainText('Beta');
});

test('preloads current and next card images', async ({ page }) => {
  await page.route('**/data/datasets.json', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'preload-test',
          label: 'Preload Test',
          dataPath: '/data/preload-test.json',
          searchFields: ['title'],
          filters: [],
          requiredDetailFields: ['gloss'],
          frontTemplate: [
            { type: 'image' },
            { type: 'title' },
          ],
          backTemplate: [
            { type: 'title' },
            { type: 'gloss', path: 'details.gloss' },
          ],
        },
      ]),
    });
  });

  await page.route('**/data/preload-test.json', async (route) => {
    const makeCard = (id, title) => ({
      id,
      dataset: 'preload-test',
      title,
      image: {
        src: `https://commons.wikimedia.org/preload-${id}.svg`,
        alt: title,
        sourceUrl: 'https://commons.wikimedia.org',
        license: 'Public domain',
        attribution: 'Fixture',
      },
      details: {
        gloss: `${title} gloss.`,
      },
      sources: [{ label: 'Fixture', url: 'https://example.test' }],
    });

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        makeCard('alpha', 'Alpha'),
        makeCard('beta', 'Beta'),
      ]),
    });
  });

  const requestedImages = [];
  await boot(page, {
    onImageRequest: (url) => requestedImages.push(url),
  });

  await expect(page.locator('#front')).toContainText('Alpha');
  await expect
    .poll(() => requestedImages.some((url) => url.includes('preload-alpha.svg')))
    .toBe(true);
  await expect
    .poll(() => requestedImages.some((url) => url.includes('preload-beta.svg')))
    .toBe(true);
});

test('paintings filter by movement only', async ({ page }) => {
  await boot(page);
  await page.locator('#datasetSelect').selectOption('paintings');
  await openFilters(page);

  await expect(page.locator('#filterPanel')).toContainText('Movement');
  await expect(page.locator('#filterPanel')).not.toContainText('Century');
  const paintings = manifests.find((manifest) => manifest.id === 'paintings');
  const movement = paintings.filters.find((filter) => filter.id === 'movement');
  await expect(page.locator('#filterPanel input[data-filter-id="movement"]')).toHaveCount(movement.options.length);
  await expect(page.locator('#filterPanel input[data-filter-id="century"]')).toHaveCount(0);
});

test('collapses search behind the header icon on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);

  await expect(page.locator('#cardSearch')).not.toBeVisible();
  await page.locator('#searchToggle').click();
  await expect(page.locator('#cardSearch')).toBeVisible();
  await expect(page.locator('#searchToggle')).toHaveAttribute('aria-expanded', 'true');

  await page.locator('#cardSearch').fill('Hastings');
  await expect(page.locator('#searchResults li')).toContainText('Battle of Hastings');
  await page.locator('body').click({ position: { x: 8, y: 8 } });
  await expect(page.locator('#cardSearch')).not.toBeVisible();
  await expect(page.locator('#searchToggle')).toHaveAttribute('aria-expanded', 'false');
});

test('back face scrolls vertically when content overflows', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await boot(page);
  await page.locator('#card').click();

  const scrollState = await page.locator('#back').evaluate((element) => {
    const scrollArea = element.querySelector('.back-scroll');
    const filler = document.createElement('p');
    filler.textContent = 'Extra study note. '.repeat(220);
    filler.className = 'gloss';
    scrollArea.appendChild(filler);
    scrollArea.scrollTop = 160;
    const style = window.getComputedStyle(element);
    const scrollStyle = window.getComputedStyle(scrollArea);
    return {
      backOverflowY: style.overflowY,
      scrollOverflowY: scrollStyle.overflowY,
      scrollHeight: scrollArea.scrollHeight,
      clientHeight: scrollArea.clientHeight,
      scrollTop: scrollArea.scrollTop,
    };
  });

  expect(scrollState.backOverflowY).toBe('hidden');
  expect(scrollState.scrollOverflowY).toBe('auto');
  expect(scrollState.scrollHeight).toBeGreaterThan(scrollState.clientHeight);
  expect(scrollState.scrollTop).toBeGreaterThan(0);
});

test('renders series previous and next navigation when series data exists', async ({ page }) => {
  await page.route('**/data/datasets.json', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        {
          id: 'series-battles',
          label: 'Series Battles',
          dataPath: '/data/series-battles.json',
          searchFields: ['title'],
          filters: [],
          series: {
            label: 'Battle Series',
            keyPath: 'details.series.key',
            labelPath: 'details.series.label',
            orderPath: 'details.series.order',
          },
          requiredDetailFields: ['gloss', 'series'],
          frontTemplate: [
            { type: 'image' },
            { type: 'title' },
          ],
          backTemplate: [
            { type: 'title' },
            { type: 'gloss', path: 'details.gloss' },
          ],
        },
      ]),
    });
  });

  await page.route('**/data/series-battles.json', async (route) => {
    const makeCard = (id, title, order) => ({
      id,
      dataset: 'series-battles',
      title,
      image: {
        src: `https://commons.wikimedia.org/example-${id}.svg`,
        alt: title,
        sourceUrl: 'https://commons.wikimedia.org',
        license: 'Public domain',
        attribution: 'Fixture',
      },
      details: {
        gloss: `${title} gloss.`,
        series: {
          key: 'wwii-western-front',
          label: 'World War II: Western Front',
          order,
        },
      },
      sources: [{ label: 'Fixture', url: 'https://example.test' }],
    });

    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify([
        makeCard('battle-anzio', 'Battle of Anzio', 19440122),
        makeCard('battle-dday', 'D-Day', 19440606),
        makeCard('battle-bulge', 'Battle of the Bulge', 19441216),
      ]),
    });
  });

  await boot(page);
  await page.locator('#card').click();

  await expect(page.locator('#back')).toContainText('Battle of Anzio');
  await expect(page.locator('.back-scroll .series-nav')).toHaveCount(0);
  await expect(page.locator('.back-series-shell .series-nav')).toHaveCount(1);
  await expect(page.locator('.series-btn.previous')).toHaveCount(0);
  await expect(page.locator('.series-btn.next')).toContainText('D-Day');

  await page.locator('.series-btn.next').click();
  await expect(page.locator('#back')).toContainText('D-Day');
  await expect(page.locator('.series-btn.previous')).toContainText('Battle of Anzio');
  await expect(page.locator('.series-btn.next')).toContainText('Battle of the Bulge');
  await expect(page.locator('#rightScore')).toHaveText('✅ 0');
  await expect(page.locator('#wrongScore')).toHaveText('❌ 0');

  await page.locator('.series-btn.previous').click();
  await expect(page.locator('#back')).toContainText('Battle of Anzio');
});

test('dataset visualization page opens generic search and item modals', async ({ page }) => {
  await page.route('**/*', async (route) => {
    if (route.request().resourceType() === 'image') {
      await route.fulfill({
        status: 200,
        contentType: 'image/svg+xml',
        body: '<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420"><rect width="640" height="420" fill="#eef2f7"/></svg>',
      });
      return;
    }
    await route.continue();
  });

  await page.goto('/research/dataset-visualizations.html');

  const firstBattleRow = page
    .locator('[data-dataset-panel="battles"].active li:visible')
    .filter({ has: page.locator('.item-title') })
    .first();
  const firstBattleTitle = (await firstBattleRow.locator('.item-title').textContent()).trim();
  await firstBattleRow.locator('.item-title').click();
  await expect(page.locator('#datasetItemModal[open]')).toBeVisible();
  await expect(page.locator('#datasetItemModalTitle')).toHaveText(firstBattleTitle);
  await expect(page.locator('#datasetItemModalBody')).toContainText('Year');
  await page.mouse.click(10, 10);
  await expect(page.locator('#datasetItemModal[open]')).toHaveCount(0);

  const tableBattleTitle = await page
    .locator('[data-dataset-panel="battles"].active tr[data-item-id] .item-title')
    .first()
    .textContent();
  await page.locator('[data-dataset-panel="battles"].active tr[data-item-id] .item-title').first().click();
  await expect(page.locator('#datasetItemModal[open]')).toBeVisible();
  await expect(page.locator('#datasetItemModalTitle')).toHaveText(tableBattleTitle.trim());
  await page.locator('#datasetItemModalClose').click();

  await page.keyboard.press('Control+K');
  await expect(page.locator('#datasetSearchOverlay')).toBeVisible();
  await expect(page.locator('#datasetSearchTitle')).toContainText('Historical Battles');
  await page.locator('#datasetSearchInput').fill('Megiddo');
  await expect(page.locator('#datasetSearchResults')).toContainText('Battle of Megiddo');
  await page.locator('#datasetSearchResults .command-result').first().click();
  await expect(page.locator('#datasetItemModalTitle')).toHaveText('Battle of Megiddo');
  await expect(page.locator('#datasetItemModalBody')).toContainText('New Kingdom Egypt vs Canaanite coalition');
  await page.locator('#datasetItemModalClose').click();

  await page.locator('#dataset-select').selectOption('paintings');
  await page.keyboard.press('Control+K');
  await expect(page.locator('#datasetSearchTitle')).toContainText('Famous Paintings');
  await page.locator('#datasetSearchInput').fill('Mona Lisa');
  await page.locator('#datasetSearchResults .command-result').first().click();
  await expect(page.locator('#datasetItemModalTitle')).toHaveText('Mona Lisa');
  await expect(page.locator('#datasetItemModalBody')).toContainText('Leonardo da Vinci');
  await page.locator('#datasetItemModalClose').click();

  await page.locator('#dataset-select').selectOption('buildings');
  await page.keyboard.press('Control+K');
  await expect(page.locator('#datasetSearchTitle')).toContainText('Famous Buildings');
  await page.locator('#datasetSearchInput').fill('Great Pyramid');
  await page.locator('#datasetSearchResults .command-result').first().click();
  await expect(page.locator('#datasetItemModalTitle')).toHaveText('Great Pyramid of Giza');
  await expect(page.locator('#datasetItemModalBody')).toContainText('Giza, Egypt');
});
