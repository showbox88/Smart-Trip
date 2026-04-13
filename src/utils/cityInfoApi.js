/**
 * cityInfoApi.js — Fetch city descriptions, cuisine info, and top attractions
 * Source: Wikipedia REST API + MediaWiki API (free, no API key, CORS-safe)
 * Caching: localStorage with 7-day TTL
 */

const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days

function cacheGet(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL) { localStorage.removeItem(key); return null; }
    return data;
  } catch { return null; }
}

function cacheSet(key, data) {
  try { localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() })); } catch {}
}

/* ── Wikipedia helpers ── */

async function wikiExtract(title, sentences = 4) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(title)}&prop=extracts&exintro=true&explaintext=true&exsentences=${sentences}&format=json&origin=*`;
  const res = await fetch(url);
  const json = await res.json();
  const pages = json?.query?.pages || {};
  const page = Object.values(pages)[0];
  if (!page || page.pageid === undefined || page.pageid < 0) return '';
  const text = page?.extract || '';
  return (text && !text.includes('may refer to')) ? text.trim() : '';
}

/* Wikipedia REST summary — returns { title, description, extract, thumbnail } */
async function wikiSummary(title) {
  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const json = await res.json();
  if (json.type === 'disambiguation' || !json.pageid) return null;
  return {
    title: json.title || title,
    description: json.description || '',
    extract: json.extract || '',
    thumbnail: json.thumbnail?.source || '',
  };
}

/* Search Wikipedia for best match title */
async function wikiSearchTitle(query) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(query)}&srlimit=1&format=json&origin=*`;
  const res = await fetch(url);
  const json = await res.json();
  return json?.query?.search?.[0]?.title || '';
}

/* Get Wikipedia category members (pages in a category) */
async function wikiCategoryMembers(category, limit = 30) {
  const url = `https://en.wikipedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(category)}&cmtype=page&cmlimit=${limit}&format=json&origin=*`;
  const res = await fetch(url);
  const json = await res.json();
  return (json?.query?.categorymembers || []).map(m => m.title);
}

/* Get article links (for finding dish/attraction names) */
async function wikiArticleLinks(title) {
  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=links&format=json&origin=*`;
  const res = await fetch(url);
  const json = await res.json();
  if (!json?.parse?.links) return [];
  return json.parse.links
    .filter(l => l.ns === 0 && l['*'])
    .map(l => l['*']);
}

/* ── Wikipedia: city intro ── */

export async function fetchCityIntro(cityName) {
  const cacheKey = `cityIntro:${cityName}`;
  const cached = cacheGet(cacheKey);
  if (cached !== null) return cached;

  try {
    const result = await wikiExtract(cityName, 4);
    cacheSet(cacheKey, result);
    return result;
  } catch { return ''; }
}

/* ── Cuisine: use Wikipedia Category API for accurate dish data ── */

export async function fetchCuisineInfo(country, cityName) {
  const cacheKey = `cuisineInfo4:${cityName || country}`;
  const cached = cacheGet(cacheKey);
  if (cached?.items?.length > 0) return cached;

  if (!country && !cityName) return { intro: '', items: [] };

  try {
    // 1) Find cuisine article title (for intro text)
    let cuisineTitle = '';
    const tryTitles = [];
    if (cityName) tryTitles.push(`${cityName} cuisine`, `Cuisine of ${cityName}`);
    if (country) tryTitles.push(`${country} cuisine`, `Cuisine of ${country}`);

    for (const t of tryTitles) {
      const s = await wikiSummary(t);
      if (s?.extract && s.title.toLowerCase().includes('cuisine')) {
        cuisineTitle = s.title;
        break;
      }
    }
    if (!cuisineTitle) {
      const searches = [];
      if (country) searches.push(`cuisine ${country}`);
      if (cityName) searches.push(`${cityName} cuisine food`);
      for (const q of searches) {
        const found = await wikiSearchTitle(q);
        if (found && found.toLowerCase().includes('cuisine')) { cuisineTitle = found; break; }
      }
    }

    // 2) Get cuisine article intro
    const intro = cuisineTitle ? (await wikiSummary(cuisineTitle))?.extract || '' : '';

    // 3) Get dish names from Wikipedia CATEGORY (much more accurate than article links)
    //    Try regional category first, then country-level
    const skipItem = /^(list of|cuisine|category|template|portal|index)/i;
    let dishNames = [];

    // Try categories: "Catalan cuisine", "Tuscan cuisine", "{city} cuisine", then "{country} cuisine"
    const catTries = [];
    if (cuisineTitle) catTries.push(cuisineTitle.replace(/\s/g, '_'));
    if (cityName) catTries.push(`${cityName}_cuisine`);
    if (country) catTries.push(`${country}_cuisine`);

    for (const cat of catTries) {
      const members = await wikiCategoryMembers(cat, 30);
      const filtered = members.filter(m => !skipItem.test(m) && m.length > 2 && m.length < 50);
      if (filtered.length >= 3) { dishNames = filtered; break; }
    }

    if (dishNames.length === 0) return { intro, items: [] };

    // 4) Fetch summaries with images — pick ones that have thumbnails
    const candidates = dishNames.slice(0, 18);
    const summaries = await Promise.all(candidates.map(t => wikiSummary(t).catch(() => null)));
    const items = summaries
      .filter(s => s && s.thumbnail && s.extract && !s.extract.includes('may refer to'))
      .map(s => ({ name: s.title, desc: s.description || s.extract.split('.')[0] + '.', image: s.thumbnail }))
      .slice(0, 8);

    const result = { intro, items };
    if (items.length > 0) cacheSet(cacheKey, result);
    return result;
  } catch { return { intro: '', items: [] }; }
}

/* ── Attractions: get names → fetch summaries with images ── */

export async function fetchAttractions(cityName) {
  const cacheKey = `attractions2:${cityName}`;
  const cached = cacheGet(cacheKey);
  if (cached?.length > 0) return cached;

  try {
    // 1) Get attraction names from "Tourism in {city}" article
    let names = [];
    const tourismLinks = await wikiArticleLinks('Tourism in ' + cityName);
    const skip = /^(list|tourism|category|wikipedia|template|portal|index|history|geography|culture|economy|city|municipal|province|region|country|population|climate|transport)/i;
    names = tourismLinks.filter(l => !skip.test(l) && l.length > 2 && l.length < 60).slice(0, 12);

    // Fallback: search
    if (names.length === 0) {
      const title = await wikiSearchTitle(`${cityName} landmarks tourist attractions`);
      if (title) {
        const links = await wikiArticleLinks(title);
        names = links.filter(l => !skip.test(l) && l.length > 2 && l.length < 60).slice(0, 12);
      }
    }

    if (names.length === 0) return [];

    // 2) Fetch summaries with thumbnails
    const summaries = await Promise.all(names.map(n => wikiSummary(n).catch(() => null)));
    const items = summaries
      .filter(s => s && s.extract && !s.extract.includes('may refer to'))
      .map(s => ({
        name: s.title,
        desc: s.description || s.extract.split('.')[0] + '.',
        image: s.thumbnail || '',
      }))
      .slice(0, 6);

    if (items.length > 0) cacheSet(cacheKey, items);
    return items;
  } catch {
    return [];
  }
}

/* ── Fetch all info for one city ── */

export async function fetchCityInfo(destination) {
  const { name, country } = destination;
  const [intro, cuisine, attractions] = await Promise.all([
    fetchCityIntro(name),
    fetchCuisineInfo(country, name),
    fetchAttractions(name),
  ]);
  return { intro, cuisine, attractions };
}
