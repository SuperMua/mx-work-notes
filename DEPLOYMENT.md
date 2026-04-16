# MX工作便签部署文档

本文档用于部署、交付、预览和后续维护 MX工作便签。文档内容覆盖环境准备、数据库初始化、开发模式启动、交付预览模式启动、手动部署方式、日志位置、常见故障排查等内容。

如果你的目标是正式部署到公网云服务器、静态托管平台或云数据库环境，建议同时阅读以下云端文档：

- [`云端部署总览.md`](./云端部署总览.md)
- [`阿里云云服务器部署说明.md`](./阿里云云服务器部署说明.md)
- [`腾讯云云服务器部署说明.md`](./腾讯云云服务器部署说明.md)
- [`宝塔面板部署说明.md`](./宝塔面板部署说明.md)
- [`Ubuntu与Nginx及systemd实战部署说明.md`](./Ubuntu与Nginx及systemd实战部署说明.md)
- [`前台静态托管与API独立部署说明.md`](./前台静态托管与API独立部署说明.md)

## 1. 项目结构与运行组成

MX工作便签由三部分组成：

- `apps/web`：前台用户端，负责工作台、便签、看板、日历、设置等页面
- `apps/admin`：后台管理端，负责数据看板、账号、工作区、成员、便签、模板、标签和同步监控
- `apps/api`：统一 API 服务，负责认证、业务数据、后台管理能力和数据库读写

共享代码位于 `packages/shared`，本地交付预览脚本位于 `scripts`。

## 2. 环境要求

部署或本地运行前，请先确认当前机器满足以下条件：

- Windows、macOS 或 Linux 任一可运行 Node.js 的环境
- Node.js `20` 或更高版本
- `corepack`
- `pnpm`
- Docker Desktop 或可用的 Docker Engine
- 本机可使用端口：
  - `3000`：API
  - `4173`：前台预览
  - `4174`：后台预览
  - `5433`：PostgreSQL

建议先执行以下命令确认版本：

```bash
node -v
corepack --version
docker --version
docker compose version
```

## 3. 环境变量准备

### 3.1 API 环境变量

源文件：`apps/api/.env.example`

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/smart_notes
JWT_SECRET=smart-notes-dev-secret
PORT=3000
```

部署前请复制为：

```bash
apps/api/.env
```

字段说明：

- `DATABASE_URL`：PostgreSQL 连接字符串
- `JWT_SECRET`：JWT 签名密钥
- `PORT`：API 服务监听端口，默认 `3000`

### 3.2 前台环境变量

源文件：`apps/web/.env.example`

```bash
VITE_API_BASE_URL=http://127.0.0.1:3000
```

部署前请复制为：

```bash
apps/web/.env
```

### 3.3 后台环境变量

源文件：`apps/admin/.env.example`

```bash
VITE_API_BASE_URL=http://127.0.0.1:3000
```

部署前请复制为：

```bash
apps/admin/.env
```

说明：

- 前后台都只保留一个环境变量：`VITE_API_BASE_URL`
- 该值会在构建时写入前端产物
- 如果 API 部署地址变化，必须在执行 `pnpm build` 之前修改该值

## 4. PostgreSQL 初始化

当前仓库自带 `docker-compose.yml`，默认启动一个本地 PostgreSQL 容器，配置如下：

- 数据库名：`smart_notes`
- 用户名：`postgres`
- 密码：`postgres`
- 宿主机端口：`5433`
- 容器端口：`5432`

启动命令：

```bash
docker compose up -d postgres
```

查看状态：

```bash
docker compose ps
docker compose logs -f postgres
```

停止数据库：

```bash
docker compose down
```

彻底清空数据库卷：

```bash
docker compose down -v
```

只有在你明确需要重置本地数据时，才建议执行 `down -v`。

## 5. 安装依赖与数据库初始化顺序

新机器首次部署时，推荐严格按下面顺序执行：

```bash
corepack pnpm install
docker compose up -d postgres
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
```

每一步的作用如下：

### 5.1 安装工作区依赖

```bash
corepack pnpm install
```

作用：

- 安装根工作区依赖
- 安装 `apps/web`、`apps/admin`、`apps/api` 所需依赖
- 根据当前精简后的 `package.json` 刷新本地依赖树

### 5.2 启动数据库

```bash
docker compose up -d postgres
```

作用：

- 拉起 PostgreSQL 16 容器
- 暴露本机 `5433` 端口供 API 使用

### 5.3 生成 Prisma Client

```bash
corepack pnpm db:generate
```

作用：

- 根据 Prisma Schema 生成数据库客户端

### 5.4 执行 migration

```bash
corepack pnpm db:migrate
```

作用：

- 将数据库结构迁移到当前项目版本所需状态

### 5.5 写入 seed 数据

```bash
corepack pnpm db:seed
```

作用：

- 创建默认 owner 账号
- 创建默认工作区
- 用于本地演示、验收和后台入口验证

## 6. 开发模式启动

开发模式适合日常联调，支持热更新。

请打开三个终端窗口，分别执行：

```bash
corepack pnpm dev:api
corepack pnpm dev:web
corepack pnpm dev:admin
```

默认访问地址：

- API：`http://127.0.0.1:3000`
- 前台：`http://127.0.0.1:5173`
- 后台：`http://127.0.0.1:5174`

说明：

- 前后台开发服务基于 Vite
- 如果 `5173` 或 `5174` 被占用，Vite 会自动改用其他端口
- 实际地址请以终端输出为准

## 7. 交付预览模式启动

交付预览模式更接近“验收环境”。

### 7.1 先构建全部产物

```bash
corepack pnpm build
```

### 7.2 启动交付预览

```bash
corepack pnpm delivery:start
```

### 7.3 查看交付预览状态

```bash
corepack pnpm delivery:status
```

### 7.4 停止交付预览

```bash
corepack pnpm delivery:stop
```

固定预览地址：

- API：`http://127.0.0.1:3000`
- 前台：`http://127.0.0.1:4173`
- 后台：`http://127.0.0.1:4174`

交付预览脚本位置：

- `scripts/start-delivery.ps1`
- `scripts/status-delivery.ps1`
- `scripts/stop-delivery.ps1`

这些脚本会：

- 启动 API 产物
- 启动前台预览服务
- 启动后台预览服务
- 将运行信息写入 `output/logs`

## 8. 手动部署方式

如果不使用 PowerShell 交付脚本，也可以手动部署。

### 8.1 同机部署

适合在同一台机器上同时跑数据库、API、前台和后台：

```bash
corepack pnpm install
docker compose up -d postgres
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
corepack pnpm build
corepack pnpm start:api
corepack pnpm preview:web --host 127.0.0.1 --port 4173
corepack pnpm preview:admin --host 127.0.0.1 --port 4174
```

### 8.2 分离式部署建议

如果你要部署到更正式的服务器环境，推荐采用以下思路：

- API 使用 `node apps/api/dist/apps/api/src/main.js` 启动
- 前台使用任意静态文件服务托管 `apps/web/dist`
- 后台使用任意静态文件服务托管 `apps/admin/dist`
- 数据库使用独立 PostgreSQL 服务
- 对外服务前建议额外配置反向代理和 HTTPS

当前仓库没有内置 PM2、Nginx、Caddy 或 systemd 配置，因此正式生产部署需按你的服务器环境另行接入。

更详细的云端部署架构、反向代理、HTTPS、systemd 和上线检查说明请见 [`云端部署总览.md`](./云端部署总览.md) 以及对应场景化部署文档。

## 9. 构建产物位置

构建完成后，主要产物位于：

- 前台：`apps/web/dist`
- 后台：`apps/admin/dist`
- API：`apps/api/dist/apps/api/src/main.js`

## 10. 默认账号

执行 `corepack pnpm db:seed` 后会生成默认账号：

```text
owner@example.com
password123
```

用途说明：

- 可登录前台
- 可登录后台
- 具备后台访问权限

## 11. 日志位置

交付预览模式运行后，日志会生成在：

```text
output/logs
```

常见文件包括：

- `api-时间戳.out.log`
- `api-时间戳.err.log`
- `web-时间戳.out.log`
- `web-时间戳.err.log`
- `admin-时间戳.out.log`
- `admin-时间戳.err.log`
- `delivery-processes.json`

说明：

- `output` 为运行时生成目录，不纳入仓库
- 如果没有执行 `delivery:start`，该目录可能不存在

## 12. 常用运维命令

### 12.1 数据库相关

```bash
corepack pnpm db:up
corepack pnpm db:down
corepack pnpm db:logs
corepack pnpm db:reset
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
```

### 12.2 应用相关

```bash
corepack pnpm dev:api
corepack pnpm dev:web
corepack pnpm dev:admin
corepack pnpm build
corepack pnpm build:api
corepack pnpm build:web
corepack pnpm build:admin
corepack pnpm start:api
corepack pnpm preview:web
corepack pnpm preview:admin
corepack pnpm delivery:start
corepack pnpm delivery:status
corepack pnpm delivery:stop
```

## 13. 常见故障排查

### 13.1 PostgreSQL 启动失败

请依次检查：

- Docker 是否已启动
- `5433` 端口是否已被其他数据库占用
- `docker compose ps` 是否显示容器运行中

可执行：

```bash
docker compose up -d postgres
docker compose ps
docker compose logs -f postgres
```

### 13.2 API 启动失败

请检查以下内容：

- `apps/api/.env` 是否存在
- `DATABASE_URL`、`JWT_SECRET`、`PORT` 是否填写
- 数据库是否已完成 migration
- `corepack pnpm db:generate` 是否执行成功

健康检查地址：

```text
http://127.0.0.1:3000/health
```

### 13.3 无法登录默认账号

请检查：

- 是否执行过 `corepack pnpm db:seed`
- 执行 seed 时是否错误设置了 `NODE_ENV=production`
- 数据库是否已经被清空或切换

### 13.4 前台或后台打不开

请检查：

- API 是否运行中
- `VITE_API_BASE_URL` 是否正确
- 前台和后台终端输出的实际端口号
- `3000`、`4173`、`4174` 是否有端口冲突

如果使用交付预览模式，请执行：

```bash
corepack pnpm delivery:status
```

### 13.5 预览模式已启动但页面不可用

请依次检查：

- 是否先执行了 `corepack pnpm build`
- `output/logs` 中是否有错误日志
- API 产物 `apps/api/dist/apps/api/src/main.js` 是否存在

### 13.6 数据库需要完全重建

如果本地数据库已经混乱，可执行：

```bash
corepack pnpm db:reset
corepack pnpm db:up
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
```

注意：该流程会清空数据库卷，请确认你不再需要原数据。

## 14. 交付建议

如果需要将该项目交给其他实施人员，建议按以下顺序交接：

1. 先让对方按本文档完成环境准备和数据库初始化。
2. 再让对方执行开发模式或交付预览模式启动。
3. 使用默认账号完成一次前台登录和后台登录。
4. 再参考 [`USAGE.md`](./USAGE.md) 进行业务操作验收。

## 15. 已知边界

- 当前仓库提供的是可部署、可联调、可交付的应用代码，不包含额外的服务器编排方案
- `delivery:start` 系列脚本基于 PowerShell，主要面向当前 Windows 交付环境
- `vite preview` 更适合本地验收与交付预览，不建议直接作为公网长期运行方案
- 生产环境如果使用不同域名或服务器地址，必须在前端构建前先调整 `VITE_API_BASE_URL`
