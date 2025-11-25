import mongoose from 'mongoose';

// 消息子文档 Schema（用于记录任务变化）
const messageSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['USER', 'ASSISTANT'],
    required: true
  },
  content: {
    type: String,
    required: true
  },
  sessionId: {
    type: String,
    default: null  // 可选字段，客户端与 cursor-agent 交互时的对话会话ID
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// 日志子文档 Schema（用于记录任务变化）
const logSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// 任务子文档 Schema
const taskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  prompt: {
    type: String,
    required: true
  },
  spec_file: {
    type: [String],  // 文本数组
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'done', 'error'],
    default: 'pending'
  },
  report: {
    type: String,
    default: null
  },
  messages: [messageSchema],  // 对话消息数组（用于记录任务变化）
  logs: [logSchema]           // 执行日志数组（用于记录任务变化）
}, { _id: false });

// 队列 Schema
const queueSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true
  },
  queueId: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  meta: {
    type: mongoose.Schema.Types.Mixed,  // 支持任意 JSON 结构（类似 prompts）
    default: null
  },
  tasks: [taskSchema],  // 嵌入任务数组
  lastTaskAt: {
    type: Date,
    default: null,
    index: true
  }
}, {
  timestamps: true
});

// 复合唯一索引：项目内队列唯一
queueSchema.index({ projectId: 1, queueId: 1 }, { unique: true });

// 普通索引：projectId（关联查询）
queueSchema.index({ projectId: 1 });

// 普通索引：queueId（查询优化）
queueSchema.index({ queueId: 1 });

// 普通索引：lastTaskAt（排序优化）
queueSchema.index({ lastTaskAt: -1 });

const Queue = mongoose.models.Queue || mongoose.model('Queue', queueSchema);

export default Queue;
