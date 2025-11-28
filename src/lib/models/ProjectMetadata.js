import mongoose from 'mongoose';

const projectMetadataSchema = new mongoose.Schema({
  projectId: {
    type: String,
    required: true,
    unique: true
  },
  customTitle: {
    type: String,
    default: null,
    maxlength: 200
  },
  notes: {
    type: String,
    default: null,
    maxlength: 5000
  },
  tags: {
    type: [String],
    default: [],
    validate: {
      validator: (tags) => {
        // 标签数量限制
        if (!Array.isArray(tags)) return false;
        return tags.length <= 20;
      },
      message: '标签数量不能超过 20 个'
    }
  }
}, {
  timestamps: true  // 自动添加 createdAt 和 updatedAt
});

// 唯一索引：projectId（确保一个项目只有一条元数据记录）
projectMetadataSchema.index({ projectId: 1 }, { unique: true });

// 普通索引：tags（支持按标签过滤查询）
projectMetadataSchema.index({ tags: 1 });

// 文本索引：customTitle 和 notes（支持全文搜索）
projectMetadataSchema.index({ 
  customTitle: 'text', 
  notes: 'text' 
});

const ProjectMetadata = mongoose.models.ProjectMetadata || mongoose.model('ProjectMetadata', projectMetadataSchema);

export default ProjectMetadata;
