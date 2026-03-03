import { state, editState, setEditingContext } from '../../state.js';
import { renderApp } from '../render.js';
import { saveData } from '../../api.js';
import { searchImages } from './search.js';
import { getDayHTML } from '../templates/itinerary.js';

// --- Modal Management ---
function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}

// --- Custom Confirm Modal ---
function openConfirmModal(message, onConfirm) {
    const overlay = document.getElementById('modal-overlay');
    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.innerText = "确认操作";
    body.innerHTML = `
        <div style="padding: 1rem 0; font-size: 1.1rem; color: var(--text-primary); text-align: center;">
            ${message}
        </div>
        <div style="display:flex; justify-content:center; gap:15px; margin-top:1.5rem;">
            <button class="submit-btn" style="background:var(--bg-secondary); border:1px solid var(--glass-border); color:var(--text-primary); min-width:100px;" onclick="closeModal()">取消</button>
            <button class="submit-btn danger" style="background:#ef4444; color:white; border:none; min-width:100px;" id="confirm-yes-btn">确定</button>
        </div>
    `;

    overlay.classList.add('active');
    overlay.classList.remove('hidden');

    document.getElementById('confirm-yes-btn').onclick = () => {
        closeModal();
        if (onConfirm) onConfirm();
    };
}

function closeSubModal() {
    const overlay = document.getElementById('sub-modal-overlay');
    overlay.classList.remove('active');
    setTimeout(() => {
        if (!overlay.classList.contains('active')) {
            overlay.classList.add('hidden');
        }
    }, 300);
}

function openModal(title, bodyHTML) {
    const modal = document.getElementById('modal-overlay');
    const titleEl = document.getElementById('modal-title');
    const bodyEl = document.getElementById('modal-body');
    if (modal && titleEl && bodyEl) {
        titleEl.innerText = title;
        bodyEl.innerHTML = bodyHTML;
        modal.classList.add('active');
        modal.classList.remove('hidden');
    }
}

// --- Edit Trip Modal ---
function openEditTripModal(tripId) {
    state.activeTripId = tripId;
    const trip = state.trips.find(t => t.id === tripId);

    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    title.innerText = `编辑行程信息`;

    body.innerHTML = `
        <div class="form-group">
            <label>行程名称</label>
            <input type="text" id="trip-edit-title" value="${trip.title}">
        </div>
        <div class="form-group" style="margin-bottom: 0.5rem;">
            <label>封面图片搜索</label>
            <div style="display:flex; gap:0.5rem; margin-bottom:0.8rem;">
                <input type="text" id="trip-edit-search" placeholder="输入关键词 (例如: Tokyo, Beach)" style="flex:1; background:var(--bg-primary); border:1px solid var(--glass-border); padding:0.6rem 0.8rem; border-radius:8px; color:var(--text-primary);" onkeydown="if(event.key === 'Enter') searchImages()">
                <button class="btn-primary" onclick="searchImages()" style="padding:0 1rem; font-size: 0.9rem;">搜索缩略图</button>
            </div>
            <input type="hidden" id="trip-edit-thumb" value="${trip.thumb}">
            <div id="image-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.5rem; max-height:220px; overflow-y:auto; padding-right:4px;">
                <!-- Search results injected here -->
            </div>
        </div>
        <div class="form-group" style="margin-top: 1rem;">
            <label>开始日期</label>
            <input type="text" id="trip-edit-start" class="date-picker-input" value="${trip.startDate}">
        </div>
        <div class="form-group">
            <label>结束日期</label>
            <input type="text" id="trip-edit-end" class="date-picker-input" value="${trip.endDate}">
        </div>
        <div style="display:flex; gap:10px; margin-top:20px;">
            <button class="submit-btn" style="background:var(--bg-secondary); border:1px solid var(--glass-border); color:var(--text-primary)" onclick="closeModal()">取消</button>
            <button class="submit-btn" onclick="saveTripMetadata()">保存更改</button>
        </div>
    `;

    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('active');
    overlay.classList.remove('hidden');

    // Init Flatpickr Calendar
    if (typeof flatpickr !== 'undefined') {
        flatpickr(".date-picker-input", {
            locale: "zh",
            dateFormat: "Y-m-d",
            theme: "dark"
        });
    }

    // Auto-load some images based on the trip title
    const initialQuery = (trip.title || "travel").replace(/[^a-zA-Z\s]/g, '') || "travel";
    searchImages(initialQuery);
}

// --- Edit Stop Modal ---
function openEditModal(dayId, stopId) {
    setEditingContext(dayId, stopId, state.activeTripId);

    const trip = state.trips.find(t => t.id === state.activeTripId);
    const day = trip.days.find(d => d.id === dayId);
    const stop = day.stops.find(s => s.id === stopId);

    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    title.innerText = `Add more about your visit`;

    const mockThumb = `https://picsum.photos/seed/${stop.id}/150/100`;

    body.innerHTML = `
        <div class="visit-detail-card" style="background: var(--bg-primary); border-radius: 12px; padding: 1.2rem; border: 1px solid var(--glass-border); margin-bottom: 1.5rem; display:flex; gap: 1.5rem; align-items:center;">
            <div style="flex:1;">
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.8rem;">
                    <input type="text" id="stop-location" value="${stop.location}" style="font-size: 1.25rem; font-weight: bold; background:transparent; border:none; border-bottom: 1px dashed var(--text-secondary); color:var(--text-primary); outline:none; width: 100%; padding-bottom: 2px;">
                    <span style="color:var(--text-secondary);">✏️</span>
                </div>
                <div style="display:flex; gap:0.5rem;">
                    <button class="visit-detail-chip" style="background: rgba(167, 139, 250, 0.1); color: var(--accent-secondary); padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.9rem; font-weight: 600; border:none; cursor:pointer;" onclick="openTimePickerModal()">${day.date.substring(0, 5)}</button>
                    <button class="visit-detail-chip time-chip" style="background: rgba(167, 139, 250, 0.1); color: var(--accent-secondary); padding: 0.4rem 1rem; border-radius: 20px; font-size: 0.9rem; font-weight: 600; border:none; cursor:pointer;" onclick="openTimePickerModal()" data-vtime="${stop.time}" data-vperiod="${stop.period}">${stop.time} ${stop.period === 'AM' ? '上午' : '下午'}</button>
                </div>
            </div>
            <div style="position:relative; width:100px; height:65px; border-radius:8px; overflow:hidden; border: 1px solid var(--glass-border); flex-shrink:0;">
                <div style="position:absolute; inset:0; background-image:url('${mockThumb}'); background-size:cover; opacity: 0.6;"></div>
                <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; top:-5px;"><span style="font-size: 1.8rem;">📍</span></div>
            </div>
        </div>

        <div style="border: 2px dashed var(--glass-border); border-radius: 12px; padding: 2rem 1rem; text-align:center; color: var(--text-secondary); margin-bottom: 1.5rem; cursor:pointer; min-height:120px; display:flex; flex-direction:column; justify-content:center;">
            <div style="font-size: 2.5rem; margin-bottom:0.5rem; font-weight:300;">+</div>
            <div style="font-size: 1.1rem;">Pick media from your gallery</div>
            <div style="font-size:0.85rem; opacity:0.6; margin-top:0.5rem;">👥 Only your mutual followers can see your photos</div>
        </div>

        <div class="form-group" style="margin-bottom: 1.5rem;">
            <label style="font-size:0.95rem; font-weight:bold; margin-bottom:0.8rem; display:block;">地址</label>
            <input type="text" id="stop-address" value="${stop.address || ''}" placeholder="添加地址" style="width:100%; padding:0.8rem; background:transparent; border:1px solid var(--glass-border); border-radius:8px; color:var(--text-primary); outline:none;">
        </div>

        <div class="form-group" style="margin-bottom: 1.5rem;">
            <label style="font-size:0.95rem; font-weight:bold; margin-bottom:0.8rem; display:block;">电话</label>
            <input type="text" id="stop-phone" value="${stop.phone || ''}" placeholder="添加电话号码" style="width:100%; padding:0.8rem; background:transparent; border:1px solid var(--glass-border); border-radius:8px; color:var(--text-primary); outline:none;">
        </div>

        <div class="form-group" style="margin-bottom: 1.5rem;">
            <label style="font-size:0.95rem; font-weight:bold; margin-bottom:0.8rem; display:block;">备注</label>
            <textarea id="stop-note" placeholder="Add notes about your visit" style="min-height: 100px; font-size:1rem; padding: 1rem;">${stop.note || ''}</textarea>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:center; padding-top: 1rem; margin-top: 1.5rem;">
            <div style="display:flex; gap:1.2rem;">
                <button style="background:none; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; gap:5px; font-size:0.95rem;" onclick="openTimePickerModal()"><span style="font-size:1.1rem;">🕛</span> 添加时间</button>
                <button style="background:none; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; gap:5px; font-size:0.95rem;"><span style="font-size:1.1rem;">📎</span> 附加 <span style="background:var(--accent-primary); color:#FFF; font-size:0.65rem; padding: 2px 6px; border-radius:4px;">PRO</span></button>
                <button style="background:none; border:none; color:var(--text-secondary); cursor:pointer; display:flex; align-items:center; gap:5px; font-size:0.95rem;" onclick="openExpenseModal()"><span style="font-size:1.1rem;">💲</span> 添加费用</button>
            </div>
            <button class="menu-dots text-danger" style="position:static; margin:0; padding:5px;" onclick="deleteStop()"><span style="font-size:1.4rem;">🗑️</span></button>
        </div>

        <button class="submit-btn" style="background: #f05252; color: white; margin-top: 2rem; border-radius: 30px; padding: 1rem; font-size:1.1rem; font-weight:bold;" onclick="saveStop()">保存</button>
    `;

    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('active');
    overlay.classList.remove('hidden');
}

// --- Sidebar Navigation ---
function scrollToDay(id) {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    trip.activeDayId = id;

    // Update the active state in the sidebar directly without a full render
    const sidebarNav = document.getElementById('sidebar-nav');
    if (sidebarNav) {
        Array.from(sidebarNav.children).forEach(li => {
            li.classList.remove('active');
            if (li.getAttribute('onclick') && li.getAttribute('onclick').includes(id)) {
                li.classList.add('active');
            }
        });
    }

    // Auto-expand clicked day, collapse all others
    state.collapsedDays = state.collapsedDays || {};
    let needsMapRender = false;

    trip.days.forEach(d => {
        const isTarget = d.id === id;
        const willCollapse = !isTarget;

        if (state.collapsedDays[d.id] !== willCollapse) {
            state.collapsedDays[d.id] = willCollapse;
            needsMapRender = true;

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

    if (needsMapRender) {
        saveData();
        if (window._realInitGoogleMaps) {
            window._realInitGoogleMaps();
        }
    }

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
function editDay(dayId) {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const day = trip.days.find(d => d.id === dayId);
    if (!day) return;

    const title = document.getElementById('sub-modal-title');
    const body = document.getElementById('sub-modal-body');
    title.innerText = '修改日期';

    // Parse date for flatpickr
    let defaultDate = "today";
    if (day.date) {
        defaultDate = day.date.replace(/[年月日]/g, '-').replace(/-$/, '');
    }

    body.innerHTML = `
        <div class="form-group" style="margin-bottom: 1.5rem;">
            <label style="font-size:0.95rem; font-weight:bold; margin-bottom:0.8rem; display:block;">选择新日期</label>
            <input type="text" id="edit-day-date" class="date-picker-input" value="${defaultDate}" placeholder="选择日期" style="width:100%; padding:0.8rem; background:var(--bg-primary); border:1px solid var(--glass-border); border-radius:8px; color:var(--text-primary); outline:none;">
        </div>
        <button class="submit-btn" style="background: var(--accent-primary); color: white; width: 100%; border-radius: 8px; padding: 0.8rem; margin-bottom: 1.5rem; font-size:1rem; font-weight:bold; border:none; cursor:pointer;" onclick="saveEditDay('${dayId}')">保存修改</button>
    `;

    const overlay = document.getElementById('sub-modal-overlay');
    overlay.classList.add('active');
    overlay.classList.remove('hidden');

    if (typeof flatpickr !== 'undefined') {
        flatpickr("#edit-day-date", {
            dateFormat: "Y-m-d",
            defaultDate: defaultDate,
            locale: "zh",
            theme: "dark"
        });
    }
}

function saveEditDay(dayId) {
    const dp = document.getElementById('edit-day-date');
    if (!dp || !dp.value) return;

    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const day = trip.days.find(d => d.id === dayId);
    if (!day) return;

    const dObj = new Date(dp.value.replace(/-/g, '/'));
    if (!isNaN(dObj.getTime())) {
        day.date = `${dObj.getFullYear()}年${dObj.getMonth() + 1}月${dObj.getDate()}日`;
        saveData();
        renderApp();
    }
    closeSubModal();
}

function editDaySubtitle(dayId) {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    if (!trip) return;
    const day = trip.days.find(d => d.id === dayId);
    if (!day) return;

    const newSub = prompt("请输入副标题：", day.subtitle || "");
    if (newSub !== null) {
        day.subtitle = newSub.trim();
        saveData();
        const subSpan = document.getElementById(`day-subtitle-${dayId}`);
        if (subSpan) {
            subSpan.innerText = day.subtitle || '添加副标题';
        }
    }
}

function toggleOverview() {
    const ov = document.getElementById('sidebar-overview');
    const icon = document.getElementById('overview-icon');
    if (!ov || !icon) return;
    if (ov.style.display === 'none') {
        ov.style.display = 'block';
        icon.innerText = '▼';
    } else {
        ov.style.display = 'none';
        icon.innerText = '▶';
    }
}

function toggleDayCollapse(dayId) {
    state.collapsedDays = state.collapsedDays || {};
    state.collapsedDays[dayId] = !state.collapsedDays[dayId];

    const content = document.getElementById(`day-content-${dayId}`);
    if (content) {
        content.style.display = state.collapsedDays[dayId] ? 'none' : 'block';
    }

    const arrow = document.getElementById(`collapse-arrow-${dayId}`);
    if (arrow) {
        arrow.style.transform = state.collapsedDays[dayId] ? 'rotate(-90deg)' : 'rotate(0deg)';
    }

    // Save collapse state and trigger map re-render
    saveData();
    if (window._realInitGoogleMaps) {
        window._realInitGoogleMaps();
    }
}

// --- Drag & Drop ---
let draggedItem = null;
let draggedDayId = null;



let _autoScrollRaf = null;
let _globalDragOverHandler = null;

function _getScrollContainer() {
    return document.getElementById('itinerary-scroll-container') || document.documentElement;
}

function _startAutoScroll(clientY) {
    const EDGE = 80;
    const MAX_SPEED = 14;
    const vh = window.innerHeight;
    if (_autoScrollRaf) cancelAnimationFrame(_autoScrollRaf);

    // Use bottom of the sticky trip header as the scroll-up trigger boundary
    const headerEl = document.getElementById('trip-header-bar');
    const headerBottom = headerEl ? headerEl.getBoundingClientRect().bottom : 0;
    const upThreshold = headerBottom + EDGE;

    let speed = 0;
    if (clientY < upThreshold) speed = -MAX_SPEED * (1 - Math.max(0, clientY - headerBottom) / EDGE);
    else if (clientY > vh - EDGE) speed = MAX_SPEED * ((clientY - (vh - EDGE)) / EDGE);

    if (speed !== 0) {
        const container = _getScrollContainer();
        const loop = () => {
            container.scrollTop += speed;
            _autoScrollRaf = requestAnimationFrame(loop);
        };
        _autoScrollRaf = requestAnimationFrame(loop);
    }
}

function handleDragStart(e, dayId, stopId) {
    draggedItem = stopId;
    draggedDayId = dayId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', stopId);
    e.target.style.opacity = '0.4';

    // Global listener so auto-scroll works everywhere, including above all droppable elements
    _globalDragOverHandler = (ev) => _startAutoScroll(ev.clientY);
    document.addEventListener('dragover', _globalDragOverHandler);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleDragEnter(e) {
    e.preventDefault();
    const wrapper = e.target.closest('.timeline-item-wrapper');
    if (wrapper) {
        wrapper.style.borderTop = '2px dashed var(--accent-primary)';
        wrapper.style.paddingTop = '10px';
    }
}

function handleDragLeave(e) {
    const wrapper = e.target.closest('.timeline-item-wrapper');
    if (wrapper) {
        wrapper.style.borderTop = 'none';
        wrapper.style.paddingTop = '0';
    }
}

function handleDrop(e, targetDayId, targetStopId) {
    e.stopPropagation();
    e.preventDefault();

    const wrapper = e.target.closest('.timeline-item-wrapper');
    if (wrapper) {
        wrapper.style.borderTop = 'none';
        wrapper.style.paddingTop = '0';
    }

    if (!draggedItem || !draggedDayId) return;
    if (draggedItem === targetStopId) return;

    const trip = state.trips.find(t => t.id === state.activeTripId);
    const sourceDay = trip.days.find(d => d.id === draggedDayId);
    const targetDay = trip.days.find(d => d.id === targetDayId);

    if (!sourceDay || !targetDay) return;

    let sourceIndex = sourceDay.stops.findIndex(s => s.id === draggedItem);
    let targetIndex = targetDay.stops.findIndex(s => s.id === targetStopId);

    if (sourceIndex >= 0 && targetIndex >= 0) {
        const [movedStop] = sourceDay.stops.splice(sourceIndex, 1);
        targetDay.stops.splice(targetIndex, 0, movedStop);
        saveData();

        // Re-render only affected days to avoid full page flash

        if (draggedDayId !== targetDayId) {
            const sDayIndex = trip.days.findIndex(d => d.id === draggedDayId);
            const temp1 = document.createElement('div');
            temp1.innerHTML = getDayHTML(sourceDay, sDayIndex, state.activeTripId);
            const srcEl = document.getElementById(draggedDayId);
            if (srcEl) srcEl.replaceWith(temp1.firstElementChild);
        }

        const tDayIndex = trip.days.findIndex(d => d.id === targetDayId);
        const temp2 = document.createElement('div');
        temp2.innerHTML = getDayHTML(targetDay, tDayIndex, state.activeTripId);
        const tgtEl = document.getElementById(targetDayId);
        if (tgtEl) tgtEl.replaceWith(temp2.firstElementChild);

        // Refresh map markers + route + transit data for affected days
        if (window.googleMapsReady) {
            import('../../maps.js').then(m => {
                m.initRealMap();  // update markers & route line
                m.computeTransitData(targetDayId);
                if (draggedDayId !== targetDayId) {
                    m.computeTransitData(draggedDayId);
                }
            });
        }
    }

    draggedItem = null;
    draggedDayId = null;
    return false;
}

function handleDragEnd(e) {
    if (_autoScrollRaf) { cancelAnimationFrame(_autoScrollRaf); _autoScrollRaf = null; }
    if (_globalDragOverHandler) {
        document.removeEventListener('dragover', _globalDragOverHandler);
        _globalDragOverHandler = null;
    }
    if (e.target.style) e.target.style.opacity = '1';
    const wrappers = document.querySelectorAll('.timeline-item-wrapper');
    wrappers.forEach(w => {
        w.style.borderTop = 'none';
        w.style.paddingTop = '0';
    });
    draggedItem = null;
    draggedDayId = null;
}

// --- Time Picker & Expense Modals ---
let isDirectEdit = false;

function openTimePickerDirectly(event, dayId, stopId) {
    event.stopPropagation();
    setEditingContext(dayId, stopId, state.activeTripId);
    isDirectEdit = true;
    openTimePickerModal();
}

function openExpenseDirectly(event, dayId, stopId) {
    event.stopPropagation();
    setEditingContext(dayId, stopId, state.activeTripId);
    isDirectEdit = true;
    openExpenseModal();
}

function openTimePickerModal() {
    const title = document.getElementById('sub-modal-title');
    const body = document.getElementById('sub-modal-body');
    title.innerText = '';

    let timeHtml = '';
    const startHour = 8;
    for (let i = 0; i < 12; i++) {
        let h = startHour + i;
        let period = h >= 12 ? '下午' : '上午';
        let displayH = h > 12 ? h - 12 : h;
        let padH = (displayH < 10 ? '0' : '') + displayH;
        timeHtml += `<li style="padding: 1rem 1.5rem; cursor:pointer; border-bottom: 1px solid var(--glass-border); font-size:1.1rem; transition: background 0.2s;" onmouseover="this.style.background='var(--glass-border)'" onmouseout="this.style.background='none'" onclick="selectMockTime('${padH}:00', '${period === '上午' ? 'AM' : 'PM'}')">${displayH}:00 ${period}</li>`;
        timeHtml += `<li style="padding: 1rem 1.5rem; cursor:pointer; border-bottom: 1px solid var(--glass-border); font-size:1.1rem; transition: background 0.2s;" onmouseover="this.style.background='var(--glass-border)'" onmouseout="this.style.background='none'" onclick="selectMockTime('${padH}:30', '${period === '上午' ? 'AM' : 'PM'}')">${displayH}:30 ${period}</li>`;
    }

    body.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; gap:1rem; margin-bottom: 1.5rem;">
            <div style="background: rgba(167, 139, 250, 0.1); color: var(--accent-secondary); border: 2px solid var(--accent-primary); padding: 0.6rem 1.5rem; border-radius: 8px; font-weight:bold; font-size:1.1rem;">开始时间</div>
            <span style="color:var(--text-secondary)">—</span>
            <div style="background: var(--bg-primary); padding: 0.6rem 1.5rem; border-radius: 8px; color:var(--text-secondary); font-size:1.1rem;">结束时间</div>
        </div>
        <div style="max-height: 300px; overflow-y:auto; border: 1px solid var(--glass-border); border-radius: 8px; margin-bottom: 1.5rem; background: var(--bg-primary);">
            <ul style="list-style:none; padding:0; margin:0; color:var(--text-primary);">
                ${timeHtml}
            </ul>
        </div>
        <div style="display:flex; gap:1rem; justify-content:center;">
            <button class="submit-btn" style="background:var(--bg-primary); color:var(--text-primary); flex:1; font-size:1.1rem;" onclick="closeSubModal()">清除</button>
            <button class="submit-btn" style="background:#f05252; flex:1; font-weight:bold; font-size:1.1rem;" onclick="closeSubModal()">保存</button>
        </div>
    `;

    const overlay = document.getElementById('sub-modal-overlay');
    overlay.classList.add('active');
    overlay.classList.remove('hidden');
}

function selectMockTime(time, period) {
    if (isDirectEdit) {
        const trip = state.trips.find(t => t.id === state.activeTripId);
        const day = trip.days.find(d => d.id === editState.editingDayId);
        const stop = day.stops.find(s => s.id === editState.editingStopId);
        if (stop) {
            stop.time = time;
            stop.period = period;
        }
        saveData();
        renderApp();
        isDirectEdit = false;
    } else {
        const chip = document.querySelector('.time-chip');
        if (chip) {
            chip.innerText = `${time} ${period === 'AM' ? '上午' : '下午'}`;
            chip.dataset.vtime = time;
            chip.dataset.vperiod = period;
        }
    }
    closeSubModal();
}

function openExpenseModal() {
    const title = document.getElementById('sub-modal-title');
    const body = document.getElementById('sub-modal-body');
    title.innerText = '添加费用';

    const trip = state.trips.find(t => t.id === state.activeTripId);
    const day = trip.days.find(d => d.id === editState.editingDayId);
    const stop = editState.editingStopId ? day.stops.find(s => s.id === editState.editingStopId) : { location: '', price: '' };

    body.innerHTML = `
        <div class="form-group" style="position:relative; margin-bottom:1.5rem;">
            <div style="display:flex; align-items:center; border: 2px solid rgba(167, 139, 250, 0.4); border-radius:12px; padding: 1rem; font-size: 1.5rem; font-weight:bold;">
                <span style="color:var(--text-primary); margin-right:5px;">$ ▼</span>
                <input type="number" id="expense-amount" placeholder="0" value="${stop.price || ''}" style="border:none; background:transparent; color:var(--text-primary); font-size: 1.5rem; font-weight:bold; width:100%; outline:none;">
            </div>
        </div>
        <div class="form-group" style="margin-bottom:1.5rem; display:flex; align-items:center; justify-content:space-between; border: 1px solid var(--glass-border); padding:1rem 1.2rem; border-radius:12px; cursor:pointer; background: var(--bg-primary);">
            <span style="font-size:1.1rem;">✈️ 航班</span>
            <span>></span>
        </div>
        <div class="form-group" style="margin-bottom:1.5rem;">
            <label style="font-size:0.95rem; font-weight:bold; margin-bottom:0.5rem; display:block;">添加描述</label>
            <textarea style="min-height: 80px; padding:1rem; background:var(--bg-primary); border: 1px solid var(--glass-border); border-radius:12px; color:var(--text-primary); width:100%; box-sizing:border-box;">${stop.location || '目的地费用'}</textarea>
        </div>
        <div class="form-group" style="display:flex; align-items:center; justify-content:space-between; border: 1px solid var(--glass-border); padding:1rem 1.2rem; border-radius:12px; margin-bottom:1.5rem; background: var(--bg-primary);">
            <span style="color:var(--text-primary); font-size:1.1rem;">付款人</span>
            <span style="color:var(--text-primary); font-weight:bold; font-size:1.1rem;">${state.user?.name || '您'} ▼</span>
        </div>
        <div class="form-group" style="display:flex; align-items:center; justify-content:space-between; border: 1px solid var(--glass-border); padding:1rem 1.2rem; border-radius:12px; margin-bottom:2rem; background: var(--bg-primary);">
            <span style="color:var(--text-primary); font-size:1.1rem;">分摊</span>
            <span style="color:var(--text-primary); font-weight:bold; font-size:1.1rem;">不分摊 ▼</span>
        </div>
        
        <div style="display:flex; gap:1rem; align-items:center; justify-content:space-between;">
            <div style="color:var(--text-secondary);"><span style="font-size:1rem;">日期:</span> <strong>${day.date.substring(0, 5)} ▼</strong></div>
            <div style="display:flex; gap:0.5rem;">
                <button class="submit-btn" style="background:var(--bg-primary); color:var(--text-primary); padding: 0.8rem 1.5rem;" onclick="closeSubModal()">🗑️</button>
                <button class="submit-btn" style="background:#f05252; padding: 0.8rem 2.5rem; font-weight:bold;" onclick="saveMockExpense()">保存</button>
            </div>
        </div>
    `;

    const overlay = document.getElementById('sub-modal-overlay');
    overlay.classList.add('active');
    overlay.classList.remove('hidden');
}

function saveMockExpense() {
    const amount = document.getElementById('expense-amount').value;
    const trip = state.trips.find(t => t.id === state.activeTripId);
    const day = trip.days.find(d => d.id === editState.editingDayId);

    if (editState.editingStopId) {
        const stop = day.stops.find(s => s.id === editState.editingStopId);
        if (stop) stop.price = amount;
    }

    if (isDirectEdit) {
        saveData();
        renderApp();
        isDirectEdit = false;
    }
    closeSubModal();
}

// --- Exports ---
export {
    closeModal, closeSubModal, openModal, openConfirmModal,
    openEditTripModal, openEditModal,
    scrollToDay, editDay, saveEditDay, editDaySubtitle, toggleOverview, toggleDayCollapse,
    handleDragStart, handleDragOver, handleDragEnter, handleDragLeave, handleDrop, handleDragEnd,
    openTimePickerDirectly, openExpenseDirectly,
    openTimePickerModal, openExpenseModal,
    selectMockTime, saveMockExpense
};
