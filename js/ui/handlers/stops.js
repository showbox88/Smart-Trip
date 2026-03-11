import { state, editState, setEditingContext } from '../../state.js';
import { renderApp } from '../render.js';
import { saveData } from '../../api.js';
import { getCategoryFromTypes } from '../../constants.js';
import { calculateDays } from '../../utils.js';
import { getDay, getDayHTML, getTimelineItemHTML } from '../templates/itinerary.js';
import { closeModal } from './ux.js';

// --- Day Management ---
export function addDay() {
    const trip = state.trips.find(t => t.id === state.activeTripId);

    // Extend the trip's endDate by 1 day logically
    if (trip.endDate && trip.startDate) {
        let currentEnd = new Date(trip.endDate.replace(/-/g, '/'));

        // As a fallback to ensure we don't drift due to month end edge cases,
        // we can perfectly derive the requested endDate from startDate + new length
        let newEnd = new Date(trip.startDate.replace(/-/g, '/'));
        newEnd.setDate(newEnd.getDate() + trip.days.length);

        if (!isNaN(newEnd.getTime())) {
            let year = newEnd.getFullYear();
            let month = String(newEnd.getMonth() + 1).padStart(2, '0');
            let date = String(newEnd.getDate()).padStart(2, '0');
            trip.endDate = `${year}-${month}-${date}`;
        }
    }

    const newDayNum = trip.days.length + 1;
    const newDayId = `day-${Date.now()}`;

    let newDateStr = t('itinerary.unknown_date');
    if (trip.startDate) {
        let d = new Date(trip.startDate.replace(/-/g, '/'));
        d.setDate(d.getDate() + trip.days.length);
        if (!isNaN(d)) {
            newDateStr = formatDate(trip.startDate, trip.days.length);
        }
    }

    const defaultColors = ['#5b7a99', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
    const newColor = defaultColors[(newDayNum - 1) % defaultColors.length];

    const newDay = {
        id: newDayId,
        title: `${t('itinerary.day_label')}${newDayNum}${t('itinerary.day_suffix') || ''}`,
        date: newDateStr,
        stops: [],
        color: newColor
    };
    trip.days.push(newDay);
    trip.activeDayId = newDayId;
    saveData();
    renderApp();

    setTimeout(() => {
        // Scroll main timeline
        const element = document.getElementById(newDayId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }

        // Scroll sidebar to bottom to keep "Add Day" button visible
        const sidebarNav = document.getElementById('sidebar-nav');
        if (sidebarNav && sidebarNav.parentElement) {
            const sidebar = sidebarNav.parentElement;
            sidebar.scrollTo({ top: sidebar.scrollHeight, behavior: 'smooth' });
        }
    }, 100);
}


export function deleteDay(event, dayId) {
    event.stopPropagation();
    window.openConfirmModal(t('common.clear_day_confirm'), () => {
        const trip = state.trips.find(t => t.id === state.activeTripId);
        if (trip) {
            const day = trip.days.find(d => d.id === dayId);
            if (day) {
                day.stops = [];
                saveData();
                renderApp();
            }
        }
    });
}

export function setDayColor(dayId, colorHex) {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const day = trip.days.find(d => d.id === dayId);
    if (day) {
        day.color = colorHex;
        saveData();

        // 1. Update the color picker bubble
        const colorBubbles = document.querySelectorAll(`[onclick="toggleMenu(event, 'color-${dayId}')"]`);
        colorBubbles.forEach(el => el.style.background = colorHex);

        // 2. Update the dropdown selection borders
        const menuDropdown = document.getElementById(`menu-color-${dayId}`);
        if (menuDropdown) {
            Array.from(menuDropdown.children).forEach(child => {
                const onClickAttr = child.getAttribute('onclick') || '';
                if (onClickAttr.includes(colorHex)) {
                    child.style.borderColor = 'var(--text-primary)';
                } else {
                    child.style.borderColor = 'transparent';
                }
            });
        }

        // 3. Update timeline elements
        const dots = document.querySelectorAll(`.day-section#${dayId} .timeline-dot`);
        dots.forEach(el => el.style.background = colorHex);

        const richCardDots = document.querySelectorAll(`.day-section#${dayId} .rich-stop-card-dot`);
        richCardDots.forEach(el => el.style.background = colorHex);

        const lines = document.querySelectorAll(`.day-section#${dayId} .timeline-line`);
        lines.forEach(el => el.style.borderLeftColor = colorHex);

        // 4. Update Sidebar
        const sidebarDot = document.getElementById(`sidebar-color-dot-${dayId}`);
        if (sidebarDot) {
            sidebarDot.style.background = colorHex;
            sidebarDot.style.boxShadow = `0 0 8px ${colorHex}80`;
        }

        const sidebarItem = document.getElementById(`nav-day-${dayId}`);
        if (sidebarItem && sidebarItem.classList.contains('active')) {
            sidebarItem.style.borderLeftColor = colorHex;
            sidebarItem.style.background = `linear-gradient(90deg, ${colorHex}20 0%, transparent 100%)`;
        }

        // 5. Update Map (we don't renderApp, but Map triggers are fine)
        if (window.googleMapsReady) {
            import('../../maps.js').then(m => {
                m.initRealMap();
            });
        } else if (window._realInitGoogleMaps) {
            window._realInitGoogleMaps();
        }
    }
}

// --- Stop Management ---
export function deleteStop(event, dayId, stopId) {
    if (event && dayId && stopId) {
        if (event) event.stopPropagation();
        window.openConfirmModal(t('common.delete_confirm'), () => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const day = trip.days.find(d => d.id === dayId);
            day.stops = day.stops.filter(s => s.id !== stopId);
            saveData();
            renderApp();
        });
    } else {
        window.openConfirmModal(t('common.delete_confirm'), () => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const day = trip.days.find(d => d.id === editState.editingDayId);
            day.stops = day.stops.filter(s => s.id !== editState.editingStopId);
            saveData();
            closeModal();
            renderApp();
        });
    }
}

export function deleteTimelineItem(event, dayId, itemId) {
    if (event) {
        event.stopPropagation();
        event.preventDefault();
    }

    const day = getDay(dayId);
    const stopToDelete = day?.stops.find(s => s.id === itemId);
    const isHotelStay = stopToDelete && (stopToDelete.type === 'hotel_checkin' || stopToDelete.type === 'hotel_checkout') && stopToDelete.stayId;

    // Check if a prompt already exists and remove it to prevent duplicates
    const existingPrompt = document.getElementById('light-confirm-prompt');
    if (existingPrompt) existingPrompt.remove();

    // Calculate position based on the click event coordinates
    let leftPos = '50%';
    let topPos = '50%';
    let transformStyle = 'translate(-50%, -50%)';

    if (event && event.clientX) {
        const proposedLeft = event.clientX - 280;
        leftPos = `${Math.max(20, proposedLeft)}px`;
        const proposedTop = event.clientY - 25;
        topPos = `${Math.max(20, proposedTop)}px`;
        transformStyle = 'none';
    }

    const prompt = document.createElement('div');
    prompt.id = 'light-confirm-prompt';
    prompt.style.cssText = `
        position: fixed;
        top: ${topPos};
        left: ${leftPos};
        transform: ${transformStyle};
        background: var(--bg-secondary);
        border: 1px solid var(--glass-border);
        box-shadow: 0 4px 15px rgba(0,0,0,0.5);
        padding: 0.8rem 1.2rem;
        border-radius: 8px;
        z-index: 10000;
        display: flex;
        align-items: center;
        gap: 1.2rem;
        color: var(--text-primary);
        font-size: 0.95rem;
        animation: popIn 0.15s cubic-bezier(0.18, 0.89, 0.32, 1.28);
    `;

    if (!document.getElementById('light-prompt-style')) {
        const style = document.createElement('style');
        style.id = 'light-prompt-style';
        style.innerHTML = `
            @keyframes popIn {
                from { transform: scale(0.9) ${transformStyle}; opacity: 0; }
                to { transform: scale(1) ${transformStyle}; opacity: 1; }
            }
        `;
        document.head.appendChild(style);
    }

    prompt.innerHTML = `
        <span>${isHotelStay ? t('common.delete_hotel_confirm') : t('common.delete_confirm')}</span>
        <div style="display:flex; gap: 0.6rem;">
            <button id="light-confirm-cancel" style="background:transparent; border:1px solid var(--text-secondary); color:var(--text-secondary); padding:0.3rem 0.8rem; border-radius:6px; cursor:pointer;">${t('common.cancel')}</button>
            <button id="light-confirm-ok" style="background:#ef4444; border:none; color:white; padding:0.3rem 0.8rem; border-radius:6px; cursor:pointer; font-weight:bold;">${t('common.confirm')}</button>
        </div>
    `;

    document.body.appendChild(prompt);

    document.getElementById('light-confirm-cancel').onclick = () => prompt.remove();

    document.getElementById('light-confirm-ok').onclick = () => {
        prompt.remove();
        if (!day) return;

        const trip = state.trips.find(t => t.id === state.activeTripId);
        if (!trip) return;

        if (isHotelStay) {
            const stayId = stopToDelete.stayId;
            // Delete all stops with the same stayId across all days
            trip.days.forEach(d => {
                d.stops = d.stops.filter(s => s.stayId !== stayId);
            });
            saveData();
            renderApp();
        } else {
            // Normal deletion logic
            day.stops = day.stops.filter(s => s.id !== itemId);
            saveData();

            // Update sidebar count before partial re-render
            const countSpan = document.getElementById(`sidebar-count-${dayId}`);
            if (countSpan) {
                const locationStops = day.stops.filter(s => s.type === 'location' || !s.type).length;
                countSpan.innerText = t('itinerary.total_stops').replace('{count}', locationStops);
            }

            // Re-render only the affected day
            const dayIndex = trip.days.findIndex(d => d.id === dayId);
            const temp = document.createElement('div');
            temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
            const dayEl = document.getElementById(dayId);
            if (dayEl) dayEl.replaceWith(temp.firstElementChild);

            // Refresh map markers
            if (window.googleMapsReady) {
                import('../../maps.js').then(m => {
                    m.initRealMap();
                    m.computeTransitData(dayId);
                });
            }
        }
    };
}

export function saveStop() {
    const loc = document.getElementById('stop-location').value;
    const note = document.getElementById('stop-note') ? document.getElementById('stop-note').value : '';
    const address = document.getElementById('stop-address') ? document.getElementById('stop-address').value : '';
    const phone = document.getElementById('stop-phone') ? document.getElementById('stop-phone').value : '';

    let timeStr = '10:00';
    let p = 'AM';
    const chip = document.querySelector('.time-chip');
    if (chip && chip.dataset.vtime) {
        timeStr = chip.dataset.vtime;
        p = chip.dataset.vperiod;
    }

    let price = '0';
    if (editState.editingStopId) {
        const trip = state.trips.find(t => t.id === state.activeTripId);
        const day = trip.days.find(d => d.id === editState.editingDayId);
        const existingStop = day.stops.find(s => s.id === editState.editingStopId);
        price = existingStop ? existingStop.price || '0' : '0';
    }

    if (!loc) {
        alert(t('common.input_location_hint'));
        return;
    }

    const trip = state.trips.find(t => t.id === state.activeTripId);
    const day = trip.days.find(d => d.id === editState.editingDayId);

    if (editState.editingStopId) {
        // Edit mode
        const stop = day.stops.find(s => s.id === editState.editingStopId);
        stop.location = loc;
        stop.time = timeStr;
        stop.period = p;
        stop.note = note;
        stop.price = price;
        stop.address = address;
        stop.phone = phone;
    } else {
        // Add mode
        day.stops.push({
            id: 's' + Date.now(),
            location: loc,
            time: timeStr,
            period: p,
            note: note,
            price: price,
            address: address,
            phone: phone
        });
    }

    // (Removed auto-sort to preserve manual drag-and-drop order)
    /*
    day.stops.sort((a, b) => {
        const parseTime = (time, period) => {
            if (!time) return 0;
            let [h, m] = time.split(':').map(Number);
            if (period === 'PM' && h !== 12) h += 12;
            if (period === 'AM' && h === 12) h = 0;
            return h * 60 + m;
        };
        return parseTime(a.time, a.period) - parseTime(b.time, b.period);
    });
    */

    saveData();
    closeModal();

    // Re-render just this day's HTML
    const timeline = document.querySelector('.itinerary-timeline');
    const daySection = document.getElementById(editState.editingDayId);
    if (timeline && daySection) {
        const dayIndex = trip.days.findIndex(d => d.id === editState.editingDayId);
        const temp = document.createElement('div');
        temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
        timeline.replaceChild(temp.firstElementChild, daySection);
    } else {
        renderApp();
    }
}

// --- Note/List Handlers ---
export function updateNoteContent(dayId, itemId, value) {
    const day = getDay(dayId);
    if (!day) return;
    const item = day.stops.find(s => s.id === itemId);
    if (item) {
        item.content = value;
        saveData();
    }
}

export function updateListTitle(dayId, itemId, value) {
    const day = getDay(dayId);
    if (!day) return;
    const item = day.stops.find(s => s.id === itemId);
    if (item) {
        item.title = value;
        saveData();
    }
}

export function toggleListItemCheck(dayId, itemId, index, element) {
    const day = getDay(dayId);
    if (!day) return;
    const item = day.stops.find(s => s.id === itemId);
    if (item && item.items && item.items[index]) {
        item.items[index].checked = !item.items[index].checked;
        saveData();

        if (element) {
            const isChecked = item.items[index].checked;
            element.style.border = `2px solid ${isChecked ? 'var(--text-secondary)' : 'var(--text-secondary)'} `;
            element.style.background = isChecked ? 'var(--text-secondary)' : 'transparent';
            const input = element.nextElementSibling;
            if (input && input.tagName === 'INPUT') {
                input.style.textDecoration = isChecked ? 'line-through' : 'none';
                input.style.opacity = isChecked ? '0.5' : '1';
            }
        }
    }
}

export function updateListItemText(dayId, itemId, index, value) {
    const day = getDay(dayId);
    if (!day) return;
    const item = day.stops.find(s => s.id === itemId);
    if (item && item.items && item.items[index]) {
        item.items[index].text = value;
        saveData();
    }
}

export function deleteListItem(dayId, itemId, index) {
    const day = getDay(dayId);
    if (!day) return;
    const item = day.stops.find(s => s.id === itemId);
    if (item && item.items) {
        item.items.splice(index, 1);
        saveData();

        const trip = state.trips.find(t => t.id === state.activeTripId);
        const dayIndex = trip.days.findIndex(d => d.id === dayId);
        const temp = document.createElement('div');
        temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
        const srcEl = document.getElementById(dayId);
        if (srcEl) {
            srcEl.replaceWith(temp.firstElementChild);
            // Trigger auto-resize on any reproduced textareas
            const newDayEl = document.getElementById(dayId);
            if (newDayEl) {
                newDayEl.querySelectorAll('textarea').forEach(ta => {
                    ta.style.height = '';
                    ta.style.height = ta.scrollHeight + 'px';
                });
            }
        } else {
            renderApp();
        }
    }
}

export function handleNewListItem(event, dayId, itemId) {
    if (event.key === 'Enter') {
        const val = event.target.value.trim();
        if (val) {
            const day = getDay(dayId);
            if (!day) return;
            const item = day.stops.find(s => s.id === itemId);
            if (item) {
                item.items = item.items || [];
                item.items.push({ text: val, checked: false });
                saveData();

                const trip = state.trips.find(t => t.id === state.activeTripId);
                const dayIndex = trip.days.findIndex(d => d.id === dayId);
                const temp = document.createElement('div');
                temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
                const srcEl = document.getElementById(dayId);
                if (srcEl) {
                    srcEl.replaceWith(temp.firstElementChild);

                    const newDayEl = document.getElementById(dayId);
                    if (newDayEl) {
                        newDayEl.querySelectorAll('textarea').forEach(ta => {
                            ta.style.height = '';
                            ta.style.height = ta.scrollHeight + 'px';
                        });

                        // Focus back on the new input field in the recreated DOM
                        const listContainer = document.getElementById(`list - items - ${itemId} `);
                        if (listContainer) {
                            const newInputs = listContainer.querySelectorAll('textarea');
                            if (newInputs.length > 0) newInputs[newInputs.length - 1].focus();
                        }
                    }
                } else {
                    renderApp();
                }
            }
        }
    }
}

export function toggleItemSelect(dayId, itemId, element) {
    const day = getDay(dayId);
    if (!day) return;
    const item = day.stops.find(s => s.id === itemId);
    if (item) {
        item.selected = !item.selected;
        saveData();
        if (element) {
            const box = element.querySelector('div');
            if (box) {
                box.style.border = `2px solid ${item.selected ? 'var(--accent-primary)' : 'var(--text-secondary)'} `;
                box.style.background = item.selected ? 'var(--accent-primary)' : 'transparent';
                box.innerText = item.selected ? '✓' : '';
            }
        }
    }
}

export function addTimelineNote(dayId) {
    const day = getDay(dayId);
    if (!day) return;

    const newStop = {
        id: 'n' + Date.now(),
        type: 'note',
        content: '',
        checked: false
    };
    day.stops.push(newStop);
    saveData();

    // Re-render only the affected day to avoid full page flash
    const trip = state.trips.find(t => t.id === state.activeTripId);
    const dayIndex = trip.days.findIndex(d => d.id === dayId);
    const temp = document.createElement('div');
    temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
    const dayEl = document.getElementById(dayId);
    if (dayEl) dayEl.replaceWith(temp.firstElementChild);
}

export function addTimelineList(dayId) {
    const day = getDay(dayId);
    if (!day) return;

    const newStop = {
        id: 'l' + Date.now(),
        type: 'list',
        title: '',
        items: []
    };
    day.stops.push(newStop);
    saveData();

    // Re-render only the affected day
    const trip = state.trips.find(t => t.id === state.activeTripId);
    const dayIndex = trip.days.findIndex(d => d.id === dayId);
    const temp = document.createElement('div');
    temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
    const dayEl = document.getElementById(dayId);
    if (dayEl) dayEl.replaceWith(temp.firstElementChild);
}

// Insert note right after a specific stop (used by the "+" transit button)
export function insertNoteAfterStop(dayId, afterStopId) {
    const day = getDay(dayId);
    if (!day) return;

    const afterIdx = day.stops.findIndex(s => s.id === afterStopId);
    const insertIdx = afterIdx >= 0 ? afterIdx + 1 : day.stops.length;

    const newStop = {
        id: 'n' + Date.now(),
        type: 'note',
        content: '',
        checked: false
    };
    day.stops.splice(insertIdx, 0, newStop);
    saveData();

    // Re-render the full day so indices / transit lines are correct
    const trip = state.trips.find(t => t.id === state.activeTripId);
    const daySection = document.getElementById(dayId);
    const timeline = document.querySelector('.itinerary-timeline');
    if (timeline && daySection) {
        const dayIndex = trip.days.findIndex(d => d.id === dayId);
        const temp = document.createElement('div');
        temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
        timeline.replaceChild(temp.firstElementChild, daySection);
    }
}

// Insert checklist right after a specific stop (used by the "+" transit button)
export function insertListAfterStop(dayId, afterStopId) {
    const day = getDay(dayId);
    if (!day) return;

    const afterIdx = day.stops.findIndex(s => s.id === afterStopId);
    const insertIdx = afterIdx >= 0 ? afterIdx + 1 : day.stops.length;

    const newStop = {
        id: 'l' + Date.now(),
        type: 'list',
        title: '',
        items: []
    };
    day.stops.splice(insertIdx, 0, newStop);
    saveData();

    const trip = state.trips.find(t => t.id === state.activeTripId);
    const daySection = document.getElementById(dayId);
    const timeline = document.querySelector('.itinerary-timeline');
    if (timeline && daySection) {
        const dayIndex = trip.days.findIndex(d => d.id === dayId);
        const temp = document.createElement('div');
        temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
        timeline.replaceChild(temp.firstElementChild, daySection);
    }
}

export async function autoAddStop(dayId, placeId, afterStopId) {
    try {
        const { Place } = await google.maps.importLibrary('places');
        const place = new Place({ id: placeId });

        await place.fetchFields({
            fields: ['displayName', 'formattedAddress', 'nationalPhoneNumber', 'location', 'photos', 'rating', 'editorialSummary', 'types']
        });

        const trip = state.trips.find(t => t.id === state.activeTripId);
        const day = trip.days.find(d => d.id === dayId);

        // Preventive check: don't add if already exists in this day (by placeId)
        if (day.stops.some(s => s.placeId === placeId)) {
            console.warn('[autoAddStop] Place already exists in this day:', placeId);
            return;
        }

        let timeStr = '09:00';
        let period = 'AM';

        const locationStops = day.stops.filter(s => s.type === 'location' || !s.type);
        if (locationStops.length > 0) {
            const lastStop = locationStops[locationStops.length - 1];
            if (lastStop.time) {
                let [h, m] = lastStop.time.split(':').map(Number);
                if (lastStop.period === 'PM' && h !== 12) h += 12;
                if (lastStop.period === 'AM' && h === 12) h = 0;
                h += 2;
                if (h >= 24) h -= 24;
                period = h >= 12 ? 'PM' : 'AM';
                let displayH = h % 12;
                if (displayH === 0) displayH = 12;
                timeStr = `${displayH.toString().padStart(2, '0')}:${lastStop.time.split(':')[1] || '00'} `;
            }
        }

        const remotePhotoUrl = place.photos && place.photos.length > 0
            ? place.photos[0].getURI({ maxWidth: 400 })
            : '';
        const desc = place.editorialSummary || '';
        const categoryInfo = getCategoryFromTypes(place.types || []);

        const newStop = {
            id: 's' + Date.now(),
            location: place.displayName,
            desc: desc,
            address: place.formattedAddress || '',
            phone: place.nationalPhoneNumber || '',
            time: timeStr,
            period: period,
            note: '',
            price: '0',
            type: 'location',
            lat: place.location ? place.location.lat() : 0,
            lng: place.location ? place.location.lng() : 0,
            photo: remotePhotoUrl,
            rating: place.rating,
            category: categoryInfo.label,
            categoryIcon: categoryInfo.icon,
            placeId: place.id
        };

        if (afterStopId) {
            // Insert right after the specified stop (from "+" button)
            const afterIdx = day.stops.findIndex(s => s.id === afterStopId);
            const insertIdx = afterIdx >= 0 ? afterIdx + 1 : day.stops.length;
            day.stops.splice(insertIdx, 0, newStop);
        } else {
            // Append and sort by time (normal search bar flow)
            day.stops.push(newStop);
            day.stops.sort((a, b) => {
                const parseTime = (time, p) => {
                    if (!time) return 0;
                    let [hh, mm] = time.split(':').map(Number);
                    if (p === 'PM' && hh !== 12) hh += 12;
                    if (p === 'AM' && hh === 12) hh = 0;
                    return hh * 60 + mm;
                };
                return parseTime(a.time, a.period) - parseTime(b.time, b.period);
            });
        }

        saveData();

        // Ensure the day is expanded so the user can see the new item
        if (state.collapsedDays && state.collapsedDays[dayId]) {
            state.collapsedDays[dayId] = false;
        }

        const renderDay = () => {
            const ds = document.getElementById(dayId);
            const tl = document.querySelector('.itinerary-timeline');
            if (tl && ds) {
                const dayIndex = trip.days.findIndex(d => d.id === dayId);
                const temp = document.createElement('div');
                temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
                tl.replaceChild(temp.firstElementChild, ds);
            } else {
                renderApp();
            }
            const countSpan = document.getElementById(`sidebar-count-${dayId}`);
            const locationStops = day.stops.filter(s => s.type === 'location' || !s.type).length;
            if (countSpan) countSpan.innerText = t('itinerary.total_stops').replace('{count}', locationStops);
        };
        renderDay();

        // Auto scroll to the newly appended item
        setTimeout(() => {
            const newlyAddedEl = document.querySelector('.id-' + newStop.id);
            if (newlyAddedEl) newlyAddedEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);

        if (window.googleMapsReady) {
            import('../../maps.js').then(m => {
                m.initRealMap();
                m.computeTransitData(dayId);
            });
        }

        if (remotePhotoUrl) {
            import('../../api.js').then(api => {
                api.uploadImage(remotePhotoUrl)
                    .then(result => {
                        if (result.status === 'success' && result.localUrl) {
                            newStop.photo = result.localUrl;
                            api.saveData();
                            renderDay();
                            console.log('[image-cache] Stop photo cached:', result.localUrl);
                        }
                    })
                    .catch(err => {
                        console.warn('[image-cache] Failed to cache image:', err);
                    });
            });
        }

    } catch (err) {
        console.error('[autoAddStop] Place.fetchFields failed:', err);
        alert(t('common.fetch_error'));
    }
}


function scrollToDay(id) {
    // local reference used by addDay
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    trip.activeDayId = id;

    // Update the active state in the sidebar directly without a full render
    const sidebarNav = document.getElementById('sidebar-nav');
    if (sidebarNav) {
        Array.from(sidebarNav.children).forEach(li => {
            li.classList.remove('active');
            li.style.background = 'transparent';
            li.style.borderLeftColor = 'transparent';

            if (li.getAttribute('onclick') && li.getAttribute('onclick').includes(id)) {
                li.classList.add('active');
                li.style.background = 'rgba(255,255,255,0.05)';
                // Extract color from the inner dot
                const dot = li.querySelector('div[style*="border-radius"]');
                if (dot && dot.style.backgroundColor) {
                    li.style.borderLeftColor = dot.style.backgroundColor;
                }
            }
        });
    }

    // Auto-expand clicked day, collapse all others
    state.collapsedDays = state.collapsedDays || {};

    trip.days.forEach(d => {
        const isTarget = d.id === id;
        const willCollapse = !isTarget;

        if (state.collapsedDays[d.id] !== willCollapse) {
            state.collapsedDays[d.id] = willCollapse;

            const content = document.getElementById(`day-content-${d.id}`);
            if (content) {
                content.style.display = willCollapse ? 'none' : 'block';
            }
            const arrow = document.getElementById(`collapse-arrow-${d.id}`);
            if (arrow) {
                arrow.style.transform = willCollapse ? 'rotate(-90deg)' : 'rotate(0deg)';
            }
        }
    });

    const element = document.getElementById(id);
    const container = document.getElementById('itinerary-scroll-container');
    if (element && container) {
        // Manually scroll only the itinerary container to avoid shifting the whole page
        const headerOffset = 100;
        container.scrollTo({
            top: element.offsetTop - headerOffset,
            behavior: 'smooth'
        });
    }
}

export function openStayInfoModal(event, dayId, stopId) {
    if (event) event.stopPropagation();
    setEditingContext(dayId, stopId, state.activeTripId);

    const trip = state.trips.find(t => t.id === state.activeTripId);
    const day = trip.days.find(d => d.id === dayId);
    const stop = day.stops.find(s => s.id === stopId);

    // Find associated stay if existing
    let checkinDate = day.date.replace(/[年月日]/g, '-').replace(/-$/, '');
    let checkoutDate = checkinDate;
    let checkinTime = stop.time || '02:00';
    let checkinPeriod = stop.period || 'PM';
    let checkoutTime = '12:00';
    let checkoutPeriod = 'PM';

    if (stop.stayId) {
        const allStops = trip.days.flatMap(d => d.stops.map(s => ({ ...s, dayId: d.id, dayDate: d.date })));
        const cin = allStops.find(s => s.stayId === stop.stayId && s.type === 'hotel_checkin');
        const cout = allStops.find(s => s.stayId === stop.stayId && s.type === 'hotel_checkout');
        if (cin) {
            checkinDate = cin.dayDate.replace(/[年月日]/g, '-').replace(/-$/, '');
            checkinTime = cin.time;
            checkinPeriod = cin.period;
        }
        if (cout) {
            checkoutDate = cout.dayDate.replace(/[年月日]/g, '-').replace(/-$/, '');
            checkoutTime = cout.time;
            checkoutPeriod = cout.period;
        }
    }

    const translator = window.t || ((k) => k);

    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    title.innerText = translator('itinerary.stay_modal_title') || '入住信息管理';

    const lblCinDate = translator('itinerary.stay_checkin_date') || '入住日期';
    const lblCinTime = translator('itinerary.stay_checkin_time') || '入住时间';
    const lblCoutDate = translator('itinerary.stay_checkout_date') || '退房日期';
    const lblCoutTime = translator('itinerary.stay_checkout_time') || '退房时间';
    const descHint = translator('itinerary.stay_hint') || '系统将自动在选定日期生成“入住”和“退房”卡片，并为您标记住宿期间的行程起点与终点。';
    const btnCancel = translator('itinerary.cancel') || '取消';
    const btnSubmit = translator('itinerary.stay_submit') || '完成设置';

    // Format dates correctly depending on language, handling Chinese if needed
    const formatInputDate = (dStr) => {
        if(!dStr) return '';
        let normalized = dStr.replace(/-/g, '/').replace('年', '/').replace('月', '/').replace('日', '');
        const d = new Date(normalized);
        if(isNaN(d)) return dStr;
        return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;
    };

    const formattedCinDate = formatInputDate(checkinDate);
    const formattedCoutDate = formatInputDate(checkoutDate);

    body.innerHTML = `
        <div style="padding: 1rem;">
            <div style="display:flex; gap: 1.5rem; margin-bottom: 2rem;">
                <div style="flex:1;">
                    <label style="display:block; font-size:0.9rem; color:var(--text-secondary); margin-bottom:0.5rem;">${lblCinDate}</label>
                    <input type="text" id="stay-checkin-date" class="date-picker-input" value="${formattedCinDate}" style="width:100%; background:var(--bg-secondary); border:1px solid var(--glass-border); padding:0.8rem; border-radius:8px; color:var(--text-primary);">
                </div>
                <div style="flex:1;">
                    <label style="display:block; font-size:0.9rem; color:var(--text-secondary); margin-bottom:0.5rem;">${lblCinTime}</label>
                    <div style="display:flex; gap:5px;">
                        <input type="text" id="stay-checkin-time" value="${checkinTime}" style="flex:1; background:var(--bg-secondary); border:1px solid var(--glass-border); padding:0.8rem; border-radius:8px; color:var(--text-primary); text-align:center;">
                        <select id="stay-checkin-period" style="background:var(--bg-secondary); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:8px; padding:0 0.5rem;">
                            <option value="AM" ${checkinPeriod === 'AM' ? 'selected' : ''}>AM</option>
                            <option value="PM" ${checkinPeriod === 'PM' ? 'selected' : ''}>PM</option>
                        </select>
                    </div>
                </div>
            </div>

            <div style="display:flex; gap: 1.5rem; margin-bottom: 2rem;">
                <div style="flex:1;">
                    <label style="display:block; font-size:0.9rem; color:var(--text-secondary); margin-bottom:0.5rem;">${lblCoutDate}</label>
                    <input type="text" id="stay-checkout-date" class="date-picker-input-cout" value="${formattedCoutDate}" style="width:100%; background:var(--bg-secondary); border:1px solid var(--glass-border); padding:0.8rem; border-radius:8px; color:var(--text-primary);">
                </div>
                <div style="flex:1;">
                    <label style="display:block; font-size:0.9rem; color:var(--text-secondary); margin-bottom:0.5rem;">${lblCoutTime}</label>
                    <div style="display:flex; gap:5px;">
                        <input type="text" id="stay-checkout-time" value="${checkoutTime}" style="flex:1; background:var(--bg-secondary); border:1px solid var(--glass-border); padding:0.8rem; border-radius:8px; color:var(--text-primary); text-align:center;">
                        <select id="stay-checkout-period" style="background:var(--bg-secondary); border:1px solid var(--glass-border); color:var(--text-primary); border-radius:8px; padding:0 0.5rem;">
                            <option value="AM" ${checkoutPeriod === 'AM' ? 'selected' : ''}>AM</option>
                            <option value="PM" ${checkoutPeriod === 'PM' ? 'selected' : ''}>PM</option>
                        </select>
                    </div>
                </div>
            </div>

            <p style="color:var(--text-secondary); font-size:0.85rem; margin-bottom: 2rem; border-left: 3px solid var(--accent-primary); padding-left: 10px;">${descHint}</p>

            <div style="display:flex; gap:10px;">
                <button class="submit-btn" style="background:var(--bg-secondary); border:1px solid var(--glass-border); color:var(--text-primary); flex:1;" onclick="closeModal()">${btnCancel}</button>
                <button class="submit-btn" style="background:var(--accent-primary); color:white; border:none; flex:2; font-weight:bold;" onclick="saveStayInfo('${stopId}')">${btnSubmit}</button>
            </div>
        </div>
    `;

    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('active');
    overlay.classList.remove('hidden');

    if (typeof flatpickr !== 'undefined') {
        const lang = state.settings.language === 'en' ? 'en' : 'zh';
        flatpickr(".date-picker-input", { locale: lang, dateFormat: "Y-m-d", theme: "dark" });
        flatpickr(".date-picker-input-cout", { locale: lang, dateFormat: "Y-m-d", theme: "dark" });
    }
}

export function saveStayInfo(originalStopId) {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    let originalDay = null;
    let stop = null;

    // Find the original stop and its day
    trip.days.forEach(d => {
        const s = d.stops.find(st => st.id === originalStopId);
        if (s) {
            originalDay = d;
            stop = s;
        }
    });

    if (!stop) return alert('找不到该地点');

    const cinDate = document.getElementById('stay-checkin-date').value;
    const cinTime = document.getElementById('stay-checkin-time').value;
    const cinPeriod = document.getElementById('stay-checkin-period').value;
    const coutDate = document.getElementById('stay-checkout-date').value;
    const coutTime = document.getElementById('stay-checkout-time').value;
    const coutPeriod = document.getElementById('stay-checkout-period').value;

    if (!cinDate || !coutDate) return alert('请选择日期');

    const stayId = stop.stayId || 'stay-' + Date.now();
    stop.stayId = stayId;

    // Bulletproof day matching using date mapping
    const matchDayByDate = (targetDateStr) => {
        const target = new Date(targetDateStr.replace(/-/g, '/')).setHours(0,0,0,0);
        const start = new Date(trip.startDate.replace(/-/g, '/')).setHours(0,0,0,0);
        const diffDays = Math.round((target - start) / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays < trip.days.length) {
            return trip.days[diffDays];
        }
        return null;
    };

    const cinDay = matchDayByDate(cinDate);
    const coutDay = matchDayByDate(coutDate);

    if (!cinDay || !coutDay) return alert('所选日期范围超出行程限制');

    // 1. Remove any PREVIOUSly paired checkout stop with this stayId
    // (We'll recreate/update it)
    trip.days.forEach(d => {
        d.stops = d.stops.filter(s => s.stayId === stayId && s.id !== originalStopId && s.type === 'hotel_checkout' ? false : true);
    });

    // 2. Update and Move the Check-in Stop (Original Stop)
    stop.type = 'hotel_checkin';
    stop.time = cinTime;
    stop.period = cinPeriod;
    stop.note = stop.note || 'Check-in';

    if (originalDay.id !== cinDay.id) {
        // Remove from current day
        originalDay.stops = originalDay.stops.filter(s => s.id !== originalStopId);
        // Add to target cin day
        cinDay.stops.push(stop);
    }

    // 3. Create/Add the Checkout Stop
    const coutStop = {
        ...JSON.parse(JSON.stringify(stop)),
        id: 'cout-' + Date.now(),
        type: 'hotel_checkout',
        stayId: stayId,
        time: coutTime,
        period: coutPeriod,
        note: 'Check-out'
    };
    coutDay.stops.push(coutStop);

    // (Removed auto-sort to preserve manual drag-and-drop order)
    /*
    cinDay.stops.sort(sortFn);
    coutDay.stops.sort(sortFn);
    if (originalDay.id !== cinDay.id && originalDay.id !== coutDay.id) {
        originalDay.stops.sort(sortFn);
    }
    */

    saveData();
    closeModal();
    renderApp();

    // 5. Refresh Maps and compute transit for all affected days
    if (window.googleMapsReady) {
        import('../../maps.js').then(m => {
            m.initRealMap();

            // Recalculate for all days that might have changed order or transit segments
            const affectedDayIds = new Set([originalDay.id, cinDay.id, coutDay.id]);
            affectedDayIds.forEach(id => m.computeTransitData(id));
        });
    }
}
