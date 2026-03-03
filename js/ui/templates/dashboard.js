import { state } from '../../state.js';
import { calculateDays } from '../../utils.js';

export function getDashboardHTML() {
    if (state.trips.length === 0) {
        return `
            <div class="trip-dashboard-container fade-in">
                <div class="dashboard-header">
                    <h2>${state.user.name} 的全部行程</h2>
                    <div style="display:flex; align-items:center; gap:0.8rem;">
                        <button onclick="cleanupImages()" style="background:none; border:1px solid var(--glass-border); color:var(--text-secondary); padding:0.4rem 0.9rem; border-radius:8px; cursor:pointer; font-size:0.82rem; display:flex; align-items:center; gap:5px; transition:all 0.2s;" onmouseover="this.style.borderColor='var(--accent-primary)';this.style.color='var(--accent-primary)'" onmouseout="this.style.borderColor='var(--glass-border)';this.style.color='var(--text-secondary)'" title="扫描并删除未被使用的缓存图片">
                            🧹 清理图片缓存
                        </button>
                        <button class="btn-main" onclick="createNewTrip()">+ 新建行程</button>
                    </div>
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
                <div style="display:flex; align-items:center; gap:0.8rem;">
                    <button onclick="cleanupImages()" style="background:none; border:1px solid var(--glass-border); color:var(--text-secondary); padding:0.4rem 0.9rem; border-radius:8px; cursor:pointer; font-size:0.82rem; display:flex; align-items:center; gap:5px; transition:all 0.2s;" onmouseover="this.style.borderColor='var(--accent-primary)';this.style.color='var(--accent-primary)'" onmouseout="this.style.borderColor='var(--glass-border)';this.style.color='var(--text-secondary)'" title="扫描并删除未被使用的缓存图片">
                        🧹 清理图片缓存
                    </button>
                    <button class="btn-main" onclick="createNewTrip()">+ 新建行程</button>
                </div>
            </div>
            <div class="trip-grid">
                ${cardsHtml}
            </div>
        </div>
    `;
}
