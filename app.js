// --- Global State ---
let state = {
    user: null, // null means not logged in
    currentView: 'login', // 'login' | 'dashboard' | 'trip'
    activeTripId: null,
    trips: [
        {
            id: 'trip-1',
            title: "日本东京之旅 🌸",
            startDate: "2026-03-10",
            endDate: "2026-03-12",
            thumb: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
            activeDayId: 'day-1',
            days: [
                {
                    id: 'day-1',
                    title: '第 1 天',
                    date: '2026年3月10日',
                    stops: [
                        { id: 's1', time: '10:00', period: 'AM', location: '东京成田机场', note: '接机服务已安排', price: '0' },
                        { id: 's2', time: '02:00', period: 'PM', location: '酒店入住 (新宿)', note: 'Park Hyatt Tokyo', price: '250' }
                    ]
                }
            ]
        }
    ]
};

// Modal Edit State
let editingStopId = null;
let editingDayId = null;

// --- Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    renderApp();
});

// --- Core Rendering Engine ---
function renderApp() {
    const container = document.getElementById('app-container');

    // Auto-routing based on state
    if (!state.user && state.currentView !== 'login') {
        state.currentView = 'login';
    }

    if (state.currentView === 'login') {
        container.innerHTML = getLoginHTML();
        updateNavLinks();
    } else if (state.currentView === 'dashboard') {
        container.innerHTML = getDashboardHTML();
        updateNavLinks();
    } else if (state.currentView === 'trip') {
        const trip = state.trips.find(t => t.id === state.activeTripId);
        container.innerHTML = getTripHTML(trip);
        updateNavLinks();
    }
}

function updateNavLinks() {
    const nav = document.querySelector('.navbar nav ul');
    if (!state.user) {
        nav.innerHTML = `
            <li><a href="#" class="btn-primary" onclick="state.currentView='login'; renderApp()">登录 / 注册</a></li>
        `;
    } else {
        nav.innerHTML = `
            <li><a href="#" onclick="goDashboard()">我的行程</a></li>
            <li><a href="https://wanderlog.com" target="_blank">灵感</a></li>
            <li class="btn-login"><a href="#">${state.user.name}</a></li>
            <li class="btn-primary"><a href="#" onclick="goDashboard()">开始规划</a></li>
        `;
    }
}

// --- Views HTML Generators ---

function getLoginHTML() {
    return `
        <div class="login-view fade-in">
            <div class="login-card">
                <h2>欢迎来到 Smart Trip</h2>
                <div class="form-group">
                    <label>请输入您的名字开始：</label>
                    <input type="text" id="login-name" placeholder="例如：Alex 旅行者" onkeypress="handleLoginKey(event)">
                </div>
                <button class="btn-main" style="width:100%" onclick="handleLogin()">进入我的旅程</button>
            </div>
        </div>
    `;
}

function getDashboardHTML() {
    if (state.trips.length === 0) {
        return `<div class="trip-dashboard-container fade-in"><h2>您还没有行程，点击右上角开始规划吧！</h2></div>`;
    }

    const cardsHtml = state.trips.map(trip => {
        const duration = calculateDays(trip.startDate, trip.endDate);
        return `
        <div class="trip-card" onclick="openTrip('${trip.id}')">
            <div class="trip-thumb" style="background-image: url('${trip.thumb}')"></div>
            <div class="trip-content">
                <h4>${trip.title}</h4>
                <div class="trip-meta">
                    <span>${trip.startDate} - ${trip.endDate}</span>
                    <span>共 ${duration} 天</span>
                </div>
            </div>
            <button class="menu-dots" onclick="toggleMenu(event, '${trip.id}')">⋮</button>
            <div class="menu-dropdown" id="menu-${trip.id}">
                <button onclick="editTripMetadata(event, '${trip.id}')">编辑行程</button>
                <button onclick="shareTrip(event, '${trip.id}')">分享给好友</button>
                <button class="danger" onclick="deleteTrip(event, '${trip.id}')">删除行程</button>
            </div>
        </div>
        `;
    }).join('');

    return `
        <div class="trip-dashboard-container fade-in">
            <div class="dashboard-header">
                <h2>${state.user.name} 的全部行程</h2>
                <button class="btn-main" onclick="createNewTrip()">+ 新建行程</button>
            </div>
            <div class="trip-grid">
                ${cardsHtml}
            </div>
        </div>
    `;
}

function getTripHTML(trip) {
    if (!trip) return `<h2>行程未找到</h2>`;
    const totalStops = trip.days.reduce((acc, d) => acc + d.stops.length, 0);

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
                    ${trip.days.map(day => `
                        <li class="${day.id === trip.activeDayId ? 'active' : ''}" onclick="scrollToDay('${day.id}')">
                            ${day.title}
                        </li>
                    `).join('')}
                </ul>
                <button class="btn-secondary" style="width:100%; border:none; text-align:left; padding-left:0; margin-top:0.5rem;" onclick="addDay()">+ 添加新日期</button>
            </aside>
            
            <section class="main-itinerary" id="itinerary-scroll-container">
                <div class="itinerary-header">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="display:flex; align-items:center; gap: 2rem;">
                            <!-- Trip Thumbnail on the left -->
                            <div style="width: 160px; height: 110px; border-radius: 12px; background-image: url('${trip.thumb}'); background-size: cover; background-position: center; border: 1px solid var(--glass-border); box-shadow: 0 5px 15px rgba(0,0,0,0.4);"></div>
                            <div>
                                <h2 style="margin-bottom:0.4rem; font-size: 2rem;">${trip.title}</h2>
                                <p style="color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.95rem; font-weight: 500;">
                                    ${trip.startDate} 至 ${trip.endDate}
                                </p>
                                <div class="badges">
                                    <span class="badge">${calculateDays(trip.startDate, trip.endDate)} 天</span>
                                    <span class="badge">1 人</span>
                                </div>
                            </div>
                        </div>
                        <div style="position:relative;">
                            <button class="menu-dots" style="position:static; transform:none;" onclick="toggleMenu(event, 'header-${trip.id}')">⋮</button>
                            <div class="menu-dropdown" id="menu-header-${trip.id}" style="top:2rem; right:0;">
                                <button onclick="openEditTripModal('${trip.id}')">编辑行程</button>
                                <button onclick="shareTrip(event, '${trip.id}')">分享给好友</button>
                                <button class="danger" onclick="deleteTrip(event, '${trip.id}')">删除行程</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="itinerary-timeline" style="padding: 0 1rem; max-width: 900px; margin: 0 auto;">
                    ${trip.days.map((day, dayIndex) => {
        // Determine the day of week and formatted date
        const dObj = new Date(day.date);
        const daysOfWeek = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const dayName = isNaN(dObj.getTime()) ? day.date : `${daysOfWeek[dObj.getDay()]}, ${dObj.getMonth() + 1}月 ${dObj.getDate()}日`;

        return `
                        <div class="day-section" id="${day.id}" style="margin-bottom: 3rem;">
                            <!-- Day Header -->
                            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
                                <h3 style="font-size: 1.5rem; margin:0;">${dayName}</h3>
                                <button class="menu-dots" style="position:static; transform:none; padding: 0 5px;">⋮</button>
                            </div>
                            <div style="color: var(--text-secondary); cursor: pointer; padding-left: 2px; margin-bottom: 0.8rem; font-size: 0.95rem;">
                                <span><span style="display:inline-block; transform:rotate(-90deg); margin-right:4px;">▼</span> 添加副标题</span>
                            </div>
                            <div style="display:flex; gap: 15px; align-items:center; margin-bottom: 0.8rem; font-size: 0.85rem; color: var(--text-secondary);">
                                <button style="background:none; border:none; color: var(--accent-primary); cursor:pointer; font-weight:600; display:flex; align-items:center; gap:5px;">
                                    <span style="font-size:1.1rem;">🪄</span> 自动填充日程
                                </button>
                                <button style="background:none; border:none; color: var(--accent-primary); cursor:pointer; font-weight:600; display:flex; align-items:center; gap:5px;">
                                    <span style="font-size:1.1rem;">📍</span> 优化路线 <span style="background:var(--accent-primary); color:#FFF; font-size:0.65rem; padding: 1px 4px; border-radius:4px;">PRO</span>
                                </button>
                                <span>·</span>
                                <span>3 小时 49 分钟, 251英里</span>
                            </div>

                            <div class="timeline-container" style="position: relative; padding-left: 1.8rem;">
                                <!-- Vertical continuous dashed line for the whole day -->
                                <div style="position: absolute; top: 0; bottom: 0; left: 0.9rem; width: 0; border-left: 2px dashed var(--glass-border); z-index: 0; transform: translateX(-1px);"></div>
                                
                                ${day.stops.length === 0 ? '<p style="color:var(--text-secondary); margin-bottom:1rem; position:relative; z-index:2; padding-left:1rem;">还没有安排地点。</p>' : ''}
                                ${day.stops.map((stop, index) => `
                                    <!-- Stop Sequence Node -->
                                    <div style="position:relative; margin-bottom: 0;">
                                        <!-- Timeline Circle -->
                                        <div style="position: absolute; left: -1.8rem; top: 1.2rem; width: 1.8rem; height: 1.8rem; border-radius: 50%; background: ${index === 0 ? 'var(--text-secondary)' : 'var(--accent-secondary)'}; color: #FFF; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.95rem; z-index: 2; border: 2px solid var(--bg-primary);">
                                            ${index === 0 ? '✔' : index + 1}
                                        </div>
                                        
                                        <!-- Rich Stop Card -->
                                        <div class="rich-stop-card" onclick="openEditModal('${day.id}', '${stop.id}')" style="background: var(--bg-secondary); border-radius: 12px; padding: 1.2rem; display:flex; gap: 1.5rem; transition: background 0.2s; cursor: pointer; border: 1px solid transparent;">
                                            <div style="flex:1;">
                                                <h4 style="font-size: 1.15rem; margin-bottom: 0.5rem;">${stop.location}</h4>
                                                ${stop.desc ? `<p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 0.5rem; line-height: 1.4;">来自网络：${stop.desc}</p>` : ''}
                                                ${stop.address ? `<p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem; display:flex; align-items:center; gap:5px;"><span style="font-size:1rem;">📍</span>${stop.address}</p>` : ''}
                                                ${stop.phone ? `<p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem; display:flex; align-items:center; gap:5px;"><span style="font-size:1rem;">📞</span>${stop.phone}</p>` : ''}
                                                ${stop.note ? `<p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1rem; line-height: 1.4;">${stop.note}</p>` : `<p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1rem; opacity: 0.6;">在此添加备注、链接等</p>`}
                                                
                                                <div style="display:flex; gap: 0.8rem; margin-top: auto;">
                                                    <span onclick="openTimePickerDirectly(event, '${day.id}', '${stop.id}')" style="background: rgba(167, 139, 250, 0.1); color: var(--accent-secondary); padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor:pointer;" title="编辑时间">${stop.time} ${stop.period === 'AM' ? '上午' : '下午'}</span>
                                                    ${stop.price !== "0" && stop.price !== "" ? `<span onclick="openExpenseDirectly(event, '${day.id}', '${stop.id}')" style="background: rgba(167, 139, 250, 0.1); color: var(--accent-secondary); padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor:pointer;" title="编辑费用">$${stop.price}</span>` : ''}
                                                </div>
                                            </div>
                                            
                                            <!-- Thumb for Stop (Mocked) -->
                                            <div style="width: 140px; height: 95px; border-radius: 8px; background-image: url('https://picsum.photos/seed/${stop.id}/300/200'); background-size: cover; background-position: center; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"></div>
                                        </div>
                                        
                                        <!-- Transit Info (Only if not last stop) -->
                                        ${index < day.stops.length - 1 ? `
                                            <div style="padding: 0.5rem 0 0.5rem 0.5rem; font-size: 0.85rem; color: var(--text-secondary); display:flex; align-items:center; gap: 0.5rem; position:relative; z-index:2;">
                                                <span>🚗 1 小时 15 分钟 · 45英里 ▼ 路线</span>
                                            </div>
                                        ` : ''}
                                    </div>
                                `).join('')}
                            </div>
                            
                            <!-- Wanderlog Style Empty Add Card -->
                            <div style="background: var(--bg-secondary); border-radius: 12px; margin-top: 2rem; padding: 1.2rem; cursor: pointer;">
                                <h4 style="color: var(--text-primary); margin-bottom: 0.8rem; font-size: 1.05rem;">添加标题</h4>
                                <div style="display:flex; align-items:center; gap:0.5rem; color: var(--text-secondary); margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid var(--glass-border);">
                                    <div style="width: 16px; height: 16px; border: 2px solid var(--text-secondary); border-radius: 50%;"></div>
                                    <span>添加一些项目</span>
                                </div>
                                <div style="color: var(--text-primary); font-weight: 600; display:flex; align-items:center; gap:0.5rem;">
                                    <span>🧳</span> 预制列表
                                </div>
                            </div>
                            
                            <!-- Dedicated Location Search Bar at bottom of Day -->
                            <div class="location-search-container" style="position: relative; margin-top: 1rem; display:flex; gap: 0.5rem;">
                                <div style="flex:1; position:relative;">
                                    <span style="position:absolute; left: 1rem; top: 50%; transform: translateY(-50%); color: var(--text-secondary);">📍</span>
                                    <input type="text" class="location-search-input" style="padding-left: 2.8rem; background: var(--bg-secondary); border: none;" placeholder="添加地点..." oninput="handleSearchInput(event, '${day.id}')" onblur="setTimeout(() => closeSearchDropdown('${day.id}'), 200)">
                                    <ul class="location-autocomplete-dropdown" id="search-dropdown-${day.id}"></ul>
                                </div>
                                <button style="width: 45px; height: 45px; border-radius: 50%; background: var(--bg-secondary); border:none; display:flex; align-items:center; justify-content:center; color: var(--text-primary); cursor:pointer;"><span style="transform:rotate(90deg);">📄</span></button>
                                <button style="width: 45px; height: 45px; border-radius: 50%; background: var(--bg-secondary); border:none; display:flex; align-items:center; justify-content:center; color: var(--text-primary); cursor:pointer;"><span>≡</span></button>
                            </div>
                            
                        </div>
                    `;
    }).join('')}
                </div>
            </section>
            
            <section class="map-view">
                <div class="map-placeholder" id="mock-map-container" style="position:relative; overflow:hidden; background-image:url('https://images.unsplash.com/photo-1524661135-423995f22d0b?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80'); background-size:cover; background-position:center;">
                    <div style="position:absolute; inset:0; background: rgba(0,0,0,0.4);"></div> <!-- Map Dark Overlay -->
                    ${renderMockMapPins(trip)}
                    <div class="glass-card" style="position:absolute; bottom: 2rem; right: 2rem; padding: 1rem; text-align: center; border-radius: 12px; background: rgba(30, 30, 30, 0.8);">
                        <p style="margin-bottom: 0.5rem; font-weight:bold;">地图预览 (Mock)</p>
                        <small style="color: var(--text-secondary)">当前已标记 ${totalStops} 个地点</small>
                    </div>
                </div>
            </section>
        </div>
    `;
}

function renderMockMapPins(trip) {
    let pinsHtml = '';
    let pinCount = 0;

    // Use stable pseudo-random positions based on string length to mock coordinates
    trip.days.forEach(day => {
        day.stops.forEach((stop, i) => {
            pinCount++;
            // Generate deterministic but seemingly random x/y positions (10% to 90%)
            const hash = stop.location.length + i * 13;
            const x = 10 + (hash % 80);
            const y = 10 + ((hash * 7) % 80);

            pinsHtml += `
            <div style="position:absolute; top:${y}%; left:${x}%; transform:translate(-50%, -100%); display:flex; flex-direction:column; align-items:center; cursor:pointer;" title="${stop.location}">
                <div style="background:var(--accent-primary); color:white; padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight:bold; margin-bottom: 2px; box-shadow: 0 2px 5px rgba(0,0,0,0.5);">${pinCount}</div>
                <div style="width: 20px; height: 28px; background: #ea4335; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display:flex; align-items:center; justify-content:center; box-shadow: -2px 2px 4px rgba(0,0,0,0.4);">
                    <div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div>
                </div>
            </div>`;
        });
    });

    return pinsHtml;
}

// --- Action Handlers ---

function handleLoginKey(e) {
    if (e.key === 'Enter') handleLogin();
}

function handleLogin() {
    const nameInput = document.getElementById('login-name').value.trim();
    if (!nameInput) {
        alert("请输入名字");
        return;
    }
    state.user = { name: nameInput };
    state.currentView = 'dashboard';
    renderApp();
}

function goDashboard() {
    state.currentView = 'dashboard';
    renderApp();
}

function openTrip(tripId) {
    state.activeTripId = tripId;
    state.currentView = 'trip';
    renderApp();
}

function calculateDays(start, end) {
    const d1 = new Date(start);
    const d2 = new Date(end);
    if (isNaN(d1) || isNaN(d2)) return 0;
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// Menu Dots
function toggleMenu(event, tripId) {
    event.stopPropagation(); // Prevent opening trip
    const menu = document.getElementById(`menu-${tripId}`);

    // close others
    document.querySelectorAll('.menu-dropdown').forEach(d => {
        if (d.id !== `menu-${tripId}`) d.classList.remove('active');
    });

    menu.classList.toggle('active');
}

document.addEventListener('click', () => {
    document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('active'));
});

function deleteTrip(event, tripId) {
    if (event) event.stopPropagation();
    if (confirm("确定要删除这个行程吗？")) {
        state.trips = state.trips.filter(t => t.id !== tripId);
        if (state.activeTripId === tripId) {
            goDashboard();
        } else {
            renderApp();
        }
    }
}

function shareTrip(event, tripId) {
    if (event) event.stopPropagation();
    alert("分享链接已复制！");
}

// Edit Trip Metadata Modal
function openEditTripModal(tripId) {
    editingTripId = tripId;
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
                <input type="text" id="trip-edit-search" placeholder="输入关键词 (例如: Tokyo, Beach)" style="flex:1; background:var(--bg-primary); border:1px solid var(--glass-border); padding:0.6rem 0.8rem; border-radius:8px; color:var(--text-primary);">
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
    flatpickr(".date-picker-input", {
        locale: "zh",
        dateFormat: "Y-m-d",
        theme: "dark"
    });

    // Auto-load some images based on the trip title
    searchImages(trip.title.replace(/[^a-zA-Z]/g, '') || "travel");
}

function searchImages(query) {
    const q = query || document.getElementById('trip-edit-search').value || 'travel';
    const grid = document.getElementById('image-grid');
    grid.innerHTML = '<p style="grid-column: span 3; color: var(--text-secondary); text-align:center; padding: 1rem 0;">搜索中 (Mock)...</p>';

    setTimeout(() => {
        let html = '';
        // Mock search using picsum seeds to generate 9 consistent random images for a keyword
        for (let i = 1; i <= 9; i++) {
            const seed = encodeURIComponent(q.trim()) + i;
            const url = `https://picsum.photos/seed/${seed}/300/200`;
            html += `<div class="image-thumb-option" onclick="selectImage(event, '${url}')" style="background-image:url('${url}')"></div>`;
        }
        grid.innerHTML = html;
    }, 400);
}

function selectImage(event, url) {
    document.getElementById('trip-edit-thumb').value = url;
    document.querySelectorAll('.image-thumb-option').forEach(el => el.classList.remove('selected'));
    event.target.classList.add('selected');
}

function saveTripMetadata() {
    const title = document.getElementById('trip-edit-title').value;
    const thumb = document.getElementById('trip-edit-thumb').value;
    const start = document.getElementById('trip-edit-start').value;
    const end = document.getElementById('trip-edit-end').value;

    const trip = state.trips.find(t => t.id === editingTripId);
    if (title) trip.title = title;
    if (thumb) trip.thumb = thumb;
    if (start) trip.startDate = start;
    if (end) trip.endDate = end;

    closeModal();
    renderApp();
}

function createNewTrip() {
    const newId = 'trip-' + Date.now();
    const startStr = "2026-05-01";
    let d = new Date(startStr);
    let displayDate = !isNaN(d) ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日` : "2026年5月1日";

    state.trips.push({
        id: newId,
        title: "新的神秘冒险",
        startDate: startStr,
        endDate: "2026-05-05",
        thumb: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
        activeDayId: 'day-1',
        days: [
            { id: 'day-1', title: '第 1 天', date: displayDate, stops: [] }
        ]
    });
    renderApp();
}

// Details View Actions
function toggleOverview() {
    const ov = document.getElementById('sidebar-overview');
    const icon = document.getElementById('overview-icon');
    if (ov.style.display === 'none') {
        ov.style.display = 'block';
        icon.innerText = '▼';
    } else {
        ov.style.display = 'none';
        icon.innerText = '▶';
    }
}

function scrollToDay(id) {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    trip.activeDayId = id;
    renderApp();
    const element = document.getElementById(id);
    if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
    }
}

function addDay() {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    const newDayNum = trip.days.length + 1;
    const newDayId = `day-${Date.now()}`;

    // Auto calculate next date
    let newDateStr = '未知日期';
    if (trip.startDate) {
        let d = new Date(trip.startDate);
        d.setDate(d.getDate() + trip.days.length);
        if (!isNaN(d)) {
            newDateStr = `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
        }
    }

    trip.days.push({
        id: newDayId,
        title: `第 ${newDayNum} 天`,
        date: newDateStr,
        stops: []
    });
    renderApp();
    scrollToDay(newDayId);
}

// --- Modals (Add / Edit Stop) ---
function getTimeOptions(selectedH, selectedM) {
    let hoursStr = '';
    for (let i = 1; i <= 12; i++) {
        let val = i.toString().padStart(2, '0');
        hoursStr += `<option value="${val}" ${selectedH === val ? 'selected' : ''}>${val}</option>`;
    }
    let minsStr = '';
    for (let i = 0; i < 60; i += 15) {
        let val = i.toString().padStart(2, '0');
        minsStr += `<option value="${val}" ${selectedM === val ? 'selected' : ''}>${val}</option>`;
    }
    return { hoursStr, minsStr };
}

function openAddModal(dayId) {
    editingTripId = state.activeTripId;
    editingDayId = dayId;
    editingStopId = null; // null means ADD

    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');

    title.innerText = `添加目的地`;

    const { hoursStr, minsStr } = getTimeOptions('10', '00');

    body.innerHTML = `
        <div class="form-group">
            <label>地点名称</label>
            <input type="text" id="stop-location" placeholder="例如：大英博物馆" value="">
        </div>
        <div class="form-group">
            <label>时间</label>
            <div class="time-row">
                <select id="stop-time-h">${hoursStr}</select>
                <span style="display:flex; align-items:center;">:</span>
                <select id="stop-time-m">${minsStr}</select>
                <select id="stop-time-p"><option value="AM">AM</option><option value="PM">PM</option></select>
            </div>
        </div>
        <div class="form-group">
            <label>备注/小贴士</label>
            <textarea id="stop-note" placeholder="提醒我买票..."></textarea>
        </div>
        <div class="form-group">
            <label>预计费用 (USD)</label>
            <div style="display:flex; align-items:center;">
                <span style="font-size:1.2rem; margin-right:8px;">$</span>
                <input type="number" id="stop-price" placeholder="0" value="">
            </div>
        </div>
        <button class="submit-btn" onclick="saveStop()">确认添加</button>
    `;

    const overlay = document.getElementById('modal-overlay');
    overlay.classList.add('active');
    overlay.classList.remove('hidden');
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

function openEditModal(dayId, stopId) {
    editingTripId = state.activeTripId;
    editingDayId = dayId;
    editingStopId = stopId;

    const trip = state.trips.find(t => t.id === editingTripId);
    const day = trip.days.find(d => d.id === dayId);
    const stop = day.stops.find(s => s.id === stopId);

    const title = document.getElementById('modal-title');
    const body = document.getElementById('modal-body');
    title.innerText = `Add more about your visit`;

    // We mock the right thumbnail using picsum
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
            <textarea id="stop-note" placeholder="Add notes about your visit" style="min-height: 100px; font-size:1rem; padding: 1rem;">${stop.note}</textarea>
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

function openTimePickerModal() {
    const title = document.getElementById('sub-modal-title');
    const body = document.getElementById('sub-modal-body');
    title.innerText = ''; // Render custom layout

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

let isDirectEdit = false;

function openTimePickerDirectly(event, dayId, stopId) {
    event.stopPropagation();
    editingTripId = state.activeTripId;
    editingDayId = dayId;
    editingStopId = stopId;
    isDirectEdit = true;
    openTimePickerModal();
}

function openExpenseDirectly(event, dayId, stopId) {
    event.stopPropagation();
    editingTripId = state.activeTripId;
    editingDayId = dayId;
    editingStopId = stopId;
    isDirectEdit = true;
    openExpenseModal();
}

function selectMockTime(time, period) {
    if (isDirectEdit) {
        const trip = state.trips.find(t => t.id === state.activeTripId);
        const day = trip.days.find(d => d.id === editingDayId);
        const stop = day.stops.find(s => s.id === editingStopId);
        if (stop) {
            stop.time = time;
            stop.period = period;
        }
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
    const day = trip.days.find(d => d.id === editingDayId);
    const stop = editingStopId ? day.stops.find(s => s.id === editingStopId) : { location: '', price: '' };

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
    const day = trip.days.find(d => d.id === editingDayId);

    if (editingStopId) {
        const stop = day.stops.find(s => s.id === editingStopId);
        if (stop) stop.price = amount;
    } else {
        window.tempNewStopPrice = amount;
    }

    if (isDirectEdit) {
        renderApp();
        isDirectEdit = false;
    }
    closeSubModal();
}

function saveStop() {
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

    // Sync mock price logic
    let price = '0';
    if (editingStopId) {
        price = day.stops.find(s => s.id === editingStopId).price || '0';
    } else if (window.tempNewStopPrice) {
        price = window.tempNewStopPrice;
        window.tempNewStopPrice = null;
    }

    if (!loc) {
        alert("请输入地点名称");
        return;
    }

    const trip = state.trips.find(t => t.id === state.activeTripId);
    const day = trip.days.find(d => d.id === editingDayId);

    if (editingStopId) {
        // Edit mode
        const stop = day.stops.find(s => s.id === editingStopId);
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
            let [h, m] = time.split(':').map(Number);
            if (period === 'PM' && h !== 12) h += 12;
            if (period === 'AM' && h === 12) h = 0;
            return h * 60 + m;
        };
        return parseTime(a.time, a.period) - parseTime(b.time, b.period);
    });

    closeModal();
    renderApp();
}

function deleteStop() {
    if (confirm("确定删除这个目的地吗？")) {
        const trip = state.trips.find(t => t.id === state.activeTripId);
        const day = trip.days.find(d => d.id === editingDayId);
        day.stops = day.stops.filter(s => s.id !== editingStopId);
        closeModal();
        renderApp();
    }
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}

// --- Autocomplete Auto-Add Search ---
let searchTimeout = null;

function handleSearchInput(event, dayId) {
    const query = event.target.value.trim();
    const dropdown = document.getElementById(`search-dropdown-${dayId}`);

    if (searchTimeout) clearTimeout(searchTimeout);

    if (!query) {
        dropdown.classList.remove('active');
        return;
    }

    searchTimeout = setTimeout(() => {
        // Mock Google Maps autocomplete results
        const mockResults = [
            { name: query, type: '旅游景点', desc: '热门搜索推荐' },
            { name: query + ' 附近酒店', type: '住宿', desc: '热门点评' },
            { name: query + ' 中央火车站', type: '交通枢纽', desc: '市区核心交通' }
        ];

        dropdown.innerHTML = mockResults.map(r => `
            <li onmousedown="autoAddStop('${dayId}', '${r.name}', '${r.desc}')">
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <span style="font-weight:600; color:var(--text-primary); font-size:1.1rem;">
                        <span style="color:var(--text-secondary); margin-right:8px;">📍</span>${r.name}
                    </span>
                    <span style="font-size:0.85rem; color:var(--text-secondary); padding-left:26px;">
                        ${r.desc} · ${r.type}
                    </span>
                </div>
            </li>
        `).join('');

        dropdown.classList.add('active');
    }, 250);
}

function closeSearchDropdown(dayId) {
    const dropdown = document.getElementById(`search-dropdown-${dayId}`);
    if (dropdown) dropdown.classList.remove('active');
}

function autoAddStop(dayId, locationName, mockDescType = '') {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    const day = trip.days.find(d => d.id === dayId);

    // Auto calculate a realistic time (+2 hours from last stop)
    let timeStr = '09:00';
    let period = 'AM';

    if (day.stops.length > 0) {
        const lastStop = day.stops[day.stops.length - 1];
        let [h, m] = lastStop.time.split(':').map(Number);
        if (lastStop.period === 'PM' && h !== 12) h += 12;
        if (lastStop.period === 'AM' && h === 12) h = 0;

        h += 2; // +2 hours
        if (h >= 24) h -= 24;

        period = h >= 12 ? 'PM' : 'AM';
        let displayH = h % 12;
        if (displayH === 0) displayH = 12;

        timeStr = `${displayH.toString().padStart(2, '0')}:${lastStop.time.split(':')[1]}`;
    }

    // Generate some fake descriptive text based on the mock type
    const fakeDesc = `${locationName} is a wonderful destination known for its outstanding architecture and vibrant local culture. ${mockDescType ? 'Highly recommended for any traveler.' : ''}`;

    day.stops.push({
        id: 's' + Date.now(),
        location: locationName,
        desc: fakeDesc,
        address: '123 Fake Street, Mock City 00100',
        phone: '+1 800 555 1234',
        time: timeStr,
        period: period,
        note: '',
        price: '0'
    });

    day.stops.sort((a, b) => {
        const parseTime = (time, p) => {
            let [hh, mm] = time.split(':').map(Number);
            if (p === 'PM' && hh !== 12) hh += 12;
            if (p === 'AM' && hh === 12) hh = 0;
            return hh * 60 + mm;
        };
        return parseTime(a.time, a.period) - parseTime(b.time, b.period);
    });

    renderApp();
}

// Fade in animation helper class injected by CSS
const style = document.createElement('style');
style.textContent = `
    .fade-in { animation: fadeIn 0.4s forwards ease-in-out; }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(style);
