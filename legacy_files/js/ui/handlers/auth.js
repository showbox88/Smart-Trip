import { state, updateState } from '../../state.js';
import { renderApp } from '../render.js';
import { signIn, signUp, signOut, loadData } from '../../api.js';
import { createNewTrip, openTrip } from './trips.js';

let authMode = 'signin';

export function switchAuthTab(mode) {
    authMode = mode;
    const tabSignin = document.getElementById('tab-signin');
    const tabSignup = document.getElementById('tab-signup');
    const btnText = document.querySelector('#auth-submit-btn span:first-child');
    
    if (mode === 'signin') {
        tabSignin.classList.add('active');
        tabSignup.classList.remove('active');
        btnText.innerText = '立即登录';
    } else {
        tabSignup.classList.add('active');
        tabSignin.classList.remove('active');
        btnText.innerText = '注册并开启之旅';
    }
}

export async function handleAuthSubmit() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value.trim();
    const stayLoggedIn = document.getElementById('stay-logged-in').checked;

    if (!email || !password) {
        alert("请完整填写邮箱和密码");
        return;
    }

    const btn = document.getElementById('auth-submit-btn');
    const originalContent = btn.innerHTML;
    btn.innerHTML = '<span>进行中...</span> <span class="material-symbols-outlined" style="animation: spin 1s infinite linear;">sync</span>';
    btn.disabled = true;

    try {
        if (authMode === 'signin') {
            await signIn(email, password);
        } else {
            await signUp(email, password, { full_name: email.split('@')[0] });
            alert("注册成功！已自动登录。");
        }

        // Auth success: Load user data
        await loadData();
        
        updateState({ currentView: 'dashboard' });
        renderApp();
    } catch (err) {
        console.error("Auth Error:", err);
        alert("验证失败: " + (err.message || "请检查邮箱格式或网络连接"));
        btn.innerHTML = originalContent;
        btn.disabled = false;
    }
}

export function handleLoginKey(e) {
    if (e.key === 'Enter') handleAuthSubmit();
}

export function goDashboard() {
    state.currentView = 'dashboard';
    renderApp();
}

export function startPlanning() {
    state.currentView = 'dashboard';
    const newTrip = createNewTrip();
    if (newTrip) openTrip(newTrip.id);
    renderApp();
}

export function gotoLogin() {
    updateState({ user: null, currentView: 'login' });
    renderApp();
}

export async function handleLogout() {
    if (confirm("确定要退出并清除登录状态吗？")) {
        try {
            await signOut();
            updateState({ user: null, currentView: 'login', trips: [] });
            renderApp();
        } catch (e) {
            console.error("Logout error:", e);
        }
    }
}

export async function handleGoogleLogin() {
    // Supabase native Google login usually requires a redirect. 
    // We'll keep it simple for now or implement if requested.
    alert("Google 登录正在配置中，目前请使用邮箱登录。");
}
