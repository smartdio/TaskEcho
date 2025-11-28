/**
 * GET /api/v1/projects/:projectId/queues
 * 获取项目下的任务队列列表
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
    const { projectId } = context.params;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.trim();
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '100', 10), 100);

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

    // 构建查询条件
    const query = {
      projectId: project._id
    };

    // 如果提供了搜索关键词，添加名称模糊匹配条件
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // 查询任务队列总数（用于分页）
    const total = await Queue.countDocuments(query);

    // 查询任务队列列表（列表查询，排除 messages 和 logs）
    const queues = await Queue.find(query)
      .select({
        'tasks.messages': 0,  // 排除 messages
        'tasks.logs': 0      // 排除 logs
      })
      .sort({ lastTaskAt: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    // 对每个队列统计任务数据（从队列的 tasks 数组中统计）
    const queuesWithStats = queues.map(queue => {
      const tasks = queue.tasks || [];
      
      let totalTasks = 0;
      let pendingTasks = 0;
      let doneTasks = 0;
      let errorTasks = 0;
      
      tasks.forEach(task => {
        totalTasks++;
        const status = (task.status || 'pending').toLowerCase();
        if (status === 'pending') {
          pendingTasks++;
        } else if (status === 'done') {
          doneTasks++;
        } else if (status === 'error') {
          errorTasks++;
        }
      });
      
      const taskStats = {
        total: totalTasks,
        pending: pendingTasks,
        done: doneTasks,
        error: errorTasks
      };
      
      return {
        id: queue._id.toString(),
        queue_id: queue.queueId,
        name: queue.name,
        task_count: taskStats.total,
        task_stats: taskStats,
        last_task_at: queue.lastTaskAt ? queue.lastTaskAt.toISOString() : null,
        created_at: queue.createdAt.toISOString(),
        updated_at: queue.updatedAt.toISOString()
      };
    });

    // 计算总页数
    const totalPages = Math.ceil(total / pageSize);

    // 返回分页响应
    return createPaginatedResponse(
      queuesWithStats,
      {
        page,
        pageSize,
        total,
        totalPages
      },
      '查询成功'
    );

  } catch (error) {
    console.error('获取任务队列列表失败:', error);
    return createErrorResponse(
      error.message || '获取任务队列列表失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);
