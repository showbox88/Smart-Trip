import { state } from '../state.js';
import { t } from './i18n.js';
import { getLoginHTML } from './templates/auth.js';
import { getDashboardHTML, getTripGridHTML } from './templates/dashboard.js';
import { getTripHTML } from './templates/itinerary.js';
import { initRealMap } from '../maps.js';
import { initSidebarGlow } from './handlers/ux.js';

// --- Modal Management (for initial usage) ---
const existingStyle = document.getElementById('dynamic-styles');
if (existingStyle) existingStyle.remove();

const styleEl = document.createElement('style');
styleEl.id = 'dynamic-styles';
styleEl.textContent = `
    .fade-in { animation: fadeIn 0.4s forwards ease-in-out; }
    @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
    }
`;
document.head.appendChild(styleEl);

function updateNavLinks() {
    const nav = document.querySelector('.navbar nav ul');
    if (!nav) return;

    const dropdown = document.getElementById('user-dropdown');
    const avatarContainer = document.querySelector('.user-profile-container');

    if (!state.user) {
        nav.innerHTML = `
            <li><a href="#" class="btn-primary" onclick="gotoLogin()">${t('common.login_register')}</a></li>
        `;
        if (avatarContainer) avatarContainer.style.display = 'none';
        if (dropdown) dropdown.innerHTML = '';
    } else {
        nav.innerHTML = `
            <li><a href="#" onclick="goDashboard()">${t('dashboard.filter_all')}</a></li>
        `;
        if (avatarContainer) avatarContainer.style.display = 'flex';

        if (dropdown) {
            dropdown.innerHTML = `
                <a href="#" onclick="openSettingsModal(); toggleUserDropdown()">
                    <span class="material-symbols-outlined">settings</span>
                    ${t('itinerary.settings')}
                </a>
                <div style="height: 1px; background: var(--glass-border); margin: 4px 0;"></div>
                <a href="#" onclick="handleLogout(); toggleUserDropdown()" style="color:var(--text-muted);">
                    <span class="material-symbols-outlined">logout</span>
                    ${t('common.logout')}
                </a>
            `;
        }
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
                initSidebarGlow(); // Ensure sidebar glow effect is initialized after render
            }, 50);
        }
    } catch (err) {
        console.error("Critical Render Error:", err);
        document.getElementById('app-container').innerHTML = `
            <div style="padding: 2rem; color: white;">
                <h2>${t('common.render_error')}</h2>
                <pre>${err.stack}</pre>
                <button onclick="state.currentView='dashboard'; renderApp()">${t('common.back_to_home')}</button>
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
