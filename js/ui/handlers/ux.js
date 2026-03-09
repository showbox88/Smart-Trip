import { state, editState, setEditingContext } from '../../state.js';
import { renderApp } from '../render.js';
import { saveData } from '../../api.js';
import { searchImages, searchGoogleStopImages } from './search.js';
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
    window._isUploadingThumb = false; // Reset lock when opening modal
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
        <div class="form-group">
            <label>行程状态</label>
            <div class="status-selector-group" style="display:flex; background:var(--bg-primary); padding:4px; border-radius:10px; border:1px solid var(--glass-border); gap:4px;">
                <button type="button" onclick="window._setEditStatus('ongoing', this)" class="status-choice-btn ${trip.status === 'ongoing' ? 'active' : ''}" style="flex:1; padding:8px; border:none; border-radius:7px; cursor:pointer; font-size:0.85rem; transition:all 0.2s; background:${trip.status === 'ongoing' ? 'var(--accent-primary)' : 'transparent'}; color:${trip.status === 'ongoing' ? '#fff' : 'var(--text-secondary)'};">进行中</button>
                <button type="button" onclick="window._setEditStatus('planned', this)" class="status-choice-btn ${trip.status === 'planned' || !trip.status ? 'active' : ''}" style="flex:1; padding:8px; border:none; border-radius:7px; cursor:pointer; font-size:0.85rem; transition:all 0.2s; background:${(trip.status === 'planned' || !trip.status) ? 'var(--accent-primary)' : 'transparent'}; color:${(trip.status === 'planned' || !trip.status) ? '#fff' : 'var(--text-secondary)'};">计划中</button>
                <button type="button" onclick="window._setEditStatus('completed', this)" class="status-choice-btn ${trip.status === 'completed' ? 'active' : ''}" style="flex:1; padding:8px; border:none; border-radius:7px; cursor:pointer; font-size:0.85rem; transition:all 0.2s; background:${trip.status === 'completed' ? 'var(--accent-primary)' : 'transparent'}; color:${trip.status === 'completed' ? '#fff' : 'var(--text-secondary)'};">已完成</button>
            </div>
            <input type="hidden" id="trip-edit-status" value="${trip.status || 'planned'}">
        </div>
        <div class="form-group" style="margin-bottom: 0.5rem;">
            <label>封面图片</label>
            <div style="display:flex; gap:0.5rem; margin-bottom:0.8rem;">
                <button class="btn-primary" onclick="document.getElementById('thumb-upload-input').click()" style="padding:0 1rem; font-size: 0.85rem; background: var(--bg-secondary); border: 1px solid var(--glass-border);">上传本地图片</button>
                <input type="file" id="thumb-upload-input" style="display:none;" accept="image/*" onchange="handleTripThumbUpload(event)">
                <input type="text" id="trip-edit-search" placeholder="或搜索在线图片..." style="flex:1; background:var(--bg-primary); border:1px solid var(--glass-border); padding:0.6rem 0.8rem; border-radius:8px; color:var(--text-primary);" onkeydown="if(event.key === 'Enter') searchImages()">
                <button class="btn-primary" onclick="searchImages()" style="padding:0 1rem; font-size: 0.85rem;">搜索</button>
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

function handleTripThumbUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    window._isUploadingThumb = true; // Block auto-search from overwriting

    if (!file.type.startsWith('image/')) {
        alert('请选择图片文件');
        return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
        const base64Data = e.target.result;

        // Show immediate local preview
        const grid = document.getElementById('image-grid');
        if (grid) {
            grid.innerHTML = `<p style="grid-column: span 3; text-align:center; color:var(--text-secondary);">正在持久化存储图片...</p>`;
        }

        // --- Step 2: Send to Backend to convert Base64 to physical file ---
        fetch('/api/upload-local', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ image: base64Data })
        })
            .then(r => r.json())
            .then(result => {
                if (result.status === 'success' && result.localUrl) {
                    const finalUrl = result.localUrl;
                    const thumbInput = document.getElementById('trip-edit-thumb');
                    if (thumbInput) thumbInput.value = finalUrl;

                    const trip = state.trips.find(t => t.id === state.activeTripId);
                    if (trip) {
                        trip.thumb = finalUrl;
                        // Persist state with the new local URL
                        import('../../api.js').then(m => m.saveData());
                        import('../render.js').then(m => m.renderApp());
                    }

                    // Update all UI previews
                    if (grid) {
                        grid.innerHTML = `
                        <div class="image-option selected" style="position:relative; width:100%; aspect-ratio:3/2; overflow:hidden; border-radius:8px; border:2px solid var(--accent-primary); background:#000;">
                            <img src="${finalUrl}" style="width:100%; height:100%; object-fit:contain;">
                            <div style="position:absolute; top:4px; right:4px; background:var(--accent-primary); color:white; border-radius:50%; width:20px; height:20px; display:flex; align-items:center; justify-content:center; font-size:12px;">✓</div>
                        </div>
                    `;
                    }

                    const modalCover = document.querySelector('.edit-trip-modal .modal-cover');
                    if (modalCover) modalCover.style.backgroundImage = `url('${finalUrl}')`;

                    const itineraryThumb = document.getElementById('itinerary-header-thumb');
                    if (itineraryThumb) itineraryThumb.style.backgroundImage = `url('${finalUrl}')`;
                } else {
                    alert('图片上传失败: ' + (result.message || '未知错误'));
                }
            })
            .catch(err => {
                console.error('[Upload-Local] failed:', err);
                alert('服务器连接失败，请确认 server.py 正在运行且文件大小未超限。');
            });
    };
    reader.readAsDataURL(file);
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

    const subSpan = document.getElementById(`day-subtitle-${dayId}`);
    if (!subSpan) return;

    // Prevent multiple inputs if already editing
    if (subSpan.querySelector('input')) return;

    const currentText = day.subtitle || '';
    subSpan.innerHTML = `<input type="text" value="${currentText}" style="background:transparent; border:none; border-bottom:1px solid var(--accent-primary); outline:none; color:var(--text-primary); font-size:inherit; font-family:inherit; padding: 0; min-width: 250px;" placeholder="添加副标题">`;

    const inputField = subSpan.querySelector('input');
    inputField.focus();
    inputField.selectionStart = inputField.selectionEnd = inputField.value.length;

    const saveSubtitle = () => {
        const newSub = inputField.value.trim();
        day.subtitle = newSub;
        saveData();
        subSpan.innerText = day.subtitle || '添加副标题';
    };

    inputField.addEventListener('blur', saveSubtitle);
    inputField.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            inputField.blur();
        }
    });
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
    e.target.classList.add('dragging');
    // Also add to parent wrapper if target is an inner element
    const wrapper = e.target.closest('.timeline-item-wrapper');
    if (wrapper) wrapper.classList.add('dragging');

    // Global listener so auto-scroll works everywhere, including above all droppable elements
    _globalDragOverHandler = (ev) => _startAutoScroll(ev.clientY);
    document.addEventListener('dragover', _globalDragOverHandler);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    let wrapper = e.target.closest('.timeline-item-wrapper');
    const wrappers = Array.from(document.querySelectorAll('.timeline-item-wrapper'));
    const draggedWrapper = document.querySelector(`.id-${draggedItem}`);
    if (!draggedWrapper) return false;

    // If mouse is inside a gap or outside a specific wrapper, find the closest one vertically
    if (!wrapper) {
        let minDist = Infinity;
        wrappers.forEach(w => {
            if (w === draggedWrapper) return;
            const rect = w.getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            const dist = Math.abs(e.clientY - midY);
            if (dist < minDist) {
                minDist = dist;
                wrapper = w;
            }
        });
    }

    if (!wrapper || wrapper.classList.contains('dragging')) return false;

    const rect = wrapper.getBoundingClientRect();

    const srcIdx = wrappers.indexOf(draggedWrapper);
    const tgtIdx = wrappers.indexOf(wrapper);
    if (srcIdx === -1 || tgtIdx === -1) return false;

    const THRESHOLD = 10;

    if (srcIdx < tgtIdx) {
        const crossed = e.clientY > rect.top + THRESHOLD;
        const maxYieldIdx = crossed ? tgtIdx : tgtIdx - 1;

        wrappers.forEach((w, i) => {
            if (i === srcIdx || w.classList.contains('dragging')) return;
            if (i > srcIdx && i <= maxYieldIdx) {
                w.classList.add('drag-yield-up');
                w.classList.remove('drag-yield-down');
            } else {
                w.classList.remove('drag-yield-up', 'drag-yield-down');
            }
        });
    } else if (srcIdx > tgtIdx) {
        const crossed = e.clientY < rect.bottom - THRESHOLD;
        const minYieldIdx = crossed ? tgtIdx : tgtIdx + 1;

        wrappers.forEach((w, i) => {
            if (i === srcIdx || w.classList.contains('dragging')) return;
            if (i >= minYieldIdx && i < srcIdx) {
                w.classList.add('drag-yield-down');
                w.classList.remove('drag-yield-up');
            } else {
                w.classList.remove('drag-yield-up', 'drag-yield-down');
            }
        });
    }

    return false;
}

function handleDragEnter(e) {
    e.preventDefault();
}

function handleDragLeave(e) {
    // Cleaning up is fully handled by dragover and dragend robustly.
}

function handleDrop(e, targetDayId, dropZoneStopId) {
    e.stopPropagation();
    e.preventDefault();

    if (!draggedItem || !draggedDayId) return;

    // We must find out exactly where the user 'intended' to drop based on the visual
    // yield gap, because the mouse might not be directly over `dropZoneStopId`.
    const wrappers = Array.from(document.querySelectorAll('.timeline-item-wrapper'));
    const draggedWrapper = document.querySelector(`.id-${draggedItem}`);

    // Find where the visual gap is. We look for the first item that yielded DOWN, 
    // or the last item that yielded UP.
    let yieldedDownIdx = wrappers.findIndex(w => w.classList.contains('drag-yield-down'));
    let yieldedUpIdx = wrappers.findLastIndex(w => w.classList.contains('drag-yield-up'));

    // Clear visual classes
    wrappers.forEach(w => w.classList.remove('drag-yield-down', 'drag-yield-up', 'dragging'));

    const srcIdx = wrappers.indexOf(draggedWrapper);
    if (srcIdx === -1) {
        draggedItem = null;
        draggedDayId = null;
        return;
    }

    let intendedTargetWrapper = null;
    let insertAfter = false;
    let actualTargetDayId = null;
    let actualTargetStopId = null;

    // Logic: If items yielded down, we insert BEFORE the first item that yielded down.
    // That means we target the item that yielded down, and insertAfter = false.
    if (yieldedDownIdx !== -1) {
        intendedTargetWrapper = wrappers[yieldedDownIdx];
        insertAfter = false;
    }
    // If items yielded up, we insert AFTER the last item that yielded up.
    // That means we target the item that yielded up, and insertAfter = true.
    else if (yieldedUpIdx !== -1) {
        intendedTargetWrapper = wrappers[yieldedUpIdx];
        insertAfter = true;
    }
    // If no visual yield happened, fallback to dropZoneStopId (e.g. dropped exactly on self, or edge of list)
    else {
        if (dropZoneStopId) {
            intendedTargetWrapper = document.querySelector(`.id-${dropZoneStopId}`);
            // If it was dropped back on itself or we failed to find target, do nothing
            if (!intendedTargetWrapper || draggedWrapper === intendedTargetWrapper) {
                draggedItem = null;
                draggedDayId = null;
                return;
            }
            // Basic fallback: if dragging down, insert after; if dragging up, insert before
            const tgtIdx = wrappers.indexOf(intendedTargetWrapper);
            insertAfter = srcIdx < tgtIdx;
        } else {
            // Dropped on empty space or day container with no yield gap detected
            // Fallback: Drop at the end of the provided targetDayId
            actualTargetDayId = targetDayId;
            actualTargetStopId = null; // Indicates appending to end
        }
    }

    if (intendedTargetWrapper) {
        const targetDaySection = intendedTargetWrapper.closest('.day-section');
        if (!targetDaySection) {
            draggedItem = null;
            draggedDayId = null;
            return;
        }
        actualTargetDayId = targetDaySection.id;

        // Extract stop id from class like "id-s12345"
        const classList = Array.from(intendedTargetWrapper.classList);
        const idClass = classList.find(c => c.startsWith('id-'));
        if (idClass) actualTargetStopId = idClass.substring(3);
    }

    if (!actualTargetDayId) {
        draggedItem = null;
        draggedDayId = null;
        return;
    }

    const trip = state.trips.find(t => t.id === state.activeTripId);
    const sourceDay = trip.days.find(d => d.id === draggedDayId);
    const targetDay = trip.days.find(d => d.id === actualTargetDayId);

    if (!sourceDay || !targetDay) return;

    let sourceIndex = sourceDay.stops.findIndex(s => s.id === draggedItem);
    let targetIndex = -1;
    if (actualTargetStopId) {
        targetIndex = targetDay.stops.findIndex(s => s.id === actualTargetStopId);
    }

    if (sourceIndex >= 0) {
        const [movedStop] = sourceDay.stops.splice(sourceIndex, 1);

        if (actualTargetStopId && targetIndex >= 0) {
            // Determine final index dynamically
            let finalTargetIndex = targetDay.stops.findIndex(s => s.id === actualTargetStopId);
            if (insertAfter) finalTargetIndex++;
            targetDay.stops.splice(finalTargetIndex, 0, movedStop);
        } else {
            // Target empty zone or item not found, just append to day
            targetDay.stops.push(movedStop);
        }

        saveData();

        const srcCountSpan = document.getElementById(`sidebar-count-${draggedDayId}`);
        const sourceLocationStops = sourceDay.stops.filter(s => s.type === 'location' || !s.type).length;
        if (srcCountSpan) srcCountSpan.innerText = `共 ${sourceLocationStops} 站行程`;

        const tgtCountSpan = document.getElementById(`sidebar-count-${actualTargetDayId}`);
        const targetLocationStops = targetDay.stops.filter(s => s.type === 'location' || !s.type).length;
        if (tgtCountSpan) tgtCountSpan.innerText = `共 ${targetLocationStops} 站行程`;

        if (actualTargetDayId !== draggedDayId) {
            const sDayIndex = trip.days.findIndex(d => d.id === draggedDayId);
            const temp1 = document.createElement('div');
            temp1.innerHTML = getDayHTML(sourceDay, sDayIndex, state.activeTripId);
            const srcEl = document.getElementById(draggedDayId);
            if (srcEl) srcEl.replaceWith(temp1.firstElementChild);
        }

        const tDayIndex = trip.days.findIndex(d => d.id === actualTargetDayId);
        const temp2 = document.createElement('div');
        temp2.innerHTML = getDayHTML(targetDay, tDayIndex, state.activeTripId);
        const tgtEl = document.getElementById(actualTargetDayId);
        if (tgtEl) tgtEl.replaceWith(temp2.firstElementChild);

        if (window.googleMapsReady) {
            import('../../maps.js').then(m => {
                m.initRealMap();
                m.computeTransitData(actualTargetDayId);
                if (draggedDayId !== actualTargetDayId) {
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
    if (e.target && e.target.classList) {
        e.target.classList.remove('dragging');
    }
    const wrappers = document.querySelectorAll('.timeline-item-wrapper');
    wrappers.forEach(w => {
        w.classList.remove('dragging', 'drag-yield-down', 'drag-yield-up');
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

    // Get formatted date like "10/26"
    const dateStr = day.date.split('月');
    let formattedDate = '添加日期';
    if (dateStr.length > 1) {
        const month = parseInt(dateStr[0].replace(/[^0-9]/g, '')).toString().padStart(2, '0');
        const dStr = dateStr[1].split('日');
        const d = parseInt(dStr[0].replace(/[^0-9]/g, '')).toString().padStart(2, '0');
        formattedDate = `${month}/${d}`;
    }

    // Category Icons Map
    const categoryIcons = {
        '航班': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:white;"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg>',
        '住宿': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:white;"><path d="M7 13c1.66 0 3-1.34 3-3S8.66 7 7 7s-3 1.34-3 3 1.34 3 3 3zm12-6h-8v7H3V5H1v15h2v-3h18v3h2v-9c0-2.21-1.79-4-4-4z"/></svg>',
        '租车': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:white;"><path d="M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z"/></svg>',
        '交通': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:white;"><path d="M12 2c-4 0-8 .5-8 4v9.5C4 17.43 5.57 19 7.5 19L6 20.5v.5h12v-.5L16.5 19c1.93 0 3.5-1.57 3.5-3.5V6c0-3.5-3.58-4-8-4zm5.66 3H6.34C6.83 4.15 8.95 4 12 4c3.05 0 5.17.15 5.66 1zM11 7v3H6V7h5zm2 0h5v3h-5V7zm-1.5 10.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zm5-5H7.5c-1.1 0-2-.9-2-2v-1h13v1c0 1.1-.9 2-2 2z"/></svg>',
        '餐饮': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:white;"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>',
        '饮料': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:white;"><path d="M21 5V3H3v2l8 9v5H6v2h12v-2h-5v-5l8-9zM7.43 7L5.66 5h12.69l-1.78 2H7.43z"/></svg>',
        '观光': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:white;"><path d="M12 3L2 12h3v8h6v-6h2v6h6v-8h3L12 3zm0 2.8L18.7 10H5.3L12 5.8z"/></svg>',
        '活动': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:white;"><path d="M16.5 10V9h-2v1H12V9h-2v1H8V9H6v1c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V12c0-1.1-.9-2-2-2h-3.5zm-3 8h-3v-3h3v3zm4 0h-3v-3h3v3zm0-4h-3v-3h3v3zm-4 0h-3v-3h3v3zM6 18v-3h3v3H6zm0-4v-3h3v3H6zm10.5-8V4h-9v2H6V4c0-1.1.9-2 2-2h9c1.1 0 2 .9 2 2v2h-2.5z"/></svg>',
        '购物': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:white;"><path d="M18 6h-2c0-2.21-1.79-4-4-4S8 3.79 8 6H6c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6-2c1.1 0 2 .9 2 2h-4c0-1.1.9-2 2-2zm6 16H6V8h2v2c0 .55.45 1 1 1s1-.45 1-1V8h4v2c0 .55.45 1 1 1s1-.45 1-1V8h2v12z"/></svg>',
        '汽油': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:white;"><path d="M19.77 7.23l.01-.01-3.72-3.72L15 4.56l2.11 2.11C16.17 7 15.5 8.22 15.5 9.5c0 2.48 2.02 4.5 4.5 4.5V22h2V11c0-2.05-1.63-3.73-3.66-3.87.12-.2.21-.42.27-.65.06-.27.16-.54.16-.85 0-.58-.23-1.1-.58-1.4h-.01zM20 12c-1.38 0-2.5-1.12-2.5-2.5S18.62 7 20 7s2.5 1.12 2.5 2.5S21.38 12 20 12zM12 10H4v6h8v-6zm0-6H4c-1.1 0-2 .9-2 2v16h12V6c0-1.1-.9-2-2-2zM4 2h12v2H4z"/></svg>',
        '杂货': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:white;"><path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/></svg>',
        '其他': '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="color:white;"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>'
    };

    const currentCat = stop.expenseCategory || '活动';
    const currentIcon = categoryIcons[currentCat] || categoryIcons['活动'];

    body.innerHTML = `
        <style>
            .expense-modal-group {
                border: 1px solid var(--glass-border);
                border-radius: 8px;
                background: var(--bg-primary);
                margin-bottom: 12px;
                overflow: hidden;
            }
            .expense-modal-row {
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 14px 16px;
                font-size: 1rem;
                color: var(--text-primary);
            }
            .expense-modal-row:not(:last-child) {
                border-bottom: 1px solid var(--glass-border);
            }
            .expense-dropdown-text {
                flex-shrink: 0;
                font-weight: 600;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .expense-cat-grid {
                display: none;
                grid-template-columns: repeat(4, 1fr);
                gap: 8px;
                padding: 12px 16px;
                background: #1b2533; /* Dark blue background for the entire dropdown */
                border-top: 1px solid var(--glass-border);
            }
            .expense-cat-item {
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 8px;
                padding: 12px 0;
                border-radius: 8px;
                cursor: pointer;
                background: #101623; /* Darker blue background for individual items */
                transition: background 0.15s;
            }
            .expense-cat-item:hover {
                background: rgba(255,255,255,0.05); /* very subtle hover */
            }
            .expense-cat-icon {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                background: #94a3b8; /* Light blue-grey pill background for icons */
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .expense-cat-item.selected .expense-cat-icon {
                background: #ff6b00; /* Orange background for selected icon */
            }
            .expense-cat-label {
                font-size: 0.75rem;
                color: #e2e8f0; /* Light text for labels on dark background */
                font-weight: 600;
            }
        </style>

        <div class="expense-modal-group">
            <div class="expense-modal-row">
                <div class="expense-dropdown-text" style="font-size: 1.3rem; margin-right: 12px;">$ <span style="font-size:0.8rem; opacity:0.6;">▼</span></div>
                <input type="number" id="expense-amount" placeholder="0.00" value="${stop.price && stop.price !== '0' ? stop.price : ''}" autofocus style="border:none; width:100%; font-size:1.1rem; color:var(--text-primary); outline:none; background:transparent;">
            </div>
        </div>

        <div class="expense-modal-group">
            <div class="expense-modal-row" style="cursor:pointer;" onclick="document.getElementById('expense-cat-grid').style.display = document.getElementById('expense-cat-grid').style.display === 'grid' ? 'none' : 'grid'">
                <div class="expense-dropdown-text">
                    <span id="expense-selected-icon-container" style="display:flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:6px; background:#94a3b8; margin-right:4px;">
                        ${currentIcon}
                    </span>
                    <span id="expense-selected-label">${currentCat}</span>
                </div>
                <span style="color:var(--text-secondary); font-weight:bold;">›</span>
            </div>
            <div id="expense-cat-grid" class="expense-cat-grid">
                ${Object.keys(categoryIcons).map(cat => `
                    <div class="expense-cat-item ${currentCat === cat ? 'selected' : ''}" onclick="window.selectExpenseCategory(event, '${cat}')">
                        <div class="expense-cat-icon" id="icon-bg-${cat}" style="background: ${currentCat === cat ? 'var(--accent-primary)' : '#94a3b8'};">
                            ${categoryIcons[cat]}
                        </div>
                        <span class="expense-cat-label">${cat}</span>
                    </div>
                `).join('')}
            </div>
            <input type="hidden" id="expense-category-input" value="${currentCat}">
        </div>

        <div class="expense-modal-group">
            <div style="padding: 12px 16px;">
                <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:4px;">添加描述</label>
                <textarea style="width:100%; padding:4px 0; border:none; outline:none; resize:none; font-size:1rem; color:var(--text-primary); background:transparent; min-height:48px;" placeholder="在此输入描述">${stop.location || ''}</textarea>
            </div>
        </div>

        <div class="expense-modal-group">
            <div class="expense-modal-row" style="cursor:pointer;">
                <div style="font-weight:700;">付款人</div>
                <div class="expense-dropdown-text" style="color:var(--text-secondary); font-weight:normal;">
                    <div style="width:24px; height:24px; border-radius:50%; background:var(--bg-secondary); display:inline-block; vertical-align:middle; background-image:url('https://picsum.photos/50'); background-size:cover;"></div>
                    ${state.user?.name || '您（Show Box）'} <span style="font-size:0.8rem; opacity:0.6; margin-left:4px;">▼</span>
                </div>
            </div>
        </div>

        <div class="expense-modal-group">
            <div class="expense-modal-row" style="cursor:pointer;">
                <div style="font-weight:700;">分摊</div>
                <div class="expense-dropdown-text" style="color:var(--text-secondary); font-weight:normal;">
                    不分摊 <span style="font-size:0.8rem; opacity:0.6; margin-left:4px;">▼</span>
                </div>
            </div>
        </div>

        <div style="display:flex; justify-content:space-between; align-items:flex-end; margin-top: 1rem; margin-bottom: 0.5rem; padding: 0 4px;">
            <div style="color:var(--text-secondary); font-weight:700; font-size:0.95rem; cursor:pointer;" title="修改日期">
                日期: <span style="color:var(--text-secondary); font-weight:normal;">${formattedDate} ▼</span>
            </div>
            <div style="display:flex; gap: 1rem;">
                <button onclick="closeSubModal()" style="background:var(--bg-secondary); color:var(--text-secondary); border:none; border-radius:20px; padding: 10px 24px; font-weight:700; display:flex; align-items:center; gap:6px; cursor:pointer; font-size:0.9rem;">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg> 删除
                </button>
                <button onclick="saveMockExpense()" style="background:#ef4444; color:white; border:none; border-radius:20px; padding: 10px 42px; font-weight:700; cursor:pointer; font-size:1rem; box-shadow:0 4px 10px rgba(239, 68, 68, 0.3);">
                    保存
                </button>
            </div>
        </div>
    `;

    const overlay = document.getElementById('sub-modal-overlay');
    overlay.classList.add('active');
    overlay.classList.remove('hidden');

    // Ensure the input field is fully focused and selected every time the modal opens
    setTimeout(() => {
        const amountInput = document.getElementById('expense-amount');
        if (amountInput) {
            amountInput.focus();
            amountInput.select();
        }
    }, 50);
}

window.selectExpenseCategory = function (evt, cat) {
    if (evt) evt.stopPropagation();
    document.getElementById('expense-category-input').value = cat;
    document.getElementById('expense-selected-label').innerText = cat;

    // Update the selected category icon
    const iconHTML = document.getElementById(`icon-bg-${cat}`).innerHTML;
    document.getElementById('expense-selected-icon-container').innerHTML = iconHTML;

    // Reset backgrounds and apply selection
    document.querySelectorAll('.expense-cat-item').forEach(el => el.classList.remove('selected'));
    document.querySelectorAll('.expense-cat-icon').forEach(el => el.style.background = '#94a3b8');

    if (evt && evt.currentTarget) {
        evt.currentTarget.classList.add('selected');
    }
    document.getElementById(`icon-bg-${cat}`).style.background = '#ff6b00';

    // Auto collapse after selection
    setTimeout(() => {
        document.getElementById('expense-cat-grid').style.display = 'none';
    }, 150);
}

function saveMockExpense() {
    const amount = document.getElementById('expense-amount').value;
    const catInput = document.getElementById('expense-category-input');
    const cat = catInput ? catInput.value : '活动';

    const trip = state.trips.find(t => t.id === state.activeTripId);
    const day = trip.days.find(d => d.id === editState.editingDayId);

    if (editState.editingStopId) {
        const stop = day.stops.find(s => s.id === editState.editingStopId);
        if (stop) {
            stop.price = amount;
            stop.expenseCategory = cat;
        }
    }

    // Capture scroll position
    const scrollContainer = document.getElementById('itinerary-scroll-container');
    const currentScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

    if (typeof isDirectEdit !== 'undefined' && isDirectEdit) {
        saveData();
        renderApp();
        isDirectEdit = false;
    } else {
        saveData(); // Save the new category/price
        renderApp(); // Re-render to show updated price/icon globally if needed
    }

    // Restore scroll position
    setTimeout(() => {
        const newScrollContainer = document.getElementById('itinerary-scroll-container');
        if (newScrollContainer) {
            newScrollContainer.scrollTop = currentScrollTop;
        }
    }, 0);

    closeSubModal();
}

function changeStopImage(dayId, stopId) {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    const day = trip.days.find(d => d.id === dayId);
    const stop = day.stops.find(s => s.id === stopId);

    const title = document.getElementById('sub-modal-title');
    const body = document.getElementById('sub-modal-body');
    title.innerText = '修改地点照片';

    body.innerHTML = `
        <div style="padding: 10px 0;">
            <p style="color:var(--text-secondary); font-size:0.9rem; margin-bottom:1rem;">从 Google Maps 搜索实拍图:</p>
            <div style="display:flex; gap:8px; margin-bottom:16px;">
                <input type="text" id="stop-image-search-input" value="${stop.location}" placeholder="输入地名或关键词" 
                    style="flex:1; padding:12px; border:1.5px solid var(--glass-border); border-radius:10px; background:var(--bg-secondary); color:var(--text-primary); outline:none; font-size:1rem;" 
                    onkeydown="if(event.key === 'Enter') window.searchGoogleStopImages('${dayId}', '${stopId}', this.value)">
                <button onclick="window.searchGoogleStopImages('${dayId}', '${stopId}', document.getElementById('stop-image-search-input').value)" 
                    style="padding:0 20px; border-radius:10px; border:none; background:var(--accent-primary); color:white; cursor:pointer; font-weight:600;">搜索</button>
            </div>
            
            <div id="image-grid" style="display:grid; grid-template-columns:repeat(3, 1fr); gap:10px; min-height:220px; max-height:350px; overflow-y:auto; padding:4px;">
                <!-- Google photos loaded here -->
            </div>
            
            <input type="hidden" id="selected-stop-image-url" value="${stop.photo || ''}">
            
            <div style="margin-top:24px; display:flex; gap:12px; justify-content:flex-end;">
                <button onclick="closeSubModal()" style="padding:10px 24px; border-radius:20px; border:none; background:var(--bg-secondary); color:var(--text-secondary); cursor:pointer; font-weight:600; font-size:0.95rem;">取消</button>
                <button onclick="window.confirmStopImage('${dayId}', '${stopId}')" style="padding:10px 32px; border-radius:20px; border:none; background:var(--accent-primary); color:white; cursor:pointer; font-weight:600; font-size:0.95rem; box-shadow:0 4px 12px rgba(79, 70, 229, 0.3);">确定更换</button>
            </div>
        </div>
    `;

    const overlay = document.getElementById('sub-modal-overlay');
    overlay.classList.add('active');
    overlay.classList.remove('hidden');

    // Initial search
    setTimeout(() => {
        searchGoogleStopImages(dayId, stopId, stop.location);
    }, 100);
}

function selectStopThumb(event, url) {
    if (event) event.stopPropagation();
    document.getElementById('selected-stop-image-url').value = url;

    // UI feedback
    document.querySelectorAll('#image-grid .image-thumb-option').forEach(el => {
        el.style.border = '2px solid transparent';
        el.style.transform = 'scale(1)';
        el.style.boxShadow = 'none';
    });

    if (event && event.currentTarget) {
        event.currentTarget.style.border = '2px solid var(--accent-primary)';
        event.currentTarget.style.transform = 'scale(1.02)';
        event.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
    }
}

function confirmStopImage(dayId, stopId) {
    const newUrl = document.getElementById('selected-stop-image-url').value;
    if (!newUrl) {
        closeSubModal();
        return;
    }
    window.saveStopImage(dayId, stopId, newUrl);
}


function saveStopImage(dayId, stopId, passedUrl) {
    const newUrl = passedUrl || document.getElementById('selected-stop-image-url').value;
    const trip = state.trips.find(t => t.id === state.activeTripId);
    const day = trip.days.find(d => d.id === dayId);
    const stop = day.stops.find(s => s.id === stopId);

    // Capture scroll position
    const scrollContainer = document.getElementById('itinerary-scroll-container');
    const currentScrollTop = scrollContainer ? scrollContainer.scrollTop : 0;

    stop.photo = newUrl;
    saveData();
    renderApp();

    // Restore scroll position
    setTimeout(() => {
        const newScrollContainer = document.getElementById('itinerary-scroll-container');
        if (newScrollContainer) {
            newScrollContainer.scrollTop = currentScrollTop;
        }
    }, 50);

    closeSubModal();
}

// --- Exports ---
export {
    closeModal, closeSubModal, openModal, openConfirmModal,
    openEditTripModal, openEditModal, handleTripThumbUpload,
    scrollToDay, editDay, saveEditDay, editDaySubtitle, toggleOverview, toggleDayCollapse,
    handleDragStart, handleDragOver, handleDragEnter, handleDragLeave, handleDrop, handleDragEnd,
    openTimePickerDirectly, openExpenseDirectly,
    openTimePickerModal, openExpenseModal,
    selectMockTime, saveMockExpense,
    changeStopImage,
    saveStopImage,
    selectStopThumb,
    confirmStopImage
};

// --- Global Helpers for Dynamic UI ---
window._setEditStatus = function (val, btn) {
    const input = document.getElementById('trip-edit-status');
    if (input) input.value = val;

    // UI update
    if (btn && btn.parentElement) {
        const btns = btn.parentElement.querySelectorAll('.status-choice-btn');
        btns.forEach(b => {
            b.style.background = 'transparent';
            b.style.color = 'var(--text-secondary)';
            b.classList.remove('active');
        });
        btn.style.background = 'var(--accent-primary)';
        btn.style.color = '#fff';
        btn.classList.add('active');
    }
};

// --- Sidebar Collapse ---
window.toggleSidebar = function () {
    state.sidebarCollapsed = !state.sidebarCollapsed;
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
        if (state.sidebarCollapsed) {
            sidebar.classList.add('collapsed');
        } else {
            sidebar.classList.remove('collapsed');
        }
    }
    // Re-render only if needed, but CSS handles most of it
    // If you need to change text (e.g. Day 1 -> D1), you might need a partial re-render
    // For now, let's try CSS-only transition for smooth feel
};

// --- Settings Modal ---
export async function openSettingsModal() {
    const { getAvailableLanguages, t } = await import('../i18n.js');
    const langs = await getAvailableLanguages();

    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    title.innerText = t('itinerary.settings');

    const curLang = state.settings.language;
    const curDist = state.settings.unitDistance;
    const curTemp = state.settings.unitTemp;
    const curCurrency = state.settings.currency;

    body.innerHTML = `
        <div class="settings-grid" style="display:grid; gap:1.5rem; padding:0.5rem 0;">
            <div class="form-group">
                <label>语言 / Language</label>
                <select id="setting-lang" class="custom-select" onchange="window._updateSetting('language', this.value)" style="width:100%; background:var(--bg-primary); color:white; border:1px solid var(--glass-border); padding:0.8rem; border-radius:8px;">
                    ${langs.map(l => `<option value="${l.code}" ${l.code === curLang ? 'selected' : ''}>${l.name}</option>`).join('')}
                </select>
            </div>
            <div class="form-group">
                <label>距离单位 / Distance Unit</label>
                <select id="setting-distance" class="custom-select" onchange="window._updateSetting('unitDistance', this.value)" style="width:100%; background:var(--bg-primary); color:white; border:1px solid var(--glass-border); padding:0.8rem; border-radius:8px;">
                    <option value="km" ${curDist === 'km' ? 'selected' : ''}>公制 (Kilometers)</option>
                    <option value="mi" ${curDist === 'mi' ? 'selected' : ''}>英制 (Miles)</option>
                </select>
            </div>
            <div class="form-group">
                <label>温度单位 / Temperature Unit</label>
                <select id="setting-temp" class="custom-select" onchange="window._updateSetting('unitTemp', this.value)" style="width:100%; background:var(--bg-primary); color:white; border:1px solid var(--glass-border); padding:0.8rem; border-radius:8px;">
                    <option value="c" ${curTemp === 'c' ? 'selected' : ''}>摄氏度 (°C)</option>
                    <option value="f" ${curTemp === 'f' ? 'selected' : ''}>华氏度 (°F)</option>
                </select>
            </div>
            <div class="form-group">
                <label>货币单位 / Currency</label>
                <select id="setting-currency" class="custom-select" onchange="window._updateSetting('currency', this.value)" style="width:100%; background:var(--bg-primary); color:white; border:1px solid var(--glass-border); padding:0.8rem; border-radius:8px;">
                    <option value="USD" ${curCurrency === 'USD' ? 'selected' : ''}>USD ($)</option>
                    <option value="CNY" ${curCurrency === 'CNY' ? 'selected' : ''}>CNY (¥)</option>
                    <option value="EUR" ${curCurrency === 'EUR' ? 'selected' : ''}>EUR (€)</option>
                    <option value="JPY" ${curCurrency === 'JPY' ? 'selected' : ''}>JPY (¥)</option>
                    <option value="GBP" ${curCurrency === 'GBP' ? 'selected' : ''}>GBP (£)</option>
                </select>
            </div>
        </div>
        <div style="margin-top:2rem; text-align:right;">
            <button class="submit-btn" onclick="closeModal()" style="min-width:120px;">完成</button>
        </div>
    `;

    openModal(t('itinerary.settings'), body.innerHTML);
}

window._updateSetting = async (key, value) => {
    state.settings[key] = value;
    if (key === 'language') {
        const { loadLanguage } = await import('../i18n.js');
        await loadLanguage(value);
    }
    const { saveData } = await import('../../api.js');
    const { renderApp } = await import('../render.js');
    saveData();
    renderApp();
    // Re-open settings to show updated lang
    if (key === 'language') openSettingsModal();
};
