export function getLoginHTML() {
    return `
        <div class="login-view fade-in">
            <div class="login-card">
                <h2 style="margin-bottom: 2rem;">欢迎来到 Smart Trip</h2>
                <div class="form-group">
                    <label>请输入您的称呼以开始：</label>
                    <input type="text" id="login-name" placeholder="例如：Alex 旅行者" onkeydown="handleLoginKey(event)">
                </div>
                <button class="btn-main" style="width:100%; margin-top: 1rem;" onclick="handleLogin()">开启探索之旅</button>
            </div>
        </div>
    `;
}
