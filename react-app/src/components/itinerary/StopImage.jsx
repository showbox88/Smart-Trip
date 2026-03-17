export default function StopImage({ photo, location, style = {} }) {
  if (!photo) return null;
  return (
    <div
      className="stop-thumb"
      style={{
        width: '100%',
        height: '140px',
        borderRadius: '0.75rem',
        overflow: 'hidden',
        marginBottom: '0.5rem',
        position: 'relative',
        background: '#000',
        ...style,
      }}
    >
      <img
        src={photo}
        alt={location || ''}
        loading="lazy"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        onError={e => { e.target.style.display = 'none'; }}
      />
    </div>
  );
}
