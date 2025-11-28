# TaskEcho 生产环境部署指南

本文档说明如何将 TaskEcho 部署到生产环境。

## 目录

1. [前置要求](#前置要求)
2. [环境变量配置](#环境变量配置)
3. [构建和启动](#构建和启动)
4. [部署选项](#部署选项)
5. [安全检查清单](#安全检查清单)
6. [监控和维护](#监控和维护)

## 前置要求

### 系统要求

- **Node.js**: 18.17 或更高版本（推荐 20.x LTS）
- **npm**: 9.x 或更高版本
- **MongoDB**: 4.4 或更高版本（本地或远程实例）

### 依赖安装

```bash
# 安装生产依赖
npm ci
```

## 环境变量配置

### 必需的环境变量

生产环境**必须**设置以下环境变量：

1. **MONGODB_URI**: MongoDB 连接字符串
2. **ENCRYPTION_KEY**: API Key 加密密钥（64 字符十六进制）
3. **JWT_SECRET**: JWT Token 密钥

### 创建环境变量文件

创建 `.env.local` 文件（或使用系统环境变量）：

```bash
# MongoDB 连接字符串
MONGODB_URI="mongodb://username:password@host:port/database?authSource=admin"
# 或 MongoDB Atlas
# MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/taskecho"

# API Key 加密密钥（64 字符十六进制，32 字节）
# 生成方法：
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY="your-64-character-hex-encryption-key-here"

# JWT Token 密钥
# 生成方法：
#   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="your-jwt-secret-key-here"

# 可选：JWT Token 过期时间（默认: 7d）
JWT_EXPIRES_IN="7d"

# 可选：应用端口（默认: 3000）
PORT=3000
```

### 生成密钥

#### 生成 ENCRYPTION_KEY

```bash
# 方法一：使用 Node.js（推荐）
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 方法二：使用 OpenSSL
openssl rand -hex 32

# 方法三：使用 Python
python3 -c "import secrets; print(secrets.token_hex(32))"
```

#### 生成 JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 环境变量验证

应用启动时会自动验证环境变量。如果生产环境缺少必需的环境变量，应用将无法启动。

## 构建和启动

### 方式一：使用启动脚本（推荐）

```bash
# 构建并启动生产服务器（守护进程模式）
./start.sh -m prod -p 3000 -d -b

# 查看日志
tail -f logs/startup.log

# 停止服务
./start.sh -p 3000 -stop
```

### 方式二：手动构建和启动

```bash
# 1. 构建生产版本
npm run build

# 2. 启动生产服务器
NODE_ENV=production npm start

# 或指定端口
PORT=3000 NODE_ENV=production npm start
```

### 方式三：使用 PM2（推荐用于生产环境）

```bash
# 安装 PM2
npm install -g pm2

# 创建 PM2 配置文件 ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'taskecho',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    instances: 1,
    exec_mode: 'fork',
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '500M'
  }]
};
EOF

# 启动应用
pm2 start ecosystem.config.js

# 查看状态
pm2 status

# 查看日志
pm2 logs taskecho

# 停止应用
pm2 stop taskecho

# 重启应用
pm2 restart taskecho

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

## 部署选项

### 1. 自托管部署（VPS/服务器）

#### 使用 Nginx 作为反向代理

```nginx
# /etc/nginx/sites-available/taskecho
server {
    listen 80;
    server_name your-domain.com;

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：

```bash
sudo ln -s /etc/nginx/sites-available/taskecho /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 2. Docker 部署

创建 `Dockerfile`：

```dockerfile
FROM node:20-alpine

WORKDIR /app

# 复制依赖文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用
RUN npm run build

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["npm", "start"]
```

创建 `docker-compose.yml`：

```yaml
version: '3.8'

services:
  taskecho:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - MONGODB_URI=${MONGODB_URI}
      - ENCRYPTION_KEY=${ENCRYPTION_KEY}
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  # MongoDB（可选，如果使用本地 MongoDB）
  # mongodb:
  #   image: mongo:7
  #   ports:
  #     - "27017:27017"
  #   volumes:
  #     - mongodb_data:/data/db
  #   restart: unless-stopped

# volumes:
#   mongodb_data:
```

启动：

```bash
docker-compose up -d
```

### 3. Vercel 部署

```bash
# 安装 Vercel CLI
npm i -g vercel

# 部署
vercel --prod

# 设置环境变量（在 Vercel 控制台或使用 CLI）
vercel env add MONGODB_URI
vercel env add ENCRYPTION_KEY
vercel env add JWT_SECRET
```

## 安全检查清单

部署前请确认：

- [ ] ✅ 已设置 `ENCRYPTION_KEY`（64 字符十六进制）
- [ ] ✅ 已设置 `JWT_SECRET`（强随机字符串）
- [ ] ✅ 已设置 `MONGODB_URI`（包含认证信息）
- [ ] ✅ MongoDB 已启用认证
- [ ] ✅ 使用 HTTPS（生产环境）
- [ ] ✅ 防火墙已配置（仅开放必要端口）
- [ ] ✅ 定期备份 MongoDB 数据库
- [ ] ✅ 日志文件权限已正确设置
- [ ] ✅ 已禁用或限制不必要的 API 端点
- [ ] ✅ 已设置 API Key 访问限制（如需要）

## 监控和维护

### 日志管理

- **应用日志**: `logs/startup.log`
- **错误日志**: `logs/error.log`

定期清理旧日志：

```bash
# 清理 7 天前的日志
find logs/ -name "*.log" -mtime +7 -delete
```

### 数据库备份

```bash
# MongoDB 备份
mongodump --uri="mongodb://username:password@host:port/database" --out=/backup/taskecho-$(date +%Y%m%d)

# 恢复备份
mongorestore --uri="mongodb://username:password@host:port/database" /backup/taskecho-20240101
```

### 性能监控

- 监控 MongoDB 连接数
- 监控 API 响应时间
- 监控内存和 CPU 使用率
- 监控错误率

### 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 安装依赖
npm ci

# 3. 构建
npm run build

# 4. 重启应用
pm2 restart taskecho
# 或
./start.sh -m prod -p 3000 -d
```

## 故障排查

### 应用无法启动

1. 检查环境变量是否设置正确
2. 检查 MongoDB 连接是否正常
3. 查看 `logs/startup.log` 和 `logs/error.log`
4. 检查端口是否被占用

### MongoDB 连接失败

1. 检查 MongoDB 服务是否运行
2. 验证连接字符串格式
3. 检查网络连接和防火墙
4. 验证用户名和密码

### API Key 无法解密

1. 确认 `ENCRYPTION_KEY` 与创建 API Key 时使用的密钥一致
2. 检查密钥格式（64 字符十六进制）
3. 如果密钥丢失，需要重新创建所有 API Key

## 支持

如有问题，请查看：
- [README.md](../README.md)
- [API 文档](./guide/api-guide.md)
- [问题反馈](https://github.com/your-repo/issues)

