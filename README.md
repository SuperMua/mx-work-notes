# MX工作便签

> 一套面向工作场景的中文便签系统，包含前台工作台、后台管理端与 API 服务端，适合本地交付、私有化部署和云端正式上线。

## 项目简介

MX工作便签当前已经收口为可交付仓库，只保留项目运行、部署和维护所需的核心代码与文档。项目采用前后端分离结构，支持登录后使用、后台管理、工作区隔离和 PostgreSQL 持久化。

## 核心组成

| 模块 | 位置 | 说明 |
| --- | --- | --- |
| 前台用户端 | `apps/web` | 工作台、便签、看板、日历、设置 |
| 后台管理端 | `apps/admin` | 数据看板、账号、工作区、成员、便签、模板、标签、同步监控 |
| API 服务端 | `apps/api` | 认证、业务接口、后台接口、数据库读写 |
| 共享包 | `packages/shared` | 前后端共享类型、常量、品牌配置 |

## 技术栈

- 前台：`Vue 3 + Vite + TypeScript`
- 后台：`Vue 3 + Vite + TypeScript`
- API：`NestJS + Prisma + PostgreSQL`
- 工程管理：`pnpm workspace`

## 仓库结构

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
├─ README.md
├─ DEPLOYMENT.md
├─ USAGE.md
├─ 云端部署总览.md
├─ 阿里云云服务器部署说明.md
├─ 腾讯云云服务器部署说明.md
├─ 宝塔面板部署说明.md
├─ Ubuntu与Nginx及systemd实战部署说明.md
└─ 前台静态托管与API独立部署说明.md
```

## 快速启动

### 1. 准备环境变量

将以下示例文件复制为对应 `.env` 文件：

- `apps/api/.env.example` -> `apps/api/.env`
- `apps/web/.env.example` -> `apps/web/.env`
- `apps/admin/.env.example` -> `apps/admin/.env`

默认本地联调端口：

- API：`3000`
- PostgreSQL：`5433`

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

### 4. 默认访问地址

- 前台：`http://127.0.0.1:5173`
- 后台：`http://127.0.0.1:5174`
- API：`http://127.0.0.1:3000`

## 默认账号

执行 `corepack pnpm db:seed` 后可得到默认验收账号：

```text
owner@example.com
password123
```

该账号可同时登录前台与后台。

## 文档导航

### 本地与交付文档

- 部署与交付说明：[`DEPLOYMENT.md`](./DEPLOYMENT.md)
- 使用说明：[`USAGE.md`](./USAGE.md)

### 云端部署文档

- 云端部署总览：[`云端部署总览.md`](./云端部署总览.md)
- 阿里云云服务器版：[`阿里云云服务器部署说明.md`](./阿里云云服务器部署说明.md)
- 腾讯云云服务器版：[`腾讯云云服务器部署说明.md`](./腾讯云云服务器部署说明.md)
- 宝塔面板版：[`宝塔面板部署说明.md`](./宝塔面板部署说明.md)
- Ubuntu + Nginx + systemd 实战版：[`Ubuntu与Nginx及systemd实战部署说明.md`](./Ubuntu与Nginx及systemd实战部署说明.md)
- 前台静态托管 + API 独立部署版：[`前台静态托管与API独立部署说明.md`](./前台静态托管与API独立部署说明.md)

## 常用命令

```bash
corepack pnpm build
corepack pnpm build:web
corepack pnpm build:admin
corepack pnpm build:api
corepack pnpm dev:api
corepack pnpm dev:web
corepack pnpm dev:admin
corepack pnpm db:up
corepack pnpm db:down
corepack pnpm db:logs
```

## 适合的部署方式

如果你已经准备上线，可按场景选文档：

- 希望标准、稳妥、可长期维护：看 `Ubuntu + Nginx + systemd 实战版`
- 使用阿里云交付客户：看 `阿里云云服务器版`
- 使用腾讯云交付客户：看 `腾讯云云服务器版`
- 喜欢界面化运维：看 `宝塔面板版`
- 希望前端部署更轻、API 独立：看 `前台静态托管 + API 独立部署版`
