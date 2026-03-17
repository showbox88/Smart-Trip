import { useState, useRef, useEffect } from 'react';
import { useI18n } from '../../context/I18nContext';

export default function MapSearchBox({ mapInstance, onPlaceSelect }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const searchBoxRef = useRef(null);

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
    { id: 'cafe', icon: 'coffee', type: 'cafe', label: t('map.category_cafe') },
  ];

  const handleCategoryClick = (type) => {
    if (!mapInstance) return;
    const request = {
      location: mapInstance.getCenter(),
      radius: '2000',
      type: type
    };
    const service = new google.maps.places.PlacesService(mapInstance);
    service.nearbySearch(request, (results, status) => {
      if (status === google.maps.places.PlacesServiceStatus.OK && results.length > 0) {
        // Just show the first result for now to open panel
        onPlaceSelect(results[0].place_id, results[0]);
        mapInstance.setCenter(results[0].geometry.location);
        mapInstance.setZoom(16);
      }
    });
  };

  return (
    <div className="map-search-control" style={{
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
          style={{
            width: '100%', padding: '0.75rem 1rem 0.75rem 2.8rem',
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
      </div>

      <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px' }} className="hide-scrollbar">
        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.type)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap',
              background: 'rgba(13, 17, 27, 0.75)', border: '1px solid var(--glass-border)',
              borderRadius: '20px', padding: '4px 10px', color: 'rgba(255,255,255,0.85)',
              fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer',
              transition: 'all 0.2s', backdropFilter: 'blur(8px)'
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(249, 115, 22, 0.2)';
              e.currentTarget.style.borderColor = 'var(--accent-primary)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(13, 17, 27, 0.75)';
              e.currentTarget.style.borderColor = 'var(--glass-border)';
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>
    </div>
  );
}
