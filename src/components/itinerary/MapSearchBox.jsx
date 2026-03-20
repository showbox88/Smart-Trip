import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';

export default function MapSearchBox({ mapInstance, onPlaceSelect, onCategoryResults }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const searchBoxRef = useRef(null);
  const [showCategories, setShowCategories] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    if (!mapInstance || !inputRef.current) return;

    // Load Places library
    (async () => {
      const { SearchBox } = await google.maps.importLibrary('places');
      searchBoxRef.current = new SearchBox(inputRef.current);

      // Bind to map bounds
      mapInstance.addListener('bounds_changed', () => {
        searchBoxRef.current.setBounds(mapInstance.getBounds());
      });

      // Handle results
      searchBoxRef.current.addListener('places_changed', () => {
        const places = searchBoxRef.current.getPlaces();
        if (!places?.length) return;

        const place = places[0];
        if (!place.place_id && (!place.geometry || !place.geometry.location)) return;

        if (onPlaceSelect) {
          onPlaceSelect(place.place_id, place);
        }

        // Center map on result
        if (place.geometry && place.geometry.viewport) {
          mapInstance.fitBounds(place.geometry.viewport);
        } else if (place.geometry && place.geometry.location) {
          mapInstance.setCenter(place.geometry.location);
          mapInstance.setZoom(17);
        }
      });
    })();
  }, [mapInstance]);

  const categories = [
    { id: 'dining', icon: 'restaurant', type: 'restaurant', label: t('map.category_dining') },
    { id: 'attractions', icon: 'museum', type: 'tourist_attraction', label: t('map.category_attractions') },
    { id: 'gas', icon: 'local_gas_station', type: 'gas_station', label: t('map.category_gas') },
    { id: 'charging', icon: 'ev_station', type: 'electric_vehicle_charging_station', label: t('map.category_charging') },
    { id: 'lodging', icon: 'hotel', type: 'lodging', extraTypes: [], keyword: 'hotel accommodation apartment', label: t('map.category_lodging') },
  ];

  const handleCategoryClick = (type, _extraTypes = [], keyword, icon = 'place') => {
    if (!mapInstance) return;
    setShowCategories(false);
    const service = new google.maps.places.PlacesService(mapInstance);
    const center = mapInstance.getCenter();
    const allResults = [];

    const merge = (results, status, pagination) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
        results.forEach(r => {
          if (!allResults.find(x => x.place_id === r.place_id)) allResults.push(r);
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
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowCategories(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="map-search-control" style={{
      position: 'absolute', top: '15px', left: '15px',
      width: 'calc(100% - 100px)', maxWidth: '400px',
      zIndex: 100, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto'
    }}>
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          type="text"
          placeholder={t('map.search_placeholder') || 'Search places...'}
          className="location-search-input"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setShowCategories(true)}
          style={{
            width: '100%', padding: '0.75rem 2.5rem 0.75rem 2.8rem',
            background: 'var(--bg-deep)', backdropFilter: 'blur(12px)',
            border: '1px solid var(--glass-border)', borderRadius: '12px',
            color: 'white', fontSize: '0.85rem', outline: 'none',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)'
          }}
        />
        <span className="material-symbols-outlined" style={{
          position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
          color: 'var(--text-muted)', fontSize: '18px'
        }}>search</span>
        {inputValue && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              setInputValue('');
              setShowCategories(true);
              // Clear the Google SearchBox pac-container results
              if (inputRef.current) {
                inputRef.current.value = '';
                inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
                inputRef.current.focus();
              }
            }}
            style={{
              position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', padding: '2px',
              display: 'flex', alignItems: 'center', color: 'var(--text-muted)'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        )}
      </div>

      {showCategories && (
        <div style={{ background: '#111318', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 8px 32px rgba(0,0,0,0.6)' }}>
          {categories.map((cat, idx) => (
            <button
              key={cat.id}
              onClick={() => handleCategoryClick(cat.type, cat.extraTypes, cat.keyword, cat.icon)}
              style={{
                display: 'flex', alignItems: 'center', gap: '14px', width: '100%',
                padding: '12px 16px', background: 'none', border: 'none',
                borderBottom: idx < categories.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                color: 'white', fontSize: '0.9rem', cursor: 'pointer', textAlign: 'left',
                transition: 'background 0.15s'
              }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
              onMouseOut={e => e.currentTarget.style.background = 'none'}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'rgba(255,255,255,0.7)', width: '24px', flexShrink: 0 }}>{cat.icon}</span>
              {cat.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
