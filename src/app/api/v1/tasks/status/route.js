/**
 * PATCH /api/v1/tasks/status
 * 修改任务状态接口
 * 注意：project_id、queue_id、task_id 从请求体获取，不使用路径参数（避免特殊字符问题）
 */
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Queue from '@/lib/models/Queue';
import { validateApiKeyProject } from '@/lib/auth';
import { incrementExecutionStats } from '@/lib/statistics/increment-stats';

/**
 * 验证请求体数据（包括 project_id、queue_id、task_id 和 status）
 */
function validateStatusData(data) {
  const errors = [];
  
  // 验证 project_id
  if (!data.project_id || typeof data.project_id !== 'string' || !data.project_id.trim()) {
    errors.push({ field: 'project_id', reason: 'project_id 不能为空' });
  } else if (data.project_id.length > 255) {
    errors.push({ field: 'project_id', reason: 'project_id 长度不能超过255个字符' });
  }
  
  // 验证 queue_id
  if (!data.queue_id || typeof data.queue_id !== 'string' || !data.queue_id.trim()) {
    errors.push({ field: 'queue_id', reason: 'queue_id 不能为空' });
  } else if (data.queue_id.length > 255) {
    errors.push({ field: 'queue_id', reason: 'queue_id 长度不能超过255个字符' });
  }
  
  // 验证 task_id
  if (!data.task_id || typeof data.task_id !== 'string' || !data.task_id.trim()) {
    errors.push({ field: 'task_id', reason: 'task_id 不能为空' });
  } else if (data.task_id.length > 255) {
    errors.push({ field: 'task_id', reason: 'task_id 长度不能超过255个字符' });
  }
  
  // 验证 status
  if (!data.status || typeof data.status !== 'string') {
    errors.push({ field: 'status', reason: 'status 不能为空' });
  } else {
    const statusLower = data.status.toLowerCase();
    if (!['pending', 'done', 'error'].includes(statusLower)) {
      errors.push({ field: 'status', reason: 'status 必须是 pending、done 或 error' });
    }
  }
  
  return errors;
}

/**
 * 处理更新状态请求
 */
async function handlePATCH(request, context) {
  try {
    await connectDB();
    
    // 1. 解析请求体
    const body = await request.json();
    
    // 2. 验证请求体数据（包括 project_id、queue_id、task_id 和 status）
    const validationErrors = validateStatusData(body);
    if (validationErrors.length > 0) {
      const firstError = validationErrors[0];
      return createErrorResponse(
        '请求参数验证失败',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        {
          field: firstError.field,
          reason: firstError.reason,
          all_errors: validationErrors
        }
      );
    }
    
    // 3. 从请求体获取参数
    const projectId = body.project_id.trim();
    const queueId = body.queue_id.trim();
    const taskId = body.task_id.trim();
    
    // 4. 验证 API Key 项目关联（如果 API Key 关联了项目）
    if (context.apiKey && context.apiKey.projectId) {
      if (!validateApiKeyProject(context.apiKey, projectId)) {
        return createErrorResponse(
          'API Key 只能用于指定项目',
          ERROR_CODES.INVALID_API_KEY,
          401,
          { project_id: projectId }
        );
      }
    }
    
    // 5. 查找项目
    const project = await Project.findOne({ projectId: projectId });
    if (!project) {
      return createErrorResponse(
        '项目不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        {
          project_id: projectId,
          queue_id: queueId,
          task_id: taskId
        }
      );
    }
    
    // 6. 查找队列
    const queue = await Queue.findOne({
      projectId: project._id,
      queueId: queueId
    });
    
    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        {
          project_id: projectId,
          queue_id: queueId,
          task_id: taskId
        }
      );
    }
    
    // 7. 查找任务并记录当前状态
    const taskIndex = queue.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      return createErrorResponse(
        '任务不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        {
          project_id: projectId,
          queue_id: queueId,
          task_id: taskId
        }
      );
    }
    
    const currentTask = queue.tasks[taskIndex];
    const previousStatus = currentTask.status;
    
    // 8. 更新任务状态（使用 $set）
    const now = new Date();
    const newStatus = body.status.toLowerCase();
    
    const updatedQueue = await Queue.findOneAndUpdate(
      {
        _id: queue._id,
        'tasks.id': taskId
      },
      {
        $set: {
          'tasks.$.status': newStatus,
          lastTaskAt: now,
          updatedAt: now
        }
      },
      { new: true }
    );
    
    if (!updatedQueue) {
      return createErrorResponse(
        '任务不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        {
          project_id: projectId,
          queue_id: queueId,
          task_id: taskId
        }
      );
    }
    
    // 9. 更新项目的 lastTaskAt
    await Project.findByIdAndUpdate(project._id, {
      lastTaskAt: now
    });
    
    // 10. 累计统计数据（异步执行，不阻塞主流程）
    // 计算执行时长：如果是从pending变为done/error，尝试计算执行时长
    let executionDuration = null;
    if (previousStatus.toLowerCase() === 'pending' && ['done', 'error'].includes(newStatus.toLowerCase())) {
      // 尝试从队列的lastTaskAt或任务的日志中获取开始时间
      // 这里简化处理，后续可以优化
      // 暂时不计算执行时长，因为任务没有明确的创建时间字段
    }
    
    // 获取客户端信息和API Key名称
    const clientInfo = project.clientInfo || null;
    const apiKeyName = context.apiKey?.name || null;
    const errorMessage = newStatus.toLowerCase() === 'error' ? '任务执行失败' : null;
    
    // 异步执行统计累计，不阻塞响应
    incrementExecutionStats({
      projectId: projectId,
      projectName: project.name,
      queueId: queueId,
      queueName: queue.name,
      taskId: taskId,
      previousStatus: previousStatus,
      newStatus: newStatus,
      executionDuration: executionDuration,
      clientInfo: clientInfo,
      apiKeyName: apiKeyName,
      errorMessage: errorMessage
    }).catch(error => {
      // 统计累计失败不影响主流程，只记录日志
      console.error('统计累计失败:', error);
    });
    
    // 11. 获取更新后的任务
    const updatedTask = updatedQueue.tasks.find(t => t.id === taskId);
    
    // 12. 返回成功响应
    return createSuccessResponse(
      {
        task_id: taskId,
        status: updatedTask.status.toUpperCase(),
        previous_status: previousStatus.toUpperCase(),
        updated_at: now.toISOString()
      },
      '状态更新成功',
      200
    );
    
  } catch (error) {
    console.error('Update Status API Error:', error);
    
    // 处理 Mongoose 验证错误
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return createErrorResponse(
        messages.join(', '),
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    // 默认错误处理
    return createErrorResponse(
      error.message || '服务器内部错误',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

// 导出 PATCH 处理器（需要 API Key 认证）
export const PATCH = createApiHandler(handlePATCH, [
  MiddlewarePresets.authenticated
]);

