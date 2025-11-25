/**
 * API Key 管理接口（单个）
 * GET /api/v1/api-keys/:id - 获取单个 API Key 详情
 * PUT /api/v1/api-keys/:id - 更新 API Key
 * DELETE /api/v1/api-keys/:id - 删除 API Key
 */
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, ERROR_CODES, handleError } from '@/lib/api-response';
import connectDB from '@/lib/mongoose';
import ApiKey from '@/lib/models/ApiKey.js';
import Project from '@/lib/models/Project.js';
import { decryptApiKey } from '@/lib/encryption.js';

/**
 * API Key 值部分隐藏函数
 * @param {string} id - API Key ID (MongoDB ObjectId 字符串)
 * @returns {string} 隐藏后的显示格式
 */
function maskApiKey(id) {
  // 使用ID的后4位字符生成显示格式：sk-**** + 后4位
  // MongoDB ObjectId 是24位十六进制字符串，取后4位
  const suffix = id.length >= 4 ? id.slice(-4) : id.padStart(4, '0');
  return `sk-****${suffix}`;
}

/**
 * GET /api/v1/api-keys/:id - 获取单个 API Key 详情
 * 查询参数：
 *   - show_key: 是否显示完整的 API Key（true/false），默认 false
 */
async function handleGET(request, context) {
  try {
    await connectDB();
    
    // 1. 解析路径参数
    const { params } = context;
    const { id } = params;
    
    if (!id) {
      return createErrorResponse(
        'API Key ID 无效',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    // 2. 解析查询参数
    const { searchParams } = new URL(request.url);
    const showKey = searchParams.get('show_key') === 'true';
    
    // 3. 查询 API Key
    const apiKey = await ApiKey.findById(id).lean();
    
    if (!apiKey) {
      return createErrorResponse(
        'API Key 不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { id }
      );
    }
    
    // 4. 处理 API Key 值显示
    let keyDisplay;
    if (showKey) {
      // 解密并显示完整的 API Key
      try {
        keyDisplay = decryptApiKey(apiKey.key);
      } catch (error) {
        // 解密失败，返回隐藏格式
        keyDisplay = maskApiKey(apiKey._id.toString());
      }
    } else {
      // 显示部分隐藏格式
      keyDisplay = maskApiKey(apiKey._id.toString());
    }
    
    // 5. 格式化响应数据
    const apiKeyFormatted = {
      id: apiKey._id.toString(),
      name: apiKey.name,
      key: keyDisplay,
      project_id: apiKey.projectId || null,
      is_active: apiKey.isActive,
      created_at: apiKey.createdAt.toISOString(),
      updated_at: apiKey.updatedAt.toISOString()
    };
    
    // 6. 返回成功响应
    return createSuccessResponse(apiKeyFormatted, '查询成功');
    
  } catch (error) {
    // 处理 MongoDB ObjectId 格式错误
    if (error.name === 'CastError') {
      return createErrorResponse(
        'API Key ID 格式无效',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    return handleError(error);
  }
}

/**
 * PUT /api/v1/api-keys/:id - 更新 API Key
 */
async function handlePUT(request, context) {
  try {
    await connectDB();
    
    // 1. 解析路径参数
    const { params } = context;
    const { id } = params;
    
    if (!id) {
      return createErrorResponse(
        'API Key ID 无效',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    // 2. 解析请求体
    const data = await request.json();
    const { name, project_id, is_active } = data;
    
    // 3. 查询 API Key
    const apiKey = await ApiKey.findById(id);
    
    if (!apiKey) {
      return createErrorResponse(
        'API Key 不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { id }
      );
    }
    
    // 4. 构建更新数据对象
    const updateData = {};
    
    if (name !== undefined) {
      if (!name || !name.trim()) {
        return createErrorResponse(
          'API Key 名称不能为空',
          ERROR_CODES.VALIDATION_ERROR,
          400,
          { field: 'name' }
        );
      }
      if (name.length > 255) {
        return createErrorResponse(
          'API Key 名称长度不能超过 255 字符',
          ERROR_CODES.VALIDATION_ERROR,
          400,
          { field: 'name' }
        );
      }
      updateData.name = name.trim();
    }
    
    if (project_id !== undefined) {
      if (project_id === null || project_id === '') {
        updateData.projectId = null;
      } else {
        // 验证项目是否存在
        const project = await Project.findOne({ projectId: project_id }).lean();
        
        if (!project) {
          return createErrorResponse(
            '关联的项目不存在',
            ERROR_CODES.VALIDATION_ERROR,
            400,
            { field: 'project_id', project_id }
          );
        }
        updateData.projectId = project_id;
      }
    }
    
    if (is_active !== undefined) {
      if (typeof is_active !== 'boolean') {
        return createErrorResponse(
          'is_active 必须是布尔值',
          ERROR_CODES.VALIDATION_ERROR,
          400,
          { field: 'is_active' }
        );
      }
      updateData.isActive = is_active;
    }
    
    // 5. 如果没有提供任何更新字段
    if (Object.keys(updateData).length === 0) {
      return createErrorResponse(
        '请提供至少一个更新字段',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    // 6. 更新 API Key 记录
    const updatedApiKey = await ApiKey.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    ).lean();
    
    // 7. 处理 API Key 值显示（部分隐藏）
    const apiKeyFormatted = {
      id: updatedApiKey._id.toString(),
      name: updatedApiKey.name,
      key: maskApiKey(updatedApiKey._id.toString()),
      project_id: updatedApiKey.projectId || null,
      is_active: updatedApiKey.isActive,
      created_at: updatedApiKey.createdAt.toISOString(),
      updated_at: updatedApiKey.updatedAt.toISOString()
    };
    
    // 8. 返回成功响应
    return createSuccessResponse(
      apiKeyFormatted,
      'API Key 更新成功'
    );
    
  } catch (error) {
    // 处理 MongoDB ObjectId 格式错误
    if (error.name === 'CastError') {
      return createErrorResponse(
        'API Key ID 格式无效',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    return handleError(error);
  }
}

/**
 * DELETE /api/v1/api-keys/:id - 删除 API Key
 */
async function handleDELETE(request, context) {
  try {
    await connectDB();
    
    // 1. 解析路径参数
    const { params } = context;
    const { id } = params;
    
    if (!id) {
      return createErrorResponse(
        'API Key ID 无效',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    // 2. 查询 API Key
    const apiKey = await ApiKey.findById(id);
    
    if (!apiKey) {
      return createErrorResponse(
        'API Key 不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { id }
      );
    }
    
    // 3. 删除 API Key 记录
    await ApiKey.findByIdAndDelete(id);
    
    // 4. 返回成功响应
    return createSuccessResponse(
      { id },
      'API Key 删除成功'
    );
    
  } catch (error) {
    // 处理 MongoDB ObjectId 格式错误
    if (error.name === 'CastError') {
      return createErrorResponse(
        'API Key ID 格式无效',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    return handleError(error);
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
