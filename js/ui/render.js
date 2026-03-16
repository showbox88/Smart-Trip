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
function localizeStaticContent() {
    // Update navbar and title
    const title = document.getElementById('page-title');
    if (title) title.innerText = `Smart Trip | ${t('common.tagline')}`;
    
    const searchInput = document.getElementById('main-search');
    if (searchInput) searchInput.placeholder = t('common.search');
    
    const homeNav = document.getElementById('nav-home');
    if (homeNav) homeNav.innerText = t('common.home');
    
    const tripsNav = document.getElementById('nav-trips');
    if (tripsNav) tripsNav.innerText = t('common.my_trips');
}

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
    localizeStaticContent();
}

export function renderApp() {
    try {
        const container = document.getElementById('app-container');
        if (!container) return;

        // Auto-routing based on state (Only redirect IF initialization is finished)
        if (!state.user && state.currentView !== 'login') {
            // Check if we are still in the middle of a boot-up sync
            console.log("[Render] 🔍 Checking auth status before routing...");
            // Non-blocking wait for session check if needed, but for now 
            // the simple fix is to ensure main.js orchestration is respected.
            state.currentView = 'login';
        }

        if (state.currentView === 'login' && state.user) {
            // Recovery: if we have a user but are stuck on login view, go to dashboard
            state.currentView = 'dashboard';
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
            
            requestAnimationFrame(() => {
                if (window.googleMapsReady) {
                    initRealMap();
                }
                initSidebarGlow(); // Ensure sidebar glow effect is initialized after render

                if (window._forceResizeTextareas) {
                    window._forceResizeTextareas(container);
                }

                // Async: fill in street view thumbnails for stops without photos
                if (window.googleMapsReady && window._lazyLoadStreetViews) {
                    window._lazyLoadStreetViews();
                }
            });
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

// --- Event delegation for stay-hover highlighting (avoids querySelectorAll on every hover) ---
if (!window._stayHoverDelegated) {
    const appRoot = document.getElementById('app-container') || document.body;
    let _lastHoveredStayId = null;
    appRoot.addEventListener('mouseover', (e) => {
        const el = e.target.closest('[data-stay-hover]');
        const stayId = el ? el.dataset.stayHover : null;
        if (stayId === _lastHoveredStayId) return;
        if (_lastHoveredStayId) {
            document.querySelectorAll(`[data-stay-id="${_lastHoveredStayId}"]`).forEach(n => n.classList.remove('stay-hover'));
        }
        _lastHoveredStayId = stayId;
        if (stayId) {
            document.querySelectorAll(`[data-stay-id="${stayId}"]`).forEach(n => n.classList.add('stay-hover'));
        }
    });
    appRoot.addEventListener('mouseleave', () => {
        if (_lastHoveredStayId) {
            document.querySelectorAll(`[data-stay-id="${_lastHoveredStayId}"]`).forEach(n => n.classList.remove('stay-hover'));
            _lastHoveredStayId = null;
        }
    });
    window._stayHoverDelegated = true;
}
