# Smart Trip — 高德二期:搜索框 + 地图点选加点 设计

> 日期:2026-06-21
> 分支:`feature/amap-phase2`(基于 `feature/pb-datasource`,含一期 `00b533f`)
> 状态:设计已定,待写实施计划
> 前序:一期见 `docs/amap-provider-toggle-spec.md`(底图 + 周边打卡,已上线)

## 背景与目标

一期已让高德模式有了底图 + 周边打卡(列表)。二期补两个加点入口,补齐和 Google 模式的体验差距:

1. **地点搜索框** —— 主动搜地名/店名,选中后飞到地图并可加入当天。
2. **地图点选加点** —— 直接点地图上的店铺/POI,弹卡片加入当天。

两者最终都复用一期的写入路径 `useAmapPlaceAdd.addStopFromAmapPoi`(喂一个 POI 对象,自动 GCJ-02→WGS-84 + 写 `amap_poi_id`)——**本期不新增任何写库逻辑**。

## 关键决策(已拍板)

| # | 决策 | 选择 |
|---|---|---|
| 1 | 本期范围 | 搜索框 + 地图点选加点(两个都做) |
| 2 | 选中地点后的交互 | **轻量信息卡**(名称 + 地址 + 「加入当天」按钮),搜索/点选共用 |
| 3 | 分类快搜按钮 | **不做**(附近打卡面板已覆盖分类浏览,搜索框只做关键字搜索) |
| 4 | 地图点选识别 POI | `AMap.PlaceSearch.searchNearBy('', clickLngLat, 50m)` 取最近 POI;点到空白不弹卡 |
| 5 | 地点照片/评分卡 | 不做(高德不提供) |
| 6 | 加点的 useNow | `false`(搜索/点选是"规划加入",不打实时 checkin 时间;周边打卡才是 useNow=true) |

非目标:路线绘制(三期)、地点照片替代、非 isDayMode 纯浏览态加点。

## 架构:新增两个高德专用组件

```
src/components/itinerary/
  AmapSearchBox.jsx   ← 高德版搜索框(对标 MapSearchBox),挂在 AmapMapPanel 顶部
  AmapPlaceCard.jsx   ← 轻量信息卡(名称+地址+加入当天+关闭),搜索选中/点选 POI 共用
  AmapMapPanel.jsx    ← 改:挂载上面两个 + 管理 selectedPlace 状态 + map click 监听
```

Google 的 `MapSearchBox.jsx` / `MapInfoPanel.jsx` / `MapPanel.jsx` **一行不动**。

## SDK 插件

`utils/amapLoader.js` 的 script `plugin=` 参数需追加 **`AMap.AutoComplete`**(目前只有 `AMap.PlaceSearch`)。
即 `plugin=AMap.PlaceSearch,AMap.AutoComplete`。

## 数据流

### 搜索框(AmapSearchBox)
```
输入(防抖 ~220ms)
  └─ new AMap.AutoComplete({ city:'全国' }).search(keyword, (status, result) => tips)
        └─ 渲染下拉提示(tip.name + tip.district)
              └─ 用户选中某 tip(tip 含 location=GCJ-02 / id / name / district)
                    └─ map.setZoomAndCenter(16, [tip.location.lng, tip.location.lat])
                    └─ selectedPlace = { name: tip.name, address: tip.district+tip.address,
                                          amap_poi_id: tip.id, _gcj:{lat,lng}, types:[] }
                    └─ 弹 AmapPlaceCard
```
注:个别 tip 无 `location`(模糊词条)→ 该条不可选/灰显或跳过(只用有坐标的 POI 词条)。

### 地图点选(AmapMapPanel 内 map click)
```
map.on('click', e => e.lnglat (GCJ-02))
  └─ new AMap.PlaceSearch({ pageSize:1 }).searchNearBy('', [lng,lat], 50, (status, result) => {
       complete & poiList.pois[0] → 取最近 POI;否则不弹卡
     })
        └─ selectedPlace = { name, address, amap_poi_id:poi.id, _gcj:poi.location, types }
        └─ 弹 AmapPlaceCard
```

### 加入当天(AmapPlaceCard 的按钮)
```
onClick「加入当天」
  └─ onAddToDay(dayId, selectedPlace, false)   // 复用一期派发器;对象→addStopFromAmapPoi
        └─ GCJ-02→WGS-84 落 locations.lat/lng,写 amap_poi_id(已实现)
  └─ 关闭卡片
```
`dayId` 用 AmapMapPanel 已有的 `dayId` prop(聚焦的当天)。非 isDayMode(无 dayId)时「加入当天」禁用/不显示。

## 坐标处理(沿用一期不变式)
- AMap 一切返回 GCJ-02:地图飞行、卡片展示、searchNearBy 中心都用 GCJ-02。
- 只有**写库**那一步 GCJ-02→WGS-84(在 `addStopFromAmapPoi` 内,已实现)。
- `locations.lat/lng` 永远 WGS-84,DB 不分裂。

## 错误/边界处理
- AutoComplete / searchNearBy 失败或无结果:搜索框显示空列表,点选不弹卡;不抛错(try/catch + console.warn,和一期一致)。
- 重复加点:`addStopFromAmapPoi` 已有 `amap_poi_id` 去重守卫(一期),搜索/点选加同一 POI 不会重复建 stop。
- 点选到无 POI 的空白区域:静默不弹卡。

## 验收标准
- [ ] 高德模式地图顶部出现搜索框;输入中文关键字出补全提示
- [ ] 选中提示 → 地图飞过去 → 弹信息卡(名称+地址)→「加入当天」写入 stop
- [ ] 点地图上某 POI → 弹信息卡(最近 POI)→ 可加入当天;点空白不弹
- [ ] 加入的 stop:`locations.lat/lng` 为 WGS-84、`amap_poi_id` 已填
- [ ] 同一 POI 重复加不产生重复 stop
- [ ] Google 模式搜索框/点选/InfoPanel 行为与改动前完全一致(回归)
- [ ] 非 isDayMode 浏览态不报错(加点入口禁用或无效)

## 测试策略
- 单测(vitest):POI 对象映射的纯函数(tip→POI、poi→POI 形状)若抽成纯函数则覆盖。
- SDK/DOM 交互(AutoComplete、map click、卡片)按一期惯例**浏览器手测**(高德模式 + 伪造国内 GPS,部署到 :8451 验收)。

## 风险 / 待执行时确认
- `AMap.AutoComplete` 的 `tip.location` 字段:部分词条无坐标,实现时按"有坐标才可选"处理。
- `searchNearBy` 半径 50m 取最近 POI 的体验需手测微调(可能放宽到 100m)。
- map click 与一期"点空白"行为不冲突(一期 AmapMapPanel 未加 click 监听,本期新增)。
- 三期:路线绘制(Driving/Transfer/Walking),不在本期。
