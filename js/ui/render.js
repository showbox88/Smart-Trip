import { state } from '../state.js';
import { getLoginHTML } from './templates/auth.js';
import { getDashboardHTML } from './templates/dashboard.js';
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
            <li><a href="https://wanderlog.com" target="_blank">灵感</a></li>
            <li class="btn-login"><a href="#">${state.user.name}</a></li>
            <li class="btn-primary"><a href="#" onclick="goDashboard()">开始规划</a></li>
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
