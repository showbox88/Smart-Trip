import { state } from '../../state.js';
import { calculateDays } from '../../utils.js';

// --- Helpers ---
const getStatus = (trip) => {
    const today = new Date().toISOString().split('T')[0];
    if (trip.status) {
        const labels = { 'ongoing': 'Ongoing', 'planned': 'Planned', 'completed': 'Completed' };
        const classes = { 'ongoing': 'status-ongoing', 'planned': 'status-planned', 'completed': 'status-completed' };
        return {
            label: labels[trip.status] || 'Planned',
            class: classes[trip.status] || 'status-planned'
        };
    }
    const start = trip.startDate;
    const end = trip.endDate;
    if (today >= start && today <= end) return { label: 'Ongoing', class: 'status-ongoing' };
    if (today < start) return { label: 'Planned', class: 'status-planned' };
    return { label: 'Completed', class: 'status-completed' };
};

/**
 * Returns the HTML for the trip grid part only.
 */
export function getTripGridHTML() {
    const isList = state.dashboardView === 'list';

    const filteredTrips = state.trips.filter(t => {
        if (state.dashboardFilter === 'all' || !state.dashboardFilter) return true;
        const s = getStatus(t);
        return s.label.toLowerCase() === state.dashboardFilter.toLowerCase();
    });

    const cardsHtml = filteredTrips.map(trip => {
        const duration = calculateDays(trip.startDate, trip.endDate);
        const status = getStatus(trip);
        const stopsCount = trip.days ? trip.days.reduce((acc, day) => acc + (day.stops ? day.stops.length : 0), 0) : 0;

        if (isList) {
            return `
            <div class="trip-card-list" onclick="openTrip('${trip.id}')" style="display:flex; align-items:center; gap:1.5rem; background:var(--glass-bg); border:1px solid var(--glass-border); border-radius:16px; padding:12px; transition:all 0.3s; cursor:pointer; margin-bottom:1rem;">
                <div style="width:120px; height:80px; border-radius:12px; background: #000; overflow:hidden; position:relative; flex-shrink:0;">
                    <div class="thumb-blur-bg" style="background-image: url('${trip.thumb}'); opacity:0.3; filter:blur(10px);"></div>
                    <img src="${trip.thumb}" style="width:100%; height:100%; object-fit:contain; position:relative; z-index:1;">
                </div>
                <div style="flex:1;">
                    <h4 style="font-size:1.15rem; font-weight:700; margin-bottom:4px;">${trip.title}</h4>
                    <div style="display:flex; align-items:center; gap:12px; color:var(--text-muted); font-size:0.85rem;">
                        <span style="display:flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:16px;">calendar_today</span> ${trip.startDate} - ${trip.endDate}</span>
                        <span style="display:flex; align-items:center; gap:4px;"><span class="material-symbols-outlined" style="font-size:16px;">location_on</span> ${stopsCount} Spots</span>
                    </div>
                </div>
                <span class="status-badge ${status.class}" style="position:static; padding:4px 12px; border-radius:20px;">${status.label}</span>
                <div style="font-size:1.1rem; font-weight:700; color:white; min-width:100px; text-align:right;">$${(duration * 200).toLocaleString()}</div>
            </div>
            `;
        }

        return `
        <div class="trip-card" onclick="openTrip('${trip.id}')">
            <div class="trip-thumb">
                <div class="thumb-blur-bg" style="background-image: url('${trip.thumb}')"></div>
                <img class="thumb-main-img" src="${trip.thumb}" loading="lazy">
                <span class="status-badge ${status.class}" style="top: 1rem; left: 1rem;">${status.label}</span>
                <button class="menu-dots" onclick="toggleMenu(event, '${trip.id}')" style="top:1rem; right:1rem; transform:none; background:rgba(0,0,0,0.2); border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; color:white; backdrop-filter:blur(4px); z-index:10;">⋮</button>
            </div>
            <div class="trip-content">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:0.75rem;">
                    <h4 style="font-size:1.35rem; font-weight:800; letter-spacing:-0.03em;">${trip.title}</h4>
                    <div style="color:var(--accent-primary); font-size:0.8rem; font-weight:700; display:flex; align-items:center; gap:4px; padding-top:4px;">
                        <span class="material-symbols-outlined" style="font-size:16px;">location_on</span>
                        ${stopsCount} Spots
                    </div>
                </div>
                <div style="color:var(--text-muted); font-size:0.9rem; font-weight:500; display:flex; align-items:center; gap:8px; margin-bottom:2rem;">
                    <span class="material-symbols-outlined" style="font-size:18px;">calendar_today</span>
                    ${trip.startDate} - ${trip.endDate}
                </div>
                
                <div class="trip-meta">
                    <div>
                        <div style="font-size:0.7rem; text-transform:uppercase; color:var(--text-muted); font-weight:800; letter-spacing:0.08em; margin-bottom: 2px;">Estimated Budget</div>
                        <div style="font-size:1.25rem; font-weight:800; color:white;">$${(duration * 200).toLocaleString()}.00</div>
                    </div>
                    <div style="display:flex; align-items:center; gap: 8px;">
                         <div class="meta-item" style="background: rgba(255,255,255,0.05); padding: 4px 10px; border-radius: 8px;">
                            <span class="material-symbols-outlined" style="font-size:16px;">schedule</span>
                            ${duration} Days
                        </div>
                    </div>
                </div>
            </div>
            <div class="menu-dropdown" id="menu-${trip.id}" style="right:1rem; top:3.5rem; transform:none;">
                <button onclick="openEditTripModal('${trip.id}')">编辑行程</button>
                <button onclick="shareTrip(event, '${trip.id}')">分享给好友</button>
                <button class="danger" onclick="deleteTrip(event, '${trip.id}')">删除行程</button>
            </div>
        </div>
        `;
    }).join('');

    const placeholderCard = `
        <div class="trip-card-placeholder" onclick="createNewTrip()">
            <div class="placeholder-icon">
                <span class="material-symbols-outlined" style="font-size:32px;">add_location_alt</span>
            </div>
            <h3 style="font-size:1.1rem; font-weight:700; color:var(--text-main);">Plan a New Adventure</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); text-align:center; margin-top:0.5rem;">探索世界，从这一刻开始。</p>
        </div>
    `;

    return `
        <div class="trip-grid" style="${isList ? 'display:block;' : ''}">
            ${cardsHtml}
            ${placeholderCard}
        </div>
    `;
}

/**
 * Returns the full dashboard HTML.
 */
export function getDashboardHTML() {
    const today = new Date().toISOString().split('T')[0];

    return `
        <div class="trip-dashboard-container fade-in">
            <div class="dashboard-header" style="margin-bottom:2.5rem;">
                <div>
                    <h2 style="font-size:2.25rem; font-weight:800; margin-bottom:0.5rem; letter-spacing:-0.02em;">${state.user.name} 的全部行程</h2>
                    <p style="color:var(--text-muted); font-size:0.95rem; margin-bottom:1.5rem;">在这里管理您的所有旅行计划和美好回忆。</p>
                </div>
                <div style="display:flex; align-items:center; gap:0.8rem;">
                    <button onclick="cleanupImages()" style="background:none; border:1px solid var(--glass-border); color:var(--text-secondary); padding:0.6rem 1.2rem; border-radius:12px; cursor:pointer; font-size:0.85rem; display:flex; align-items:center; gap:8px; transition:all 0.2s;" onmouseover="this.style.borderColor='var(--accent-primary)';this.style.color='var(--accent-primary)'" onmouseout="this.style.borderColor='var(--glass-border)';this.style.color='var(--text-secondary)'" title="清理未使用的缓存图片">
                        <span class="material-symbols-outlined" style="font-size:18px;">vacuum</span> 清理缓存
                    </button>
                    <button class="btn-main" onclick="openNewTripModal()">
                        <span class="material-symbols-outlined">add</span>
                        <span>新建行程</span>
                    </button>
                </div>
            </div>

            <div class="dashboard-filters">
                <div class="filter-tabs" id="dashboard-filter-tabs">
                    <button class="filter-tab ${state.dashboardFilter === 'all' ? 'active' : ''}" onclick="filterDashboard('all')">全部行程</button>
                    <button class="filter-tab ${state.dashboardFilter === 'ongoing' ? 'active' : ''}" onclick="filterDashboard('ongoing')">进行中</button>
                    <button class="filter-tab ${state.dashboardFilter === 'planned' ? 'active' : ''}" onclick="filterDashboard('planned')">计划中</button>
                    <button class="filter-tab ${state.dashboardFilter === 'completed' ? 'active' : ''}" onclick="filterDashboard('completed')">已完成</button>
                </div>
                <div class="view-toggles" id="dashboard-view-toggles">
                    <button class="view-icon ${state.dashboardView === 'grid' ? 'active' : ''}" onclick="switchViewMode('grid')"><span class="material-symbols-outlined">grid_view</span></button>
                    <button class="view-icon ${state.dashboardView === 'list' ? 'active' : ''}" onclick="switchViewMode('list')"><span class="material-symbols-outlined">list</span></button>
                </div>
            </div>

            <div id="trip-grid-container">
                ${getTripGridHTML()}
            </div>

            <section class="budget-summary-panel">
                <div style="display:flex; flex-direction:column; md-flex-direction:row; gap:2rem; align-items:center;">
                    <div style="flex:1;">
                        <h3 style="font-size:1.5rem; font-weight:800; color:white; margin-bottom:0.5rem;">年度预算概览</h3>
                        <p style="color:var(--text-muted); font-size:0.9rem; margin-bottom:1.5rem;">您最近规划了 ${state.trips.length} 个行程，行程总天数显示业务规模稳步增长。</p>
                        <div class="summary-grid">
                            <div class="summary-stat">
                                <div style="font-size:0.65rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:0.05em; margin-bottom:4px;">Total Trips</div>
                                <div style="font-size:1.75rem; font-weight:800; color:white;">${state.trips.length}</div>
                            </div>
                            <div class="summary-stat">
                                <div style="font-size:0.65rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:0.05em; margin-bottom:4px;">Destinations</div>
                                <div style="font-size:1.75rem; font-weight:800; color:white;">${new Set(state.trips.map(t => t.title)).size}</div>
                            </div>
                            <div class="summary-stat">
                                <div style="font-size:0.65rem; text-transform:uppercase; color:var(--text-muted); font-weight:700; letter-spacing:0.05em; margin-bottom:4px;">Completed</div>
                                <div style="font-size:1.75rem; font-weight:800; color:#10b981;">${state.trips.filter(t => today > t.endDate).length}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    `;
}
