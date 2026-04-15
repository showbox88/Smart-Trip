/**
 * Shared style constants for the mobile iOS-style itinerary view.
 */

export const FONT = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";

export const HBTN = {
  position: 'absolute', background: 'rgba(0,0,0,.3)', border: 'none', borderRadius: '50%',
  width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', color: '#fff', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', zIndex: 10,
};

export const CHIP = {
  background: '#E8E8ED', color: '#3C3C43',
  padding: '2px 8px', borderRadius: 20,
  fontSize: 11, fontWeight: 500, lineHeight: '16px', whiteSpace: 'nowrap',
};

export const PILL = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 12px', borderRadius: 20,
  fontSize: 12, fontWeight: 500, color: '#3C3C43', whiteSpace: 'nowrap',
  margin: '0 8px',
};
