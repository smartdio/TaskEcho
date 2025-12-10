/**
 * POST /api/v1/projects/:projectId/tasks/pull/release/batch
 * 批量释放项目级任务的拉取锁定
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Task from '@/lib/models/Task';

async function handlePOST(request, context) {
  try {
    await connectDB();
    
    const { projectId } = context.params;
    const data = await request.json();
    
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
    
    const taskIds = data.taskIds || [];
    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return createErrorResponse(
        'taskIds 必须是非空数组',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    // 获取客户端标识
    const clientId = context.apiKey?.name || context.apiKey?.key?.substring(0, 8) || 'unknown';
    const now = new Date();
    
    // 批量释放
    const releasedTasks = [];
    const failedTasks = [];
    
    for (const taskId of taskIds) {
      const task = await Task.findOne({
        projectId: project._id,
        taskId: taskId,
        deleted_at: null,
        pulled_at: { $ne: null }  // 只释放已拉取的任务
      });
      
      if (!task) {
        failedTasks.push({
          task_id: taskId,
          reason: '任务不存在或未被拉取'
        });
        continue;
      }
      
      // 更新拉取历史记录
      const pullHistory = task.pull_history || [];
      const lastPull = pullHistory[pullHistory.length - 1];
      if (lastPull && !lastPull.released_at) {
        lastPull.released_at = now;
        lastPull.released_by = clientId;
      }
      
      // 释放拉取锁定
      await Task.findByIdAndUpdate(
        task._id,
        {
          $set: {
            pulled_at: null,
            pulled_by: null,
            pull_history: pullHistory
          }
        }
      );
      
      releasedTasks.push({
        task_id: taskId,
        released_at: now.toISOString()
      });
    }
    
    return createSuccessResponse({
      released: releasedTasks,
      failed: failedTasks,
      released_count: releasedTasks.length,
      failed_count: failedTasks.length
    }, `成功释放 ${releasedTasks.length} 个任务的拉取锁定${failedTasks.length > 0 ? `，${failedTasks.length} 个任务失败` : ''}`);
    
  } catch (error) {
    console.error('批量释放拉取锁定失败:', error);
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







