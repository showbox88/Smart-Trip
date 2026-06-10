# 计划书：Smat Trip UI × Phone Bridge 共用 PocketBase

> 状态：**草案 v2（2026-06-10）— 已吸收第一轮意见，等待最终审定**
> v2 变更：①去掉登录（代理持 token）②图片存 VM 文件夹、PB 只存路径 ③新增 Phase 3a 最小可用集（打卡+拍照+记账）
> 分支：`feature/pb-datasource`（已有只读版，本计划是它的延续）
> 愿景：平时和旅行中都用 phone-bridge（Claude 对话）记录；随时可以打开本 UI
> （`https://dashboard-server.tail4cfa2.ts.net:8451`）浏览和手动增改，两边读写**同一个 PocketBase**，
> 由现有 Notion 双向同步把数据带到 Notion。

---

## 1. 现状盘点

### 1.1 生态全景（谁在读写 PB）

```
手机/电脑 Claude (phone-bridge PWA)          本 UI (smat-trip :8451)
        │ 记录: todos/页面/行程/消费…              │ 目前只读 trips/days/stops/locations
        ▼                                         ▼
   PocketBase 0.38.2 (dashboard-server 127.0.0.1:8090, 14 MB)
        ▲                                         │
        │ notion-sync.timer 每小时双向同步          │ Litestream 10s WAL → CT 103
        ▼          (冲突→Notion Activity 人工裁决)  │ 周日加密归档 → Oracle Tokyo (65d)
      Notion (10 个 collection 有映射)
```

关键事实：
- **写 PB = 写 Notion**：PB 侧 `updated` 变化会在下一次小时同步推到 Notion；冲突有人工裁决流程。UI 的写操作天然融入这套体系，无需自建同步。
- **备份已健全**（Litestream 实时 + 周归档），写错数据可按 `runbooks/pb-restore.md` 秒级回滚。
- PB 目前 **superuser-only**（API rules 全关），`users` collection 为空。
- PB 除 `users.avatar` 外**没有任何 file 字段**，现有 photos 都是 json（外链 URL）。

### 1.2 数据库对比（UI 期望 vs PB 现有）

| 维度 | UI（Supabase V2 模型） | PocketBase 现状 | 差距评级 |
|---|---|---|---|
| 行程 | `trips`: title, **thumb 封面图**, start/end, **settings(json)**, **share_token** | `trips`: title, date_start/end, origin/destination, budget, status, type, content, companions, photos(json), notion_* | 🟡 缺 thumb/settings/share_token |
| 天 | `days_v2`: date 唯一, **title, color**, **stops_data(JSONB 内嵌全部 stop)** | `days`: name(=日期), date, note, weather, timezone, content, photos(json), **trip(单关系)** | 🟡 缺 color；结构是关系型不是 JSONB（适配层已解决读取） |
| 天↔行程 | `trip_days` 多对多 | `days.trip` **一对多**（一天只属一个行程） | 🟢 接受单关系，UI 适配（见 §3 决策 D4） |
| 站点 | stops_data 项：type(7 种卡片), time+period, **price**, **photo**, desc, category, placeId, openingHours, checkedIn… | `stops`: name, date, **reserved(预约时间)**, **checkin(打卡时间)**, categories(中文多选), note, actual_lat/lng, 关系 day/trip/location/contact/journal, timezone | 🟡 缺卡片类型/计划时间语义/照片；price 由 expenses 取代（更强） |
| 地点主数据 | `places`（Google POI 缓存） | `locations`: 含 osm_id / amap_poi_id / fsq_id, lat/lng, photos(json) | 🟢 PB 更通用，缺 google place_id 字段 |
| 消费 | stop.price 单字段 + ExpenseModal | `expenses`: **26 条**，多币种+汇率+USD 折算(hook 计算)，关联 stop/day/trip | 🟢 **PB 完胜**，UI 改读写 expenses |
| 图片 | Supabase Storage `trip-media` 桶（18 处调用：stop 照片、行程封面、相册） | ❌ 无文件存储，photos 全是外链 json | 🔴 **最大缺口**（见 §3 决策 D2） |
| 设置/主题 | `user_settings` + `themes`（语言、主题色、布局） | ❌ 无 | 🔴 需新建 collection（旧设置需从 Supabase 抢救，见 §4 Phase 5） |
| 多用户 | user_id 贯穿所有表 + RLS | 单用户（superuser），无规则 | 🟢 按单用户设计（见 §3 决策 D1） |
| 管理页 | `system_settings` + `api_logs`（API key 管理/用量） | ❌ 无 | ⚪ PB 模式下砍掉或后置 |
| 旅程日记 | 无 | `journal`(关联 trip/day/stop), `profiles`, `foods`… | ⚪ UI 未来可增显，不在本计划核心 |

### 1.3 必须先解决的两个隐患（Phase 0）

1. **`pb_hooks/days.pb.js` 疑似绑错 collection**：hook 在 `days` 的 create/update 上计算
   `amount_usd`（amount × rate），但 `days` 根本没有 amount/rate/amount_usd 字段——这套公式
   显然是给 `expenses` 写的。**如果该 hook 导致 days 更新报错，UI 的写支持（改天 note 等）会全军覆没。**
   Phase 0 必须实测并修正（改绑 `expenses` 或确认 PB 对 set 未知字段静默忽略）。
2. **Notion 同步对"新增字段"的行为未验证**：计划会给 trips/days/stops 加字段（thumb/color/stop_type 等）。
   预期 sync 只搬 field map 里映射过的字段、忽略未映射字段，但必须实测确认（在
   `sync_config.field_map_overrides` 之外加字段 → 跑一轮同步 → 确认 Notion 无异常、PB 字段不被清空）。

---

## 2. 总体架构（目标态）

```
                       ┌────────────────────────────────────────┐
                       │ PocketBase（唯一事实源）                  │
  phone-bridge ──写──► │  trips / days / stops / locations       │ ◄──读写── 本 UI
  (Claude 记录)        │  expenses / journal / app_settings(新)  │   (浏览 + 手动操作,
                       │  photos 字段只存路径，文件在 VM           │    免登录)
                       │  /home/dev/smat-trip/media/             │
                       └───────────────┬────────────────────────┘
                                       │ 既有 notion-sync（不改动）
                                       ▼
                                    Notion
```

- UI 侧保持现有适配层架构：`src/adapters/pbAdapter.js` 负责形状映射，
  `src/hooks/pb/*` 实现与 Supabase hooks 同签名的读写，**UI 组件继续零改动**。
- 写路径原则：**UI 写的就是 phone-bridge 写的同一批 collection、同一套字段语义**，
  不引入"UI 专用"的平行字段；新增字段两边共用。

## 3. 关键决策（建议方案，待你拍板 ✋）

| # | 问题 | 决定（v2） | 说明 |
|---|---|---|---|
| **D1** | 鉴权 | ✅ **已定：去掉登录页**。`server.js` 代理在 VM 上持有 PB superuser token（存 `/home/dev/smat-trip/.env`，不进仓库），对 `/api` 请求自动注入 Authorization；浏览器端零凭据，打开即用 | 单人内部使用，安全边界 = Tailscale（:8451 tailnet-only）。UI 侧 `useAuthPb` 改为直接放行（合成一个固定 user 对象）。代价：tailnet 上任何设备都可读写 PB——你的 tailnet 只有自己的设备，可接受 |
| **D2** | 新照片存哪里 | ✅ **已定：VM 文件夹 + PB 存路径**。文件落 `/home/dev/smat-trip/media/<collection>/<recordId>/xxx.jpg`，`server.js` 增加 `GET /media/*`（静态出图）和 `POST /media`（multipart 上传，返回路径）；路径字符串写进 PB 的 photos(json) 字段 | PB 数据库保持轻量；days/trips/locations 已有 photos json 字段可直接用，stops 需加一个 photos(json)。**注意**：media 文件夹不在 Litestream 链路里，需补一条备份（见 §5 风险表新增项） |
| **D3** | 旧 Supabase 图片/设置 | ✅ **默认不迁**。旧图片是 demo 性质；设置（主题/语言）在 app_settings 里重配即可。如果之后发现有舍不得的图，再单独 restore 一次导出 | 省一天工作量；Supabase 项目保持 INACTIVE 不动 |
| **D4** | 一天多行程（trip_days 多对多）要不要保留？ | **放弃多对多，接受 PB 的 day.trip 单关系**（v1 无异议，默认采纳） | 你的真实使用是一条时间线；多对多是旧 demo 需求。UI 里"把天挂到行程"操作改成设置 day.trip |
| **D5** | UI 的 7 种卡片类型（location/hotel×2/activity/note/list/transport）怎么落到 stops？ | stops 加 **`stop_type` select 字段**（默认 location），categories 继续做展示分类；hotel 入住/退房、交通卡的扩展属性放新 **`meta(json)` 字段** | 关系型拆表（V3 教训）不再犯；一个 json 兜住卡片差异化数据，Notion 不映射它 |
| **D6** | UI 的"计划时间"用哪个字段？ | stops 加 **`planned_at`(date)**；`reserved` 保持"预约确认时间"语义不动 | reserved/checkin 语义是 phone-bridge 在用的，不能挪用 |
| **D7** | 费用：UI 的 stop.price 怎么办？ | UI 费用读写全部走 **`expenses`**（"记一笔钱"进 3a 最小集，已确认） | 比单 price 字段强得多（多币种+USD 折算现成）；ExpenseModal 已有 UI 雏形 |
| **D8** | 新增字段要不要同步到 Notion？ | **第一期一律不映射**（不改 sync_config），跑稳后按需挑（如 stop_type） | 把 Notion 同步当黑盒保护起来，是本计划最大的风险隔离措施 |

## 4. 分阶段实施计划

> 每个 Phase 独立验收、可暂停；**写生产 PB 的操作（Phase 1 起）前都先做一次手动快照**
> （`litestream snapshot` 或直接 cp data.db，5 分钟内可回滚）。

### Phase 0 — 验证与排雷（半天，零风险，只读+测试库）
- [ ] 在本地起一个 **PB 测试副本**（从 CT 103 副本 restore 或 scp data.db），后续所有 schema 实验先在副本做
- [ ] 实测 `days.pb.js` hook 是否破坏 days 更新；结论：改绑 expenses / 删除 / 确认无害
- [ ] 实测 Notion sync 对未映射新字段的行为（副本库做不了端到端，就在生产加一个无害测试字段 `_probe` 观察一轮同步后删除）
- [ ] 摸清 smart-trip-mcp（VM 200）写 stops/locations 的字段约定，写进本文档附录，保证 UI 写入遵守同一约定
- [ ] 生成 PB superuser 长效 impersonate token 并验证（Phase 1 免登录的前提）
- **验收**：上述 5 项都有书面结论，更新本计划打勾

### Phase 1 — 免登录改造 + 最小 schema（半天）
- [ ] `server.js`：PB token 注入（superuser impersonate 长效 token 存 VM 本地 `.env`，systemd `EnvironmentFile` 加载）；`/api` 请求自动带 Authorization
- [ ] `server.js`：`GET /media/*` 静态出图 + `POST /media` multipart 上传（限 tailnet 来源，单文件 ≤20 MB）
- [ ] UI：去掉登录页（PB 模式下 `useAuthPb` 直接合成固定 user），signOut 隐藏
- [ ] schema（只加 3a 需要的）：`stops` + `photos`(json)；其余字段（stop_type/planned_at/meta/color/settings/app_settings/google_place_id）**推迟到 Phase 2/3 用到时再加**
- **验收**：打开 :8451 无登录直接见数据；phone-bridge 正常记录；Notion 同步跑一轮无新冲突

### Phase 3a — 旅行最小可用集：打卡 + 拍照 + 记账（1-2 天，优先于其它一切写功能）🎯
- [ ] **打卡**：TodayPage / GPS 打卡 → 写 `stops.checkin`（含手动补打卡、改时间）
- [ ] **拍照**：stop 卡片上传照片 → `POST /media` → 路径 append 进 `stops.photos`(json)；StopImage/Lightbox 显示
- [ ] **记账**：ExpenseModal → 新建/编辑 `expenses`（description/amount/currency/rate/date + stop/day/trip 关联，amount_usd 由现有 hook 计算——**依赖 Phase 0 排雷结论**）
- [ ] 写开关 `VITE_PB_WRITES`（默认开这三项，其余仍 no-op）
- **验收（真实场景演练）**：手机上走一遍"到店打卡 → 拍照上传 → 记一笔消费"，PB/phone-bridge/Notion 三处数据正确；UI 浏览不回归

### Phase 2 — 读适配完善（1 天，3a 之后做）
- [ ] categories/stop_type → UI 卡片类型与图标完整映射（含酒店线、交通卡）
- [ ] expenses → Dashboard 预算汇总、stop 卡片费用、ExpenseModal 只读展示
- [ ] photos(json 外链 + 新 file 字段) → StopImage / 相册 / Lightbox
- [ ] journal 关联 → DayPage 显示当天日记摘要（只读）
- [ ] trips.photos json → 行程相册
- **验收**：你手机上实际浏览一遍西班牙行程，逐页确认显示对、无报错

### Phase 3b — 完整写支持（2 天，在 3a 跑稳之后）
逐个开启（每开一个先在测试副本演练）：
- [ ] Day：改 note/color；stop 排序（加 planned_at 字段）
- [ ] Stop：新建（含 locations 去重——按 google_place_id/osm_id/名称+坐标）、改名/备注/时间、删除；stop_type/meta 字段补齐（酒店/交通卡）
- [ ] Trip：改标题/日期/状态/封面（thumb 路径走 /media），新建行程，把天挂进行程（day.trip）
- **验收**：UI 改一条 → phone-bridge 里能看到；phone-bridge 记一条 → UI 刷新可见；下一轮 Notion 同步无冲突堆积
- **回滚**：`VITE_PB_WRITES` 开关随时退回 3a 范围或全只读

### Phase 4 — media 备份 + 收尾（半天）
- [ ] `/home/dev/smat-trip/media/` 备份：加 systemd timer，每天 rsync 到 CT 103（与 PB 副本同机），或并入周归档脚本一起加密上传 Oracle
- [ ] `app_settings` collection + 主题/语言持久化（UI 偏好不再依赖 Supabase）
- [ ] 文档：本仓库 ARCHITECTURE.md 增补 PB 模式章节；infrastructure 仓库更新 dashboard-server.md（media 路径/备份/上传端点）
- [ ] 视情况：`feature/pb-datasource` 是否转正为长期分支（**不动 main 的原则不变**，建议长期双轨：main=Supabase 演示版，pb 分支=自用版）

### 后续展望（不在本计划内）
- journal/todos/foods 在 UI 里的更多展示
- 把 stop_type 等字段纳入 Notion 映射
- PWA 安装（手机桌面图标）、离线缓存

## 5. 风险清单

| 风险 | 等级 | 缓解 |
|---|---|---|
| 写坏生产 PB 数据 | 高 | 每 Phase 前快照；写功能默认关（env 开关）；Litestream+周归档兜底 |
| 触发 Notion 同步风暴/冲突堆积 | 中 | D8 新字段不映射；Phase 1/3 验收都包含"跑一轮同步检查"；可临时 `sync_global.paused=true` |
| days.pb.js hook 阻塞写入 | 中 | Phase 0 排雷项，必须先有结论 |
| media 文件夹无备份（不在 Litestream 链路） | 中 | Phase 4 加每日 rsync → CT 103；在此之前照片有丢失风险（手机相册留原图兜底） |
| 免登录后 tailnet 内任意设备可写 PB | 低 | 单人 tailnet；设备丢失时在 Tailscale 控制台踢设备即可 |
| 上传端点被滥用塞满磁盘 | 低 | 单文件 ≤20 MB + 仅 tailnet 可达；VM 磁盘 49 GB 余量大 |

## 6. 决策记录与遗留问题

**已定（2026-06-10 第一轮反馈）**：
- D1 ✅ 免登录（代理持 token，浏览器零凭据）
- D2 ✅ 图片存 VM 文件夹 `/home/dev/smat-trip/media/`，PB 只存路径
- D3 ✅ 旧 Supabase 不迁（图片、设置都不要了）
- D7 ✅ 费用走 expenses；优先级确认：**3a = 打卡 + 拍照 + 记账 + 浏览（已有）**

**遗留小问题（不阻塞开工，执行中顺手确认）**：
1. D4 一天多行程：默认放弃多对多，如有异议在 Phase 3b 前提出
2. 照片要不要压缩后上传（省流量/磁盘）还是存原图？默认：原图 ≤20 MB，超出前端压一档
3. media 备份去 CT 103 还是只进周归档？默认：每日 rsync CT 103

**执行顺序**：Phase 0（排雷）→ 1（免登录+上传通道）→ **3a（打卡/拍照/记账）**→ 2（读适配补全）→ 3b（完整写）→ 4（备份+收尾）

---
*计划书审定后，按上述顺序执行；每完成一个 Phase 在此文档打勾并记录日期。*
