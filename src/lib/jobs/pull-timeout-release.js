/**
 * 拉取超时自动释放定时任务
 * 检查超过 pull_timeout（默认1小时）未推送的任务，自动释放拉取锁定
 */
import connectDB from '@/lib/mongoose';
import Task from '@/lib/models/Task';
import Queue from '@/lib/models/Queue';
import Project from '@/lib/models/Project';

const PULL_TIMEOUT_MS = 3600000; // 默认1小时（毫秒）

/**
 * 释放超时的拉取锁定
 * @param {number} timeoutMs - 超时时间（毫秒），默认1小时
 */
export async function releaseTimeoutPulls(timeoutMs = PULL_TIMEOUT_MS) {
  try {
    await connectDB();
    
    const now = new Date();
    const timeoutDate = new Date(now.getTime() - timeoutMs);
    
    console.log(`[Pull Timeout Release] 开始检查超时的拉取任务，超时时间: ${timeoutMs / 1000}秒`);
    
    // 1. 处理项目级任务
    const projectTasks = await Task.find({
      pulled_at: { $ne: null, $lt: timeoutDate },
      deleted_at: null
    }).lean();
    
    let releasedProjectTasks = 0;
    for (const task of projectTasks) {
      const pullHistory = task.pull_history || [];
      const lastPull = pullHistory[pullHistory.length - 1];
      
      // 如果最后一次拉取还没有释放记录，添加释放记录
      if (lastPull && !lastPull.released_at) {
        lastPull.released_at = now;
        lastPull.released_by = 'system-timeout';
      }
      
      await Task.findByIdAndUpdate(
        task._id,
        {
          $set: {
            pulled_at: null,
            pulled_by: null,
            pull_history: pullHistory
          }
        }
      );
      
      releasedProjectTasks++;
    }
    
    // 2. 处理队列中的任务
    const queues = await Queue.find({}).lean();
    let releasedQueueTasks = 0;
    
    for (const queue of queues) {
      const tasks = queue.tasks || [];
      const updateFields = {};
      let hasUpdates = false;
      
      tasks.forEach((task, index) => {
        if (task.pulled_at && 
            new Date(task.pulled_at) < timeoutDate && 
            !task.deleted_at) {
          
          const pullHistory = task.pull_history || [];
          const lastPull = pullHistory[pullHistory.length - 1];
          
          // 如果最后一次拉取还没有释放记录，添加释放记录
          if (lastPull && !lastPull.released_at) {
            lastPull.released_at = now;
            lastPull.released_by = 'system-timeout';
          }
          
          updateFields[`tasks.${index}.pulled_at`] = null;
          updateFields[`tasks.${index}.pulled_by`] = null;
          updateFields[`tasks.${index}.pull_history`] = pullHistory;
          hasUpdates = true;
          releasedQueueTasks++;
        }
      });
      
      if (hasUpdates) {
        await Queue.findByIdAndUpdate(
          queue._id,
          { $set: updateFields }
        );
      }
    }
    
    const totalReleased = releasedProjectTasks + releasedQueueTasks;
    
    if (totalReleased > 0) {
      console.log(`[Pull Timeout Release] 成功释放 ${totalReleased} 个超时任务的拉取锁定`);
      console.log(`  - 项目级任务: ${releasedProjectTasks}`);
      console.log(`  - 队列任务: ${releasedQueueTasks}`);
    } else {
      console.log(`[Pull Timeout Release] 没有超时的拉取任务`);
    }
    
    return {
      released_project_tasks: releasedProjectTasks,
      released_queue_tasks: releasedQueueTasks,
      total_released: totalReleased
    };
    
  } catch (error) {
    console.error('[Pull Timeout Release] 执行失败:', error);
    throw error;
  }
}

/**
 * 运行定时任务（可以设置为cron job或定期调用）
 */
export async function runPullTimeoutReleaseJob() {
  try {
    const result = await releaseTimeoutPulls();
    return result;
  } catch (error) {
    console.error('[Pull Timeout Release Job] 执行失败:', error);
    throw error;
  }
}







