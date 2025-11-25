import mongoose from 'mongoose';

const projectSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  clientInfo: {
    username: {
      type: String,
      default: null
    },
    hostname: {
      type: String,
      default: null
    },
    project_path: {
      type: String,
      default: null
    }
  },
  lastTaskAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true  // 自动添加 createdAt 和 updatedAt
});

// 普通索引：lastTaskAt（用于首页排序）
projectSchema.index({ lastTaskAt: -1 });

const Project = mongoose.models.Project || mongoose.model('Project', projectSchema);

export default Project;
