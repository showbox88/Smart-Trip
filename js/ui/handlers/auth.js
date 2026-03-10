import { state, updateState } from '../../state.js';
import { renderApp } from '../render.js';
import { saveData } from '../../api.js';
import { createNewTrip } from './trips.js';
import { openTrip } from './trips.js';

export function handleLogin() {
    const nameInput = document.getElementById('login-name').value.trim();
    if (!nameInput) {
        alert("请输入名字");
        return;
    }

    const btn = document.querySelector('.auth-btn-main');
    if (btn) {
        btn.innerHTML = '<span>进入中...</span> <span class="material-symbols-outlined" style="font-size:18px;">hourglass_empty</span>';
        btn.disabled = true;
    }

    setTimeout(() => {
        updateState({ user: { name: nameInput }, currentView: 'dashboard' });
        renderApp();
    }, 600);
}

export function handleLoginKey(e) {
    if (e.key === 'Enter') handleLogin();
}

export function goDashboard() {
    state.currentView = 'dashboard';
    renderApp();
}

export function startPlanning() {
    if (!state.user) {
        updateState({ user: { name: "旅行者" } });
    }
    state.currentView = 'dashboard';
    const newTrip = createNewTrip();
    if (newTrip) openTrip(newTrip.id);
    saveData();
}

export function gotoLogin() {
    updateState({ user: null, currentView: 'login' });
    renderApp();
}

export function handleLogout() {
    if (confirm("确定要退出并返回登录页面吗？")) {
        state.user = null;
        state.currentView = 'login';
        saveData();
        renderApp();
    }
}

export function handleGoogleLogin() {
    const btn = document.querySelector('.auth-btn-google');
    if (!btn) return;

    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined" style="animation: spin 1s infinite linear;">sync</span> 正在安全验证...';
    btn.disabled = true;

    // Inject a quick animation for the button if not exists
    if (!document.getElementById('auth-extra-styles')) {
        const s = document.createElement('style');
        s.id = 'auth-extra-styles';
        s.textContent = '@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }';
        document.head.appendChild(s);
    }

    // Simulate "Google Account Prompt" delay
    setTimeout(() => {
        // Here we simulate a successful login with a default profile
        updateState({
            user: {
                name: "Alex Traveller",
                avatar: "https://lh3.googleusercontent.com/a/ACg8ocL-fH-2jH6M6B-V9eM7f8A9_j4z8=s96-c",
                email: "alex.traveller@gmail.com"
            },
            currentView: 'dashboard'
        });

        btn.innerHTML = '<span class="material-symbols-outlined" style="color:#22c55e;">check_circle</span> 验证成功';

        setTimeout(() => {
            renderApp();
            saveData();
        }, 500);
    }, 1500);
}
