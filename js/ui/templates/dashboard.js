import { state } from '../../state.js';
import { calculateDays } from '../../utils.js';

export function getDashboardHTML() {
    if (state.trips.length === 0) {
        return `
            <div class="trip-dashboard-container fade-in">
                <div class="dashboard-header">
                    <h2>${state.user.name} 的全部行程</h2>
                    <button class="btn-main" onclick="createNewTrip()">+ 新建行程</button>
                </div>
                <div style="text-align:center; padding: 5rem 0; color: var(--text-secondary);">
                    <p style="font-size: 1.2rem;">您还没有行程，点击上方按钮开始规划吧！</p>
                </div>
            </div>
        `;
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
                <button onclick="openEditTripModal('${trip.id}')">编辑行程</button>
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
