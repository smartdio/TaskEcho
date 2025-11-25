/**
 * GET /api/v1/projects
 * 获取项目列表（支持分页）
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES, createPaginatedResponse } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Queue from '@/lib/models/Queue';

async function handleGET(request, context) {
  try {
    // 连接数据库
    await connectDB();

    // 解析查询参数
    const { searchParams } = new URL(request.url);
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

    // 查询项目列表（按 lastTaskAt 倒序，如果为 null 则按 createdAt 倒序）
    const projects = await Project.find()
      .sort({ lastTaskAt: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();

    // 统计总数
    const total = await Project.countDocuments();

    // 对每个项目统计关联数据
    const projectsWithStats = await Promise.all(
      projects.map(async (project) => {
        // 统计任务队列数量
        const queueCount = await Queue.countDocuments({ projectId: project._id });

        // 查询该项目的所有队列（排除 messages 和 logs 以提高性能）
        const queues = await Queue.find({ projectId: project._id })
          .select({
            'tasks.messages': 0,
            'tasks.logs': 0
          })
          .lean();

        // 统计任务总数和各状态任务数
        let taskCount = 0;
        let pendingCount = 0;
        let doneCount = 0;
        let errorCount = 0;

        queues.forEach(queue => {
          const tasks = queue.tasks || [];
          taskCount += tasks.length;
          tasks.forEach(task => {
            const status = (task.status || 'pending').toLowerCase();
            if (status === 'pending') {
              pendingCount++;
            } else if (status === 'done') {
              doneCount++;
            } else if (status === 'error') {
              errorCount++;
            }
          });
        });

        // 返回格式化后的项目数据
        return {
          id: project._id.toString(),
          project_id: project.projectId,
          name: project.name,
          clientInfo: project.clientInfo || null,
          queue_count: queueCount,
          task_count: taskCount,
          task_stats: {
            total: taskCount,
            pending: pendingCount,
            done: doneCount,
            error: errorCount
          },
          last_task_at: project.lastTaskAt ? project.lastTaskAt.toISOString() : null,
          created_at: project.createdAt.toISOString(),
          updated_at: project.updatedAt.toISOString()
        };
      })
    );

    // 计算分页信息
    const totalPages = Math.ceil(total / pageSize);

    // 返回分页响应
    return createPaginatedResponse(
      projectsWithStats,
      {
        page,
        pageSize,
        total,
        totalPages
      },
      '查询成功'
    );

  } catch (error) {
    console.error('获取项目列表失败:', error);
    return createErrorResponse(
      error.message || '获取项目列表失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);
