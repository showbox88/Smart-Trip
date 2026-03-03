import { state, editState } from '../../state.js';
import { renderApp } from '../render.js';
import { saveData } from '../../api.js';
import { calculateDays, formatDate } from '../../utils.js';
import { closeModal } from './ux.js';

export function createNewTrip() {
    const newId = 'trip-' + Date.now();
    const startStr = "2026-05-01";
    const endStr = "2026-05-05";

    const newTrip = {
        id: newId,
        title: "新的神秘冒险",
        startDate: startStr,
        endDate: endStr,
        thumb: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
        activeDayId: 'day-1',
        days: []
    };

    const numDays = calculateDays(startStr, endStr);
    for (let i = 0; i < numDays; i++) {
        let d = new Date(startStr.replace(/-/g, '/'));
        d.setDate(d.getDate() + i);
        let displayDate = !isNaN(d) ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` : `Unknown`;
        const defaultColors = ['#5b7a99', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
        const newColor = defaultColors[i % defaultColors.length];

        newTrip.days.push({
            id: `day-${Date.now()}-${i}`,
            title: `第 ${i + 1} 天`,
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
    window.openConfirmModal("确定要删除这个行程吗？", () => {
        state.trips = state.trips.filter(t => t.id !== tripId);
        saveData();
        if (state.activeTripId === tripId) {
            state.currentView = 'dashboard';
            renderApp();
        } else {
            renderApp();
        }
    });
}

export function shareTrip(event, tripId) {
    if (event) event.stopPropagation();
    alert("分享链接已复制！");
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

    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (title) trip.title = title;
    if (thumb) trip.thumb = thumb;

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
                let displayDate = !isNaN(d) ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` : `Unknown`;
                const defaultColors = ['#5b7a99', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
                const newColor = defaultColors[i % defaultColors.length];

                trip.days.push({
                    id: `day-${Date.now()}-${i}`,
                    title: `第 ${i + 1} 天`,
                    date: displayDate,
                    stops: [],
                    color: newColor
                });
            }
        }
        // Handle shortening days
        else if (numDays < trip.days.length) {
            if (confirm(`行程天数缩短为 ${numDays} 天，多出的日期及行程将被删除。确认吗？`)) {
                trip.days.length = numDays;
            }
        }

        // Re-align all dates based on new startDate
        for (let i = 0; i < trip.days.length; i++) {
            let d = new Date(trip.startDate.replace(/-/g, '/'));
            d.setDate(d.getDate() + i);
            if (!isNaN(d)) {
                trip.days[i].date = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
            }
            trip.days[i].title = `第 ${i + 1} 天`;
        }
    }

    closeModal();
    saveData();
    renderApp();
}
