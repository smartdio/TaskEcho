/**
 * POST /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId/re-run
 * 重新执行单个任务：重置任务状态和拉取状态
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Queue from '@/lib/models/Queue';

async function handlePOST(request, context) {
  try {
    await connectDB();
    
    const { projectId, queueId, taskId } = context.params;
    
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
        { queue_id: queueId }
      );
    }
    
    // 查找任务
    const taskIndex = queue.tasks.findIndex(t => t.id === taskId && !t.deleted_at);
    if (taskIndex === -1) {
      return createErrorResponse(
        '任务不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { task_id: taskId }
      );
    }
    
    const now = new Date();
    
    // 重置任务状态和拉取状态
    const updatedQueue = await Queue.findOneAndUpdate(
      {
        projectId: project._id,
        queueId: queueId,
        'tasks.id': taskId,
        'tasks.deleted_at': null
      },
      {
        $set: {
          'tasks.$.status': 'pending',
          'tasks.$.pulled_at': null,
          'tasks.$.pulled_by': null,
          'lastTaskAt': now
        }
      },
      { new: true }
    );
    
    // 更新项目的 lastTaskAt
    await Project.findByIdAndUpdate(project._id, {
      lastTaskAt: now
    });
    
    return createSuccessResponse({
      task_id: taskId,
      rerun_at: now.toISOString()
    }, '任务重新执行成功');
    
  } catch (error) {
    console.error('重新执行任务失败:', error);
    return createErrorResponse(
      error.message || '服务器内部错误',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const POST = createApiHandler(handlePOST, [
  MiddlewarePresets.authenticated
]);







