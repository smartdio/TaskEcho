/**
 * GET /api/v1/projects/:projectId
 * 获取项目详情
 * 
 * PUT /api/v1/projects/:projectId
 * 更新项目信息
 * 
 * DELETE /api/v1/projects/:projectId
 * 删除项目（级联删除所有关联的队列和任务）
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
    const { projectId } = context.params;

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
    const projectData = {
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

    return createSuccessResponse(projectData, '查询成功');

  } catch (error) {
    console.error('获取项目详情失败:', error);
    return createErrorResponse(
      error.message || '获取项目详情失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

/**
 * 更新项目信息
 */
async function handlePUT(request, context) {
  try {
    // 连接数据库
    await connectDB();

    // 解析路径参数
    const { projectId } = context.params;

    // 解析请求体
    const data = await request.json();
    const { name } = data;

    // 验证请求数据
    if (!name || !name.trim()) {
      return createErrorResponse(
        '项目名称不能为空',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        { field: 'name' }
      );
    }

    if (name.length > 255) {
      return createErrorResponse(
        '项目名称长度不能超过 255 字符',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        { field: 'name' }
      );
    }

    // 查询项目
    const project = await Project.findOne({ projectId });

    if (!project) {
      return createErrorResponse(
        '项目不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId }
      );
    }

    // 更新项目名称
    project.name = name.trim();
    await project.save();

    // 返回格式化后的项目数据
    const projectData = {
      id: project._id.toString(),
      project_id: project.projectId,
      name: project.name,
      updated_at: project.updatedAt.toISOString()
    };

    return createSuccessResponse(projectData, '项目更新成功');

  } catch (error) {
    console.error('更新项目失败:', error);
    return createErrorResponse(
      error.message || '更新项目失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

/**
 * 删除项目（级联删除所有关联的队列和任务）
 */
async function handleDELETE(request, context) {
  try {
    // 连接数据库
    await connectDB();

    // 解析路径参数
    const { projectId } = context.params;

    // 查询项目
    const project = await Project.findOne({ projectId });

    if (!project) {
      return createErrorResponse(
        '项目不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { project_id: projectId }
      );
    }

    // 级联删除：先删除所有关联的队列（任务已嵌入在队列中，会自动删除）
    await Queue.deleteMany({ projectId: project._id });

    // 删除项目
    await Project.deleteOne({ _id: project._id });

    // 返回成功响应
    return createSuccessResponse(
      { project_id: projectId },
      '项目删除成功'
    );

  } catch (error) {
    console.error('删除项目失败:', error);
    return createErrorResponse(
      error.message || '删除项目失败',
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
