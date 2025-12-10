/**
 * POST /api/v1/projects/:projectId/tasks
 * 在项目中创建任务（不属于任何队列）
 */
import { createSuccessResponse, createErrorResponse, createPaginatedResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Task from '@/lib/models/Task';

async function handlePOST(request, context) {
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
    
    // 解析请求体
    const data = await request.json();
    
    // 验证必填字段
    if (!data.taskId || typeof data.taskId !== 'string' || !data.taskId.trim()) {
      return createErrorResponse(
        'taskId 不能为空',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      return createErrorResponse(
        'name 不能为空',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    if (!data.prompt || typeof data.prompt !== 'string' || !data.prompt.trim()) {
      return createErrorResponse(
        'prompt 不能为空',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    // 验证状态
    const validStatuses = ['pending', 'running', 'done', 'error', 'cancelled'];
    const status = data.status ? data.status.toLowerCase() : 'pending';
    if (!validStatuses.includes(status)) {
      return createErrorResponse(
        `status 必须是 ${validStatuses.join(', ')} 之一`,
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    // 验证优先级
    let priority = null;
    if (data.priority !== undefined && data.priority !== null) {
      if (typeof data.priority === 'string') {
        const validPriorities = ['high', 'medium', 'low'];
        if (!validPriorities.includes(data.priority.toLowerCase())) {
          return createErrorResponse(
            `priority 字符串必须是 ${validPriorities.join(', ')} 之一`,
            ERROR_CODES.VALIDATION_ERROR,
            400
          );
        }
        priority = data.priority.toLowerCase();
      } else if (typeof data.priority === 'number') {
        if (data.priority < 1 || data.priority > 10) {
          return createErrorResponse(
            'priority 数字必须在 1-10 之间',
            ERROR_CODES.VALIDATION_ERROR,
            400
          );
        }
        priority = data.priority;
      } else {
        return createErrorResponse(
          'priority 必须是字符串或数字',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
    }
    
    // 验证过期时间
    let expiresAt = null;
    if (data.expires_at !== undefined && data.expires_at !== null) {
      expiresAt = new Date(data.expires_at);
      if (isNaN(expiresAt.getTime())) {
        return createErrorResponse(
          'expires_at 必须是有效的日期时间',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
    }
    
    const now = new Date();
    
    // 检查任务是否已存在
    const existingTask = await Task.findOne({
      projectId: project._id,
      taskId: data.taskId
    }).lean();
    
    if (existingTask) {
      return createErrorResponse(
        '任务已存在',
        ERROR_CODES.DUPLICATE_KEY,
        409,
        { task_id: data.taskId }
      );
    }
    
    // 创建任务
    const task = await Task.create({
      projectId: project._id,
      taskId: data.taskId,
      name: data.name,
      prompt: data.prompt,
      spec_file: data.spec_file || [],
      status: status,
      report: data.report || null,
      tags: data.tags || [],
      source: 'server',  // 服务端创建的任务
      created_at: now,
      updated_at: now,
      server_modified_at: now,
      pulled_at: null,
      pulled_by: null,
      priority: priority,
      expires_at: expiresAt,
      deleted_at: null,
      pull_history: [],
      messages: [],
      logs: []
    });
    
    return createSuccessResponse(
      {
        task_id: task.taskId,
        name: task.name,
        status: task.status,
        source: task.source,
        created_at: task.created_at
      },
      '任务创建成功',
      201
    );
    
  } catch (error) {
    console.error('创建项目任务失败:', error);
    
    if (error.code === 11000) {
      return createErrorResponse(
        '任务已存在',
        ERROR_CODES.DUPLICATE_KEY,
        409
      );
    }
    
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

async function handleGET(request, context) {
  try {
    await connectDB();
    
    const { projectId } = context.params;
    const { searchParams } = new URL(request.url);
    
    // 解析查询参数
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    const status = searchParams.get('status')?.trim();
    const pulledStatus = searchParams.get('pulled_status')?.trim(); // 'pulled' | 'not_pulled' | 'all'
    
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
      deleted_at: null
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
    
    // 拉取状态过滤
    if (pulledStatus === 'pulled') {
      query.pulled_at = { $ne: null };
    } else if (pulledStatus === 'not_pulled') {
      query.pulled_at = null;
    }
    
    // 查询任务
    const total = await Task.countDocuments(query);
    const tasks = await Task.find(query)
      .sort({ created_at: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();
    
    // 格式化任务数据
    const formattedTasks = tasks.map(task => ({
      task_id: task.taskId,
      id: task.taskId,
      name: task.name,
      prompt: task.prompt,
      spec_file: task.spec_file || [],
      status: task.status,
      report: task.report,
      tags: task.tags || [],
      source: task.source,
      created_at: task.created_at ? new Date(task.created_at).toISOString() : null,
      updated_at: task.updated_at ? new Date(task.updated_at).toISOString() : null,
      server_modified_at: task.server_modified_at ? new Date(task.server_modified_at).toISOString() : null,
      pulled_at: task.pulled_at ? new Date(task.pulled_at).toISOString() : null,
      pulled_by: task.pulled_by,
      priority: task.priority
    }));
    
    const totalPages = Math.ceil(total / pageSize);
    
    return createPaginatedResponse(
      formattedTasks,
      {
        page,
        pageSize,
        total,
        totalPages
      },
      '查询成功'
    );
    
  } catch (error) {
    console.error('获取项目级任务列表失败:', error);
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

export const POST = createApiHandler(handlePOST, [
  MiddlewarePresets.authenticated
]);

