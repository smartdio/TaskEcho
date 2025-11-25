/**
 * GET /api/v1/projects/:projectId/queues/:queueId
 * 获取任务队列详情
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Queue from '@/lib/models/Queue';

async function handleGET(request, context) {
  try {
    // 连接数据库
    await connectDB();

    // 解析路径参数
    const { projectId, queueId } = context.params;

    // 查询项目
    const project = await Project.findOne({ projectId }).lean();

    if (!project) {
      return createErrorResponse(
        '项目不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId }
      );
    }

    // 查询队列（列表查询，排除 messages 和 logs）
    const queue = await Queue.findOne({
      projectId: project._id,
      queueId: queueId
    }).select({
      'tasks.messages': 0,  // 排除 messages
      'tasks.logs': 0      // 排除 logs
    }).lean();

    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId, queue_id: queueId }
      );
    }

    // 统计任务数据（从队列的 tasks 数组中统计）
    const tasks = queue.tasks || [];
    
    let totalTasks = 0;
    let pendingTasks = 0;
    let doneTasks = 0;
    let errorTasks = 0;
    
    tasks.forEach(task => {
      totalTasks++;
      const status = (task.status || 'pending').toLowerCase();
      if (status === 'pending') {
        pendingTasks++;
      } else if (status === 'done') {
        doneTasks++;
      } else if (status === 'error') {
        errorTasks++;
      }
    });
    
    const taskStats = {
      total: totalTasks,
      pending: pendingTasks,
      done: doneTasks,
      error: errorTasks
    };

    // 返回格式化后的队列数据
    const queueData = {
      id: queue._id.toString(),
      queue_id: queue.queueId,
      name: queue.name,
      task_count: taskStats.total,
      task_stats: taskStats,
      last_task_at: queue.lastTaskAt ? queue.lastTaskAt.toISOString() : null,
      created_at: queue.createdAt.toISOString(),
      updated_at: queue.updatedAt.toISOString()
    };

    return createSuccessResponse(queueData, '查询成功');

  } catch (error) {
    console.error('获取任务队列详情失败:', error);
    return createErrorResponse(
      error.message || '获取任务队列详情失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

/**
 * DELETE /api/v1/projects/:projectId/queues/:queueId
 * 删除任务队列（级联删除队列中的所有任务）
 */
async function handleDELETE(request, context) {
  try {
    // 连接数据库
    await connectDB();

    // 解析路径参数
    const { projectId, queueId } = context.params;

    // 查询项目
    const project = await Project.findOne({ projectId });

    if (!project) {
      return createErrorResponse(
        '项目不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId }
      );
    }

    // 查询队列
    const queue = await Queue.findOne({
      projectId: project._id,
      queueId: queueId
    });

    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId, queue_id: queueId }
      );
    }

    // 删除队列（任务已嵌入在队列中，会自动删除）
    await Queue.deleteOne({ _id: queue._id });

    // 返回成功响应
    return createSuccessResponse(
      { queue_id: queueId },
      '队列删除成功'
    );

  } catch (error) {
    console.error('删除队列失败:', error);
    return createErrorResponse(
      error.message || '删除队列失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);

export const DELETE = createApiHandler(handleDELETE, [
  MiddlewarePresets.authenticated
]);
