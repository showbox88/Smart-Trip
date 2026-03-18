import { useState } from 'react';
import { useI18n } from '../../context/I18nContext';
import { uploadToSupabase } from '../../utils/uploadHelpers';

export default function TripEditModal({ trip, onSave, onClose }) {
  const { t } = useI18n();
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

  const set = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  const handleSave = () => {
    onSave?.({ ...form });
    onClose?.();
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
            {t('itinerary.edit_trip') || 'Edit Trip Information'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
          </button>
        </div>

        {/* Title */}
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--text-secondary)' }}>
            {t('dashboard.trip_title') || 'Trip Title'}
          </label>
          <input
            type="text"
            value={form.title}
            onChange={set('title')}
            placeholder={t('dashboard.new_trip_default_title')}
            style={{ width: '100%', padding: '0.8rem', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box' }}
          />
        </div>

        {/* Status */}
        <div className="form-group" style={{ marginBottom: '1.2rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--text-secondary)' }}>
            {t('dashboard.stat_trips') || 'Status'}
          </label>
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', padding: '4px', borderRadius: '10px', border: '1px solid var(--glass-border)', gap: '4px' }}>
            {['ongoing', 'planned', 'completed'].map(s => (
              <button
                key={s}
                onClick={() => setForm(f => ({ ...f, status: s }))}
                style={{
                  flex: 1, padding: '8px', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '0.8rem', transition: 'all 0.2s',
                  background: form.status === s ? 'var(--accent-primary)' : 'transparent',
                  color: form.status === s ? '#fff' : 'var(--text-muted)',
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
            <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--text-secondary)' }}>
              {t('common.start_date') || 'Start Date'}
            </label>
            <input
              type="date"
              value={form.startDate}
              onChange={set('startDate')}
              style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
            />
          </div>
          <div className="form-group" style={{ flex: 1 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--text-secondary)' }}>
              {t('common.end_date') || 'End Date'}
            </label>
            <input
              type="date"
              value={form.endDate}
              onChange={set('endDate')}
              style={{ width: '100%', padding: '0.8rem', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none', boxSizing: 'border-box', colorScheme: 'dark' }}
            />
          </div>
        </div>

        {/* Thumbnail Search */}
        <div className="form-group" style={{ marginBottom: '1.5rem' }}>
          <label style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: '0.4rem', display: 'block', color: 'var(--text-secondary)' }}>
            {t('stops.change_img') || 'Cover Image'}
          </label>
          <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.8rem' }}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={t('common.search_placeholder')}
              style={{ flex: 1, padding: '0.8rem', background: 'transparent', border: '1px solid var(--glass-border)', borderRadius: '8px', color: 'var(--text-primary)', outline: 'none' }}
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
              border: '1px dashed var(--glass-border)', 
              borderRadius: '8px', 
              cursor: 'pointer',
              color: 'var(--text-secondary)',
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
                onDoubleClick={() => { onSave?.({ ...form, thumb: url }); onClose?.(); }}
                style={{
                  backgroundImage: `url('${url}')`,
                  height: '70px',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  border: form.thumb === url ? '2px solid var(--accent-primary)' : '2px solid transparent'
                }}
              />
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
          <button
            onClick={onClose}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--bg-secondary)', border: '1px solid var(--glass-border)', color: 'var(--text-primary)', cursor: 'pointer' }}
          >
            {t('common.cancel') || 'Cancel'}
          </button>
          <button
            onClick={handleSave}
            style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--accent-primary)', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}
          >
            {t('common.save') || 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
