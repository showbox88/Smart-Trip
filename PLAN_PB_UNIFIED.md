# 计划书：Smat Trip UI × Phone Bridge 共用 PocketBase

> 状态：**草案 v1（2026-06-09）— 等待审定，未审定前不动任何代码和数据**
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
  (Claude 记录)        │  expenses / journal / app_settings(新)  │   (浏览 + 手动操作)
                       │  + file 字段存照片（新）                  │
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

| # | 问题 | 建议 | 理由 / 备选 |
|---|---|---|---|
| **D1** | 鉴权：继续 superuser 还是建普通用户+API rules？ | **建一个普通 `users` 账号 + 给 8 个业务 collection 开 owner 规则**，UI 和 smart-trip-mcp 都改用它；superuser 只留管理 | 客户端长期持 superuser token 风险大（XSS 即全库陪葬）；tailnet-only 降低但不消除风险。备选：维持 superuser（省 1 天工作量，安全性靠 tailnet 兜底） |
| **D2** | 新照片存哪里？ | **PB file 字段**（`stops.photos`、`trips.thumb`、`days.photos_files`），经现有 `/api/files/...` 同源出图 | 自动进 Litestream/周归档备份链路；UI 上传即用。代价：pb_data 体积增长（现在才 14 MB，照片按 200 张×2 MB ≈ 400 MB，CT 103 8 GB 盘和 Oracle 归档都扛得住，但**归档脚本耗时会变长，需观察**）。备选：单独 static 目录 + nginx（备份要另搞，不推荐） |
| **D3** | 旧 Supabase 里的图片和设置怎么办？ | **临时 restore 已暂停的 Supabase 项目 → 导出 trip-media 桶 + user_settings/themes 表 → 迁入 PB → 重新暂停** | 项目只是 INACTIVE 未删除，数据应该都在。若 restore 失败/数据已清，接受损失（旧 demo 图片非刚需），主题用默认值重配 |
| **D4** | 一天多行程（trip_days 多对多）要不要保留？ | **放弃多对多，接受 PB 的 day.trip 单关系** | 你的真实使用是一条时间线；多对多是旧 demo 需求。UI 里"把天挂到行程"操作改成设置 day.trip |
| **D5** | UI 的 7 种卡片类型（location/hotel×2/activity/note/list/transport）怎么落到 stops？ | stops 加 **`stop_type` select 字段**（默认 location），categories 继续做展示分类；hotel 入住/退房、交通卡的扩展属性放新 **`meta(json)` 字段** | 关系型拆表（V3 教训）不再犯；一个 json 兜住卡片差异化数据，Notion 不映射它 |
| **D6** | UI 的"计划时间"用哪个字段？ | stops 加 **`planned_at`(date)**；`reserved` 保持"预约确认时间"语义不动 | reserved/checkin 语义是 phone-bridge 在用的，不能挪用 |
| **D7** | 费用：UI 的 stop.price 怎么办？ | UI 费用读写全部走 **`expenses`**（按 stop/day/trip 关联汇总），stop 卡片上显示该 stop 关联费用合计 | 比单 price 字段强得多（多币种+USD 折算现成）；ExpenseModal 已有 UI 雏形 |
| **D8** | 新增字段要不要同步到 Notion？ | **第一期一律不映射**（不改 sync_config），跑稳后按需挑（如 stop_type） | 把 Notion 同步当黑盒保护起来，是本计划最大的风险隔离措施 |

## 4. 分阶段实施计划

> 每个 Phase 独立验收、可暂停；**写生产 PB 的操作（Phase 1 起）前都先做一次手动快照**
> （`litestream snapshot` 或直接 cp data.db，5 分钟内可回滚）。

### Phase 0 — 验证与排雷（半天，零风险，只读+测试库）
- [ ] 在本地起一个 **PB 测试副本**（从 CT 103 副本 restore 或 scp data.db），后续所有 schema 实验先在副本做
- [ ] 实测 `days.pb.js` hook 是否破坏 days 更新；结论：改绑 expenses / 删除 / 确认无害
- [ ] 实测 Notion sync 对未映射新字段的行为（副本库做不了端到端，就在生产加一个无害测试字段 `_probe` 观察一轮同步后删除）
- [ ] 摸清 smart-trip-mcp（VM 200）写 stops/locations 的字段约定，写进本文档附录，保证 UI 写入遵守同一约定
- [ ] 确认 Supabase 项目可 restore（MCP `restore_project`），评估 trip-media 桶里实际有多少文件
- **验收**：上述 5 项都有书面结论，更新本计划 v2

### Phase 1 — PB schema 增强（半天，纯增量，不动现有字段）
- [ ] `trips` + `thumb`(file 1) + `settings`(json)
- [ ] `days` + `color`(text)
- [ ] `stops` + `stop_type`(select: location/hotel_checkin/hotel_checkout/activity/note/list/transport, 默认 location) + `planned_at`(date) + `meta`(json) + `photos`(file ≤10)
- [ ] `locations` + `google_place_id`(text)
- [ ] 新建 `app_settings`(单行: theme json, language, layout, …)
- [ ] （若 D1 通过）新建 users 账号 + 8 个 collection 的 API rules；UI 登录改 users 优先
- **验收**：phone-bridge 正常记录一条信息 + Notion 同步跑一轮无新冲突 + UI 只读功能不回归

### Phase 2 — 读适配完善（1 天）
- [ ] categories/stop_type → UI 卡片类型与图标完整映射（含酒店线、交通卡）
- [ ] expenses → Dashboard 预算汇总、stop 卡片费用、ExpenseModal 只读展示
- [ ] photos(json 外链 + 新 file 字段) → StopImage / 相册 / Lightbox
- [ ] journal 关联 → DayPage 显示当天日记摘要（只读）
- [ ] trips.photos json → 行程相册
- **验收**：你手机上实际浏览一遍西班牙行程，逐页确认显示对、无报错

### Phase 3 — 写支持（2-3 天，本计划核心）
逐个开启（每开一个先在测试副本演练）：
- [ ] Day：改 note/color；stop 排序（写 planned_at）
- [ ] Stop：新建（含 locations 去重——按 google_place_id/osm_id/名称+坐标）、改名/备注/时间、打卡（写 checkin）、删除
- [ ] Trip：改标题/日期/状态/封面，新建行程，把天挂进行程（day.trip）
- [ ] Expense：从 UI 新建/编辑消费（amount_usd 由 hook 算）
- [ ] 移除只读模式的 no-op 警告，保留"PB 写失败 → 本地回滚 + toast"
- **验收**：UI 改一条 → phone-bridge 里能看到；phone-bridge 记一条 → UI 刷新可见；下一轮 Notion 同步无冲突堆积
- **回滚**：恢复 no-op 只读版本（一个 env 开关 `VITE_PB_WRITES=off` 控制，默认关，验完再开）

### Phase 4 — 图片上传与迁移（1 天）
- [ ] uploadHelpers 增加 PB 实现（file 字段 multipart 上传，同源 `/api/files` 读取）
- [ ] 拍照/选图上传到 stop.photos、trips.thumb
- [ ] 旧图迁移（依赖 D3/Phase 0 结论）：restore Supabase → 下载 trip-media → 按记录对应关系传入 PB → re-pause Supabase
- **验收**：手机拍一张传到某 stop，UI 和备份链路（CT 103 副本里能看到文件）都正常

### Phase 5 — 设置迁移与收尾（半天）
- [ ] 旧 user_settings/themes → app_settings；主题/语言在 PB 模式下持久化
- [ ] 文档：本仓库 ARCHITECTURE.md 增补 PB 模式章节；infrastructure 仓库更新 dashboard-server.md
- [ ] 视情况：`feature/pb-datasource` 是否转正为长期分支/合并策略（**不动 main 的原则不变**，建议长期双轨：main=Supabase 演示版，pb 分支=自用版）

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
| Supabase restore 失败，旧图片/设置丢失 | 低 | 非刚需数据，接受损失并在计划 v2 里删掉 Phase 4 迁移项 |
| pb_data 体积膨胀拖慢周归档 | 低 | 观察归档耗时；必要时图片改 thumbnail 上传 |
| superuser token 留在手机浏览器 | 中 | D1 改普通用户+规则后消除；期间靠 tailnet-only 兜底 |

## 6. 待你拍板的问题（按优先级）

1. **D1 鉴权**：要不要花半天做普通用户+API rules？（我建议：要）
2. **D2 图片进 PB file 字段**：同意吗？（我建议：同意）
3. **D3 旧 Supabase 抢救**：图片和设置值得花一天迁吗，还是只迁设置/都不迁？
4. **D4 放弃一天多行程**：确认你没有"同一天属于两个行程"的需求？
5. **D7 费用走 expenses**：UI 上 stop 显示"关联费用合计"而不是单价，OK？
6. Phase 3 写支持的范围：上面列的够不够？有没有你旅行中最高频、必须最先能用的操作（比如只要"打卡+拍照+记一笔钱"三件事）？——如果有，我把它们提成 Phase 3a 优先做。

---
*计划书审定后，按 Phase 顺序执行；每完成一个 Phase 在此文档打勾并记录日期。*
