import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { checkApiAllowed, logApiCall } from '../../utils/apiGuard';

/**
 * DestinationInput — Google Places Autocomplete for adding destination cities.
 * Shows chips for added cities + search input.
 *
 * Props:
 *   destinations: [{ name, lat, lng, placeId, country }]
 *   onAdd(dest): called with new destination object
 *   onRemove(idx): called with index to remove
 */
export default memo(function DestinationInput({ destinations = [], onAdd, onRemove }) {
  const { t } = useI18n();
  const { state } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [focusIdx, setFocusIdx] = useState(-1);
  const debounceRef = useRef(null);

  const searchCities = useCallback(async (text) => {
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
        includedPrimaryTypes: ['(cities)'],
      });
      logApiCall('places_search', state.user?.id, 'success');

      const predictions = (response?.suggestions || [])
        .filter(s => s.placePrediction)
        .map(s => ({
          placeId: s.placePrediction.placeId,
          mainText: s.placePrediction.mainText?.text || s.placePrediction.text.text,
          secondaryText: s.placePrediction.secondaryText?.text || '',
        }));

      setResults(predictions);
    } catch (err) {
      console.warn('[DestinationInput] search error:', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [state.user?.id, state.settings?.language]);

  const handleInput = useCallback((e) => {
    const val = e.target.value;
    setQuery(val);
    setFocusIdx(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchCities(val), 250);
  }, [searchCities]);

  const handleSelect = useCallback(async (prediction) => {
    const mapsApi = globalThis.google;
    if (!mapsApi) return;

    try {
      const { allowed } = await checkApiAllowed('place_details', state.user?.id);
      if (!allowed) return;

      const { Place } = await mapsApi.maps.importLibrary('places');
      const place = new Place({ id: prediction.placeId });
      await place.fetchFields({ fields: ['displayName', 'location', 'addressComponents'] });
      logApiCall('place_details', state.user?.id, 'success');

      // Extract country from address components
      let country = '';
      if (place.addressComponents) {
        const countryComp = place.addressComponents.find(c =>
          (c.types || c.mh || []).includes('country')
        );
        if (countryComp) country = countryComp.long_name || countryComp.longName || countryComp.nh || '';
      }

      const dest = {
        name: place.displayName || prediction.mainText,
        lat: place.location?.lat() || 0,
        lng: place.location?.lng() || 0,
        placeId: prediction.placeId,
        country,
      };

      // Prevent duplicate
      if (!destinations.some(d => d.placeId === dest.placeId)) {
        onAdd?.(dest);
      }
    } catch (err) {
      console.error('[DestinationInput] place fetch error:', err);
    }

    setQuery('');
    setResults([]);
    setFocusIdx(-1);
  }, [state.user?.id, destinations, onAdd]);

  const handleKeyDown = useCallback((e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx(i => (i + 1) % results.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx(i => (i <= 0 ? results.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (focusIdx >= 0 && focusIdx < results.length) {
        handleSelect(results[focusIdx]);
      }
    } else if (e.key === 'Escape') {
      setResults([]);
      setFocusIdx(-1);
    }
  }, [results, focusIdx, handleSelect]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  return (
    <div>
      {/* Chips for added destinations */}
      {destinations.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '0.5rem' }}>
          {destinations.map((dest, idx) => (
            <div
              key={dest.placeId || idx}
              style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '4px 10px',
                borderRadius: '16px',
                background: 'var(--md-sys-color-secondary-container)',
                color: 'var(--md-sys-color-on-secondary-container)',
                fontSize: '0.78rem',
                fontWeight: 600,
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>location_city</span>
              {dest.name}
              {dest.country && <span style={{ opacity: 0.7, fontWeight: 400 }}>, {dest.country}</span>}
              <button
                onClick={() => onRemove?.(idx)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--md-sys-color-on-secondary-container)',
                  padding: '0 0 0 2px', display: 'flex', alignItems: 'center',
                  opacity: 0.7,
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div style={{ position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <span
            className="material-symbols-outlined"
            style={{
              position: 'absolute', left: '0.65rem', top: '50%',
              transform: 'translateY(-50%)', fontSize: '18px',
              color: 'var(--md-sys-color-on-surface-variant)',
              pointerEvents: 'none',
            }}
          >
            search
          </span>
          <input
            type="text"
            value={query}
            onChange={handleInput}
            onKeyDown={handleKeyDown}
            placeholder={t('climate.destination_placeholder') || 'Search city...'}
            autoComplete="off"
            style={{
              width: '100%',
              padding: '0.55rem 0.75rem 0.55rem 2.25rem',
              borderRadius: 'var(--md-sys-shape-corner-medium, 12px)',
              border: '1px solid var(--md-sys-color-outline-variant)',
              background: 'var(--md-sys-color-surface-container)',
              color: 'var(--md-sys-color-on-surface)',
              fontSize: '0.85rem',
              outline: 'none',
              boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--md-sys-color-primary)'; }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--md-sys-color-outline-variant)'; }}
          />
          {loading && (
            <span className="material-symbols-outlined" style={{
              position: 'absolute', right: '0.65rem', top: '50%',
              transform: 'translateY(-50%)', fontSize: '18px',
              color: 'var(--md-sys-color-on-surface-variant)',
              animation: 'spin 1s linear infinite',
            }}>
              progress_activity
            </span>
          )}
        </div>

        {/* Dropdown results */}
        {results.length > 0 && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0,
            background: 'var(--md-sys-color-surface-container-lowest)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            borderRadius: 'var(--md-sys-shape-corner-medium, 12px)',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 10,
            maxHeight: '200px',
            overflowY: 'auto',
          }}>
            {results.map((r, idx) => (
              <div
                key={r.placeId}
                onClick={() => handleSelect(r)}
                onMouseEnter={() => setFocusIdx(idx)}
                style={{
                  padding: '0.55rem 0.75rem',
                  cursor: 'pointer',
                  borderBottom: '1px solid var(--md-sys-color-outline-variant)',
                  transition: 'background 0.15s',
                  background: idx === focusIdx ? 'var(--md-sys-color-surface-container-low)' : 'transparent',
                }}
              >
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface)' }}>
                  {r.mainText}
                </div>
                {r.secondaryText && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant)' }}>
                    {r.secondaryText}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
