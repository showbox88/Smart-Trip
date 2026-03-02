# Smart Trip | 智能旅行规划

Smart Trip 是一款以用户体验为核心的旅行规划原型应用。本项目深度复刻了现代顶级旅行规划产品的核心交互逻辑，特别是针对**路线行程单 (Itinerary)** 模块的高级编辑功能进行了高还原度的 UI/UX 实现。

## 🌟 核心功能亮点

### 1. 沉浸式行程时间轴
- **垂直虚线时间线**：流畅的连续时间轴，精准串联起每一天的行程。
- **动态颜色主题**：每天单独支持自定义主题色（如青蓝、橘红），时间轴 Pin、地图路线同步智能变色。
- **微缩全能卡片**：每个目的地独享紧凑级毛玻璃卡片，包含动态缩略图、标签化的时间/价格、地址/联系电话。
- **智能拖拽排序**：支持拖拽重排时间线卡片，局部 DOM 更新避免页面闪烁，并支持超长列表时的**边缘自动滚动 (Auto-scroll)**。
- **安全删除防误触**：全站核心删除操作搭载高度定制化的防拦截确认弹窗 (Custom Confirm Modal)。

### 2. 交互式地点增强 (Rich Location Modals)
- **Google Places 自动填充**：搜索并添加地点时，系统自动捕捉简介、地址、电话、评分及分类信息。
- **所见即所得编辑器**：点击行程卡片展开高级编辑器，支持时间选择、费用追踪、地址/备注编辑。
- **封面图搜索**：支持回车键触发搜索，预览图双击自动保存。
- **键盘导航**：搜索下拉列表支持方向键选择及回车确认。

### 3. 可视化交互地图 (Google Maps Integration)
- **独立按天渲染路线**：摒弃杂乱的全局连线，系统智能识别当前展开的行程天数，**仅绘制当前天**的路网，并适配当天的专属主题色！
- **探索与自定义编排**：点击地图任意兴趣点 (POI)，弹出适配当前日/夜模式且不遮挡文字的**详情信息面板**，并可通过原生设计的下拉菜单将该地点精准 "**+ 添加到指定行程天数**"。
- **🌙/☀️ 暗色模式切换**：地图右上角切换按钮，支持日间/夜间地图风格实时切换，默认夜间模式。
- **诊断指示器**：左下角 "Map Status" 状态条，实时反馈 API 加载及渲染状态。

### 4. 本地持久化后端
- **Python 数据服务**：配套 `server.py` 提供轻量级 REST API。
- **JSON 数据库**：数据实时存储在 `db.json` 中，支持 Git 同步与多端协作。

## 📂 项目结构

```
Smat Trip/
├── index.html              # 主入口文件
├── style.css               # UI/UX 样式（毛玻璃特效、动画）
├── db.json                 # 本地 JSON 数据库
├── server.py               # Python 轻量 REST API 后端
├── app.js.old              # 模块化前的原始单文件（备份参考）
│
└── js/                     # ES Module 模块化源码
    ├── main.js             # 总入口 + 全局桥接
    ├── state.js            # 全局状态管理
    ├── api.js              # 后端通信
    ├── constants.js        # 地点分类常量
    ├── utils.js            # 通用工具
    ├── maps.js             # Google Maps + 暗色模式
    ├── ARCHITECTURE.md     # 详细模块架构说明
    └── ui/
        ├── render.js       # 核心渲染引擎
        ├── templates/      # HTML 模板生成器
        │   ├── auth.js
        │   ├── dashboard.js
        │   └── itinerary.js
        └── handlers/       # 事件处理器
            ├── auth.js
            ├── trips.js
            ├── stops.js
            ├── search.js
            └── ux.js
```

*详见 [js/ARCHITECTURE.md](./js/ARCHITECTURE.md) 获取完整模块说明与数据流图。*

## 🚀 快速启动

1. **启动后端服务**：
   ```bash
   python server.py
   ```
   服务将在 `http://localhost:8000` 启动。

2. **打开浏览器**：
   访问 `http://localhost:8000`。

3. **推荐体验流程**：
   - 输入名字登录 → 点击 **"+ 新建行程"** 创建行程
   - 在日程底部搜索框输入地点（如"东京塔"）并按回车添加
   - 拖拽卡片重排顺序，点击卡片编辑详情
   - 点击地图右上角 ☀️/🌙 切换地图主题

## 🛠️ 技术栈

- **前端**：Vanilla JavaScript (ES Modules)、HTML5、CSS3
- **后端**：Python 3 (http.server)
- **第三方**：Google Maps JavaScript API、Flatpickr 日历组件
- **数据**：JSON 文件持久化

---
*Created with ♥ by Antigravity AI Assistant. Updated 2026-03-02.*
