/**
 * GET /api/v1/stats
 * 获取全局统计信息
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

    // 1. 统计项目总数
    const projectCount = await Project.countDocuments();

    // 2. 统计任务队列总数
    const queueCount = await Queue.countDocuments();

    // 3. 查询所有队列（排除 messages 和 logs 以提高性能）
    const queues = await Queue.find().select({
      'tasks.messages': 0,
      'tasks.logs': 0
    }).lean();

    // 4. 统计任务总数和各状态任务数（从队列的 tasks 数组中统计）
    let totalTasks = 0;
    let pendingTasks = 0;
    let doneTasks = 0;
    let errorTasks = 0;

    queues.forEach(queue => {
      const tasks = queue.tasks || [];
      totalTasks += tasks.length;
      tasks.forEach(task => {
        const status = (task.status || 'pending').toLowerCase();
        if (status === 'pending') {
          pendingTasks++;
        } else if (status === 'done') {
          doneTasks++;
        } else if (status === 'error') {
          errorTasks++;
        }
      });
    });

    // 5. 构建统计信息
    const stats = {
      project_count: projectCount,
      queue_count: queueCount,
      task_count: totalTasks,
      task_stats: {
        total: totalTasks,
        pending: pendingTasks,
        done: doneTasks,
        error: errorTasks
      }
    };

    // 6. 返回成功响应
    return createSuccessResponse(stats, '查询成功');

  } catch (error) {
    console.error('获取全局统计失败:', error);
    return createErrorResponse(
      error.message || '获取全局统计失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);
