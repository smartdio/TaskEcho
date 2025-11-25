/**
 * API 标准响应格式工具
 */

// 错误码定义
export const ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  INVALID_API_KEY: 'INVALID_API_KEY',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  DUPLICATE_KEY: 'DUPLICATE_KEY'
};

/**
 * 创建成功响应
 * @param {any} data - 响应数据
 * @param {string} message - 响应消息
 * @param {number} statusCode - HTTP状态码
 * @returns {Response}
 */
export function createSuccessResponse(data, message = '操作成功', statusCode = 200) {
  return Response.json({
    success: true,
    data,
    message,
    timestamp: new Date().toISOString()
  }, { status: statusCode });
}

/**
 * 创建分页响应
 * @param {Array} items - 数据项数组
 * @param {Object} pagination - 分页信息
 * @param {string} message - 响应消息
 * @returns {Response}
 */
export function createPaginatedResponse(items, pagination, message = '查询成功') {
  return createSuccessResponse({
    items,
    pagination
  }, message);
}

/**
 * 创建错误响应
 * @param {string} message - 错误消息
 * @param {string} code - 错误码
 * @param {number} statusCode - HTTP状态码
 * @param {Object} details - 错误详情
 * @returns {Response}
 */
export function createErrorResponse(message, code = ERROR_CODES.INTERNAL_ERROR, statusCode = 400, details = {}) {
  return Response.json({
    success: false,
    error: {
      code,
      message,
      ...(Object.keys(details).length > 0 && { details })
    },
    timestamp: new Date().toISOString()
  }, { status: statusCode });
}

/**
 * 统一错误处理
 * @param {Error} error - 错误对象
 * @returns {Response}
 */
export function handleError(error) {
  console.error('API Error:', error);
  
  // 处理数据库唯一约束错误
  if (error.code === 11000 || error.code === 'P2002') {
    return createErrorResponse(
      '资源已存在',
      ERROR_CODES.DUPLICATE_KEY,
      400
    );
  }
  
  // 处理 Mongoose 验证错误
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map(err => err.message);
    return createErrorResponse(
      messages.join(', '),
      ERROR_CODES.VALIDATION_ERROR,
      400
    );
  }
  
  // 默认错误
  return createErrorResponse(
    error.message || '服务器内部错误',
    ERROR_CODES.INTERNAL_ERROR,
    500
  );
}
