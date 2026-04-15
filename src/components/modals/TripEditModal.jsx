import { useState, useEffect, useRef, useCallback } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { uploadToSupabase } from '../../utils/uploadHelpers';
import DestinationInput from '../climate/DestinationInput';
import { useClimateData } from '../../hooks/useClimateData';
import { formatTemp } from '../../utils/formatters';
import { getClothingSuggestion } from '../../utils/climateApi';
import { blossomModalCSS } from './trip-edit/blossomModalCSS';

/* ────────────────────────────────────────────────────────────
 *  Blossom-themed Create / Edit Trip Modal
 *  Design reference: Sakura Trip HTML mockup
 *  - warm pink (#834b58) + rosy container (#feb6c4)
 *  - Plus Jakarta Sans headlines, Be Vietnam Pro body
 *  - large rounded corners, soft shadows
 *  - two-column layout (form + tips) on desktop
 * ──────────────────────────────────────────────────────────── */

const CURRENCIES = ['JPY', 'USD', 'EUR', 'GBP', 'CNY', 'TWD', 'KRW'];

export default function TripEditModal({ trip, onSave, onClose, isCreating: isNewTrip = false }) {
  const { t } = useI18n();
  const { state } = useApp();
  const [form, setForm] = useState({
    title: trip.title || '',
    startDate: trip.startDate || '',
    endDate: trip.endDate || '',
    thumb: trip.thumb || '',
    status: trip.status || 'planned',
    currency: trip.currency || 'JPY',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingDays, setExistingDays] = useState([]);
  const [linkDayIds, setLinkDayIds] = useState(new Set()); // 逐个选择要关联的 day
  const [showImageSection, setShowImageSection] = useState(false);
  const [destinations, setDestinations] = useState(trip.settings?.destinations || []);
  const [climateIdx, setClimateIdx] = useState(0);
  const [openSections, setOpenSections] = useState(() => {
    // On mobile only one section can be open; on desktop CSS ignores this.
    // Default to 'details' open.
    return new Set(['details']);
  });
  const debounceRef = useRef(null);
  const overlayRef = useRef(null);
  const climateTouchRef = useRef(null);

  // On mobile: exclusive accordion — open one, close all others
  // On desktop: openSections is ignored (CSS always shows body)
  const toggleSection = (key) => setOpenSections(prev => {
    if (prev.has(key)) {
      // closing the current one → nothing open
      return new Set();
    }
    // open only this one
    return new Set([key]);
  });

  const AccordionHeader = ({ id, icon, label }) => (
    <button className="blossom-accordion-header" onClick={() => toggleSection(id)}>
      <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
      <span style={{ flex: 1, textAlign: 'left' }}>{label}</span>
      <span className="material-symbols-outlined" style={{ fontSize: 18, transition: 'transform 0.2s ease', transform: openSections.has(id) ? 'rotate(180deg)' : 'none' }}>expand_more</span>
    </button>
  );

  const { climateByCity, loading: climateLoading } = useClimateData(destinations, form.startDate, form.endDate);

  // ── Swipe handlers for climate card (infinite loop) ──
  const handleClimateTouchStart = useCallback((e) => {
    climateTouchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY };
  }, []);

  const handleClimateTouchEnd = useCallback((e, count) => {
    if (!climateTouchRef.current || count <= 1) return;
    const deltaX = e.changedTouches[0].clientX - climateTouchRef.current.startX;
    const deltaY = e.changedTouches[0].clientY - climateTouchRef.current.startY;
    // Only trigger if horizontal swipe is dominant and > 30px
    if (Math.abs(deltaX) > 30 && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX < 0) {
        // swipe left → next (loop)
        setClimateIdx(prev => (prev + 1) % count);
      } else {
        // swipe right → prev (loop)
        setClimateIdx(prev => (prev - 1 + count) % count);
      }
    }
    climateTouchRef.current = null;
  }, []);

  // ── Reusable climate card renderer (used in both sidebar and mobile accordion) ──
  const renderClimateCard = () => {
    const climateDestinations = destinations.filter(d => climateByCity[d.name]);
    const hasClimate = climateDestinations.length > 0 && !climateLoading;
    const activeIdx = Math.min(climateIdx, climateDestinations.length - 1);
    const activeDest = hasClimate ? climateDestinations[Math.max(0, activeIdx)] : null;
    const activeData = activeDest ? climateByCity[activeDest.name] : null;

    if (!hasClimate) {
      if (climateLoading && destinations.length > 0) {
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0.5rem 0' }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 1s linear infinite', color: 'var(--blossom-primary)' }}>progress_activity</span>
            <span style={{ fontSize: '0.82rem', color: 'var(--blossom-on-surface-variant)' }}>{t('climate.loading') || 'Loading climate data...'}</span>
          </div>
        );
      }
      return null;
    }

    const { avgHigh, avgLow, avgPrecipMm, rainyDays } = activeData;
    const clothing = getClothingSuggestion(avgHigh, t);
    const cdCount = climateDestinations.length;

    return (
      <div
        style={{ padding: '0.75rem 0 0.25rem', touchAction: cdCount > 1 ? 'pan-y' : 'auto' }}
        onTouchStart={cdCount > 1 ? handleClimateTouchStart : undefined}
        onTouchEnd={cdCount > 1 ? (e) => handleClimateTouchEnd(e, cdCount) : undefined}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.55rem' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--blossom-primary)' }}>thermostat</span>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--blossom-on-surface)' }}>{activeDest.name}</span>
          {activeDest.country && <span style={{ fontSize: '0.72rem', color: 'var(--blossom-on-surface-variant)', fontWeight: 400 }}>, {activeDest.country}</span>}
          {cdCount > 1 && (
            <span style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--blossom-on-surface-variant)', opacity: 0.6 }}>
              {Math.max(0, activeIdx) + 1}/{cdCount}
            </span>
          )}
        </div>
        {/* Temperature */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.4rem' }}>
          <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{formatTemp(avgHigh, state.settings)}</span>
          <span style={{ fontSize: '0.82rem', color: 'var(--blossom-on-surface-variant)' }}>/</span>
          <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3b82f6' }}>{formatTemp(avgLow, state.settings)}</span>
        </div>
        {/* Precipitation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--blossom-on-surface-variant)', marginBottom: '0.4rem' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>water_drop</span>
            {avgPrecipMm}mm
          </span>
          {rainyDays > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>umbrella</span>
              ~{rainyDays}{t('climate.days_suffix') || 'd'}
            </span>
          )}
        </div>
        {/* Clothing */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.73rem', color: 'var(--blossom-on-surface-variant)' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>checkroom</span>
          {clothing}
        </div>
        {/* Dot indicators */}
        {cdCount > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '0.65rem' }}>
            {climateDestinations.map((d, i) => (
              <button
                key={d.placeId || d.name}
                onClick={() => setClimateIdx(i)}
                title={d.name}
                style={{
                  width: i === activeIdx ? '18px' : '8px',
                  height: '8px',
                  borderRadius: '4px',
                  border: 'none',
                  background: i === activeIdx ? 'var(--blossom-primary)' : 'rgba(131, 75, 88, 0.25)',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  // ── Detect existing days_v2 records when date range changes ──
  // 同时从 DB 查询和 state.days（内存）合并，确保不遗漏
  useEffect(() => {
    const userId = state.user?.id;
    if (!form.startDate || !form.endDate || !userId) {
      setExistingDays([]);
      return;
    }
    if (form.startDate > form.endDate) {
      setExistingDays([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      // 1) 从 DB 查询日期范围内的所有 day
      const { data, error } = await supabase
        .from('days_v2')
        .select('id, date, title, stops_data')
        .eq('user_id', userId)
        .gte('date', form.startDate)
        .lte('date', form.endDate)
        .order('date', { ascending: true });

      if (error) {
        console.warn('[TripEditModal] query days_v2 error:', error.message);
      }

      // 2) 把 DB 结果放进 Map，统一格式为 { id, date, title, stops }
      const dayMap = new Map();
      (data || []).forEach(d => {
        const stops = Array.isArray(d.stops_data) ? d.stops_data
                    : (typeof d.stops_data === 'string' ? (() => { try { return JSON.parse(d.stops_data); } catch { return []; } })() : []);
        dayMap.set(d.date, { id: d.id, date: d.date, title: d.title, stops });
      });

      // 3) 合并 state.days（内存，与日历同源）—— 覆盖 DB 数据以获取最新 stops
      if (state.days) {
        Object.values(state.days).forEach(d => {
          if (!d.date || d.date < form.startDate || d.date > form.endDate) return;
          if (d.user_id && d.user_id !== userId) return;
          const existing = dayMap.get(d.date);
          const memStops = Array.isArray(d.stops) ? d.stops : [];
          if (existing) {
            // 内存中 stops 更多时用内存的（更新更及时）
            if (memStops.length >= (existing.stops?.length || 0)) {
              existing.stops = memStops;
            }
          } else if (d.id) {
            dayMap.set(d.date, { id: d.id, date: d.date, title: d.title, stops: memStops });
          }
        });
      }

      // 4) 只保留有 stops 的 day
      let allDays = Array.from(dayMap.values())
        .filter(d => d.stops && d.stops.length > 0)
        .sort((a, b) => a.date.localeCompare(b.date));

      // 5) 编辑模式下排除已关联的 day
      if (!isNewTrip && trip?.id) {
        const { data: linked } = await supabase
          .from('trip_days')
          .select('day_id')
          .eq('trip_id', trip.id);
        const linkedIds = new Set((linked || []).map(r => r.day_id));
        allDays = allDays.filter(d => !linkedIds.has(d.id));
      }

      setExistingDays(allDays);
      setLinkDayIds(new Set(allDays.map(d => d.id)));

      // 发现已有行程时，自动展开日期区域
      if (allDays.length > 0) {
        setOpenSections(prev => new Set([...prev, 'dates']));
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.startDate, form.endDate, state.user?.id, state.days]); // state.days 变化时也重新扫描

  // ── Entrance animation ──
  useEffect(() => {
    requestAnimationFrame(() => {
      if (overlayRef.current) overlayRef.current.classList.add('blossom-modal-visible');
    });
  }, []);

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const resolveThumb = async (url) => {
    if (!url || !url.includes('loremflickr.com')) return url;
    const resp = await fetch(url);
    const blob = await resp.blob();
    const ext = blob.type.split('/')[1] || 'jpg';
    const file = new File([blob], `thumb.${ext}`, { type: blob.type });
    return uploadToSupabase(file);
  };

  const handleSave = async (thumbOverride) => {
    setIsSaving(true);
    try {
      const thumb = await resolveThumb(thumbOverride ?? form.thumb);
      const dayIdsToLink = linkDayIds.size > 0 ? [...linkDayIds] : [];
      onSave?.({ ...form, thumb, _dayIdsToLink: dayIdsToLink, _destinations: destinations });
      onClose?.();
    } catch (e) {
      console.error('[TripEditModal] save error:', e);
      alert(t('common.fetch_error') || 'Failed to save image');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearch = () => {
    if (!searchQuery) return;
    setIsSearching(true);
    const tags = searchQuery.split(/\s+/).join(',');
    const results = [];
    const timestamp = Date.now();
    for (let i = 1; i <= 9; i++) {
      results.push(`https://loremflickr.com/600/400/${encodeURIComponent(tags)}?lock=${i + 300}&t=${timestamp}`);
    }
    setSearchResults(results);
    setIsSearching(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const publicUrl = await uploadToSupabase(file);
      setForm(f => ({ ...f, thumb: publicUrl }));
      setSearchResults(prev => [publicUrl, ...prev.filter(u => u !== publicUrl)]);
    } catch (err) {
      console.error('[TripEditModal] Upload error:', err);
      alert(t('common.fetch_error') || 'Upload error');
    }
  };

  // ── Status config ──
  const statusConfig = {
    ongoing:   { icon: 'flight_takeoff', label: t('common.ongoing')   || 'Ongoing' },
    planned:   { icon: 'event_note',     label: t('common.planned')   || 'Planned' },
    completed: { icon: 'check_circle',   label: t('common.completed') || 'Completed' },
  };

  return (
    <>
      <style>{blossomModalCSS}</style>
      <div
        ref={overlayRef}
        className="blossom-modal-overlay"
        onClick={onClose}
      >
        <div className="blossom-modal-shell" onClick={e => e.stopPropagation()}>

          {/* ── Close button ── */}
          <button className="blossom-close-btn" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>

          {/* ── Hero banner (only in create mode) ── */}
          {isNewTrip && (
            <div className="blossom-hero">
              <div className="blossom-hero-gradient" />
              <div className="blossom-hero-content">
                <h2 className="blossom-hero-title">Start Your Dream</h2>
                <p className="blossom-hero-sub">Where will your heart wander next?</p>
              </div>
            </div>
          )}

          <div className="blossom-body">
            {/* ════════  LEFT: Main Form  ════════ */}
            <div className="blossom-form-col">
              <div className="blossom-card">
                <div className="blossom-form-fields">

                  {/* ── Title when editing ── */}
                  {!isNewTrip && (
                    <h3 className="blossom-edit-title">
                      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>edit</span>
                      {t('itinerary.edit_trip') || 'Edit Trip'}
                    </h3>
                  )}

                  {/* ═══ Section 1: Trip Details ═══ */}
                  <AccordionHeader id="details" icon="edit_note" label={isNewTrip ? 'Adventure Name' : (t('dashboard.trip_title') || 'Trip Details')} />
                  <div className={`blossom-accordion-body ${openSections.has('details') ? 'open' : ''}`}>
                    <div className="blossom-field">
                      <label className="blossom-label blossom-desktop-only">
                        {isNewTrip ? 'Adventure Name' : (t('dashboard.trip_title') || 'Trip Title')}
                      </label>
                      <div className="blossom-input-wrap">
                        <input
                          type="text"
                          className="blossom-input"
                          value={form.title}
                          onChange={set('title')}
                          placeholder={t('dashboard.new_trip_default_title') || 'e.g., Honeymoon in Hokkaido'}
                        />
                        <span className="material-symbols-outlined blossom-input-icon">auto_awesome</span>
                      </div>
                    </div>

                    <div className="blossom-field">
                      <label className="blossom-label">{t('dashboard.stat_trips') || 'Status'}</label>
                      <div className="blossom-status-group">
                        {Object.entries(statusConfig).map(([key, cfg]) => (
                          <button
                            key={key}
                            className={`blossom-status-btn ${form.status === key ? 'active' : ''}`}
                            onClick={() => setForm(f => ({ ...f, status: key }))}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{cfg.icon}</span>
                            {cfg.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* ═══ Section 2: Dates & Schedule ═══ */}
                  <AccordionHeader id="dates" icon="date_range" label={t('common.start_date') ? `${t('common.start_date')} & ${t('common.end_date')}` : 'Dates & Schedule'} />
                  <div className={`blossom-accordion-body ${openSections.has('dates') ? 'open' : ''}`}>
                    <div className="blossom-dates-row">
                      <div className="blossom-field" style={{ flex: 1 }}>
                        <label className="blossom-label">{t('common.start_date') || 'Start Date'}</label>
                        <input
                          type="date"
                          className="blossom-input blossom-date"
                          value={form.startDate}
                          onChange={set('startDate')}
                        />
                      </div>
                      <div className="blossom-field" style={{ flex: 1 }}>
                        <label className="blossom-label">{t('common.end_date') || 'End Date'}</label>
                        <input
                          type="date"
                          className="blossom-input blossom-date"
                          value={form.endDate}
                          onChange={set('endDate')}
                        />
                      </div>
                    </div>

                    {existingDays.length > 0 && (
                      <div className="blossom-days-alert">
                        <div className="blossom-days-alert-head">
                          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--md-sys-color-secondary, #71563d)' }}>info</span>
                          <span className="blossom-days-alert-title">
                            {existingDays.length} {existingDays.length > 1 ? 'days' : 'day'} with existing check-in records
                          </span>
                        </div>
                        {/* 全选/取消全选 */}
                        <label className="blossom-days-checkbox" style={{ marginBottom: '0.5rem', fontWeight: 600 }}>
                          <input
                            type="checkbox"
                            checked={linkDayIds.size === existingDays.length}
                            onChange={e => {
                              if (e.target.checked) {
                                setLinkDayIds(new Set(existingDays.map(d => d.id)));
                              } else {
                                setLinkDayIds(new Set());
                              }
                            }}
                          />
                          {linkDayIds.size === existingDays.length ? 'Deselect All' : 'Select All'}
                        </label>
                        {/* 逐个 day 列表 */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                          {existingDays.map(d => {
                            const stopCount = Array.isArray(d.stops) ? d.stops.length : 0;
                            const stopNames = (d.stops || []).slice(0, 3).map(s => s.location || s.title || s.name || '').filter(Boolean);
                            return (
                              <label key={d.id} className="blossom-days-checkbox" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <input
                                  type="checkbox"
                                  checked={linkDayIds.has(d.id)}
                                  onChange={e => {
                                    setLinkDayIds(prev => {
                                      const next = new Set(prev);
                                      if (e.target.checked) next.add(d.id);
                                      else next.delete(d.id);
                                      return next;
                                    });
                                  }}
                                />
                                <span style={{ fontWeight: 600, minWidth: '5.5em' }}>{d.date}</span>
                                <span style={{ fontSize: '0.82rem', color: 'var(--st-color-text-muted)' }}>
                                  {stopCount} {stopCount === 1 ? 'stop' : 'stops'}
                                  {stopNames.length > 0 && ` · ${stopNames.join(', ')}${stopCount > 3 ? '…' : ''}`}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* ═══ Section 3: Destinations & Climate ═══ */}
                  <AccordionHeader id="destinations" icon="location_city" label={t('climate.destination_label') || 'Destinations & Climate'} />
                  <div className={`blossom-accordion-body ${openSections.has('destinations') ? 'open' : ''}`}>
                    <div className="blossom-field">
                      <label className="blossom-label blossom-desktop-only">
                        <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: -3 }}>location_city</span>
                        {' '}{t('climate.destination_label') || 'Destination Cities'}
                      </label>
                      <DestinationInput
                        destinations={destinations}
                        onAdd={(dest) => setDestinations(prev => [...prev, dest])}
                        onRemove={(idx) => setDestinations(prev => prev.filter((_, i) => i !== idx))}
                      />
                    </div>

                    {/* Mobile-only climate card (same as right sidebar) */}
                    <div className="blossom-mobile-only">
                      {renderClimateCard()}
                    </div>
                  </div>

                  {/* ═══ Section 4: Budget & Cover ═══ */}
                  <AccordionHeader id="budget" icon="payments" label={t('itinerary.settings_currency') || 'Budget & Cover'} />
                  <div className={`blossom-accordion-body ${openSections.has('budget') ? 'open' : ''}`}>
                    <div className="blossom-field">
                      <label className="blossom-label">{t('itinerary.settings_currency') || 'Budget Currency'}</label>
                      <div className="blossom-currency-group">
                        {CURRENCIES.map(c => (
                          <button
                            key={c}
                            className={`blossom-currency-btn ${form.currency === c ? 'active' : ''}`}
                            onClick={() => setForm(f => ({ ...f, currency: c }))}
                          >
                            {form.currency === c && (
                              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>payments</span>
                            )}
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="blossom-field">
                      <button
                        className="blossom-image-toggle"
                        onClick={() => setShowImageSection(!showImageSection)}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 18 }}>
                          {showImageSection ? 'expand_less' : 'add_photo_alternate'}
                        </span>
                        <span>{t('stops.change_img') || 'Cover Image'}</span>
                        {form.thumb && <span className="blossom-thumb-dot" />}
                      </button>
                    </div>

                    {showImageSection && (
                      <div className="blossom-image-section">
                        <div className="blossom-search-row">
                          <input
                            type="text"
                            className="blossom-input"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder={t('common.search_placeholder') || 'Search...'}
                            style={{ flex: 1 }}
                          />
                          <button className="blossom-search-btn" onClick={handleSearch}>
                            <span className="material-symbols-outlined" style={{ fontSize: 18 }}>search</span>
                            {isSearching ? '...' : (t('common.search') || 'Search')}
                          </button>
                        </div>

                        <label className="blossom-upload-area">
                          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>upload</span>
                          {t('stops.upload_local') || 'Upload Locally'}
                          <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
                        </label>

                        {searchResults.length > 0 && (
                          <div className="blossom-image-grid">
                            {searchResults.map((url, i) => (
                              <div
                                key={i}
                                className={`blossom-image-thumb ${form.thumb === url ? 'selected' : ''}`}
                                onClick={() => setForm(f => ({ ...f, thumb: url }))}
                                onDoubleClick={() => handleSave(url)}
                                style={{ backgroundImage: `url('${url}')` }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* ═══ Section 5: Trip Tips & Stats (mobile only) ═══ */}
                  <div className="blossom-mobile-only">
                    <AccordionHeader id="tips" icon="lightbulb" label="Trip Tips & Stats" />
                    <div className={`blossom-accordion-body ${openSections.has('tips') ? 'open' : ''}`}>
                      <div className="blossom-tip-item">
                        <span className="material-symbols-outlined blossom-tip-icon">tips_and_updates</span>
                        <p>Sakura peaks vary by region! Plan for late March in Tokyo.</p>
                      </div>
                      <div className="blossom-tip-item">
                        <span className="material-symbols-outlined blossom-tip-icon">wb_sunny</span>
                        <p>Spring evenings can be crisp. Pack a light cardigan.</p>
                      </div>
                      <div className="blossom-tip-item">
                        <span className="material-symbols-outlined blossom-tip-icon">restaurant</span>
                        <p>Try seasonal sakura-flavored treats at convenience stores!</p>
                      </div>
                      <div style={{ marginTop: '0.75rem' }}>
                        <div className="blossom-stat-row">
                          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--blossom-primary)' }}>favorite</span>
                          <span className="blossom-stat-label">Saved Places</span>
                          <span className="blossom-stat-value">--</span>
                        </div>
                        <div className="blossom-stat-row" style={{ marginTop: '0.5rem' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--blossom-primary)' }}>route</span>
                          <span className="blossom-stat-label">Total Trips</span>
                          <span className="blossom-stat-value">--</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* ── Action buttons (always visible, outside accordion) ── */}
                  <div className="blossom-actions">
                    {!isNewTrip && (
                      <button
                        className="blossom-cancel-btn"
                        onClick={onClose}
                        disabled={isSaving}
                      >
                        {t('common.cancel') || 'Cancel'}
                      </button>
                    )}
                    <button
                      className="blossom-magic-btn"
                      onClick={() => handleSave()}
                      disabled={isSaving}
                    >
                      <span className="material-symbols-outlined blossom-magic-icon">
                        {isNewTrip ? 'magic_button' : 'check'}
                      </span>
                      {isSaving
                        ? (t('common.loading') || 'Saving...')
                        : isNewTrip
                          ? 'Magic Create'
                          : (t('common.save') || 'Save')
                      }
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* ════════  RIGHT: Tips sidebar  ════════ */}
            <div className="blossom-tips-col">
              {/* Trip Tips */}
              <div className="blossom-tips-card">
                <h3 className="blossom-tips-title">
                  <span className="material-symbols-outlined" style={{ fontSize: 20 }}>lightbulb</span>
                  Trip Tips
                </h3>
                <div className="blossom-tip-item">
                  <span className="material-symbols-outlined blossom-tip-icon">tips_and_updates</span>
                  <p>Sakura peaks vary by region! Plan for late March in Tokyo.</p>
                </div>
                <div className="blossom-tip-item">
                  <span className="material-symbols-outlined blossom-tip-icon">wb_sunny</span>
                  <p>Spring evenings can be crisp. Pack a light cardigan.</p>
                </div>
                <div className="blossom-tip-item">
                  <span className="material-symbols-outlined blossom-tip-icon">restaurant</span>
                  <p>Try seasonal sakura-flavored treats at convenience stores!</p>
                </div>
              </div>

              {/* Inspiration / Climate card */}
              {(() => {
                const climateDestinations = destinations.filter(d => climateByCity[d.name]);
                const hasClimate = climateDestinations.length > 0 && !climateLoading;
                const activeIdx = Math.min(climateIdx, climateDestinations.length - 1);
                const activeDest = hasClimate ? climateDestinations[Math.max(0, activeIdx)] : null;
                const activeData = activeDest ? climateByCity[activeDest.name] : null;

                if (!hasClimate) {
                  // Fallback: original inspiration card
                  return (
                    <div className="blossom-inspo-card">
                      <div className="blossom-inspo-bg" />
                      <div className="blossom-inspo-content">
                        {climateLoading && destinations.length > 0 ? (
                          <>
                            <span className="blossom-inspo-tag">{t('climate.title') || 'Climate'}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 1s linear infinite', color: 'var(--blossom-primary)' }}>progress_activity</span>
                              <h4 className="blossom-inspo-title" style={{ fontSize: '0.82rem' }}>{t('climate.loading') || 'Loading climate data...'}</h4>
                            </div>
                          </>
                        ) : (
                          <>
                            <span className="blossom-inspo-tag">{t('common.inspiration') || 'Inspiration'}</span>
                            <h4 className="blossom-inspo-title">Tokyo Neon Dreams</h4>
                          </>
                        )}
                      </div>
                    </div>
                  );
                }

                const { avgHigh, avgLow, avgPrecipMm, rainyDays } = activeData;
                const clothing = getClothingSuggestion(avgHigh, t);

                return (
                  <div className="blossom-inspo-card" style={{ height: 'auto', minHeight: '130px', padding: 0 }}>
                    <div className="blossom-inspo-bg" />
                    <div style={{ position: 'relative', zIndex: 1, padding: '0.85rem 1rem 0.7rem' }}>
                      {/* Header */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '0.55rem' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '18px', color: 'var(--blossom-primary)' }}>thermostat</span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--blossom-on-surface)' }}>{activeDest.name}</span>
                        {activeDest.country && <span style={{ fontSize: '0.72rem', color: 'var(--blossom-on-surface-variant)', fontWeight: 400 }}>, {activeDest.country}</span>}
                      </div>

                      {/* Temperature */}
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.4rem' }}>
                        <span style={{ fontSize: '1.4rem', fontWeight: 800, color: '#ef4444' }}>{formatTemp(avgHigh, state.settings)}</span>
                        <span style={{ fontSize: '0.82rem', color: 'var(--blossom-on-surface-variant)' }}>/</span>
                        <span style={{ fontSize: '1.1rem', fontWeight: 700, color: '#3b82f6' }}>{formatTemp(avgLow, state.settings)}</span>
                      </div>

                      {/* Precipitation + rain days */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.75rem', color: 'var(--blossom-on-surface-variant)', marginBottom: '0.4rem' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>water_drop</span>
                          {avgPrecipMm}mm
                        </span>
                        {rainyDays > 0 && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>umbrella</span>
                            ~{rainyDays}{t('climate.days_suffix') || 'd'}
                          </span>
                        )}
                      </div>

                      {/* Clothing */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.73rem', color: 'var(--blossom-on-surface-variant)' }}>
                        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>checkroom</span>
                        {clothing}
                      </div>

                      {/* Dot indicators */}
                      {climateDestinations.length > 1 && (
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '0.65rem' }}>
                          {climateDestinations.map((d, i) => (
                            <button
                              key={d.placeId || d.name}
                              onClick={() => setClimateIdx(i)}
                              title={d.name}
                              style={{
                                width: i === activeIdx ? '18px' : '8px',
                                height: '8px',
                                borderRadius: '4px',
                                border: 'none',
                                background: i === activeIdx ? 'var(--blossom-primary)' : 'rgba(131, 75, 88, 0.25)',
                                cursor: 'pointer',
                                padding: 0,
                                transition: 'all 0.3s ease',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* Quick stats placeholder */}
              <div className="blossom-stats-card">
                <div className="blossom-stat-row">
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--blossom-primary)' }}>favorite</span>
                  <span className="blossom-stat-label">Saved Places</span>
                  <span className="blossom-stat-value">--</span>
                </div>
                <div className="blossom-stat-row">
                  <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--blossom-primary)' }}>route</span>
                  <span className="blossom-stat-label">Total Trips</span>
                  <span className="blossom-stat-value">--</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

