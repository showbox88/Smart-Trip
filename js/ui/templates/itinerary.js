import { state } from '../../state.js';
import { calculateDays, formatDate, formatDistance, formatCurrency, formatDuration } from '../../utils.js';
import { t } from '../i18n.js';

// --- Helper ---
export function getDay(dayId) {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    return trip ? trip.days.find(d => d.id === dayId) : null;
}


// --- Timeline Item HTML ---
export function getTimelineItemHTML(day, stop, index, locationIdx, showTransit, showAddRow) {
    let circleHtml = '';
    let contentHtml = '';
    let isLocation = stop.type === 'location' || !stop.type;

    const styleBlock = index === 0 ? `
        <style>
            .timeline-item-wrapper:hover .item-hover-action { opacity: 1 !important; pointer-events: auto !important; }
            .li-item-hover:hover .delete-btn-hover { opacity: 1 !important; }
        </style>
    ` : '';

    if (stop.type === 'note') {
        circleHtml = '';
        contentHtml = `
            <div class="note-card stop-card" style="background: var(--bg-deep); border-radius: 12px; padding: 0.8rem 1.2rem; display:flex; align-items:center; gap: 1rem; border: 1px solid var(--glass-border); transition: all 0.3s ease;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--glass-bg); border: 2px solid var(--glass-border); display:flex; align-items:center; justify-content:center; font-size: 0.85rem; color: var(--text-secondary); flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    📄
                </div>
                <textarea rows="1" oninput="this.style.height='';this.style.height=this.scrollHeight+'px'" onchange="updateNoteContent('${day.id}', '${stop.id}', this.value)" style="flex:1; background:transparent; border:none; outline:none; color:var(--text-primary); font-size:1rem; padding: 0.2rem; resize:none; overflow:hidden;" placeholder="在此处书写 or 粘贴笔记">${stop.content || ''}</textarea>
            </div>
        `;
    } else if (stop.type === 'list') {
        circleHtml = '';
        contentHtml = `
            <div class="list-card stop-card" style="background: var(--bg-deep); border-radius: 12px; padding: 1.2rem; border: 1px solid var(--glass-border); display:flex; align-items:flex-start; gap: 1rem; transition: all 0.3s ease;">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--glass-bg); border: 2px solid var(--glass-border); display:flex; align-items:center; justify-content:center; font-size: 0.85rem; color: var(--text-secondary); flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); margin-top: 2px;">
                    ≡
                </div>
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.8rem;">
                        <input type="text" value="${stop.title || ''}" onchange="updateListTitle('${day.id}', '${stop.id}', this.value)" style="flex:1; background:transparent; border:none; outline:none; color:var(--text-primary); font-size:1.1rem; font-weight:bold; margin-left:-4px;" placeholder="添加标题">
                    </div>
                    
                    <div id="list-items-${stop.id}" style="display:flex; flex-direction:column; gap:0.5rem; padding-left:0.2rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem; margin-bottom: 1rem;">
                        ${(stop.items || []).map((li, i) => `
                            <div style="display:flex; align-items:center; gap:0.6rem; color:var(--text-primary); margin-bottom: 0.3rem;" class="li-item-hover">
                                <div style="width: 16px; height: 16px; border: 2px solid var(--text-secondary); border-radius: 50%; background:${li.checked ? 'var(--text-secondary)' : 'transparent'}; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="toggleListItemCheck('${day.id}', '${stop.id}', ${i}, this)"></div>
                                <textarea rows="1" oninput="this.style.height='';this.style.height=this.scrollHeight+'px'" onchange="updateListItemText('${day.id}', '${stop.id}', ${i}, this.value)" style="flex:1; background:transparent; border:none; outline:none; color:var(--text-primary); font-size:0.95rem; text-decoration:${li.checked ? 'line-through' : 'none'}; opacity:${li.checked ? '0.5' : '1'}; resize:none; overflow:hidden;">${li.text || ''}</textarea>
                                <button class="delete-btn-hover" onclick="deleteListItem('${day.id}', '${stop.id}', ${i})" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:0.9rem; opacity:0; transition:opacity 0.2s;">✕</button>
                            </div>
                        `).join('')}
                        <div style="display:flex; align-items:center; gap:0.6rem; color:var(--text-secondary); margin-top:0.3rem;">
                            <div style="width: 16px; height: 16px; border: 2px solid var(--text-secondary); border-radius: 50%;"></div>
                            <textarea rows="1" oninput="this.style.height='';this.style.height=this.scrollHeight+'px'" placeholder="添加一些项目..." onkeypress="if(event.key==='Enter'){event.preventDefault(); handleNewListItem(event, '${day.id}', '${stop.id}');}" style="flex:1; background:transparent; border:none; outline:none; color:var(--text-primary); font-size:0.95rem; resize:none; overflow:hidden;"></textarea>
                        </div>
                    </div>
                    
                    <div style="color: var(--text-primary); font-weight: 600; display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.95rem; margin-left: 0.2rem;" onclick="alert('预制列表模版 (Mock)')">
                        <span>🧳</span> ${t('itinerary.preset_list')}
                    </div>
                </div>
            </div>
        `;
    } else {
        const activeColor = day.color || '#5b7a99';
        const pinNumber = locationIdx + 1;

        circleHtml = '';

        const isHotel = stop.category === '酒店' || stop.category === '住宿' || stop.category === 'Hotel' || stop.category === 'Accommodation';
        const isCin = stop.type === 'hotel_checkin';
        const isCout = stop.type === 'hotel_checkout';
        const isSpecialHotel = isCin || isCout;
        const hotelBorderColor = isCin ? '#22c55e' : (isCout ? '#ef4444' : activeColor);
        const hotelLabel = isCin ? `${stop.time} ${t('itinerary.checkin')}` : (isCout ? `${stop.time} ${t('itinerary.checkout')}` : '');

        contentHtml = `
                <div class="rich-stop-card ${isSpecialHotel ? 'special-hotel-card' : ''}" onclick="if(window.openLocationInMapPanel) window.openLocationInMapPanel('${stop.location.replace(/'/g, "\\'")}', ${stop.lat || 'undefined'}, ${stop.lng || 'undefined'});" style="background: var(--bg-deep); border-radius: 8px; padding: 1rem; display:flex; gap: 1rem; transition: background 0.2s, backdrop-filter 0.2s; cursor: pointer; border: 1px solid ${isSpecialHotel ? hotelBorderColor : 'var(--glass-border)'}; box-shadow: 0 2px 8px rgba(0,0,0,0.05); align-items: flex-start; position: relative;">
                    ${isSpecialHotel ? `<div style="position:absolute; top:-10px; right:10px; background:${hotelBorderColor}; color:white; padding:2px 8px; border-radius:4px; font-size:0.7rem; font-weight:bold; box-shadow: 0 2px 4px rgba(0,0,0,0.2);">${hotelLabel}</div>` : ''}
                    <div style="flex:1;">
                        <div style="display:flex; align-items:center; gap: 10px; margin-bottom: 0.6rem;">
                            <div class="rich-stop-card-dot" style="width: 24px; height: 24px; background: ${activeColor}; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display:flex; align-items:center; justify-content:center; box-shadow: 0 2px 6px rgba(0,0,0,0.35); flex-shrink:0;">
                                <span style="transform: rotate(45deg); color: #fff; font-size: 0.75rem; font-weight: 700; line-height: 1;">${isSpecialHotel ? '🏨' : pinNumber}</span>
                            </div>
                            <h4 style="font-size: 1.1rem; margin: 0; color: var(--text-primary); font-weight: 600; border-left: none !important; padding-left: 0 !important; display:flex; align-items:center; gap: 8px; flex-wrap:wrap; flex:1;">
                                <span style="margin-right: 4px;">${stop.location}</span>
                                ${stop.category && stop.category !== '地点' ? `<span style="color:var(--text-secondary); font-size:0.8rem; font-weight: 500; display:flex; align-items:center; gap:4px; margin-right: 4px;"><span style="opacity: 0.8;">${stop.categoryIcon || '📌'}</span> <span>${t('dashboard.categories.' + stop.category) || stop.category}</span></span>` : ''}
                                ${stop.rating ? `<span style="font-size:0.85rem; color:#f97316; font-weight:700; display:flex; align-items:center; gap:2px;"><svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.27l-5.18 3.09 1.34-5.88-4.54-3.95 6.01-.51L12 4.5l2.37 5.52 6.01.51-4.54 3.95 1.34 5.88L12 17.27z"/></svg>${stop.rating}</span>` : ''}
                            </h4>
                        </div>
                        
                        <div style="display:flex; flex-direction:column; gap:6px; margin-bottom: 0.6rem;">
                            ${stop.address ? `<div style="color:var(--text-secondary); font-size:0.8rem; display:flex; align-items:flex-start; gap:6px;"><span style="color:#f97316; padding-top:1px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg></span><span style="flex:1; line-height:1.2;">${stop.address}</span></div>` : ''}
                            ${stop.phone ? `<div style="color:var(--text-secondary); font-size:0.8rem; display:flex; align-items:center; gap:6px;"><span style="color:#f97316;"><svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg></span> ${stop.phone}</div>` : ''}
                        </div>

                        ${(() => {
                const note = stop.note || '';
                if (note === '入住登记' || note === 'Check-in') return `<p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0 0 0.4rem 0; line-height: 1.3;">${t('itinerary.checkin_label')}</p>`;
                if (note === '办理退房' || note === 'Check-out') return `<p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0 0 0.4rem 0; line-height: 1.3;">${t('itinerary.checkout_label')}</p>`;
                return note ? `<p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0 0 0.4rem 0; line-height: 1.3;">${note}</p>` : `<p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0 0 0.4rem 0; opacity: 0.6;">${t('itinerary.add_note')}</p>`;
            })()}
                        
                        <div style="display:flex; gap: 0.8rem; margin-top: 0.6rem; align-items:center; flex-wrap:wrap;">
                            <span onclick="openTimePickerDirectly(event, '${day.id}', '${stop.id}')" style="color: #4f46e5; background: rgba(79, 70, 229, 0.1); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor:pointer;" title="${t('itinerary.edit_time')}">${stop.time} ${stop.period === 'AM' ? t('common.am') : t('common.pm')}</span>
                            ${isHotel || isSpecialHotel ? `<span onclick="openStayInfoModal(event, '${day.id}', '${stop.id}')" style="color: #f59e0b; background: rgba(245, 158, 11, 0.1); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor:pointer;" title="${t('itinerary.stay_info')}">🏨 ${t('itinerary.stay_info')}</span>` : ''}
                            <span onclick="openExpenseDirectly(event, '${day.id}', '${stop.id}')" style="color: ${stop.price && stop.price !== '0' ? '#22c55e' : 'var(--text-secondary)'}; background: ${stop.price && stop.price !== '0' ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-secondary)'}; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor:pointer;" title="${t('itinerary.edit_expense')}">${stop.price && stop.price !== '0' ? formatCurrency(parseFloat(stop.price)) : t('itinerary.add_expense')}</span>
                        </div>
                    </div>
                    <!-- Thumb for Stop -->
                    <div onclick="window.changeStopImage('${day.id}', '${stop.id}')" style="cursor: pointer; width: 100px; height: 75px; border-radius: 6px; background-image: url('${stop.photo || 'https://picsum.photos/seed/' + stop.id + '/300/200'}'); background-size: cover; background-position: center; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.2);" title="${t('stops.change_img')}"></div>
                </div>
            `;
    }

    return `
        ${styleBlock}
        <div class="timeline-item-wrapper id-${stop.id}" style="position:relative; margin-bottom: 0.8rem; padding-left: 36px; padding-right: 41px; display:flex; align-items:flex-start; gap: 0.5rem;" 
            draggable="true" 
            ondragstart="handleDragStart(event, '${day.id}', '${stop.id}')" 
            ondragover="handleDragOver(event)" 
            ondrop="handleDrop(event, '${day.id}', '${stop.id}')" 
            ondragenter="handleDragEnter(event)" 
            ondragleave="handleDragLeave(event)" 
            ondragend="handleDragEnd(event)">
            <!-- Left Actions (Drag & Select) -->
            <div class="item-hover-action" style="position:absolute; left: 14px; top: 0.3rem; width: 16px; display:flex; flex-direction:column; align-items:center; gap: 0.5rem; opacity:0; pointer-events:none; transition:opacity 0.2s;">
                <div style="cursor:grab; display:flex; flex-direction:column; gap:2px; color:var(--text-secondary); padding: 2px;">
                    <div style="display:flex; gap:2px;"><div style="width:3px;height:3px;border-radius:50%;background:currentColor;"></div><div style="width:3px;height:3px;border-radius:50%;background:currentColor;"></div></div>
                    <div style="display:flex; gap:2px;"><div style="width:3px;height:3px;border-radius:50%;background:currentColor;"></div><div style="width:3px;height:3px;border-radius:50%;background:currentColor;"></div></div>
                    <div style="display:flex; gap:2px;"><div style="width:3px;height:3px;border-radius:50%;background:currentColor;"></div><div style="width:3px;height:3px;border-radius:50%;background:currentColor;"></div></div>
                </div>
                <div style="cursor:pointer;" onclick="toggleItemSelect('${day.id}', '${stop.id}', this)">
                    <div style="width:14px; height:14px; border:1.5px solid ${stop.selected ? 'var(--accent-primary)' : 'var(--text-secondary)'}; border-radius:3px; background:${stop.selected ? 'var(--accent-primary)' : 'transparent'}; display:flex; align-items:center; justify-content:center; color:white; font-size:0.75rem; transition: background 0.2s;">
                        ${stop.selected ? '✓' : ''}
                    </div>
                </div>
            </div>
            
            ${(stop.type === 'location' || !stop.type) ? `
                <div class="timeline-dot" style="width: 16px; height: 16px; border-radius: 50%; background: ${day.color || '#5b7a99'}; border: 3px solid var(--bg-primary); position: absolute; left: 22px; top: 1.2rem; transform: translate(-50%, -50%); z-index: 2;" title="${t('itinerary.at_stop')} ${locationIdx + 1}"></div>
            ` : `
                <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--text-secondary); border: 2px solid var(--bg-primary); position: absolute; left: 22px; top: 1.2rem; transform: translate(-50%, -50%); z-index: 2;"></div>
            `}
            
            <!-- Main Content -->
            <div style="flex:1; min-width: 0;">
                ${contentHtml}
            </div>

            <!-- Right Action (Trash) -->
            <div class="item-hover-action" style="position:absolute; right: 10px; top: 0.3rem; cursor:pointer; color:var(--text-secondary); z-index: 10; opacity:0; pointer-events:none; transition:opacity 0.2s; font-size: 0.95rem; padding: 0.2rem;" onclick="deleteTimelineItem(event, '${day.id}', '${stop.id}')" title="${t('common.delete')}">
                🗑️
            </div>
        </div>
        ${(showAddRow || showTransit) ? `
            <div style="padding-left:36px; padding-right:41px; display:flex; align-items:center; gap:0.6rem; position:relative; z-index:2; margin-bottom:0.8rem;">
                ${showAddRow ? `
                <div style="position:relative; display:inline-block; transform: translateX(-50%); margin-left: -14px;">
                    <button onclick="toggleMenu(event, 'add-menu-${stop.id}')" style="width:22px; height:22px; border-radius:50%; background:var(--bg-secondary); border:1.5px solid var(--glass-border); color:var(--text-secondary); cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center; line-height:1; transition: background 0.15s, color 0.15s; flex-shrink:0;" onmouseover="this.style.background='var(--accent-primary)';this.style.color='#fff';this.style.borderColor='var(--accent-primary)';" onmouseout="this.style.background='var(--bg-secondary)';this.style.color='var(--text-secondary)';this.style.borderColor='var(--glass-border)';" title="在此处插入">+</button>
                    <div class="menu-dropdown" id="menu-add-menu-${stop.id}" style="top:1.8rem; left:0; min-width:160px;">
                        <button onclick="showInlineSearchAt('${day.id}', '${stop.id}'); document.getElementById('menu-add-menu-${stop.id}').classList.remove('show');" style="display:flex; align-items:center; gap:8px;"><span>📍</span> ${t('itinerary.add_stop')}</button>
                        <button onclick="insertNoteAfterStop('${day.id}', '${stop.id}'); document.getElementById('menu-add-menu-${stop.id}').classList.remove('show');" style="display:flex; align-items:center; gap:8px;"><span>📄</span> ${t('itinerary.add_note_btn')}</button>
                        <button onclick="insertListAfterStop('${day.id}', '${stop.id}'); document.getElementById('menu-add-menu-${stop.id}').classList.remove('show');" style="display:flex; align-items:center; gap:8px;"><span>✓</span> ${t('itinerary.add_list')}</button>
                    </div>
                </div>
                ` : ''}
                ${showTransit ? `
                <div style="display:flex; align-items:center; gap: 0.6rem;">
                    <span id="transit-${stop.id}" style="font-size: 0.85rem; color: var(--text-secondary);"><span onclick="toggleTransitMode('${day.id}', '${stop.id}')" style="cursor:pointer; user-select:none; display:inline-block; transition:transform 0.15s;" onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'" title="${t('itinerary.toggle_transit')}">${stop.transitMode === 'WALK' ? '🚶' : '🚗'}</span> ${stop.transitToNext ? `${formatDuration(stop.transitToNext.durationSeconds)} · ${formatDistance(stop.transitToNext.distanceMeters || 0)}` : `<span style="opacity:0.5;">${t('itinerary.calculating')}</span>`}</span>
                </div>
                ` : ''}
            </div>
        ` : ''}
    `;
}

// --- Day HTML ---
export function getDayHTML(day, dayIndex, activeDayId) {
    const trip = state.trips.find(t => t.id === state.activeTripId);

    const dayName = formatDate(day.date);
    const suffix = t('itinerary.day_suffix');
    const dayLabel = `${t('itinerary.day_label')}${dayIndex + 1}${suffix === 'itinerary.day_suffix' ? '' : suffix}`;

    const colors = ['#5b7a99', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
    const activeColor = day.color || '#5b7a99';

    // --- Hotel Logic Detection ---
    let stays = [];
    if (trip) {
        const allStops = trip.days.flatMap(d => d.stops.map(s => ({ ...s, dayId: d.id })));
        const staysMap = new Map();
        allStops.forEach(s => {
            if (s.stayId) {
                if (!staysMap.has(s.stayId)) staysMap.set(s.stayId, { id: s.stayId, checkinDayId: null, checkoutDayId: null, location: s.location });
                const stay = staysMap.get(s.stayId);
                if (s.type === 'hotel_checkin') stay.checkinDayId = s.dayId;
                if (s.type === 'hotel_checkout') stay.checkoutDayId = s.dayId;
            }
        });
        stays = Array.from(staysMap.values()).filter(s => s.checkinDayId && s.checkoutDayId);
    }

    const currentDayStay = stays.find(s => {
        const dIdx = trip.days.findIndex(d => d.id === day.id);
        const cinIdx = trip.days.findIndex(d => d.id === s.checkinDayId);
        const coutIdx = trip.days.findIndex(d => d.id === s.checkoutDayId);
        return dIdx >= cinIdx && dIdx <= coutIdx;
    });

    const isCinOnly = currentDayStay && currentDayStay.checkinDayId === day.id && currentDayStay.checkoutDayId !== day.id;
    const isCoutOnly = currentDayStay && currentDayStay.checkoutDayId === day.id && currentDayStay.checkinDayId !== day.id;
    const isBetween = currentDayStay && currentDayStay.checkinDayId !== day.id && currentDayStay.checkoutDayId !== day.id;
    const isSameDayStay = currentDayStay && currentDayStay.checkinDayId === day.id && currentDayStay.checkoutDayId === day.id;

    const colorPickerHtml = `
        <div style="position:relative; margin-left: auto; margin-right: 15px; display:flex; align-items:center;">
            <div style="width: 14px; height: 14px; border-radius: 50%; background: ${activeColor}; cursor:pointer; border: 2px solid var(--glass-border); box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: transform 0.1s;" onclick="toggleMenu(event, 'color-${day.id}')" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" title="${t('itinerary.change_color')}"></div>
            <div class="menu-dropdown" id="menu-color-${day.id}" style="top:1.5rem; right:-0.5rem; flex-direction:row; padding:0.4rem; gap:6px; min-width:auto; border-radius:30px;">
                ${colors.map(c => `
                    <div style="width: 18px; height: 18px; border-radius: 50%; background: ${c}; cursor:pointer; border: 2px solid ${activeColor === c ? 'var(--text-primary)' : 'transparent'}; box-shadow: 0 2px 5px rgba(0,0,0,0.3); transition: transform 0.1s;" onclick="setDayColor('${day.id}', '${c}')" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></div>
                `).join('')}
            </div>
        </div>
    `;

    return `
        <div class="day-section" id="${day.id}" style="margin-bottom: 3rem; scroll-margin-top: 120px;"
             ondragover="handleDragOver(event)"
             ondrop="handleDrop(event, '${day.id}', null)"
             ondragenter="handleDragEnter(event)"
             ondragleave="handleDragLeave(event)">
            <!-- Day Header -->
            <div style="display:flex; align-items:center; margin-bottom: 0.5rem; padding-left: 36px; padding-right: 46px;">
                <h3 style="font-size: 1.5rem; margin:0;"><span style="color:var(--accent-primary); font-weight:800; margin-right:8px;">${dayLabel}</span> ${dayName}</h3>
                ${colorPickerHtml}
                <div style="position:relative;">
                    <button class="menu-dots" style="position:static; transform:none; padding: 0 5px;" onclick="toggleMenu(event, 'day-${day.id}')">⋮</button>
                    <div class="menu-dropdown" id="menu-day-${day.id}" style="top:2rem; right:0;">
                        <button onclick="editDay('${day.id}')">${t('itinerary.edit_day_label')}</button>
                        <button onclick="shareDay(event, '${day.id}')">${t('itinerary.share_trip')}</button>
                        <button class="danger" onclick="deleteDay(event, '${day.id}')">${t('itinerary.delete_day')}</button>
                    </div>
                </div>
            </div>
            <div style="color: var(--text-secondary); cursor: pointer; padding-left: 38px; margin-bottom: 0.8rem; font-size: 0.95rem; display:flex; align-items:center;">
                <span id="collapse-arrow-${day.id}" onclick="toggleDayCollapse('${day.id}')" style="display:inline-block; transform:${state.collapsedDays && state.collapsedDays[day.id] ? 'rotate(-90deg)' : 'rotate(0deg)'}; margin-right:4px; transition: transform 0.2s;">▼</span>
                <span id="day-subtitle-${day.id}" onclick="editDaySubtitle('${day.id}')">${day.subtitle || t('itinerary.add_subtitle')}</span>
            </div>
            
                <div id="day-content-${day.id}" style="${state.collapsedDays && state.collapsedDays[day.id] ? 'display:none;' : 'display:block;'}; padding-left: 0;">
                <div style="display:flex; gap: 15px; align-items:center; margin-bottom: 0.8rem; font-size: 0.85rem; color: var(--text-secondary); padding-left: 36px;">
                    <button style="background:none; border:none; color: var(--accent-primary); cursor:pointer; font-weight:600; display:flex; align-items:center; gap:5px;">
                        <span style="font-size:1.1rem;">🪄</span> ${t('itinerary.auto_fill')}
                    </button>
                    <button style="background:none; border:none; color: var(--accent-primary); cursor:pointer; font-weight:600; display:flex; align-items:center; gap:5px;">
                        <span style="font-size:1.1rem;">📍</span> ${t('itinerary.optimize_route')} <span style="background:var(--accent-primary); color:#FFF; font-size:0.65rem; padding: 1px 4px; border-radius:4px;">PRO</span>
                    </button>
                    <span>·</span>
                    <div style="display:flex; align-items:center; gap:12px;">
                        <span>${(() => {
            let totalSeconds = 0;
            let totalMeters = 0;
            let hasData = false;

            const parseTransit = (obj) => {
                if (!obj) return;
                if (obj.durationSeconds !== undefined && obj.distanceMeters !== undefined) {
                    totalSeconds += (Number(obj.durationSeconds) || 0);
                    totalMeters += (Number(obj.distanceMeters) || 0);
                    hasData = true;
                } else if (obj.duration && obj.distance) {
                    let s = 0;
                    const hMatch = String(obj.duration).match(/(\d+)\s*小时/);
                    const mMatch = String(obj.duration).match(/(\d+)\s*分钟/);
                    if (hMatch) s += parseInt(hMatch[1]) * 3600;
                    if (mMatch) s += parseInt(mMatch[1]) * 60;
                    else if (!hMatch) {
                        const minOnlyMatch = String(obj.duration).match(/(\d+)/);
                        if (minOnlyMatch && !String(obj.duration).includes('小时')) s += parseInt(minOnlyMatch[1]) * 60;
                    }

                    let d = 0;
                    const distMatch = String(obj.distance).match(/([\d.]+)/);
                    if (distMatch) {
                        const val = parseFloat(distMatch[1]);
                        const distStr = String(obj.distance);
                        if (distStr.includes('公里') || distStr.includes('km')) d = val * 1000;
                        else if (distStr.includes('英里') || distStr.includes('mile') || distStr.includes('mi')) d = val * 1609.34;
                        else d = val * 1000;
                    }

                    if (s > 0 || d > 0) {
                        totalSeconds += s;
                        totalMeters += d;
                        hasData = true;
                    }
                }
            };

            parseTransit(day.transitFromHotel);
            if (day.stops) {
                day.stops.forEach(stop => parseTransit(stop.transitToNext));
            }
            if (day.showReturnRoute) {
                parseTransit(day.transitToHotel);
            }

            if (!hasData) return t('itinerary.no_data');

            const h = Math.floor(totalSeconds / 3600);
            const m = Math.floor((totalSeconds % 3600) / 60);
            const hrUnit = t('itinerary.time_unit_hour');
            const minUnit = t('itinerary.time_unit_minute');
            const durStr = h > 0 ? `${h} ${hrUnit} ${m} ${minUnit}` : `${m} ${minUnit}`;
            const distStr = formatDistance(totalMeters);
            return `${durStr}, ${distStr}`;
        })()}</span>
                        <div style="display:flex; align-items:center; gap:6px; margin-left:4px;">
                            <label class="switch-labeled">
                                <input type="checkbox" ${day.showReturnRoute ? 'checked' : ''} onclick="toggleReturnRoute('${day.id}')">
                                <span class="slider-labeled">
                                    <span class="label-text">${t('itinerary.show_return')}</span>
                                </span>
                            </label>
                        </div>
                    </div>
                </div>

            <div class="timeline-container" style="position: relative;">
                <!-- Vertical continuous dashed line for the whole day -->
                <div class="timeline-line" style="position: absolute; top: 0; bottom: 0; left: 22px; width: 0; border-left: 2px dashed ${activeColor}; opacity: 0.5; z-index: 0; transform: translateX(-50%); transition: border-color 0.2s;"></div>
                
                ${currentDayStay ? `
                    <div class="stay-range-indicator" style="position: absolute; left: 10px; top: 0; bottom: 0; width: 4px; background: #f59e0b; opacity: 0.4; border-radius: 2px; z-index: 1;" title="${t('itinerary.stay_info')}: ${currentDayStay.location}"></div>
                ` : ''}

                <!-- Hotel Departure Hint -->
                ${(isBetween || isCoutOnly) ? `
                    <div style="padding-left: 36px; margin-bottom: 0.8rem; color: #f59e0b; font-size: 0.85rem; font-weight: 600; display: flex; flex-direction:column; gap: 4px;">
                        <div style="display:flex; align-items:center; gap: 6px;">
                            <span>🏨</span> <span>${t('itinerary.from_hotel')} ${currentDayStay.location}</span>
                        </div>
                        ${day.transitFromHotel ? `
                        <div style="margin-left: 22px; font-weight: normal; color: var(--text-secondary); font-size: 0.8rem; display:flex; align-items:center; gap: 0.6rem;">
                             <span style="cursor:pointer; user-select:none; display:inline-block; transition:transform 0.15s;" onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'" onclick="toggleHotelTransitMode('${day.id}', 'from')" title="${t('itinerary.toggle_transit')}">${day.transitFromHotelMode === 'WALK' ? '🚶' : '🚗'}</span>
                             <span>${formatDuration(day.transitFromHotel.durationSeconds)} · ${formatDistance(day.transitFromHotel.distanceMeters)}</span>
                        </div>
                        ` : ''}
                    </div>
                ` : ''}

                ${day.stops.length === 0 ? `
                <div style="padding: 1.5rem 1rem; margin-bottom: 1.5rem; text-align: center; border: 1px dashed var(--glass-border); border-radius: 8px; background: rgba(255,255,255,0.02); position:relative; z-index:2;">
                    <span style="font-size: 2rem; opacity: 0.5;">📅</span>
                    <p style="color:var(--text-secondary); margin: 0.5rem 0 0 0; font-weight: 500;">(${t('itinerary.no_data')})</p>
                </div>
                ` : ''}
                ${day.stops.map((stop, index) => {
            const isLocationStop = stop.type === 'location' || !stop.type;
            const isHotelStop = stop.type === 'hotel_checkin' || stop.type === 'hotel_checkout';

            // locationIdx should only increment for actual 'location' types (to keep marker numbers correct)
            const locationIdx = day.stops.slice(0, index).filter(s => s.type === 'location' || !s.type).length;

            // Transit info should show if CURRENT stop is a point-of-interest (loc or hotel)
            // AND there's ANOTHER point-of-interest after it.
            const isPoi = isLocationStop || isHotelStop;
            const hasNextPoi = day.stops.slice(index + 1).some(
                s => s.type === 'location' || !s.type || s.type === 'hotel_checkin' || s.type === 'hotel_checkout'
            );
            const hasNextLocationStop = isPoi && hasNextPoi;
            const showAddRow = index < day.stops.length - 1;
            return getTimelineItemHTML(day, stop, index, locationIdx, hasNextLocationStop, showAddRow);
        }).join('')}
            
                <!-- Hotel Return Hint -->
                ${(isBetween || isCinOnly || isSameDayStay) ? `
                    <div style="padding-left: 36px; margin-top: 0.8rem; color: #f59e0b; font-size: 0.85rem; font-weight: 600; display: flex; flex-direction:column; gap: 4px;">
                        ${day.transitToHotel ? `
                         <div style="margin-left: 22px; font-weight: normal; color: var(--text-secondary); font-size: 0.8rem; display:flex; align-items:center; gap: 0.6rem; margin-bottom: 4px;">
                            <span style="cursor:pointer; user-select:none; display:inline-block; transition:transform 0.15s;" onmouseover="this.style.transform='scale(1.25)'" onmouseout="this.style.transform='scale(1)'" onclick="toggleHotelTransitMode('${day.id}', 'to')" title="${t('itinerary.toggle_transit')}">${day.transitToHotelMode === 'WALK' ? '🚶' : '🚗'}</span>
                            <span>${formatDuration(day.transitToHotel.durationSeconds)} · ${formatDistance(day.transitToHotel.distanceMeters)}</span>
                        </div>
                        ` : ''}
                        <div style="display:flex; align-items:center; justify-content: space-between; gap: 6px;">
                            <div style="display:flex; align-items:center; gap: 6px;">
                                <span>🏨</span> <span>${t('itinerary.return_hotel')} ${currentDayStay.location}</span>
                            </div>
                        </div>
                    </div>
                ` : ''}

            <!-- Dedicated Location Search Bar at bottom of Day -->
            <div class="location-search-container" style="position: relative; margin-top: 1rem; padding-left: 36px; display:flex; gap: 0.5rem; padding-right: 46px;">
                <div style="flex:1; position:relative;">
                    <span style="position:absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary);">📍</span>
                    <input type="text" class="location-search-input" style="padding-left: 2.8rem; background: var(--bg-secondary); border: none;" placeholder="${t('itinerary.add_stop')}..." oninput="handleSearchInput(event, '${day.id}')" onkeydown="handleSearchKeyDown(event, '${day.id}')" autocomplete="off">
                    <ul class="location-autocomplete-dropdown" id="search-dropdown-${day.id}"></ul>
                </div>
                <button onclick="addTimelineNote('${day.id}')" style="width: 45px; height: 45px; border-radius: 50%; background: var(--bg-secondary); border:none; display:flex; align-items:center; justify-content:center; color: var(--text-primary); cursor:pointer;"><span style="transform:rotate(90deg);">📄</span></button>
                <button onclick="addTimelineList('${day.id}')" style="width: 45px; height: 45px; border-radius: 50%; background: var(--bg-secondary); border:none; display:flex; align-items:center; justify-content:center; color: var(--text-primary); cursor:pointer;"><span>≡</span></button>
            </div>
            
            </div> <!-- End timeline container -->
            </div> <!-- End collapsible wrapper -->
            
        </div>
    `;
}

// --- Trip View HTML ---
export function getTripHTML(trip) {
    if (!trip) return `<h2>行程未找到</h2>`;
    const totalStops = trip.days.reduce((acc, d) => acc + (d.stops ? d.stops.filter(s => s.type === 'location' || !s.type).length : 0), 0);

    // Calculate total trip cost
    const totalCost = trip.days.reduce((acc, day) => {
        if (!day.stops) return acc;
        return acc + day.stops.reduce((dayAcc, stop) => {
            const price = parseFloat(stop.price);
            return dayAcc + (isNaN(price) ? 0 : price);
        }, 0);
    }, 0);

    return `
        <div class="dashboard-view fade-in">
            <aside class="sidebar ${state.sidebarCollapsed ? 'collapsed' : ''}">
                <!-- Sidebar Toggle Button -->
                <div class="sidebar-toggle" onclick="toggleSidebar()">
                    <span class="material-symbols-outlined">chevron_left</span>
                </div>

                <ul class="trip-navigation" id="sidebar-nav" style="flex: 1; margin-top: 1rem;">
                    ${trip.days.map((day, index) => {
        const activeColor = day.color || '#5b7a99';
        const suffix = t('itinerary.day_suffix');
        const dayLabel = `${t('itinerary.day_label')}${index + 1}${suffix === 'itinerary.day_suffix' ? '' : suffix}`;
        const dateStr = formatDate(day.date || '');
        const stopsCount = day.stops ? day.stops.filter(s => s.type === 'location' || !s.type).length : 0;
        const shortLabel = `D${index + 1}`;

        return `
                        <li id="nav-day-${day.id}" 
                            class="${day.id === trip.activeDayId ? 'active' : ''}" 
                            onclick="scrollToDay('${day.id}')" 
                            style="--active-color: ${activeColor};"
                            onmouseover="if(!this.classList.contains('active')) this.style.background='rgba(255,255,255,0.05)'" 
                            onmouseout="if(!this.classList.contains('active')) this.style.background='transparent'">
                            <div class="nav-day-main" style="display:flex; align-items:center; gap: 10px; min-width:0; width: 100%;">
                                <div class="sidebar-color-dot" style="width:10px; height:10px; border-radius:50%; background:${activeColor}; flex-shrink:0;"></div>
                                <span class="nav-day-short">${shortLabel}</span>
                                <span class="nav-day-title" style="white-space:nowrap; font-size:0.9rem; color:var(--text-primary); font-weight:600;">${dayLabel}</span>
                                <span class="nav-day-date" style="font-size:0.75rem; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin-left: auto;">${dateStr.split(',')[0]}</span>
                            </div>
                            <div class="nav-day-info" style="padding-left:20px; margin-top:4px;">
                                <span style="font-size:0.75rem; color:var(--text-secondary); white-space:nowrap;">${stopsCount} ${t('itinerary.stops_count')}</span>
                            </div>
                        </li>
                        `;
    }).join('')}
                    <li class="add-day-btn" onclick="addDay()" title="${t('itinerary.add_day')}">
                        <span class="material-symbols-outlined">add</span>
                        <span class="add-day-text">${t('itinerary.add_day')}</span>
                    </li>
                </ul>

                <!-- Sidebar Footer -->
                <div class="sidebar-footer">
                    <div class="footer-icon" style="cursor: pointer; color: var(--text-secondary);" onclick="openSettingsModal()">
                        <span class="material-symbols-outlined">settings</span>
                    </div>
                    <div style="width: 1px; height: 40px; background: var(--glass-border); opacity: 0.5;"></div>
                </div>
            </aside>
            
            <section class="main-itinerary" id="itinerary-scroll-container" style="padding-top: 0; padding-left: 0; padding-right: 0;">
                <div class="itinerary-header" id="trip-header-bar" style="padding: 0.75rem 1.5rem; background: var(--bg-primary); border-radius: 0; border-bottom: 1px solid var(--glass-border); margin-bottom: 1.5rem; position: sticky; top: 0; z-index: 100;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap: 1rem;">
                            <!-- Compact thumbnail -->
                            <div id="itinerary-header-thumb" style="width:56px; height:56px; border-radius:10px; background-image:url('${trip.thumb}'); background-size:cover; background-position:center; border:1px solid var(--glass-border); flex-shrink:0;"></div>
                            <div>
                                <h2 style="margin:0; font-size:1.25rem; line-height:1.2;">${trip.title}</h2>
                                <div style="display:flex; align-items:center; gap:0.6rem; margin-top:0.3rem; flex-wrap:wrap;">
                                    <span id="trip-header-dates" style="color:var(--text-secondary); font-size:0.82rem;">${formatDate(trip.startDate)} - ${formatDate(trip.endDate)}</span>
                                    <span id="trip-header-duration" style="background:rgba(167,139,250,0.15); color:var(--accent-secondary); border:1px solid var(--accent-secondary); padding:2px 8px; border-radius:20px; font-size:0.75rem; font-weight:bold;">${calculateDays(trip.startDate, trip.endDate)} ${t('itinerary.days')}</span>
                                    <span style="background:rgba(167,139,250,0.15); color:var(--accent-secondary); border:1px solid var(--accent-secondary); padding:2px 8px; border-radius:20px; font-size:0.75rem; font-weight:bold;">1 ${t('itinerary.person')}</span>
                                    ${totalCost > 0 ? `<span style="background:rgba(167,139,250,0.15); color:var(--accent-secondary); border:1px solid var(--accent-secondary); padding:2px 8px; border-radius:20px; font-size:0.75rem; font-weight:bold;">${formatCurrency(totalCost)}</span>` : ''}
                                </div>
                            </div>
                        </div>
                        <div style="position:relative;">
                            <button class="menu-dots" style="position:static; transform:none;" onclick="toggleMenu(event, 'header-${trip.id}')">⋮</button>
                            <div class="menu-dropdown" id="menu-header-${trip.id}" style="top:2rem; right:0;">
                                <button onclick="openEditTripModal('${trip.id}')">${t('itinerary.edit_trip')}</button>
                                <button onclick="shareTrip(event, '${trip.id}')">${t('itinerary.share_trip')}</button>
                                <button class="danger" onclick="deleteTrip(event, '${trip.id}')">${t('itinerary.delete_trip')}</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="itinerary-timeline" style="padding: 0;">
                    ${trip.days.map((day, dayIndex) => getDayHTML(day, dayIndex, trip.activeDayId)).join('')}
                </div>
            </section>
            
            <section class="map-view">
                <div class="map-placeholder" id="mock-map-container" style="position:relative; overflow:hidden; background: #eaebd8;">
                    <div id="real-map" style="width:100%; height:100%;"></div>
                    <!-- Dark Mode Toggle -->
                    <button id="map-dark-toggle" onclick="toggleMapDarkMode()" title="${t('itinerary.toggle_map_mode')}" style="position:absolute; top: 10px; right: 10px; z-index: 1000; width: 36px; height: 36px; border-radius: 8px; border: none; background: rgba(255,255,255,0.9); box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: pointer; font-size: 1.2rem; display:flex; align-items:center; justify-content:center; transition: background 0.2s;">☀️</button>
                    <!-- Debug Overlay -->
                    <div id="map-debug-status" style="position:absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: 10px; pointer-events: none; z-index: 1000;">
                        Map Status: Initializing...
                    </div>
                </div>
            </section>
        </div>
        `;
}
