/**
 * POST /api/v1/projects/:projectId/queues/:queueId/reset
 * 重置队列：清空所有任务的状态，重置所有任务的拉取状态
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
    
    // 重置所有任务的状态和拉取状态
    const tasks = queue.tasks || [];
    const updateOperations = tasks.map((task, index) => ({
      [`tasks.${index}.status`]: 'pending',
      [`tasks.${index}.pulled_at`]: null,
      [`tasks.${index}.pulled_by`]: null
    }));
    
    const updateFields = {};
    updateOperations.forEach(op => {
      Object.assign(updateFields, op);
    });
    
    updateFields['last_reset_at'] = now;
    updateFields['last_operation'] = 'reset';
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
      reset_tasks_count: tasks.length,
      reset_at: now.toISOString()
    }, `成功重置队列，共 ${tasks.length} 个任务`);
    
  } catch (error) {
    console.error('重置队列失败:', error);
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







