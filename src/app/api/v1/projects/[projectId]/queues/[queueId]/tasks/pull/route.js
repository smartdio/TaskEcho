/**
 * GET /api/v1/projects/:projectId/queues/:queueId/tasks/pull
 * 拉取队列中的任务（服务端任务）
 * 使用原子操作标记 pulled_at 和 pulled_by，防止并发拉取
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Queue from '@/lib/models/Queue';

async function handleGET(request, context) {
  try {
    await connectDB();
    
    const { projectId, queueId } = context.params;
    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const status = searchParams.get('status')?.trim();
    const since = searchParams.get('since')?.trim();
    const tags = searchParams.get('tags')?.trim();
    const created_after = searchParams.get('created_after')?.trim();
    const created_before = searchParams.get('created_before')?.trim();
    const modified_after = searchParams.get('modified_after')?.trim();
    const modified_before = searchParams.get('modified_before')?.trim();
    const priority = searchParams.get('priority')?.trim();
    const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 1000);
    
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
    
    // 验证队列是否存在
    const queue = await Queue.findOne({
      projectId: project._id,
      queueId: queueId
    }).lean();
    
    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { queue_id: queueId }
      );
    }
    
    // 获取客户端标识（用于 pulled_by）
    const clientId = context.apiKey?.name || context.apiKey?.key?.substring(0, 8) || 'unknown';
    const now = new Date();
    
    // 过滤任务
    let availableTasks = (queue.tasks || []).filter(task => {
      // 只拉取服务端任务
      if (task.source !== 'server') return false;
      
      // 只拉取未拉取的任务
      if (task.pulled_at) return false;
      
      // 排除已删除的任务
      if (task.deleted_at) return false;
      
      // 状态过滤
      if (status) {
        const statusLower = status.toLowerCase();
        if (task.status?.toLowerCase() !== statusLower) return false;
      }
      
      // 标签过滤
      if (tags) {
        const tagArray = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
        const taskTags = (task.tags || []).map(t => String(t).toLowerCase());
        if (!tagArray.some(tag => taskTags.includes(tag))) return false;
      }
      
      // 时间范围过滤
      if (created_after) {
        const date = new Date(created_after);
        if (isNaN(date.getTime())) return false;
        if (!task.created_at || new Date(task.created_at) < date) return false;
      }
      
      if (created_before) {
        const date = new Date(created_before);
        if (isNaN(date.getTime())) return false;
        if (!task.created_at || new Date(task.created_at) > date) return false;
      }
      
      if (modified_after) {
        const date = new Date(modified_after);
        if (isNaN(date.getTime())) return false;
        if (!task.server_modified_at || new Date(task.server_modified_at) < date) return false;
      }
      
      if (modified_before) {
        const date = new Date(modified_before);
        if (isNaN(date.getTime())) return false;
        if (!task.server_modified_at || new Date(task.server_modified_at) > date) return false;
      }
      
      // since 参数（增量拉取）
      if (since) {
        const date = new Date(since);
        if (isNaN(date.getTime())) return false;
        if (!task.server_modified_at || new Date(task.server_modified_at) < date) return false;
      }
      
      // 优先级过滤
      if (priority) {
        if (['high', 'medium', 'low'].includes(priority.toLowerCase())) {
          if (task.priority !== priority.toLowerCase()) return false;
        } else if (!isNaN(parseInt(priority, 10))) {
          const priorityNum = parseInt(priority, 10);
          if (priorityNum >= 1 && priorityNum <= 10 && task.priority !== priorityNum) {
            return false;
          }
        }
      }
      
      // 排除过期任务
      if (task.expires_at && new Date(task.expires_at) <= now) {
        return false;
      }
      
      return true;
    });
    
    // 按优先级排序：高优先级优先，然后按创建时间排序
    availableTasks.sort((a, b) => {
      // 优先级比较
      const priorityA = a.priority || 0;
      const priorityB = b.priority || 0;
      if (priorityA !== priorityB) {
        // 字符串优先级：high > medium > low
        if (typeof priorityA === 'string' && typeof priorityB === 'string') {
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          return (priorityOrder[priorityA] || 0) - (priorityOrder[priorityB] || 0);
        }
        // 数字优先级：数字越大优先级越高
        return priorityB - priorityA;
      }
      // 创建时间升序
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      return dateA - dateB;
    });
    
    // 限制数量
    availableTasks = availableTasks.slice(0, limit);
    
    // 使用 findOneAndUpdate 原子操作拉取任务
    const pulledTasks = [];
    
    for (const task of availableTasks) {
      const updatedQueue = await Queue.findOneAndUpdate(
        {
          projectId: project._id,
          queueId: queueId,
          'tasks.id': task.id,
          'tasks.pulled_at': null,  // 确保任务未被拉取
          'tasks.deleted_at': null  // 确保任务未删除
        },
        {
          $set: {
            'tasks.$.pulled_at': now,
            'tasks.$.pulled_by': clientId
          },
          $push: {
            'tasks.$.pull_history': {
              pulled_at: now,
              pulled_by: clientId,
              released_at: null,
              released_by: null
            }
          }
        },
        { new: true }
      );
      
      if (updatedQueue) {
        const updatedTask = updatedQueue.tasks.find(t => t.id === task.id);
        if (updatedTask) {
          pulledTasks.push({
            task_id: updatedTask.id,
            name: updatedTask.name,
            prompt: updatedTask.prompt,
            spec_file: updatedTask.spec_file || [],
            status: updatedTask.status,
            report: updatedTask.report,
            tags: updatedTask.tags || [],
            priority: updatedTask.priority,
            expires_at: updatedTask.expires_at ? new Date(updatedTask.expires_at).toISOString() : null,
            created_at: updatedTask.created_at ? new Date(updatedTask.created_at).toISOString() : null,
            server_modified_at: updatedTask.server_modified_at ? new Date(updatedTask.server_modified_at).toISOString() : null,
            pulled_at: updatedTask.pulled_at ? new Date(updatedTask.pulled_at).toISOString() : null
          });
        }
      }
    }
    
    return createSuccessResponse({
      tasks: pulledTasks,
      count: pulledTasks.length,
      pulled_at: now.toISOString()
    }, `成功拉取 ${pulledTasks.length} 个任务`);
    
  } catch (error) {
    console.error('拉取队列任务失败:', error);
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







