/**
 * POST /api/v1/tasks/log
 * 追加执行日志接口
 * 注意：project_id、queue_id、task_id 从请求体获取，不使用路径参数（避免特殊字符问题）
 */
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Queue from '@/lib/models/Queue';
import { validateApiKeyProject } from '@/lib/auth';

/**
 * 验证请求体数据（包括 project_id、queue_id、task_id 和 content）
 */
function validateLogData(data) {
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
  
  // 验证 content
  if (!data.content || typeof data.content !== 'string' || !data.content.trim()) {
    errors.push({ field: 'content', reason: 'content 不能为空' });
  } else if (data.content.length > 100000) {
    errors.push({ field: 'content', reason: 'content 长度不能超过100000个字符' });
  }
  
  return errors;
}

/**
 * 处理追加日志请求
 */
async function handlePOST(request, context) {
  try {
    await connectDB();
    
    // 1. 解析请求体
    const body = await request.json();
    
    // 2. 验证请求体数据（包括 project_id、queue_id、task_id 和 content）
    const validationErrors = validateLogData(body);
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
    
    // 7. 查找任务
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
    
    // 8. 准备新日志（自动添加时间戳）
    const now = new Date();
    const newLog = {
      content: body.content.trim(),
      createdAt: now
    };
    
    // 9. 追加日志到任务（使用 $push）
    const updatedQueue = await Queue.findOneAndUpdate(
      {
        _id: queue._id,
        'tasks.id': taskId
      },
      {
        $push: {
          'tasks.$.logs': newLog
        }
        // 注意：日志追加不更新任务的 updatedAt 和队列的 lastTaskAt
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
    
    // 10. 获取追加后的日志（用于返回 log_id）
    const updatedTask = updatedQueue.tasks.find(t => t.id === taskId);
    const logs = updatedTask.logs || [];
    const addedLog = logs[logs.length - 1];
    
    // 11. 返回成功响应
    return createSuccessResponse(
      {
        log_id: logs.length - 1, // 使用索引作为 log_id
        content: addedLog.content,
        created_at: addedLog.createdAt.toISOString()
      },
      '日志追加成功',
      200
    );
    
  } catch (error) {
    console.error('Add Log API Error:', error);
    
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

// 导出 POST 处理器（需要 API Key 认证）
export const POST = createApiHandler(handlePOST, [
  MiddlewarePresets.authenticated
]);

