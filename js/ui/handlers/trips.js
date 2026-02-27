import { state, editState } from '../../state.js';
import { renderApp } from '../render.js';
import { saveData } from '../../api.js';
import { calculateDays, formatDate } from '../../utils.js';
import { closeModal } from './ux.js';

export function createNewTrip() {
    const newId = 'trip-' + Date.now();
    const startStr = "2026-05-01";
    let d = new Date(startStr);
    let displayDate = !isNaN(d) ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` : "2026年5月1日";

    const newTrip = {
        id: newId,
        title: "新的神秘冒险",
        startDate: startStr,
        endDate: "2026-05-05",
        thumb: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
        activeDayId: 'day-1',
        days: [
            { id: 'day-1', title: '第 1 天', date: displayDate, stops: [] }
        ]
    };
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
    if (confirm("确定要删除这个行程吗？")) {
        state.trips = state.trips.filter(t => t.id !== tripId);
        saveData();
        if (state.activeTripId === tripId) {
            state.currentView = 'dashboard';
            renderApp();
        } else {
            renderApp();
        }
    }
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
    if (start) trip.startDate = start;
    if (end) trip.endDate = end;

    closeModal();
    saveData();
    renderApp();
}
