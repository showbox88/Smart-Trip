// Visual hotel stay connection line rendered alongside stop cards
export default function HotelStayLine({ show, top = '0', bottom = '0', color = '#8b6b3b', stayId }) {
  if (!show) return null;
  return (
    <div
      data-stay-id={stayId}
      style={{
        position: 'absolute',
        left: '1.1rem',
        top,
        bottom,
        width: '3px',
        background: color,
        borderRadius: '2px',
        opacity: 0.7,
        transition: 'opacity 0.2s',
        zIndex: 0,
      }}
    />
  );
}
