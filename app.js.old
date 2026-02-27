// --- Global State ---
let state = {
    user: null, // null means not logged in
    currentView: 'login', // 'login' | 'dashboard' | 'trip'
    activeTripId: null,
    trips: []
};

// Modal Edit State
let editingStopId = null;
let editingDayId = null;

// --- Category Icons Map ---
const PLACE_CATEGORY_MAP = {
    // Dining
    'restaurant': { icon: '🍴', label: '餐饮' },
    'cafe': { icon: '☕', label: '咖啡馆' },
    'bar': { icon: '🍸', label: '酒吧' },
    'bakery': { icon: '🥐', label: '面包房' },
    'meal_takeaway': { icon: '🥡', label: '外卖' },
    // Transportation
    'airport': { icon: '✈️', label: '机场' },
    'train_station': { icon: '🚆', label: '火车站' },
    'transit_station': { icon: '🚉', label: '中转站' },
    'bus_station': { icon: '🚌', label: '汽车站' },
    'subway_station': { icon: '🚇', label: '地铁站' },
    // Lodging
    'lodging': { icon: '🏨', label: '住宿' },
    'hotel': { icon: '🏨', label: '酒店' },
    // Attractions
    'museum': { icon: '🏛️', label: '博物馆' },
    'art_gallery': { icon: '🎨', label: '美术馆' },
    'tourist_attraction': { icon: '🏛️', label: '景点' },
    'aquarium': { icon: '🐠', label: '水族馆' },
    'zoo': { icon: '🦁', label: '动物园' },
    'amusement_park': { icon: '🎡', label: '游乐园' },
    'park': { icon: '🌳', label: '公园' },
    // Shopping
    'shopping_mall': { icon: '🛍️', label: '购物中心' },
    'store': { icon: '🛍️', label: '商店' },
    'supermarket': { icon: '🛒', label: '超市' },
    // Services
    'gas_station': { icon: '⛽', label: '加油站' },
    'bank': { icon: '🏦', label: '银行' },
    'hospital': { icon: '🏥', label: '医院' },
    'pharmacy': { icon: '💊', label: '药店' },
    'parking': { icon: '🅿️', label: '停车场' }
};

function getCategoryFromTypes(types) {
    if (!types || !types.length) return { icon: '📍', label: '地点' };
    for (const type of types) {
        if (PLACE_CATEGORY_MAP[type]) return PLACE_CATEGORY_MAP[type];
    }
    return { icon: '📍', label: '地点' };
}

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

// --- Entry Point ---
document.addEventListener('DOMContentLoaded', () => {
    loadData().then(() => {
        try {
            renderApp();
        } catch (e) {
            console.error("Render crash:", e);
        }
    });
});

async function loadData() {
    try {
        const response = await fetch('/api/data');
        if (response.ok) {
            const data = await response.json();
            if (data.trips && data.trips.length > 0) {
                state = data; // replace default state with DB state
            }
        }
    } catch (e) {
        console.error("Failed to load DB from server. Running with empty defaults.", e);
    }
}

async function saveData() {
    try {
        await fetch('/api/save', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(state)
        });
    } catch (e) {
        console.error("Failed to save state to server.", e);
    }
}

// --- Core Rendering Engine ---
function renderApp() {
    try {
        const container = document.getElementById('app-container');
        if (!container) return;

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
            if (!trip) {
                state.currentView = 'dashboard';
                renderApp();
                return;
            }
            container.innerHTML = getTripHTML(trip);
            updateNavLinks();
            setTimeout(() => {
                if (window.googleMapsReady) {
                    initRealMap();
                }
            }, 50);
        }
    } catch (err) {
        console.error("Critical Render Error:", err);
        document.getElementById('app-container').innerHTML = `
            <div style="padding: 2rem; color: white;">
                <h2>渲染出错 (Render Error)</h2>
                <pre>${err.stack}</pre>
                <button onclick="state.currentView='dashboard'; renderApp()">返回首页</button>
            </div>
        `;
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

function getDayHTML(day, dayIndex, activeDayId) {
    const dObj = new Date(day.date);
    const daysOfWeek = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
    const dayName = isNaN(dObj.getTime()) ? day.date : `${daysOfWeek[dObj.getDay()]}, ${dObj.getMonth() + 1}月 ${dObj.getDate()}日`;

    return `
        <div class="day-section" id="${day.id}" style="margin-bottom: 3rem;">
            <!-- Day Header -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 0.5rem;">
                <h3 style="font-size: 1.5rem; margin:0;">${dayName}</h3>
                <div style="position:relative;">
                    <button class="menu-dots" style="position:static; transform:none; padding: 0 5px;" onclick="toggleMenu(event, 'day-${day.id}')">⋮</button>
                    <div class="menu-dropdown" id="menu-day-${day.id}" style="top:2rem; right:0;">
                        <button onclick="editDay('${day.id}')">编辑日期</button>
                        <button onclick="shareDay(event, '${day.id}')">好友分享</button>
                        <button class="danger" onclick="deleteDay(event, '${day.id}')">删除日期</button>
                    </div>
                </div>
            </div>
            <div style="color: var(--text-secondary); cursor: pointer; padding-left: 2px; margin-bottom: 0.8rem; font-size: 0.95rem; display:flex; align-items:center;">
                <span id="collapse-arrow-${day.id}" onclick="toggleDayCollapse('${day.id}')" style="display:inline-block; transform:${state.collapsedDays && state.collapsedDays[day.id] ? 'rotate(-90deg)' : 'rotate(0deg)'}; margin-right:4px; transition: transform 0.2s;">▼</span>
                <span id="day-subtitle-${day.id}" onclick="editDaySubtitle('${day.id}')">${day.subtitle || '添加副标题'}</span>
            </div>
            
            <div id="day-content-${day.id}" style="${state.collapsedDays && state.collapsedDays[day.id] ? 'display:none;' : 'display:block;'}">
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
                ${day.stops.map((stop, index) => {
        let locationIdx = day.stops.slice(0, index).filter(s => s.type !== 'note' && s.type !== 'list').length;
        let isLast = index === day.stops.length - 1;
        return getTimelineItemHTML(day, stop, index, locationIdx, !isLast && day.stops[index + 1] && (day.stops[index + 1].type === 'location' || !day.stops[index + 1].type));
    }).join('')}
            
            <!-- Dedicated Location Search Bar at bottom of Day -->
            <div class="location-search-container" style="position: relative; margin-top: 1rem; display:flex; gap: 0.5rem;">
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
            
            <section class="main-itinerary" id="itinerary-scroll-container" style="padding-top: 0; padding-left: 0; padding-right: 0;">
                <div class="itinerary-header" style="padding: 1.5rem 1.5rem 2rem 1.5rem; background: var(--bg-secondary); border-bottom: 1px solid var(--glass-border); margin-bottom: 2rem;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div style="display:flex; align-items:center; gap: 2rem;">
                            <!-- Trip Thumbnail on the left -->
                            <div style="width: 160px; height: 110px; border-radius: 12px; background-image: url('${trip.thumb}'); background-size: cover; background-position: center; border: 1px solid var(--glass-border); box-shadow: 0 5px 15px rgba(0,0,0,0.4);"></div>
                            <div>
                                <h2 style="margin-bottom:0.4rem; font-size: 2.2rem; margin-top:0;">${trip.title}</h2>
                                <p style="color: var(--text-secondary); margin-bottom: 1rem; font-size: 0.95rem; font-weight: 500;">
                                    ${trip.startDate} 至 ${trip.endDate}
                                </p>
                                <div class="badges">
                                    <span class="badge" style="background: rgba(167, 139, 250, 0.15); color: var(--accent-secondary); border: 1px solid var(--accent-secondary); padding: 5px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold;">${calculateDays(trip.startDate, trip.endDate)} 天</span>
                                    <span class="badge" style="background: rgba(167, 139, 250, 0.15); color: var(--accent-secondary); border: 1px solid var(--accent-secondary); padding: 5px 10px; border-radius: 20px; font-size: 0.85rem; font-weight: bold;">1 人</span>
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
                
                <div class="itinerary-timeline" style="padding: 0 1rem 0 3.5rem; max-width: 900px; margin: 0 auto;">
                    ${trip.days.map((day, dayIndex) => getDayHTML(day, dayIndex, trip.activeDayId)).join('')}
                </div>
            </section>
            
            <section class="map-view">
                <div class="map-placeholder" id="mock-map-container" style="position:relative; overflow:hidden; background: #eaebd8;">
                    <div id="real-map" style="width:100%; height:100%;"></div>
                    <!-- Debug Overlay (Hidden by default) -->
                    <div id="map-debug-status" style="position:absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 4px; font-size: 10px; pointer-events: none; z-index: 1000;">
                        Map Status: Initializing...
                    </div>
                </div>
            </section>
        </div>
    `;
}

// --- Google Maps Integration ---
window.initGoogleMaps = function () {
    try {
        window.googleMapsReady = true;
        console.log("Google Maps API callback triggered (initGoogleMaps)");
        if (state.currentView === 'trip') {
            initRealMap();
        }
    } catch (e) {
        console.error("initGoogleMaps failed:", e);
    }
};

// Fallback in case the script loaded before this function was defined
if (typeof google !== 'undefined' && google.maps && !window.googleMapsReady) {
    window.initGoogleMaps();
}

window.googleMapInstance = null;
window.googleMapMarkers = [];

function initRealMap() {
    console.log("initRealMap called. window.googleMapsReady:", window.googleMapsReady);
    const debugEl = document.getElementById('map-debug-status');

    try {
        if (!window.googleMapsReady || typeof google === 'undefined') {
            if (debugEl) debugEl.innerText = "Map Status: Google Maps API Not Loaded";
            return;
        }
        const mapDiv = document.getElementById('real-map');
        if (!mapDiv) {
            console.error("real-map div not found");
            return;
        }
        if (debugEl) debugEl.innerText = "Map Status: Initializing Google Map Instance...";

        // Always recreate the map instance because the DOM is recreated by renderApp
        window.googleMapInstance = new google.maps.Map(mapDiv, {
            center: { lat: 35.6895, lng: 139.6917 },
            zoom: 12,
            mapId: 'DEMO_MAP_ID',
            disableDefaultUI: true,
            zoomControl: true
        });

        // clear markers
        if (window.googleMapMarkers) {
            window.googleMapMarkers.forEach(m => {
                if (m && typeof m.setMap === 'function') m.setMap(null);
            });
        }
        window.googleMapMarkers = [];

        const trip = state.trips.find(t => t.id === state.activeTripId);
        if (!trip) return;

        const bounds = new google.maps.LatLngBounds();
        let hasValidPins = false;
        let pinCount = 0;

        trip.days.forEach(day => {
            if (!day.stops) return;
            day.stops.forEach((stop) => {
                if (stop.type !== 'location' || !stop.location) return;
                pinCount++;
                if (stop.lat !== undefined && stop.lng !== undefined) {
                    const pos = { lat: Number(stop.lat), lng: Number(stop.lng) };
                    if (isNaN(pos.lat) || isNaN(pos.lng)) return;

                    const marker = new google.maps.Marker({
                        position: pos,
                        map: window.googleMapInstance,
                        title: stop.location,
                        label: { text: String(pinCount), color: 'white', fontSize: '10px' }
                    });
                    window.googleMapMarkers.push(marker);
                    bounds.extend(pos);
                    hasValidPins = true;
                }
            });
        });

        if (hasValidPins) {
            window.googleMapInstance.fitBounds(bounds);
            if (debugEl) debugEl.innerText = `Map Status: Ready (${pinCount} pins)`;
            // Avoid zooming in too close if only 1 pin
            if (window.googleMapMarkers.length === 1) {
                setTimeout(() => { if (window.googleMapInstance) window.googleMapInstance.setZoom(15); }, 200);
            }
        } else {
            if (debugEl) debugEl.innerText = "Map Status: Ready (No locations to show)";
        }
    } catch (e) {
        console.error("initRealMap failed:", e);
        if (debugEl) debugEl.innerText = "Map Status: ERROR - " + e.message;
    }
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

window.startPlanning = function () {
    if (!state.user) {
        state.user = { name: "旅行者" };
    }
    state.currentView = 'dashboard';
    const newTrip = createNewTrip();
    if (newTrip) openTrip(newTrip.id);
    saveData();
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

document.addEventListener('click', (e) => {
    document.querySelectorAll('.menu-dropdown').forEach(d => d.classList.remove('active'));
    if (!e.target.closest('.location-search-container')) {
        document.querySelectorAll('.location-autocomplete-dropdown').forEach(d => d.classList.remove('active'));
    }
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
    flatpickr(".date-picker-input", {
        locale: "zh",
        dateFormat: "Y-m-d",
        theme: "dark"
    });

    // Auto-load some images based on the trip title
    const initialQuery = (trip.title || "travel").replace(/[^a-zA-Z\s]/g, '') || "travel";
    searchImages(initialQuery);
}

function searchImages(passedQuery) {
    try {
        const inputField = document.getElementById('trip-edit-search');
        let q = (passedQuery || (inputField ? inputField.value.trim() : '') || 'travel').trim();

        if (inputField && passedQuery) {
            inputField.value = q;
        }

        const grid = document.getElementById('image-grid');
        if (!grid) return;

        grid.innerHTML = '<p style="grid-column: span 3; color: var(--text-secondary); text-align:center; padding: 1rem 0;">搜索高质图片中...</p>';

        // Use comma-separated tags for better results in LoremFlickr (Unsplash source)
        const tags = q.split(/\s+/).join(',');

        let html = '';
        const timestamp = Date.now();
        for (let i = 1; i <= 9; i++) {
            const url = `https://loremflickr.com/600/400/${encodeURIComponent(tags)}?lock=${i + 300}&t=${timestamp}`;
            html += `<div class="image-thumb-option" onclick="selectImage(event, '${url}')" ondblclick="selectImage(event, '${url}'); saveTripMetadata()" style="background-image:url('${url}')"></div>`;
        }

        setTimeout(() => {
            const freshGrid = document.getElementById('image-grid');
            if (freshGrid) {
                freshGrid.innerHTML = html;
            }
        }, 400);
    } catch (e) {
        console.error("SearchImages failed:", e);
    }
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

    const newTrip = {
        id: newId,
        title: "新的神秘冒险",
        startDate: startStr,
        endDate: "2026-05-05",
        thumb: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=600&q=80",
        activeDayId: 'day-1',
        days: [
            { id: 'day-1', title: '第 1 天', date: displayDate, stops: [] }
        ]
    };
    state.trips.push(newTrip);
    renderApp();
    return newTrip;
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

function editDay(dayId) {
    alert(`编辑日期: ${dayId}`);
}

function shareDay(event, dayId) {
    event.stopPropagation();
    alert(`分享日期: ${dayId}`);
}

function deleteDay(event, dayId) {
    event.stopPropagation();
    if (confirm('确定要删除这一天的行程吗？')) {
        const trip = state.trips.find(t => t.id === state.activeTripId);
        if (trip) {
            trip.days = trip.days.filter(d => d.id !== dayId);
            saveData();
            renderApp();
        }
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

    const newDay = {
        id: newDayId,
        title: `第 ${newDayNum} 天`,
        date: newDateStr,
        stops: []
    };
    trip.days.push(newDay);
    saveData();

    // Inject day to Sidebar
    const sidebarNav = document.getElementById('sidebar-nav');
    if (sidebarNav) {
        // Find existing list items to remove "active" class from them before appending
        Array.from(sidebarNav.children).forEach(li => li.classList.remove('active'));

        const newLi = document.createElement('li');
        newLi.className = 'active'; // newly added is active
        newLi.innerHTML = newDay.title;
        newLi.onclick = () => scrollToDay(newDayId);
        sidebarNav.appendChild(newLi);
    }

    // Inject day HTML to Timeline
    const timeline = document.querySelector('.itinerary-timeline');
    if (timeline) {
        const temp = document.createElement('div');
        temp.innerHTML = getDayHTML(newDay, trip.days.length - 1, state.activeTripId);
        timeline.appendChild(temp.firstElementChild);
    }

    trip.activeDayId = newDayId; // Update state without calling renderApp

    // Smooth scroll manually instead of calling scrollToDay which calls renderApp
    setTimeout(() => {
        const element = document.getElementById(newDayId);
        if (element) {
            element.scrollIntoView({ behavior: 'smooth' });
        }
    }, 50);
}

function toggleDayCollapse(dayId) {
    state.collapsedDays = state.collapsedDays || {};
    state.collapsedDays[dayId] = !state.collapsedDays[dayId];

    // DOM update to avoid flashing
    const content = document.getElementById(`day-content-${dayId}`);
    if (content) {
        content.style.display = state.collapsedDays[dayId] ? 'none' : 'block';
    }

    const arrow = document.getElementById(`collapse-arrow-${dayId}`);
    if (arrow) {
        arrow.style.transform = state.collapsedDays[dayId] ? 'rotate(-90deg)' : 'rotate(0deg)';
    }
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

        // DOM update to avoid flashing
        const subSpan = document.getElementById(`day-subtitle-${dayId}`);
        if (subSpan) {
            subSpan.innerText = day.subtitle || '添加副标题';
        }
    }
}

// --- Timeline Items Helpers (Notes & Lists & Standardized Rendering) ---

function toggleItemSelect(dayId, itemId, element) {
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

function getTimelineItemHTML(day, stop, index, locationIdx, showTransit) {
    let circleHtml = '';
    let contentHtml = '';
    let isLocation = stop.type !== 'note' && stop.type !== 'list';

    const styleBlock = index === 0 ? `
        <style>
            .timeline-item-wrapper:hover .item-hover-action { opacity: 1 !important; pointer-events: auto !important; }
            .li-item-hover:hover .delete-btn-hover { opacity: 1 !important; }
        </style>
    ` : '';

    if (stop.type === 'note') {
        circleHtml = `
            <div style="position: absolute; left: -1.8rem; top: 1.2rem; width: 1.8rem; height: 1.8rem; border-radius: 50%; background: var(--bg-secondary); z-index: 2; border: 2px solid var(--glass-border); display:flex; align-items:center; justify-content:center; font-size: 0.85rem;">
                📄
            </div>
        `;
        contentHtml = `
            <div style="background: var(--bg-secondary); border-radius: 12px; padding: 0.8rem 1.2rem; display:flex; align-items:center; border: 1px solid var(--glass-border);">
                <input type="text" value="${stop.content || ''}" onchange="updateNoteContent('${day.id}', '${stop.id}', this.value)" style="flex:1; background:transparent; border:none; outline:none; color:var(--text-primary); font-size:1rem; padding: 0.2rem;" placeholder="在此处书写或粘贴笔记">
            </div>
        `;
    } else if (stop.type === 'list') {
        circleHtml = `
            <div style="position: absolute; left: -1.8rem; top: 1.2rem; width: 1.8rem; height: 1.8rem; border-radius: 50%; background: var(--bg-secondary); z-index: 2; border: 2px solid var(--glass-border); display:flex; align-items:center; justify-content:center; font-size: 0.85rem;">
                ≡
            </div>
        `;
        contentHtml = `
            <div style="background: var(--bg-secondary); border-radius: 12px; padding: 1.2rem; border: 1px solid var(--glass-border);">
                <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom: 0.8rem;">
                    <div style="width:4px; height:18px; background:#f59e0b; border-radius:2px;"></div>
                    <input type="text" value="${stop.title || ''}" onchange="updateListTitle('${day.id}', '${stop.id}', this.value)" style="flex:1; background:transparent; border:none; outline:none; color:var(--text-primary); font-size:1.1rem; font-weight:bold;" placeholder="添加标题">
                </div>
                
                <div id="list-items-${stop.id}" style="display:flex; flex-direction:column; gap:0.5rem; padding-left:0.8rem; border-bottom: 1px solid var(--glass-border); padding-bottom: 1rem; margin-bottom: 1rem;">
                    ${(stop.items || []).map((li, i) => `
                        <div style="display:flex; align-items:center; gap:0.6rem; color:var(--text-primary); margin-bottom: 0.3rem;" class="li-item-hover">
                            <div style="width: 16px; height: 16px; border: 2px solid ${li.checked ? 'var(--text-secondary)' : 'var(--text-secondary)'}; border-radius: 50%; background:${li.checked ? 'var(--text-secondary)' : 'transparent'}; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="toggleListItemCheck('${day.id}', '${stop.id}', ${i}, this)"></div>
                            <input type="text" value="${li.text || ''}" onchange="updateListItemText('${day.id}', '${stop.id}', ${i}, this.value)" style="flex:1; background:transparent; border:none; outline:none; color:var(--text-primary); font-size:0.95rem; text-decoration:${li.checked ? 'line-through' : 'none'}; opacity:${li.checked ? '0.5' : '1'};">
                            <button class="delete-btn-hover" onclick="deleteListItem('${day.id}', '${stop.id}', ${i})" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; font-size:0.9rem; opacity:0; transition:opacity 0.2s;">✕</button>
                        </div>
                    `).join('')}
                    <div style="display:flex; align-items:center; gap:0.6rem; color:var(--text-secondary); margin-top:0.3rem;">
                        <div style="width: 16px; height: 16px; border: 2px solid var(--text-secondary); border-radius: 50%;"></div>
                        <input type="text" placeholder="添加一些项目..." onkeypress="handleNewListItem(event, '${day.id}', '${stop.id}')" style="flex:1; background:transparent; border:none; outline:none; color:var(--text-primary); font-size:0.95rem;">
                    </div>
                </div>
                
                <div style="color: var(--text-primary); font-weight: 600; display:flex; align-items:center; gap:0.5rem; cursor:pointer; font-size:0.95rem;" onclick="alert('预制列表模版 (Mock)')">
                    <span>🧳</span> 预制列表
                </div>
            </div>
        `;
    } else {
        const categoryInfo = stop.categoryIcon ? { icon: stop.categoryIcon } : { icon: (locationIdx === 0 ? '✔' : locationIdx + 1) };
        circleHtml = `
            <div style="position: absolute; left: -1.8rem; top: 1.2rem; width: 1.8rem; height: 1.8rem; border-radius: 50%; background: ${locationIdx === 0 ? 'var(--text-secondary)' : 'var(--accent-secondary)'}; color: #FFF; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1rem; z-index: 2; border: 2px solid var(--bg-primary);">
                ${categoryInfo.icon}
            </div>
        `;
        contentHtml = `
            <div class="rich-stop-card" onclick="openEditModal('${day.id}', '${stop.id}')" style="background: var(--bg-secondary); border-radius: 12px; padding: 1.2rem; display:flex; gap: 1.5rem; transition: background 0.2s; cursor: pointer; border: 1px solid transparent;">
                <div style="flex:1;">
                    <h4 style="font-size: 1.15rem; margin-bottom: 0.5rem;">${stop.location}</h4>
                    ${stop.desc ? `<p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 0.5rem; line-height: 1.4;">来自网络：${stop.desc}</p>` : ''}
                    ${stop.address ? `<p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem; display:flex; align-items:center; gap:5px;"><span style="font-size:1rem;">${stop.categoryIcon || '📍'}</span>${stop.address}</p>` : ''}
                    ${stop.phone ? `<p style="color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 0.5rem; display:flex; align-items:center; gap:5px;"><span style="font-size:1rem;">📞</span>${stop.phone}</p>` : ''}
                    ${stop.note ? `<p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1rem; line-height: 1.4;">${stop.note}</p>` : `<p style="color: var(--text-secondary); font-size: 0.95rem; margin-bottom: 1rem; opacity: 0.6;">在此添加备注、链接等</p>`}
                    
                    <div style="display:flex; gap: 0.8rem; margin-top: auto;">
                        <span onclick="openTimePickerDirectly(event, '${day.id}', '${stop.id}')" style="background: rgba(167, 139, 250, 0.1); color: var(--accent-secondary); padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor:pointer;" title="编辑时间">${stop.time} ${stop.period === 'AM' ? '上午' : '下午'}</span>
                        ${stop.price !== "0" && stop.price !== "" ? `<span onclick="openExpenseDirectly(event, '${day.id}', '${stop.id}')" style="background: rgba(167, 139, 250, 0.1); color: var(--accent-secondary); padding: 0.3rem 0.8rem; border-radius: 20px; font-size: 0.85rem; font-weight: 600; cursor:pointer;" title="编辑费用">$${stop.price}</span>` : ''}
                    </div>
                </div>
                <!-- Thumb for Stop -->
                <div style="width: 140px; height: 95px; border-radius: 8px; background-image: url('${stop.photo || 'https://picsum.photos/seed/' + stop.id + '/300/200'}'); background-size: cover; background-position: center; flex-shrink: 0; box-shadow: 0 4px 10px rgba(0,0,0,0.3);"></div>
            </div>
            ${showTransit ? `
                <div style="padding: 0.5rem 0 0.5rem 0.5rem; font-size: 0.85rem; color: var(--text-secondary); display:flex; align-items:center; gap: 0.5rem; position:relative; z-index:2;">
                    <span>🚗 1 小时 15 分钟 · 45英里 ▼ 路线</span>
                </div>
            ` : ''}
        `;
    }

    return `
        ${styleBlock}
        <!-- Timeline Item Wrapper -->
        <!-- Added left padding and reduced left margin to expand the hover area to include left actions -->
        <!-- Added right padding to expand hover area to include right actions -->
        <div class="timeline-item-wrapper id-${stop.id}" style="position:relative; margin-bottom: ${isLocation ? '0.5rem' : '1.5rem'}; margin-left: -3rem; padding-left: 3rem; padding-right: 2.5rem; display:flex; align-items:flex-start; gap: 0.5rem;" 
            draggable="true" 
            ondragstart="handleDragStart(event, '${day.id}', '${stop.id}')" 
            ondragover="handleDragOver(event)" 
            ondrop="handleDrop(event, '${day.id}', '${stop.id}')" 
            ondragenter="handleDragEnter(event)" 
            ondragleave="handleDragLeave(event)" 
            ondragend="handleDragEnd(event)">
            <!-- Left Actions (Drag & Select) -->
            <div class="item-hover-action" style="position:absolute; left: 0; top: 1.2rem; width: 2rem; display:flex; flex-direction:column; align-items:center; gap: 0.8rem; opacity:0; pointer-events:none; transition:opacity 0.2s;">
                <div style="cursor:grab; display:flex; flex-direction:column; gap:2px; color:var(--text-secondary); padding: 5px;">
                    <div style="display:flex; gap:2px;"><div style="width:4px;height:4px;border-radius:50%;background:currentColor;"></div><div style="width:4px;height:4px;border-radius:50%;background:currentColor;"></div></div>
                    <div style="display:flex; gap:2px;"><div style="width:4px;height:4px;border-radius:50%;background:currentColor;"></div><div style="width:4px;height:4px;border-radius:50%;background:currentColor;"></div></div>
                    <div style="display:flex; gap:2px;"><div style="width:4px;height:4px;border-radius:50%;background:currentColor;"></div><div style="width:4px;height:4px;border-radius:50%;background:currentColor;"></div></div>
                </div>
                <div style="cursor:pointer;" onclick="toggleItemSelect('${day.id}', '${stop.id}', this)">
                    <div style="width:18px; height:18px; border:2px solid ${stop.selected ? 'var(--accent-primary)' : 'var(--text-secondary)'}; border-radius:4px; background:${stop.selected ? 'var(--accent-primary)' : 'transparent'}; display:flex; align-items:center; justify-content:center; color:white; font-size:0.8rem; transition: background 0.2s;">
                        ${stop.selected ? '✓' : ''}
                    </div>
                </div>
            </div>
            
            ${circleHtml}
            
            <!-- Main Content -->
            <div style="flex:1; min-width: 0;">
                ${contentHtml}
            </div>

            <!-- Right Action (Trash) -->
            <div class="item-hover-action" style="position:absolute; right: 0; top: 1.2rem; cursor:pointer; color:var(--text-secondary); opacity:0; pointer-events:none; transition:opacity 0.2s; font-size: 1.1rem; padding: 0.2rem;" onclick="deleteTimelineItem('${day.id}', '${stop.id}')" title="删除">
                🗑️
            </div>
        </div>
    `;
}

function getDay(dayId) {
    const trip = state.trips.find(t => t.id === state.activeTripId);
    return trip ? trip.days.find(d => d.id === dayId) : null;
}

function injectNewStopToDOM(dayId, stopHtml) {
    const daySection = document.getElementById(dayId);
    if (!daySection) return;
    const timelineContainer = daySection.querySelector('.timeline-container');
    if (!timelineContainer) return;

    // Create temp container, parse HTML, append
    const temp = document.createElement('div');
    temp.innerHTML = stopHtml;
    // We append just before the end of timeline (which holds the empty message if any)
    const emptyMsg = timelineContainer.querySelector('p');
    if (emptyMsg && emptyMsg.innerText.includes('还没有安排地点')) {
        emptyMsg.remove();
    }

    const searchContainer = timelineContainer.querySelector('.location-search-container');
    if (searchContainer) {
        timelineContainer.insertBefore(temp.firstElementChild, searchContainer);
    } else {
        timelineContainer.appendChild(temp.firstElementChild);
    }
}

function addTimelineNote(dayId) {
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

function addTimelineList(dayId) {
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

function toggleNoteCheck(dayId, itemId, element) {
    const day = getDay(dayId);
    if (!day) return;
    const item = day.stops.find(s => s.id === itemId);
    if (item) {
        item.checked = !item.checked;
        saveData();

        // DOM update
        if (element) {
            const box = element.querySelector('div');
            if (box) {
                box.style.border = `2px solid ${item.checked ? 'var(--accent-primary)' : 'var(--text-secondary)'}`;
                box.style.background = item.checked ? 'var(--accent-primary)' : 'transparent';
                box.innerText = item.checked ? '✓' : '';
            }
        }
    }
}

function updateNoteContent(dayId, itemId, value) {
    const day = getDay(dayId);
    if (!day) return;
    const item = day.stops.find(s => s.id === itemId);
    if (item) {
        item.content = value;
        saveData();
    }
}

function updateListTitle(dayId, itemId, value) {
    const day = getDay(dayId);
    if (!day) return;
    const item = day.stops.find(s => s.id === itemId);
    if (item) {
        item.title = value;
        saveData();
    }
}

function handleNewListItem(event, dayId, itemId) {
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
                    const inputsRow = listContainer.lastElementChild; // The "+ Add item..." row is always the last child
                    listContainer.insertBefore(temp.firstElementChild, inputsRow);
                    event.target.value = ''; // clear input
                } else {
                    renderApp(); // Fallback if container not found
                }
            }
        }
    }
}

function toggleListItemCheck(dayId, itemId, index, element) {
    const day = getDay(dayId);
    if (!day) return;
    const item = day.stops.find(s => s.id === itemId);
    if (item && item.items && item.items[index]) {
        item.items[index].checked = !item.items[index].checked;
        saveData();

        // DOM update
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

function updateListItemText(dayId, itemId, index, value) {
    const day = getDay(dayId);
    if (!day) return;
    const item = day.stops.find(s => s.id === itemId);
    if (item && item.items && item.items[index]) {
        item.items[index].text = value;
        saveData();
    }
}

function deleteListItem(dayId, itemId, index) {
    const day = getDay(dayId);
    if (!day) return;
    const item = day.stops.find(s => s.id === itemId);
    if (item && item.items) {
        item.items.splice(index, 1);
        saveData();
        renderApp();
    }
}

function deleteTimelineItem(dayId, itemId) {
    if (confirm("确定要删除这项内容吗？")) {
        const day = getDay(dayId);
        if (!day) return;
        day.stops = day.stops.filter(s => s.id !== itemId);
        saveData();
        renderApp();
    }
}

// --- Drag and Drop Handlers ---
let draggedItem = null;
let draggedDayId = null;

function handleDragStart(e, dayId, stopId) {
    draggedItem = stopId;
    draggedDayId = dayId;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', stopId);
    e.target.style.opacity = '0.4';
}

function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
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
    if (draggedItem === targetStopId) return; // Dropped on itself

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

        // Re-render specific days to avoid full app flash
        if (draggedDayId !== targetDayId) {
            const sDayIndex = trip.days.findIndex(d => d.id === draggedDayId);
            const temp1 = document.createElement('div');
            temp1.innerHTML = getDayHTML(sourceDay, sDayIndex, state.activeTripId);
            document.getElementById(draggedDayId).replaceWith(temp1.firstElementChild);
        }

        const tDayIndex = trip.days.findIndex(d => d.id === targetDayId);
        const temp2 = document.createElement('div');
        temp2.innerHTML = getDayHTML(targetDay, tDayIndex, state.activeTripId);
        document.getElementById(targetDayId).replaceWith(temp2.firstElementChild);
    }

    draggedItem = null;
    draggedDayId = null;
    return false;
}

function handleDragEnd(e) {
    if (e.target.style) e.target.style.opacity = '1';
    const wrappers = document.querySelectorAll('.timeline-item-wrapper');
    wrappers.forEach(w => {
        w.style.borderTop = 'none';
        w.style.paddingTop = '0';
    });
    draggedItem = null;
    draggedDayId = null;
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
        saveData();
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

    // Re-render just this day's HTML to avoid full app flash
    const timeline = document.querySelector('.itinerary-timeline');
    const daySection = document.getElementById(editingDayId);
    if (timeline && daySection) {
        const dayIndex = trip.days.findIndex(d => d.id === editingDayId);
        const temp = document.createElement('div');
        temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
        timeline.replaceChild(temp.firstElementChild, daySection);
    } else {
        renderApp();
    }
}

function deleteStop() {
    if (confirm("确定删除这个目的地吗？")) {
        const trip = state.trips.find(t => t.id === state.activeTripId);
        const day = trip.days.find(d => d.id === editingDayId);
        day.stops = day.stops.filter(s => s.id !== editingStopId);
        saveData();
        closeModal();
        renderApp();
    }
}

function closeModal() {
    const overlay = document.getElementById('modal-overlay');
    overlay.classList.remove('active');
    setTimeout(() => overlay.classList.add('hidden'), 300);
}

let searchTimeout = null;
window.placesAutocompleteService = null;
window.placesDetailsService = null;
let currentSearchFocusIdx = -1;
let currentSearchPredictions = [];

function handleSearchKeyDown(e, dayId) {
    const dropdown = document.getElementById(`search-dropdown-${dayId}`);
    if (!dropdown || !dropdown.classList.contains('active')) return;

    const items = dropdown.querySelectorAll('li');
    if (!items.length) return;

    if (e.key === 'ArrowDown') {
        e.preventDefault();
        currentSearchFocusIdx++;
        if (currentSearchFocusIdx >= items.length) currentSearchFocusIdx = 0;
        updateSearchFocus(items);
    } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        currentSearchFocusIdx--;
        if (currentSearchFocusIdx < 0) currentSearchFocusIdx = items.length - 1;
        updateSearchFocus(items);
    } else if (e.key === 'Enter') {
        e.preventDefault();
        if (currentSearchFocusIdx >= 0 && currentSearchFocusIdx < currentSearchPredictions.length) {
            handleDropdownClick(dayId, currentSearchPredictions[currentSearchFocusIdx].place_id);
        }
    }
}

function updateSearchFocus(items) {
    items.forEach((item, idx) => {
        if (idx === currentSearchFocusIdx) {
            item.classList.add('selected');
            item.scrollIntoView({ block: 'nearest' });
        } else {
            item.classList.remove('selected');
        }
    });
}

function handleSearchInput(event, dayId) {
    const query = event.target.value.trim();
    const dropdown = document.getElementById(`search-dropdown-${dayId}`);

    if (searchTimeout) clearTimeout(searchTimeout);

    if (!query) {
        dropdown.classList.remove('active');
        currentSearchFocusIdx = -1;
        currentSearchPredictions = [];
        return;
    }

    if (!window.googleMapsReady || typeof google === 'undefined') {
        // Fallback or just do nothing if API not loaded
        return;
    }

    if (!window.placesAutocompleteService) {
        window.placesAutocompleteService = new google.maps.places.AutocompleteService();
    }

    searchTimeout = setTimeout(() => {
        window.placesAutocompleteService.getPlacePredictions({ input: query }, (predictions, status) => {
            if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
                // If it's zero results, or an API error like REQUEST_DENIED, show it to the user
                let errorMsg = '未找到结果';
                if (status === 'REQUEST_DENIED') errorMsg = 'Google Maps API 权限错误，请检查 API Key 和是否启用了 Places API。';
                if (status === 'OVER_QUERY_LIMIT') errorMsg = 'Google Maps API 额度超限。';
                dropdown.innerHTML = `<li style="color:var(--text-secondary); padding: 1rem; text-align:center;">${errorMsg} (${status})</li>`;
                dropdown.classList.add('active');
                return;
            }

            currentSearchPredictions = predictions;
            currentSearchFocusIdx = -1;
            dropdown.innerHTML = predictions.map((p, idx) => `
                <li onmousedown="handleDropdownClick('${dayId}', '${p.place_id}')">
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <span style="font-weight:600; color:var(--text-primary); font-size:1.1rem;">
                            <span style="color:var(--text-secondary); margin-right:8px;">📍</span>${p.structured_formatting.main_text}
                        </span>
                        <span style="font-size:0.85rem; color:var(--text-secondary); padding-left:26px;">
                            ${p.structured_formatting.secondary_text || ''}
                        </span>
                    </div>
                </li>
            `).join('');
            dropdown.classList.add('active');
        });
    }, 250);
}

function closeSearchDropdown(dayId) {
    const dropdown = document.getElementById(`search-dropdown-${dayId}`);
    if (dropdown) dropdown.classList.remove('active');
}

window.handleDropdownClick = function (dayId, placeId) {
    const dropdown = document.getElementById(`search-dropdown-${dayId}`);
    if (dropdown) dropdown.classList.remove('active');

    // Provide immediate visual feedback that it's loading
    const container = dropdown ? dropdown.closest('.location-search-container') : null;
    if (container) {
        const input = container.querySelector('.location-search-input');
        if (input) {
            input.value = '加载中 (Loading)...';
            input.disabled = true;
        }
    }

    autoAddStop(dayId, placeId);
};

function autoAddStop(dayId, placeId) {
    if (!window.placesDetailsService) {
        const dummy = document.createElement('div');
        window.placesDetailsService = new google.maps.places.PlacesService(dummy);
    }

    window.placesDetailsService.getDetails({
        placeId: placeId,
        fields: ['name', 'formatted_address', 'formatted_phone_number', 'geometry', 'photos', 'rating', 'editorial_summary', 'types']
    }, (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK) {
            alert('Failed to get place details');
            return;
        }

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

        const photoUrl = place.photos && place.photos.length > 0 ? place.photos[0].getUrl({ maxWidth: 400 }) : '';
        const desc = place.editorial_summary ? place.editorial_summary.overview : '';
        const categoryInfo = getCategoryFromTypes(place.types);

        const newStop = {
            id: 's' + Date.now(),
            location: place.name,
            desc: desc,
            address: place.formatted_address || '',
            phone: place.formatted_phone_number || '',
            time: timeStr,
            period: period,
            note: '',
            price: '0',
            type: 'location',
            lat: place.geometry && place.geometry.location ? place.geometry.location.lat() : 0,
            lng: place.geometry && place.geometry.location ? place.geometry.location.lng() : 0,
            photo: photoUrl,
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

        const timeline = document.querySelector('.itinerary-timeline');
        const daySection = document.getElementById(dayId);
        if (timeline && daySection) {
            const dayIndex = trip.days.findIndex(d => d.id === dayId);
            const temp = document.createElement('div');
            temp.innerHTML = getDayHTML(day, dayIndex, state.activeTripId);
            timeline.replaceChild(temp.firstElementChild, daySection);
        } else {
            renderApp();
        }

        // Update map markers
        if (window.googleMapsReady) {
            initRealMap();
        }
    });
}

// Remove animation elements if they exist globally
const existingStyle = document.getElementById('dynamic-styles');
if (existingStyle) existingStyle.remove();

const styleEl = document.createElement('style');
styleEl.id = 'dynamic-styles';
styleEl.textContent = `
    .fade-in { animation: fadeIn 0.4s forwards ease-in-out; }
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(5px); }
        to { opacity: 1; transform: translateY(0); }
    }
`;
document.head.appendChild(styleEl);
