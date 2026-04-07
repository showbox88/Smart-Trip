import emergencyData from '../../data/emergencyNumbers.json';
import { getCountryCode } from '../../data/countryCodeMap';

/**
 * Tab 1: Emergency phone numbers for a given country.
 * One-tap calling via tel: links.
 */
export default function EmergencyNumbers({ countryName, countryCode: codeProp }) {
  const code = codeProp || getCountryCode(countryName);
  const data = code ? emergencyData[code] : null;

  if (!data) {
    return (
      <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--md-sys-color-on-surface-variant, #666)' }}>
        <span className="material-symbols-outlined" style={{ fontSize: 40, opacity: 0.4, display: 'block', marginBottom: 8 }}>help_center</span>
        <p style={{ fontSize: '0.85rem' }}>
          {countryName
            ? `No emergency data for "${countryName}"`
            : 'Select a country to view emergency numbers'}
        </p>
      </div>
    );
  }

  const services = [
    { key: 'police', icon: 'local_police', label: 'Police', labelZh: '报警', color: '#1565C0' },
    { key: 'ambulance', icon: 'emergency', label: 'Ambulance', labelZh: '急救', color: '#D32F2F' },
    { key: 'fire', icon: 'local_fire_department', label: 'Fire', labelZh: '消防', color: '#E65100' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {services.map(s => {
        const number = data[s.key];
        if (!number) return null;
        return (
          <a
            key={s.key}
            href={`tel:${number}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '1rem',
              padding: '1rem 1.25rem',
              background: `${s.color}10`,
              border: `1px solid ${s.color}30`,
              borderRadius: '1rem',
              textDecoration: 'none',
              color: 'inherit',
              transition: 'all 0.2s',
            }}
          >
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: s.color, color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span className="material-symbols-outlined" style={{ fontSize: 24 }}>{s.icon}</span>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--md-sys-color-on-surface-variant, #666)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                {s.label} / {s.labelZh}
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, letterSpacing: '0.05em' }}>
                {number}
              </div>
            </div>
            <span className="material-symbols-outlined" style={{ fontSize: 24, color: s.color, opacity: 0.6 }}>call</span>
          </a>
        );
      })}

      <p style={{
        fontSize: '0.72rem', color: 'var(--md-sys-color-on-surface-variant, #888)',
        textAlign: 'center', marginTop: '0.5rem', opacity: 0.7,
      }}>
        Tap to call directly
      </p>
    </div>
  );
}
