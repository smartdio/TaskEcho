/**
 * GET /api/v1/projects/check
 * 检查项目列表是否有更新（轻量级检查API）
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response'
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware'
import connectDB from '@/lib/mongoose'
import Project from '@/lib/models/Project'

async function handleGET(request) {
  try {
    await connectDB()
    
    // 获取所有项目的最大 updatedAt 和总数
    // 使用聚合操作获取统计信息
    const result = await Project.aggregate([
      {
        $group: {
          _id: null,
          maxUpdatedAt: { $max: '$updatedAt' },
          count: { $sum: 1 }
        }
      }
    ])
    
    if (result.length === 0) {
      // 没有项目数据
      return createSuccessResponse({
        version: 0,
        last_updated_at: new Date().toISOString(),
        count: 0
      })
    }
    
    const { maxUpdatedAt, count } = result[0]
    
    // 计算版本号：使用时间戳的毫秒数作为版本号
    // 这样可以同时检测新增、删除和更新
    const version = maxUpdatedAt ? maxUpdatedAt.getTime() : 0
    
    return createSuccessResponse({
      version,
      last_updated_at: maxUpdatedAt ? maxUpdatedAt.toISOString() : new Date().toISOString(),
      count
    })
  } catch (error) {
    console.error('检查项目列表失败:', error)
    return createErrorResponse(
      error.message || '检查失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    )
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
])

