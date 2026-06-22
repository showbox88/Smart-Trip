import { useState } from 'react';

// 轻量信息卡:搜索选中 / 点选 POI 共用。place = { name, vicinity, amap_poi_id, _gcj, types }
export default function AmapPlaceCard({ place, canAdd = true, onAdd, onClose }) {
  const [adding, setAdding] = useState(false);
  if (!place) return null;

  const handleAdd = async () => {
    if (!canAdd || adding) return;
    setAdding(true);
    try { await onAdd?.(place); }
    finally { setAdding(false); }
  };

  return (
    <div
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 210,
        background: 'var(--md-sys-color-surface)',
        borderTop: '1px solid var(--md-sys-color-outline)',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        padding: '1rem 1.25rem 1.25rem',
        animation: 'slideUp 0.25s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--md-sys-color-primary)', marginTop: '2px' }}>place</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {place.name}
          </div>
          {place.vicinity && (
            <div style={{ fontSize: '0.8rem', color: 'var(--st-color-text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {place.vicinity}
            </div>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--st-color-text-muted)', padding: '2px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
        </button>
      </div>

      <button
        onClick={handleAdd}
        disabled={!canAdd || adding}
        style={{
          width: '100%', marginTop: '0.9rem', padding: '11px', borderRadius: '12px', border: 'none',
          background: canAdd ? 'var(--md-sys-color-primary)' : 'rgba(255,255,255,0.07)',
          color: canAdd ? 'white' : 'var(--st-color-text-muted)',
          fontSize: '0.9rem', fontWeight: 700, cursor: canAdd ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}
      >
        {adding ? (
          <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
        ) : (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
        )}
        {canAdd ? '加入当天' : '请先进入某一天'}
      </button>
    </div>
  );
}
