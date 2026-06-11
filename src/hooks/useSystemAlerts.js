/**
 * useSystemAlerts — central subscription to PB system_alerts.
 *
 * Used by Navbar (bell + dropdown) and AdminPage (top banner).
 * Polls every 30s; consider PB realtime SSE if responsiveness becomes
 * a pain point.
 */
import { useEffect, useState, useCallback } from 'react';
import { pb } from '../lib/pb';

const COLL = 'system_alerts';
const POLL_MS = 30_000;

export function useSystemAlerts() {
  const [alerts, setAlerts] = useState([]);
  const [unackCount, setUnackCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const list = await pb.collection(COLL).getList(1, 20, { sort: '-created' });
      setAlerts(list.items);
      setUnackCount(list.items.filter((a) => !a.acknowledged).length);
    } catch {
      // silent: PB unreachable → keep last known state
    }
  }, []);

  useEffect(() => {
    let stop = false;
    const tick = async () => {
      if (stop) return;
      await refresh();
    };
    tick();
    const t = setInterval(tick, POLL_MS);
    return () => { stop = true; clearInterval(t); };
  }, [refresh]);

  const markAck = useCallback(async (id) => {
    try {
      await pb.collection(COLL).update(id, { acknowledged: true });
      setAlerts((a) => a.map((x) => (x.id === id ? { ...x, acknowledged: true } : x)));
      setUnackCount((c) => Math.max(0, c - 1));
    } catch (e) {
      console.warn('[useSystemAlerts] markAck failed:', e?.message);
    }
  }, []);

  const markAllAck = useCallback(async () => {
    const unack = alerts.filter((a) => !a.acknowledged);
    try {
      await Promise.all(unack.map((a) => pb.collection(COLL).update(a.id, { acknowledged: true })));
      setAlerts((a) => a.map((x) => ({ ...x, acknowledged: true })));
      setUnackCount(0);
    } catch (e) {
      console.warn('[useSystemAlerts] markAllAck failed:', e?.message);
    }
  }, [alerts]);

  return { alerts, unackCount, markAck, markAllAck, refresh };
}
