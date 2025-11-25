/**
 * GET /api/v1/projects/:projectId/queues/:queueId/tasks
 * 获取任务队列下的任务列表
 */
import { createSuccessResponse, createErrorResponse, createPaginatedResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Queue from '@/lib/models/Queue';

async function handleGET(request, context) {
  try {
    // 连接数据库
    await connectDB();

    // 解析路径参数和查询参数
    const { projectId, queueId } = context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status')?.trim();
    const tags = searchParams.get('tags')?.trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);

    // 验证参数
    if (page < 1 || pageSize < 1) {
      return createErrorResponse(
        '页码和每页数量必须大于 0',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

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

    // 查询队列（列表查询，排除 messages 和 logs）
    const queue = await Queue.findOne({
      projectId: project._id,
      queueId: queueId
    }).select({
      'tasks.messages': 0,  // 排除 messages 字段
      'tasks.logs': 0       // 排除 logs 字段
    }).lean();

    if (!queue) {
      return createErrorResponse(
        '任务队列不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId, queue_id: queueId }
      );
    }

    // 从队列的 tasks 数组中过滤任务
    let tasks = queue.tasks || [];

    // 状态过滤
    if (status) {
      const validStatuses = ['pending', 'done', 'error'];
      const statusLower = status.toLowerCase();
      if (!validStatuses.includes(statusLower)) {
        return createErrorResponse(
          '状态值无效，必须是 pending、done 或 error',
          ERROR_CODES.VALIDATION_ERROR,
          400
        );
      }
      tasks = tasks.filter(task => 
        (task.status || 'pending').toLowerCase() === statusLower
      );
    }

    // 标签过滤（如果任务有tags字段）
    if (tags) {
      const tagArray = tags.split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
      tasks = tasks.filter(task => {
        // 如果任务没有tags字段，跳过
        if (!task.tags || !Array.isArray(task.tags)) {
          return false;
        }
        const taskTags = task.tags.map(t => String(t).toLowerCase());
        return tagArray.some(tag => taskTags.includes(tag));
      });
    }

    // 按更新时间倒序排序
    tasks.sort((a, b) => {
      const dateA = a.updatedAt || a.createdAt || new Date(0);
      const dateB = b.updatedAt || b.createdAt || new Date(0);
      return new Date(dateB) - new Date(dateA);
    });

    // 分页处理
    const total = tasks.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedTasks = tasks.slice(startIndex, startIndex + pageSize);

    // 转换数据格式
    const tasksFormatted = paginatedTasks.map(task => ({
      id: task.id,
      name: task.name,
      prompt: task.prompt,
      spec_file: task.spec_file || [],
      status: task.status || 'pending',
      report: task.report || null,
      updated_at: task.updatedAt ? new Date(task.updatedAt).toISOString() : (task.createdAt ? new Date(task.createdAt).toISOString() : new Date().toISOString()),
      created_at: task.createdAt ? new Date(task.createdAt).toISOString() : new Date().toISOString()
    }));

    // 返回分页响应
    return createPaginatedResponse(
      tasksFormatted,
      {
        page,
        pageSize,
        total,
        totalPages
      },
      '查询成功'
    );

  } catch (error) {
    console.error('获取任务列表失败:', error);
    return createErrorResponse(
      error.message || '获取任务列表失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);
