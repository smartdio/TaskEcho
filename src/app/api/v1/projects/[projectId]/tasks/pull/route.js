/**
 * GET /api/v1/projects/:projectId/tasks/pull
 * 拉取项目级任务（不属于任何队列的服务端任务）
 * 使用原子操作标记 pulled_at 和 pulled_by，防止并发拉取
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Task from '@/lib/models/Task';

async function handleGET(request, context) {
  try {
    await connectDB();
    
    const { projectId } = context.params;
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
    
    // 构建查询条件
    const query = {
      projectId: project._id,
      source: 'server',  // 只拉取服务端任务
      pulled_at: null,   // 只拉取未拉取的任务
      deleted_at: null   // 排除已删除的任务
    };
    
    // 状态过滤
    if (status) {
      const validStatuses = ['pending', 'running', 'done', 'error', 'cancelled'];
      const statusLower = status.toLowerCase();
      if (!validStatuses.includes(statusLower)) {
        return createErrorResponse(
          `status 必须是 ${validStatuses.join(', ')} 之一`,
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      query.status = statusLower;
    }
    
    // 标签过滤
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      query.tags = { $in: tagArray };
    }
    
    // 时间范围过滤
    if (created_after) {
      const date = new Date(created_after);
      if (isNaN(date.getTime())) {
        return createErrorResponse(
          'created_after 必须是有效的日期时间',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      query.created_at = { ...query.created_at, $gte: date };
    }
    
    if (created_before) {
      const date = new Date(created_before);
      if (isNaN(date.getTime())) {
        return createErrorResponse(
          'created_before 必须是有效的日期时间',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      query.created_at = { ...query.created_at, $lte: date };
    }
    
    if (modified_after) {
      const date = new Date(modified_after);
      if (isNaN(date.getTime())) {
        return createErrorResponse(
          'modified_after 必须是有效的日期时间',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      query.server_modified_at = { ...query.server_modified_at, $gte: date };
    }
    
    if (modified_before) {
      const date = new Date(modified_before);
      if (isNaN(date.getTime())) {
        return createErrorResponse(
          'modified_before 必须是有效的日期时间',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      query.server_modified_at = { ...query.server_modified_at, $lte: date };
    }
    
    // since 参数（增量拉取）
    if (since) {
      const date = new Date(since);
      if (isNaN(date.getTime())) {
        return createErrorResponse(
          'since 必须是有效的日期时间',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      query.server_modified_at = { ...query.server_modified_at, $gte: date };
    }
    
    // 优先级过滤
    if (priority) {
      if (['high', 'medium', 'low'].includes(priority.toLowerCase())) {
        query.priority = priority.toLowerCase();
      } else if (!isNaN(parseInt(priority, 10))) {
        const priorityNum = parseInt(priority, 10);
        if (priorityNum >= 1 && priorityNum <= 10) {
          query.priority = priorityNum;
        }
      }
    }
    
    // 排除过期任务
    const now = new Date();
    query.$or = [
      { expires_at: null },
      { expires_at: { $gt: now } }
    ];
    
    // 获取客户端标识（用于 pulled_by）
    const clientId = context.apiKey?.name || context.apiKey?.key?.substring(0, 8) || 'unknown';
    
    // 使用 findOneAndUpdate 原子操作拉取任务
    // 按优先级排序：高优先级优先，然后按创建时间排序
    const pulledTasks = [];
    let pulledCount = 0;
    
    // 批量拉取，直到达到 limit 或没有更多任务
    while (pulledCount < limit) {
      const task = await Task.findOneAndUpdate(
        query,
        {
          $set: {
            pulled_at: now,
            pulled_by: clientId
          },
          $push: {
            pull_history: {
              pulled_at: now,
              pulled_by: clientId,
              released_at: null,
              released_by: null
            }
          }
        },
        {
          sort: { 
            priority: -1,  // 优先级降序（高优先级优先）
            created_at: 1  // 创建时间升序（先创建的优先）
          },
          new: true
        }
      ).lean();
      
      if (!task) {
        break;  // 没有更多任务
      }
      
      pulledTasks.push({
        task_id: task.taskId,
        name: task.name,
        prompt: task.prompt,
        spec_file: task.spec_file || [],
        status: task.status,
        report: task.report,
        tags: task.tags || [],
        priority: task.priority,
        expires_at: task.expires_at ? new Date(task.expires_at).toISOString() : null,
        created_at: task.created_at ? new Date(task.created_at).toISOString() : null,
        server_modified_at: task.server_modified_at ? new Date(task.server_modified_at).toISOString() : null,
        pulled_at: task.pulled_at ? new Date(task.pulled_at).toISOString() : null
      });
      
      pulledCount++;
    }
    
    return createSuccessResponse({
      tasks: pulledTasks,
      count: pulledTasks.length,
      pulled_at: now.toISOString()
    }, `成功拉取 ${pulledTasks.length} 个任务`);
    
  } catch (error) {
    console.error('拉取任务失败:', error);
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







