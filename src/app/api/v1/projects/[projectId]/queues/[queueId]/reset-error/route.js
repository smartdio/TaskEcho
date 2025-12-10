/**
 * POST /api/v1/projects/:projectId/queues/:queueId/reset-error
 * 重置错误任务：只重置error状态的任务和拉取状态
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Queue from '@/lib/models/Queue';

async function handlePOST(request, context) {
  try {
    await connectDB();
    
    const { projectId, queueId } = context.params;
    
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
    
    const now = new Date();
    
    // 重置错误任务的状态和拉取状态
    const tasks = queue.tasks || [];
    const updateFields = {};
    let resetCount = 0;
    
    tasks.forEach((task, index) => {
      if (task.status === 'error') {
        updateFields[`tasks.${index}.status`] = 'pending';
        updateFields[`tasks.${index}.pulled_at`] = null;
        updateFields[`tasks.${index}.pulled_by`] = null;
        resetCount++;
      }
    });
    
    if (resetCount === 0) {
      return createSuccessResponse({
        queue_id: queueId,
        reset_tasks_count: 0
      }, '队列中没有错误任务');
    }
    
    updateFields['last_reset_at'] = now;
    updateFields['last_operation'] = 'reset-error';
    updateFields['lastTaskAt'] = now;
    
    // 更新队列
    const updatedQueue = await Queue.findByIdAndUpdate(
      queue._id,
      { $set: updateFields },
      { new: true }
    );
    
    // 更新项目的 lastTaskAt
    await Project.findByIdAndUpdate(project._id, {
      lastTaskAt: now
    });
    
    return createSuccessResponse({
      queue_id: queueId,
      reset_tasks_count: resetCount,
      reset_at: now.toISOString()
    }, `成功重置 ${resetCount} 个错误任务`);
    
  } catch (error) {
    console.error('重置错误任务失败:', error);
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







