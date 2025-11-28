# TaskEcho 生产环境部署检查清单

本文档列出了在部署到生产环境之前需要完成的所有检查和优化项。

## ✅ 已完成的改进

### 1. 安全性改进

- [x] **JWT_SECRET 验证**：生产环境必须设置，否则应用无法启动
- [x] **ENCRYPTION_KEY 验证**：生产环境必须设置，否则应用无法启动
- [x] **环境变量验证**：应用启动时自动验证必需的环境变量
- [x] **安全头配置**：Next.js 配置中添加了安全响应头
  - X-Frame-Options: SAMEORIGIN
  - X-Content-Type-Options: nosniff
  - X-XSS-Protection: 1; mode=block
  - Strict-Transport-Security
  - Referrer-Policy
- [x] **错误日志改进**：生产环境错误日志写入文件

### 2. 配置优化

- [x] **Next.js 生产配置**：
  - 启用 gzip 压缩
  - 配置安全响应头
  - 禁用生产环境源映射（提高安全性）
  - 优化图片格式支持

### 3. 文档完善

- [x] **生产环境部署文档**：创建了详细的部署指南
- [x] **环境变量验证工具**：创建了环境变量验证模块
- [x] **README 更新**：添加了生产环境快速参考

## ⚠️ 建议的后续优化（可选）

### 1. API 限流（推荐）

**当前状态**：未实现

**建议**：添加 API 请求频率限制，防止恶意请求和滥用

**实现方案**：
- 使用 `express-rate-limit` 或类似库
- 为不同 API 端点设置不同的限流策略
- 记录限流违规日志

**优先级**：中

### 2. CORS 配置

**当前状态**：未明确配置

**建议**：如果 API 需要跨域访问，明确配置 CORS

**实现方案**：
```javascript
// next.config.mjs
const nextConfig = {
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [
          {
            key: 'Access-Control-Allow-Origin',
            value: 'https://your-domain.com'
          },
          // ...
        ],
      },
    ];
  },
};
```

**优先级**：低（单用户本地应用可能不需要）

### 3. 错误追踪服务集成

**当前状态**：预留了接口，但未实现

**建议**：集成 Sentry、LogRocket 等错误追踪服务

**实现方案**：
- 在 `src/lib/errorLogger.js` 中集成 Sentry
- 配置错误过滤和采样
- 设置错误通知

**优先级**：低（可根据需要添加）

### 4. 性能监控

**当前状态**：未实现

**建议**：添加性能监控和 APM（应用性能监控）

**实现方案**：
- 集成 New Relic、Datadog 等 APM 服务
- 监控 API 响应时间
- 监控数据库查询性能
- 设置性能告警

**优先级**：低（可根据需要添加）

### 5. 数据库连接池优化

**当前状态**：使用 Mongoose 默认连接池

**建议**：根据实际负载调整连接池大小

**实现方案**：
```javascript
// src/lib/mongoose.js
const opts = {
  maxPoolSize: 10, // 最大连接数
  minPoolSize: 2, // 最小连接数
  // ...
};
```

**优先级**：低（单用户应用通常不需要）

### 6. 日志轮转

**当前状态**：日志直接写入文件，可能无限增长

**建议**：使用日志轮转工具（如 `winston`、`pino`）

**实现方案**：
- 按大小或时间轮转日志文件
- 自动清理旧日志
- 压缩历史日志

**优先级**：中

### 7. 健康检查端点

**当前状态**：未实现

**建议**：添加 `/api/health` 端点用于健康检查

**实现方案**：
```javascript
// src/app/api/health/route.js
export async function GET() {
  try {
    await connectDB();
    return Response.json({ status: 'ok', timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json({ status: 'error', error: error.message }, { status: 503 });
  }
}
```

**优先级**：中（便于监控和负载均衡）

### 8. API 文档

**当前状态**：有文档，但可以更完善

**建议**：使用 Swagger/OpenAPI 生成交互式 API 文档

**优先级**：低

## 📋 部署前检查清单

在部署到生产环境之前，请确认：

### 环境变量

- [ ] `MONGODB_URI` 已设置（包含认证信息）
- [ ] `ENCRYPTION_KEY` 已设置（64 字符十六进制）
- [ ] `JWT_SECRET` 已设置（强随机字符串）
- [ ] `NODE_ENV=production` 已设置
- [ ] 所有环境变量已正确配置

### 数据库

- [ ] MongoDB 服务正常运行
- [ ] MongoDB 已启用认证
- [ ] 数据库连接字符串正确
- [ ] 已创建数据库备份策略

### 安全

- [ ] 使用 HTTPS（生产环境）
- [ ] 防火墙已配置
- [ ] API Key 已妥善保管
- [ ] 敏感信息不在代码中硬编码

### 应用

- [ ] 已执行 `npm run build` 构建成功
- [ ] 应用可以正常启动
- [ ] 所有 API 端点正常工作
- [ ] 前端页面可以正常访问

### 监控和日志

- [ ] 日志目录已创建（`logs/`）
- [ ] 日志文件权限正确
- [ ] 已设置日志清理策略
- [ ] 已配置错误通知（如需要）

### 性能

- [ ] 已测试应用性能
- [ ] 数据库查询已优化
- [ ] 已配置适当的缓存策略（如需要）

## 🚀 快速部署命令

```bash
# 1. 设置环境变量（在 .env.local 或系统环境变量中）
export MONGODB_URI="mongodb://..."
export ENCRYPTION_KEY="..."
export JWT_SECRET="..."
export NODE_ENV="production"

# 2. 安装依赖
npm ci

# 3. 构建应用
npm run build

# 4. 启动应用（使用 PM2 推荐）
pm2 start ecosystem.config.js

# 或使用启动脚本
./start.sh -m prod -p 3000 -d -b
```

## 📚 相关文档

- [生产环境部署指南](./deployment.md)
- [API 文档](./guide/api-guide.md)
- [README](../README.md)

## 🔗 有用的链接

- [Next.js 生产部署文档](https://nextjs.org/docs/deployment)
- [MongoDB 安全最佳实践](https://www.mongodb.com/docs/manual/administration/security-checklist/)
- [Node.js 生产最佳实践](https://github.com/goldbergyoni/nodebestpractices)

