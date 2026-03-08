import { state } from '../state.js';
import { getLoginHTML } from './templates/auth.js';
import { getDashboardHTML, getTripGridHTML } from './templates/dashboard.js';
import { getTripHTML } from './templates/itinerary.js';
import { initRealMap } from '../maps.js';

// Inject global styles for hover effects
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

function updateNavLinks() {
    const nav = document.querySelector('.navbar nav ul');
    if (!nav) return;
    if (!state.user) {
        nav.innerHTML = `
            <li><a href="#" class="btn-primary" onclick="state.currentView='login'; renderApp()">登录 / 注册</a></li>
        `;
    } else {
        nav.innerHTML = `
            <li><a href="#" onclick="goDashboard()">我的行程</a></li>
            <li><a href="https://google.com/travel" target="_blank">灵感</a></li>
        `;
    }
}

export function renderApp() {
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
            // --- Auto-sync endDate if days array was manually edited or mismatched ---
            if (trip.startDate && trip.days.length > 0) {
                let d = new Date(trip.startDate.replace(/-/g, '/'));
                d.setDate(d.getDate() + trip.days.length - 1);
                if (!isNaN(d.getTime())) {
                    let m = String(d.getMonth() + 1).padStart(2, '0');
                    let dt = String(d.getDate()).padStart(2, '0');
                    trip.endDate = `${d.getFullYear()}-${m}-${dt}`;
                }
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

/**
 * Partial renderer for the dashboard to avoid full-page flickering.
 */
export function renderDashboardPartials() {
    if (state.currentView !== 'dashboard') return;

    const gridContainer = document.getElementById('trip-grid-container');
    if (gridContainer) {
        gridContainer.innerHTML = getTripGridHTML();
    }

    // Update active classes for filter tabs
    const filterTabs = document.getElementById('dashboard-filter-tabs');
    if (filterTabs) {
        filterTabs.querySelectorAll('.filter-tab').forEach(btn => {
            const onClickAttr = btn.getAttribute('onclick') || '';
            const match = onClickAttr.match(/'([^']+)'/);
            const filterType = match ? match[1] : '';
            if (filterType === state.dashboardFilter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    // Update active classes for view toggles
    const viewToggles = document.getElementById('dashboard-view-toggles');
    if (viewToggles) {
        viewToggles.querySelectorAll('.view-icon').forEach(btn => {
            const onClickAttr = btn.getAttribute('onclick') || '';
            const match = onClickAttr.match(/'([^']+)'/);
            const mode = match ? match[1] : '';
            if (mode === state.dashboardView) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }
}
