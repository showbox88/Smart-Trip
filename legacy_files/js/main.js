import { state } from './state.js';
import { loadData, saveData, cleanupImages } from './api.js';
import { renderApp } from './ui/render.js';
import { initRealMap, setGoogleMapsReady, toggleMapDarkMode } from './maps.js';
import { loadLanguage } from './ui/i18n.js';

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
                <h3>⚠️ ${t('common.render_error')}</h3>
                <p>${msg}</p>
                <p style="font-size: 0.8rem; opacity: 0.7;">Line: ${line}, Col: ${col}</p>
                <button onclick="location.reload()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: #ef4444; color: white; border: none; border-radius: 4px; cursor: pointer;">${t('common.refresh') || 'Refresh'}</button>
                <button onclick="localStorage.clear(); location.reload();" style="margin-top: 1rem; margin-left:1rem; padding: 0.5rem 1rem; background: transparent; color: white; border: 1px solid white; border-radius: 4px; cursor: pointer;">${t('common.clear_reset') || 'Clear & Reset'}</button>
            </div>
        `;
    }
    return false;
};

// --- Bridge Functions for HTML Attributes ---
// Auth
window.handleAuthSubmit = AuthHandlers.handleAuthSubmit;
window.switchAuthTab = AuthHandlers.switchAuthTab;
window.handleLoginKey = AuthHandlers.handleLoginKey;
window.handleLogout = AuthHandlers.handleLogout;
window.handleGoogleLogin = AuthHandlers.handleGoogleLogin;
window.gotoLogin = AuthHandlers.gotoLogin;
window.goDashboard = AuthHandlers.goDashboard;
window.renderApp = renderApp;
window.startPlanning = AuthHandlers.startPlanning;

// Trips
window.createNewTrip = TripHandlers.createNewTrip;
window.openTrip = TripHandlers.openTrip;
window.deleteTrip = TripHandlers.deleteTrip;
window.shareTrip = TripHandlers.shareTrip;
window.toggleMenu = TripHandlers.toggleMenu;
window.saveTripMetadata = TripHandlers.saveTripMetadata;
window.filterDashboard = TripHandlers.filterDashboard;
window.switchViewMode = TripHandlers.switchViewMode;
window.handleTripThumbUpload = UXHandlers.handleTripThumbUpload;
window.openSettingsModal = UXHandlers.openSettingsModal;
window.toggleUserDropdown = function (e) {
    if (e) e.stopPropagation();
    const dd = document.getElementById('user-dropdown');
    if (dd) dd.classList.toggle('hidden');
};

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
window.insertNoteAfterStop = StopHandlers.insertNoteAfterStop;
window.insertListAfterStop = StopHandlers.insertListAfterStop;

window.setDayColor = StopHandlers.setDayColor;
window.autoAddStop = StopHandlers.autoAddStop;
window.openStayInfoModal = StopHandlers.openStayInfoModal;
window.saveStayInfo = StopHandlers.saveStayInfo;
window._forceResizeTextareas = UXHandlers._forceResizeTextareas;

// Image cache cleanup — called from the dashboard "清理图片缓存" button
window.cleanupImages = async function () {
    const btn = document.activeElement;
    const origText = btn ? btn.innerHTML : '';
    if (btn) { btn.innerHTML = `⏳ ${t('common.loading')}`; btn.disabled = true; }
    try {
        const data = await cleanupImages();
        if (data.status === 'success') {
            const n = data.deleted_count;
            alert(n > 0
                ? `✅ ${t('dashboard.cleanup_success_prefix') || 'Deleted'} ${n} ${t('dashboard.cleanup_success_suffix') || 'images'}.`
                : t('dashboard.cleanup_no_need'));
        } else {
            alert('❌ ' + (t('common.fetch_error') || 'Error') + ': ' + (data.message || ''));
        }
    } catch (e) {
        alert('❌ ' + t('common.fetch_error'));
    } finally {
        if (btn) { btn.innerHTML = origText; btn.disabled = false; }
    }
};

// Search
window.handleSearchInput = SearchHandlers.handleSearchInput;
window.handleSearchKeyDown = SearchHandlers.handleSearchKeyDown;
window.handleDropdownClick = SearchHandlers.handleDropdownClick;
window.searchImages = SearchHandlers.searchImages;
window.selectImage = SearchHandlers.selectImage;

// Inline search: shows a search input directly between two stops
window.showInlineSearchAt = function (dayId, afterStopId) {
    // Close any existing inline search
    document.querySelectorAll('.inline-search-row').forEach(el => el.remove());

    // Find the DOM wrapper for the stop we're inserting after
    const stopWrapper = document.querySelector(`.timeline-item-wrapper.id-${afterStopId}`);
    if (!stopWrapper) return;

    const dropdownId = `inline-dd-${afterStopId}`;

    const container = document.createElement('div');
    container.className = 'inline-search-row';
    container.style.cssText = 'position:relative; margin-bottom:0.5rem; padding-left: 36px; padding-right: 46px; display:flex; align-items:center; gap:0.5rem; z-index:20;';
    container.innerHTML = `
        <div style="flex:1; position:relative;">
            <span style="position:absolute; left:1rem; top:50%; transform:translateY(-50%); color:var(--text-secondary); pointer-events:none;">📍</span>
            <input type="text" class="inline-search-input"
                style="width:100%; padding:0.6rem 1rem 0.6rem 2.8rem; background:var(--bg-secondary); border:1.5px solid var(--accent-primary); border-radius:8px; color:var(--text-primary); font-size:0.95rem; outline:none; box-sizing:border-box;"
                placeholder="${t('itinerary.add_stop')}..." autocomplete="off" />
            <ul id="${dropdownId}" class="location-autocomplete-dropdown"></ul>
        </div>
        <button onclick="document.querySelectorAll('.inline-search-row').forEach(el=>el.remove())"
            style="width:34px; height:34px; border-radius:50%; background:var(--bg-secondary); border:1px solid var(--glass-border); color:var(--text-secondary); cursor:pointer; font-size:0.85rem; display:flex; align-items:center; justify-content:center; flex-shrink:0;">✕</button>
    `;

    // Insert right after the stop wrapper in the timeline
    stopWrapper.parentNode.insertBefore(container, stopWrapper.nextSibling);

    const input = container.querySelector('.inline-search-input');
    input.focus();

    let _searchTimeout = null;
    let _preds = [];
    let _focusIdx = -1;

    function _updateFocus(items) {
        items.forEach((li, i) => {
            li.style.background = i === _focusIdx ? 'var(--bg-primary)' : '';
            if (i === _focusIdx) li.scrollIntoView({ block: 'nearest' });
        });
    }

    input.addEventListener('input', async () => {
        const query = input.value.trim();
        const dropdown = document.getElementById(dropdownId);
        if (!dropdown) return;
        _focusIdx = -1;
        if (!query || query.length < 2) { dropdown.classList.remove('active'); return; }
        if (!window.googleMapsReady || typeof google === 'undefined') return;

        if (_searchTimeout) clearTimeout(_searchTimeout);
        _searchTimeout = setTimeout(async () => {
            try {
                const { AutocompleteSuggestion } = await google.maps.importLibrary('places');
                const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({ input: query });
                if (!suggestions || !suggestions.length) {
                    dropdown.innerHTML = `<li style="color:var(--text-secondary);padding:1rem;text-align:center;">${t('common.not_found')}</li>`;
                    _preds = [];
                    dropdown.classList.add('active'); return;
                }
                _preds = suggestions.map(s => ({
                    place_id: s.placePrediction.placeId,
                    main_text: s.placePrediction.mainText?.text || s.placePrediction.text.text,
                    secondary_text: s.placePrediction.secondaryText?.text || ''
                }));
                dropdown.innerHTML = _preds.map(p => `
                    <li onmousedown="window._inlineSelect('${dayId}','${afterStopId}','${p.place_id}')">
                        <div style="display:flex;flex-direction:column;gap:4px;">
                            <span style="font-weight:600;color:var(--text-primary);font-size:1.05rem;"><span style="color:var(--text-secondary);margin-right:8px;">📍</span>${p.main_text}</span>
                            <span style="font-size:0.82rem;color:var(--text-secondary);padding-left:26px;">${p.secondary_text}</span>
                        </div>
                    </li>`).join('');
                dropdown.classList.add('active');
            } catch (e) { console.error('[inline-search]', e); }
        }, 250);
    });

    input.addEventListener('keydown', e => {
        const dropdown = document.getElementById(dropdownId);
        const items = dropdown ? Array.from(dropdown.querySelectorAll('li')) : [];

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            _focusIdx = Math.min(_focusIdx + 1, items.length - 1);
            _updateFocus(items);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            _focusIdx = Math.max(_focusIdx - 1, 0);
            _updateFocus(items);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (_focusIdx >= 0 && _focusIdx < _preds.length) {
                window._inlineSelect(dayId, afterStopId, _preds[_focusIdx].place_id);
            }
        } else if (e.key === 'Escape') {
            container.remove();
        }
    });
};

window._inlineSelect = function (dayId, afterStopId, placeId) {
    document.querySelectorAll('.inline-search-row').forEach(el => el.remove());
    window.autoAddStop(dayId, placeId, afterStopId);
};

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
window.toggleMobileView = UXHandlers.toggleMobileView;
window.openTimePickerModal = UXHandlers.openTimePickerModal;
window.openExpenseModal = UXHandlers.openExpenseModal;
window.selectMockTime = UXHandlers.selectMockTime;
window.saveMockExpense = UXHandlers.saveMockExpense;
window.changeStopImage = UXHandlers.changeStopImage;
window.saveStopImage = UXHandlers.saveStopImage;
window.selectStopThumb = UXHandlers.selectStopThumb;
window.confirmStopImage = UXHandlers.confirmStopImage;
window.searchGoogleStopImages = SearchHandlers.searchGoogleStopImages;

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
window.editDay = UXHandlers.editDay;
window.saveEditDay = UXHandlers.saveEditDay;
window.shareDay = function (event, dayId) { if (event) event.stopPropagation(); alert(`${t('itinerary.share_trip')}: ${dayId}`); };

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
    const userDD = document.getElementById('user-dropdown');
    if (userDD && !e.target.closest('.user-profile-container')) {
        userDD.classList.add('hidden');
    }
});

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    console.log("[Main] 🚀 Initializing App...");
    try {
        // 1. Load language immediately using the last known preference in localStorage
        //    (this gives us an instant first paint in the right language even before auth)
        const cachedLang = localStorage.getItem('smart-trip-lang') || 'zh';
        await loadLanguage(cachedLang);

        // 2. Initialize Data (Check Session + load user settings from Supabase)
        //    Give the Supabase SDK a tiny head start if it was loaded via script tag
        await new Promise(r => setTimeout(r, 100));
        await loadData();

        // 3. After loadData(), state.settings is now populated from the DB.
        //    If the language stored in the DB differs from what we used for the initial
        //    paint, reload the correct language pack and cache it for next time.
        const userLang = state.settings?.language || cachedLang;
        if (userLang !== cachedLang) {
            await loadLanguage(userLang);
        }
        // Always sync the cached lang key so next cold boot is instant & correct
        localStorage.setItem('smart-trip-lang', userLang);

        // 4. Final Render — now with the correct language loaded
        renderApp();

        // 5. Initialize mobile mode if on small screen
        if (window.innerWidth <= 900) {
            UXHandlers.toggleMobileView('plan');
        }
        console.log("[Main] ✨ App Ready.");
    } catch (e) {
        console.error("[Main] Initialization crash:", e);
        renderApp(); // Fallback to login if something breaks
    }
});



