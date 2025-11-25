/**
 * POST /api/v1/tasks/message
 * 追加对话消息接口
 * 注意：project_id、queue_id、task_id 从请求体获取，不使用路径参数（避免特殊字符问题）
 */
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Queue from '@/lib/models/Queue';
import { validateApiKeyProject } from '@/lib/auth';

/**
 * 验证请求体数据（包括 project_id、queue_id、task_id、role 和 content）
 */
function validateMessageData(data) {
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
  
  // 验证 role
  if (!data.role || typeof data.role !== 'string') {
    errors.push({ field: 'role', reason: 'role 不能为空' });
  } else {
    const roleLower = data.role.toLowerCase();
    if (!['user', 'assistant'].includes(roleLower)) {
      errors.push({ field: 'role', reason: 'role 必须是 user 或 assistant' });
    }
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
 * 处理追加消息请求
 */
async function handlePOST(request, context) {
  try {
    await connectDB();
    
    // 1. 解析请求体
    const body = await request.json();
    
    // 2. 验证请求体数据（包括 project_id、queue_id、task_id、role 和 content）
    const validationErrors = validateMessageData(body);
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
    
    // 8. 检查任务的 messages 数组是否存在，如果不存在则先初始化
    const task = queue.tasks[taskIndex];
    if (!task.messages || !Array.isArray(task.messages)) {
      // 如果 messages 数组不存在，先初始化它
      await Queue.findOneAndUpdate(
        {
          _id: queue._id,
          'tasks.id': taskId
        },
        {
          $set: {
            'tasks.$.messages': []
          }
        }
      );
      // 重新查询队列以获取更新后的数据
      const refreshedQueue = await Queue.findById(queue._id);
      if (!refreshedQueue) {
        return createErrorResponse(
          '队列不存在',
          ERROR_CODES.RESOURCE_NOT_FOUND,
          404
        );
      }
      // 更新 queue 对象以便后续使用
      Object.assign(queue, refreshedQueue.toObject());
    }
    
    // 9. 准备新消息
    const now = new Date();
    const newMessage = {
      role: body.role.toUpperCase(),
      content: body.content.trim(),
      sessionId: body.session_id || null,  // 客户端与 cursor-agent 交互时的对话会话ID，原样保存
      createdAt: now
    };
    
    // 10. 追加消息到任务（使用 $push）
    const updateResult = await Queue.findOneAndUpdate(
      {
        _id: queue._id,
        'tasks.id': taskId
      },
      {
        $push: {
          'tasks.$.messages': newMessage
        },
        $set: {
          lastTaskAt: now,
          updatedAt: now
        }
      },
      { new: true, runValidators: true }
    );
    
    if (!updateResult) {
      console.error('[Add Message API] findOneAndUpdate 返回 null:', {
        queue_id: queue._id.toString(),
        task_id: taskId,
        queue_tasks_count: queue.tasks.length,
        task_ids: queue.tasks.map(t => t.id)
      });
      
      return createErrorResponse(
        '消息追加失败：数据库更新操作失败',
        ERROR_CODES.INTERNAL_ERROR,
        500,
        {
          project_id: projectId,
          queue_id: queueId,
          task_id: taskId
        }
      );
    }
    
    // 11. 更新项目的 lastTaskAt
    await Project.findByIdAndUpdate(project._id, {
      lastTaskAt: now
    });
    
    // 12. 获取追加后的消息（用于返回 message_id）
    const updatedTask = updateResult.tasks.find(t => t.id === taskId);
    if (!updatedTask) {
      console.error('[Add Message API] 更新后无法找到任务:', {
        queue_id: queue._id,
        task_id: taskId,
        available_task_ids: updateResult.tasks.map(t => t.id)
      });
      return createErrorResponse(
        '消息追加成功，但无法获取任务信息',
        ERROR_CODES.INTERNAL_ERROR,
        500
      );
    }
    
    const messages = updatedTask.messages || [];
    if (messages.length === 0) {
      console.error('[Add Message API] 消息数组为空:', {
        queue_id: queue._id,
        task_id: taskId,
        task_messages_length: messages.length
      });
      return createErrorResponse(
        '消息追加失败：消息未保存',
        ERROR_CODES.INTERNAL_ERROR,
        500
      );
    }
    
    const addedMessage = messages[messages.length - 1];
    
    // 验证追加的消息是否正确
    if (!addedMessage || addedMessage.content !== newMessage.content) {
      console.error('[Add Message API] 追加的消息不匹配:', {
        expected: newMessage,
        actual: addedMessage,
        all_messages: messages
      });
      return createErrorResponse(
        '消息追加失败：消息内容不匹配',
        ERROR_CODES.INTERNAL_ERROR,
        500
      );
    }
    
    // 13. 返回成功响应
    return createSuccessResponse(
      {
        message_id: messages.length - 1, // 使用索引作为 message_id
        role: addedMessage.role,
        content: addedMessage.content,
        session_id: addedMessage.sessionId || null,  // 返回会话ID
        created_at: addedMessage.createdAt.toISOString()
      },
      '消息追加成功',
      200
    );
    
  } catch (error) {
    console.error('Add Message API Error:', error);
    
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

