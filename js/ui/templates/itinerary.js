import { state } from '../../state.js';
import { calculateDays } from '../../utils.js';

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
            <div style="background: var(--bg-secondary); border-radius: 12px; padding: 0.8rem 1.2rem; display:flex; align-items:center; gap: 1rem; border: 1px solid var(--glass-border);">
                <div style="width: 24px; height: 24px; border-radius: 50%; background: var(--glass-bg); border: 2px solid var(--glass-border); display:flex; align-items:center; justify-content:center; font-size: 0.85rem; color: var(--text-secondary); flex-shrink: 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    📄
                </div>
                <textarea rows="1" oninput="this.style.height='';this.style.height=this.scrollHeight+'px'" onchange="updateNoteContent('${day.id}', '${stop.id}', this.value)" style="flex:1; background:transparent; border:none; outline:none; color:var(--text-primary); font-size:1rem; padding: 0.2rem; resize:none; overflow:hidden;" placeholder="在此处书写或粘贴笔记">${stop.content || ''}</textarea>
            </div>
        `;
    } else if (stop.type === 'list') {
        circleHtml = '';
        contentHtml = `
            <div style="background: var(--bg-secondary); border-radius: 12px; padding: 1.2rem; border: 1px solid var(--glass-border); display:flex; align-items:flex-start; gap: 1rem;">
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
                        <span>🧳</span> 预制列表
                    </div>
                </div>
            </div>
        `;
    } else {
        const activeColor = day.color || '#5b7a99';
        const pinNumber = locationIdx + 1;

        circleHtml = '';

        contentHtml = `
            <div class="rich-stop-card" onclick="openEditModal('${day.id}', '${stop.id}')" style="background: var(--bg-primary); border-radius: 8px; padding: 1rem; display:flex; gap: 1rem; transition: background 0.2s; cursor: pointer; border: 1px solid var(--glass-border); box-shadow: 0 2px 8px rgba(0,0,0,0.05); align-items: flex-start;">
                <div style="flex:1;">
                    <div style="display:flex; align-items:center; gap: 10px; margin-bottom: 0.3rem;">
                        <div style="width: 24px; height: 24px; background: ${activeColor}; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display:flex; align-items:center; justify-content:center; box-shadow: 0 2px 6px rgba(0,0,0,0.35); flex-shrink:0;">
                            <span style="transform: rotate(45deg); color: #fff; font-size: 0.75rem; font-weight: 700; line-height: 1;">${pinNumber}</span>
                        </div>
                        <h4 style="font-size: 1.1rem; margin: 0; color: var(--text-primary); font-weight: 600; border-left: none !important; padding-left: 0 !important;">${stop.location}</h4>
                    </div>
                    ${stop.desc ? `<p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0 0 0.4rem 0; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;">来自网络：${stop.desc}</p>` : ''}
                    ${stop.note ? `<p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0 0 0.4rem 0; line-height: 1.3;">${stop.note}</p>` : `<p style="color: var(--text-secondary); font-size: 0.85rem; margin: 0 0 0.4rem 0; opacity: 0.6;">添加备注、链接等</p>`}
                    
                    <div style="display:flex; gap: 0.8rem; margin-top: 0.6rem; align-items:center;">
                        <span onclick="openTimePickerDirectly(event, '${day.id}', '${stop.id}')" style="color: #4f46e5; background: rgba(79, 70, 229, 0.1); padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor:pointer;" title="编辑时间">${stop.time} ${stop.period === 'AM' ? '上午' : '下午'}</span>
                        <span onclick="openExpenseDirectly(event, '${day.id}', '${stop.id}')" style="color: ${stop.price && stop.price !== '0' ? '#22c55e' : 'var(--text-secondary)'}; background: ${stop.price && stop.price !== '0' ? 'rgba(34, 197, 94, 0.1)' : 'var(--bg-secondary)'}; padding: 0.2rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; cursor:pointer;" title="编辑费用">${stop.price && stop.price !== '0' ? '$' + parseFloat(stop.price).toFixed(2) : '$ 添加费用'}</span>
                    </div>
                </div>
                <!-- Thumb for Stop -->
                <div style="width: 100px; height: 75px; border-radius: 6px; background-image: url('${stop.photo || 'https://picsum.photos/seed/' + stop.id + '/300/200'}'); background-size: cover; background-position: center; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.2);"></div>
            </div>
        `;
    }

    return `
        ${styleBlock}
        <div class="timeline-item-wrapper id-${stop.id}" style="position:relative; margin-bottom: 0.8rem; padding-left: 36px; padding-right: 62px; display:flex; align-items:flex-start; gap: 0.5rem;" 
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
                <div style="width: 16px; height: 16px; border-radius: 50%; background: ${day.color || '#5b7a99'}; border: 3px solid var(--bg-primary); position: absolute; left: 22px; top: 1.2rem; transform: translate(-50%, -50%); z-index: 2;" title="在${locationIdx + 1}站"></div>
            ` : `
                <div style="width: 10px; height: 10px; border-radius: 50%; background: var(--text-secondary); border: 2px solid var(--bg-primary); position: absolute; left: 22px; top: 1.2rem; transform: translate(-50%, -50%); z-index: 2;"></div>
            `}
            
            <!-- Main Content -->
            <div style="flex:1; min-width: 0;">
                ${contentHtml}
            </div>

            <!-- Right Action (Trash) -->
            <div class="item-hover-action" style="position:absolute; right: 31px; top: 0.3rem; cursor:pointer; color:var(--text-secondary); z-index: 10; opacity:0; pointer-events:none; transition:opacity 0.2s; font-size: 0.95rem; padding: 0.2rem;" onclick="deleteTimelineItem(event, '${day.id}', '${stop.id}')" title="删除">
                🗑️
            </div>
        </div>
        ${(showAddRow || showTransit) ? `
            <div style="padding-left:36px; padding-right:62px; display:flex; align-items:center; gap:0.6rem; position:relative; z-index:2; margin-bottom:0.8rem;">
                ${showAddRow ? `
                <div style="position:relative; display:inline-block; transform: translateX(-50%); margin-left: -14px;">
                    <button onclick="toggleMenu(event, 'add-menu-${stop.id}')" style="width:22px; height:22px; border-radius:50%; background:var(--bg-secondary); border:1.5px solid var(--glass-border); color:var(--text-secondary); cursor:pointer; font-size:1rem; display:flex; align-items:center; justify-content:center; line-height:1; transition: background 0.15s, color 0.15s; flex-shrink:0;" onmouseover="this.style.background='var(--accent-primary)';this.style.color='#fff';this.style.borderColor='var(--accent-primary)';" onmouseout="this.style.background='var(--bg-secondary)';this.style.color='var(--text-secondary)';this.style.borderColor='var(--glass-border)';" title="在此处插入">+</button>
                    <div class="menu-dropdown" id="menu-add-menu-${stop.id}" style="top:1.8rem; left:0; min-width:160px;">
                        <button onclick="showInlineSearchAt('${day.id}', '${stop.id}'); document.getElementById('menu-add-menu-${stop.id}').classList.remove('show');" style="display:flex; align-items:center; gap:8px;"><span>📍</span> 添加地点</button>
                        <button onclick="insertNoteAfterStop('${day.id}', '${stop.id}'); document.getElementById('menu-add-menu-${stop.id}').classList.remove('show');" style="display:flex; align-items:center; gap:8px;"><span>📄</span> 添加笔记</button>
                        <button onclick="insertListAfterStop('${day.id}', '${stop.id}'); document.getElementById('menu-add-menu-${stop.id}').classList.remove('show');" style="display:flex; align-items:center; gap:8px;"><span>✓</span> 添加清单</button>
                    </div>
                </div>
                ` : ''}
                ${showTransit ? `
                <div style="display:flex; align-items:center; gap: 0.6rem;">
                    <span style="font-size: 0.85rem; color: var(--text-secondary);">🚗 ${stop.transitToNext ? `${stop.transitToNext.duration} · ${stop.transitToNext.distance}` : '<span style="opacity:0.5;">计算路程中...</span>'}</span>
                </div>
                ` : ''}
            </div>
        ` : ''}
    `;
}

// --- Day HTML ---
export function getDayHTML(day, dayIndex, activeDayId) {
    const dObj = new Date(day.date);
    const daysOfWeek = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const dayName = isNaN(dObj.getTime()) ? day.date : `${daysOfWeek[dObj.getDay()]}, ${dObj.getMonth() + 1}月 ${dObj.getDate()}日`;

    const colors = ['#5b7a99', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];
    const activeColor = day.color || '#5b7a99';
    const colorPickerHtml = `
        <div style="position:relative; margin-left: auto; margin-right: 15px; display:flex; align-items:center;">
            <div style="width: 14px; height: 14px; border-radius: 50%; background: ${activeColor}; cursor:pointer; border: 2px solid var(--glass-border); box-shadow: 0 1px 3px rgba(0,0,0,0.3); transition: transform 0.1s;" onclick="toggleMenu(event, 'color-${day.id}')" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'" title="更改路线颜色"></div>
            <div class="menu-dropdown" id="menu-color-${day.id}" style="top:1.5rem; right:-0.5rem; flex-direction:row; padding:0.4rem; gap:6px; min-width:auto; border-radius:30px;">
                ${colors.map(c => `
                    <div style="width: 18px; height: 18px; border-radius: 50%; background: ${c}; cursor:pointer; border: 2px solid ${activeColor === c ? 'var(--text-primary)' : 'transparent'}; box-shadow: 0 2px 5px rgba(0,0,0,0.3); transition: transform 0.1s;" onclick="setDayColor('${day.id}', '${c}')" onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"></div>
                `).join('')}
            </div>
        </div>
    `;

    return `
        <div class="day-section" id="${day.id}" style="margin-bottom: 3rem; scroll-margin-top: 120px;">
            <!-- Day Header -->
            <div style="display:flex; align-items:center; margin-bottom: 0.5rem; padding-left: 36px; padding-right: 46px;">
                <h3 style="font-size: 1.5rem; margin:0;">${dayName}</h3>
                ${colorPickerHtml}
                <div style="position:relative;">
                    <button class="menu-dots" style="position:static; transform:none; padding: 0 5px;" onclick="toggleMenu(event, 'day-${day.id}')">⋮</button>
                    <div class="menu-dropdown" id="menu-day-${day.id}" style="top:2rem; right:0;">
                        <button onclick="editDay('${day.id}')">编辑日期</button>
                        <button onclick="shareDay(event, '${day.id}')">好友分享</button>
                        <button class="danger" onclick="deleteDay(event, '${day.id}')">删除日期</button>
                    </div>
                </div>
            </div>
            <div style="color: var(--text-secondary); cursor: pointer; padding-left: 38px; margin-bottom: 0.8rem; font-size: 0.95rem; display:flex; align-items:center;">
                <span id="collapse-arrow-${day.id}" onclick="toggleDayCollapse('${day.id}')" style="display:inline-block; transform:${state.collapsedDays && state.collapsedDays[day.id] ? 'rotate(-90deg)' : 'rotate(0deg)'}; margin-right:4px; transition: transform 0.2s;">▼</span>
                <span id="day-subtitle-${day.id}" onclick="editDaySubtitle('${day.id}')">${day.subtitle || '添加副标题'}</span>
            </div>
            
            <div id="day-content-${day.id}" style="${state.collapsedDays && state.collapsedDays[day.id] ? 'display:none;' : 'display:block;'}; padding-left: 0;">
                <div style="display:flex; gap: 15px; align-items:center; margin-bottom: 0.8rem; font-size: 0.85rem; color: var(--text-secondary); padding-left: 36px;">
                    <button style="background:none; border:none; color: var(--accent-primary); cursor:pointer; font-weight:600; display:flex; align-items:center; gap:5px;">
                        <span style="font-size:1.1rem;">🪄</span> 自动填充日程
                    </button>
                    <button style="background:none; border:none; color: var(--accent-primary); cursor:pointer; font-weight:600; display:flex; align-items:center; gap:5px;">
                        <span style="font-size:1.1rem;">📍</span> 优化路线 <span style="background:var(--accent-primary); color:#FFF; font-size:0.65rem; padding: 1px 4px; border-radius:4px;">PRO</span>
                    </button>
                    <span>·</span>
                    <span>3 小时 49 分钟, 251英里</span>
                </div>

            <div class="timeline-container" style="position: relative;">
                <!-- Vertical continuous dashed line for the whole day -->
                <div style="position: absolute; top: 0; bottom: 0; left: 22px; width: 0; border-left: 2px dashed var(--glass-border); z-index: 0; transform: translateX(-50%);"></div>
                
                ${day.stops.length === 0 ? `
                <div style="padding: 1.5rem 1rem; margin-bottom: 1.5rem; text-align: center; border: 1px dashed var(--glass-border); border-radius: 8px; background: rgba(255,255,255,0.02); position:relative; z-index:2;">
                    <span style="font-size: 2rem; opacity: 0.5;">📅</span>
                    <p style="color:var(--text-secondary); margin: 0.5rem 0 0 0; font-weight: 500;">（暂无行程安排）</p>
                </div>
                ` : ''}
                ${day.stops.map((stop, index) => {
        // showTransit: true if current stop is a location AND there's any location stop after it
        // (notes/lists in between should NOT hide transit time)
        const locationIdx = day.stops.slice(0, index).filter(s => s.type === 'location' || !s.type).length;
        const isLocationStop = stop.type === 'location' || !stop.type;
        const hasNextLocationStop = isLocationStop && day.stops.slice(index + 1).some(
            s => s.type === 'location' || !s.type
        );
        const showAddRow = index < day.stops.length - 1;
        return getTimelineItemHTML(day, stop, index, locationIdx, hasNextLocationStop, showAddRow);
    }).join('')}
            
            <!-- Dedicated Location Search Bar at bottom of Day -->
            <div class="location-search-container" style="position: relative; margin-top: 1rem; padding-left: 36px; display:flex; gap: 0.5rem; padding-right: 46px;">
                <div style="flex:1; position:relative;">
                    <span style="position:absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary);">📍</span>
                    <input type="text" class="location-search-input" style="padding-left: 2.8rem; background: var(--bg-secondary); border: none;" placeholder="添加地点..." oninput="handleSearchInput(event, '${day.id}')" onkeydown="handleSearchKeyDown(event, '${day.id}')" autocomplete="off">
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

    return `
        <div class="dashboard-view fade-in">
            <aside class="sidebar" style="padding-top: 1rem;">
                <button class="btn-secondary" style="margin-bottom:1rem; width:100%; border:none; text-align:left; padding-left:0;" onclick="goDashboard()">
                    ← 返回列表
                </button>
                <h3 style="margin-bottom: 0.5rem;">${trip.title}</h3>
                
                <!-- New Overview Section -->
                <div class="overview-section" style="margin-bottom: 1.5rem;">
                    <button class="btn-secondary" style="width:100%; border:none; text-align:left; padding-left:0; font-weight: 600;" onclick="toggleOverview()">
                        <span id="overview-icon" style="display:inline-block; width:15px;">▼</span> 总览
                    </button>
                    <ul class="trip-navigation" id="sidebar-overview" style="padding-left: 15px; margin-top: 0.5rem;">
                        <li>发现</li>
                        <li>备注</li>
                        <li>要参观的地方</li>
                        <li>无标题</li>
                    </ul>
                </div>

                <ul class="trip-navigation" id="sidebar-nav">
                    ${trip.days.map(day => {
        const activeColor = day.color || '#5b7a99';
        let dateStr = day.date || '';
        if (dateStr.includes('年')) {
            dateStr = dateStr.split('年')[1];
        }
        const stopsCount = day.stops ? day.stops.filter(s => s.type === 'location' || !s.type).length : 0;
        return `
                        <li class="${day.id === trip.activeDayId ? 'active' : ''}" onclick="scrollToDay('${day.id}')" style="display:flex; flex-direction:column; padding-right:10px; margin-bottom:0.5rem; cursor:pointer;">
                            <div style="display:flex; align-items:center; gap: 6px; min-width:0;">
                                <div style="width:8px; height:8px; border-radius:50%; background:${activeColor}; flex-shrink:0;"></div>
                                <span style="white-space:nowrap; font-size:0.85rem; color:${activeColor}; font-weight:600;">${day.title}</span>
                                <span style="font-size:0.85rem; color:${activeColor}; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${dateStr}</span>
                            </div>
                            <div style="padding-left:14px; margin-top:4px;">
                                <span id="sidebar-count-${day.id}" style="font-size:0.75rem; color:var(--text-secondary); white-space:nowrap;">共 ${stopsCount} 站行程</span>
                            </div>
                        </li>
                        `;
    }).join('')}
                </ul>
                <button class="btn-secondary" style="width:100%; border:none; text-align:left; padding-left:0; margin-top:0.5rem;" onclick="addDay()">+ 添加新日期</button>
            </aside>
            
            <section class="main-itinerary" id="itinerary-scroll-container" style="padding-top: 0; padding-left: 0; padding-right: 0;">
                <div class="itinerary-header" id="trip-header-bar" style="padding: 0.75rem 1.5rem; background: var(--bg-secondary); border-bottom: 1px solid var(--glass-border); margin-bottom: 1.5rem; position: sticky; top: 0; z-index: 100;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div style="display:flex; align-items:center; gap: 1rem;">
                            <!-- Compact thumbnail -->
                            <div style="width:56px; height:56px; border-radius:10px; background-image:url('${trip.thumb}'); background-size:cover; background-position:center; border:1px solid var(--glass-border); flex-shrink:0;"></div>
                            <div>
                                <h2 style="margin:0; font-size:1.25rem; line-height:1.2;">${trip.title}</h2>
                                <div style="display:flex; align-items:center; gap:0.6rem; margin-top:0.3rem; flex-wrap:wrap;">
                                    <span id="trip-header-dates" style="color:var(--text-secondary); font-size:0.82rem;">${trip.startDate} 至 ${trip.endDate}</span>
                                    <span id="trip-header-duration" style="background:rgba(167,139,250,0.15); color:var(--accent-secondary); border:1px solid var(--accent-secondary); padding:2px 8px; border-radius:20px; font-size:0.75rem; font-weight:bold;">${calculateDays(trip.startDate, trip.endDate)} 天</span>
                                    <span style="background:rgba(167,139,250,0.15); color:var(--accent-secondary); border:1px solid var(--accent-secondary); padding:2px 8px; border-radius:20px; font-size:0.75rem; font-weight:bold;">1 人</span>
                                </div>
                            </div>
                        </div>
                        <div style="position:relative;">
                            <button class="menu-dots" style="position:static; transform:none;" onclick="toggleMenu(event, 'header-${trip.id}')">⋮</button>
                            <div class="menu-dropdown" id="menu-header-${trip.id}" style="top:2rem; right:0;">
                                <button onclick="openEditTripModal('${trip.id}')">编辑行程</button>
                                <button onclick="shareTrip(event, '${trip.id}')">好友分享</button>
                                <button class="danger" onclick="deleteTrip(event, '${trip.id}')">删除行程</button>
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
                    <button id="map-dark-toggle" onclick="toggleMapDarkMode()" title="切换日间模式" style="position:absolute; top: 10px; right: 10px; z-index: 1000; width: 36px; height: 36px; border-radius: 8px; border: none; background: rgba(255,255,255,0.9); box-shadow: 0 2px 6px rgba(0,0,0,0.3); cursor: pointer; font-size: 1.2rem; display:flex; align-items:center; justify-content:center; transition: background 0.2s;">☀️</button>
                    <!-- Debug Overlay -->
                    <div id="map-debug-status" style="position:absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: 10px; pointer-events: none; z-index: 1000;">
                        Map Status: Initializing...
                    </div>
                </div>
            </section>
        </div>
    `;
}
