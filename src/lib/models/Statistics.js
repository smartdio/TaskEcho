import mongoose from 'mongoose';

const statisticsSchema = new mongoose.Schema({
  date: {
    type: String,
    required: true,
    index: true
  },
  scope: {
    type: String,
    enum: ['system', 'project'],
    required: true,
    index: true
  },
  projectId: {
    type: String,
    default: null,
    index: true
  },
  projectName: {
    type: String,
    default: null
  },
  execution: {
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    success: {
      type: Number,
      default: 0,
      min: 0
    },
    failure: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  task_status: {
    total: {
      type: Number,
      default: 0,
      min: 0
    },
    pending: {
      type: Number,
      default: 0,
      min: 0
    },
    done: {
      type: Number,
      default: 0,
      min: 0
    },
    error: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  extended: {
    by_queue: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    by_hour: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    execution_duration: {
      total_duration: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      avg: { type: Number, default: 0 }
    },
    by_client: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    by_api_key: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    error_types: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }
}, {
  timestamps: true
});

// 复合唯一索引：确保同一日期、同一范围、同一项目只有一条记录
statisticsSchema.index({ date: 1, scope: 1, projectId: 1 }, { unique: true });

// 查询索引：按日期和范围查询
statisticsSchema.index({ date: -1, scope: 1 });

// 查询索引：按项目查询
statisticsSchema.index({ projectId: 1, date: -1 });

const Statistics = mongoose.models.Statistics || mongoose.model('Statistics', statisticsSchema);

export default Statistics;

