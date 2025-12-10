/**
 * POST /api/v1/projects/:projectId/tasks/:taskId/move
 * 将任务移动到指定队列（或从队列移动到项目级）
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Queue from '@/lib/models/Queue';
import Task from '@/lib/models/Task';

async function handlePOST(request, context) {
  try {
    await connectDB();
    
    const { projectId, taskId } = context.params;
    const data = await request.json();
    
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
    
    const targetQueueId = data.queue_id || null; // null 表示移动到项目级
    
    // 查找任务（可能在项目级或队列中）
    let sourceTask = null;
    let sourceType = null; // 'project' 或 'queue'
    let sourceQueueId = null;
    
    // 先查找项目级任务
    const projectTask = await Task.findOne({
      projectId: project._id,
      taskId: taskId,
      deleted_at: null
    }).lean();
    
    if (projectTask) {
      sourceTask = projectTask;
      sourceType = 'project';
    } else {
      // 查找队列中的任务
      const queues = await Queue.find({
        projectId: project._id
      }).lean();
      
      for (const queue of queues) {
        const task = (queue.tasks || []).find(t => t.id === taskId && !t.deleted_at);
        if (task) {
          sourceTask = task;
          sourceType = 'queue';
          sourceQueueId = queue.queueId;
          break;
        }
      }
    }
    
    if (!sourceTask) {
      return createErrorResponse(
        '任务不存在',
        ERROR_CODES.RESOURCE_NOT_FOUND,
        404,
        { task_id: taskId }
      );
    }
    
    // 如果目标队列和源队列相同，无需移动
    if (sourceType === 'queue' && sourceQueueId === targetQueueId) {
      return createErrorResponse(
        '任务已在目标队列中',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }
    
    // 如果目标队列不存在，验证
    if (targetQueueId) {
      const targetQueue = await Queue.findOne({
        projectId: project._id,
        queueId: targetQueueId
      }).lean();
      
      if (!targetQueue) {
        return createErrorResponse(
          '目标队列不存在',
          ERROR_CODES.RESOURCE_NOT_FOUND,
          404,
          { queue_id: targetQueueId }
        );
      }
      
      // 检查目标队列中是否已有相同ID的任务
      const existingTask = (targetQueue.tasks || []).find(t => t.id === taskId);
      if (existingTask) {
        return createErrorResponse(
          '目标队列中已存在相同ID的任务',
          ERROR_CODES.DUPLICATE_KEY,
          409
        );
      }
    }
    
    const now = new Date();
    
    // 从源位置删除任务
    if (sourceType === 'project') {
      // 从项目级任务中删除（软删除）
      await Task.findByIdAndUpdate(
        sourceTask._id,
        { $set: { deleted_at: now } }
      );
    } else {
      // 从队列中删除任务
      await Queue.findOneAndUpdate(
        {
          projectId: project._id,
          queueId: sourceQueueId
        },
        {
          $pull: { tasks: { id: taskId } },
          $set: { lastTaskAt: now }
        }
      );
    }
    
    // 添加到目标位置
    if (targetQueueId) {
      // 添加到队列
      const taskData = {
        id: sourceTask.taskId || sourceTask.id,
        name: sourceTask.name,
        prompt: sourceTask.prompt,
        spec_file: sourceTask.spec_file || [],
        status: sourceTask.status,
        report: sourceTask.report,
        tags: sourceTask.tags || [],
        source: sourceTask.source,
        created_at: sourceTask.created_at || sourceTask.createdAt || now,
        updated_at: now,
        server_modified_at: sourceTask.server_modified_at || now,
        pulled_at: sourceTask.pulled_at,  // 保持拉取状态
        pulled_by: sourceTask.pulled_by,
        priority: sourceTask.priority,
        expires_at: sourceTask.expires_at,
        deleted_at: null,  // 清除删除标记
        pull_history: sourceTask.pull_history || [],
        messages: sourceTask.messages || [],
        logs: sourceTask.logs || []
      };
      
      await Queue.findOneAndUpdate(
        {
          projectId: project._id,
          queueId: targetQueueId
        },
        {
          $push: { tasks: taskData },
          $set: { lastTaskAt: now }
        }
      );
    } else {
      // 添加到项目级任务
      const taskData = {
        projectId: project._id,
        taskId: sourceTask.taskId || sourceTask.id,
        name: sourceTask.name,
        prompt: sourceTask.prompt,
        spec_file: sourceTask.spec_file || [],
        status: sourceTask.status,
        report: sourceTask.report,
        tags: sourceTask.tags || [],
        source: sourceTask.source,
        created_at: sourceTask.created_at || sourceTask.createdAt || now,
        updated_at: now,
        server_modified_at: sourceTask.server_modified_at || now,
        pulled_at: sourceTask.pulled_at,  // 保持拉取状态
        pulled_by: sourceTask.pulled_by,
        priority: sourceTask.priority,
        expires_at: sourceTask.expires_at,
        deleted_at: null,  // 清除删除标记
        pull_history: sourceTask.pull_history || [],
        messages: sourceTask.messages || [],
        logs: sourceTask.logs || []
      };
      
      await Task.create(taskData);
    }
    
    // 更新项目的 lastTaskAt
    await Project.findByIdAndUpdate(project._id, {
      lastTaskAt: now
    });
    
    return createSuccessResponse({
      task_id: taskId,
      from: sourceType === 'project' ? 'project' : `queue:${sourceQueueId}`,
      to: targetQueueId ? `queue:${targetQueueId}` : 'project',
      moved_at: now.toISOString()
    }, '任务移动成功');
    
  } catch (error) {
    console.error('移动任务失败:', error);
    
    if (error.code === 11000) {
      return createErrorResponse(
        '任务已存在',
        ERROR_CODES.DUPLICATE_KEY,
        409
      );
    }
    
    return createErrorResponse(
      error.message || '服务器内部错误',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const POST = createApiHandler(handlePOST, [
  MiddlewarePresets.authenticated
]);







