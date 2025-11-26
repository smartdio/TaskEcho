# TaskEcho

> 本地私有的 API 驱动任务队列与状态监控平台，专注单用户自动化场景的可视化追踪与管理。  
> A local, API-driven task queue and status monitoring platform for visual tracking and management in single-user automation scenarios.



TaskEcho 是一个以 API 驱动的本地任务队列管理应用，专为单用户在本地私有环境下，实现对分布式任务、队列和项目的高效可视化管理而设计。所有数据均由外部系统通过 RESTful API 实时推送同步，应用自身采用只读界面，不提供主动编辑功能，安全轻量，适合自动化场景下的任务集中观测与追踪。界面支持响应式布局和深色模式，兼容手机、平板、桌面端，并提供层级化的管理视图与详细任务日志。此外，TaskEcho 可以与 Cursor 搭配，作为 Cursor 编辑器自动化任务的状态监控与收集面板，助力开发者实现工作流自动化与统一管理。

## 功能特性

- 🚀 **即开即用**：单用户本地应用，无需登录，启动即可使用
- 📊 **三级数据层级**：项目 -> 任务队列 -> 任务，清晰的数据组织结构
- 🔄 **API 驱动**：100% 数据由外部客户端通过 RESTful API 推送
- 📱 **响应式设计**：完全响应式布局，支持手机、平板、桌面端
- 🌓 **主题适配**：自动适配系统深浅色模式
- 🔐 **API Key 管理**：支持添加、删除、编辑 API Key
- 💬 **对话展示**：支持 Markdown 渲染和代码高亮的任务对话展示
- 📝 **日志记录**：独立的任务执行日志区域

## 技术栈

- **开发语言**：JavaScript（不使用 TypeScript）
- **全栈框架**：Next.js（使用 App Router 架构）
- **运行时**：Node.js（前后端统一）
- **前端框架**：React（Next.js Server Components）
- **UI 组件库**：shadcn/ui
- **样式方案**：Tailwind CSS
- **数据存储**：MongoDB（使用 Mongoose ODM）

## 项目结构

```
TaskEcho/
├── src/                    # 源代码目录
│   ├── app/               # Next.js App Router
│   ├── lib/               # 工具库和模型
│   └── components/        # React 组件
├── public/                 # 静态资源
├── doc/                    # 项目文档
│   └── requirement.md     # 需求说明文档
├── README.md              # 项目说明文档
└── ...                    # 其他项目文件
```

## 安装与运行

### 前置要求

- Node.js 18.17 或更高版本（推荐 20.x LTS）
- npm 9.x 或更高版本
- MongoDB（本地或远程 MongoDB 实例）

### 环境配置

1. 创建 `.env.local` 文件（如果不存在）：
```bash
touch .env.local
```

2. 编辑 `.env.local`，配置以下环境变量：

```bash
# MongoDB 连接字符串
MONGODB_URI="mongodb://localhost:27017/taskecho"
# 或使用 MongoDB Atlas
# MONGODB_URI="mongodb+srv://username:password@cluster.mongodb.net/taskecho"

# API Key 加密密钥（生产环境必须设置）
# 生成方法见下方说明
ENCRYPTION_KEY="your-64-character-hex-encryption-key"
```

#### 生成 ENCRYPTION_KEY

`ENCRYPTION_KEY` 用于加密存储 API Key，必须是一个 64 个字符的十六进制字符串（32 字节）。

**方法一：使用 Node.js 生成（推荐）**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**方法二：使用 OpenSSL 生成**
```bash
openssl rand -hex 32
```

**方法三：使用 Python 生成**
```bash
python3 -c "import secrets; print(secrets.token_hex(32))"
```

**重要提示**：
- ⚠️ **生产环境必须设置 `ENCRYPTION_KEY`**，否则每次重启应用都会生成新的随机密钥，导致无法解密已存储的 API Key
- 🔒 请妥善保管 `ENCRYPTION_KEY`，丢失后无法恢复已加密的 API Key
- 🔄 如果更换 `ENCRYPTION_KEY`，所有已存储的 API Key 将无法解密，需要重新创建

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

开发服务器将在 `http://localhost:3000` 启动。

### 构建生产版本

```bash
npm run build
```

### 启动生产服务器

```bash
npm start
```

## API 接口说明

### 核心接口：提交项目、任务队列和任务

**接口**：`POST /api/v1/submit`

**认证方式**：项目专属 API Key（通过 Header 传递）

**请求体格式**：

```json
{
  "project_id": "project_001",
  "project_name": "示例项目",
  "queue_id": "queue_001",
  "queue_name": "任务队列1",
  "tasks": [
    {
      "task_id": "task_001",
      "title": "任务标题",
      "tags": ["tag1", "tag2"],
      "status": "pending",
      "messages": [
        {
          "role": "user",
          "content": "用户消息内容"
        },
        {
          "role": "assistant",
          "content": "AI 回复内容"
        }
      ]
    }
  ]
}
```

**行为规则**（完全幂等）：
- 根据 `project_id` 判断项目是否存在 → 不存在则创建，存在则更新项目名称
- 根据 `project_id + queue_id` 判断任务队列是否存在 → 不存在则创建，存在则更新任务队列名称
- 根据 `project_id + queue_id + task_id` 判断任务是否存在 → 不存在则创建，存在则完全替换该任务的所有字段

**任务状态**：
- `pending`：待处理
- `done`：已完成
- `error`：错误

### 增量更新接口（可选）

- **追加对话消息**：追加单条对话消息（不覆盖历史），需指定 `project_id + queue_id + task_id`
- **追加执行日志**：追加任务执行日志（纯文本，自动带时间戳），需指定 `project_id + queue_id + task_id`
- **修改任务状态**：仅修改任务状态，需指定 `project_id + queue_id + task_id`

## UI 界面说明

### 1. 首页
- 项目列表，按最后任务更新时间倒序排列
- 全局统计：总任务数 / Pending / Done / Error

### 2. 项目详情页
- 单个项目下所有任务队列垂直列表
- 每个任务队列显示：队列名称 + 任务数量统计（总数/Pending/Done/Error）+ 最后更新时间
- 支持按任务队列名称搜索

### 3. 任务队列详情页
- 单个任务队列下所有任务垂直列表
- 每条任务显示：标题 + 标签（多标签彩色展示）+ 状态徽章 + 最后更新时间
- 支持按标签过滤、按状态过滤

### 4. 任务详情页
- 完整对话流程（用户 ↔ AI 多轮），支持 Markdown 渲染和代码高亮
- 下方独立日志区（倒序展示所有推送的日志）
- 页面底部始终保留一个回复输入框 + 发送按钮
  - 发送后仅在本地追加一条 user 消息，不触发任何外部执行（留给外部系统轮询发现）

## 使用说明

1. **启动应用**：运行应用后，无需登录即可直接使用
2. **管理 API Key**：在设置页面添加、编辑或删除 API Key
3. **接收数据**：外部系统通过 API 接口推送项目、任务队列和任务数据
4. **查看数据**：通过首页 -> 项目详情页 -> 任务队列详情页 -> 任务详情页的层级导航查看数据
5. **回复任务**：在任务详情页底部输入框发送回复，回复内容将作为本地消息保存

## 注意事项

- 应用界面完全只读，不支持手动创建、编辑、删除项目、任务队列或任务
- 所有数据操作必须通过 API 接口完成
- 任务详情页的回复功能仅在本地保存消息，不会触发外部系统执行

## 开发说明

详细的需求说明请参考 [doc/requirement.md](./doc/requirement.md)

## License

[待定]

