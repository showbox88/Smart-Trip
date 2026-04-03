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
  { id: 'other', label: 'Other', icon: 'menu' },
];

export default function ExpenseModal({ stop, onSave, onDelete, onClose }) {
  const { t } = useI18n();
  const [amount, setAmount] = useState(stop.price || '0.00');
  const [category, setCategory] = useState(stop.expenseCategory || 'activities');
  const [showCategories, setShowCategories] = useState(false);
  const [description, setDescription] = useState(stop.note || stop.location || '');
  const amountRef = useRef(null);

  useEffect(() => {
    if (amountRef.current) {
      amountRef.current.focus();
      amountRef.current.select();
    }
  }, []);

  const handleSave = () => {
    onSave?.({ price: amount, expenseCategory: category, note: description });
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  const selectedCategory = CATEGORIES.find(c => c.id === category) || CATEGORIES[7];

  return (
    <div className="modal-overlay active" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2200, background: 'rgba(0,0,0,0.85)' }} onClick={onClose}>
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()} 
        style={{ 
          width: '420px', 
          background: 'var(--md-sys-color-surface-container-lowest)', 
          borderRadius: '28px', 
          padding: '2rem',
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
          boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <button 
          onClick={onClose} 
          style={{ position: 'absolute', top: '1.2rem', right: '1.2rem', background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10 }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
        </button>

        <h3 style={{ textAlign: 'center', margin: '0 0 1.5rem 0', fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>
          Add Expense
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Amount Box */}
          <div style={{ background: '#11141b', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.9)' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 700 }}>$</span>
              <span className="material-symbols-outlined" style={{ fontSize: '14px', opacity: 0.5 }}>arrow_drop_down</span>
              <input
                ref={amountRef}
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onKeyDown={handleKeyDown}
                style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '1.3rem', fontWeight: 600, width: '120px', outline: 'none', marginLeft: '10px' }}
                placeholder="0.00"
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', opacity: 0.6 }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', cursor: 'pointer' }} onClick={() => setAmount(prev => (parseFloat(prev || 0) + 1).toFixed(2))}>unfold_more</span>
            </div>
          </div>

          {/* Category Selector */}
          <div 
            onClick={() => setShowCategories(!showCategories)}
            style={{ 
              background: '#11141b', 
              borderRadius: '14px', 
              border: '1px solid rgba(255,255,255,0.06)', 
              padding: '14px 16px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white' }}>{selectedCategory.icon}</span>
              </div>
              <span style={{ fontWeight: 700, color: 'white', fontSize: '1rem' }}>{selectedCategory.label}</span>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', opacity: 0.4 }}>{showCategories ? 'expand_less' : 'chevron_right'}</span>
          </div>

          {/* Expanded Categories Grid */}
          {showCategories && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', padding: '5px', background: 'rgba(255,255,255,0.02)', borderRadius: '14px' }}>
              {CATEGORIES.map((cat) => (
                <div 
                  key={cat.id} 
                  onClick={() => { setCategory(cat.id); setShowCategories(false); }}
                  style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center', 
                    gap: '6px', 
                    padding: '12px 0', 
                    borderRadius: '12px',
                    background: category === cat.id ? 'rgba(59,130,246,0.1)' : 'transparent',
                    border: category === cat.id ? '1px solid rgba(59,130,246,0.3)' : '1px solid transparent',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: category === cat.id ? 'var(--md-sys-color-primary)' : 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: category === cat.id ? '0 4px 10px rgba(59,130,246,0.4)' : 'none' }}>
                    <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'white' }}>{cat.icon}</span>
                  </div>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: category === cat.id ? 'var(--md-sys-color-primary)' : 'rgba(255,255,255,0.6)', textTransform: 'uppercase' }}>{cat.label}</span>
                </div>
              ))}
            </div>
          )}

          {/* Description Box */}
          <div style={{ background: '#11141b', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', padding: '16px', minHeight: '100px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 800, color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Add Description</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onKeyDown={handleKeyDown}
              style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '0.95rem', width: '100%', outline: 'none', resize: 'none', minHeight: '60px', fontFamily: 'inherit' }}
              placeholder="e.g. Lunch at restaurant"
            />
          </div>

          {/* Payer Selector (Static for now) */}
          <div style={{ background: '#11141b', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, color: 'white' }}>Payer</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--md-sys-color-primary)', overflow: 'hidden' }}>
                <img src="https://ui-avatars.com/api/?name=User&background=3b82f6&color=fff" style={{ width: '100%', height: '100%' }} />
              </div>
              <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>showbox88</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', opacity: 0.4 }}>arrow_drop_down</span>
            </div>
          </div>

          {/* Split Selector (Static for now) */}
          <div style={{ background: '#11141b', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.06)', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, color: 'white' }}>Split</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.4)' }}>No Split</span>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', opacity: 0.4 }}>arrow_drop_down</span>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem', fontWeight: 700 }}>
            <span>Date:</span>
            <span style={{ color: 'rgba(255,255,255,0.9)' }}>03/17</span>
            <span className="material-symbols-outlined" style={{ fontSize: '18px', opacity: 0.4 }}>arrow_drop_down</span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              onClick={() => onDelete?.()}
              style={{ background: 'rgba(51, 65, 85, 0.5)', border: 'none', borderRadius: '14px', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'rgba(255,255,255,0.8)' }}>delete</span>
              <span style={{ color: 'white', fontSize: '0.9rem', fontWeight: 700 }}>Delete</span>
            </button>
            <button
              onClick={handleSave}
              style={{ background: 'var(--md-sys-color-error)', border: 'none', borderRadius: '14px', padding: '10px 24px', color: 'white', fontSize: '1rem', fontWeight: 800, cursor: 'pointer', boxShadow: '0 8px 20px rgba(239, 68, 68, 0.3)' }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
