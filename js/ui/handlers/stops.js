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

    let newDateStr = '未知日期';
    if (trip.startDate) {
        let d = new Date(trip.startDate.replace(/-/g, '/'));
        d.setDate(d.getDate() + trip.days.length);
        if (!isNaN(d)) {
            newDateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
        }
    }

    const defaultColors = ['#5b7a99', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
    const newColor = defaultColors[(newDayNum - 1) % defaultColors.length];

    const newDay = {
        id: newDayId,
        title: `第 ${newDayNum} 天`,
        date: newDateStr,
        stops: [],
        color: newColor
    };
    trip.days.push(newDay);
    trip.activeDayId = newDayId;
    saveData();

    // 1. Update Header
    const datesSpan = document.getElementById('trip-header-dates');
    if (datesSpan) datesSpan.innerText = `${trip.startDate} 至 ${trip.endDate}`;

    const durationSpan = document.getElementById('trip-header-duration');
    if (durationSpan) durationSpan.innerText = `${calculateDays(trip.startDate, trip.endDate)} 天`;

    // 2. Inject day to Sidebar
    const sidebarNav = document.getElementById('sidebar-nav');
    if (sidebarNav) {
        Array.from(sidebarNav.children).forEach(li => li.classList.remove('active'));
        const newLi = document.createElement('li');
        newLi.className = 'active';
        newLi.style.cssText = "display:flex; flex-direction:column; padding-right:10px; margin-bottom:0.5rem; cursor:pointer;";
        let dateStr = newDateStr.includes('年') ? newDateStr.split('年')[1] : newDateStr;
        newLi.innerHTML = `
            <div style="display:flex; align-items:center; gap: 6px; min-width:0;">
                <div style="width:8px; height:8px; border-radius:50%; background:${newColor}; flex-shrink:0;"></div>
                <span style="white-space:nowrap; font-size:0.85rem; color:${newColor}; font-weight:600;">${newDay.title}</span>
                <span style="font-size:0.85rem; color:${newColor}; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${dateStr}</span>
            </div>
            <div style="padding-left:14px; margin-top:4px;">
                <span id="sidebar-count-${newDayId}" style="font-size:0.75rem; color:var(--text-secondary); white-space:nowrap;">共 0 站行程</span>
            </div>
        `;
        newLi.onclick = () => scrollToDay(newDayId);
        sidebarNav.appendChild(newLi);
    }

    // 3. Inject day HTML to Timeline
    const timeline = document.querySelector('.itinerary-timeline');
    if (timeline) {
        const temp = document.createElement('div');
        temp.innerHTML = getDayHTML(newDay, trip.days.length - 1, state.activeTripId);
        timeline.appendChild(temp.firstElementChild);
    }

    setTimeout(() => {
        const element = document.getElementById(newDayId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }, 50);
}

export function deleteDay(event, dayId) {
    event.stopPropagation();
    window.openConfirmModal('确定要清空这一天所有的行程安排吗？', () => {
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
        window.openConfirmModal("确定要删除这项内容吗？", () => {
            const trip = state.trips.find(t => t.id === state.activeTripId);
            const day = trip.days.find(d => d.id === dayId);
            day.stops = day.stops.filter(s => s.id !== stopId);
            saveData();
            renderApp();
        });
    } else {
        window.openConfirmModal("确定删除这个目的地吗？", () => {
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

    // Check if a prompt already exists and remove it to prevent duplicates
    const existingPrompt = document.getElementById('light-confirm-prompt');
    if (existingPrompt) existingPrompt.remove();

    // Calculate position based on the click event coordinates
    let leftPos = '50%';
    let topPos = '50%';
    let transformStyle = 'translate(-50%, -50%)';

    if (event && event.clientX) {
        // Position slightly to the left of the cursor, vertically aligned
        const proposedLeft = event.clientX - 280; // Width of modal is ~220px, give some padding
        leftPos = `${Math.max(20, proposedLeft)}px`;
        const proposedTop = event.clientY - 25; // Center vertically with cursor
        topPos = `${Math.max(20, proposedTop)}px`;
        transformStyle = 'none';
    }

    // Create a lightweight, non-dimming confirmation prompt
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

    // Add animation style if not present
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
        <span>确定要删除吗？</span>
        <div style="display:flex; gap: 0.6rem;">
            <button id="light-confirm-cancel" style="background:transparent; border:1px solid var(--text-secondary); color:var(--text-secondary); padding:0.3rem 0.8rem; border-radius:6px; cursor:pointer;">取消</button>
            <button id="light-confirm-ok" style="background:#ef4444; border:none; color:white; padding:0.3rem 0.8rem; border-radius:6px; cursor:pointer; font-weight:bold;">确定</button>
        </div>
    `;

    document.body.appendChild(prompt);

    // Cancel handler
    document.getElementById('light-confirm-cancel').onclick = () => {
        prompt.remove();
    };

    // Confirm handler
    document.getElementById('light-confirm-ok').onclick = () => {
        prompt.remove();
        const day = getDay(dayId);
        if (!day) return;
        day.stops = day.stops.filter(s => s.id !== itemId);
        saveData();
        const trip = state.trips.find(t => t.id === state.activeTripId);

        // Update sidebar count before rendering
        const countSpan = document.getElementById(`sidebar-count-${dayId}`);
        if (countSpan) {
            const locationStops = day.stops.filter(s => s.type === 'location' || !s.type).length;
            countSpan.innerText = `共 ${locationStops} 站行程`;
        }

        // Re-render only the affected day
        const dayIndex = trip.days.findIndex(d => d.id === dayId);
        const temp = document.createElement('div');
        temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
        const dayEl = document.getElementById(dayId);
        if (dayEl) dayEl.replaceWith(temp.firstElementChild);

        // Refresh map markers if necessary
        if (window.googleMapsReady) {
            import('../../maps.js').then(m => {
                m.initRealMap();
                m.computeTransitData(dayId);
            });
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
        alert("请输入地点名称");
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

    // Sort stops by time
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
            categoryIcon: categoryInfo.icon
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
            if (countSpan) countSpan.innerText = `共 ${locationStops} 站行程`;
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
            fetch('/api/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: remotePhotoUrl })
            })
                .then(r => r.json())
                .then(result => {
                    if (result.status === 'success' && result.localUrl) {
                        newStop.photo = result.localUrl;
                        saveData();
                        renderDay();
                        console.log('[image-cache] Saved locally:', result.localUrl);
                    }
                })
                .catch(err => {
                    console.warn('[image-cache] Failed to cache image:', err);
                });
        }

    } catch (err) {
        console.error('[autoAddStop] Place.fetchFields failed:', err);
        alert('无法获取地点信息，请重试');
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
