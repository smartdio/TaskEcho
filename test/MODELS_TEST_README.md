# 数据库模型测试说明

## 概述

`test/models_test.js` 是数据库模型的单元测试脚本，用于测试 Project、Queue、ApiKey 模型的基本功能。

## 运行测试

### 前置条件

1. **MongoDB 服务**：确保 MongoDB 服务正在运行
2. **环境变量**：配置 `MONGODB_URI` 环境变量

### 配置 MongoDB 连接

#### 方式1：使用环境变量

```bash
export MONGODB_URI="mongodb://localhost:27017/taskecho_test"
node test/models_test.js
```

#### 方式2：使用 .env.local 文件

在项目根目录的 `.env.local` 文件中设置：

```bash
MONGODB_URI="mongodb://localhost:27017/taskecho_test"
```

然后运行：

```bash
node test/models_test.js
```

#### 方式3：如果 MongoDB 需要认证

```bash
export MONGODB_URI="mongodb://username:password@localhost:27017/taskecho_test"
node test/models_test.js
```

### 运行测试

```bash
cd /Users/smart/Documents/workspace/ai/TaskEcho
node test/models_test.js
```

## 测试内容

### 1. 数据库连接测试
- 测试 MongoDB 连接是否成功

### 2. Project 模型测试
- 创建项目
- 查询项目
- 更新项目
- 唯一性约束（projectId）
- 删除项目

### 3. Queue 模型测试
- 创建队列（包含任务）
- 查询队列
- 添加消息到任务
- 添加日志到任务
- 更新任务状态
- 复合唯一性约束（projectId, queueId）
- 列表查询（排除 messages 和 logs）
- 删除队列

### 4. ApiKey 模型测试
- 创建 API Key
- 查询 API Key
- 更新 API Key
- 唯一性约束（key）
- 删除 API Key

## 测试输出示例

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  数据库模型单元测试
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

使用 MongoDB URI: mongodb://***:***@localhost:27017/taskecho_test

✓ 数据库连接

--- 测试 Project 模型 ---
✓ 创建项目
✓ 查询项目
✓ 更新项目
✓ 唯一性约束
✓ 删除项目

--- 测试 Queue 模型 ---
✓ 创建队列（包含任务）
✓ 查询队列
✓ 添加消息到任务
✓ 添加日志到任务
✓ 更新任务状态
✓ 复合唯一性约束
✓ 列表查询（排除大字段）
✓ 删除队列

--- 测试 ApiKey 模型 ---
✓ 创建 API Key
✓ 查询 API Key
✓ 更新 API Key
✓ API Key 唯一性约束
✓ 删除 API Key

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  测试统计
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  总测试数: 20
  通过: 20
  失败: 0
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ 所有测试通过！
```

## 故障排除

### MongoDB 连接失败

**错误信息**：`MongoServerError: connect ECONNREFUSED`

**解决方案**：
1. 确保 MongoDB 服务正在运行：`mongod` 或 `brew services start mongodb-community`
2. 检查 MongoDB 端口是否正确（默认 27017）
3. 检查防火墙设置

### MongoDB 认证错误

**错误信息**：`command insert requires authentication` 或 `Unauthorized`

**解决方案**：
1. 如果 MongoDB 启用了认证，需要在连接字符串中包含用户名和密码：
   ```bash
   export MONGODB_URI="mongodb://username:password@localhost:27017/taskecho_test"
   ```
2. 或者禁用 MongoDB 认证（仅用于开发环境）：
   - 编辑 MongoDB 配置文件，注释掉 `security.authorization: enabled`
   - 重启 MongoDB 服务

### 测试数据库清理

测试脚本会在运行前后清理测试数据。如果清理失败（由于认证问题），测试会继续运行，但可能会影响后续测试。

## 注意事项

1. **测试数据库**：测试使用独立的数据库 `taskecho_test`，不会影响生产数据
2. **数据清理**：测试前后会自动清理测试数据
3. **索引警告**：如果看到 Mongoose 索引警告，说明存在重复索引定义，已修复
4. **环境变量**：测试脚本会优先使用环境变量中的 `MONGODB_URI`，如果没有设置，则使用默认值

## 下一步

测试通过后，可以：
1. 在 API 路由中使用这些模型
2. 实现 API 端点
3. 编写 API 集成测试
