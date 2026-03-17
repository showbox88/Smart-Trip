import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import { formatCurrency } from '../../utils/formatters';
import StopImage from './StopImage';
import TransitInfo from './TransitInfo';

export default function StopCard({ 
  stop, dayId, dayColor, index, showTransit, 
  onDelete, onEdit, onToggleTransitMode, onOpenTimePicker, onOpenExpense,
  onAddStop, onAddNote, onAddList
}) {
  const { state, dispatch } = useApp();
  const { t } = useI18n();

  const isHotel = stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout';
  const typeLabel = stop.type === 'hotel_checkin'
    ? (t('itinerary.hotel_checkin') || 'Check-in')
    : stop.type === 'hotel_checkout'
    ? (t('itinerary.hotel_checkout') || 'Check-out')
    : null;

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(dayId, stop.id);
  };

  const handleEdit = (e) => {
    e.stopPropagation();
    onEdit?.(dayId, stop.id);
  };

  const handleTimeClick = (e) => {
    e.stopPropagation();
    onOpenTimePicker?.(dayId, stop.id);
  };

  const handleExpenseClick = (e) => {
    e.stopPropagation();
    onOpenExpense?.(dayId, stop.id);
  };

  return (
    <div className={`timeline-item id-${stop.id}`} style={{ position: 'relative', marginBottom: '0.75rem' }}>
      {/* Timeline Numbered Dot */}
      <div style={{ 
        position: 'absolute', 
        left: '0.75rem', 
        top: '1.7rem', 
        width: '8px', 
        height: '8px', 
        borderRadius: '50%', 
        background: dayColor || '#5b7a99', 
        zIndex: 2,
        boxShadow: `0 0 10px ${dayColor || '#5b7a99'}`
      }} />

      {/* Timeline line */}
      {showTransit && (
        <div style={{ position: 'absolute', left: '1.22rem', top: '2.5rem', bottom: '-0.5rem', width: '2px', background: `${dayColor || '#5b7a99'}40`, zIndex: 1 }} />
      )}

      {/* Card */}
      <div
        className="rich-stop-card"
        onClick={handleEdit}
        onMouseEnter={() => dispatch({ type: 'SET_HOVERED_STOP', payload: stop.id })}
        onMouseLeave={() => dispatch({ type: 'SET_HOVERED_STOP', payload: null })}
        style={{
          marginLeft: '2.2rem',
          background: state.hoveredStopId === stop.id ? 'rgba(255,255,255,0.04)' : '#0a0c10',
          border: '1px solid var(--glass-border)',
          borderColor: state.hoveredStopId === stop.id ? 'var(--accent-primary)' : 'rgba(255,255,255,0.05)',
          borderRadius: '1.2rem',
          padding: '1.2rem',
          cursor: 'pointer',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: state.hoveredStopId === stop.id ? 'translateX(4px)' : 'none',
          boxShadow: state.hoveredStopId === stop.id ? '0 20px 40px rgba(0,0,0,0.6)' : 'none',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100px'
        }}
      >
        {/* Delete button (Top Right) */}
        <button
          onClick={handleDelete}
          style={{ position: 'absolute', top: '0.6rem', right: '0.6rem', background: 'rgba(0,0,0,0.2)', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem', borderRadius: '50%', lineHeight: 1, fontSize: '1.1rem', zIndex: 5 }}
          title={t('common.delete') || 'Delete'}
        >
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>close</span>
        </button>

        {/* Layout: Main Info + Thumbnail */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
             {/* Hotel badge */}
            {isHotel && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(139,107,59,0.2)', border: '1px solid rgba(139,107,59,0.4)', borderRadius: '6px', padding: '2px 8px', fontSize: '0.75rem', color: '#c8a96e', marginBottom: '0.5rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>hotel</span>
                {typeLabel}
              </div>
            )}

            {/* Title Row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.3rem', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  position: 'relative',
                  width: '24px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0
                }}>
                  {/* Fill the hole in the center of location_on icon */}
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    background: dayColor || '#52c41a',
                    zIndex: 0
                  }} />
                  <span className="material-symbols-outlined" style={{ 
                    fontSize: '32px', 
                    color: dayColor || '#52c41a',
                    position: 'absolute',
                    fontVariationSettings: "'FILL' 1",
                    zIndex: 1
                  }}>location_on</span>
                  <span style={{ 
                    position: 'relative', 
                    color: 'white', 
                    fontSize: '0.75rem', 
                    fontWeight: 900,
                    marginTop: '-6px',
                    zIndex: 2
                  }}>{index + 1}</span>
                </div>
                <h4 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-bright)', letterSpacing: '-0.02em' }}>
                  {stop.location}
                </h4>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-secondary)', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '20px', border: '1px solid var(--glass-border)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '12px', color: '#ff4d4f' }}>location_on</span>
                {stop.category || t('map.place')}
              </div>
            </div>

            {/* Address */}
            {stop.address && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '0.8rem' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px', color: '#f97316' }}>near_me</span>
                <span style={{ opacity: 0.8 }}>{stop.address}</span>
              </div>
            )}
          </div>

          {/* Thumbnail (Right) */}
          {stop.photo && (
            <div style={{ width: '100px', height: '65px', borderRadius: '10px', overflow: 'hidden', flexShrink: 0, border: '1px solid var(--glass-border)', boxShadow: '0 4px 12px rgba(0,0,0,0.3)' }}>
              <img src={stop.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={stop.location} />
            </div>
          )}
        </div>

        {/* Note / Placeholder */}
        <div 
          style={{ 
            fontSize: '0.95rem', 
            color: stop.note ? 'var(--text-secondary)' : 'var(--text-muted)', 
            marginBottom: '1.2rem', 
            lineHeight: 1.5,
            padding: '4px 0',
            fontStyle: stop.note ? 'normal' : 'italic'
          }}
        >
          {stop.note || t('itinerary.add_note') || '点击添加备注...'}
        </div>

        {/* Bottom Actions: Time & Expense Chips */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginTop: 'auto' }}>
          {stop.time && (
            <div 
              className="stop-chip editable"
              onClick={handleTimeClick}
              style={{ 
                background: 'rgba(91, 122, 153, 0.15)', 
                color: '#9ebad6', 
                padding: '0.5rem 1rem', 
                borderRadius: '10px', 
                fontSize: '0.85rem', 
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(91, 122, 153, 0.2)',
                cursor: 'pointer'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>schedule</span>
              {stop.time} {stop.period}
            </div>
          )}

          <div 
            className="stop-chip editable"
            onClick={handleExpenseClick}
            style={{ 
              background: 'rgba(255, 255, 255, 0.05)', 
              color: 'var(--text-secondary)', 
              padding: '0.5rem 1rem', 
              borderRadius: '10px', 
              fontSize: '0.85rem', 
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              border: '1px solid var(--glass-border)',
              cursor: 'pointer'
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>payments</span>
            {stop.price && parseFloat(stop.price) > 0 
              ? formatCurrency(stop.price, state.settings) 
              : (t('itinerary.add_expense') || '添加消费')}
          </div>

          {stop.reservationTime && (
            <div 
              className="stop-chip"
              style={{ 
                background: 'rgba(34, 197, 94, 0.1)', 
                color: '#4ade80', 
                padding: '0.5rem 1rem', 
                borderRadius: '10px', 
                fontSize: '0.85rem', 
                fontWeight: 700,
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                border: '1px solid rgba(34, 197, 94, 0.2)'
              }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>event_available</span>
              {stop.reservationTime}
            </div>
          )}
        </div>
      </div>

      {/* Transit info */}
      {showTransit && stop.transitToNext && (
        <TransitInfo
          transit={stop.transitToNext}
          transitMode={stop.transitMode || 'DRIVE'}
          onToggleMode={() => onToggleTransitMode?.(dayId, stop.id)}
          onAddStop={() => onAddStop?.(dayId, stop.id)}
          onAddNote={() => onAddNote?.(dayId, stop.id)}
          onAddList={() => onAddList?.(dayId, stop.id)}
        />
      )}
    </div>
  );
}
