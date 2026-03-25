# Smart Trip — Roadmap

> 功能计划书，记录待做 / 进行中 / 已完成的功能。
> 标记说明：`[ ]` 待做 · `[~]` 进行中 · `[x]` 已完成

---

## Archive & 相册系统

- [x] Trip Archive 同步逻辑 — ID-only 匹配，每个 Smart Trip 独立创建 album
- [x] 深拷贝 & 磁盘读取 — 避免 React state 过期数据和浅拷贝 mutation
- [x] Event 匹配优化 — stop.id 优先，fallback title+trip_id
- [x] 相册视图重构 — 仅显示已同步 album，空状态提示
- [x] "Manage Photos" 自动化 — 未链接时自动选文件夹 → 同步 → 跳转
- [x] Album 导航改用 tripId
- [x] 右键菜单子菜单滚轮修复
- [x] Event 选中状态修复（event_id vs id）
- [ ] 照片按 trip 子文件夹组织 — 现有逻辑已支持，等真实数据迁移后启用
- [ ] Notion 数据导入 — 从 Notion 关联表格导出 trip/event 数据到 trip_database.json

---

## 分享功能

- [x] Trip 分享链接 — 生成 share_token，公开只读链接
  - [ ] Supabase: trips 表加 share_token 字段 + 匿名读取 RLS 策略 ← **需在 Supabase 控制台手动执行**
  - [x] 前端: `/shared/:token` 公开路由 + SharedTripPage 只读视图
  - [x] UI: TripHeader 菜单加"Share trip"按钮 + ShareModal（生成/复制/撤销链接）
  - [x] Dashboard 卡片菜单同步加"Share trip"，已分享封面显示 badge
- [x] 导入分享 Trip — 通过分享链接将别人的 trip 复制到自己账户
  - [x] 只读页面加"Import to My Trips"按钮（登录后显示）
  - [x] 深拷贝 trip 数据，所有 id 重新生成，绑定当前 user_id
  - [ ] 图片处理: 复制 Supabase Storage 图片到新路径（暂缓，先用原 URL）

---

## Stop 卡功能

- [x] 导航按钮 — Stop 卡底部 chip，一键跳转 Google Maps 导航（优先用 placeId）
- [x] 酒店卡重复 Check-in 标识修复 — 移除底部冗余文字，保留顶部 badge
- [ ] 附件卡 — Stop 卡下挂载凭证、文件和链接（详见 [docs/attachment-card-spec.md](docs/attachment-card-spec.md)）
  - [ ] P0: 图片 / 截图上传，缩略图展示 + 全屏预览
  - [ ] P0: URL 链接添加 + 跳转
  - [ ] P1: PDF 上传 + 预览
  - [ ] P1: 附件删除 / 重命名
  - [ ] P2: URL 自动抓取链接预览（OG 元数据，Edge Function 代理）
  - [ ] P2: 剪贴板粘贴图片（Ctrl+V）
  - [ ] P3: 二维码从图片自动识别

---

## 行程规划

- [ ] 悠闲模式 — 先玩后整理，照片驱动生成行程（详见 [docs/wandering-mode-spec.md](docs/wandering-mode-spec.md)）
  - [ ] P0: 导入照片，读取 EXIF GPS + 日期，地图缩略图展示（视口动态加载）
  - [ ] P0: 单/多选照片 → 附近商家推荐 / 点击地图 / 搜索 三种归类方式 → 生成 Stop 卡
  - [ ] P1: 归类后照片状态切换（隐藏 / 点标记 / 暗灰），支持重新编辑
  - [ ] P1: 归类操作实时同步到 Smart Trip 行程视图
  - [ ] P2: 无 GPS 照片单独列出，支持手动归类
  - [ ] P2: 撤销（Ctrl+Z）最后一次归类操作
  - [ ] P3: 大量照片聚合（marker cluster）优化

---

## Bug 修复

- [x] 地图地点面板"已添加"状态误显 — 切换地点时重置 mutableAddedDays
- [x] 地图标记路线初始闪烁 — render effect 加 100ms 防抖，合并快速连续更新
- [x] 酒店地标仅首天显示 — 在每个从酒店出发的天补充 H marker
- [x] 分享 token 刷新/新标签后丢失 — useAuth loadUserData 补全 share_token 映射
- [x] 封面图搜索后刷新变图 — 保存前将 loremflickr URL 上传到 Supabase Storage

---

## UI / UX

- [ ] _(预留区域)_

---

## 后端 & 基础设施

- [x] 清理 uploads 文件夹 — 已从 git 删除，加入 .gitignore
- [ ] _(预留区域)_

---

*Last updated: 2026-03-25 (session 2)*
