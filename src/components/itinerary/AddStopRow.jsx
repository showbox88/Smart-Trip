import { useRef, useEffect, useState, memo } from 'react';
import { createPortal } from 'react-dom';
import { useI18n } from '../../context/I18nContext';
import { useStopSearch } from '../../hooks/useStopSearch';
import HotelLine from './HotelLine';

export default memo(function AddStopRow({ dayId, onAddStop, onAddNote, onAddList, onAddTransport, onAddActivity, autoFocus, onClose, inHotelStay }) {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);
  const rowRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });
  const [expanded, setExpanded] = useState(!!autoFocus);
  const [showSearch, setShowSearch] = useState(!!autoFocus);

  const handleSelect = (placeId) => {
    clearSearch();
    onAddStop?.(dayId, placeId);
  };

  const {
    query, setQuery,
    predictions, focusIdx,
    isLoading, mapsReady,
    handleKeyDown, selectPlace, clearSearch,
  } = useStopSearch(dayId, handleSelect);

  const onKeyDown = (e) => {
    if (e.key === 'Escape') {
      if (onClose) { onClose(); return; }
      clearSearch();
      setShowSearch(false);
      setExpanded(false);
      return;
    }
    handleKeyDown(e);
  };

  // Auto-focus search input when it appears
  useEffect(() => {
    if (showSearch && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showSearch]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const onMouseDown = (e) => {
      if (
        rowRef.current && !rowRef.current.contains(e.target) &&
        !dropdownRef.current?.contains(e.target)
      ) {
        clearSearch();
        if (!onClose) {
          setShowSearch(false);
          setExpanded(false);
        }
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [clearSearch, onClose]);

  const menuItems = [
    { key: 'stop', icon: 'push_pin', color: '#ff4d4f', label: t('itinerary.add_stop') || 'Add Stop' },
    { key: 'note', icon: 'description', color: '#8b5cf6', label: t('itinerary.add_note') || 'Add Note' },
    { key: 'list', icon: 'check', color: 'var(--md-sys-color-tertiary)', label: t('itinerary.add_list') || 'Add Checklist' },
    { key: 'transport', icon: 'flight', color: '#4FC3F7', label: t('itinerary.add_transport') || 'Add Transport' },
    { key: 'activity', icon: 'local_activity', color: '#26a69a', label: t('activity.add_activity') || 'Add Activity' },
  ];

  const handleItemClick = (key) => {
    if (key === 'stop') {
      setShowSearch(true);
    } else if (key === 'note') {
      onAddNote?.(dayId);
      setExpanded(false);
    } else if (key === 'list') {
      onAddList?.(dayId);
      setExpanded(false);
    } else if (key === 'transport') {
      onAddTransport?.(dayId);
      setExpanded(false);
    } else if (key === 'activity') {
      onAddActivity?.(dayId);
      setExpanded(false);
    }
  };

  // ── Inline insert mode (autoFocus + onClose) — always show search ──
  if (onClose) {
    return (
      <div style={{ position: 'relative', marginTop: '1rem' }}>
        {inHotelStay && <HotelLine />}
        <div
          ref={rowRef}
          className="location-search-container"
          style={{ paddingLeft: '2.25rem', display: 'flex', gap: '0.5rem' }}
        >
          <div style={{ flex: 1, position: 'relative' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '1rem', pointerEvents: 'none' }}>
              📍
            </span>
            <input
              ref={inputRef}
              type="text"
              className="location-search-input"
              style={{ paddingLeft: '2.8rem', background: 'var(--md-sys-color-surface-variant)', border: 'none' }}
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
                  <li key={p.place_id} className={focusIdx === idx ? 'selected' : ''} onMouseDown={(e) => { e.preventDefault(); selectPlace(p.place_id); }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface)' }}>{p.main_text}</div>
                    {p.secondary_text && <div style={{ fontSize: '0.75rem', color: 'var(--st-color-text-muted)', marginTop: '2px' }}>{p.secondary_text}</div>}
                  </li>
                ))}
                {isLoading && <li style={{ color: 'var(--st-color-text-muted)', fontSize: '0.85rem', cursor: 'default' }}>{t('common.loading') || 'Loading...'}</li>}
              </ul>,
              document.body
            )}
          </div>
          <button
            onClick={onClose}
            title={t('common.cancel') || 'Cancel'}
            style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'var(--md-sys-color-surface-variant)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--st-color-text-muted)', cursor: 'pointer', flexShrink: 0 }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>close</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Normal mode: + button with slide-out icons ──
  return (
    <div style={{ position: 'relative', marginTop: '1rem' }}>
      {inHotelStay && <HotelLine />}
      <div
        ref={rowRef}
        style={{ paddingLeft: '2.25rem', display: 'flex', alignItems: 'center', gap: 0 }}
      >
        {/* + button */}
        <button
          onClick={() => {
            if (expanded) {
              setExpanded(false);
              setShowSearch(false);
              clearSearch();
            } else {
              setExpanded(true);
            }
          }}
          style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            border: '1.5px solid rgba(255,255,255,0.15)',
            background: expanded ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)',
            color: 'var(--md-sys-color-on-surface)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            padding: 0,
            transition: 'transform 0.3s ease, background 0.2s',
            transform: expanded ? 'rotate(45deg)' : 'none',
            flexShrink: 0,
            zIndex: 2,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>add</span>
        </button>

        {/* Slide-out icon bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          overflow: 'hidden',
          maxWidth: (expanded && !showSearch) ? `${menuItems.length * 38}px` : '0px',
          opacity: (expanded && !showSearch) ? 1 : 0,
          transition: 'max-width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
          marginLeft: (expanded && !showSearch) ? '6px' : '0px',
        }}>
          {menuItems.map((item, idx) => (
            <button
              key={item.key}
              onClick={(e) => { e.stopPropagation(); handleItemClick(item.key); }}
              title={item.label}
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: 'none',
                background: 'rgba(255,255,255,0.06)',
                color: item.color,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
                transition: `transform 0.25s ease ${idx * 0.05}s, opacity 0.2s ease ${idx * 0.05}s`,
                transform: (expanded && !showSearch) ? 'scale(1)' : 'scale(0.3)',
                opacity: (expanded && !showSearch) ? 1 : 0,
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.18)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>{item.icon}</span>
            </button>
          ))}
        </div>

        {/* Search input — slides in when stop icon is clicked */}
        {showSearch && (
          <div style={{ flex: 1, position: 'relative', marginLeft: '8px', animation: 'fadeSlideIn 0.3s ease' }}>
            <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '1rem', pointerEvents: 'none' }}>
              📍
            </span>
            <input
              ref={inputRef}
              type="text"
              className="location-search-input"
              style={{ paddingLeft: '2.8rem', background: 'var(--md-sys-color-surface-variant)', border: 'none' }}
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
                  <li key={p.place_id} className={focusIdx === idx ? 'selected' : ''} onMouseDown={(e) => { e.preventDefault(); selectPlace(p.place_id); }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--md-sys-color-on-surface)' }}>{p.main_text}</div>
                    {p.secondary_text && <div style={{ fontSize: '0.75rem', color: 'var(--st-color-text-muted)', marginTop: '2px' }}>{p.secondary_text}</div>}
                  </li>
                ))}
                {isLoading && <li style={{ color: 'var(--st-color-text-muted)', fontSize: '0.85rem', cursor: 'default' }}>{t('common.loading') || 'Loading...'}</li>}
              </ul>,
              document.body
            )}
          </div>
        )}
      </div>
    </div>
  );
})
