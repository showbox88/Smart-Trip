# Archive 文件夹选择 & 重新读取按钮

可复用的组件代码，适用于任何基于 **File System Access API** 的 React 相册/文件管理项目。

---

## 效果

| 状态 | 显示 |
|------|------|
| 扫描中 | 旋转加载动画 + "扫描中..." |
| 有保存的文件夹但未加载 | 蓝色闪烁「恢复档案」按钮 |
| 无文件夹 | 「选择文件夹」按钮 |
| 文件夹已加载 | 「重新选择」+ 「重新读取」两个按钮 |

---

## 依赖

```bash
npm install lucide-react
# Tailwind CSS v4
```

---

## 第一步：修改 `syncPhotosWithExif`

在现有的 `syncPhotosWithExif` 函数签名加上 `forceAll` 参数：

```js
// useFileSystemAccess.js
const syncPhotosWithExif = async (files, currentDb, fileHandle, forceAll = false) => {
  // ...

  // 将原来的 filter 替换为：
  const missingInfoPhotos = forceAll
    ? [...currentDb.photos]                              // 强制全量重扫
    : currentDb.photos.filter(p => !p.latitude && !p.date); // 仅扫缺失信息的

  if (newPhotos.length === 0 && missingInfoPhotos.length === 0) return;
  // ... 其余逻辑不变
};
```

---

## 第二步：在 Hook 中添加 `resyncExif`

```js
// useFileSystemAccess.js — 在 return 语句之前添加

import { useState, useCallback } from 'react';

const resyncExif = useCallback(async () => {
  if (!dbHandle || photoFiles.length === 0) return;
  setIsScanning(true);
  try {
    await syncPhotosWithExif(photoFiles, dbContent, dbHandle, true);
  } finally {
    setIsScanning(false);
  }
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [dbHandle, photoFiles, dbContent]);

// 在 return 对象中加入 resyncExif：
return {
  initWorkspace,
  restoreWorkspace,
  resyncExif,        // ← 新增
  checkPersistedWorkspace,
  hasPersistedHandle,
  isScanning,
  photoFiles,
  error,
  dbHandle,
  dbContent,
  saveToDatabase,
};
```

---

## 第三步：在组件中使用按钮

### 引入

```jsx
import { FolderOpen, RefreshCw } from 'lucide-react';
```

```jsx
const {
  initWorkspace,
  restoreWorkspace,
  resyncExif,
  hasPersistedHandle,
  isScanning,
  dbHandle,
} = useFileSystemAccess();

// handleInitialize：有保存的 handle 就恢复，否则新建
const handleInitialize = async () => {
  if (hasPersistedHandle) {
    await restoreWorkspace();
  } else {
    await initWorkspace();
  }
};
```

### JSX

```jsx
{isScanning ? (
  /* 扫描中状态 */
  <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400 text-xs font-bold">
    <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    扫描中...
  </div>
) : (
  <div className="flex items-center gap-2">

    {/* 文件夹按钮：有保存 handle 时显示"恢复档案"，否则显示"选择/重新选择" */}
    {hasPersistedHandle && !dbHandle ? (
      <button
        onClick={handleInitialize}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-blue-600/20 border border-blue-500/40 text-blue-400 hover:bg-blue-600/30 transition-all text-xs font-bold animate-pulse"
      >
        <FolderOpen size={14} />
        恢复档案
      </button>
    ) : (
      <button
        onClick={async () => { await initWorkspace(); }}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold"
      >
        <FolderOpen size={14} />
        {dbHandle ? '重新选择' : '选择文件夹'}
      </button>
    )}

    {/* 重新读取按钮：只在文件夹已加载时显示 */}
    {dbHandle && (
      <button
        onClick={resyncExif}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-neutral-400 hover:text-white hover:bg-white/10 transition-all text-xs font-bold"
      >
        <RefreshCw size={14} />
        重新读取
      </button>
    )}

  </div>
)}
```

---

## 状态说明

| 变量 | 类型 | 说明 |
|------|------|------|
| `isScanning` | `boolean` | 正在扫描/读取文件时为 `true` |
| `hasPersistedHandle` | `boolean` | IndexedDB 中保存了上次的文件夹 handle |
| `dbHandle` | `FileSystemFileHandle \| null` | 当前会话的数据库文件句柄，`null` 表示未加载 |

## 按钮逻辑流程

```
进入页面
  ├─ hasPersistedHandle && !dbHandle  →  显示「恢复档案」（蓝色闪烁）
  │    └─ 点击  →  requestPermission → 读取上次文件夹
  ├─ !dbHandle                        →  显示「选择文件夹」
  │    └─ 点击  →  showDirectoryPicker → 全新选择
  └─ dbHandle 已加载                  →  显示「重新选择」+「重新读取」
       ├─ 重新选择  →  showDirectoryPicker（覆盖旧文件夹）
       └─ 重新读取  →  syncPhotosWithExif(forceAll=true) → 全量重扫 EXIF
```
