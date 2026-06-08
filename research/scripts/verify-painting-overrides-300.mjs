// One-off lookup helper for the batch-300 misses: verifies article titles,
// searches Commons for override files, and confirms file identities.
const USER_AGENT = 'SophismFlashcards/1.0 (dataset curation; contact: local research script)';

async function get(url, attempt = 0) {
  const response = await fetch(url, { headers: { 'User-Agent': USER_AGENT } });
  const text = await response.text();
  if ((response.status === 429 || text.startsWith('You are making too many requests')) && attempt < 6) {
    await new Promise((resolve) => setTimeout(resolve, (attempt + 1) * 8000));
    return get(url, attempt + 1);
  }
  return JSON.parse(text);
}

const pause = () => new Promise((resolve) => setTimeout(resolve, 3000));

async function main() {
  // 1. Is the GAP "Starry Night" file the Orsay Rhone painting?
  const meta = await get(
    'https://commons.wikimedia.org/w/api.php?action=query&titles=' +
      encodeURIComponent('File:Vincent van Gogh - Starry Night - Google Art Project.jpg') +
      '&prop=imageinfo&iiprop=extmetadata&format=json&formatversion=2'
  );
  const em = meta.query.pages[0]?.imageinfo?.[0]?.extmetadata || {};
  console.log(
    'RHONE-CHECK:',
    em.ObjectName?.value,
    '|',
    String(em.ImageDescription?.value || '').replace(/<[^>]*>/g, ' ').slice(0, 160)
  );
  await pause();

  // 2. Do these enwiki articles exist?
  const titles = ['Violin and Palette', 'Man with a Guitar (Braque)', 'Portrait of Pablo Picasso'];
  const body = await get(
    'https://en.wikipedia.org/w/api.php?action=query&titles=' +
      encodeURIComponent(titles.join('|')) +
      '&format=json&formatversion=2&redirects=1'
  );
  for (const page of body.query.pages) console.log('TITLE:', page.title, page.missing ? 'MISSING' : 'OK');
  await pause();

  // 3. Commons file searches for overrides.
  const searches = [
    'Goya Perro semihundido Prado',
    'Holbein Portrait of Henry VIII Google Art Project',
    'Hilma af Klint Group IV The Ten Largest',
    'Juan Gris Portrait of Picasso',
    'Egon Schiele Self-Portrait Physalis',
    'Morisot Summer\'s Day',
  ];
  for (const search of searches) {
    const result = await get(
      'https://commons.wikimedia.org/w/api.php?action=query&list=search&srnamespace=6&srsearch=' +
        encodeURIComponent(search) +
        '&srlimit=4&format=json&formatversion=2'
    );
    console.log(`== ${search}`);
    for (const row of result.query.search) console.log('  ' + row.title);
    await pause();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
