import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { uploadToSupabase } from '../../utils/uploadHelpers';
import DestinationInput from '../climate/DestinationInput';
import ClimateCard from '../climate/ClimateCard';
import { useClimateData } from '../../hooks/useClimateData';

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
  const [linkDays, setLinkDays] = useState(true);
  const [showImageSection, setShowImageSection] = useState(false);
  const [destinations, setDestinations] = useState(trip.settings?.destinations || []);
  const debounceRef = useRef(null);
  const overlayRef = useRef(null);

  const { climateByCity, loading: climateLoading } = useClimateData(destinations, form.startDate, form.endDate);

  // ── Detect existing days_v2 records when date range changes ──
  useEffect(() => {
    if (!form.startDate || !form.endDate || !state.user) {
      setExistingDays([]);
      return;
    }
    if (form.startDate > form.endDate) {
      setExistingDays([]);
      return;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const { data, error } = await supabase
        .from('days_v2')
        .select('id, date, title')
        .eq('user_id', state.user.id)
        .gte('date', form.startDate)
        .lte('date', form.endDate)
        .order('date', { ascending: true });

      if (error || !data?.length) {
        setExistingDays([]);
        return;
      }

      if (!isNewTrip && trip?.id) {
        const { data: linked } = await supabase
          .from('trip_days')
          .select('day_id')
          .eq('trip_id', trip.id);
        const linkedIds = new Set((linked || []).map(r => r.day_id));
        setExistingDays(data.filter(d => !linkedIds.has(d.id)));
      } else {
        setExistingDays(data);
      }
    }, 400);

    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [form.startDate, form.endDate, state.user]);

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
      const dayIdsToLink = (linkDays && existingDays.length) ? existingDays.map(d => d.id) : [];
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

                  {/* ── Adventure Name ── */}
                  <div className="blossom-field">
                    <label className="blossom-label">
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

                  {/* ── Status ── */}
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

                  {/* ── Dates ── */}
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

                  {/* ── Destination Cities ── */}
                  <div className="blossom-field">
                    <label className="blossom-label">
                      <span className="material-symbols-outlined" style={{ fontSize: 16, verticalAlign: -3 }}>location_city</span>
                      {' '}{t('climate.destination_label') || 'Destination Cities'}
                    </label>
                    <DestinationInput
                      destinations={destinations}
                      onAdd={(dest) => setDestinations(prev => [...prev, dest])}
                      onRemove={(idx) => setDestinations(prev => prev.filter((_, i) => i !== idx))}
                    />
                  </div>

                  {/* ── Climate Preview ── */}
                  {destinations.length > 0 && form.startDate && form.endDate && form.startDate <= form.endDate && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                      {climateLoading ? (
                        <div style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-on-surface-variant)', padding: '0.5rem 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span className="material-symbols-outlined" style={{ fontSize: 16, animation: 'spin 1s linear infinite' }}>progress_activity</span>
                          {t('climate.loading') || 'Loading climate data...'}
                        </div>
                      ) : (
                        destinations.map(dest => (
                          climateByCity[dest.name] && (
                            <ClimateCard
                              key={dest.placeId || dest.name}
                              cityName={dest.name}
                              climateData={climateByCity[dest.name]}
                              compact
                            />
                          )
                        ))
                      )}
                    </div>
                  )}

                  {/* ── Existing days detection ── */}
                  {existingDays.length > 0 && (
                    <div className="blossom-days-alert">
                      <div className="blossom-days-alert-head">
                        <span className="material-symbols-outlined" style={{ fontSize: 18, color: 'var(--md-sys-color-secondary, #71563d)' }}>info</span>
                        <span className="blossom-days-alert-title">
                          {existingDays.length} {existingDays.length > 1 ? 'days' : 'day'} with existing check-in records
                        </span>
                      </div>
                      <div className="blossom-days-alert-dates">
                        {existingDays.map(d => d.date).join(', ')}
                      </div>
                      <label className="blossom-days-checkbox">
                        <input
                          type="checkbox"
                          checked={linkDays}
                          onChange={e => setLinkDays(e.target.checked)}
                        />
                        Link these {existingDays.length} days to this trip
                      </label>
                    </div>
                  )}

                  {/* ── Budget Currency ── */}
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

                  {/* ── Cover Image toggle ── */}
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

                  {/* ── Cover Image section (expandable) ── */}
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

                  {/* ── Action button ── */}
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

              {/* Inspiration card */}
              <div className="blossom-inspo-card">
                <div className="blossom-inspo-bg" />
                <div className="blossom-inspo-content">
                  <span className="blossom-inspo-tag">{t('common.inspiration') || 'Inspiration'}</span>
                  <h4 className="blossom-inspo-title">Tokyo Neon Dreams</h4>
                </div>
              </div>

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

/* ────────────────────────────────────────────────────────────
 *  Scoped CSS — Blossom Theme Modal
 * ──────────────────────────────────────────────────────────── */
const blossomModalCSS = `
  /* ── Blossom Token Overrides ── */
  .blossom-modal-overlay {
    --blossom-primary: #834b58;
    --blossom-primary-dim: #75404c;
    --blossom-primary-container: #feb6c4;
    --blossom-on-primary: #ffeff0;
    --blossom-secondary: #71563d;
    --blossom-secondary-container: #fed9b8;
    --blossom-tertiary: #b60d3d;
    --blossom-surface: #fbf5f5;
    --blossom-surface-container: #ede7e7;
    --blossom-surface-container-low: #f5efef;
    --blossom-surface-container-high: #e7e1e1;
    --blossom-surface-lowest: #ffffff;
    --blossom-on-surface: #302e2e;
    --blossom-on-surface-variant: #5e5b5b;
    --blossom-outline: #797676;
    --blossom-outline-variant: #b1acac;

    /* Remap M3 tokens so child components (ClimateCard, DestinationInput) use blossom palette */
    --md-sys-color-primary: #834b58;
    --md-sys-color-primary-container: #feb6c4;
    --md-sys-color-on-primary-container: #3b1520;
    --md-sys-color-secondary-container: #fed9b8;
    --md-sys-color-on-secondary-container: #3d2e1c;
    --md-sys-color-surface: #fbf5f5;
    --md-sys-color-surface-container: #ede7e7;
    --md-sys-color-surface-container-low: #f5efef;
    --md-sys-color-surface-container-lowest: #ffffff;
    --md-sys-color-on-surface: #302e2e;
    --md-sys-color-on-surface-variant: #5e5b5b;
    --md-sys-color-outline-variant: #b1acac;
    --blossom-radius: 1rem;
    --blossom-radius-lg: 2rem;
    --blossom-radius-xl: 3rem;
    --blossom-font-headline: 'Plus Jakarta Sans', 'Manrope', sans-serif;
    --blossom-font-body: 'Be Vietnam Pro', 'Inter', 'Noto Sans SC', sans-serif;
  }

  /* ── Overlay ── */
  .blossom-modal-overlay {
    position: fixed;
    inset: 0;
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(48, 46, 46, 0.45);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    opacity: 0;
    transition: opacity 0.35s ease;
    padding: 1rem;
  }
  .blossom-modal-overlay.blossom-modal-visible {
    opacity: 1;
  }

  /* ── Shell ── */
  .blossom-modal-shell {
    position: relative;
    width: 100%;
    max-width: 860px;
    max-height: 92vh;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--blossom-surface);
    border-radius: var(--blossom-radius-xl);
    box-shadow:
      0 24px 48px -12px rgba(131, 75, 88, 0.15),
      0 0 0 1px rgba(131, 75, 88, 0.06);
    transform: translateY(16px) scale(0.97);
    transition: transform 0.35s cubic-bezier(0.16, 1, 0.3, 1);
  }
  .blossom-modal-visible .blossom-modal-shell {
    transform: translateY(0) scale(1);
  }

  /* Scrollbar */
  .blossom-modal-shell::-webkit-scrollbar { width: 6px; }
  .blossom-modal-shell::-webkit-scrollbar-track { background: transparent; }
  .blossom-modal-shell::-webkit-scrollbar-thumb {
    background: var(--blossom-outline-variant);
    border-radius: 3px;
  }

  /* ── Close button ── */
  .blossom-close-btn {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 10;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    border: none;
    background: rgba(255, 255, 255, 0.7);
    backdrop-filter: blur(8px);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--blossom-on-surface);
    transition: all 0.2s;
    box-shadow: 0 2px 8px rgba(131, 75, 88, 0.1);
  }
  .blossom-close-btn:hover {
    background: var(--blossom-primary-container);
    color: var(--blossom-primary);
    transform: rotate(90deg);
  }

  /* ── Hero banner ── */
  .blossom-hero {
    position: relative;
    width: 100%;
    height: 180px;
    overflow: hidden;
    border-radius: var(--blossom-radius-xl) var(--blossom-radius-xl) 0 0;
    background:
      linear-gradient(135deg, #feb6c4 0%, #fce7f3 40%, #fbf5f5 100%);
  }
  .blossom-hero-gradient {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 20% 80%, rgba(131, 75, 88, 0.25) 0%, transparent 60%),
      radial-gradient(ellipse at 80% 20%, rgba(182, 13, 61, 0.12) 0%, transparent 50%);
  }
  .blossom-hero-content {
    position: absolute;
    bottom: 1.5rem;
    left: 2rem;
    right: 2rem;
  }
  .blossom-hero-title {
    font-family: var(--blossom-font-headline);
    font-size: 2rem;
    font-weight: 800;
    color: var(--blossom-primary);
    line-height: 1.1;
    margin: 0;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.6);
  }
  .blossom-hero-sub {
    font-family: var(--blossom-font-body);
    font-size: 0.9rem;
    color: var(--blossom-on-surface-variant);
    margin: 0.35rem 0 0;
    font-style: italic;
    font-weight: 500;
  }

  /* ── Body grid ── */
  .blossom-body {
    display: grid;
    grid-template-columns: 1fr 280px;
    gap: 1.25rem;
    padding: 1.5rem 2rem 2rem;
  }

  /* ── Main form card ── */
  .blossom-card {
    background: var(--blossom-surface-lowest);
    border-radius: var(--blossom-radius-lg);
    padding: 2rem;
    box-shadow: 0 4px 16px -4px rgba(131, 75, 88, 0.08);
  }
  .blossom-form-fields {
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
  }

  /* ── Edit mode title ── */
  .blossom-edit-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: var(--blossom-font-headline);
    font-size: 1.15rem;
    font-weight: 800;
    color: var(--blossom-primary);
    margin: 0;
  }

  /* ── Field ── */
  .blossom-field { display: flex; flex-direction: column; gap: 0.4rem; }

  .blossom-label {
    font-family: var(--blossom-font-body);
    font-size: 0.8rem;
    font-weight: 700;
    color: var(--blossom-primary);
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding-left: 2px;
  }

  /* ── Input ── */
  .blossom-input-wrap {
    position: relative;
  }
  .blossom-input {
    width: 100%;
    background: var(--blossom-surface-container-low);
    border: none;
    border-radius: 0.75rem;
    padding: 0.85rem 1rem;
    font-family: var(--blossom-font-body);
    font-size: 0.95rem;
    font-weight: 600;
    color: var(--blossom-on-surface);
    outline: none;
    transition: all 0.2s;
    box-sizing: border-box;
  }
  .blossom-input::placeholder {
    color: var(--blossom-outline-variant);
    font-weight: 400;
  }
  .blossom-input:focus {
    background: var(--blossom-surface-lowest);
    box-shadow: 0 0 0 2px var(--blossom-primary-container);
  }
  .blossom-input-wrap .blossom-input { padding-right: 2.5rem; }
  .blossom-input-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--blossom-outline-variant);
    font-size: 20px !important;
    pointer-events: none;
    transition: color 0.2s;
  }
  .blossom-input-wrap:focus-within .blossom-input-icon {
    color: var(--blossom-primary);
  }
  .blossom-date {
    color-scheme: light;
  }

  /* ── Status buttons ── */
  .blossom-status-group {
    display: flex;
    gap: 0.5rem;
  }
  .blossom-status-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    padding: 0.6rem 0.5rem;
    border-radius: var(--blossom-radius);
    border: 1.5px solid var(--blossom-surface-container-high);
    background: var(--blossom-surface-container-low);
    color: var(--blossom-on-surface-variant);
    font-family: var(--blossom-font-body);
    font-size: 0.8rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .blossom-status-btn:hover {
    border-color: var(--blossom-primary-container);
    background: rgba(254, 182, 196, 0.15);
  }
  .blossom-status-btn.active {
    background: var(--blossom-primary);
    border-color: var(--blossom-primary);
    color: var(--blossom-on-primary);
    box-shadow: 0 4px 12px rgba(131, 75, 88, 0.25);
  }

  /* ── Dates row ── */
  .blossom-dates-row { display: flex; gap: 1rem; }

  /* ── Existing days alert ── */
  .blossom-days-alert {
    padding: 0.85rem 1rem;
    border-radius: 0.75rem;
    background: rgba(254, 217, 184, 0.25);
    border: 1px solid rgba(113, 86, 61, 0.2);
  }
  .blossom-days-alert-head {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    margin-bottom: 0.3rem;
  }
  .blossom-days-alert-title {
    font-size: 0.82rem;
    font-weight: 700;
    color: var(--blossom-secondary);
  }
  .blossom-days-alert-dates {
    font-size: 0.75rem;
    color: var(--blossom-on-surface-variant);
    margin-bottom: 0.5rem;
  }
  .blossom-days-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.8rem;
    color: var(--blossom-on-surface);
    cursor: pointer;
  }
  .blossom-days-checkbox input[type="checkbox"] {
    accent-color: var(--blossom-secondary);
    width: 15px;
    height: 15px;
  }

  /* ── Currency buttons ── */
  .blossom-currency-group {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .blossom-currency-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.55rem 1rem;
    border-radius: 9999px;
    border: none;
    background: var(--blossom-surface-container-high);
    color: var(--blossom-primary);
    font-family: var(--blossom-font-body);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .blossom-currency-btn:hover {
    background: rgba(254, 182, 196, 0.3);
  }
  .blossom-currency-btn.active {
    background: var(--blossom-primary);
    color: var(--blossom-on-primary);
    font-weight: 700;
    box-shadow: 0 4px 12px rgba(131, 75, 88, 0.2);
    transform: scale(1.02);
  }
  .blossom-currency-btn:active { transform: scale(0.95); }

  /* ── Cover Image toggle ── */
  .blossom-image-toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    background: none;
    border: 1.5px dashed var(--blossom-outline-variant);
    border-radius: 0.75rem;
    padding: 0.7rem 1rem;
    color: var(--blossom-on-surface-variant);
    font-family: var(--blossom-font-body);
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
    width: 100%;
  }
  .blossom-image-toggle:hover {
    border-color: var(--blossom-primary);
    color: var(--blossom-primary);
    background: rgba(254, 182, 196, 0.08);
  }
  .blossom-thumb-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--blossom-tertiary);
    margin-left: auto;
  }

  /* ── Image section ── */
  .blossom-image-section {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .blossom-search-row {
    display: flex;
    gap: 0.5rem;
  }
  .blossom-search-btn {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0 1rem;
    border: none;
    border-radius: 0.75rem;
    background: var(--blossom-primary);
    color: var(--blossom-on-primary);
    font-family: var(--blossom-font-body);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }
  .blossom-search-btn:hover { opacity: 0.9; }
  .blossom-search-btn:active { transform: scale(0.96); }

  .blossom-upload-area {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.6rem;
    border: 1.5px dashed var(--blossom-outline-variant);
    border-radius: 0.75rem;
    color: var(--blossom-on-surface-variant);
    font-size: 0.82rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .blossom-upload-area:hover {
    border-color: var(--blossom-primary);
    color: var(--blossom-primary);
    background: rgba(254, 182, 196, 0.08);
  }

  .blossom-image-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    max-height: 160px;
    overflow-y: auto;
  }
  .blossom-image-thumb {
    height: 64px;
    border-radius: 0.5rem;
    background-size: cover;
    background-position: center;
    cursor: pointer;
    border: 2.5px solid transparent;
    transition: all 0.2s;
  }
  .blossom-image-thumb:hover { opacity: 0.85; transform: scale(1.03); }
  .blossom-image-thumb.selected {
    border-color: var(--blossom-primary);
    box-shadow: 0 0 0 2px rgba(131, 75, 88, 0.2);
  }

  /* ── Actions ── */
  .blossom-actions {
    display: flex;
    gap: 0.75rem;
    padding-top: 0.5rem;
  }
  .blossom-cancel-btn {
    padding: 0.7rem 1.5rem;
    border-radius: 9999px;
    border: 1.5px solid var(--blossom-outline-variant);
    background: transparent;
    color: var(--blossom-on-surface-variant);
    font-family: var(--blossom-font-body);
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }
  .blossom-cancel-btn:hover {
    background: var(--blossom-surface-container-low);
    border-color: var(--blossom-outline);
  }
  .blossom-cancel-btn:disabled { opacity: 0.5; cursor: not-allowed; }

  .blossom-magic-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.85rem 1.5rem;
    border: none;
    border-radius: 9999px;
    background: linear-gradient(135deg, var(--blossom-primary), var(--blossom-primary-dim));
    color: var(--blossom-on-primary);
    font-family: var(--blossom-font-headline);
    font-size: 1.05rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 8px 24px -4px rgba(131, 75, 88, 0.3);
    transition: all 0.25s;
  }
  .blossom-magic-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 28px -4px rgba(131, 75, 88, 0.4);
  }
  .blossom-magic-btn:active { transform: translateY(0); }
  .blossom-magic-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
  .blossom-magic-icon { transition: transform 0.3s; }
  .blossom-magic-btn:hover .blossom-magic-icon { transform: rotate(12deg); }

  /* ── Tips column ── */
  .blossom-tips-col {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .blossom-tips-card {
    background: rgba(254, 217, 184, 0.2);
    border: 1px solid rgba(254, 217, 184, 0.4);
    border-radius: var(--blossom-radius);
    padding: 1.25rem;
  }
  .blossom-tips-title {
    display: flex;
    align-items: center;
    gap: 0.4rem;
    font-family: var(--blossom-font-headline);
    font-size: 1rem;
    font-weight: 700;
    color: var(--blossom-secondary);
    margin: 0 0 0.75rem;
  }
  .blossom-tip-item {
    display: flex;
    gap: 0.6rem;
    margin-bottom: 0.75rem;
  }
  .blossom-tip-item:last-child { margin-bottom: 0; }
  .blossom-tip-icon {
    color: var(--blossom-secondary);
    font-size: 20px !important;
    flex-shrink: 0;
    margin-top: 1px;
  }
  .blossom-tip-item p {
    margin: 0;
    font-size: 0.8rem;
    line-height: 1.5;
    color: var(--blossom-on-surface-variant);
    font-weight: 500;
  }

  /* ── Inspiration card ── */
  .blossom-inspo-card {
    position: relative;
    height: 130px;
    border-radius: var(--blossom-radius);
    overflow: hidden;
    background:
      linear-gradient(135deg, rgba(131, 75, 88, 0.12), rgba(254, 182, 196, 0.2));
  }
  .blossom-inspo-bg {
    position: absolute;
    inset: 0;
    background:
      radial-gradient(circle at 70% 30%, rgba(182, 13, 61, 0.08) 0%, transparent 60%);
  }
  .blossom-inspo-content {
    position: relative;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    height: 100%;
    padding: 1rem;
  }
  .blossom-inspo-tag {
    font-size: 0.65rem;
    font-weight: 700;
    color: var(--blossom-primary);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    margin-bottom: 0.25rem;
  }
  .blossom-inspo-title {
    font-family: var(--blossom-font-headline);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--blossom-on-surface);
    margin: 0;
  }

  /* ── Stats card ── */
  .blossom-stats-card {
    background: var(--blossom-surface-container-low);
    border-radius: var(--blossom-radius);
    padding: 1rem 1.25rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }
  .blossom-stat-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .blossom-stat-label {
    flex: 1;
    font-size: 0.8rem;
    font-weight: 600;
    color: var(--blossom-on-surface-variant);
  }
  .blossom-stat-value {
    font-family: var(--blossom-font-headline);
    font-size: 0.85rem;
    font-weight: 700;
    color: var(--blossom-primary);
  }

  /* ── Responsive: collapse to single column ── */
  @media (max-width: 700px) {
    .blossom-modal-shell {
      max-width: 100%;
      max-height: 100vh;
      border-radius: var(--blossom-radius-lg);
    }
    .blossom-hero {
      height: 140px;
      border-radius: var(--blossom-radius-lg) var(--blossom-radius-lg) 0 0;
    }
    .blossom-hero-title { font-size: 1.5rem; }
    .blossom-body {
      grid-template-columns: 1fr;
      padding: 1rem 1.25rem 1.5rem;
      gap: 1rem;
    }
    .blossom-card { padding: 1.25rem; }
    .blossom-tips-col { display: none; }
    .blossom-dates-row { flex-direction: column; gap: 0.75rem; }
    .blossom-status-group { flex-wrap: wrap; }
  }
`;
