# ⚙️ 实时数据代理后端

## 作用

为 Web Demo 提供**每设备每日限额**的实时足球数据查询能力：

| 端点 | 数据来源 | 配额消耗 |
|:-----|:---------|:--------:|
| `GET /api/live-scores` | football-data.org | 1 次 |
| `GET /api/player?name=X` | api-sports.io | 1 次 |
| `GET /api/match-stats?id=X` | api-sports.io | 1 次 |
| `GET /api/quota` | 本地计算 | 0 次 |

**每设备每天最多消耗 5 次配额**（可在 `.env` 中调整）。

## 部署方式

### 方式一：在现有服务器部署（推荐，已有腾讯云）

1. **上传后端代码到服务器**

```bash
scp -r backend/ user@your-server:~/worldcup-backend/
```

2. **安装依赖**

```bash
cd ~/worldcup-backend
npm install
```

3. **配置 API Key**

```bash
cp .env.example .env
nano .env
# 填入你的 football-data / api-sports 真实 API Key
```

4. **启动**

```bash
# 前台测试
node server.js

# 后台持久运行（用 PM2）
npm install -g pm2
pm2 start server.js --name worldcup-backend
pm2 save
pm2 startup
```

5. **配置 Nginx 反向代理**（可选，如果需要 HTTPS/域名）

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3030;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

6. **修改前端 CONFIG.js**

打开 `CONFIG.js`，将 `BACKEND_URL` 改为你的服务器地址：

```diff
- BACKEND_URL: ''
+ BACKEND_URL: 'http://your-server-ip:3030'
# 或者如果配了域名
+ BACKEND_URL: 'https://api.yourdomain.com'
```

### 方式二：本地开发测试

```bash
cd backend
npm install
cp .env.example .env
# 编辑 .env 填入 API Key
node server.js
# 后端运行在 http://localhost:3030
```

然后修改 `CONFIG.js`：

```diff
- BACKEND_URL: ''
+ BACKEND_URL: 'http://localhost:3030'
```

## 速率限制原理

```
每台设备的身份标识 = IP 地址 + User-Agent + 浏览器指纹（X-Device-Fingerprint 头）

存储方式: rate-limit-db.json（持久化，重启不丢）

限制策略:
  每天每设备最多 5 次实时数据查询
  跨日自动清零
  超限返回 HTTP 429 + 友好提示

配额查询 GET /api/quota 不消耗配额
```

## 安全性

- API Key **只在后端保存**，不出现在前端代码中
- 前端通过后端的 proxy 间接调用第三方 API
- 即使有人恶意刷后端，也只会耗尽自己的设备配额，不会影响到你的 API Key
