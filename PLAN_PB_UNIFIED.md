# 计划书：Smat Trip UI × Phone Bridge 共用 PocketBase

> 状态：**草案 v3（2026-06-10）— 已吸收两轮意见，等待最终审定**
> v2 变更：①免登录（代理持 token）②图片存 VM 文件夹、PB 只存路径 ③新增 Phase 3a 最小可用集（打卡+拍照+记账）
> v3 变更：①登录页**保留不删**，初期用开关停用，后期可一键启用做第二层防护 ②新字段**将来要同步 Notion**，字段设计按可映射标准来，初期不映射 ③照片不压缩存原图；Google 地点图片下载缓存到 media，手机照片直传
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
| **D1** | 鉴权 | ✅ **已定（v3 修订）：登录页保留，双模式开关**。<br>**初期（login=off）**：UI 跳过登录直接进入，代理注入 PB token，浏览器零凭据。<br>**后期（login=on）**：登录页启用，走 PB 真实认证（代理停止注入，浏览器持自己的 token），形成 Tailscale 之外的第二层防护 | 登录代码不删除，由两个联动开关控制：UI 侧 `VITE_PB_LOGIN`（构建时）+ 代理侧 `PB_INJECT_TOKEN`（VM env，决定是否注入）。**两个开关必须同步切换**：注入开着时登录形同虚设，注入关着时不登录就没数据 |
| **D2** | 新照片存哪里 | ✅ **已定（v3 细化）：VM 文件夹 + PB 存路径，不压缩存原图**。两类来源：<br>① **手机上传**：multipart 直传 `POST /media`，原图保存（单文件 ≤25 MB，VM 磁盘 49 GB 现用 9 GB，足够）<br>② **Google 地点图片**：添加地点时由代理服务器**下载一份缓存**到 `media/locations/<id>/`（Google photo URL 含 API key 且会失效，不能存外链） | 路径写进 PB photos(json)。文件布局 `/home/dev/smat-trip/media/<collection>/<recordId>/<时间戳>_<原名>.jpg`。media 不在 Litestream 链路里，需补备份（§5 风险表） |
| **D3** | 旧 Supabase 图片/设置 | ✅ **默认不迁**。旧图片是 demo 性质；设置（主题/语言）在 app_settings 里重配即可。如果之后发现有舍不得的图，再单独 restore 一次导出 | 省一天工作量；Supabase 项目保持 INACTIVE 不动 |
| **D4** | 一天多行程（trip_days 多对多）要不要保留？ | **放弃多对多，接受 PB 的 day.trip 单关系**（v1 无异议，默认采纳） | 你的真实使用是一条时间线；多对多是旧 demo 需求。UI 里"把天挂到行程"操作改成设置 day.trip |
| **D5** | UI 的 7 种卡片类型（location/hotel×2/activity/note/list/transport）怎么落到 stops？ | stops 加 **`stop_type` select 字段**（默认 location），categories 继续做展示分类；hotel 入住/退房、交通卡的扩展属性放新 **`meta(json)` 字段** | 关系型拆表（V3 教训）不再犯；一个 json 兜住卡片差异化数据，Notion 不映射它 |
| **D6** | UI 的"计划时间"用哪个字段？ | stops 加 **`planned_at`(date)**；`reserved` 保持"预约确认时间"语义不动 | reserved/checkin 语义是 phone-bridge 在用的，不能挪用 |
| **D7** | 费用：UI 的 stop.price 怎么办？ | UI 费用读写全部走 **`expenses`**（"记一笔钱"进 3a 最小集，已确认） | 比单 price 字段强得多（多币种+USD 折算现成）；ExpenseModal 已有 UI 雏形 |
| **D8** | 新增字段要不要同步到 Notion？ | ✅ **已定（v3 修订）：将来要同步，初期不映射**。新字段全部按"未来可映射"标准设计：用 sync 引擎已支持的类型（text/date/select/json→rich_text），命名跟现有风格一致；待 3a/3b 跑稳后追加 **Phase 5：Notion 映射上线**（改 sync_config.field_map_overrides + Notion 端建属性 + 试同步） | 初期不映射依然是风险隔离措施；但字段设计时就为映射留好路，避免将来返工改字段类型 |

## 4. 分阶段实施计划

> 每个 Phase 独立验收、可暂停；**写生产 PB 的操作（Phase 1 起）前都先做一次手动快照**
> （`litestream snapshot` 或直接 cp data.db，5 分钟内可回滚）。

### Phase 0 — 验证与排雷 ✅ 完成（2026-06-10）
- [x] **测试副本**：dashboard-server `127.0.0.1:8092`（`/home/dev/pb-test/`，今日快照 + days hook + probe 测试管理员，nohup 运行）。后续 schema/写入实验先在这做
- [x] **days hook 无害**：副本实测 PATCH days 返回 200——PB 对 `set()` 不存在的字段静默忽略，写支持不受阻。**但 hook 等于白跑**：没有任何服务端逻辑算 expenses.amount_usd（实测 POST expense → amount_usd=0）。→ **3a 决定：UI 写 expense 时自己算 `amount_usd = rate>0 ? amount*rate : amount`**（与现有 26 条数据一致）；建议（不代劳）phone-bridge 仓库把 hook 从 days 改绑 expenses
- [x] **sync 对未映射字段安全**：transform.py 实读——新字段若在 Notion 端无对应属性则 `continue` 跳过，双向都不受影响。**注意**：存在蛇形命名自动匹配（PB 字段名 = Notion 属性名 snake_case 即自动同步），**Phase 1 加字段前必须先对一遍目标 Notion DB 的属性名**，避免意外撞名（如 stops 加 `photos` 前先确认 Notion stops DB 没有 Photos 属性，否则改名 `photo_paths`）
- [x] **字段约定**（合同 = `mcp_pb/SMARTNOTE_PROMPT.md`）：2026-06-03 起 days=纯日级容器（name/date/weather/note），原子事件全在 stops（挂 stop.day），金额全在 expenses（stops 不再有 amount/currency/rate）；timezone 列有统一解析规则；写入方是通用 CRUD（mcp_pb pb_create/pb_update）。**与本计划的映射方案完全一致，无冲突**
- [x] **长效 token**：10 年期 superuser impersonate token 已生成并验证（可读 trips），存于 VM `/home/dev/smat-trip/.env`（chmod 600，含 `PB_INJECT_TOKEN=on`），未离开 VM、未进仓库
- 额外发现：phone-bridge 工作区有大量未提交改动（notion_sync 重构等，6 月 9 日及更早）；今日改动仅认证相关（auth.py/superlink），对本计划无影响

### Phase 1 — 登录开关 + 上传通道 + 最小 schema（半天）
- [ ] `server.js`：PB token 注入（superuser impersonate 长效 token 存 VM 本地 `.env`，systemd `EnvironmentFile` 加载），由 `PB_INJECT_TOKEN=on/off` 控制
- [ ] UI：登录页**保留**，加 `VITE_PB_LOGIN=on/off` 开关；初期 off（跳过登录合成固定 user），登录/登出代码原样保留可随时启用
- [ ] `server.js`：`GET /media/*` 静态出图 + `POST /media` multipart 上传（限 tailnet 来源，单文件 ≤25 MB，**不压缩**）
- [ ] schema（只加 3a 需要的）：`stops` + `photos`(json)；其余字段（stop_type/planned_at/meta/color/settings/app_settings/google_place_id）**推迟到用到的 Phase 再加**，全部按 D8 可映射标准设计
- **验收**：打开 :8451 直接见数据（login=off）；把两个开关切到 on 验证登录流程可用后再切回；phone-bridge 正常记录；Notion 同步跑一轮无新冲突

### Phase 3a — 旅行最小可用集：打卡 + 拍照 + 记账（1-2 天，优先于其它一切写功能）🎯
- [ ] **打卡**：TodayPage / GPS 打卡 → 写 `stops.checkin`（含手动补打卡、改时间）
- [ ] **拍照**：stop 卡片上传照片（手机原图直传）→ `POST /media` → 路径 append 进 `stops.photos`(json)；StopImage/Lightbox 显示
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
- [ ] 新建地点时 Google 图片由代理下载缓存到 `media/locations/<id>/`（不存带 key 的外链）
- [ ] Trip：改标题/日期/状态/封面（thumb 路径走 /media），新建行程，把天挂进行程（day.trip）
- **验收**：UI 改一条 → phone-bridge 里能看到；phone-bridge 记一条 → UI 刷新可见；下一轮 Notion 同步无冲突堆积
- **回滚**：`VITE_PB_WRITES` 开关随时退回 3a 范围或全只读

### Phase 4 — media 备份 + 收尾（半天）
- [ ] `/home/dev/smat-trip/media/` 备份：加 systemd timer，每天 rsync 到 CT 103（与 PB 副本同机），或并入周归档脚本一起加密上传 Oracle
- [ ] `app_settings` collection + 主题/语言持久化（UI 偏好不再依赖 Supabase）
- [ ] 文档：本仓库 ARCHITECTURE.md 增补 PB 模式章节；infrastructure 仓库更新 dashboard-server.md（media 路径/备份/上传端点）
- [ ] 视情况：`feature/pb-datasource` 是否转正为长期分支（**不动 main 的原则不变**，建议长期双轨：main=Supabase 演示版，pb 分支=自用版）

### Phase 5 — Notion 映射上线（半天，3a/3b 跑稳之后）
- [ ] 挑选要同步的新字段（候选：stop_type、planned_at、photos 路径列表、trips.settings 不同步）
- [ ] Notion 端对应 DB 建属性 → `sync_config.field_map_overrides` 增加映射 → 手动触发一轮同步观察
- [ ] 连续 3 天无冲突堆积后视为稳定
- **回滚**：从 field_map_overrides 删掉映射即可，PB 数据不受影响

### Phase 6 — 启用登录（10 分钟，想开就开）
- [ ] `VITE_PB_LOGIN=on` 重新构建 + VM 端 `PB_INJECT_TOKEN=off` + 重启服务
- [ ] 手机/电脑各登录一次（PB token 会留在浏览器 localStorage，之后免输）

### 后续展望（不在本计划内，已记录待启动）
- **双向互通入口（UI ⇄ phone-bridge 融合）**：分三步走，做到哪步看体验
  1. *互跳按钮*（几乎零成本）：本 UI 导航栏加 phone-bridge 入口；phone-bridge 界面加"打开行程 UI"入口（两边都是 tailnet 网页，`<a>` 即可）
  2. *带上下文跳转*：phone-bridge 聊到某天/某行程时给出深链（`:8451/day/2026-06-04`、`/trip-v2/<id>`）；UI 的 stop/day 上加"在 phone-bridge 里继续聊"并预填上下文
  3. *深度融合*（远期）：UI 内嵌 phone-bridge 对话面板，或 phone-bridge 内嵌行程时间线视图——共用同一个 PB，数据层天然打通，只是壳的问题
- journal/todos/foods 在 UI 里的更多展示
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

**已定（两轮反馈，2026-06-10）**：
- D1 ✅ 登录页保留、双开关控制；初期关闭（代理注入 token），后期一键启用做第二层防护
- D2 ✅ 图片存 VM 文件夹 `/home/dev/smat-trip/media/`，PB 只存路径；**不压缩存原图**；Google 地点图片下载缓存、手机照片直传
- D3 ✅ 旧 Supabase 不迁（图片、设置都不要了）
- D7 ✅ 费用走 expenses；优先级确认：**3a = 打卡 + 拍照 + 记账 + 浏览（已有）**
- D8 ✅ 新字段将来要同步 Notion（Phase 5），初期不映射，字段设计按可映射标准

**遗留小问题（不阻塞开工，执行中顺手确认）**：
1. D4 一天多行程：默认放弃多对多，如有异议在 Phase 3b 前提出
2. media 备份去 CT 103 还是只进周归档？默认：每日 rsync CT 103

**执行顺序**：Phase 0（排雷）→ 1（登录开关+上传通道）→ **3a（打卡/拍照/记账）**→ 2（读适配补全）→ 3b（完整写）→ 4（备份+收尾）→ 5（Notion 映射）→ 6（启用登录，随时）

---
*计划书审定后，按上述顺序执行；每完成一个 Phase 在此文档打勾并记录日期。*
