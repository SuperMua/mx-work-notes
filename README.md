# MX工作便签

MX工作便签是一套面向团队与个人工作的中文便签系统，包含用户端、后台管理端和 API 服务端三部分。当前仓库已经按交付版本收口，只保留项目运行、部署和维护所需的代码与文档。

## 项目组成

- `apps/web`：前台用户端，基于 `Vue 3 + Vite + TypeScript`
- `apps/admin`：后台管理端，基于 `Vue 3 + Vite + TypeScript`
- `apps/api`：服务端，基于 `NestJS + Prisma + PostgreSQL`
- `packages/shared`：前后端共享类型、常量与品牌配置
- `scripts`：本地交付预览相关脚本

## 目录结构

```text
.
├─ apps/
│  ├─ web/
│  ├─ admin/
│  └─ api/
├─ packages/
│  └─ shared/
├─ scripts/
├─ docker-compose.yml
├─ package.json
├─ pnpm-workspace.yaml
├─ DEPLOYMENT.md
└─ USAGE.md
```

## 快速启动

### 1. 准备环境变量

将以下示例文件复制为对应 `.env` 文件，并按需修改：

- `apps/api/.env.example` -> `apps/api/.env`
- `apps/web/.env.example` -> `apps/web/.env`
- `apps/admin/.env.example` -> `apps/admin/.env`

默认示例已经可用于本地联调，API 使用 `3000` 端口，PostgreSQL 使用 `5433` 端口。

### 2. 安装依赖并初始化数据库

```bash
corepack pnpm install
docker compose up -d postgres
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm db:seed
```

### 3. 启动开发环境

分别在三个终端执行：

```bash
corepack pnpm dev:api
corepack pnpm dev:web
corepack pnpm dev:admin
```

### 4. 访问地址

- 前台：`http://127.0.0.1:5173`
- 后台：`http://127.0.0.1:5174`
- API：`http://127.0.0.1:3000`

如果本机端口被占用，Vite 会自动顺延到下一个可用端口，请以终端输出为准。

## 默认账号

执行 `corepack pnpm db:seed` 后会生成默认账号：

```text
owner@example.com
password123
```

该账号可同时登录前台与后台。

## 文档导航

- 部署与交付说明：[`DEPLOYMENT.md`](./DEPLOYMENT.md)
- 使用说明：[`USAGE.md`](./USAGE.md)

## 常用命令

```bash
corepack pnpm build
corepack pnpm delivery:start
corepack pnpm delivery:status
corepack pnpm delivery:stop
corepack pnpm db:up
corepack pnpm db:down
corepack pnpm db:logs
```
