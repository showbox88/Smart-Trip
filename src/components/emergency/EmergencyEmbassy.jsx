import embassyData from '../../data/embassies.json';
import { getCountryCode } from '../../data/countryCodeMap';

/**
 * Tab 3: Embassy / consulate info.
 * Shows the user's nationality embassy in the destination country.
 */
export default function EmergencyEmbassy({ countryName, countryCode: codeProp, nationality }) {
  const destCode = codeProp || getCountryCode(countryName);
  const natCode = getCountryCode(nationality) || nationality;

  // Find embassy
  const countryEmbassies = destCode ? embassyData[destCode] : null;
  const embassy = countryEmbassies && natCode ? countryEmbassies[natCode] : null;

  // List all available embassies for this destination
  const availableEmbassies = countryEmbassies ? Object.entries(countryEmbassies) : [];

  if (!destCode) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant, #666)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.4, display: 'block', marginBottom: 8 }}>account_balance</span>
        <p style={{ fontSize: '0.85rem' }}>Select a country to view embassy info</p>
      </div>
    );
  }

  if (!embassy && availableEmbassies.length === 0) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant, #666)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.4, display: 'block', marginBottom: 8 }}>account_balance</span>
        <p style={{ fontSize: '0.85rem' }}>No embassy data available for this country</p>
        <a
          href={`https://www.google.com/search?q=embassy+in+${encodeURIComponent(countryName || destCode)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            marginTop: '0.75rem', fontSize: '0.8rem', color: '#1565C0',
            textDecoration: 'none', fontWeight: 600,
          }}
        >
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>search</span>
          Search on Google
        </a>
      </div>
    );
  }

  const renderEmbassy = (emb, code, highlight = false) => (
    <div
      key={code}
      style={{
        padding: '1rem 1.25rem',
        background: highlight ? '#1565C010' : 'var(--md-sys-color-surface-container-low, #f5f5f5)',
        borderRadius: '1rem',
        border: highlight ? '1.5px solid #1565C040' : '1px solid transparent',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.65rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 20, color: '#1565C0' }}>account_balance</span>
        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--md-sys-color-on-surface, #333)' }}>
          {emb.name}
        </span>
      </div>

      {/* Address */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem', marginBottom: '0.5rem', fontSize: '0.8rem', color: 'var(--md-sys-color-on-surface-variant, #666)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 16, marginTop: 1 }}>location_on</span>
        <span>{emb.address}</span>
      </div>

      {/* Phones */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', marginBottom: '0.5rem' }}>
        {emb.phone && (
          <a href={`tel:${emb.phone}`} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.82rem', color: '#1565C0', textDecoration: 'none', fontWeight: 600,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>call</span>
            {emb.phone}
          </a>
        )}
        {emb.emergency && emb.emergency !== emb.phone && (
          <a href={`tel:${emb.emergency}`} style={{
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontSize: '0.82rem', color: '#D32F2F', textDecoration: 'none', fontWeight: 600,
          }}>
            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>sos</span>
            Emergency: {emb.emergency}
          </a>
        )}
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
        {emb.website && (
          <a
            href={emb.website}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
              background: 'var(--md-sys-color-surface-container, #e8e8e8)',
              color: 'var(--md-sys-color-on-surface-variant, #555)',
              fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>language</span>
            Website
          </a>
        )}
        {emb.lat && emb.lng && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${emb.lat},${emb.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.3rem',
              padding: '0.4rem 0.75rem', borderRadius: '0.5rem',
              background: 'var(--md-sys-color-surface-container, #e8e8e8)',
              color: 'var(--md-sys-color-on-surface-variant, #555)',
              fontSize: '0.72rem', fontWeight: 600, textDecoration: 'none',
            }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>map</span>
            Open in Maps
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {/* If user has nationality set and we found their embassy, show it first */}
      {embassy && (
        <>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant, #888)', textTransform: 'uppercase', letterSpacing: '0.04em', paddingLeft: 2 }}>
            Your Embassy
          </div>
          {renderEmbassy(embassy, natCode, true)}
        </>
      )}

      {/* Show other embassies */}
      {availableEmbassies.filter(([code]) => code !== natCode).length > 0 && (
        <>
          <div style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant, #888)', textTransform: 'uppercase', letterSpacing: '0.04em', paddingLeft: 2, marginTop: embassy ? '0.5rem' : 0 }}>
            {embassy ? 'Other Embassies' : 'Available Embassies'}
          </div>
          {availableEmbassies
            .filter(([code]) => code !== natCode)
            .map(([code, emb]) => renderEmbassy(emb, code, false))
          }
        </>
      )}

      {!natCode && (
        <p style={{
          fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant, #888)',
          textAlign: 'center', marginTop: '0.25rem', opacity: 0.7, fontStyle: 'italic',
        }}>
          Set your nationality in Settings to highlight your embassy
        </p>
      )}
    </div>
  );
}
