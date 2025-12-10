/**
 * POST /api/v1/projects/:projectId/tasks/:taskId/pull/reset
 * 手动重置任务的拉取状态
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
    
    // 重置拉取状态
    const updatedTask = await Task.findByIdAndUpdate(
      task._id,
      {
        $set: {
          pulled_at: null,
          pulled_by: null
        }
      },
      { new: true }
    );
    
    return createSuccessResponse({
      task_id: taskId,
      pulled_at: null,
      reset_at: new Date().toISOString()
    }, '拉取状态已重置');
    
  } catch (error) {
    console.error('重置拉取状态失败:', error);
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







