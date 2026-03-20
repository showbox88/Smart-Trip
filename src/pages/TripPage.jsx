import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import ItineraryView from '../components/itinerary/ItineraryView';

export default function TripPage() {
  const { id } = useParams();
  const { dispatch } = useApp();

  useEffect(() => {
    dispatch({ type: 'SET_ACTIVE_TRIP', payload: id });
    return () => dispatch({ type: 'SET_ACTIVE_TRIP', payload: null });
  }, [id, dispatch]);

  return <ItineraryView tripId={id} />;
}
