import { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../../context/I18nContext';
import { amapTipToPlace } from '../../utils/amapPoi';

// 高德搜索框:AutoComplete 补全;选中(有坐标的)词条 → onSelect(place)
export default function AmapSearchBox({ onSelect, leftOffset = 15 }) {
  const { t } = useI18n();
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const acRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [tips, setTips] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.AMap && !acRef.current) {
      acRef.current = new window.AMap.AutoComplete({ city: '全国' });
    }
  }, []);

  const runSearch = useCallback((value) => {
    const ac = acRef.current;
    if (!ac) return;
    ac.search(value, (status, result) => {
      if (status === 'complete' && result.tips) {
        // 只保留有坐标的 POI 词条
        setTips(result.tips.filter((tp) => tp.location && tp.location.lng != null));
      } else {
        setTips([]);
      }
    });
  }, []);

  const handleChange = useCallback((value) => {
    setInputValue(value);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setTips([]); return; }
    debounceRef.current = setTimeout(() => runSearch(value.trim()), 220);
  }, [runSearch]);

  const handlePick = useCallback((tip) => {
    const place = amapTipToPlace(tip);
    if (!place) return;
    setInputValue(tip.name || '');
    setTips([]);
    setOpen(false);
    onSelect?.(place);
  }, [onSelect]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const bg = 'rgba(13,17,27,.85)';
  const textColor = '#fff';
  const muted = 'rgba(255,255,255,.5)';
  const divider = 'rgba(255,255,255,.08)';
  const shadow = '0 4px 20px rgba(0,0,0,.5)';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', top: '12px', left: leftOffset,
        width: `calc(100% - ${leftOffset + 100}px)`, maxWidth: '400px',
        zIndex: 120, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto',
      }}
    >
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder={t('map.search_placeholder') || '搜索地点…'}
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          style={{
            width: '100%', padding: '10px 38px 10px 36px',
            background: bg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: 'none', borderRadius: '12px', color: textColor, fontSize: '14px', outline: 'none', boxShadow: shadow,
          }}
        />
        <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: muted, fontSize: '18px' }}>search</span>
        {inputValue && (
          <button
            onMouseDown={(e) => { e.preventDefault(); setInputValue(''); setTips([]); setOpen(true); }}
            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', color: muted }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        )}
      </div>

      {open && tips.length > 0 && (
        <div style={{ background: bg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '12px', overflow: 'hidden', boxShadow: shadow, maxHeight: '50vh', overflowY: 'auto' }}>
          {tips.map((tip, idx) => (
            <button
              key={`${tip.id || tip.name}-${idx}`}
              onClick={() => handlePick(tip)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', width: '100%',
                padding: '11px 14px', background: 'none', border: 'none',
                borderBottom: idx < tips.length - 1 ? `1px solid ${divider}` : 'none',
                color: textColor, fontSize: '14px', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontWeight: 600 }}>{tip.name}</span>
              {tip.district && <span style={{ fontSize: '12px', color: muted }}>{tip.district}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
