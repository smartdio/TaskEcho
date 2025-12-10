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
    default: null
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

// 拉取历史记录子文档 Schema
const pullHistorySchema = new mongoose.Schema({
  pulled_at: {
    type: Date,
    required: true
  },
  pulled_by: {
    type: String,
    default: null
  },
  released_at: {
    type: Date,
    default: null
  },
  released_by: {
    type: String,
    default: null
  }
}, { _id: false });

// 独立任务 Schema（用于项目级任务，不属于任何队列）
const taskSchema = new mongoose.Schema({
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
    index: true
  },
  taskId: {
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
    type: [String],
    default: []
  },
  status: {
    type: String,
    enum: ['pending', 'running', 'done', 'error', 'cancelled'],
    default: 'pending'
  },
  report: {
    type: String,
    default: null
  },
  tags: {
    type: [String],
    default: []
  },
  // 拉取功能相关字段
  source: {
    type: String,
    enum: ['server', 'client'],
    default: 'server'  // 项目级任务默认是服务端创建的
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  },
  server_modified_at: {
    type: Date,
    default: Date.now  // 项目级任务默认是服务端修改的
  },
  pulled_at: {
    type: Date,
    default: null
  },
  pulled_by: {
    type: String,
    default: null
  },
  priority: {
    type: mongoose.Schema.Types.Mixed,  // 支持 String ('high', 'medium', 'low') 或 Number (1-10)
    default: null
  },
  expires_at: {
    type: Date,
    default: null
  },
  deleted_at: {
    type: Date,
    default: null
  },
  pull_history: {
    type: [pullHistorySchema],
    default: []
  },
  messages: [messageSchema],
  logs: [logSchema]
}, {
  timestamps: true
});

// 复合唯一索引：项目内任务唯一
taskSchema.index({ projectId: 1, taskId: 1 }, { unique: true });

// 拉取功能相关索引
taskSchema.index({ projectId: 1, source: 1, pulled_at: 1 });
taskSchema.index({ projectId: 1, source: 1, deleted_at: 1 });
taskSchema.index({ projectId: 1, source: 1, pulled_at: 1, deleted_at: 1 });
taskSchema.index({ source: 1 });
taskSchema.index({ pulled_at: 1 });
taskSchema.index({ deleted_at: 1 });
taskSchema.index({ server_modified_at: 1 });
taskSchema.index({ priority: 1 });

const Task = mongoose.models.Task || mongoose.model('Task', taskSchema);

export default Task;







