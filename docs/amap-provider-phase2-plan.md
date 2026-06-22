# 高德二期(搜索框 + 地图点选加点)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 高德模式补两个加点入口 —— 地点搜索框(AMap.AutoComplete)+ 地图点选(searchNearBy 取最近 POI),选中后弹轻量信息卡「加入当天」,复用一期写入路径。

**Architecture:** 新增两个高德专用组件(`AmapSearchBox`、`AmapPlaceCard`)挂进 `AmapMapPanel`;tip/poi→统一 place 对象抽成纯函数 `amapPoi.js`(TDD);「加入当天」走一期已有的 `onAddToDay(dayId, place, false)` → `addStopFromAmapPoi`,**不新增写库逻辑**。Google 组件一行不动。

**Tech Stack:** React 19 + 高德 JS API 2.0(`AMap.AutoComplete`、`AMap.PlaceSearch.searchNearBy`、`map.on('click')`)。测试:vitest(纯函数),SDK/DOM 浏览器手测。

**对应 spec:** `docs/amap-provider-phase2-spec.md`

---

## 文件结构总览

| 文件 | 动作 | 职责 |
|---|---|---|
| `src/utils/amapPoi.js` | 建 | `amapTipToPlace` / `amapPoiToPlace` 纯函数:AMap 返回 → 统一 place 对象 |
| `src/utils/amapPoi.test.js` | 建 | 上述纯函数单测 |
| `src/utils/amapLoader.js` | 改 | `plugin=` 追加 `AMap.AutoComplete` |
| `src/components/itinerary/AmapPlaceCard.jsx` | 建 | 轻量信息卡(名称+地址+加入当天+关闭) |
| `src/components/itinerary/AmapSearchBox.jsx` | 建 | 高德搜索框(AutoComplete 补全) |
| `src/components/itinerary/AmapMapPanel.jsx` | 改 | selectedPlace 状态 + map click 监听 + 渲染上面两个 |

统一 place 对象形状(喂 `addStopFromAmapPoi`,字段对齐一期):
```
{ name: string, vicinity: string(地址), amap_poi_id: string, _gcj: {lat, lng}(GCJ-02), types: string[] }
```

---

## Task 1: POI 映射纯函数(TDD)

**Files:**
- Create: `src/utils/amapPoi.js`
- Test: `src/utils/amapPoi.test.js`

- [ ] **Step 1: 写失败测试**

`src/utils/amapPoi.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { amapTipToPlace, amapPoiToPlace } from './amapPoi';

describe('amapTipToPlace', () => {
  it('maps an AutoComplete tip with location to a place', () => {
    const tip = { name: '故宫博物院', id: 'B000A8UIN8', district: '北京市东城区', address: '景山前街4号', location: { lng: 116.397, lat: 39.918 } };
    expect(amapTipToPlace(tip)).toEqual({
      name: '故宫博物院', vicinity: '北京市东城区', amap_poi_id: 'B000A8UIN8',
      _gcj: { lat: 39.918, lng: 116.397 }, types: [],
    });
  });
  it('returns null for a tip without location (模糊词条)', () => {
    expect(amapTipToPlace({ name: '故宫', location: '' })).toBeNull();
    expect(amapTipToPlace({ name: '故宫' })).toBeNull();
  });
});

describe('amapPoiToPlace', () => {
  it('maps a PlaceSearch poi to a place', () => {
    const poi = { name: '耙牛肉店', id: 'B0M6RO2XMZ', address: '王府井大街1号', type: '餐饮服务;中餐厅', location: { lng: 116.405, lat: 39.905 } };
    expect(amapPoiToPlace(poi)).toEqual({
      name: '耙牛肉店', vicinity: '王府井大街1号', amap_poi_id: 'B0M6RO2XMZ',
      _gcj: { lat: 39.905, lng: 116.405 }, types: ['餐饮服务', '中餐厅'],
    });
  });
  it('returns null for a poi without location', () => {
    expect(amapPoiToPlace({ name: 'x' })).toBeNull();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/utils/amapPoi.test.js`
Expected: FAIL — "Failed to resolve import './amapPoi'"。

- [ ] **Step 3: 实现**

`src/utils/amapPoi.js`:

```js
// AMap AutoComplete tip / PlaceSearch poi → 统一 place 对象(喂给 addStopFromAmapPoi)。
// place: { name, vicinity(地址), amap_poi_id, _gcj:{lat,lng}(GCJ-02), types[] }
export function amapTipToPlace(tip) {
  if (!tip || !tip.location || tip.location.lng == null) return null;
  return {
    name: tip.name || '',
    vicinity: tip.district || (typeof tip.address === 'string' ? tip.address : '') || '',
    amap_poi_id: tip.id || '',
    _gcj: { lat: Number(tip.location.lat), lng: Number(tip.location.lng) },
    types: [],
  };
}

export function amapPoiToPlace(poi) {
  if (!poi || !poi.location || poi.location.lng == null) return null;
  return {
    name: poi.name || '',
    vicinity: typeof poi.address === 'string' ? poi.address : '',
    amap_poi_id: poi.id || '',
    _gcj: { lat: Number(poi.location.lat), lng: Number(poi.location.lng) },
    types: poi.type ? String(poi.type).split(';') : [],
  };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/utils/amapPoi.test.js`
Expected: PASS(4 passed)。

- [ ] **Step 5: Commit**

```bash
git add src/utils/amapPoi.js src/utils/amapPoi.test.js
git commit -m "feat(amap): tip/poi -> place mapping helpers + tests"
```

---

## Task 2: amapLoader 加载 AutoComplete 插件

**Files:**
- Modify: `src/utils/amapLoader.js`

- [ ] **Step 1: 改 plugin 参数**

把:

```js
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.PlaceSearch`;
```

改为:

```js
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.PlaceSearch,AMap.AutoComplete`;
```

- [ ] **Step 2: 校验 + 构建**

Run: `npx eslint src/utils/amapLoader.js && npm run build`
Expected: 0 error,构建成功。

- [ ] **Step 3: Commit**

```bash
git add src/utils/amapLoader.js
git commit -m "feat(amap): load AMap.AutoComplete plugin"
```

---

## Task 3: AmapPlaceCard 信息卡

底部浮层卡:名称 + 地址 + 「加入当天」+ 关闭。`canAdd` 为 false(非 isDayMode / 无 dayId)时按钮禁用并提示。

**Files:**
- Create: `src/components/itinerary/AmapPlaceCard.jsx`

- [ ] **Step 1: 实现**

`src/components/itinerary/AmapPlaceCard.jsx`:

```jsx
import { useState } from 'react';

// 轻量信息卡:搜索选中 / 点选 POI 共用。place = { name, vicinity, amap_poi_id, _gcj, types }
export default function AmapPlaceCard({ place, canAdd = true, onAdd, onClose }) {
  const [adding, setAdding] = useState(false);
  if (!place) return null;

  const handleAdd = async () => {
    if (!canAdd || adding) return;
    setAdding(true);
    try { await onAdd?.(place); }
    finally { setAdding(false); }
  };

  return (
    <div
      style={{
        position: 'absolute', bottom: 0, left: 0, right: 0, zIndex: 210,
        background: 'var(--md-sys-color-surface)',
        borderTop: '1px solid var(--md-sys-color-outline)',
        borderRadius: '20px 20px 0 0',
        boxShadow: '0 -8px 40px rgba(0,0,0,0.6)',
        padding: '1rem 1.25rem 1.25rem',
        animation: 'slideUp 0.25s ease',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <span className="material-symbols-outlined" style={{ fontSize: '22px', color: 'var(--md-sys-color-primary)', marginTop: '2px' }}>place</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: '1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {place.name}
          </div>
          {place.vicinity && (
            <div style={{ fontSize: '0.8rem', color: 'var(--st-color-text-muted)', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {place.vicinity}
            </div>
          )}
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--st-color-text-muted)', padding: '2px' }}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>close</span>
        </button>
      </div>

      <button
        onClick={handleAdd}
        disabled={!canAdd || adding}
        style={{
          width: '100%', marginTop: '0.9rem', padding: '11px', borderRadius: '12px', border: 'none',
          background: canAdd ? 'var(--md-sys-color-primary)' : 'rgba(255,255,255,0.07)',
          color: canAdd ? 'white' : 'var(--st-color-text-muted)',
          fontSize: '0.9rem', fontWeight: 700, cursor: canAdd ? 'pointer' : 'default',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
        }}
      >
        {adding ? (
          <span className="material-symbols-outlined" style={{ fontSize: '16px', animation: 'spin 1s linear infinite' }}>progress_activity</span>
        ) : (
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>add</span>
        )}
        {canAdd ? '加入当天' : '请先进入某一天'}
      </button>
    </div>
  );
}
```

- [ ] **Step 2: 校验**

Run: `npx eslint src/components/itinerary/AmapPlaceCard.jsx`
Expected: 0 error。

- [ ] **Step 3: Commit**

```bash
git add src/components/itinerary/AmapPlaceCard.jsx
git commit -m "feat(amap): AmapPlaceCard lightweight info card"
```

---

## Task 4: AmapSearchBox 搜索框

对标 `MapSearchBox` 布局(顶部浮层 input + 下拉),但用 `AMap.AutoComplete`,无分类按钮。选中提示 → `onSelect(place)`。

**Files:**
- Create: `src/components/itinerary/AmapSearchBox.jsx`

- [ ] **Step 1: 实现**

`src/components/itinerary/AmapSearchBox.jsx`:

```jsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { useI18n } from '../../context/I18nContext';
import { amapTipToPlace } from '../../utils/amapPoi';

// 高德搜索框:AutoComplete 补全;选中(有坐标的)词条 → onSelect(place)
export default function AmapSearchBox({ onSelect, leftOffset = 15 }) {
  const { t } = useI18n();
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const acRef = useRef(null);
  const [inputValue, setInputValue] = useState('');
  const [tips, setTips] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.AMap && !acRef.current) {
      acRef.current = new window.AMap.AutoComplete({ city: '全国' });
    }
  }, []);

  const runSearch = useCallback((value) => {
    const ac = acRef.current;
    if (!ac) return;
    ac.search(value, (status, result) => {
      if (status === 'complete' && result.tips) {
        // 只保留有坐标的 POI 词条
        setTips(result.tips.filter((tp) => tp.location && tp.location.lng != null));
      } else {
        setTips([]);
      }
    });
  }, []);

  const handleChange = useCallback((value) => {
    setInputValue(value);
    setOpen(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!value.trim()) { setTips([]); return; }
    debounceRef.current = setTimeout(() => runSearch(value.trim()), 220);
  }, [runSearch]);

  const handlePick = useCallback((tip) => {
    const place = amapTipToPlace(tip);
    if (!place) return;
    setInputValue(tip.name || '');
    setTips([]);
    setOpen(false);
    onSelect?.(place);
  }, [onSelect]);

  useEffect(() => {
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current); }, []);

  const bg = 'rgba(13,17,27,.85)';
  const textColor = '#fff';
  const muted = 'rgba(255,255,255,.5)';
  const divider = 'rgba(255,255,255,.08)';
  const shadow = '0 4px 20px rgba(0,0,0,.5)';

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute', top: '12px', left: leftOffset,
        width: `calc(100% - ${leftOffset + 100}px)`, maxWidth: '400px',
        zIndex: 120, display: 'flex', flexDirection: 'column', gap: '8px', pointerEvents: 'auto',
      }}
    >
      <div style={{ position: 'relative' }}>
        <input
          type="text"
          placeholder={t('map.search_placeholder') || '搜索地点…'}
          value={inputValue}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={() => setOpen(true)}
          style={{
            width: '100%', padding: '10px 38px 10px 36px',
            background: bg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: 'none', borderRadius: '12px', color: textColor, fontSize: '14px', outline: 'none', boxShadow: shadow,
          }}
        />
        <span className="material-symbols-outlined" style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: muted, fontSize: '18px' }}>search</span>
        {inputValue && (
          <button
            onMouseDown={(e) => { e.preventDefault(); setInputValue(''); setTips([]); setOpen(true); }}
            style={{ position: 'absolute', right: '8px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px', display: 'flex', color: muted }}
          >
            <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>close</span>
          </button>
        )}
      </div>

      {open && tips.length > 0 && (
        <div style={{ background: bg, backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', borderRadius: '12px', overflow: 'hidden', boxShadow: shadow, maxHeight: '50vh', overflowY: 'auto' }}>
          {tips.map((tip, idx) => (
            <button
              key={`${tip.id || tip.name}-${idx}`}
              onClick={() => handlePick(tip)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '2px', width: '100%',
                padding: '11px 14px', background: 'none', border: 'none',
                borderBottom: idx < tips.length - 1 ? `1px solid ${divider}` : 'none',
                color: textColor, fontSize: '14px', cursor: 'pointer', textAlign: 'left',
              }}
            >
              <span style={{ fontWeight: 600 }}>{tip.name}</span>
              {tip.district && <span style={{ fontSize: '12px', color: muted }}>{tip.district}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 校验**

Run: `npx eslint src/components/itinerary/AmapSearchBox.jsx`
Expected: 0 error。

- [ ] **Step 3: Commit**

```bash
git add src/components/itinerary/AmapSearchBox.jsx
git commit -m "feat(amap): AmapSearchBox keyword autocomplete"
```

---

## Task 5: AmapMapPanel 集成(搜索框 + 点选 + 卡片)

**Files:**
- Modify: `src/components/itinerary/AmapMapPanel.jsx`

- [ ] **Step 1: 顶部 import**

在现有 import 后加:

```js
import AmapSearchBox from './AmapSearchBox';
import AmapPlaceCard from './AmapPlaceCard';
import { amapPoiToPlace } from '../../utils/amapPoi';
```

- [ ] **Step 2: 加 selectedPlace 状态**

在 `const [showCheckinPanel, setShowCheckinPanel] = useState(false);` 之后加:

```js
  const [selectedPlace, setSelectedPlace] = useState(null); // 搜索/点选选中的地点
```

- [ ] **Step 3: 加 map click 监听(点选 → searchNearBy → 卡片)**

在 isDayMode 自动定位 effect 之后、`focusStop` 之前,新增:

```js
  // 点地图 POI → searchNearBy 取最近 POI → 弹卡片(点空白不弹)
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapInited || !map) return;
    const onMapClick = (e) => {
      const lng = e.lnglat?.getLng ? e.lnglat.getLng() : e.lnglat?.lng;
      const lat = e.lnglat?.getLat ? e.lnglat.getLat() : e.lnglat?.lat;
      if (lng == null || lat == null) return;
      const ps = new window.AMap.PlaceSearch({ pageSize: 1 });
      ps.searchNearBy('', [lng, lat], 50, (status, result) => {
        const poi = status === 'complete' && result.poiList?.pois?.[0];
        const place = poi && amapPoiToPlace(poi);
        if (place) setSelectedPlace(place);
      });
    };
    map.on('click', onMapClick);
    return () => map.off('click', onMapClick);
  }, [mapInited]);
```

- [ ] **Step 4: 渲染搜索框 + 卡片**

在 `return` 的 `<div className="map-placeholder" ...>` 内,`{!mapReady && (...)}` loading 块之后,加:

```jsx
        {mapInited && (
          <AmapSearchBox
            leftOffset={isDayMode ? 56 : 15}
            onSelect={(place) => {
              const m = mapInstanceRef.current;
              if (m && place._gcj) m.setZoomAndCenter(16, [place._gcj.lng, place._gcj.lat]);
              setSelectedPlace(place);
            }}
          />
        )}

        {selectedPlace && (
          <AmapPlaceCard
            place={selectedPlace}
            canAdd={!!dayId}
            onAdd={async (place) => {
              if (dayId) await onAddToDay?.(dayId, place, false); // 规划加入,非实时打卡
              setSelectedPlace(null);
            }}
            onClose={() => setSelectedPlace(null)}
          />
        )}
```

- [ ] **Step 5: 校验 + 构建**

Run: `npx eslint src/components/itinerary/AmapMapPanel.jsx && npm run build`
Expected: 0 error,构建成功。

- [ ] **Step 6: Commit**

```bash
git add src/components/itinerary/AmapMapPanel.jsx
git commit -m "feat(amap): wire search box + map-tap place card into AmapMapPanel"
```

---

## Task 6: 部署 + 验收

**Files:** 无(部署 + 浏览器手测)

- [ ] **Step 1: 全量单测**

Run: `npm run test`
Expected: 全绿(含一期 + amapPoi)。

- [ ] **Step 2: 构建 + 部署到 :8451**

```bash
npm run build:pb-vm
tar -czf dist.tgz -C dist .
scp dist.tgz dashboard-server:/home/dev/smat-trip/dist.tgz
ssh dashboard-server 'cd /home/dev/smat-trip && TS=$(date +%s) && mkdir dist.new && tar xzf dist.tgz -C dist.new && mv dist dist.bak.$TS && mv dist.new dist && rm -f dist.tgz && sudo systemctl restart smat-trip && systemctl is-active smat-trip'
```
Expected: `active`(用 mv 换目录,不用 rm -rf,避免 gate)。

- [ ] **Step 3: 线上验收(高德模式 + DevTools Sensors 伪造国内 GPS;`?v=N` 破缓存)**

- [ ] 搜索框出现;输入中文关键字(如「故宫」)出补全提示
- [ ] 选中提示 → 地图飞过去 → 弹信息卡(名称+地址)→「加入当天」→ stop 写入
- [ ] 点地图上某 POI → 弹信息卡(最近 POI)→ 可加入;点空白不弹
- [ ] PB 核验:新 `locations.lat/lng` 为 WGS-84、`amap_poi_id` 已填
- [ ] 同一 POI 重复加不产生重复 stop(一期去重守卫)
- [ ] 非 isDayMode:卡片「加入当天」禁用、显示"请先进入某一天",不报错
- [ ] Google 模式搜索框/点选/InfoPanel 行为与改前一致(回归)

- [ ] **Step 4: 收尾**

按 `superpowers:finishing-a-development-branch` 决定合并 `feature/amap-phase2` → 部署分支 + 推 GitHub。

---

## 自检(spec 覆盖)

- 搜索框(AMap.AutoComplete)→ Task 4 ✅
- 地图点选(searchNearBy 50m 取最近 POI)→ Task 5 Step 3 ✅
- 轻量信息卡(名称+地址+加入当天)→ Task 3 ✅
- 加点复用 addStopFromAmapPoi(useNow=false)→ Task 5 Step 4 ✅
- AutoComplete 插件加载 → Task 2 ✅
- 无坐标 tip 跳过 → Task 1(amapTipToPlace 返回 null)+ Task 4(filter)✅
- 砍分类快搜 → 未实现(YAGNI)✅
- 坐标 GCJ-02 展示、WGS-84 入库 → 复用一期 addStopFromAmapPoi ✅
- 非 isDayMode 加点禁用 → Task 3(canAdd)+ Task 5(canAdd={!!dayId})✅
- Google 零回归 → 全部改动在 Amap* 组件 + amapLoader + amapPoi,MapPanel/MapSearchBox/MapInfoPanel 未动 ✅

## 已知风险 / 待执行时确认

- `AMap.AutoComplete` 的 `tip.location` / `tip.address` 字段类型(address 偶尔是数组)—— Task 1 已按"有坐标才可选 + address 仅取字符串"处理。
- `searchNearBy` 50m 取最近 POI 的体验需手测,必要时放宽到 100m(改 Task 5 Step 3 的半径)。
- map click 监听是本期给 AmapMapPanel 新增的(一期没有),注意 cleanup(`map.off`)。
- 三期:路线绘制,不在本期。
