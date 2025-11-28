/**
 * GET /api/v1/projects/[projectId]/metadata
 * 获取项目元数据
 * 
 * PUT /api/v1/projects/[projectId]/metadata
 * 创建或更新项目元数据
 * 
 * DELETE /api/v1/projects/[projectId]/metadata
 * 删除项目元数据
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import ProjectMetadata from '@/lib/models/ProjectMetadata';

/**
 * 获取项目元数据
 */
async function handleGET(request, context) {
  try {
    // 连接数据库
    await connectDB();

    // 解析路径参数
    const { projectId } = context.params;

    // 验证项目是否存在
    const project = await Project.findOne({ projectId }).lean();
    if (!project) {
      return createErrorResponse(
        '项目不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId }
      );
    }

    // 查询元数据
    const metadata = await ProjectMetadata.findOne({ projectId }).lean();

    // 如果元数据不存在，返回空数据
    if (!metadata) {
      return createSuccessResponse({
        projectId,
        customTitle: null,
        notes: null,
        tags: []
      }, '查询成功');
    }

    // 返回格式化后的元数据
    const metadataData = {
      projectId: metadata.projectId,
      customTitle: metadata.customTitle || null,
      notes: metadata.notes || null,
      tags: metadata.tags || [],
      createdAt: metadata.createdAt.toISOString(),
      updatedAt: metadata.updatedAt.toISOString()
    };

    return createSuccessResponse(metadataData, '查询成功');

  } catch (error) {
    console.error('获取项目元数据失败:', error);
    return createErrorResponse(
      error.message || '获取项目元数据失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

/**
 * 创建或更新项目元数据
 */
async function handlePUT(request, context) {
  try {
    // 连接数据库
    await connectDB();

    // 解析路径参数
    const { projectId } = context.params;

    // 验证项目是否存在
    const project = await Project.findOne({ projectId }).lean();
    if (!project) {
      return createErrorResponse(
        '项目不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId }
      );
    }

    // 解析请求体
    const data = await request.json();
    const { customTitle, notes, tags } = data;

    // 验证 customTitle
    if (customTitle !== undefined && customTitle !== null) {
      if (typeof customTitle !== 'string') {
        return createErrorResponse(
          'customTitle 必须是字符串',
          ERROR_CODES.VALIDATION_ERROR,
          400,
          { field: 'customTitle' }
        );
      }
      if (customTitle.length > 200) {
        return createErrorResponse(
          'customTitle 长度不能超过 200 个字符',
          ERROR_CODES.VALIDATION_ERROR,
          400,
          { field: 'customTitle', maxLength: 200 }
        );
      }
    }

    // 验证 notes
    if (notes !== undefined && notes !== null) {
      if (typeof notes !== 'string') {
        return createErrorResponse(
          'notes 必须是字符串',
          ERROR_CODES.VALIDATION_ERROR,
          400,
          { field: 'notes' }
        );
      }
      if (notes.length > 5000) {
        return createErrorResponse(
          'notes 长度不能超过 5000 个字符',
          ERROR_CODES.VALIDATION_ERROR,
          400,
          { field: 'notes', maxLength: 5000 }
        );
      }
    }

    // 验证 tags
    if (tags !== undefined && tags !== null) {
      if (!Array.isArray(tags)) {
        return createErrorResponse(
          'tags 必须是数组',
          ERROR_CODES.VALIDATION_ERROR,
          400,
          { field: 'tags' }
        );
      }
      if (tags.length > 20) {
        return createErrorResponse(
          '标签数量不能超过 20 个',
          ERROR_CODES.VALIDATION_ERROR,
          400,
          { field: 'tags', maxCount: 20 }
        );
      }
      // 验证每个标签
      for (let i = 0; i < tags.length; i++) {
        const tag = tags[i];
        if (typeof tag !== 'string') {
          return createErrorResponse(
            `tags[${i}] 必须是字符串`,
            ERROR_CODES.VALIDATION_ERROR,
            400,
            { field: `tags[${i}]` }
          );
        }
        if (tag.length > 50) {
          return createErrorResponse(
            `标签长度不能超过 50 个字符`,
            ERROR_CODES.VALIDATION_ERROR,
            400,
            { field: `tags[${i}]`, maxLength: 50 }
          );
        }
      }
    }

    // 处理标签：去重、转小写、过滤空字符串
    let processedTags = [];
    if (tags !== undefined && tags !== null) {
      processedTags = [...new Set(
        tags
          .map(tag => tag.trim().toLowerCase())
          .filter(tag => tag.length > 0 && tag.length <= 50)
      )];
      
      if (processedTags.length > 20) {
        return createErrorResponse(
          '标签数量不能超过 20 个',
          ERROR_CODES.VALIDATION_ERROR,
          400,
          { field: 'tags', maxCount: 20 }
        );
      }
    }

    // 查找或创建元数据
    let metadata = await ProjectMetadata.findOne({ projectId });

    if (metadata) {
      // 更新现有元数据
      if (customTitle !== undefined) {
        metadata.customTitle = customTitle && customTitle.trim() ? customTitle.trim() : null;
      }
      if (notes !== undefined) {
        metadata.notes = notes && notes.trim() ? notes.trim() : null;
      }
      if (tags !== undefined) {
        metadata.tags = processedTags;
      }
      await metadata.save();
    } else {
      // 创建新元数据
      metadata = await ProjectMetadata.create({
        projectId,
        customTitle: customTitle && customTitle.trim() ? customTitle.trim() : null,
        notes: notes && notes.trim() ? notes.trim() : null,
        tags: processedTags
      });
    }

    // 返回格式化后的元数据
    const metadataData = {
      projectId: metadata.projectId,
      customTitle: metadata.customTitle || null,
      notes: metadata.notes || null,
      tags: metadata.tags || [],
      createdAt: metadata.createdAt.toISOString(),
      updatedAt: metadata.updatedAt.toISOString()
    };

    return createSuccessResponse(metadataData, '更新成功');

  } catch (error) {
    console.error('更新项目元数据失败:', error);
    
    // 处理 Mongoose 验证错误
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return createErrorResponse(
        messages.join(', '),
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    return createErrorResponse(
      error.message || '更新项目元数据失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

/**
 * 删除项目元数据
 */
async function handleDELETE(request, context) {
  try {
    // 连接数据库
    await connectDB();

    // 解析路径参数
    const { projectId } = context.params;

    // 验证项目是否存在
    const project = await Project.findOne({ projectId }).lean();
    if (!project) {
      return createErrorResponse(
        '项目不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId }
      );
    }

    // 删除元数据（如果不存在也返回成功，幂等操作）
    await ProjectMetadata.deleteOne({ projectId });

    return createSuccessResponse(null, '删除成功');

  } catch (error) {
    console.error('删除项目元数据失败:', error);
    return createErrorResponse(
      error.message || '删除项目元数据失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);

export const PUT = createApiHandler(handlePUT, [
  MiddlewarePresets.authenticated
]);

export const DELETE = createApiHandler(handleDELETE, [
  MiddlewarePresets.authenticated
]);
