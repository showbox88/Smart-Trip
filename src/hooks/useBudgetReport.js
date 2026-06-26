import { useState, useEffect } from 'react';
import { getPbBudgetReport } from '../adapters/pbAdapter';

/**
 * 某 trip 的开销/预算报告。
 * 进入页面时 force 重拉一次(spec §2:不上 realtime,打开即拉最新)。
 */
export function useBudgetReport(tripId) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tripId) { setLoading(false); return; }
    let alive = true;
    setLoading(true);
    setError(null);
    getPbBudgetReport(tripId, true)
      .then(r => { if (alive) { setReport(r); setLoading(false); } })
      .catch(e => { if (alive) { setError(e); setLoading(false); } });
    return () => { alive = false; };
  }, [tripId]);

  return { report, loading, error };
}
