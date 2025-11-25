import mongoose from 'mongoose';

const apiKeySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true,
    unique: true
  },
  projectId: {
    type: String,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// 普通索引：projectId（关联查询）
apiKeySchema.index({ projectId: 1 });

// 普通索引：isActive（激活状态过滤）
apiKeySchema.index({ isActive: 1 });

const ApiKey = mongoose.models.ApiKey || mongoose.model('ApiKey', apiKeySchema);

export default ApiKey;
