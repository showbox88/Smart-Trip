import { state } from './state.js';
import { loadData, saveData } from './api.js';
import { renderApp } from './ui/render.js';
import { initRealMap, setGoogleMapsReady, toggleMapDarkMode } from './maps.js';

// Handler Imports
import * as AuthHandlers from './ui/handlers/auth.js';
import * as TripHandlers from './ui/handlers/trips.js';
import * as StopHandlers from './ui/handlers/stops.js';
import * as SearchHandlers from './ui/handlers/search.js';
import * as UXHandlers from './ui/handlers/ux.js';

// --- Error Handling ---
window.onerror = function (msg, url, line, col, error) {
    const container = document.getElementById('app-container');
    if (container) {
        container.innerHTML = `
            <div style="padding: 2rem; background: #450a0a; color: #fca5a5; border: 1px solid #ef4444; margin: 2rem; border-radius: 12px; font-family: monospace;">
                <h3>⚠️ 系统运行错误 (Runtime Error)</h3>
                <p>${msg}</p>
                <p style="font-size: 0.8rem; opacity: 0.7;">Line: ${line}, Col: ${col}</p>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">刷新页面</button>
                <button onclick="localStorage.clear(); location.reload();" style="margin-top: 1rem; margin-left:1rem; padding: 0.5rem 1rem; background: transparent; color: white; border: 1px solid white; border-radius: 4px; cursor: pointer;">清除并重置</button>
            </div>
        `;
    }
    return false;
};

// --- Bridge Functions for HTML Attributes ---
// Auth
window.handleLogin = AuthHandlers.handleLogin;
window.handleLoginKey = AuthHandlers.handleLoginKey;
window.goDashboard = AuthHandlers.goDashboard;
window.startPlanning = AuthHandlers.startPlanning;

// Trips
window.createNewTrip = TripHandlers.createNewTrip;
window.openTrip = TripHandlers.openTrip;
window.deleteTrip = TripHandlers.deleteTrip;
window.shareTrip = TripHandlers.shareTrip;
window.toggleMenu = TripHandlers.toggleMenu;
window.saveTripMetadata = TripHandlers.saveTripMetadata;

// Stops & Day Management
window.addDay = StopHandlers.addDay;
window.deleteDay = StopHandlers.deleteDay;
window.deleteStop = StopHandlers.deleteStop;
window.deleteTimelineItem = StopHandlers.deleteTimelineItem;
window.saveStop = StopHandlers.saveStop;
window.updateNoteContent = StopHandlers.updateNoteContent;
window.updateListTitle = StopHandlers.updateListTitle;
window.toggleListItemCheck = StopHandlers.toggleListItemCheck;
window.updateListItemText = StopHandlers.updateListItemText;
window.deleteListItem = StopHandlers.deleteListItem;
window.handleNewListItem = StopHandlers.handleNewListItem;
window.toggleItemSelect = StopHandlers.toggleItemSelect;
window.addTimelineNote = StopHandlers.addTimelineNote;
window.addTimelineList = StopHandlers.addTimelineList;

window.setDayColor = StopHandlers.setDayColor;

// Search
window.handleSearchInput = SearchHandlers.handleSearchInput;
window.handleSearchKeyDown = SearchHandlers.handleSearchKeyDown;
window.handleDropdownClick = SearchHandlers.handleDropdownClick;
window.searchImages = SearchHandlers.searchImages;
window.selectImage = SearchHandlers.selectImage;

// UX / Modals
window.closeModal = UXHandlers.closeModal;
window.closeSubModal = UXHandlers.closeSubModal;
window.openConfirmModal = UXHandlers.openConfirmModal;
window.openEditTripModal = UXHandlers.openEditTripModal;
window.openEditModal = UXHandlers.openEditModal;
window.scrollToDay = UXHandlers.scrollToDay;
window.editDaySubtitle = UXHandlers.editDaySubtitle;
window.toggleOverview = UXHandlers.toggleOverview;
window.toggleDayCollapse = UXHandlers.toggleDayCollapse;
window.openTimePickerDirectly = UXHandlers.openTimePickerDirectly;
window.openExpenseDirectly = UXHandlers.openExpenseDirectly;
window.openTimePickerModal = UXHandlers.openTimePickerModal;
window.openExpenseModal = UXHandlers.openExpenseModal;
window.selectMockTime = UXHandlers.selectMockTime;
window.saveMockExpense = UXHandlers.saveMockExpense;

// Drag & Drop
window.handleDragStart = UXHandlers.handleDragStart;
window.handleDragEnd = UXHandlers.handleDragEnd;
window.handleDrop = UXHandlers.handleDrop;
window.handleDragOver = UXHandlers.handleDragOver;
window.handleDragEnter = UXHandlers.handleDragEnter;
window.handleDragLeave = UXHandlers.handleDragLeave;

// Maps
window.toggleMapDarkMode = toggleMapDarkMode;

// Placeholder handlers referenced in template but not critical
window.editDay = function (dayId) { alert(`编辑日期: ${dayId}`); };
window.shareDay = function (event, dayId) { if (event) event.stopPropagation(); alert(`分享日期: ${dayId}`); };

// Maps Bridge — register as _realInitGoogleMaps so the inline stub in index.html can call it
// (ES modules are deferred, so window.initGoogleMaps may fire before this module runs)
window._realInitGoogleMaps = function () {
    try {
        setGoogleMapsReady(true);
        console.log("Google Maps API ready and initialised");
        if (state.currentView === 'trip') {
            initRealMap();
        }
    } catch (e) {
        console.error("_realInitGoogleMaps failed:", e);
    }
};

// If Maps API already fired before this module loaded, run immediately
if (window._mapsApiReady) {
    window._realInitGoogleMaps();
}

// --- Global Click Listener (close menus & search dropdowns) ---
document.addEventListener('click', (e) => {
    document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('active'));
    if (!e.target.closest('.location-search-container')) {
        document.querySelectorAll('.location-autocomplete-dropdown').forEach(d => d.classList.remove('active'));
    }
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    loadData().then(() => {
        try {
            renderApp();
        } catch (e) {
            console.error("Render crash:", e);
        }
    });
});


