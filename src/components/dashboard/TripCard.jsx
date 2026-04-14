import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { useTrips } from '../../hooks/useTrips';
import { useTheme } from '../../theme';
import { calculateDays, formatCurrency, isCountableStop } from '../../utils/formatters';
import { getCompactStyleComponent } from './CompactCardStyles';

function getStatus(trip, t) {
  const today = new Date().toISOString().split('T')[0];
  if (trip.status) {
    const labels = { ongoing: t('common.ongoing'), planned: t('common.planned'), completed: t('common.completed') };
    const classes = { ongoing: 'status-ongoing', planned: 'status-planned', completed: 'status-completed' };
    return { label: labels[trip.status] || t('common.planned'), cls: classes[trip.status] || 'status-planned' };
  }
  if (!trip.startDate || !trip.endDate) return { label: t('common.planned'), cls: 'status-planned' };
  if (today >= trip.startDate && today <= trip.endDate) return { label: t('common.ongoing'), cls: 'status-ongoing' };
  if (today < trip.startDate) return { label: t('common.planned'), cls: 'status-planned' };
  return { label: t('common.completed'), cls: 'status-completed' };
}


export default function TripCard({ trip, isList = false, isCompact = false, onEdit, onShare }) {
  const { t } = useI18n();
  const { state } = useApp();
  const { deleteTrip } = useTrips();
  const { themeId, layoutVariant } = useTheme();
  const isBlossom = themeId === 'blossom' || (layoutVariant === 'clean' && themeId !== 'clean');
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const duration = (trip.startDate && trip.endDate) ? calculateDays(trip.startDate, trip.endDate) : 0;
  const status = getStatus(trip, t);
  const stopsCount = trip.stopsCount !== undefined
    ? trip.stopsCount
    : (trip.days ? trip.days.reduce((acc, day) => acc + (day.stops?.filter(isCountableStop).length || 0), 0) : 0);
  const totalCost = trip.totalCost !== undefined
    ? trip.totalCost
    : (trip.days ? trip.days.reduce((acc, day) => {
        return acc + (day.stops?.reduce((s, stop) => {
          const p = parseFloat(stop.price);
          return s + (isNaN(p) || p <= 0 ? 0 : p);
        }, 0) || 0);
      }, 0) : 0);

  const handleOpen = () => navigate(`/trip-v2/${trip.id}`);

  const handleDelete = async (e) => {
    e.stopPropagation();
    setMenuOpen(false);
    if (!confirm(t('itinerary.confirm_delete_trip') || 'Delete this trip?')) return;
    try {
      await deleteTrip(trip.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleMenuToggle = (e) => {
    e.stopPropagation();
    setMenuOpen(v => !v);
  };

  // ── Compact card mode — 调度到用户选中的样式组件 ──
  if (isCompact) {
    const StyleComp = getCompactStyleComponent(state.compactCardStyle);
    return (
      <StyleComp
        trip={trip}
        duration={duration}
        stopsCount={stopsCount}
        totalCost={totalCost}
        status={status}
        settings={state.settings}
        formatCurrency={formatCurrency}
        t={t}
        isBlossom={isBlossom}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        onOpen={handleOpen}
        onMenuToggle={handleMenuToggle}
        onEdit={onEdit}
        onShare={onShare}
        onDelete={handleDelete}
      />
    );
  }


  if (isList) {
    // 新方式：从 trip.settings.destinations 读取用户手动添加的城市（[{ name, lat, lng, ... }]）
    const cities = (trip.settings?.destinations || []).map(d => d.name);

    // 旧方式：从所有 stop 卡的 stop.city 字段推导出城市列表（在 useTripsV2.js normalizeTripRow 里计算）
    // 缺点：依赖 stop 数据是否填写了 city 字段，且无法反映用户的主观行程规划
    // const cities = trip.cities || [];

    // ── Blossom list card ──
    if (isBlossom) {
      return (
        <div
          className="trip-card-list"
          onClick={handleOpen}
          style={{
            position: 'relative',
            display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: '0.75rem',
            background: 'var(--md-sys-color-surface-container-lowest)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            borderRadius: '16px', padding: '0.75rem',
            transition: 'all 0.3s', cursor: 'pointer', marginBottom: '0.75rem',
          }}
        >
          {/* Menu dots — top right */}
          <div style={{ position: 'absolute', top: 'calc(0.5rem + 10px)', right: 'calc(0.5rem - 19px)' }}>
            <button className="menu-dots" onClick={handleMenuToggle} style={{
              background: 'rgba(131,75,88,0.08)', border: 'none', borderRadius: '50%',
              width: '28px', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--md-sys-color-primary)', cursor: 'pointer', fontSize: '16px',
            }}>⋮</button>
            {menuOpen && (
              <div className="menu-dropdown" style={{ right: 0, top: '2rem', transform: 'none', zIndex: 100, display: 'flex' }}>
                <button title={t('itinerary.edit_trip') || 'Edit Trip Info'} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit?.(trip); }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
                </button>
                <button title={t('itinerary.share_trip') || 'Share Journey'} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onShare?.(trip); }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>share</span>
                </button>
                <button className="danger" title={t('itinerary.delete_trip') || 'Delete Trip'} onClick={handleDelete}>
                  <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
                </button>
              </div>
            )}
          </div>

          {/* Thumbnail */}
          <div style={{ width: '100px', minHeight: '70px', alignSelf: 'stretch', borderRadius: '10px', background: 'var(--md-sys-color-surface-container)', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
            <img src={trip.thumb} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', position: 'relative', zIndex: 1 }} alt={trip.title} />
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0, paddingRight: '2rem', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <h4 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.title}</h4>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.8rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>calendar_today</span>
              {trip.startDate} - {trip.endDate}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px', color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.8rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>location_on</span>
              {stopsCount} {t('itinerary.stops_count')}
            </span>
            {cities.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {cities.map(city => (
                  <span key={city} style={{ fontSize: '0.68rem', padding: '1px 7px', borderRadius: '20px', background: 'var(--md-sys-color-surface-container-low)', color: 'var(--md-sys-color-on-surface-variant)', border: '1px solid var(--md-sys-color-outline-variant)', whiteSpace: 'nowrap' }}>
                    {city}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Bottom row: cost left, status right */}
          <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.25rem', borderTop: '1px solid var(--md-sys-color-outline-variant)' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {formatCurrency(totalCost, state.settings)}
            </div>
            <span className={`status-badge ${status.cls}`} style={{ position: 'static', padding: '3px 10px', borderRadius: '20px', fontSize: '0.68rem' }}>{status.label}</span>
          </div>
        </div>
      );
    }

    // ── Default list card (responsive) ──
    return (
      <div
        className="trip-card-list"
        onClick={handleOpen}
        style={{
          display: 'flex', alignItems: 'center', gap: '12px',
          background: 'var(--st-glass-bg)', border: '1px solid var(--md-sys-color-outline)',
          borderRadius: '16px', padding: '10px 12px',
          transition: 'all 0.3s', cursor: 'pointer', marginBottom: '0.5rem', position: 'relative',
        }}
      >
        {/* Thumbnail */}
        <div style={{ width: 56, height: 56, borderRadius: 12, background: '#000', overflow: 'hidden', position: 'relative', flexShrink: 0 }}>
          <img src={trip.thumb} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={trip.title} />
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <h4 style={{ fontSize: '0.95rem', fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{trip.title}</h4>
            <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface)', flexShrink: 0 }}>
              {formatCurrency(totalCost, state.settings)}
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--st-color-text-muted)', fontSize: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>calendar_today</span>
              {trip.startDate}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, color: 'var(--st-color-text-muted)', fontSize: '0.75rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: 13 }}>location_on</span>
              {stopsCount} {t('itinerary.stops_count')}
            </span>
            <span style={{ flex: 1 }} />
            <span className={`status-badge ${status.cls}`} style={{ position: 'static', padding: '2px 8px', borderRadius: 12, fontSize: '0.65rem', lineHeight: 1.4, flexShrink: 0 }}>{status.label}</span>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="trip-card" onClick={handleOpen} style={{ position: 'relative' }}>
      <div className="trip-thumb">
        <div className="thumb-blur-bg" style={{ backgroundImage: `url('${trip.thumb}')` }} />
        <img className="thumb-main-img" src={trip.thumb} loading="lazy" alt={trip.title} />
        <button className="menu-dots" onClick={handleMenuToggle} style={{ position: 'absolute', top: '1rem', right: '1rem', transform: 'none', background: 'rgba(0,0,0,0.2)', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', backdropFilter: 'blur(4px)', zIndex: 10 }}>⋮</button>
        {trip.share_token && (
          <div style={{ position: 'absolute', top: '1rem', left: '1rem', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(6px)', borderRadius: '20px', padding: '3px 10px', display: 'flex', alignItems: 'center', gap: '4px', color: '#a5f3fc', fontSize: '0.75rem', fontWeight: 600, zIndex: 10 }}>
            <span className="material-symbols-outlined" style={{ fontSize: '13px' }}>link</span>
            {t('share.shared') || 'Shared'}
          </div>
        )}
      </div>
      <div className="trip-content">
        {isBlossom ? (
          <>
            {/* Blossom: title only */}
            <h4 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>{trip.title}</h4>
            {/* Date + Days + Stops on same row */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ color: 'var(--md-sys-color-on-surface-variant)', fontSize: '0.85rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '6px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>calendar_today</span>
                {trip.startDate} - {trip.endDate}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>schedule</span>
                  {duration} {t('itinerary.days')}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--md-sys-color-primary)' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>location_on</span>
                  {stopsCount} {t('itinerary.stops_count')}
                </div>
              </div>
            </div>
            {/* Meta: cost left, status right */}
            <div className="trip-meta">
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--md-sys-color-on-surface-variant)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '2px' }}>{t('dashboard.total_expenses')}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>{formatCurrency(totalCost, state.settings)}</div>
              </div>
              <span className={`status-badge ${status.cls}`} style={{ position: 'static', padding: '4px 10px', borderRadius: '8px', backdropFilter: 'none', marginLeft: 'auto' }}>{status.label}</span>
            </div>
          </>
        ) : (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
              <h4 style={{ fontSize: '1.35rem', fontWeight: 800, letterSpacing: '-0.03em' }}>{trip.title}</h4>
              <div style={{ color: 'var(--md-sys-color-primary)', fontSize: '0.8rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', paddingTop: '4px' }}>
                <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>location_on</span>
                {stopsCount} {t('itinerary.stops_count')}
              </div>
            </div>
            <div style={{ color: 'var(--st-color-text-muted)', fontSize: '0.9rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>calendar_today</span>
              {trip.startDate} - {trip.endDate}
            </div>
            <div className="trip-meta">
              <div>
                <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--st-color-text-muted)', fontWeight: 800, letterSpacing: '0.08em', marginBottom: '2px' }}>{t('dashboard.total_expenses')}</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--md-sys-color-on-surface)' }}>{formatCurrency(totalCost, state.settings)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="meta-item" style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 10px', borderRadius: '8px' }}>
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>schedule</span>
                  {duration} {t('itinerary.days')}
                </div>
                <span className={`status-badge ${status.cls}`} style={{ position: 'static', padding: '4px 10px', borderRadius: '8px', backdropFilter: 'none' }}>{status.label}</span>
              </div>
            </div>
          </>
        )}
      </div>
      {menuOpen && (
        <div className="menu-dropdown" style={{ right: '1rem', top: '3.5rem', transform: 'none', display: 'flex', zIndex: 20 }}>
          <button title={t('itinerary.edit_trip') || 'Edit Trip Info'} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit?.(trip); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>edit</span>
          </button>
          <button title={t('itinerary.share_trip') || 'Share Journey'} onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onShare?.(trip); }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>share</span>
          </button>
          <button className="danger" title={t('itinerary.delete_trip') || 'Delete Trip'} onClick={handleDelete}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>delete</span>
          </button>
        </div>
      )}
    </div>
  );
}
