/**
 * climateApi.js — Open-Meteo Historical Weather API + localStorage cache
 *
 * Fetches past 5 years of weather data for the same date range as the trip,
 * averages the results, and provides clothing suggestions.
 *
 * API: https://archive-api.open-meteo.com/v1/archive (free, no key, no CORS)
 */

const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const HISTORY_YEARS = 5;

// ── localStorage cache ──

function cacheKey(lat, lng, startMmDd, endMmDd) {
  return `climate:${lat.toFixed(3)},${lng.toFixed(3)}:${startMmDd}:${endMmDd}`;
}

export function getCachedClimate(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts > CACHE_TTL_MS) {
      localStorage.removeItem(key);
      return null;
    }
    return data;
  } catch {
    return null;
  }
}

export function setCachedClimate(key, data) {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch { /* quota exceeded — ignore */ }
}

// ── Open-Meteo fetch ──

async function fetchYearRange(lat, lng, startDate, endDate) {
  const url = `https://archive-api.open-meteo.com/v1/archive?latitude=${lat}&longitude=${lng}&start_date=${startDate}&end_date=${endDate}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum&timezone=auto`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`Open-Meteo ${resp.status}`);
  return resp.json();
}

/**
 * Build date ranges for each of the past N years matching the trip's MM-DD window.
 * Handles cross-year trips (e.g., Dec 28 – Jan 3).
 */
function buildHistoricalRanges(startDate, endDate) {
  const startMm = parseInt(startDate.slice(5, 7));
  const startDd = parseInt(startDate.slice(8, 10));
  const endMm = parseInt(endDate.slice(5, 7));
  const endDd = parseInt(endDate.slice(8, 10));

  const currentYear = new Date().getFullYear();
  const ranges = [];

  for (let i = 1; i <= HISTORY_YEARS; i++) {
    const year = currentYear - i;
    const s = `${year}-${String(startMm).padStart(2, '0')}-${String(startDd).padStart(2, '0')}`;

    // Cross-year: end month < start month (e.g., Dec→Jan)
    const endYear = endMm < startMm ? year + 1 : year;
    const e = `${endYear}-${String(endMm).padStart(2, '0')}-${String(endDd).padStart(2, '0')}`;

    ranges.push({ start: s, end: e });
  }

  return ranges;
}

/**
 * Fetch historical climate data for a location and date range.
 * Returns averaged weather data over the past 5 years.
 */
export async function fetchClimateData(lat, lng, startDate, endDate) {
  const startMmDd = startDate.slice(5);
  const endMmDd = endDate.slice(5);
  const key = cacheKey(lat, lng, startMmDd, endMmDd);

  // Check cache
  const cached = getCachedClimate(key);
  if (cached) return cached;

  const ranges = buildHistoricalRanges(startDate, endDate);

  // Fetch all years in parallel
  const results = await Promise.allSettled(
    ranges.map(r => fetchYearRange(lat, lng, r.start, r.end))
  );

  const allHighs = [];
  const allLows = [];
  const allPrecip = [];
  let totalDays = 0;

  for (const result of results) {
    if (result.status !== 'fulfilled') continue;
    const daily = result.value?.daily;
    if (!daily) continue;

    const highs = daily.temperature_2m_max || [];
    const lows = daily.temperature_2m_min || [];
    const precip = daily.precipitation_sum || [];

    for (let i = 0; i < highs.length; i++) {
      if (highs[i] != null) allHighs.push(highs[i]);
      if (lows[i] != null) allLows.push(lows[i]);
      if (precip[i] != null) allPrecip.push(precip[i]);
      totalDays++;
    }
  }

  if (allHighs.length === 0) {
    return null; // No data available
  }

  const avg = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const tripDays = Math.max(1, Math.round((new Date(endDate) - new Date(startDate)) / 86400000) + 1);

  const data = {
    avgHigh: Math.round(avg(allHighs) * 10) / 10,
    avgLow: Math.round(avg(allLows) * 10) / 10,
    avgPrecipMm: Math.round(avg(allPrecip) * 10) / 10,
    rainyDays: Math.round((allPrecip.filter(p => p > 1).length / HISTORY_YEARS) * (tripDays / Math.max(1, allPrecip.length / HISTORY_YEARS))),
    tripDays,
    yearsAnalyzed: results.filter(r => r.status === 'fulfilled').length,
  };

  // Cache result
  setCachedClimate(key, data);

  return data;
}

/**
 * Get clothing suggestion based on average high temperature.
 */
export function getClothingSuggestion(avgHighC, t) {
  if (avgHighC > 30) return t('climate.clothing_hot') || 'Light, breathable clothes, sunscreen';
  if (avgHighC > 20) return t('climate.clothing_warm') || 'T-shirts, light layers';
  if (avgHighC > 10) return t('climate.clothing_mild') || 'Layers, light jacket';
  if (avgHighC > 0) return t('climate.clothing_cool') || 'Warm coat, sweater';
  return t('climate.clothing_cold') || 'Heavy winter coat, gloves, hat';
}
