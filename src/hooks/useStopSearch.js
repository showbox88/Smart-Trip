import { useState, useRef, useCallback } from 'react';
import { checkApiAllowed, logApiCall } from '../utils/apiGuard';
import { useApp } from '../context/AppContext';

export function useStopSearch(dayId, onSelect) {
  const { state } = useApp();
  const [query, setQuery] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [focusIdx, setFocusIdx] = useState(-1);
  const [isLoading, setIsLoading] = useState(false);
  const timerRef = useRef(null);

  const mapsReady = typeof window !== 'undefined' && typeof google !== 'undefined' && window.googleMapsReady;

  const search = useCallback(async (q) => {
    if (!q || q.length < 2 || !mapsReady) {
      setPredictions([]);
      setFocusIdx(-1);
      return;
    }
    setIsLoading(true);
    try {
      const { allowed, reason } = await checkApiAllowed('places_search', state.user?.id);
      if (!allowed) {
        console.warn('[useStopSearch] places_search blocked:', reason);
        setPredictions([]);
        setIsLoading(false);
        return;
      }
      const { AutocompleteSuggestion } = await google.maps.importLibrary('places');
      const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: q });
      logApiCall('places_search', state.user?.id, 'success');

      if (!suggestions?.length) {
        setPredictions([]);
        setIsLoading(false);
        return;
      }

      setPredictions(suggestions.map(s => ({
        place_id: s.placePrediction.placeId,
        main_text: s.placePrediction.mainText?.text || s.placePrediction.text.text,
        secondary_text: s.placePrediction.secondaryText?.text || '',
      })));
      setFocusIdx(-1);
    } catch (err) {
      console.error('[useStopSearch] autocomplete failed:', err);
      setPredictions([]);
    } finally {
      setIsLoading(false);
    }
  }, [mapsReady]);

  const handleQueryChange = useCallback((value) => {
    setQuery(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!value.trim()) {
      setPredictions([]);
      return;
    }
    timerRef.current = setTimeout(() => search(value.trim()), 250);
  }, [search]);

  const handleKeyDown = useCallback((e, afterStopId = null) => {
    if (!predictions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(i => (i + 1) % predictions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(i => (i - 1 + predictions.length) % predictions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusIdx >= 0 && focusIdx < predictions.length) {
        selectPlace(predictions[focusIdx].place_id, afterStopId);
      }
    } else if (e.key === 'Escape') {
      setPredictions([]);
      setFocusIdx(-1);
    }
  }, [predictions, focusIdx]);

  const selectPlace = useCallback((placeId, afterStopId = null) => {
    setPredictions([]);
    setQuery('');
    setFocusIdx(-1);
    if (onSelect) onSelect(placeId, afterStopId);
  }, [onSelect]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setPredictions([]);
    setFocusIdx(-1);
  }, []);

  return {
    query,
    setQuery: handleQueryChange,
    predictions,
    focusIdx,
    isLoading,
    handleKeyDown,
    selectPlace,
    clearSearch,
    mapsReady,
  };
}
