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
      messages: messages,
      logs: logs,
      created_at: task.createdAt ? new Date(task.createdAt).toISOString() : new Date().toISOString(),
      updated_at: task.updatedAt ? new Date(task.updatedAt).toISOString() : (task.createdAt ? new Date(task.createdAt).toISOString() : new Date().toISOString())
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

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);
