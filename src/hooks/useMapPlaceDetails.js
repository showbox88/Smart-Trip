import { useEffect, useMemo, useState } from 'react';

function getMatchedStop(trip, placeId) {
  return trip?.days?.flatMap((day) => day.stops).find((stop) => stop.placeId === placeId) || null;
}

function getAddedDays(trip, placeId) {
  const days = new Set();
  if (!trip || !placeId) return days;

  trip.days.forEach((day) => {
    if (day.stops.some((stop) => stop.placeId === placeId)) {
      days.add(day.id);
    }
  });

  return days;
}

async function getStreetViewFallbackPhoto(place) {
  const mapsApi = globalThis.google;
  const lat = place?.location?.lat?.();
  const lng = place?.location?.lng?.();
  if (!mapsApi || !lat || !lng) return null;

  try {
    const service = new mapsApi.maps.StreetViewService();
    const result = await service.getPanorama({
      location: { lat: Number(lat), lng: Number(lng) },
      radius: 100,
    });
    const pano = result?.data?.location?.pano;
    if (!pano) return null;
    const yaw = result?.data?.tiles?.centerHeading ?? 0;
    return `https://streetviewpixels-pa.googleapis.com/v1/thumbnail?panoid=${pano}&cb_client=search.gws-prod.gps&w=680&h=420&yaw=${yaw}&pitch=0&thumbfov=100`;
  } catch {
    return null;
  }
}

export function useMapPlaceDetails(trip, placeId) {
  const [place, setPlace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [fallbackPhotoUrl, setFallbackPhotoUrl] = useState('');

  const matchedStop = useMemo(() => getMatchedStop(trip, placeId), [trip, placeId]);
  const addedDays = useMemo(() => getAddedDays(trip, placeId), [trip, placeId]);

  useEffect(() => {
    const mapsApi = globalThis.google;
    if (!placeId || !mapsApi) return;

    let cancelled = false;
    setLoading(true);
    setPlace(null);
    setFallbackPhotoUrl('');

    (async () => {
      try {
        const { Place } = await mapsApi.maps.importLibrary('places');
        const nextPlace = new Place({ id: placeId });
        await nextPlace.fetchFields({
          fields: [
            'displayName', 'formattedAddress', 'rating', 'userRatingCount',
            'types', 'photos', 'regularOpeningHours',
            'nationalPhoneNumber', 'internationalPhoneNumber', 'websiteURI',
            'reviews', 'location',
          ],
        });

        if (!cancelled) {
          setPlace(nextPlace);
          if (!nextPlace.photos?.length) {
            const fallbackUrl = await getStreetViewFallbackPhoto(nextPlace);
            if (!cancelled && fallbackUrl) {
              setFallbackPhotoUrl(fallbackUrl);
            }
          }
        }
      } catch (err) {
        if (!cancelled) {
          console.error('[MapInfoPanel] fetchFields failed:', err);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [placeId]);

  return {
    place,
    loading,
    matchedStop,
    addedDays,
    photos: place?.photos || [],
    reviews: place?.reviews || [],
    fallbackPhotoUrl,
  };
}
