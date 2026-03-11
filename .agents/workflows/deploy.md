---
description: ⚡ 如何将改动从开发分支同步到生产环境并自动部署到 Vercel (Standard Git Workflow)
---

### 1. 提交并同步开发分支 (Preview)
在 `v2-cloud` 分支完成开发和测试后，先推送到云端。这会触发 Vercel 的【预览部署】，你可以通过预览 URL 检查效果。

// turbo
```bash
git add .
git commit -m "你的改动说明"
git push origin v2-cloud
```

### 2. 合并并推送主分支 (Production)
确认预览版没问题后，合并到 `main` 分支。这时 Vercel 会自动更新你的【正式环境 URL】。

// turbo
```bash
git checkout main
git merge v2-cloud
git push origin main
```

### 3. 返回开发分支
完成线上发布后，切回分支准备接下来的开发任务。

// turbo
```bash
git checkout v2-cloud
```
