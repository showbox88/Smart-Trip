import { state, editState } from '../../state.js';
import { renderApp, renderDashboardPartials } from '../render.js';
import { saveData, deleteTripById } from '../../api.js';
import { calculateDays, formatDate } from '../../utils.js';
import { closeModal } from './ux.js';
import { t } from '../i18n.js';

export function createNewTrip() {
    const newId = 'trip-' + Date.now();

    // Default dates: today → today + 5 days
    const today = new Date();
    const endDay = new Date(today);
    endDay.setDate(today.getDate() + 5);
    const pad = n => String(n).padStart(2, '0');
    const startStr = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}`;
    const endStr   = `${endDay.getFullYear()}-${pad(endDay.getMonth() + 1)}-${pad(endDay.getDate())}`;

    const newTrip = {
        id: newId,
        title: t('dashboard.new_trip_default_title'),
        startDate: startStr,
        endDate: endStr,
        thumb: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
        status: "planned",
        activeDayId: 'day-1',
        days: []
    };

    const numDays = calculateDays(startStr, endStr);
    for (let i = 0; i < numDays; i++) {
        let d = new Date(startStr.replace(/-/g, '/'));
        d.setDate(d.getDate() + i);
        let displayDate = !isNaN(d) ? formatDate(startStr, i) : t('itinerary.unknown_date');
        const defaultColors = ['#5b7a99', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
        const newColor = defaultColors[i % defaultColors.length];

        newTrip.days.push({
            id: `day-${Date.now()}-${i}`,
            title: `${t('itinerary.day_label')}${i + 1}${t('itinerary.day_suffix') || ''}`,
            date: displayDate,
            stops: [],
            color: newColor
        });
    }

    if (newTrip.days.length > 0) {
        newTrip.activeDayId = newTrip.days[0].id;
    }

    state.trips.push(newTrip);
    renderApp();
    return newTrip;
}

export function openTrip(tripId) {
    state.activeTripId = tripId;
    state.currentView = 'trip';
    renderApp();
}

export function deleteTrip(event, tripId) {
    if (event) event.stopPropagation();
    window.openConfirmModal(t('itinerary.confirm_delete_trip'), async () => {
        // Remove from local state immediately for instant UI feedback
        state.trips = state.trips.filter(t => t.id !== tripId);

        // If the deleted trip was the active one, go back to dashboard
        if (state.activeTripId === tripId) {
            state.activeTripId = null;
            state.currentView = 'dashboard';
        }
        renderApp();

        // Delete the row from Supabase (this is the key fix — saveData() never deletes)
        await deleteTripById(tripId);
    });
}

export function shareTrip(event, tripId) {
    if (event) event.stopPropagation();
    alert(t('itinerary.share_success'));
}

export function toggleMenu(event, tripId) {
    event.stopPropagation();
    const menu = document.getElementById(`menu-${tripId}`);

    // close others
    document.querySelectorAll('.menu-dropdown').forEach(d => {
        if (d.id !== `menu-${tripId}`) d.classList.remove('active');
    });

    menu.classList.toggle('active');
}

export function saveTripMetadata() {
    const title = document.getElementById('trip-edit-title').value;
    const thumb = document.getElementById('trip-edit-thumb').value;
    const start = document.getElementById('trip-edit-start').value;
    const end = document.getElementById('trip-edit-end').value;
    const status = document.getElementById('trip-edit-status').value;

    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (title) trip.title = title;
    if (thumb) trip.thumb = thumb;
    if (status) trip.status = status;

    let datesChanged = false;
    if (start && start !== trip.startDate) { trip.startDate = start; datesChanged = true; }
    if (end && end !== trip.endDate) { trip.endDate = end; datesChanged = true; }

    if (datesChanged && trip.startDate && trip.endDate) {
        const numDays = calculateDays(trip.startDate, trip.endDate);

        // Handle extending days
        if (numDays > trip.days.length) {
            for (let i = trip.days.length; i < numDays; i++) {
                let d = new Date(trip.startDate.replace(/-/g, '/'));
                d.setDate(d.getDate() + i);
                let displayDate = !isNaN(d) ? formatDate(trip.startDate, i) : t('itinerary.unknown_date');
                const defaultColors = ['#5b7a99', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
                const newColor = defaultColors[i % defaultColors.length];

                trip.days.push({
                    id: `day-${Date.now()}-${i}`,
                    title: `${t('itinerary.day_label')}${i + 1}${t('itinerary.day_suffix') || ''}`,
                    date: displayDate,
                    stops: [],
                    color: newColor
                });
            }
        }
        // Handle shortening days
        else if (numDays < trip.days.length) {
            if (confirm(t('itinerary.confirm_shorten_trip'))) {
                trip.days.length = numDays;
            }
        }

        // Re-align all dates based on new startDate
        for (let i = 0; i < trip.days.length; i++) {
            trip.days[i].date = formatDate(trip.startDate, i);
            trip.days[i].title = `${t('itinerary.day_label')}${i + 1}${t('itinerary.day_suffix') || ''}`;
        }
    }

    closeModal();
    saveData();
    renderApp();
}

export function filterDashboard(filter) {
    state.dashboardFilter = filter;
    renderDashboardPartials();
}

export function switchViewMode(mode) {
    state.dashboardView = mode;
    renderDashboardPartials();
}
