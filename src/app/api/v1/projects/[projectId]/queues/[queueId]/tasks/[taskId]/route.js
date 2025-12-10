/**
 * GET /api/v1/projects/:projectId/queues/:queueId/tasks/:taskId
 * 获取任务详情，包含完整的对话历史和日志
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Queue from '@/lib/models/Queue';

async function handleGET(request, context) {
  try {
    // 连接数据库
    await connectDB();

    // 解析路径参数
    const { projectId, queueId, taskId } = context.params;

    // 查询项目
    const project = await Project.findOne({ projectId }).lean();

    if (!project) {
      return createErrorResponse(
        '项目不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId }
      );
    }

    // 查询队列（详情查询，包含完整的 tasks 数组，包括 messages 和 logs）
    const queue = await Queue.findOne({
      projectId: project._id,
      queueId: queueId
    }).lean();

    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId, queue_id: queueId }
      );
    }

    // 在队列的 tasks 数组中查找指定任务
    const task = queue.tasks?.find(t => t.id === taskId);

    if (!task) {
      return createErrorResponse(
        '任务不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId, queue_id: queueId, task_id: taskId }
      );
    }

    // 排序 messages（按 createdAt 正序）
    const messages = (task.messages || []).sort((a, b) => {
      const dateA = a.createdAt || new Date(0);
      const dateB = b.createdAt || new Date(0);
      return new Date(dateA) - new Date(dateB);
    }).map(msg => ({
      role: msg.role?.toLowerCase() || 'user', // 转换为小写
      content: msg.content || '',
      session_id: msg.sessionId || null,  // 客户端与 cursor-agent 交互时的对话会话ID
      created_at: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString()
    }));

    // 排序 logs（按 createdAt 倒序，最新的在上方）
    const logs = (task.logs || []).sort((a, b) => {
      const dateA = a.createdAt || new Date(0);
      const dateB = b.createdAt || new Date(0);
      return new Date(dateB) - new Date(dateA);
    }).map(log => ({
      content: log.content || '',
      created_at: log.createdAt ? new Date(log.createdAt).toISOString() : new Date().toISOString()
    }));

    // 返回格式化后的任务详情数据
    const taskData = {
      id: task.id,
      name: task.name,
      prompt: task.prompt || '',
      spec_file: task.spec_file || [],
      status: (task.status || 'pending').toLowerCase(),
      report: task.report || null,
      tags: task.tags || [],
      source: task.source || 'client',
      created_at: task.created_at ? new Date(task.created_at).toISOString() : (task.createdAt ? new Date(task.createdAt).toISOString() : new Date().toISOString()),
      updated_at: task.updated_at ? new Date(task.updated_at).toISOString() : (task.updatedAt ? new Date(task.updatedAt).toISOString() : (task.createdAt ? new Date(task.createdAt).toISOString() : new Date().toISOString())),
      server_modified_at: task.server_modified_at ? new Date(task.server_modified_at).toISOString() : null,
      pulled_at: task.pulled_at ? new Date(task.pulled_at).toISOString() : null,
      pulled_by: task.pulled_by || null,
      priority: task.priority || null,
      expires_at: task.expires_at ? new Date(task.expires_at).toISOString() : null,
      pull_history: task.pull_history || [],
      messages: messages,
      logs: logs
    };

    return createSuccessResponse(
      taskData,
      '查询成功'
    );

  } catch (error) {
    console.error('获取任务详情失败:', error);
    return createErrorResponse(
      error.message || '获取任务详情失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

async function handlePUT(request, context) {
  try {
    await connectDB();
    
    const { projectId, queueId, taskId } = context.params;
    
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
    
    // 查询队列
    const queue = await Queue.findOne({
      projectId: project._id,
      queueId: queueId
    });
    
    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { queue_id: queueId }
      );
    }
    
    // 查找任务
    const taskIndex = queue.tasks.findIndex(t => t.id === taskId && !t.deleted_at);
    if (taskIndex === -1) {
      return createErrorResponse(
        '任务不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { task_id: taskId }
      );
    }
    
    const task = queue.tasks[taskIndex];
    
    // 解析请求体
    const data = await request.json();
    
    const now = new Date();
    const updateFields = {};
    
    // 如果任务已拉取，重置拉取状态
    if (task.pulled_at) {
      updateFields['tasks.$.pulled_at'] = null;
      updateFields['tasks.$.pulled_by'] = null;
    }
    
    // 更新字段
    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim()) {
        return createErrorResponse(
          'name 不能为空',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      updateFields['tasks.$.name'] = data.name.trim();
    }
    
    if (data.prompt !== undefined) {
      if (typeof data.prompt !== 'string' || !data.prompt.trim()) {
        return createErrorResponse(
          'prompt 不能为空',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      updateFields['tasks.$.prompt'] = data.prompt.trim();
    }
    
    if (data.spec_file !== undefined) {
      if (!Array.isArray(data.spec_file)) {
        return createErrorResponse(
          'spec_file 必须是数组',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      updateFields['tasks.$.spec_file'] = data.spec_file;
    }
    
    if (data.status !== undefined) {
      const validStatuses = ['pending', 'running', 'done', 'error', 'cancelled'];
      const status = data.status.toLowerCase();
      if (!validStatuses.includes(status)) {
        return createErrorResponse(
          `status 必须是 ${validStatuses.join(', ')} 之一`,
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      updateFields['tasks.$.status'] = status;
    }
    
    if (data.report !== undefined) {
      updateFields['tasks.$.report'] = data.report || null;
    }
    
    if (data.tags !== undefined) {
      if (!Array.isArray(data.tags)) {
        return createErrorResponse(
          'tags 必须是数组',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      updateFields['tasks.$.tags'] = data.tags;
    }
    
    if (data.priority !== undefined) {
      if (data.priority === null) {
        updateFields['tasks.$.priority'] = null;
      } else if (typeof data.priority === 'string') {
        const validPriorities = ['high', 'medium', 'low'];
        if (!validPriorities.includes(data.priority.toLowerCase())) {
          return createErrorResponse(
            `priority 字符串必须是 ${validPriorities.join(', ')} 之一`,
            ERROR_CODES.VALIDATION_ERROR,
            400
          );
        }
        updateFields['tasks.$.priority'] = data.priority.toLowerCase();
      } else if (typeof data.priority === 'number') {
        if (data.priority < 1 || data.priority > 10) {
          return createErrorResponse(
            'priority 数字必须在 1-10 之间',
            ERROR_CODES.VALIDATION_ERROR,
            400
          );
        }
        updateFields['tasks.$.priority'] = data.priority;
      } else {
        return createErrorResponse(
          'priority 必须是字符串、数字或 null',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
    }
    
    if (data.expires_at !== undefined) {
      if (data.expires_at === null) {
        updateFields['tasks.$.expires_at'] = null;
      } else {
        const expiresAt = new Date(data.expires_at);
        if (isNaN(expiresAt.getTime())) {
          return createErrorResponse(
            'expires_at 必须是有效的日期时间或 null',
            ERROR_CODES.VALIDATION_ERROR,
            400
          );
        }
        updateFields['tasks.$.expires_at'] = expiresAt;
      }
    }
    
    // 总是更新这些字段
    updateFields['tasks.$.updated_at'] = now;
    updateFields['tasks.$.server_modified_at'] = now;
    updateFields['lastTaskAt'] = now;
    
    // 更新任务
    const updatedQueue = await Queue.findOneAndUpdate(
      {
        projectId: project._id,
        queueId: queueId,
        'tasks.id': taskId,
        'tasks.deleted_at': null
      },
      { $set: updateFields },
      { new: true }
    );
    
    if (!updatedQueue) {
      return createErrorResponse(
        '任务更新失败',
        ERROR_CODES.INTERNAL_ERROR,
        500
      );
    }
    
    // 更新项目的 lastTaskAt
    await Project.findByIdAndUpdate(project._id, {
      lastTaskAt: now
    });
    
    const updatedTask = updatedQueue.tasks.find(t => t.id === taskId);
    
    return createSuccessResponse({
      task_id: updatedTask.id,
      name: updatedTask.name,
      status: updatedTask.status,
      source: updatedTask.source,
      updated_at: updatedTask.updated_at,
      server_modified_at: updatedTask.server_modified_at,
      pulled_at: updatedTask.pulled_at  // 如果已重置，这里会是 null
    }, '任务更新成功');
    
  } catch (error) {
    console.error('更新任务失败:', error);
    
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return createErrorResponse(
        messages.join(', '),
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    return createErrorResponse(
      error.message || '服务器内部错误',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

async function handleDELETE(request, context) {
  try {
    await connectDB();
    
    const { projectId, queueId, taskId } = context.params;
    
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
    
    // 查询队列
    const queue = await Queue.findOne({
      projectId: project._id,
      queueId: queueId
    });
    
    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { queue_id: queueId }
      );
    }
    
    // 查找任务
    const task = queue.tasks.find(t => t.id === taskId && !t.deleted_at);
    if (!task) {
      return createErrorResponse(
        '任务不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { task_id: taskId }
      );
    }
    
    // 软删除：设置 deleted_at
    const now = new Date();
    const updatedQueue = await Queue.findOneAndUpdate(
      {
        projectId: project._id,
        queueId: queueId,
        'tasks.id': taskId,
        'tasks.deleted_at': null
      },
      {
        $set: {
          'tasks.$.deleted_at': now,
          'lastTaskAt': now
        }
      },
      { new: true }
    );
    
    if (!updatedQueue) {
      return createErrorResponse(
        '任务删除失败',
        ERROR_CODES.INTERNAL_ERROR,
        500
      );
    }
    
    // 更新项目的 lastTaskAt
    await Project.findByIdAndUpdate(project._id, {
      lastTaskAt: now
    });
    
    return createSuccessResponse({
      task_id: taskId,
      deleted_at: now
    }, '任务删除成功');
    
  } catch (error) {
    console.error('删除任务失败:', error);
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

export const PUT = createApiHandler(handlePUT, [
  MiddlewarePresets.authenticated
]);

export const DELETE = createApiHandler(handleDELETE, [
  MiddlewarePresets.authenticated
]);
