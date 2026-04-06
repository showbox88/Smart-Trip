import { useState, useEffect, useRef, useCallback } from 'react';
import { fetchClimateData } from '../utils/climateApi';

/**
 * useClimateData — fetches historical climate data for destinations.
 *
 * @param {Array} destinations - [{ name, lat, lng }]
 * @param {string} startDate - "YYYY-MM-DD"
 * @param {string} endDate - "YYYY-MM-DD"
 * @returns {{ climateByCity: Object, loading: boolean, error: string|null }}
 */
export function useClimateData(destinations, startDate, endDate) {
  const [climateByCity, setClimateByCity] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const debounceRef = useRef(null);

  // Stable key to avoid re-fetching with same inputs
  const key = JSON.stringify(
    (destinations || []).map(d => `${d.name}:${d.lat}:${d.lng}`)
  ) + `|${startDate}|${endDate}`;

  const fetchAll = useCallback(async (dests, start, end) => {
    if (!dests?.length || !start || !end || start > end) {
      setClimateByCity({});
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const results = {};
      await Promise.all(
        dests.map(async (dest) => {
          if (!dest.lat || !dest.lng) return;
          try {
            const data = await fetchClimateData(dest.lat, dest.lng, start, end);
            if (data) results[dest.name] = data;
          } catch (err) {
            console.warn(`[useClimateData] failed for ${dest.name}:`, err);
          }
        })
      );
      setClimateByCity(results);
    } catch (err) {
      console.error('[useClimateData] fetch failed:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchAll(destinations, startDate, endDate);
    }, 500);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, fetchAll]);

  return { climateByCity, loading, error };
}
