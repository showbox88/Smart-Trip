export function getLoginHTML() {
    return `
        <div class="login-view fade-in">
            <!-- Background Section -->
            <div class="login-bg-container">
                <img src="assets/images/login_bg.png" class="login-bg-image" alt="Travel Background">
                <div class="login-overlay"></div>
            </div>

            <!-- Login Card Container -->
            <div class="login-card-container">
                <div class="login-glass-card">
                    <div class="login-logo">Smart<span>Trip</span></div>
                    <div class="login-tagline">开启您的全球智能旅行规划之旅</div>
                    
                    <!-- Google Login Social Button -->
                    <button class="auth-btn-google" onclick="handleGoogleLogin()">
                        <svg width="18" height="18" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1 .67-2.28 1.07-3.71 1.07-2.85 0-5.27-1.92-6.13-4.51H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                            <path d="M5.87 14.13c-.22-.67-.35-1.38-.35-2.13s.13-1.46.35-2.13V7.01H2.18C1.43 8.51 1 10.21 1 12s.43 3.49 1.18 4.99l3.69-2.86z" fill="#FBBC05"/>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.01l3.69 2.87c.86-2.59 3.28-4.5c6.13-4.5z" fill="#EA4335"/>
                        </svg>
                        使用 Google 账号登录
                    </button>

                    <div class="auth-divider">
                        <span>或</span>
                    </div>

                    <div class="auth-form-group">
                        <label for="login-name">输入您的称呼</label>
                        <div class="auth-input-wrapper">
                            <span class="material-symbols-outlined auth-input-icon">person</span>
                            <input type="text" id="login-name" class="auth-input" placeholder="例如：Alex 旅行者" onkeydown="handleLoginKey(event)">
                        </div>
                    </div>
                    
                    <button class="auth-btn-main" onclick="handleLogin()">
                        <span>开启探索之路</span>
                        <span class="material-symbols-outlined" style="font-size:18px;">arrow_forward</span>
                    </button>
                    
                    <div class="auth-footer">
                        还没有计划？<a href="#" onclick="startPlanning()">先看看示例行程</a>
                    </div>
                </div>
            </div>
            
            <div style="position:absolute; bottom: 2rem; left: 2rem; z-index: 10; color: rgba(255,255,255,0.4); font-size: 0.75rem; letter-spacing: 1px; font-weight: 600;">
                PROJECT: SMART-TRIP / 2026 EDITION
            </div>
        </div>
    `;
}
