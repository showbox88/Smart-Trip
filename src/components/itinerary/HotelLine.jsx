/**
 * HotelLine — amber vertical line shown alongside cards during a hotel stay period.
 * Adjust color, width, or style here to affect all occurrences at once.
 */
export default function HotelLine({ top = '-1rem', bottom = '-1rem', color = '#f59e0b' }) {
  return (
    <div style={{
      position: 'absolute',
      left: 'var(--hotel-line-x)',
      top,
      bottom,
      width: '3px',
      background: color,
      zIndex: 1,
    }} />
  );
}
