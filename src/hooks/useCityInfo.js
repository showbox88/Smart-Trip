/**
 * useCityInfo — fetches city descriptions, cuisine, and attractions
 * for all destinations in parallel.
 *
 * Returns { cityInfo, loading }
 *   cityInfo[cityName] = { intro, cuisine, attractions[] }
 */

import { useState, useEffect, useMemo } from 'react';
import { fetchCityInfo } from '../utils/cityInfoApi';

export function useCityInfo(destinations) {
  const [cityInfo, setCityInfo] = useState({});
  const [loading, setLoading] = useState(false);

  // Stable key so effect only re-runs when city names actually change
  const destKey = useMemo(
    () => (destinations || []).filter(d => d.name).map(d => d.name).join('|'),
    [destinations]
  );

  useEffect(() => {
    const dests = (destinations || []).filter(d => d.name);
    if (dests.length === 0 || !destKey) return;

    let cancelled = false;
    setLoading(true);

    Promise.all(dests.map(d => fetchCityInfo(d).then(info => [d.name, info])))
      .then(results => {
        if (cancelled) return;
        const map = {};
        for (const [name, info] of results) map[name] = info;
        setCityInfo(map);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destKey]);

  return { cityInfo, loading };
}
