import { useState, useEffect, useRef } from 'react';
import { useI18n } from '../../context/I18nContext';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { uploadToSupabase } from '../../utils/uploadHelpers';

export default function TripEditModal({ trip, onSave, onClose, isCreating: isNewTrip = false }) {
  const { t } = useI18n();
  const { state } = useApp();
  const [form, setForm] = useState({
    title: trip.title || '',
    startDate: trip.startDate || '',
    endDate: trip.endDate || '',
    thumb: trip.thumb || '',
    status: trip.status || 'planned',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [existingDays, setExistingDays] = useState([]); // days_v2 records in date range
  const [linkDays, setLinkDays] = useState(true); // whether to link them
  const debounceRef = useRef(null);

  // Detect existing days_v2 records whenever date range changes
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

      // When editing an existing trip, exclude days already linked to it
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

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  // If thumb is an external search URL (not yet in Supabase), upload it first
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
      onSave?.({ ...form, thumb, _dayIdsToLink: dayIdsToLink });
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

  return (
    <div className="modal-overlay active" style={{ display: 'flex' }} onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '420px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800 }}>
            {isNewTrip ? (t('dashboard.new_trip') || 'New Trip') : (t('itinerary.edit_trip') || 'Edit Trip')}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--st-color-text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Title */}
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {t('dashboard.trip_title') || 'Trip Title'}
          </label>
          <input
            type="text"
            value={form.title}
            onChange={set('title')}
            placeholder={t('dashboard.new_trip_default_title')}
            style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Status */}
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {t('dashboard.stat_trips') || 'Status'}
          </label>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', border: '1px solid var(--md-sys-color-outline)', gap: '4px' }}>
            {['ongoing', 'planned', 'completed'].map(s => (
              <button
                key={s}
                onClick={() => setForm(f => ({ ...f, status: s }))}
                style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s',
                  background: form.status === s ? 'var(--md-sys-color-primary)' : 'transparent',
                  color: form.status === s ? '#fff' : 'var(--st-color-text-muted)',
                  fontWeight: 600
                }}
              >
                {t(`common.${s}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Dates */}
        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.2rem' }}>
          <div className="form-group" style={{ flex: 1 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
              {t('common.start_date') || 'Start Date'}
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={set('startDate')}
              style={{ width: '100%', padding: '0.8rem', background: 'var(--md-sys-color-surface-variant)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
              {t('common.end_date') || 'End Date'}
            </label>
            <input
              type="date"
              value={form.endDate}
              onChange={set('endDate')}
              style={{ width: '100%', padding: '0.8rem', background: 'var(--md-sys-color-surface-variant)', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Existing days_v2 detection */}
        {existingDays.length > 0 && (
          <div style={{
            marginBottom: '1.2rem',
            padding: '0.9rem 1rem',
            borderRadius: '10px',
            background: 'rgba(251, 191, 36, 0.08)',
            border: '1px solid rgba(251, 191, 36, 0.3)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px', color: '#fbbf24', flexShrink: 0, marginTop: '1px' }}>info</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: '#fbbf24', marginBottom: '0.3rem' }}>
                  检测到 {existingDays.length} 天已有打卡记录
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--md-sys-color-on-surface-variant)', marginBottom: '0.6rem' }}>
                  {existingDays.map(d => d.date).join('、')}
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.83rem', color: 'var(--md-sys-color-on-surface)' }}>
                  <input
                    type="checkbox"
                    checked={linkDays}
                    onChange={e => setLinkDays(e.target.checked)}
                    style={{ accentColor: '#fbbf24', width: '15px', height: '15px' }}
                  />
                  将这 {existingDays.length} 天归入此行程
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Thumbnail Search */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--md-sys-color-on-surface-variant)' }}>
            {t('stops.change_img') || 'Cover Image'}
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('common.search_placeholder')}
              style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--md-sys-color-outline)', borderRadius: '8px', color: 'var(--md-sys-color-on-surface)', outline: 'none' }}
            />
            <button
              onClick={handleSearch}
              className="btn-main"
              style={{ padding: '0 1rem', fontSize: '0.85rem' }}
            >
              {isSearching ? t('common.loading') : (t('common.search') || 'Search')}
            </button>
          </div>
          
          <div style={{ marginBottom: '0.8rem' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              gap: '8px', 
              padding: '0.6rem', 
              background: 'rgba(255,255,255,0.06)', 
              border: '1px dashed var(--md-sys-color-outline)', 
              borderRadius: '8px', 
              cursor: 'pointer',
              color: 'var(--md-sys-color-on-surface-variant)',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>upload</span>
              {t('stops.upload_local') || 'Upload Locally'}
              <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: 'none' }} />
            </label>
          </div>
          <div id="image-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', maxHeight: '200px', overflowY: 'auto', paddingRight: '4px' }}>
            {searchResults.map((url, i) => (
              <div
                key={i}
                className={`image-thumb-option ${form.thumb === url ? 'selected' : ''}`}
                onClick={() => setForm(f => ({ ...f, thumb: url }))}
                onDoubleClick={() => handleSave(url)}
                style={{
                  backgroundImage: `url('${url}')`,
                  height: '70px',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: form.thumb === url ? '2px solid var(--md-sys-color-primary)' : '2px solid transparent'
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            disabled={isSaving}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--md-sys-color-surface-variant)', border: '1px solid var(--md-sys-color-outline)', color: 'var(--md-sys-color-on-surface)', cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.5 : 1 }}
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            onClick={() => handleSave()}
            disabled={isSaving}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--md-sys-color-primary)', border: 'none', color: '#fff', cursor: isSaving ? 'not-allowed' : 'pointer', fontWeight: 600, opacity: isSaving ? 0.7 : 1 }}
          >
            {isSaving ? (t('common.loading') || 'Saving...') : (t('common.save') || 'Save')}
          </button>
        </div>
      </div>
    </div>
  );
}
