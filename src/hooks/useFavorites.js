import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const GUEST_KEY = 'favorites_guest';

// Load guest favorites from localStorage
function loadGuest() {
  try {
    return JSON.parse(localStorage.getItem(GUEST_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveGuest(list) {
  localStorage.setItem(GUEST_KEY, JSON.stringify(list));
}

export function useFavorites(userId) {
  const [favorites, setFavorites] = useState([]); // [{ place_id, saved_at, name, address, photo_url, rating, category, lat, lng }]
  const [loading, setLoading] = useState(true);
  const favIdSet = useRef(new Set()); // fast O(1) lookup

  // ── Load ──
  useEffect(() => {
    if (!userId) {
      // Guest: load from localStorage
      const guest = loadGuest();
      setFavorites(guest);
      favIdSet.current = new Set(guest.map(f => f.place_id));
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        // Step 1: fetch favorites
        const { data: favData, error } = await supabase
          .from('favorites')
          .select('place_id, saved_at')
          .eq('user_id', userId)
          .order('saved_at', { ascending: false });

        if (error) throw error;
        if (!favData?.length) { setFavorites([]); favIdSet.current = new Set(); return; }

        // Step 2: fetch place details for those ids
        const placeIds = favData.map(f => f.place_id);
        const { data: placesData } = await supabase
          .from('places')
          .select('place_id, name, address, photo_url, rating, category, lat, lng')
          .in('place_id', placeIds);

        const placesMap = Object.fromEntries((placesData || []).map(p => [p.place_id, p]));

        const list = favData.map(row => {
          const p = placesMap[row.place_id] || {};
          return {
            place_id: row.place_id,
            saved_at: row.saved_at,
            name: p.name || '',
            address: p.address || '',
            photo_url: p.photo_url || null,
            rating: p.rating || null,
            category: p.category || '',
            lat: p.lat || null,
            lng: p.lng || null,
          };
        });

        setFavorites(list);
        favIdSet.current = new Set(list.map(f => f.place_id));
      } catch (err) {
        console.warn('[useFavorites] load failed:', err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  // ── isFavorited ──
  const isFavorited = useCallback((placeId) => {
    return favIdSet.current.has(placeId);
  }, []);

  // ── toggleFavorite ──
  const toggleFavorite = useCallback(async (placeId, placeSnapshot) => {
    const alreadySaved = favIdSet.current.has(placeId);

    if (alreadySaved) {
      // Optimistic remove
      favIdSet.current.delete(placeId);
      setFavorites(prev => prev.filter(f => f.place_id !== placeId));

      if (!userId) {
        saveGuest(loadGuest().filter(f => f.place_id !== placeId));
        return;
      }
      const { error } = await supabase
        .from('favorites')
        .delete()
        .eq('user_id', userId)
        .eq('place_id', placeId);
      if (error) {
        // Rollback
        console.warn('[useFavorites] delete failed:', error.message);
        favIdSet.current.add(placeId);
        setFavorites(prev => [{ place_id: placeId, saved_at: new Date().toISOString(), ...placeSnapshot }, ...prev]);
      }
    } else {
      // Build record from placeSnapshot
      const record = {
        place_id: placeId,
        saved_at: new Date().toISOString(),
        name: placeSnapshot?.name || placeSnapshot?.displayName || '',
        address: placeSnapshot?.address || placeSnapshot?.formattedAddress || '',
        photo_url: placeSnapshot?.photo_url || placeSnapshot?.photoUrl || null,
        rating: placeSnapshot?.rating ?? null,
        category: placeSnapshot?.category || '',
        lat: placeSnapshot?.lat ?? null,
        lng: placeSnapshot?.lng ?? null,
      };

      // Optimistic add
      favIdSet.current.add(placeId);
      setFavorites(prev => [record, ...prev]);

      if (!userId) {
        const guest = loadGuest();
        saveGuest([record, ...guest.filter(f => f.place_id !== placeId)]);
        return;
      }

      // 1. Insert place data into shared places cache (first-write-wins — never overwrite photo/name/address/coords)
      supabase.from('places').insert({
        place_id: placeId,
        name: record.name,
        address: record.address,
        lat: record.lat,
        lng: record.lng,
        category: record.category,
        photo_url: record.photo_url,
        rating: record.rating,
        fetched_at: new Date().toISOString(),
      }).then(({ error }) => {
        if (error && error.code !== '23505') console.warn('[useFavorites] places insert failed:', error.message);
        // 23505 = unique_violation (place already cached) — silently ignored
      });

      // 2. Insert favorite record
      const { error } = await supabase
        .from('favorites')
        .insert({ user_id: userId, place_id: placeId });
      if (error && error.code !== '23505') { // ignore duplicate
        console.warn('[useFavorites] insert failed:', error.message);
        // Rollback
        favIdSet.current.delete(placeId);
        setFavorites(prev => prev.filter(f => f.place_id !== placeId));
      }
    }
  }, [userId]);

  return { favorites, loading, isFavorited, toggleFavorite };
}
