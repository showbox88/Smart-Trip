@echo off
REM SmartTrip — PocketBase 只读数据源模式
REM 1) 开 SSH 隧道: 本机 8090 -> dashboard-server 上的 PocketBase (127.0.0.1:8090)
REM 2) 以 pb 模式启动 vite (加载 .env.pb)
REM 登录用 PB 管理员账号 (Vaultwarden 里查)

cd /d "%~dp0"

echo [1/2] 检查 SSH 隧道...
netstat -ano | findstr "LISTENING" | findstr ":8090" >nul
if %errorlevel%==0 (
    echo     8090 已有监听, 跳过隧道创建
) else (
    echo     启动 SSH 隧道 dashboard-server:8090 ...
    start "PB-tunnel (不要关闭)" ssh -N -L 8090:127.0.0.1:8090 dashboard-server
    timeout /t 2 /nobreak >nul
)

echo [2/2] 启动 Vite (PocketBase 模式)...
npm run dev:pb
