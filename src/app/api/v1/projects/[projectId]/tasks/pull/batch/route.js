/**
 * POST /api/v1/projects/:projectId/tasks/pull/batch
 * 批量拉取项目级任务
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
    
    // 解析请求参数
    const taskIds = data.taskIds || [];
    const filters = data.filters || {};
    const limit = Math.min(data.limit || 100, 1000);
    
    // 构建查询条件
    const query = {
      projectId: project._id,
      source: 'server',
      pulled_at: null,
      deleted_at: null
    };
    
    // 如果指定了 taskIds，只拉取这些任务
    if (taskIds.length > 0) {
      query.taskId = { $in: taskIds };
    }
    
    // 应用过滤条件
    if (filters.status) {
      query.status = filters.status.toLowerCase();
    }
    
    if (filters.tags && Array.isArray(filters.tags)) {
      query.tags = { $in: filters.tags };
    }
    
    // 排除过期任务
    const now = new Date();
    query.$or = [
      { expires_at: null },
      { expires_at: { $gt: now } }
    ];
    
    // 获取客户端标识
    const clientId = context.apiKey?.name || context.apiKey?.key?.substring(0, 8) || 'unknown';
    
    // 批量拉取
    const pulledTasks = [];
    const failedTasks = [];
    let pulledCount = 0;
    
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
          sort: { priority: -1, created_at: 1 },
          new: true
        }
      ).lean();
      
      if (!task) {
        break;
      }
      
      // 如果指定了 taskIds，从列表中移除已拉取的任务
      if (taskIds.length > 0) {
        const index = taskIds.indexOf(task.taskId);
        if (index > -1) {
          taskIds.splice(index, 1);
        }
      }
      
      pulledTasks.push({
        task_id: task.taskId,
        name: task.name,
        prompt: task.prompt,
        spec_file: task.spec_file || [],
        status: task.status,
        tags: task.tags || [],
        priority: task.priority,
        pulled_at: task.pulled_at ? new Date(task.pulled_at).toISOString() : null
      });
      
      pulledCount++;
    }
    
    // 记录失败的任务（如果指定了 taskIds 但未拉取到）
    if (taskIds.length > 0) {
      taskIds.forEach(taskId => {
        failedTasks.push({
          task_id: taskId,
          reason: '任务不存在、已被拉取或不符合过滤条件'
        });
      });
    }
    
    return createSuccessResponse({
      tasks: pulledTasks,
      failed: failedTasks,
      count: pulledTasks.length,
      failed_count: failedTasks.length,
      pulled_at: now.toISOString()
    }, `成功拉取 ${pulledTasks.length} 个任务${failedTasks.length > 0 ? `，${failedTasks.length} 个任务失败` : ''}`);
    
  } catch (error) {
    console.error('批量拉取任务失败:', error);
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







