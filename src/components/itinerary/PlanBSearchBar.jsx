import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { checkApiAllowed, logApiCall } from '../../utils/apiGuard';

/**
 * PlanBSearchBar — Google Places Autocomplete search for adding Plan B alternatives.
 * Reuses the same API pattern as useStopSearch, but inline within the panel.
 */
export default memo(function PlanBSearchBar({ onSelect, disabled }) {
  const { t } = useI18n();
  const { state } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef(null);
  const inputRef = useRef(null);

  const searchPlaces = useCallback(async (text) => {
    if (!text || text.length < 2) {
      setResults([]);
      return;
    }

    const mapsApi = globalThis.google;
    if (!mapsApi || !window.googleMapsReady) return;

    try {
      const { allowed } = await checkApiAllowed('places_search', state.user?.id);
      if (!allowed) return;

      setLoading(true);
      const { AutocompleteSuggestion } = await mapsApi.maps.importLibrary('places');
      const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: text,
        language: state.settings?.language || 'en',
      });
      logApiCall('places_search', state.user?.id, 'success');

      const predictions = (response?.suggestions || [])
        .filter(s => s.placePrediction)
        .map(s => ({
          place_id: s.placePrediction.placeId,
          main_text: s.placePrediction.mainText?.text || s.placePrediction.text.text,
          secondary_text: s.placePrediction.secondaryText?.text || '',
        }));

      setResults(predictions);
    } catch (err) {
      console.warn('[PlanBSearch] error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [state.user?.id, state.settings?.language]);

  const handleInput = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(val), 250);
  }, [searchPlaces]);

  const handleSelect = useCallback((placeId) => {
    onSelect?.(placeId);
    setQuery('');
    setResults([]);
  }, [onSelect]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div className="planb-search-container">
      <span className="material-symbols-outlined planb-search-icon">search</span>
      <input
        ref={inputRef}
        className="planb-search-input"
        type="text"
        value={query}
        onChange={handleInput}
        placeholder={t('planb.search_placeholder') || 'Search for a place...'}
        disabled={disabled}
        autoComplete="off"
      />
      {results.length > 0 && (
        <div className="planb-search-results">
          {results.map((r) => (
            <div
              key={r.place_id}
              className="planb-search-result-item"
              onClick={() => handleSelect(r.place_id)}
            >
              <div className="planb-search-result-name">{r.main_text}</div>
              {r.secondary_text && (
                <div className="planb-search-result-addr">{r.secondary_text}</div>
              )}
            </div>
          ))}
        </div>
      )}
      {loading && (
        <div style={{ position: 'absolute', right: '0.75rem', top: '50%', transform: 'translateY(-50%)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--md-sys-color-on-surface-variant)', animation: 'spin 1s linear infinite' }}>progress_activity</span>
        </div>
      )}
    </div>
  );
});
