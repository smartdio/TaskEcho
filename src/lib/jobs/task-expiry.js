/**
 * 任务过期处理定时任务
 * 检查过期任务（expires_at < now），可选：自动删除或归档
 */
import connectDB from '@/lib/mongoose';
import Task from '@/lib/models/Task';
import Queue from '@/lib/models/Queue';

/**
 * 处理过期任务
 * @param {Object} options - 配置选项
 * @param {boolean} options.autoDelete - 是否自动删除过期任务，默认false（只标记）
 */
export async function processExpiredTasks(options = {}) {
  const { autoDelete = false } = options;
  
  try {
    await connectDB();
    
    const now = new Date();
    
    console.log(`[Task Expiry] 开始检查过期任务，当前时间: ${now.toISOString()}`);
    
    // 1. 处理项目级任务
    const expiredProjectTasks = await Task.find({
      expires_at: { $ne: null, $lt: now },
      deleted_at: null
    }).lean();
    
    let processedProjectTasks = 0;
    for (const task of expiredProjectTasks) {
      if (autoDelete) {
        // 软删除
        await Task.findByIdAndUpdate(
          task._id,
          { $set: { deleted_at: now } }
        );
      } else {
        // 只记录日志，不删除
        console.log(`[Task Expiry] 发现过期项目级任务: ${task.taskId}`);
      }
      processedProjectTasks++;
    }
    
    // 2. 处理队列中的任务
    const queues = await Queue.find({}).lean();
    let processedQueueTasks = 0;
    
    for (const queue of queues) {
      const tasks = queue.tasks || [];
      const updateFields = {};
      let hasUpdates = false;
      
      tasks.forEach((task, index) => {
        if (task.expires_at && 
            new Date(task.expires_at) < now && 
            !task.deleted_at) {
          
          if (autoDelete) {
            updateFields[`tasks.${index}.deleted_at`] = now;
            hasUpdates = true;
            processedQueueTasks++;
          } else {
            console.log(`[Task Expiry] 发现过期队列任务: ${queue.queueId}/${task.id}`);
            processedQueueTasks++;
          }
        }
      });
      
      if (hasUpdates) {
        await Queue.findByIdAndUpdate(
          queue._id,
          { $set: updateFields }
        );
      }
    }
    
    const totalProcessed = processedProjectTasks + processedQueueTasks;
    
    if (totalProcessed > 0) {
      console.log(`[Task Expiry] 处理了 ${totalProcessed} 个过期任务`);
      console.log(`  - 项目级任务: ${processedProjectTasks}`);
      console.log(`  - 队列任务: ${processedQueueTasks}`);
      if (autoDelete) {
        console.log(`  - 已自动删除过期任务`);
      } else {
        console.log(`  - 仅记录日志，未删除`);
      }
    } else {
      console.log(`[Task Expiry] 没有过期任务`);
    }
    
    return {
      processed_project_tasks: processedProjectTasks,
      processed_queue_tasks: processedQueueTasks,
      total_processed: totalProcessed,
      auto_delete: autoDelete
    };
    
  } catch (error) {
    console.error('[Task Expiry] 执行失败:', error);
    throw error;
  }
}

/**
 * 运行定时任务（可以设置为cron job或定期调用）
 */
export async function runTaskExpiryJob(options = {}) {
  try {
    const result = await processExpiredTasks(options);
    return result;
  } catch (error) {
    console.error('[Task Expiry Job] 执行失败:', error);
    throw error;
  }
}







