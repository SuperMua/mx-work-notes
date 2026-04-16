# MX工作便签前台静态托管与 API 独立部署说明

本文档适用于你希望把前台和后台部署到静态托管平台，而把 API 部署到独立服务器或独立 Node 环境的拆分方案。

这是当前项目非常适合的一种部署方式，因为：

- 前台和后台本质都是构建后的静态资源
- API 需要长期运行和访问数据库，更适合单独托管
- 前端和 API 的更新节奏可以分离

## 1. 推荐架构

推荐结构如下：

- 前台：静态托管平台
- 后台：静态托管平台
- API：单独云服务器或托管 Node 平台
- 数据库：独立 PostgreSQL

推荐域名：

- 前台：`app.example.com`
- 后台：`admin.example.com`
- API：`api.example.com`

## 2. 适用场景

这个方案特别适合：

- 前台和后台更新较频繁
- 希望把静态站点托管给更轻量的平台
- 希望 API 单独控制权限、日志和数据库连接

## 3. 核心原则

### 3.1 前后台是静态产物

构建后上传的是：

- `apps/web/dist`
- `apps/admin/dist`

### 3.2 API 是独立运行服务

API 生产入口：

```bash
node apps/api/dist/apps/api/src/main.js
```

### 3.3 前端环境变量必须在构建前写好

前台和后台都只使用：

```bash
VITE_API_BASE_URL=https://api.example.com
```

也就是说：

- API 地址一旦变更，前后台必须重新构建

## 4. 前台和后台静态托管要求

不管你使用哪个静态托管平台，都至少要满足：

- 能部署静态文件
- 支持自定义域名
- 支持 HTTPS
- 能配置 SPA fallback

因为前台和后台都是单页应用，如果没有 fallback 到 `index.html`，刷新业务页会出现 404。

## 5. API 服务器要求

API 所在服务器建议满足：

- Node.js 20 或更高版本
- 可稳定访问 PostgreSQL
- 能通过 Nginx 或云网关对外暴露 HTTPS
- 能托管常驻进程，例如 `systemd` 或 PM2

## 6. 拆分部署步骤总览

推荐顺序如下：

1. 先部署 API。
2. 验证 API 域名和健康检查可用。
3. 写入前台和后台的 `VITE_API_BASE_URL`。
4. 构建前台和后台。
5. 将前后台静态产物分别发布到静态托管平台。
6. 做完整登录与业务路径验证。

## 7. API 侧部署步骤

### 7.1 准备环境变量

在 API 部署环境中配置：

```bash
DATABASE_URL=postgresql://dbuser:dbpassword@db-host:5432/smart_notes?schema=public
JWT_SECRET=请替换为强随机密钥
PORT=3000
NODE_ENV=production
```

### 7.2 安装与迁移

```bash
corepack pnpm install
corepack pnpm db:generate
corepack pnpm db:migrate
```

如果验收环境需要默认账号，可临时执行：

```bash
SEED_OWNER_EMAIL=admin@example.com SEED_OWNER_PASSWORD=强密码 corepack pnpm db:seed
```

### 7.3 构建 API

```bash
corepack pnpm build:api
```

### 7.4 启动 API

```bash
node apps/api/dist/apps/api/src/main.js
```

正式环境建议使用：

- `systemd`
- PM2
- 托管 Node 平台自带的守护机制

## 8. 前台部署步骤

### 8.1 设置环境变量

```bash
VITE_API_BASE_URL=https://api.example.com
```

### 8.2 构建前台

```bash
corepack pnpm build:web
```

### 8.3 发布目录

上传：

```text
apps/web/dist
```

### 8.4 托管侧配置要点

需要确保：

- 站点开启 HTTPS
- 域名绑定为 `app.example.com`
- 开启单页应用 fallback

## 9. 后台部署步骤

### 9.1 设置环境变量

```bash
VITE_API_BASE_URL=https://api.example.com
```

### 9.2 构建后台

```bash
corepack pnpm build:admin
```

### 9.3 发布目录

上传：

```text
apps/admin/dist
```

### 9.4 托管侧配置要点

需要确保：

- 站点开启 HTTPS
- 域名绑定为 `admin.example.com`
- 开启单页应用 fallback

## 10. 推荐的职责划分

前台和后台静态托管平台负责：

- 文件分发
- HTTPS
- 域名接入
- 前端缓存

API 服务器负责：

- 业务逻辑
- 身份认证
- 数据库连接
- 日志与进程管理

## 11. 缓存建议

静态托管方案里，需要特别注意两类缓存：

- HTML 缓存
- 静态资源缓存

建议：

- `index.html` 不要过度长缓存
- 带 hash 的静态资源可以长缓存

否则容易出现：

- 页面还在引用旧 API 地址
- 用户打开的是旧入口文件

## 12. 常见风险

### 12.1 API 先没准备好就构建前端

这样容易导致前端把错误的 `VITE_API_BASE_URL` 写死进产物。

### 12.2 静态托管没做 SPA fallback

结果是：

- 首页能打开
- 刷新业务页直接 404

### 12.3 前端与 API 协议不一致

比如：

- 前台是 `https`
- API 却还是 `http`

这会导致浏览器 Mixed Content 问题。

## 13. 上线检查

拆分部署完成后，建议按下面顺序检查：

1. `https://api.example.com/health` 返回正常。
2. 前台登录页可打开。
3. 后台登录页可打开。
4. 前台登录成功。
5. 后台登录成功。
6. 前台创建、编辑、归档、删除便签正常。
7. 后台数据看板、账号管理、工作区管理、便签管理可打开。

## 14. 适合长期使用的结论

如果你希望前端上线轻、API 可控、后续更新灵活，这一套“前台静态托管 + API 独立部署”的方案非常适合 MX工作便签。

它尤其适合：

- 前端经常更新
- API 与数据库希望单独掌控
- 希望前后端部署边界清晰
