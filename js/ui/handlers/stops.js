import { state, editState, setEditingContext } from '../../state.js';
import { renderApp } from '../render.js';
import { saveData } from '../../api.js';
import { getCategoryFromTypes } from '../../constants.js';
import { getDay, getDayHTML, getTimelineItemHTML, injectNewStopToDOM } from '../templates/itinerary.js';
import { closeModal } from './ux.js';

// --- Day Management ---
export function addDay() {
    const trip = state.trips.find(t => t.id === state.activeTripId);

    // Extend the trip's endDate by 1 day logically
    if (trip.endDate) {
        let currentEnd = new Date(trip.endDate.replace(/-/g, '/'));
        if (!isNaN(currentEnd.getTime())) {
            currentEnd.setDate(currentEnd.getDate() + 1);
            let month = currentEnd.getMonth() + 1;
            let date = currentEnd.getDate();
            trip.endDate = `${currentEnd.getFullYear()}-${month < 10 ? '0' + month : month}-${date < 10 ? '0' + date : date}`;
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

    const newDay = {
        id: newDayId,
        title: `第 ${newDayNum} 天`,
        date: newDateStr,
        stops: []
    };
    trip.days.push(newDay);
    trip.activeDayId = newDayId;

    saveData();
    renderApp();

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
        renderApp();
    }
}

// --- Stop Management ---
export function deleteStop(event, dayId, stopId) {
    // Called from timeline trash icon (with event, dayId, stopId)
    // or from edit modal delete button (no args, uses editState)
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
        // Called from modal
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

// deleteTimelineItem is the trash icon on the timeline
export function deleteTimelineItem(dayId, itemId) {
    window.openConfirmModal("确定要删除这项内容吗？", () => {
        const day = getDay(dayId);
        if (!day) return;
        day.stops = day.stops.filter(s => s.id !== itemId);
        saveData();
        renderApp();
    });
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
            element.style.border = `2px solid ${isChecked ? 'var(--text-secondary)' : 'var(--text-secondary)'}`;
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
        renderApp();
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
                const newIndex = item.items.length;
                item.items.push({ text: val, checked: false });
                saveData();

                // DOM injection to avoid renderApp
                const listContainer = document.getElementById(`list-items-${itemId}`);
                if (listContainer) {
                    const newItemHtml = `
                        <div style="display:flex; align-items:center; gap:0.6rem; color:var(--text-primary); margin-bottom: 0.3rem;" class="li-item-hover">
                            <div style="width: 16px; height: 16px; border: 2px solid var(--text-secondary); border-radius: 50%; background:transparent; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="toggleListItemCheck('${day.id}', '${item.id}', ${newIndex}, this)"></div>
                            <input type="text" value="${val}" onchange="updateListItemText('${day.id}', '${item.id}', ${newIndex}, this.value)" style="flex:1; background:transparent; border:none; outline:none; color:var(--text-primary); font-size:0.95rem; text-decoration:none; opacity:1;">
                            <button class="delete-btn-hover" onclick="deleteListItem('${day.id}', '${item.id}', ${newIndex})" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:0.9rem; opacity:0; transition:opacity 0.2s;">✕</button>
                        </div>
                    `;
                    const temp = document.createElement('div');
                    temp.innerHTML = newItemHtml;
                    const inputsRow = listContainer.lastElementChild;
                    listContainer.insertBefore(temp.firstElementChild, inputsRow);
                    event.target.value = '';
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
                box.style.border = `2px solid ${item.selected ? 'var(--accent-primary)' : 'var(--text-secondary)'}`;
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

    const html = getTimelineItemHTML(day, newStop, day.stops.length - 1, 0, false);
    injectNewStopToDOM(dayId, html);
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

    const html = getTimelineItemHTML(day, newStop, day.stops.length - 1, 0, false);
    injectNewStopToDOM(dayId, html);
}

export async function autoAddStop(dayId, placeId) {
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
                timeStr = `${displayH.toString().padStart(2, '0')}:${lastStop.time.split(':')[1] || '00'}`;
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

        saveData();

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
        };
        renderDay();

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
    trip.activeDayId = id;
    renderApp();
    const element = document.getElementById(id);
    if (element) element.scrollIntoView({ behavior: 'smooth' });
}
