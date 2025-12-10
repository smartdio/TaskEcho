/**
 * GET /api/v1/projects/:projectId/tasks/pull/stats
 * 获取拉取统计信息
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
    
    // 统计项目级任务
    const projectTasks = await Task.find({
      projectId: project._id,
      source: 'server'
    }).lean();
    
    // 统计队列中的任务
    const queues = await Queue.find({
      projectId: project._id
    }).lean();
    
    let queueTasks = [];
    queues.forEach(queue => {
      queueTasks = queueTasks.concat((queue.tasks || []).filter(t => t.source === 'server'));
    });
    
    const allTasks = [...projectTasks, ...queueTasks];
    
    // 统计信息
    const stats = {
      total_server_tasks: allTasks.length,
      not_pulled: allTasks.filter(t => !t.pulled_at).length,
      pulled: allTasks.filter(t => t.pulled_at).length,
      pulled_not_pushed: 0,  // 已拉取但未推送（需要检查是否有对应的client任务）
      pull_success_rate: 0,
      average_pull_duration: null
    };
    
    // 计算拉取成功率（简化版：已拉取任务数 / 总任务数）
    if (stats.total_server_tasks > 0) {
      stats.pull_success_rate = Math.round((stats.pulled / stats.total_server_tasks) * 100);
    }
    
    // 计算平均拉取耗时（从拉取到推送的时间）
    // 这里简化处理，实际需要检查是否有对应的client任务来判断是否已推送
    const pulledTasks = allTasks.filter(t => t.pulled_at);
    if (pulledTasks.length > 0) {
      // 简化：假设已拉取的任务中，如果 pull_history 中有 released_at，说明已推送
      let totalDuration = 0;
      let count = 0;
      
      pulledTasks.forEach(task => {
        const pullHistory = task.pull_history || [];
        pullHistory.forEach(history => {
          if (history.pulled_at && history.released_at) {
            const duration = new Date(history.released_at) - new Date(history.pulled_at);
            if (duration > 0) {
              totalDuration += duration;
              count++;
            }
          }
        });
      });
      
      if (count > 0) {
        stats.average_pull_duration = Math.round(totalDuration / count / 1000); // 转换为秒
      }
    }
    
    // 统计已拉取但未推送的任务（简化：已拉取且 pull_history 中没有 released_at）
    stats.pulled_not_pushed = pulledTasks.filter(t => {
      const pullHistory = t.pull_history || [];
      const lastPull = pullHistory[pullHistory.length - 1];
      return lastPull && !lastPull.released_at;
    }).length;
    
    return createSuccessResponse(stats);
    
  } catch (error) {
    console.error('获取拉取统计失败:', error);
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







