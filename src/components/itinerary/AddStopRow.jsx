import { useRef, useEffect, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext';
import { useStopSearch } from '../../hooks/useStopSearch';
import HotelLine from './HotelLine';

export default memo(function AddStopRow({ dayId, onAddStop, onAddNote, onAddList, onAddTransport, autoFocus, onClose, inHotelStay }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const handleSelect = (placeId) => {
    clearSearch();
    onAddStop?.(dayId, placeId);
  };

  // Auto-focus when used as inline insert
  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const {
    query, setQuery,
    predictions, focusIdx,
    isLoading, mapsReady,
    handleKeyDown, selectPlace, clearSearch,
  } = useStopSearch(dayId, handleSelect);

  const onKeyDown = (e) => {
    if (e.key === 'Escape' && onClose) {
      onClose();
      return;
    }
    handleKeyDown(e);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const onMouseDown = (e) => {
      if (!dropdownRef.current?.contains(e.target) && !inputRef.current?.contains(e.target)) {
        clearSearch();
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [clearSearch]);

  return (
    <div style={{ position: 'relative', marginTop: '1rem' }}>
      {inHotelStay && <HotelLine />}
    <div
      className="location-search-container"
      style={{ paddingLeft: '2.25rem', display: 'flex', gap: '0.5rem' }}
    >
      <div style={{ flex: 1, position: 'relative' }}>
        <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '1rem', pointerEvents: 'none' }}>
          📍
        </span>
        <input
          ref={inputRef}
          type="text"
          className="location-search-input"
          style={{ paddingLeft: '2.8rem', background: 'var(--bg-secondary)', border: 'none' }}
          placeholder={`${t('itinerary.add_stop') || 'Add a stop'}...`}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (inputRef.current) {
              const rect = inputRef.current.getBoundingClientRect();
              setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
            }
          }}
          onFocus={() => {
            if (inputRef.current) {
              const rect = inputRef.current.getBoundingClientRect();
              setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
            }
          }}
          onKeyDown={onKeyDown}
          autoComplete="off"
          disabled={!mapsReady}
        />

        {predictions.length > 0 && createPortal(
          <ul
            ref={dropdownRef}
            className="location-autocomplete-dropdown active"
            style={{ position: 'fixed', top: dropdownPos.top, left: dropdownPos.left, width: dropdownPos.width, zIndex: 9999 }}
          >
            {predictions.map((p, idx) => (
              <li
                key={p.place_id}
                className={focusIdx === idx ? 'selected' : ''}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectPlace(p.place_id);
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                  {p.main_text}
                </div>
                {p.secondary_text && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {p.secondary_text}
                  </div>
                )}
              </li>
            ))}
            {isLoading && (
              <li style={{ color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'default' }}>
                {t('common.loading') || 'Loading...'}
              </li>
            )}
          </ul>,
          document.body
        )}
      </div>

      {onClose ? (
        <button
          onClick={onClose}
          title={t('common.cancel') || 'Cancel'}
          style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--bg-secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', cursor: 'pointer', flexShrink: 0 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
        </button>
      ) : (
        <>
          <button
            onClick={() => onAddNote?.(dayId)}
            title={t('itinerary.add_note') || 'Add note'}
            style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--bg-secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer', flexShrink: 0 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>sticky_note_2</span>
          </button>

          <button
            onClick={() => onAddList?.(dayId)}
            title={t('itinerary.add_list') || 'Add list'}
            style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--bg-secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-primary)', cursor: 'pointer', flexShrink: 0 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>checklist</span>
          </button>

          <button
            onClick={() => onAddTransport?.(dayId)}
            title={t('itinerary.add_transport') || '添加交通'}
            style={{ width: '45px', height: '45px', borderRadius: '50%', background: 'var(--bg-secondary)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4FC3F7', cursor: 'pointer', flexShrink: 0 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>flight</span>
          </button>
        </>
      )}
    </div>
    </div>
  );
})
