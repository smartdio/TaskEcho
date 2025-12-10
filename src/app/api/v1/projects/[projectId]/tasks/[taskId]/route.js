/**
 * GET /api/v1/projects/:projectId/tasks/:taskId
 * 获取项目级任务详情
 * 
 * PUT /api/v1/projects/:projectId/tasks/:taskId
 * 编辑项目级任务
 * 
 * DELETE /api/v1/projects/:projectId/tasks/:taskId
 * 删除项目级任务（软删除）
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Task from '@/lib/models/Task';

async function handleGET(request, context) {
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
      deleted_at: null  // 排除已删除的任务
    }).lean();
    
    if (!task) {
      return createErrorResponse(
        '任务不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { task_id: taskId }
      );
    }
    
    return createSuccessResponse({
      task_id: task.taskId,
      name: task.name,
      prompt: task.prompt,
      spec_file: task.spec_file || [],
      status: task.status,
      report: task.report,
      tags: task.tags || [],
      source: task.source,
      created_at: task.created_at,
      updated_at: task.updated_at,
      server_modified_at: task.server_modified_at,
      pulled_at: task.pulled_at,
      pulled_by: task.pulled_by,
      priority: task.priority,
      expires_at: task.expires_at,
      pull_history: task.pull_history || [],
      messages: task.messages || [],
      logs: task.logs || []
    });
    
  } catch (error) {
    console.error('获取任务详情失败:', error);
    return createErrorResponse(
      error.message || '服务器内部错误',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

async function handlePUT(request, context) {
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
    
    // 解析请求体
    const data = await request.json();
    
    const now = new Date();
    const updateData = {
      updated_at: now,
      server_modified_at: now
    };
    
    // 如果任务已拉取，重置拉取状态
    if (task.pulled_at) {
      updateData.pulled_at = null;
      updateData.pulled_by = null;
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
      updateData.name = data.name.trim();
    }
    
    if (data.prompt !== undefined) {
      if (typeof data.prompt !== 'string' || !data.prompt.trim()) {
        return createErrorResponse(
          'prompt 不能为空',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      updateData.prompt = data.prompt.trim();
    }
    
    if (data.spec_file !== undefined) {
      if (!Array.isArray(data.spec_file)) {
        return createErrorResponse(
          'spec_file 必须是数组',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      updateData.spec_file = data.spec_file;
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
      updateData.status = status;
    }
    
    if (data.report !== undefined) {
      updateData.report = data.report || null;
    }
    
    if (data.tags !== undefined) {
      if (!Array.isArray(data.tags)) {
        return createErrorResponse(
          'tags 必须是数组',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      updateData.tags = data.tags;
    }
    
    if (data.priority !== undefined) {
      if (data.priority === null) {
        updateData.priority = null;
      } else if (typeof data.priority === 'string') {
        const validPriorities = ['high', 'medium', 'low'];
        if (!validPriorities.includes(data.priority.toLowerCase())) {
          return createErrorResponse(
            `priority 字符串必须是 ${validPriorities.join(', ')} 之一`,
            ERROR_CODES.VALIDATION_ERROR,
            400
          );
        }
        updateData.priority = data.priority.toLowerCase();
      } else if (typeof data.priority === 'number') {
        if (data.priority < 1 || data.priority > 10) {
          return createErrorResponse(
            'priority 数字必须在 1-10 之间',
            ERROR_CODES.VALIDATION_ERROR,
            400
          );
        }
        updateData.priority = data.priority;
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
        updateData.expires_at = null;
      } else {
        const expiresAt = new Date(data.expires_at);
        if (isNaN(expiresAt.getTime())) {
          return createErrorResponse(
            'expires_at 必须是有效的日期时间或 null',
            ERROR_CODES.VALIDATION_ERROR,
            400
          );
        }
        updateData.expires_at = expiresAt;
      }
    }
    
    // 更新任务
    const updatedTask = await Task.findByIdAndUpdate(
      task._id,
      { $set: updateData },
      { new: true }
    );
    
    return createSuccessResponse({
      task_id: updatedTask.taskId,
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
    
    // 软删除：设置 deleted_at
    const now = new Date();
    await Task.findByIdAndUpdate(
      task._id,
      { $set: { deleted_at: now } }
    );
    
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







