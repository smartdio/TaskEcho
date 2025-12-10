/**
 * GET /api/v1/projects/:projectId/tasks/:taskId/pull/history
 * 查询任务的拉取历史记录
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Task from '@/lib/models/Task';

async function handleGET(request, context) {
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
      taskId: taskId
    }).lean();
    
    if (!task) {
      return createErrorResponse(
        '任务不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { task_id: taskId }
      );
    }
    
    // 格式化拉取历史
    const pullHistory = (task.pull_history || []).map(history => ({
      pulled_at: history.pulled_at ? new Date(history.pulled_at).toISOString() : null,
      pulled_by: history.pulled_by || null,
      released_at: history.released_at ? new Date(history.released_at).toISOString() : null,
      released_by: history.released_by || null
    }));
    
    return createSuccessResponse({
      task_id: taskId,
      current_pull: task.pulled_at ? {
        pulled_at: new Date(task.pulled_at).toISOString(),
        pulled_by: task.pulled_by
      } : null,
      pull_history: pullHistory,
      total_pulls: pullHistory.length
    });
    
  } catch (error) {
    console.error('查询拉取历史失败:', error);
    return createErrorResponse(
      error.message || '服务器内部错误',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);







