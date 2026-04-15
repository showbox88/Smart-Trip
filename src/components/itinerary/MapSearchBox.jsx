import { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../../context/I18nContext';
import { checkApiAllowed, logApiCall } from '../../utils/apiGuard';

async function fetchPlacePredictions(query) {
  const mapsApi = globalThis.google;
  if (!mapsApi || !query || query.length < 2) return [];

  const { allowed } = await checkApiAllowed('places_search', null);
  if (!allowed) {
    console.warn('[MapSearchBox] places_search blocked by guard');
    return [];
  }

  const { AutocompleteSuggestion } = await mapsApi.maps.importLibrary('places');
  const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: query });
  logApiCall('places_search', null, 'success');

  return (suggestions || []).map((suggestion) => ({
    placeId: suggestion.placePrediction.placeId,
    mainText: suggestion.placePrediction.mainText?.text || suggestion.placePrediction.text?.text || '',
    secondaryText: suggestion.placePrediction.secondaryText?.text || '',
  }));
}

async function focusPlaceOnMap(placeId, mapInstance) {
  const mapsApi = globalThis.google;
  if (!mapsApi || !placeId || !mapInstance) return null;

  const { allowed } = await checkApiAllowed('place_details', null);
  if (!allowed) {
    console.warn('[MapSearchBox] place_details blocked by guard');
    return null;
  }

  const { Place } = await mapsApi.maps.importLibrary('places');
  const place = new Place({ id: placeId });
  await place.fetchFields({
    fields: ['displayName', 'location', 'viewport'],
  });
  logApiCall('place_details', null, 'success');

  if (place.viewport) {
    mapInstance.fitBounds(place.viewport);
  } else if (place.location) {
    mapInstance.setCenter(place.location);
    mapInstance.setZoom(17);
  }

  return place;
}

export default function MapSearchBox({ mapInstance, onPlaceSelect, onCategoryResults, leftOffset = 15, darkMode = false }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [predictions, setPredictions] = useState([]);
  const [focusIdx, setFocusIdx] = useState(-1);

  const categories = [
    { id: 'dining', icon: 'restaurant', type: 'restaurant', label: t('map.category_dining') },
    { id: 'attractions', icon: 'museum', type: 'tourist_attraction', label: t('map.category_attractions') },
    { id: 'gas', icon: 'local_gas_station', type: 'gas_station', label: t('map.category_gas') },
    { id: 'charging', icon: 'ev_station', type: 'electric_vehicle_charging_station', label: t('map.category_charging') },
    { id: 'lodging', icon: 'hotel', type: 'lodging', extraTypes: [], keyword: 'hotel accommodation apartment', label: t('map.category_lodging') },
  ];

  const clearPredictions = useCallback(() => {
    setPredictions([]);
    setFocusIdx(-1);
  }, []);

  const runPredictionSearch = useCallback(async (value) => {
    try {
      const nextPredictions = await fetchPlacePredictions(value);
      setPredictions(nextPredictions);
      setFocusIdx(nextPredictions.length ? 0 : -1);
    } catch (err) {
      console.error('[MapSearchBox] prediction fetch failed:', err);
      clearPredictions();
    }
  }, [clearPredictions]);

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
  }, []);

  const handleSelectPrediction = useCallback(async (prediction) => {
    if (!prediction?.placeId) return;

    setInputValue(prediction.mainText || '');
    clearPredictions();
    setShowDropdown(false);

    try {
      const place = await focusPlaceOnMap(prediction.placeId, mapInstance);
      onPlaceSelect?.(prediction.placeId, place);
    } catch (err) {
      console.error('[MapSearchBox] place focus failed:', err);
      onPlaceSelect?.(prediction.placeId);
    }
  }, [mapInstance, onPlaceSelect, clearPredictions]);

  const handleCategoryClick = useCallback((type, keyword, icon = 'place') => {
    const mapsApi = globalThis.google;
    if (!mapInstance || !mapsApi?.maps?.places) return;

    setShowDropdown(false);
    clearPredictions();

    const service = new mapsApi.maps.places.PlacesService(mapInstance);
    const center = mapInstance.getCenter();
    const allResults = [];

    const merge = (results, status, pagination) => {
      if (status === mapsApi.maps.places.PlacesServiceStatus.OK && results?.length) {
        results.forEach((result) => {
          if (!allResults.find((item) => item.place_id === result.place_id)) allResults.push(result);
        });
        if (pagination?.hasNextPage && allResults.length < 60) {
          setTimeout(() => pagination.nextPage(), 200);
        } else {
          onCategoryResults?.(allResults, icon);
        }
      } else {
        onCategoryResults?.(allResults, icon);
      }
    };

    const searchQuery = keyword || type;
    service.textSearch({
      query: searchQuery,
      location: center,
      radius: 5000,
    }, merge);
  }, [mapInstance, onCategoryResults, clearPredictions]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!predictions.length) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setFocusIdx((idx) => (idx + 1) % predictions.length);
      return;
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setFocusIdx((idx) => (idx - 1 + predictions.length) % predictions.length);
      return;
    }

    if (e.key === 'Enter') {
      e.preventDefault();
      if (focusIdx >= 0 && predictions[focusIdx]) {
        handleSelectPrediction(predictions[focusIdx]);
      }
    }
  }, [predictions, focusIdx, handleSelectPrediction]);

  const showPredictions = showDropdown && predictions.length > 0;
  const showCategories = showDropdown && !predictions.length;

  const handleInputChange = useCallback((value) => {
    setInputValue(value);
    setShowDropdown(true);

    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) {
      clearPredictions();
      return;
    }

    debounceRef.current = setTimeout(() => {
      runPredictionSearch(value.trim());
    }, 220);
  }, [clearPredictions, runPredictionSearch]);

  // Adaptive colors for light/dark map
  const bg = darkMode ? 'rgba(13,17,27,.85)' : 'rgba(255,255,255,.92)';
  const textColor = darkMode ? '#fff' : '#1c1c1e';
  const mutedColor = darkMode ? 'rgba(255,255,255,.5)' : '#8e8e93';
  const divider = darkMode ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.06)';
  const hoverBg = darkMode ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)';
  const shadow = darkMode ? '0 4px 20px rgba(0,0,0,.5)' : '0 2px 12px rgba(0,0,0,.12)';

  return (
    <div
      ref={containerRef}
      className={`map-search-control${darkMode ? ' map-dark' : ''}`}
      style={{
        position: 'absolute', top: '12px', left: leftOffset,
        width: `calc(100% - ${leftOffset + 100}px)`, maxWidth: '400px',
        zIndex: 100, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto',
      }}
    >
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder={t('map.search_placeholder') || 'Search places...'}
          className="location-search-input"
          value={inputValue}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => setShowDropdown(true)}
          onKeyDown={handleKeyDown}
          style={{
            width: '100%', padding: '10px 38px 10px 36px',
            background: bg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: 'none', borderRadius: '12px',
            color: textColor, fontSize: '14px', outline: 'none',
            boxShadow: shadow,
          }}
        />
        <span
          className="material-symbols-outlined"
          style={{
            position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)',
            color: mutedColor, fontSize: '18px',
          }}
        >
          search
        </span>
        {inputValue && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setInputValue('');
              clearPredictions();
              setShowDropdown(true);
              inputRef.current?.focus();
            }}
            style={{
              position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
              display: 'flex', alignItems: 'center', color: mutedColor,
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        )}
      </div>

      {showPredictions && (
        <div style={{ background: bg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: 'none', borderRadius: '12px', overflow: 'hidden', boxShadow: shadow }}>
          {predictions.map((prediction, idx) => (
            <button
              key={prediction.placeId}
              onClick={() => handleSelectPrediction(prediction)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', width: '100%',
                padding: '11px 14px', background: idx === focusIdx ? hoverBg : 'none', border: 'none',
                borderBottom: idx < predictions.length - 1 ? `1px solid ${divider}` : 'none',
                color: textColor, fontSize: '14px', cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseEnter={() => setFocusIdx(idx)}
              onMouseOver={(e) => { e.currentTarget.style.background = hoverBg; }}
              onMouseOut={(e) => { e.currentTarget.style.background = idx === focusIdx ? hoverBg : 'none'; }}
            >
              <span style={{ fontWeight: 600 }}>{prediction.mainText}</span>
              {prediction.secondaryText && (
                <span style={{ fontSize: '12px', color: mutedColor }}>{prediction.secondaryText}</span>
              )}
            </button>
          ))}
        </div>
      )}

      {showCategories && (
        <div style={{ background: bg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: 'none', borderRadius: '12px', overflow: 'hidden', boxShadow: shadow }}>
          {categories.map((cat, idx) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.type, cat.keyword, cat.icon)}
              style={{
                display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
                padding: '11px 14px', background: 'none', border: 'none',
                borderBottom: idx < categories.length - 1 ? `1px solid ${divider}` : 'none',
                color: textColor, fontSize: '14px', cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s',
              }}
              onMouseOver={(e) => { e.currentTarget.style.background = hoverBg; }}
              onMouseOut={(e) => { e.currentTarget.style.background = 'none'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: mutedColor, width: '24px', flexShrink: 0 }}>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
