import { state, updateState } from '../../state.js';
import { renderApp } from '../render.js';
import { saveData } from '../../api.js';
import { createNewTrip } from './trips.js';
import { openTrip } from './trips.js';

export function handleLogin() {
    const nameInput = document.getElementById('login-name').value.trim();
    if (!nameInput) {
        alert("请输入名字");
        return;
    }
    updateState({ user: { name: nameInput }, currentView: 'dashboard' });
    renderApp();
}

export function handleLoginKey(e) {
    if (e.key === 'Enter') handleLogin();
}

export function goDashboard() {
    state.currentView = 'dashboard';
    renderApp();
}

export function startPlanning() {
    if (!state.user) {
        updateState({ user: { name: "旅行者" } });
    }
    state.currentView = 'dashboard';
    const newTrip = createNewTrip();
    if (newTrip) openTrip(newTrip.id);
    saveData();
}
