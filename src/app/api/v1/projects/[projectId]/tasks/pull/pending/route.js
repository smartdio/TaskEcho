/**
 * GET /api/v1/projects/:projectId/tasks/pull/pending
 * 查询已拉取但未推送的任务（超过timeout时间）
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Task from '@/lib/models/Task';
import Queue from '@/lib/models/Queue';

async function handleGET(request, context) {
  try {
    await connectDB();
    
    const { projectId } = context.params;
    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const timeout = parseInt(searchParams.get('timeout') || '3600', 10); // 默认1小时（秒）
    const timeoutMs = timeout * 1000;
    
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
    
    const now = new Date();
    const timeoutDate = new Date(now.getTime() - timeoutMs);
    
    // 查询项目级任务
    const projectTasks = await Task.find({
      projectId: project._id,
      source: 'server',
      pulled_at: { $ne: null, $lt: timeoutDate },
      deleted_at: null
    }).lean();
    
    // 查询队列中的任务
    const queues = await Queue.find({
      projectId: project._id
    }).lean();
    
    let queueTasks = [];
    queues.forEach(queue => {
      const tasks = (queue.tasks || []).filter(t => 
        t.source === 'server' &&
        t.pulled_at &&
        new Date(t.pulled_at) < timeoutDate &&
        !t.deleted_at
      );
      tasks.forEach(task => {
        queueTasks.push({
          ...task,
          queue_id: queue.queueId,
          queue_name: queue.name
        });
      });
    });
    
    // 合并并格式化任务
    const pendingTasks = [
      ...projectTasks.map(t => ({
        task_id: t.taskId,
        name: t.name,
        status: t.status,
        pulled_at: t.pulled_at ? new Date(t.pulled_at).toISOString() : null,
        pulled_by: t.pulled_by,
        timeout_hours: Math.round((now - new Date(t.pulled_at)) / 1000 / 3600 * 10) / 10,
        type: 'project'
      })),
      ...queueTasks.map(t => ({
        task_id: t.id,
        name: t.name,
        status: t.status,
        queue_id: t.queue_id,
        queue_name: t.queue_name,
        pulled_at: t.pulled_at ? new Date(t.pulled_at).toISOString() : null,
        pulled_by: t.pulled_by,
        timeout_hours: Math.round((now - new Date(t.pulled_at)) / 1000 / 3600 * 10) / 10,
        type: 'queue'
      }))
    ];
    
    // 按超时时间排序（超时时间长的在前）
    pendingTasks.sort((a, b) => {
      const dateA = a.pulled_at ? new Date(a.pulled_at) : new Date(0);
      const dateB = b.pulled_at ? new Date(b.pulled_at) : new Date(0);
      return dateA - dateB; // 早拉取的在前
    });
    
    return createSuccessResponse({
      tasks: pendingTasks,
      count: pendingTasks.length,
      timeout_seconds: timeout,
      timeout_hours: Math.round(timeout / 3600 * 10) / 10
    });
    
  } catch (error) {
    console.error('查询未推送任务失败:', error);
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







