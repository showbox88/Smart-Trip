# Smart Trip — 部署配置说明 (Deployment Guide)

本文档记录了 Smart Trip 应用的完整云端部署架构与配置，以便日后维护或重新部署。

---

## 🌐 线上地址

| 环境 | URL |
|---|---|
| **生产环境 (Vercel)** | https://smart-trip-umber-gamma.vercel.app |
| **后端 (Supabase)** | https://sqkhtmsjflrfjajingfg.supabase.co |

---

## 🏗️ 部署架构

```
用户浏览器
    │
    ▼
Vercel (静态托管)
https://smart-trip-umber-gamma.vercel.app
    │
    ├─── Supabase Auth (用户认证)
    ├─── Supabase PostgreSQL (行程/设置数据)
    └─── Supabase Storage (图片文件)
             trip-media bucket
```

---

## 📦 Vercel 配置

### 项目信息
| 项目 | 值 |
|---|---|
| 项目名 | `smart-trip` |
| 团队 | `showbox88-1952's project` |
| GitHub 仓库 | `showbox88/Smart-Trip` |
| 生产分支 | `main`（与 `v2-cloud` 保持同步） |
| Framework Preset | `Other`（纯静态，无构建步骤） |
| Root Directory | `./` |
| Build Command | 无（留空） |
| Output Directory | 无（留空） |

### vercel.json 配置
项目根目录下的 `vercel.json` 文件配置了路由重写与 MIME 类型：

```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ],
  "headers": [
    {
      "source": "/js/(.*)",
      "headers": [
        { "key": "Content-Type", "value": "application/javascript" }
      ]
    }
  ]
}
```

### 自动部署触发
- 每次向 `main` 或 `v2-cloud` 分支执行 `git push` 后，Vercel 自动重新部署
- 无需手动操作，约 30-60 秒完成

---

## 🗄️ Supabase 配置

### 项目信息
| 项目 | 值 |
|---|---|
| Project URL | `https://sqkhtmsjflrfjajingfg.supabase.co` |
| Anon Key | 见 `js/supabase_api.js`（第 8 行） |
| Region | 按创建时选择 |

### 数据库表结构

#### `trips` 表
```sql
id          text PRIMARY KEY        -- 行程唯一 ID（格式：trip-{timestamp}）
user_id     uuid NOT NULL           -- 关联 auth.users.id
title       text                    -- 行程标题
thumb       text                    -- 封面图 URL
trip_data   jsonb                   -- 完整行程 JSON 数据
created_at  timestamptz DEFAULT now()
```

#### `user_settings` 表
```sql
id          uuid PRIMARY KEY        -- 等于 auth.users.id
settings    jsonb                   -- 用户设置（语言/货币/单位）
updated_at  timestamptz DEFAULT now()
```

### Storage Bucket
| Bucket | 用途 | 访问权限 |
|---|---|---|
| `trip-media` | 行程封面图 + 站点图片 | 需要认证 |

### Authentication → URL Configuration

> ⚠️ 更换域名或新增部署环境时，必须同步更新此配置，否则登录后会报错。

**Site URL：**
```
https://smart-trip-umber-gamma.vercel.app/
```

**Redirect URLs（允许列表）：**
```
https://smart-trip-umber-gamma.vercel.app/
https://smart-trip-umber-gamma.vercel.app/**
```

配置路径：Supabase 控制台 → Authentication → URL Configuration

---

## 🔧 本地开发配置

本地开发时不需要 Vercel，直接用 Python 后端：

```bash
# 启动本地服务器
python server.py
# 访问 http://localhost:8000
```

**切换后端模式**（`js/api.js` 第 7 行）：
```javascript
// true  = 使用 Supabase 云端（生产/开发均推荐）
// false = 使用本地 Python server.py + db.json（离线模式）
const USE_CLOUD_BACKEND = true;
```

---

## 🔄 日常开发工作流

```bash
# 1. 在本地开发并测试
#    访问 http://localhost:8000（需运行 python server.py）

# 2. 提交代码到 v2-cloud 分支
git add -A
git commit -m "feat/fix: 改动说明"
git push origin v2-cloud

# 3. 同步到 main 分支（触发 Vercel 自动部署）
git checkout main
git merge v2-cloud --ff-only
git push origin main
git checkout v2-cloud

# ✅ Vercel 在约 60 秒内自动完成重新部署
```

---

## 🆕 新环境部署步骤（从零开始）

1. **Fork 或 Clone 仓库**：`showbox88/Smart-Trip`

2. **在 Supabase 创建项目**，执行以下 SQL 创建表：
   ```sql
   -- trips 表
   CREATE TABLE trips (
     id text PRIMARY KEY,
     user_id uuid REFERENCES auth.users NOT NULL,
     title text,
     thumb text,
     trip_data jsonb,
     created_at timestamptz DEFAULT now()
   );
   ALTER TABLE trips ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users own their trips" ON trips
     USING (auth.uid() = user_id);

   -- user_settings 表
   CREATE TABLE user_settings (
     id uuid PRIMARY KEY REFERENCES auth.users,
     settings jsonb,
     updated_at timestamptz DEFAULT now()
   );
   ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Users own their settings" ON user_settings
     USING (auth.uid() = id);
   ```

3. **创建 Storage Bucket**：名称 `trip-media`，设置为 private

4. **更新 `js/supabase_api.js`**：
   ```javascript
   const SUPABASE_URL = 'https://你的项目.supabase.co';
   const SUPABASE_KEY = '你的 anon key';
   ```

5. **在 Vercel 导入仓库**，Framework 选 `Other`，Build/Output 留空

6. **更新 Supabase URL Configuration**（见上方配置）

---

*Last updated: 2026-03-11 by Antigravity AI Assistant*
