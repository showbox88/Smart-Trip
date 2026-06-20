# 高德地图服务商开关(Provider Toggle)实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Smart Trip 设置里加一个手动开关,把地图服务商从 Google 切到高德(AMap),开启后底图与周边打卡走高德,使国内可用。

**Architecture:** 引入轻量 provider 抽象(localStorage 按设备)。新建独立 `AmapMapPanel.jsx`(与现有 `MapPanel.jsx` 同 props/ref 接口),父层按 provider 二选一渲染 —— Google 代码一行不动,零回归。坐标统一:DB 永远存 WGS-84,高德 GCJ-02 仅在边界转换。周边打卡用高德 JS SDK `PlaceSearch`,加地点走一条不依赖 Google 详情的新路径。

**Tech Stack:** React 19 + Vite 8 + 高德 JS API 2.0 (`AMap.Map`/`AMap.Marker`/`AMap.PlaceSearch`) + PocketBase 写入(沿用 `pbWrites`)。测试:vitest(纯函数单测);SDK/DOM 部分浏览器手测。

**对应 spec:** `docs/amap-provider-toggle-spec.md`

**前置(用户负责):** 在高德开放平台申请 **Web端(JS API)Key + 安全密钥 jscode**(免费)。无 key 时高德模式不可用,但 Google 模式与单测不受影响 —— 计划可先全程开发,部署前补 key。

---

## 文件结构总览

| 文件 | 动作 | 职责 |
|---|---|---|
| `package.json` | 改 | 加 vitest devDep + `test` script |
| `src/utils/coord.js` | 建 | WGS-84 ↔ GCJ-02 纯函数 |
| `src/utils/coord.test.js` | 建 | coord 单测(已知坐标点) |
| `src/providers/mapProvider.js` | 建 | 读/写当前 provider(localStorage),`getMapProvider`/`setMapProvider`/`isAmap` |
| `src/providers/mapProvider.test.js` | 建 | provider 选择单测 |
| `src/utils/amapCategories.js` | 建 | Smart Trip 分类 → 高德 POI typecode 映射 |
| `src/utils/amapCategories.test.js` | 建 | 映射单测 |
| `src/utils/amapLoader.js` | 建 | 动态加载高德 JS API 2.0(镜像 googleMapsLoader) |
| `src/main.jsx` | 改 | 按 provider 二选一加载 SDK |
| `src/components/layout/Navbar.jsx` | 改 | 用户下拉加「地图服务商」开关项(改后确认+重载) |
| `.env.pb-vm` / `.env.example` | 改 | 加 `VITE_AMAP_KEY` / `VITE_AMAP_JSCODE` |
| `src/hooks/trip-editor/useAmapPlaceAdd.js` | 建 | 从高德 POI 直接建 stop(不依赖 Google 详情) |
| `src/components/itinerary/NearbyCheckinPanel.jsx` | 改 | 高德分支:`PlaceSearch.searchNearBy`,回调带 POI 对象 |
| `src/components/itinerary/AmapMapPanel.jsx` | 建 | 高德底图 + stop 标记 + 我的位置 + 打卡面板 |
| `src/components/itinerary/MapPanel.jsx` | 不动 | Google 路径保持原样 |
| 父层(`MapPage.jsx` / `ItineraryView.jsx` / `MobileItineraryView.jsx`) | 改 | provider=amap 时渲染 AmapMapPanel |
| `deploy/pb-vm/server.js`(VM `server.js` 源) | 改 | `ALLOWED_HOSTS` + CSP 加高德域名 |

---

## Phase A — 基础纯逻辑(TDD)

### Task A1: 引入 vitest

**Files:**
- Modify: `package.json`

- [ ] **Step 1: 加 devDependency 与 script**

`package.json` 的 `scripts` 加:

```json
    "test": "vitest run",
    "test:watch": "vitest"
```

`devDependencies` 加:

```json
    "vitest": "^2.1.8"
```

- [ ] **Step 2: 安装**

Run: `npm install`
Expected: 安装成功,`node_modules/.bin/vitest` 存在。

- [ ] **Step 3: 冒烟**

Run: `npx vitest run --reporter=dot`
Expected: "No test files found" 或 0 失败。

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add vitest for unit tests"
```

---

### Task A2: 坐标转换 coord.js(核心)

GCJ-02 是 WGS-84 经国测局加密偏移的结果。用成熟公开算法(eviltransform / coordtransform 同款)。中国境外直接返回原值。

**Files:**
- Create: `src/utils/coord.js`
- Test: `src/utils/coord.test.js`

- [ ] **Step 1: 写失败测试**

`src/utils/coord.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { wgs84ToGcj02, gcj02ToWgs84, outOfChina } from './coord';

describe('coord', () => {
  // 天安门 WGS-84 ≈ (39.90750, 116.39125) → GCJ-02 ≈ (39.90874, 116.39750)
  it('wgs84ToGcj02 shifts a Beijing point by ~100-700m', () => {
    const { lat, lng } = wgs84ToGcj02(39.90750, 116.39125);
    expect(lat).toBeCloseTo(39.90874, 3);
    expect(lng).toBeCloseTo(116.39750, 3);
  });

  it('gcj02ToWgs84 is the approximate inverse', () => {
    const g = wgs84ToGcj02(31.2304, 121.4737);   // 上海
    const w = gcj02ToWgs84(g.lat, g.lng);
    expect(w.lat).toBeCloseTo(31.2304, 4);
    expect(w.lng).toBeCloseTo(121.4737, 4);
  });

  it('outOfChina returns true for non-China points (no shift)', () => {
    expect(outOfChina(40.7128, -74.0060)).toBe(true);   // 纽约
    const same = wgs84ToGcj02(40.7128, -74.0060);
    expect(same.lat).toBe(40.7128);
    expect(same.lng).toBe(-74.0060);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/utils/coord.test.js`
Expected: FAIL — "Failed to resolve import './coord'"。

- [ ] **Step 3: 实现 coord.js**

`src/utils/coord.js`:

```js
// WGS-84 ↔ GCJ-02 转换(国测局加密偏移)。算法为公开通用实现。
// 中国境外直接返回原坐标(GCJ-02 仅在中国大陆生效)。
const PI = Math.PI;
const A = 6378245.0;                  // 长半轴
const EE = 0.00669342162296594323;    // 偏心率平方

export function outOfChina(lat, lng) {
  return !(lng > 73.66 && lng < 135.05 && lat > 3.86 && lat < 53.55);
}

function transformLat(x, y) {
  let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(y * PI) + 40.0 * Math.sin(y / 3.0 * PI)) * 2.0 / 3.0;
  ret += (160.0 * Math.sin(y / 12.0 * PI) + 320 * Math.sin(y * PI / 30.0)) * 2.0 / 3.0;
  return ret;
}

function transformLng(x, y) {
  let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
  ret += (20.0 * Math.sin(6.0 * x * PI) + 20.0 * Math.sin(2.0 * x * PI)) * 2.0 / 3.0;
  ret += (20.0 * Math.sin(x * PI) + 40.0 * Math.sin(x / 3.0 * PI)) * 2.0 / 3.0;
  ret += (150.0 * Math.sin(x / 12.0 * PI) + 300.0 * Math.sin(x / 30.0 * PI)) * 2.0 / 3.0;
  return ret;
}

function delta(lat, lng) {
  let dLat = transformLat(lng - 105.0, lat - 35.0);
  let dLng = transformLng(lng - 105.0, lat - 35.0);
  const radLat = lat / 180.0 * PI;
  let magic = Math.sin(radLat);
  magic = 1 - EE * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / ((A * (1 - EE)) / (magic * sqrtMagic) * PI);
  dLng = (dLng * 180.0) / (A / sqrtMagic * Math.cos(radLat) * PI);
  return { dLat, dLng };
}

export function wgs84ToGcj02(lat, lng) {
  if (outOfChina(lat, lng)) return { lat, lng };
  const { dLat, dLng } = delta(lat, lng);
  return { lat: lat + dLat, lng: lng + dLng };
}

// 一次反向偏移近似(米级精度,足够展示/存储)
export function gcj02ToWgs84(lat, lng) {
  if (outOfChina(lat, lng)) return { lat, lng };
  const { dLat, dLng } = delta(lat, lng);
  return { lat: lat - dLat, lng: lng - dLng };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/utils/coord.test.js`
Expected: PASS(3 passed)。

- [ ] **Step 5: Commit**

```bash
git add src/utils/coord.js src/utils/coord.test.js
git commit -m "feat(coord): WGS-84 <-> GCJ-02 conversion + tests"
```

---

### Task A3: provider 选择 mapProvider.js

**Files:**
- Create: `src/providers/mapProvider.js`
- Test: `src/providers/mapProvider.test.js`

- [ ] **Step 1: 写失败测试**

`src/providers/mapProvider.test.js`(首行声明 jsdom 环境):

```js
// @vitest-environment jsdom
import { describe, it, expect, beforeEach } from 'vitest';
import { getMapProvider, setMapProvider, isAmap, MAP_PROVIDER_KEY } from './mapProvider';

beforeEach(() => { localStorage.clear(); });

describe('mapProvider', () => {
  it('defaults to google when nothing stored', () => {
    expect(getMapProvider()).toBe('google');
    expect(isAmap()).toBe(false);
  });

  it('setMapProvider persists and getMapProvider reads it', () => {
    setMapProvider('amap');
    expect(localStorage.getItem(MAP_PROVIDER_KEY)).toBe('amap');
    expect(getMapProvider()).toBe('amap');
    expect(isAmap()).toBe(true);
  });

  it('ignores invalid stored values, falls back to google', () => {
    localStorage.setItem(MAP_PROVIDER_KEY, 'bing');
    expect(getMapProvider()).toBe('google');
  });
});
```

- [ ] **Step 2: 跑测试确认失败 / 补 jsdom**

Run: `npx vitest run src/providers/mapProvider.test.js`
Expected: FAIL —— import 未解析;若报 jsdom 缺失则先 `npm i -D jsdom` 再跑,确认失败原因仅剩 import 未解析。

- [ ] **Step 3: 实现 mapProvider.js**

`src/providers/mapProvider.js`:

```js
// 地图服务商偏好:按设备存 localStorage,不进 PB。
export const MAP_PROVIDER_KEY = 'st.mapProvider';
const VALID = ['google', 'amap'];

export function getMapProvider() {
  try {
    const v = localStorage.getItem(MAP_PROVIDER_KEY);
    return VALID.includes(v) ? v : 'google';
  } catch {
    return 'google';
  }
}

export function setMapProvider(provider) {
  const v = VALID.includes(provider) ? provider : 'google';
  try { localStorage.setItem(MAP_PROVIDER_KEY, v); } catch { /* ignore */ }
  return v;
}

export function isAmap() {
  return getMapProvider() === 'amap';
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/providers/mapProvider.test.js`
Expected: PASS(3 passed)。

- [ ] **Step 5: Commit**

```bash
git add src/providers/mapProvider.js src/providers/mapProvider.test.js package.json package-lock.json
git commit -m "feat(providers): map provider preference (localStorage) + tests"
```

---

### Task A4: 分类 → 高德 typecode 映射

参考 `NearbyCheckinPanel` 现有 6 类(all/dining/cafe/attractions/shopping/lodging)。高德 POI typecode:餐饮 050000、咖啡厅 050500、风景名胜 110000、购物 060000、住宿 100000。`all` 不传 type。

**Files:**
- Create: `src/utils/amapCategories.js`
- Test: `src/utils/amapCategories.test.js`

- [ ] **Step 1: 写失败测试**

`src/utils/amapCategories.test.js`:

```js
import { describe, it, expect } from 'vitest';
import { amapTypeForCategory } from './amapCategories';

describe('amapTypeForCategory', () => {
  it('maps known categories to AMap typecodes', () => {
    expect(amapTypeForCategory('dining')).toBe('050000');
    expect(amapTypeForCategory('cafe')).toBe('050500');
    expect(amapTypeForCategory('attractions')).toBe('110000');
    expect(amapTypeForCategory('shopping')).toBe('060000');
    expect(amapTypeForCategory('lodging')).toBe('100000');
  });
  it('returns empty string for all/unknown (no type filter)', () => {
    expect(amapTypeForCategory('all')).toBe('');
    expect(amapTypeForCategory('whatever')).toBe('');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run src/utils/amapCategories.test.js`
Expected: FAIL — import 未解析。

- [ ] **Step 3: 实现**

`src/utils/amapCategories.js`:

```js
// Smart Trip 分类 id → 高德 POI typecode(大类)。空串表示不按类型过滤。
const MAP = {
  dining: '050000',
  cafe: '050500',
  attractions: '110000',
  shopping: '060000',
  lodging: '100000',
};
export function amapTypeForCategory(categoryId) {
  return MAP[categoryId] || '';
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run src/utils/amapCategories.test.js`
Expected: PASS(2 passed)。

- [ ] **Step 5: Commit**

```bash
git add src/utils/amapCategories.js src/utils/amapCategories.test.js
git commit -m "feat(amap): category -> AMap typecode mapping + tests"
```

---

## Phase B — SDK 加载与开关接线

### Task B1: amapLoader.js

镜像 `googleMapsLoader.js`。高德 JS API 2.0 需 `securityJsCode`(安全密钥)在 `window._AMapSecurityConfig` 里先设,再插 script。

**Files:**
- Create: `src/utils/amapLoader.js`

- [ ] **Step 1: 实现**

`src/utils/amapLoader.js`:

```js
// 动态加载高德 JS API 2.0。成功后设 window.amapReady 并触发 _dispatchAmapReady。
export function loadAmap() {
  const key = import.meta.env.VITE_AMAP_KEY;
  const jscode = import.meta.env.VITE_AMAP_JSCODE;
  if (!key || key.includes('VITE_AMAP_KEY')) {
    console.error('VITE_AMAP_KEY 缺失或未替换,无法加载高德地图。');
    return;
  }
  if (window.AMap) { window.amapReady = true; return; }

  // 安全密钥必须在加载 SDK 之前设置
  window._AMapSecurityConfig = { securityJsCode: jscode || '' };

  const script = document.createElement('script');
  // 一次性带上本期要用的插件:PlaceSearch
  script.src = `https://webapi.amap.com/maps?v=2.0&key=${key}&plugin=AMap.PlaceSearch`;
  script.async = true;
  script.onload = () => {
    window.amapReady = true;
    if (window._dispatchAmapReady) window._dispatchAmapReady();
  };
  script.onerror = () => console.error('高德地图 SDK 加载失败(国内网络/域名白名单/key 限制?)');
  document.head.appendChild(script);
}
```

- [ ] **Step 2: 校验语法**

Run: `npx eslint src/utils/amapLoader.js`
Expected: 0 error(可有既有风格 warning)。

- [ ] **Step 3: Commit**

```bash
git add src/utils/amapLoader.js
git commit -m "feat(amap): JS API 2.0 dynamic loader"
```

---

### Task B2: main.jsx 按 provider 加载

**Files:**
- Modify: `src/main.jsx`

- [ ] **Step 1: 改 bootstrap**

把:

```js
import { loadGoogleMaps } from './utils/googleMapsLoader';

// Initialize Google Maps
loadGoogleMaps();
```

替换为:

```js
import { loadGoogleMaps } from './utils/googleMapsLoader';
import { loadAmap } from './utils/amapLoader';
import { isAmap } from './providers/mapProvider';

// 按设备偏好二选一加载地图 SDK(不同时加载两套)
if (isAmap()) {
  loadAmap();
} else {
  loadGoogleMaps();
}
```

- [ ] **Step 2: 校验**

Run: `npx eslint src/main.jsx`
Expected: 0 error。

- [ ] **Step 3: 构建冒烟(确保未破坏 Google 路径)**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 4: Commit**

```bash
git add src/main.jsx
git commit -m "feat: load map SDK by provider preference at bootstrap"
```

---

### Task B3: Navbar 加「地图服务商」开关

放在用户下拉里,模式同 语言/主题。改后弹原生 confirm 提示重载生效。

**Files:**
- Modify: `src/components/layout/Navbar.jsx`

- [ ] **Step 1: 顶部引入**

```js
import { getMapProvider, setMapProvider } from '../../providers/mapProvider';
```

- [ ] **Step 2: 加切换处理(组件函数体内,与其它 handler 同级)**

```js
  const switchMapProvider = (next) => {
    if (getMapProvider() === next) { setDropdownOpen(false); return; }
    setMapProvider(next);
    // 切换需重载以加载对应 SDK
    if (window.confirm(next === 'amap'
      ? '切换到高德地图?页面将刷新。' : '切换回 Google 地图?页面将刷新。')) {
      window.location.reload();
    }
  };
```

- [ ] **Step 3: 在用户下拉里(主题子菜单之后、Admin 之前)插入开关项**

在 `themeMenuOpen` 块结束 `)}` 之后、Admin 按钮 `<button ... navigate('/admin')` 之前插入:

```jsx
                  {/* 地图服务商 */}
                  <div style={{ padding: '6px 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--md-sys-color-on-surface)' }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '16px', color: 'var(--st-color-text-muted)' }}>map</span>
                      地图服务商
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', padding: '0 12px 8px' }}>
                    {['google', 'amap'].map((p) => (
                      <button
                        key={p}
                        onClick={() => switchMapProvider(p)}
                        style={{
                          flex: 1, padding: '6px 8px', borderRadius: '8px', cursor: 'pointer',
                          border: '1px solid rgba(255,255,255,0.12)',
                          background: getMapProvider() === p ? 'var(--md-sys-color-primary)' : 'transparent',
                          color: getMapProvider() === p ? 'white' : 'var(--md-sys-color-on-surface)',
                          fontSize: '0.8rem', fontWeight: 600,
                        }}
                      >
                        {p === 'google' ? 'Google' : '高德'}
                      </button>
                    ))}
                  </div>
```

- [ ] **Step 4: 校验 + 构建**

Run: `npx eslint src/components/layout/Navbar.jsx && npm run build`
Expected: 0 error,构建成功。

- [ ] **Step 5: 浏览器手测(Google 模式)**

Run: `npm run dev`,打开用户下拉。
Expected: 出现「地图服务商」两个按钮,Google 高亮;点「高德」弹 confirm,取消则不变。

- [ ] **Step 6: Commit**

```bash
git add src/components/layout/Navbar.jsx
git commit -m "feat(navbar): map provider toggle (Google/AMap), reload on switch"
```

---

### Task B4: 构建 env 加高德 key

**Files:**
- Modify: `.env.pb-vm`, `.env.example`

- [ ] **Step 1: 追加变量(两文件都加)**

`.env.example` 与 `.env.pb-vm` 末尾追加:

```
# 高德 Web端(JS API)Key + 安全密钥(高德开放平台申请,免费)
VITE_AMAP_KEY=
VITE_AMAP_JSCODE=
```

`.env.pb-vm` 里填真实值(由用户提供);`.env.example` 留空。

- [ ] **Step 2: 确认 .env.pb-vm 不入库**

Run: `git check-ignore .env.pb-vm; git status --short`
Expected: `.env.pb-vm` 被忽略,`git status` 不显示其改动;仅 `.env.example` 进暂存。

- [ ] **Step 3: Commit(仅示例文件)**

```bash
git add .env.example
git commit -m "docs(env): document VITE_AMAP_KEY / VITE_AMAP_JSCODE"
```

---

## Phase C — 高德底图 + 周边打卡(浏览器手测)

> Phase C 多为 React + 高德 SDK 集成,无法纯单测;每个 Task 用 `npm run dev` 在高德模式下手测(需先在 dev `.env` 注入 key)。

### Task C1: AmapMapPanel.jsx — 高德底图 + stop 标记 + 我的位置

新建独立组件,props/ref 接口与 MapPanel 对齐(`onAddToDay, focusDayIds, isDayMode, dayId, existingPlaceIds` + ref `focusStop/focusAndOpen`)。本期渲染:底图、当前 trip 各 stop 简单标记(WGS-84→GCJ-02)、我的位置、自动 fitView;不做富 tooltip / 路线(留二三期)。

**Files:**
- Create: `src/components/itinerary/AmapMapPanel.jsx`

- [ ] **Step 1: 实现组件**

`src/components/itinerary/AmapMapPanel.jsx`:

```jsx
import { useEffect, useRef, useState, useMemo, useImperativeHandle, forwardRef, useCallback } from 'react';
import { useApp } from '../../context/AppContext';
import { useI18n } from '../../context/I18nContext';
import NearbyCheckinPanel from './NearbyCheckinPanel';
import { wgs84ToGcj02 } from '../../utils/coord';
import { isHotelStop } from '../../utils/stayHelpers';

const AmapMapPanel = forwardRef(function AmapMapPanel(
  { onAddToDay, focusDayIds = [], isDayMode = false, dayId = null, existingPlaceIds = [] }, ref
) {
  const { state } = useApp();
  const { t } = useI18n();
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);
  const locationMarkerRef = useRef(null);
  const [mapReady, setMapReady] = useState(!!window.amapReady);
  const [userLocation, setUserLocation] = useState(null); // WGS-84 {lat,lng}
  const [showCheckinPanel, setShowCheckinPanel] = useState(false);

  const activeTrip = useMemo(
    () => state.trips.find((tr) => tr.id === state.activeTripId),
    [state.trips, state.activeTripId]
  );

  // 等 SDK ready
  useEffect(() => {
    if (window.amapReady) { setMapReady(true); return; }
    window._dispatchAmapReady = () => setMapReady(true);
    const tick = () => { if (window.amapReady) setMapReady(true); else requestAnimationFrame(tick); };
    tick();
  }, []);

  // 建图
  useEffect(() => {
    if (!mapReady || !mapRef.current || mapInstanceRef.current) return;
    mapInstanceRef.current = new window.AMap.Map(mapRef.current, {
      zoom: 12,
      center: [139.6917, 35.6895], // 高德是 [lng,lat]
    });
  }, [mapReady]);

  // 画 stop 标记 + fitView
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeTrip) return;
    markersRef.current.forEach((m) => map.remove(m));
    markersRef.current = [];

    const daysToRender = activeTrip.days.filter((d) => (focusDayIds || []).includes(d.id));
    const markers = [];
    daysToRender.forEach((day) => {
      day.stops.forEach((stop) => {
        const isLoc = !stop.type || stop.type === 'location';
        if (!(isLoc || isHotelStop(stop)) || !stop.lat || !stop.lng) return;
        const g = wgs84ToGcj02(Number(stop.lat), Number(stop.lng));
        if (isNaN(g.lat) || isNaN(g.lng)) return;
        const marker = new window.AMap.Marker({
          position: [g.lng, g.lat],
          title: stop.location || '',
        });
        marker._stopId = stop.id;
        markers.push(marker);
      });
    });
    if (markers.length) {
      map.add(markers);
      map.setFitView(markers, false, [60, 60, 60, 60]);
    }
    markersRef.current = markers;
  }, [activeTrip, focusDayIds, mapReady]);

  // isDayMode:自动定位 + 打卡面板
  useEffect(() => {
    if (!isDayMode || !mapReady || !mapInstanceRef.current) return;
    (async () => {
      try {
        const { getCurrentPosition, isGeolocationAvailable } = await import('../../utils/geolocation.js');
        if (!isGeolocationAvailable()) return;
        const { latitude: lat, longitude: lng } = await getCurrentPosition({
          enableHighAccuracy: true, timeout: 10000, maximumAge: 0,
        });
        setUserLocation({ lat, lng });            // 存 WGS-84
        const g = wgs84ToGcj02(lat, lng);
        const map = mapInstanceRef.current;
        if (locationMarkerRef.current) map.remove(locationMarkerRef.current);
        locationMarkerRef.current = new window.AMap.Marker({
          position: [g.lng, g.lat], title: 'My Location',
        });
        map.add(locationMarkerRef.current);
        map.setZoomAndCenter(16, [g.lng, g.lat]);
        setShowCheckinPanel(true);
      } catch (e) {
        console.warn('[AmapMapPanel] autoLocate error:', e);
      }
    })();
  }, [isDayMode, mapReady]);

  // ref 接口(本期最小:focusStop 平移到该 stop)
  const focusStop = useCallback((stopId) => {
    const map = mapInstanceRef.current;
    const marker = markersRef.current.find((m) => m._stopId === stopId);
    if (map && marker) { map.setZoomAndCenter(16, marker.getPosition()); }
  }, []);
  useImperativeHandle(ref, () => ({ focusStop, focusAndOpen: focusStop }), [focusStop]);

  return (
    <section className="map-view">
      <div className="map-placeholder" style={{ position: 'relative', overflow: 'hidden', background: '#eaebd8', width: '100%', height: '100%' }}>
        <div ref={mapRef} style={{ width: '100%', height: '100%' }} />
        {!mapReady && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ textAlign: 'center', color: '#666', opacity: 0.6 }}>
              <span style={{ fontSize: '3rem' }}>🗺️</span>
              <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>{t('common.loading') || '加载高德地图…'}</p>
            </div>
          </div>
        )}
        {isDayMode && showCheckinPanel && userLocation && mapInstanceRef.current && (
          <NearbyCheckinPanel
            mapInstance={mapInstanceRef.current}
            userLocation={userLocation}
            existingPlaceIds={existingPlaceIds}
            onAddPlace={async (poi) => { if (dayId) await onAddToDay?.(dayId, poi, true); }}
            onClose={() => setShowCheckinPanel(false)}
          />
        )}
      </div>
    </section>
  );
});

export default AmapMapPanel;
```

> 注:`onAddPlace` 在高德模式传**整个 POI 对象**(非 placeId)。NearbyCheckinPanel(Task C2)与父层 onAddToDay(Task C3)都按"provider 决定 payload 类型"处理。

- [ ] **Step 2: 校验**

Run: `npx eslint src/components/itinerary/AmapMapPanel.jsx`
Expected: 0 error。

- [ ] **Step 3: Commit**

```bash
git add src/components/itinerary/AmapMapPanel.jsx
git commit -m "feat(amap): AmapMapPanel base map + stop markers + locate"
```

---

### Task C2: NearbyCheckinPanel 高德分支

让面板在高德模式用 `AMap.PlaceSearch.searchNearBy`。中心点:userLocation(WGS-84)→ GCJ-02。返回 POI 统一成现有渲染结构,带 `amap_poi_id` 与 GCJ-02 坐标;点「打卡」回调 `onAddPlace(poi)`。

**Files:**
- Modify: `src/components/itinerary/NearbyCheckinPanel.jsx`

- [ ] **Step 1: 顶部引入**

```js
import { isAmap } from '../../providers/mapProvider';
import { amapTypeForCategory } from '../../utils/amapCategories';
import { wgs84ToGcj02 } from '../../utils/coord';
```

- [ ] **Step 2: 在 `searchNearby` 里分流高德(Google 原逻辑保留在 else)**

把现有 `searchNearby` 回调开头改为:

```js
  const searchNearby = useCallback(async (categoryId) => {
    if (isAmap()) {
      if (!window.AMap || !userLocation) return;
      setLoading(true); setPlaces([]);
      try {
        const g = wgs84ToGcj02(userLocation.lat, userLocation.lng);
        const type = amapTypeForCategory(categoryId);
        const search = new window.AMap.PlaceSearch({ pageSize: 20, type });
        const results = await new Promise((resolve) => {
          search.searchNearBy('', [g.lng, g.lat], RADIUS, (status, result) => {
            if (status === 'complete' && result.poiList) resolve(result.poiList.pois || []);
            else resolve([]);
          });
        });
        setPlaces(results.map((p) => ({
          place_id: p.id,                 // 复用现有渲染字段名;高德里即 amap_poi_id
          amap_poi_id: p.id,
          name: p.name,
          vicinity: p.address || '',
          rating: undefined,
          geometry: { location: { lat: p.location.lat, lng: p.location.lng } }, // GCJ-02
          types: p.type ? p.type.split(';') : [],
          _gcj: { lat: p.location.lat, lng: p.location.lng },
        })));
      } catch (err) {
        console.warn('[NearbyCheckinPanel] amap searchNearBy failed:', err);
        setPlaces([]);
      } finally { setLoading(false); }
      return;
    }

    // ----- 以下为现有 Google 逻辑,保持不变 -----
    const mapsApi = globalThis.google;
    if (!mapInstance || !mapsApi || !userLocation) return;
    // ...(原有代码)
```

- [ ] **Step 3: 「打卡」按 provider 传不同 payload**

`handleAdd(placeId)` 改为 `handleAdd(place)`:

```js
  const handleAdd = useCallback(async (place) => {
    const id = place.place_id;
    if (!id || addingId) return;
    setAddingId(id);
    try {
      await onAddPlace?.(isAmap() ? place : id);
    } finally {
      setAddingId(null);
    }
  }, [onAddPlace, addingId]);
```

列表里 `onClick={() => !added && handleAdd(placeId)}` 改为 `onClick={() => !added && handleAdd(place)}`;`addingId === placeId` 比较保持(placeId 来自 `place.place_id`)。

- [ ] **Step 4: 校验 + 构建**

Run: `npx eslint src/components/itinerary/NearbyCheckinPanel.jsx && npm run build`
Expected: 0 error,构建成功。

- [ ] **Step 5: Commit**

```bash
git add src/components/itinerary/NearbyCheckinPanel.jsx
git commit -m "feat(amap): NearbyCheckinPanel AMap PlaceSearch branch"
```

---

### Task C3: 高德"加地点"路径 useAmapPlaceAdd + 父层 onAddToDay 分流

Google 路径 `useTripPlaceAdd.addStopFromPlace(dayId, placeId,...)` 强依赖 Google 详情。高德 payload 是 POI 对象,需一条直接建 stop 的路径:坐标 GCJ-02→WGS-84,写 `amap_poi_id`,复用现有 stop 创建/写库工具。

**Files:**
- Create: `src/hooks/trip-editor/useAmapPlaceAdd.js`
- Modify: 父层 `onAddToDay` 定义处(见 Step 3)

- [ ] **Step 1: 先读现有 addStopFromPlace 的"建 stop + 写库"尾段**

Run: `sed -n '60,200p' src/hooks/trip-editor/useTripPlaceAdd.js`
目的:照抄它构造 stop 对象的字段(location/lat/lng/category/categoryIcon/placeId 等)与调用的工具/提交函数,确保高德路径产出同形 stop。**用它实际用到的工具与字段名**(如 `cloneTrip/findDayById/insertStopIntoDay/sortStopsByTime/applyUpdate`),不要臆造。

- [ ] **Step 2: 实现 useAmapPlaceAdd.js(以 Step 1 抄到的工具与签名为准,下方为结构模板)**

`src/hooks/trip-editor/useAmapPlaceAdd.js`:

```js
import { useCallback } from 'react';
import { gcj02ToWgs84 } from '../../utils/coord';
import {
  cloneTrip, findDayById, insertStopIntoDay, sortStopsByTime,
} from '../../utils/tripEditorHelpers';

// 与 useTripPlaceAdd 同签名的尾段:从高德 POI 直接建 stop
export function useAmapPlaceAdd(trip, state, tripId, applyUpdate) {
  const addStopFromAmapPoi = useCallback(async (dayId, poi, afterStopId = null, useNow = false) => {
    if (!trip || !poi) return null;
    const updated = cloneTrip(trip);
    const day = findDayById(updated, dayId);
    if (!day) return null;

    // 高德 POI 坐标是 GCJ-02 → 存库统一 WGS-84
    const gcj = poi._gcj || poi.geometry?.location;
    const w = gcj02ToWgs84(Number(gcj.lat), Number(gcj.lng));

    const stop = {
      // 与 useTripPlaceAdd 产出的 stop 字段对齐(按 Step 1 实际字段补全)
      type: 'location',
      location: poi.name || '',
      lat: w.lat,
      lng: w.lng,
      address: poi.vicinity || '',
      placeId: '',                   // 高德无 Google placeId
      amap_poi_id: poi.amap_poi_id || poi.place_id || '',
      category: '',                  // 可由 poi.types 推断,本期可留空
      ...(useNow ? { /* 现有 useNow 打卡时间写法,照 Step 1 */ } : {}),
    };

    insertStopIntoDay(day, stop, afterStopId);
    sortStopsByTime(day);
    await applyUpdate(updated);       // 与 Google 路径相同的提交入口
    return stop;
  }, [trip, state, tripId, applyUpdate]);

  return { addStopFromAmapPoi };
}
```

> `amap_poi_id` 需能落到 PB `locations.amap_poi_id`。确认 `applyUpdate` → `pbWrites.createPbStop` 链路是否透传该字段;若未透传,在 `src/adapters/pbWrites.js` 的 `createPbStop` 把 `stop.amap_poi_id` 写入 location 记录的 `amap_poi_id` 列(该列已存在于 PB)。

- [ ] **Step 3: 父层 onAddToDay 分流**

在定义 `onAddToDay` 的组件(`ItineraryView.jsx` 主、移动端 `MobileItineraryView.jsx`)里实例化 `useAmapPlaceAdd`,并按 payload 类型分流:

```js
// payload 为对象 ⇒ 高德 POI;为字符串 ⇒ Google placeId
const handleAddToDay = async (dayId, payload, useNow = false) => {
  if (payload && typeof payload === 'object') {
    return addStopFromAmapPoi(dayId, payload, null, useNow);
  }
  return addStopFromPlace(dayId, payload, null, useNow); // 现有 Google 路径
};
```

把传给 `<MapPanel>` / `<AmapMapPanel>` 的 `onAddToDay` 换成 `handleAddToDay`。

- [ ] **Step 4: 校验 + 构建**

Run: `npx eslint src/hooks/trip-editor/useAmapPlaceAdd.js && npm run build`
Expected: 0 error,构建成功。

- [ ] **Step 5: Commit**

```bash
git add src/hooks/trip-editor/useAmapPlaceAdd.js src/components/itinerary/ItineraryView.jsx src/components/itinerary/mobile/MobileItineraryView.jsx src/adapters/pbWrites.js
git commit -m "feat(amap): add-stop-from-POI path + amap_poi_id write"
```

---

### Task C4: 父层按 provider 选 MapPanel / AmapMapPanel

**Files:**
- Modify: 渲染 `<MapPanel>` 的位置(以 grep 实际结果为准)

- [ ] **Step 1: 找到 MapPanel 渲染点**

Run: `grep -rn "<MapPanel" src --include=*.jsx`
Expected: 列出所有渲染处。

- [ ] **Step 2: 每处改为按 provider 选择**

文件顶部:

```js
import AmapMapPanel from './AmapMapPanel'; // 路径按该文件相对位置调整
import { isAmap } from '../../providers/mapProvider';
```

渲染处(保留所有原 props 与 ref):

```jsx
{isAmap()
  ? <AmapMapPanel ref={mapPanelRef} {...mapPanelProps} />
  : <MapPanel ref={mapPanelRef} {...mapPanelProps} />}
```

> 用各文件**实际**的 ref 变量名与 props 列表(不要改名)。

- [ ] **Step 3: 校验 + 构建**

Run: `npm run build`
Expected: 构建成功。

- [ ] **Step 4: 浏览器手测(需 key)**

临时在 dev `.env` 填 `VITE_AMAP_KEY`/`VITE_AMAP_JSCODE` → `npm run dev` → 用户下拉切「高德」→ reload。
Expected:
- 高德底图显示;当前 trip 的 stop 标记位置正确(与 Google 模式对比无明显偏移)。
- 进入今日打卡(isDayMode)→ 自动定位 → 弹「附近打卡」→ 能拉到中国 POI(身处国内或 dev 工具改 GPS 到国内坐标验证)→ 分类切换正常。
- 点某 POI「打卡」→ stop 加入当天;切回 Google 模式该点位置近似正确。
- 切回 Google 模式 → 一切与改动前一致(回归)。

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(amap): switch MapPanel/AmapMapPanel by provider"
```

---

## Phase D — server.js 放行 / 部署 / 验收

### Task D1: server.js 放行高德域名

VM 上 `server.js` 源在仓库 `deploy/pb-vm/server.js`。`ALLOWED_HOSTS` 现仅放行 Google 系。

**Files:**
- Modify: `deploy/pb-vm/server.js`

- [ ] **Step 1: 定位并扩展 ALLOWED_HOSTS**

Run: `grep -n "ALLOWED_HOSTS" deploy/pb-vm/server.js`
把:

```js
const ALLOWED_HOSTS = /(^|\.)googleapis\.com$|(^|\.)googleusercontent\.com$|(^|\.)ggpht\.com$|(^|\.)gstatic\.com$/;
```

改为(追加高德系):

```js
const ALLOWED_HOSTS = /(^|\.)googleapis\.com$|(^|\.)googleusercontent\.com$|(^|\.)ggpht\.com$|(^|\.)gstatic\.com$|(^|\.)amap\.com$|(^|\.)autonavi\.com$/;
```

- [ ] **Step 2: 检查 CSP**

Run: `grep -niE "content-security-policy|connect-src|img-src|script-src" deploy/pb-vm/server.js index.html`
Expected:若存在 CSP,把 `https://webapi.amap.com https://*.amap.com https://*.autonavi.com` 加入 `script-src`/`connect-src`/`img-src`;若无 CSP,跳过。

- [ ] **Step 3: Commit**

```bash
git add deploy/pb-vm/server.js index.html
git commit -m "feat(deploy): allow AMap hosts in server proxy/CSP"
```

---

### Task D2: 部署 + 验收

**前置:** 用户已在 `.env.pb-vm` 填好真实 `VITE_AMAP_KEY`/`VITE_AMAP_JSCODE`,并在高德开放平台为该 key 配置域名白名单(含 `dashboard-server.tail4cfa2.ts.net`)。

- [ ] **Step 1: 全量单测**

Run: `npm run test`
Expected: 全绿(coord / mapProvider / amapCategories)。

- [ ] **Step 2: 构建**

Run: `npm run build:pb-vm`
Expected: 构建成功,产出 `dist/`。

- [ ] **Step 3: 部署 dist + server.js 到 VM**

按现有部署方式(scp `dist/` → `/home/dev/smat-trip/dist/`;若改了 server.js 一并上传),重启:

```bash
ssh dashboard-server 'sudo systemctl restart smat-trip && systemctl is-active smat-trip'
```
Expected: `active`。

- [ ] **Step 4: 线上验收(对照 spec 验收标准)**

打开 `https://dashboard-server.tail4cfa2.ts.net:8451/`:
- [ ] 用户下拉有「地图服务商」开关,切换后重载生效,刷新后偏好仍在(localStorage)。
- [ ] 高德模式底图渲染;stop 标记位置正确无明显偏移。
- [ ] 「附近打卡」能拉到中国 POI(国内网络下),分类切换正常。
- [ ] 打卡写入后 PB `locations.lat/lng` 为 WGS-84、`amap_poi_id` 已填;切回 Google 模式该点位置近似正确。
- [ ] 高德模式下未实现的 Google 功能(搜索框/路线/急救/地点照片)不报错,以禁用/占位呈现。
- [ ] Google 模式行为与改动前一致(回归)。

- [ ] **Step 5: 收尾**

按 `superpowers:finishing-a-development-branch` 决定合并 `feature/amap-provider` → 部署分支。

---

## 自检(spec 覆盖)

- 设置开关(localStorage 按设备)→ Task B3 / A3 ✅
- 高德底图 → Task C1 / C4 ✅
- 周边打卡(高德 PlaceSearch)→ Task C2 ✅
- 坐标 WGS-84 真理 + GCJ-02 边界转换 → Task A2 / C1 / C2 / C3 ✅
- amap_poi_id 去重/写库 → Task C2 / C3 ✅
- SDK 加载二选一 → Task B1 / B2 ✅
- key 注入 + 域名放行 → Task B4 / D1 ✅
- Google 模式零回归(独立 AmapMapPanel,MapPanel 不动)→ Task C1 / C4 ✅
- 未实现功能降级不报错 → Task C4 验收项 ✅

## 已知风险 / 待执行时确认

- **C3 是全计划最不确定处**:`useTripPlaceAdd` 的建 stop 尾段与 `pbWrites.createPbStop` 的字段透传必须先读真实代码再对齐(Step 1 强制)。stop 字段名/写库入口以现有代码为准,模板仅示意。
- 高德 JS API 2.0 `PlaceSearch.searchNearBy` 的回调签名、`poi.location.lat/lng` 字段以高德官方文档为准,手测时校正。
- 高德 key 的域名白名单必须含 tailnet 域名,否则线上 SDK 拒绝加载。
- 二期(搜索框)、三期(路线)不在本计划。
```