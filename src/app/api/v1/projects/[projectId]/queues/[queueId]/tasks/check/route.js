/**
 * GET /api/v1/projects/:projectId/queues/:queueId/tasks/check
 * 检查任务队列下的任务列表是否有更新（轻量级检查API）
 * 
 * 注意：任务是嵌入在队列文档中的，所以需要检查队列文档的 updatedAt
 * 以及队列中任务数组的最大更新时间
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response'
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware'
import connectDB from '@/lib/mongoose'
import Project from '@/lib/models/Project'
import Queue from '@/lib/models/Queue'

async function handleGET(request, context) {
  try {
    await connectDB()
    
    const { projectId, queueId } = context.params
    
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
    
    // 查询队列（只获取 updatedAt 和 tasks 数组）
    const queue = await Queue.findOne({
      projectId: project._id,
      queueId: queueId
    }).select('updatedAt tasks').lean()
    
    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId, queue_id: queueId }
      )
    }
    
    // 计算任务数量
    const taskCount = queue.tasks ? queue.tasks.length : 0
    
    // 获取队列文档的 updatedAt（队列本身或任务数组变化时都会更新）
    const queueUpdatedAt = queue.updatedAt || new Date()
    
    // 计算版本号：使用队列 updatedAt 的时间戳
    // 因为任务是嵌入的，队列文档更新时 updatedAt 会变化
    const version = queueUpdatedAt.getTime()
    
    return createSuccessResponse({
      version,
      last_updated_at: queueUpdatedAt.toISOString(),
      count: taskCount
    })
  } catch (error) {
    console.error('检查任务列表失败:', error)
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

