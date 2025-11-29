/**
 * GET /api/v1/projects/:projectId/queues/check
 * 检查项目下的任务队列列表是否有更新（轻量级检查API）
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response'
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware'
import connectDB from '@/lib/mongoose'
import Project from '@/lib/models/Project'
import Queue from '@/lib/models/Queue'

async function handleGET(request, context) {
  try {
    await connectDB()
    
    const { projectId } = context.params
    
    // 查询项目
    const project = await Project.findOne({ projectId }).lean()
    
    if (!project) {
      return createErrorResponse(
        '项目不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId }
      )
    }
    
    // 获取该项目下所有队列的最大 updatedAt 和总数
    const result = await Queue.aggregate([
      {
        $match: {
          projectId: project._id
        }
      },
      {
        $group: {
          _id: null,
          maxUpdatedAt: { $max: '$updatedAt' },
          count: { $sum: 1 }
        }
      }
    ])
    
    if (result.length === 0) {
      // 没有队列数据
      return createSuccessResponse({
        version: 0,
        last_updated_at: new Date().toISOString(),
        count: 0
      })
    }
    
    const { maxUpdatedAt, count } = result[0]
    
    // 计算版本号：使用时间戳的毫秒数作为版本号
    const version = maxUpdatedAt ? maxUpdatedAt.getTime() : 0
    
    return createSuccessResponse({
      version,
      last_updated_at: maxUpdatedAt ? maxUpdatedAt.toISOString() : new Date().toISOString(),
      count
    })
  } catch (error) {
    console.error('检查队列列表失败:', error)
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

