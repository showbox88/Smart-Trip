# Smart Trip — 高德地图服务商开关(Provider Toggle)设计

> 日期:2026-06-20
> 分支:`feature/amap-provider`(基于 `feature/pb-datasource` @ `084cccd`)
> 状态:设计已定,待写实施计划

## 背景与目标

Smart Trip 当前的地图、周边打卡、地点搜索、路线等服务全部依赖 **Google Maps JS SDK**
(18 个文件用到 `globalThis.google` / `googleMapsLoader`)。Google Maps 的 JS SDK 与瓦片在
**中国大陆被墙**,所以用户回国旅游时整张地图加载不出来,打卡面板也开不了。

**目标(本期 = 范围①):** 在设置里加一个**手动开关**,把地图服务商从 Google 切到 **高德(AMap)**。
开启后:
1. **底图渲染**走高德(国内能正常显示地图);
2. **周边打卡**走高德 POI,能在国内搜到中国地点并打卡。

其余 Google 功能(地点搜索框、路线绘制、急救附近、地点照片)在高德模式下**先禁用/降级**,
留到二期/三期。

非目标(本期明确不做):
- 地点搜索框、路线绘制(Polyline/Directions)、急救附近接高德
- 地点照片(高德开放平台不提供地点图片,功能性缺失,接受降级)
- 按地理位置**自动**切换服务商(只做手动开关)

## 关键决策(已拍板)

| # | 决策 | 选择 |
|---|---|---|
| 1 | 一期范围 | ① 高德底图 + 周边打卡 |
| 2 | 开关状态存哪 | **localStorage,按设备**(不进 PB;这是"设备/此刻人在哪"的偏好,非账号数据) |
| 3 | 实施顺序 | **先做 Smart Trip,完成后再单独验证 phone-bridge 的高德链路** |
| 4 | 周边打卡数据源 | **高德 JS SDK `PlaceSearch` 客户端直查**(不复用 phone-bridge `/api/poi/around` —— 那接口在 :8001 有 503 decoy 鉴权门,跨域调会被挡) |
| 5 | 切换生效方式 | 存偏好 → 提示并**重载页面**,bootstrap 按偏好加载对应 SDK(不做运行时热切两套 SDK) |
| 6 | 坐标真理之源 | `locations.lat/lng` **永远存 WGS-84**;高德 GCJ-02 在边界处转换 |

## 架构:地图服务商抽象层

引入 `mapProvider` 抽象,两套实现:

```
src/providers/
  index.js          ← 读 localStorage 偏好,导出当前 provider
  googleProvider.js  ← 把现有 Google 逻辑收拢(行为不变)
  amapProvider.js    ← 新增,基于高德 JS API 2.0
```

本期只让**两个消费点**走抽象:

| 消费点 | 现状(Google) | 高德模式 |
|---|---|---|
| 底图渲染 | `MapPanel.jsx` 用 `maps.Map` / `AdvancedMarkerElement` / `LatLngBounds` | `AMap.Map` / `AMap.Marker` / `setFitView` |
| 周边打卡 | `NearbyCheckinPanel.jsx` + `useNearbyRecommend.js` 用 `Place.searchNearby` | `AMap.PlaceSearch.searchNearBy` |

其余用到 `globalThis.google` 的文件(搜索框、路线、急救、地点详情)在高德模式下:
检测到 provider≠google 时**隐藏入口或显示"高德模式暂不支持"占位**,不报错。

## SDK 加载

- 新增 `utils/amapLoader.js`,镜像现有 `utils/googleMapsLoader.js`:
  动态插入高德 JS API 2.0 script,带 `key` + 安全密钥 `securityJsCode`,
  resolve 出 `window.AMap`,设 `window.amapReady` 标志(对应现有 `window.googleMapsReady`)。
- bootstrap(`main.jsx`)按 localStorage 偏好二选一加载,**不同时加载两套**。

## 坐标系策略(核心:GCJ-02 ↔ WGS-84)

高德用 GCJ-02(火星坐标),浏览器 GPS 与现有 Google 数据是 WGS-84。直接混用会偏 100–500m。

- 新增 `utils/coord.js`:`wgs84ToGcj02(lat,lng)` / `gcj02ToWgs84(lat,lng)`(标准开源算法,~50 行,含中国境外直接返回的判断)。
- **DB `locations.lat/lng` 永远 WGS-84**(与海外历史数据一致,绝不混库)。
- 高德模式下的转换边界:
  - 浏览器 GPS(WGS-84)→ `wgs84ToGcj02` → 喂给高德地图中心 / `PlaceSearch` 中心 / "我的位置"标记。
  - 高德返回 POI 坐标(GCJ-02)→ 展示用 GCJ-02(画在高德图上一致);**写库前 `gcj02ToWgs84`** 存入 `locations.lat/lng`,并同时写 `amap_poi_id`。
- 收益:海外用 Google 模式时仍能把国内打卡点近似画出;DB 单一坐标系不分裂。

## 周边打卡:数据与去重

- 分类:把现有 `CATEGORIES`(NearbyCheckinPanel)的 Google `includedTypes` 映射到高德 POI typecode(餐饮/咖啡/景点/购物/住宿)。
- 调 `AMap.PlaceSearch({ pageSize, type })` 的 `searchNearBy(keyword='', center, radius)`,半径沿用 250m。
- **去重主键随 provider 切换**:
  - Google 模式:`place_id`(现状 `existingPlaceIds`)
  - 高德模式:`amap_poi_id`(`locations` 表已有该列;`pbWrites.createPbStop` 的"按名复用"兜底)
  - `existingPlaceIds` 比较逻辑增加 provider 维度(同时持有两类 id 时按当前 provider 取对应键)。

## 底图渲染(MapPanel)

高德模式下:
- 创建 `AMap.Map(container, { zoom, center: gcj02Center })`。
- 行程 stops:每个有坐标的 stop 用 `wgs84ToGcj02` 转后 `new AMap.Marker`。
- `map.setFitView` 适配所有标记;"我的位置"用转换后的 GPS。
- 路线 Polyline 属③,本期不画。

## server.js / Key / 网络放行

- **高德 Key**:需在高德开放平台注册账号,创建 **Web端(JS API)Key + 安全密钥 jscode**。
  个人免费额度足够,**不产生付费**。
- 构建期注入:`VITE_AMAP_KEY` / `VITE_AMAP_JSCODE`(与 Google key 同样暴露在前端,靠域名白名单约束)。
  写进 `.env.pb-vm` 构建配置。
- `server.js` 的 `ALLOWED_HOSTS` 目前只放行 Google 系域名
  (`googleapis.com/googleusercontent.com/ggpht.com/gstatic.com`)。需加高德系
  (`*.amap.com`、`*.is.autonavi.com`、`webapi.amap.com`)。
- 检查 `index.html` 与 server.js 响应头是否有 CSP(`connect-src`/`img-src`/`script-src`),
  若有需同步放行高德域名。

## 数据流(高德模式打卡一次)

```
浏览器 GPS (WGS-84)
  └─ wgs84ToGcj02 ──► 高德地图中心 + PlaceSearch 中心
                        └─ AMap.PlaceSearch.searchNearBy ──► POI 列表 (GCJ-02, amap_poi_id)
                              └─ 用户点"打卡"
                                    └─ gcj02ToWgs84 ──► locations.lat/lng (WGS-84)
                                    └─ amap_poi_id ──► locations.amap_poi_id
                                    └─ 走现有 pbWrites.createPbStop / syncDayStopsToPb
```

PB 落点与现有打卡完全一致(`stops.checkin` / `locations` 复用 / `expenses` 等不变)——
本期只换"地点数据从哪来"和"坐标怎么转",不动 PB 写入契约。

## 验收标准(范围①)

- [ ] 设置页出现"地图服务商:Google / 高德"开关,切换后重载生效,偏好按设备记住
- [ ] 高德模式下底图能渲染(国内网络可显示),行程 stops 标记位置正确(无明显偏移)
- [ ] 高德模式下"附近打卡"面板能拉到中国 POI,分类切换正常
- [ ] 打卡写入后,`locations.lat/lng` 为 WGS-84、`amap_poi_id` 已填,海外切回 Google 模式该点位置近似正确
- [ ] 高德模式下未实现的 Google 功能(搜索框/路线/急救/地点照片)不报错,以禁用或占位呈现
- [ ] Google 模式行为与改动前完全一致(回归)

## 风险与依赖

- **高德 Key 申请**:依赖用户注册高德开放平台账号(免费)。这是开工前置。
- **GCJ-02 算法正确性**:用成熟开源实现并在已知坐标点上单测验证。
- **回归面**:provider 抽象收拢 Google 逻辑时不得改变 Google 模式行为 —— 需在 Google 模式下回归打卡/地图。
- **后续**:Smart Trip ① 完成后,再单独验证 phone-bridge 的高德链路(填 `AMAP_KEY` + 给 `poi.py` 加同款坐标转换 + 实测),复用本期的 `coord` 思路。

## 二期 / 三期(本期不做,登记备查)

- 二期:地点搜索框接高德 `PlaceSearch` 关键字搜索
- 三期:路线绘制接高德 `Driving/Transfer/Walking`
- 待定:急救附近、按地理位置自动切换、高德地点照片替代方案
