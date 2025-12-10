/**
 * POST /api/v1/projects/:projectId/tasks/:taskId/pull/release
 * 释放项目级任务的拉取锁定
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Task from '@/lib/models/Task';

async function handlePOST(request, context) {
  try {
    await connectDB();
    
    const { projectId, taskId } = context.params;
    
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
    
    // 查询任务
    const task = await Task.findOne({
      projectId: project._id,
      taskId: taskId,
      deleted_at: null
    });
    
    if (!task) {
      return createErrorResponse(
        '任务不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { task_id: taskId }
      );
    }
    
    if (!task.pulled_at) {
      return createErrorResponse(
        '任务未被拉取，无需释放',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    // 获取客户端标识
    const clientId = context.apiKey?.name || context.apiKey?.key?.substring(0, 8) || 'unknown';
    const now = new Date();
    
    // 更新拉取历史记录
    const pullHistory = task.pull_history || [];
    const lastPull = pullHistory[pullHistory.length - 1];
    if (lastPull && !lastPull.released_at) {
      lastPull.released_at = now;
      lastPull.released_by = clientId;
    }
    
    // 释放拉取锁定
    const updatedTask = await Task.findByIdAndUpdate(
      task._id,
      {
        $set: {
          pulled_at: null,
          pulled_by: null,
          pull_history: pullHistory
        }
      },
      { new: true }
    );
    
    return createSuccessResponse({
      task_id: taskId,
      released_at: now.toISOString()
    }, '拉取锁定已释放');
    
  } catch (error) {
    console.error('释放拉取锁定失败:', error);
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







