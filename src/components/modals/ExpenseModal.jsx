import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../context/I18nContext';

const CATEGORIES = [
  { id: 'flight', label: 'Flight', icon: 'flight' },
  { id: 'stay', label: 'Stay', icon: 'bed' },
  { id: 'car_rental', label: 'Car Rental', icon: 'directions_car' },
  { id: 'transport', label: 'Transport', icon: 'train' },
  { id: 'dining', label: 'Dining', icon: 'restaurant' },
  { id: 'drinks', label: 'Drinks', icon: 'local_bar' },
  { id: 'sightseeing', label: 'Sightseeing', icon: 'account_balance' },
  { id: 'activities', label: 'Activities', icon: 'confirmation_number' },
  { id: 'shopping', label: 'Shopping', icon: 'shopping_bag' },
  { id: 'fuel', label: 'Fuel', icon: 'local_gas_station' },
  { id: 'groceries', label: 'Groceries', icon: 'shopping_cart' },
  { id: 'other', label: 'Other', icon: 'more_horiz' },
];

// Soft pastel accent per category
const CAT_COLORS = {
  flight: '#007AFF', stay: '#5856D6', car_rental: '#FF9500', transport: '#34C759',
  dining: '#FF3B30', drinks: '#AF52DE', sightseeing: '#FF2D55', activities: '#007AFF',
  shopping: '#FF9500', fuel: '#8E8E93', groceries: '#34C759', other: '#8E8E93',
};

export default function ExpenseModal({ stop, onSave, onDelete, onClose }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState(stop.price || '0');
  const [category, setCategory] = useState(stop.expenseCategory || 'activities');
  const [showCategories, setShowCategories] = useState(false);
  const [description, setDescription] = useState(stop.note || stop.location || '');
  const amountRef = useRef(null);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (amountRef.current) {
      amountRef.current.focus();
      amountRef.current.select();
    }
  }, []);

  const animateClose = (cb) => {
    setClosing(true);
    setTimeout(() => { cb?.(); onClose(); }, 260);
  };

  const handleSave = () => {
    animateClose(() => onSave?.({ price: amount, expenseCategory: category, note: description }));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.id === category) || CATEGORIES[7];
  const accent = CAT_COLORS[category] || '#007AFF';

  return (
    <div
      onClick={() => animateClose()}
      style={{
        position: 'fixed', inset: 0, zIndex: 2200,
        background: 'rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        animation: closing ? 'expFadeOut .25s ease forwards' : 'expFadeIn .25s ease forwards',
      }}
    >
      <style>{`
        @keyframes expFadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes expFadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes expSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
        @keyframes expSlideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
      `}</style>

      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%', maxWidth: 420,
          background: '#fff',
          borderRadius: '24px 24px 0 0',
          padding: '0 0 env(safe-area-inset-bottom, 16px) 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.12)',
          animation: closing ? 'expSlideDown .25s ease forwards' : 'expSlideUp .3s cubic-bezier(.32,1.15,.6,1) forwards',
          maxHeight: '92vh', overflowY: 'auto',
          WebkitOverflowScrolling: 'touch',
        }}
      >
        {/* ── Drag Handle ── */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#D1D1D6' }} />
        </div>

        {/* ── Amount Section ── */}
        <div style={{ padding: '8px 24px 20px', textAlign: 'center' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#8E8E93', marginBottom: 8, letterSpacing: 0.5 }}>
            EXPENSE
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
            <span style={{ fontSize: 28, fontWeight: 300, color: '#3C3C43' }}>$</span>
            <input
              ref={amountRef}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="0"
              style={{
                background: 'transparent', border: 'none', outline: 'none',
                fontSize: 48, fontWeight: 700, color: '#000',
                width: '160px', textAlign: 'center',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif',
              }}
            />
          </div>
        </div>

        {/* ── Category Pill ── */}
        <div style={{ padding: '0 20px 12px', display: 'flex', justifyContent: 'center' }}>
          <button
            onClick={() => setShowCategories(!showCategories)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '8px 18px', border: 'none', cursor: 'pointer',
              borderRadius: 20, background: `${accent}12`,
              transition: 'all 0.2s',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 18, color: accent }}>{selectedCategory.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: accent }}>{selectedCategory.label}</span>
            <span className="material-symbols-outlined" style={{ fontSize: 16, color: accent, opacity: 0.6 }}>
              {showCategories ? 'expand_less' : 'expand_more'}
            </span>
          </button>
        </div>

        {/* ── Category Grid (Expandable) ── */}
        <div style={{
          maxHeight: showCategories ? 220 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s cubic-bezier(.4,0,.2,1)',
        }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6,
            padding: '8px 20px 16px',
          }}>
            {CATEGORIES.map((cat) => {
              const isActive = category === cat.id;
              const catColor = CAT_COLORS[cat.id] || '#8E8E93';
              return (
                <button
                  key={cat.id}
                  onClick={() => { setCategory(cat.id); setShowCategories(false); }}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                    padding: '10px 2px 8px', border: 'none', cursor: 'pointer',
                    borderRadius: 14,
                    background: isActive ? `${catColor}14` : 'transparent',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{
                    width: 40, height: 40, borderRadius: 12,
                    background: isActive ? catColor : '#F2F2F7',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all 0.2s',
                    boxShadow: isActive ? `0 4px 12px ${catColor}40` : 'none',
                  }}>
                    <span className="material-symbols-outlined" style={{
                      fontSize: 20, color: isActive ? '#fff' : '#8E8E93',
                    }}>{cat.icon}</span>
                  </div>
                  <span style={{
                    fontSize: 10, fontWeight: 600, color: isActive ? catColor : '#8E8E93',
                    letterSpacing: 0.2,
                  }}>{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: '#F2F2F7', margin: '0 20px' }} />

        {/* ── Form Fields ── */}
        <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 2 }}>

          {/* Description */}
          <div style={{
            background: '#F9F9F9', borderRadius: 14, padding: '14px 16px',
            border: '1px solid #F2F2F7',
          }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#8E8E93', marginBottom: 6, letterSpacing: 0.3, textTransform: 'uppercase' }}>
              Note
            </div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={stop.name || 'Add a note...'}
              rows={2}
              style={{
                background: 'transparent', border: 'none', outline: 'none', resize: 'none',
                color: '#1C1C1E', fontSize: 15, fontWeight: 500, width: '100%',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", sans-serif',
                lineHeight: 1.4,
              }}
            />
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div style={{ padding: '8px 20px 16px', display: 'flex', gap: 10 }}>
          {onDelete && (
            <button
              onClick={() => animateClose(() => onDelete?.())}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '14px 0', border: 'none', cursor: 'pointer',
                borderRadius: 14, background: '#F2F2F7',
                fontSize: 15, fontWeight: 600, color: '#FF3B30',
                transition: 'background 0.2s',
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
              Delete
            </button>
          )}
          <button
            onClick={handleSave}
            style={{
              flex: 2, padding: '14px 0', border: 'none', cursor: 'pointer',
              borderRadius: 14, background: '#007AFF',
              fontSize: 15, fontWeight: 700, color: '#fff',
              boxShadow: '0 4px 14px rgba(0,122,255,0.3)',
              transition: 'all 0.2s',
            }}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
