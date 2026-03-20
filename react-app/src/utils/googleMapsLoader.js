export function loadGoogleMaps() {
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_KEY;
  if (!apiKey || apiKey.includes('VITE_GOOGLE_MAPS_KEY')) {
    console.error('VITE_GOOGLE_MAPS_KEY is missing or not replaced. Please check your Vercel Environment Variables.');
    return;
  }

  if (window.google && window.google.maps) {
    return;
  }

  // Define global callback
  window.initGoogleMaps = function() {
    window.googleMapsReady = true;
    if (window._dispatchGoogleMapsReady) {
      window._dispatchGoogleMapsReady();
    }
  };

  const script = document.createElement('script');
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry,marker,routes&callback=initGoogleMaps&loading=async`;
  script.async = true;
  script.defer = true;
  document.head.appendChild(script);
}
