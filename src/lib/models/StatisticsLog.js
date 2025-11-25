import mongoose from 'mongoose';

const statisticsLogSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    index: true
  },
  hour: {
    type: Number,
    required: true,
    min: 0,
    max: 23,
    index: true
  },
  projectId: {
    type: String,
    required: true,
    index: true
  },
  projectName: {
    type: String,
    default: null
  },
  queueId: {
    type: String,
    required: true,
    index: true
  },
  queueName: {
    type: String,
    default: null
  },
  taskId: {
    type: String,
    required: true
  },
  previousStatus: {
    type: String,
    required: true
  },
  newStatus: {
    type: String,
    required: true
  },
  isExecution: {
    type: Boolean,
    default: false,
    index: true
  },
  executionResult: {
    type: String,
    enum: ['success', 'failure', null],
    default: null
  },
  executionDuration: {
    type: Number,
    default: null
  },
  clientInfo: {
    username: { type: String, default: null },
    hostname: { type: String, default: null, index: true },
    project_path: { type: String, default: null }
  },
  apiKeyName: {
    type: String,
    default: null,
    index: true
  },
  errorMessage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// 复合索引：用于按日期和项目查询
statisticsLogSchema.index({ date: -1, projectId: 1 });

// 复合索引：用于按队列统计
statisticsLogSchema.index({ date: -1, queueId: 1 });

// 复合索引：用于按小时统计
statisticsLogSchema.index({ date: -1, hour: 1 });

const StatisticsLog = mongoose.models.StatisticsLog || mongoose.model('StatisticsLog', statisticsLogSchema);

export default StatisticsLog;

