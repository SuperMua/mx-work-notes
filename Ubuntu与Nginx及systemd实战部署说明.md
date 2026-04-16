# MX工作便签 Ubuntu 与 Nginx 及 systemd 实战部署说明

这是一份偏实战的部署文档，适合你直接在 Ubuntu 云服务器上落地 MX工作便签。

目标结构如下：

- 前台：Nginx 托管静态产物
- 后台：Nginx 托管静态产物
- API：systemd 托管 Node 进程
- 数据库：独立 PostgreSQL

## 1. 环境假设

本文假设：

- 服务器系统为 Ubuntu 22.04 或 24.04
- 已准备好域名
- 已准备好独立 PostgreSQL
- 你可以使用 `sudo`

示例域名：

- `app.example.com`
- `admin.example.com`
- `api.example.com`

## 2. 服务器基础准备

先更新系统并安装基础软件：

```bash
sudo apt update
sudo apt upgrade -y
sudo apt install -y git nginx
```

安装完成后检查：

```bash
git --version
nginx -v
```

## 3. 准备 Node.js 20+

建议使用你熟悉的方式安装 Node.js 20 或更高版本。无论你用哪种安装方式，最终都要确认：

```bash
node -v
npm -v
corepack --version
```

如果 `corepack` 不可用，可启用：

```bash
corepack enable
```

## 4. 拉取代码

建议目录：

```text
/srv/mx-work-notes
```

执行：

```bash
sudo mkdir -p /srv
sudo chown -R $USER:$USER /srv
git clone git@github.com:SuperMua/mx-work-notes.git /srv/mx-work-notes
cd /srv/mx-work-notes
```

## 5. 环境变量准备

复制模板：

```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env
cp apps/admin/.env.example apps/admin/.env
```

修改为正式值。

### 5.1 API 示例

```bash
DATABASE_URL=postgresql://dbuser:dbpassword@db-host:5432/smart_notes?schema=public
JWT_SECRET=请替换为强随机密钥
PORT=3000
NODE_ENV=production
```

### 5.2 前台示例

```bash
VITE_API_BASE_URL=https://api.example.com
```

### 5.3 后台示例

```bash
VITE_API_BASE_URL=https://api.example.com
```

## 6. 安装依赖与初始化

```bash
cd /srv/mx-work-notes
corepack pnpm install
corepack pnpm db:generate
corepack pnpm db:migrate
```

如果你在验收环境需要默认账号，可临时执行：

```bash
SEED_OWNER_EMAIL=admin@example.com SEED_OWNER_PASSWORD=强密码 corepack pnpm db:seed
```

## 7. 构建项目

```bash
cd /srv/mx-work-notes
corepack pnpm build
```

构建结果：

- `apps/web/dist`
- `apps/admin/dist`
- `apps/api/dist/apps/api/src/main.js`

## 8. 发布静态文件

创建发布目录：

```bash
sudo mkdir -p /var/www/mx-web
sudo mkdir -p /var/www/mx-admin
sudo chown -R $USER:$USER /var/www/mx-web
sudo chown -R $USER:$USER /var/www/mx-admin
```

复制构建产物：

```bash
cp -r /srv/mx-work-notes/apps/web/dist/* /var/www/mx-web/
cp -r /srv/mx-work-notes/apps/admin/dist/* /var/www/mx-admin/
```

## 9. 配置 API 为 systemd 服务

创建文件：

```bash
sudo nano /etc/systemd/system/mx-api.service
```

示例内容：

```ini
[Unit]
Description=MX Work Notes API
After=network.target

[Service]
Type=simple
WorkingDirectory=/srv/mx-work-notes
Environment=NODE_ENV=production
ExecStart=/usr/bin/node /srv/mx-work-notes/apps/api/dist/apps/api/src/main.js
Restart=always
RestartSec=5
User=www-data
Group=www-data

[Install]
WantedBy=multi-user.target
```

检查你的 Node 路径：

```bash
which node
```

如果不是 `/usr/bin/node`，请替换为实际路径。

启用服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable mx-api
sudo systemctl start mx-api
sudo systemctl status mx-api
```

查看运行日志：

```bash
journalctl -u mx-api -f
```

## 10. 配置 Nginx

### 10.1 前台站点

创建：

```bash
sudo nano /etc/nginx/sites-available/mx-web
```

内容：

```nginx
server {
    listen 80;
    server_name app.example.com;
    root /var/www/mx-web;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 10.2 后台站点

创建：

```bash
sudo nano /etc/nginx/sites-available/mx-admin
```

内容：

```nginx
server {
    listen 80;
    server_name admin.example.com;
    root /var/www/mx-admin;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

### 10.3 API 站点

创建：

```bash
sudo nano /etc/nginx/sites-available/mx-api
```

内容：

```nginx
server {
    listen 80;
    server_name api.example.com;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 10.4 启用配置

```bash
sudo ln -s /etc/nginx/sites-available/mx-web /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/mx-admin /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/mx-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 11. 配置 HTTPS

你可以使用：

- Certbot
- 云负载均衡证书
- 其他证书托管方案

不管使用哪种方式，最终目标一致：

- 前台走 `https://app.example.com`
- 后台走 `https://admin.example.com`
- API 走 `https://api.example.com`

同时要确保前台和后台构建前写入的 `VITE_API_BASE_URL` 已是 HTTPS 地址。

## 12. 健康检查与上线验证

先检查 API：

```bash
curl http://127.0.0.1:3000/health
curl https://api.example.com/health
```

再检查：

- 前台登录页是否可打开
- 后台登录页是否可打开
- 前台是否可登录
- 后台是否可登录
- 便签创建、编辑、归档、删除是否正常

## 13. 防火墙建议

如果服务器启用了 `ufw`，建议：

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

不要直接向公网开放 `3000`，只保留 Nginx 暴露。

## 14. 更新流程

```bash
cd /srv/mx-work-notes
git pull
corepack pnpm install
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm build
cp -r apps/web/dist/* /var/www/mx-web/
cp -r apps/admin/dist/* /var/www/mx-admin/
sudo systemctl restart mx-api
sudo systemctl status mx-api
sudo nginx -t
sudo systemctl reload nginx
```

## 15. 回滚建议

若新版本有问题，优先按这个顺序回滚：

1. 回滚前后台静态产物
2. 回滚 API 构建产物和代码
3. 谨慎处理数据库 migration，不要盲目逆向回退

## 16. 最终建议

如果你希望环境尽量标准、可控、易于迁移，这一套 Ubuntu + Nginx + systemd 方案，是当前项目最推荐的正式部署方式之一。
