/**
 * API Key 管理接口
 * GET /api/v1/api-keys - 获取 API Key 列表
 * POST /api/v1/api-keys - 创建 API Key
 */
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, createPaginatedResponse, ERROR_CODES, handleError } from '@/lib/api-response';
import connectDB from '@/lib/mongoose';
import ApiKey from '@/lib/models/ApiKey.js';
import Project from '@/lib/models/Project.js';
import { encryptApiKey, decryptApiKey, verifyApiKey } from '@/lib/encryption.js';
import crypto from 'crypto';

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
 * GET /api/v1/api-keys - 获取 API Key 列表
 */
async function handleGET(request, context) {
  try {
    await connectDB();
    
    // 1. 解析查询参数
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));
    const isActive = searchParams.get('is_active');
    const projectId = searchParams.get('project_id')?.trim();
    
    // 2. 验证参数
    if (page < 1 || pageSize < 1) {
      return createErrorResponse(
        '页码和每页数量必须大于 0',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    // 3. 构建查询条件
    const where = {};
    
    if (isActive !== undefined && isActive !== null) {
      where.isActive = isActive === 'true' || isActive === true;
    }
    
    if (projectId) {
      where.projectId = projectId;
    }
    
    // 4. 查询 API Key 列表
    const [apiKeys, total] = await Promise.all([
      ApiKey.find(where)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      ApiKey.countDocuments(where)
    ]);
    
    // 5. 处理 API Key 值显示（部分隐藏）
    const apiKeysFormatted = apiKeys.map(apiKey => ({
      id: apiKey._id.toString(),
      name: apiKey.name,
      key: maskApiKey(apiKey._id.toString()),
      project_id: apiKey.projectId || null,
      is_active: apiKey.isActive,
      created_at: apiKey.createdAt.toISOString(),
      updated_at: apiKey.updatedAt.toISOString()
    }));
    
    // 6. 返回成功响应
    return createPaginatedResponse(
      apiKeysFormatted,
      {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      },
      '查询成功'
    );
    
  } catch (error) {
    return handleError(error);
  }
}

/**
 * 生成安全的 API Key
 * @returns {string} 格式为 sk-{32位随机字符串} 的 API Key
 */
function generateApiKey() {
  // 生成 32 字节的随机字符串（Base64 编码后约 44 字符）
  // 使用 URL-safe Base64 编码，去掉填充字符，得到 43 字符
  const randomBytes = crypto.randomBytes(32);
  const base64Key = randomBytes.toString('base64url');
  // 格式：sk-{43位随机字符串}
  return `sk-${base64Key}`;
}

/**
 * POST /api/v1/api-keys - 创建 API Key
 */
async function handlePOST(request, context) {
  try {
    await connectDB();
    
    // 1. 解析请求体
    const data = await request.json();
    const { name, project_id } = data;
    
    // 2. 验证必填字段
    if (!name || !name.trim()) {
      return createErrorResponse(
        'API Key 名称不能为空',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        { field: 'name' }
      );
    }
    
    // 3. 验证字段格式
    if (name.length > 255) {
      return createErrorResponse(
        'API Key 名称长度不能超过 255 字符',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        { field: 'name' }
      );
    }
    
    // 4. 验证项目是否存在（如果提供了 project_id）
    if (project_id) {
      const project = await Project.findOne({ projectId: project_id }).lean();
      
      if (!project) {
        return createErrorResponse(
          '关联的项目不存在',
          ERROR_CODES.VALIDATION_ERROR,
          400,
          { field: 'project_id', project_id }
        );
      }
    }
    
    // 5. 生成 API Key（确保唯一性）
    let apiKeyValue;
    let encryptedKey;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isUnique && attempts < maxAttempts) {
      // 生成新的 API Key
      apiKeyValue = generateApiKey();
      
      // 加密存储 API Key 值
      encryptedKey = encryptApiKey(apiKeyValue);
      
      // 检查是否已存在（需要比对所有现有 key 的解密值）
      const existingKeys = await ApiKey.find({ isActive: true }).lean();
      let foundDuplicate = false;
      
      for (const existingKey of existingKeys) {
        try {
          const isValid = verifyApiKey(apiKeyValue, existingKey.key);
          if (isValid) {
            foundDuplicate = true;
            break;
          }
        } catch (error) {
          // verifyApiKey 可能抛出错误，继续下一个
          continue;
        }
      }
      
      if (!foundDuplicate) {
        isUnique = true;
      } else {
        attempts++;
      }
    }
    
    if (!isUnique) {
      return createErrorResponse(
        '生成 API Key 失败，请稍后重试',
        ERROR_CODES.INTERNAL_ERROR,
        500
      );
    }
    
    // 6. 创建 API Key 记录
    const apiKey = await ApiKey.create({
      name: name.trim(),
      key: encryptedKey,
      projectId: project_id || null,
      isActive: true
    });
    
    // 7. 返回成功响应（包含完整的 API Key，仅在创建时返回一次）
    const apiKeyFormatted = {
      id: apiKey._id.toString(),
      name: apiKey.name,
      key: apiKeyValue, // 返回完整的 API Key（仅创建时）
      key_masked: maskApiKey(apiKey._id.toString()), // 用于列表显示的隐藏格式
      project_id: apiKey.projectId || null,
      is_active: apiKey.isActive,
      created_at: apiKey.createdAt.toISOString()
    };
    
    return createSuccessResponse(
      apiKeyFormatted,
      'API Key 创建成功',
      201
    );
    
  } catch (error) {
    // 处理数据库唯一约束错误
    if (error.code === 11000) {
      return createErrorResponse(
        'API Key 创建失败，请稍后重试',
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
export const POST = createApiHandler(handlePOST, [
  MiddlewarePresets.authenticated
]);
