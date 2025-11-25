/**
 * 统计累计工具函数
 * 用于在任务状态更新时累计统计数据
 */
import connectDB from '@/lib/mongoose';
import Statistics from '@/lib/models/Statistics';
import StatisticsLog from '@/lib/models/StatisticsLog';

/**
 * 错误分类函数
 * @param {String} errorMessage - 错误信息
 * @returns {String} 错误类别
 */
function categorizeError(errorMessage) {
  if (!errorMessage) return 'unknown';
  
  const msg = errorMessage.toLowerCase();
  if (msg.includes('timeout') || msg.includes('超时')) return 'timeout';
  if (msg.includes('network') || msg.includes('网络')) return 'network';
  if (msg.includes('validation') || msg.includes('验证')) return 'validation';
  if (msg.includes('permission') || msg.includes('权限')) return 'permission';
  if (msg.includes('not found') || msg.includes('未找到')) return 'not_found';
  
  return 'other';
}

/**
 * 累计任务执行统计（包含扩展维度）
 * @param {Object} params - 参数对象
 * @param {String} params.projectId - 项目ID
 * @param {String} params.projectName - 项目名称
 * @param {String} params.queueId - 队列ID
 * @param {String} params.queueName - 队列名称
 * @param {String} params.taskId - 任务ID
 * @param {String} params.previousStatus - 之前的状态
 * @param {String} params.newStatus - 新状态
 * @param {Number} params.executionDuration - 执行时长（毫秒）
 * @param {Object} params.clientInfo - 客户端信息
 * @param {String} params.apiKeyName - API Key 名称
 * @param {String} params.errorMessage - 错误信息（如果失败）
 */
export async function incrementExecutionStats({
  projectId,
  projectName,
  queueId,
  queueName,
  taskId,
  previousStatus,
  newStatus,
  executionDuration = null,
  clientInfo = null,
  apiKeyName = null,
  errorMessage = null
}) {
  try {
    // 确保数据库连接
    await connectDB();
    
    // 判断是否为执行（pending -> done/error）
    const isExecution = previousStatus.toLowerCase() === 'pending' && 
                        ['done', 'error'].includes(newStatus.toLowerCase());
    
    if (!isExecution) {
      console.log('[统计累计] 跳过非执行状态变更:', {
        projectId,
        taskId,
        previousStatus,
        newStatus
      });
      return; // 不是执行，不累计
    }
    
    console.log('[统计累计] 开始累计统计:', {
      projectId,
      queueId,
      taskId,
      previousStatus,
      newStatus
    });
    
    const now = new Date();
    const today = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const hour = now.getUTCHours(); // 0-23
    const isSuccess = newStatus.toLowerCase() === 'done';
    
    // 记录统计日志
    await StatisticsLog.create({
      date: today,
      hour: hour,
      projectId: projectId,
      projectName: projectName,
      queueId: queueId,
      queueName: queueName,
      taskId: taskId,
      previousStatus: previousStatus,
      newStatus: newStatus,
      isExecution: true,
      executionResult: isSuccess ? 'success' : 'failure',
      executionDuration: executionDuration,
      clientInfo: clientInfo,
      apiKeyName: apiKeyName,
      errorMessage: errorMessage
    });
    
    // 准备扩展统计更新操作
    const extendedUpdates = {};
    
    // 按队列统计
    extendedUpdates[`extended.by_queue.${queueId}.total`] = 1;
    const queueKey = `extended.by_queue.${queueId}.${isSuccess ? 'success' : 'failure'}`;
    extendedUpdates[queueKey] = 1;
    
    // 按小时统计
    const hourStr = String(hour).padStart(2, '0');
    extendedUpdates[`extended.by_hour.${hourStr}.total`] = 1;
    extendedUpdates[`extended.by_hour.${hourStr}.${isSuccess ? 'success' : 'failure'}`] = 1;
    
    // 执行时长统计
    if (executionDuration !== null && executionDuration > 0) {
      extendedUpdates['extended.execution_duration.total_duration'] = executionDuration;
      extendedUpdates['extended.execution_duration.count'] = 1;
    }
    
    // 按客户端统计
    if (clientInfo && clientInfo.hostname) {
      extendedUpdates[`extended.by_client.${clientInfo.hostname}.total`] = 1;
      extendedUpdates[`extended.by_client.${clientInfo.hostname}.${isSuccess ? 'success' : 'failure'}`] = 1;
    }
    
    // 按 API Key 统计
    if (apiKeyName) {
      extendedUpdates[`extended.by_api_key.${apiKeyName}.total`] = 1;
      extendedUpdates[`extended.by_api_key.${apiKeyName}.${isSuccess ? 'success' : 'failure'}`] = 1;
    }
    
    // 错误类型统计
    if (!isSuccess && errorMessage) {
      const errorCategory = categorizeError(errorMessage);
      extendedUpdates[`extended.error_types.${errorCategory}`] = 1;
    }
    
    // 更新项目级别统计
    // 先查询现有记录
    let projectStat = await Statistics.findOne({
      date: today,
      scope: 'project',
      projectId: projectId
    });
    
    if (!projectStat) {
      // 创建新记录
      projectStat = await Statistics.create({
        date: today,
        scope: 'project',
        projectId: projectId,
        projectName: projectName,
        execution: { total: 0, success: 0, failure: 0 },
        task_status: { total: 0, pending: 0, done: 0, error: 0 },
        extended: {
          by_queue: {},
          by_hour: {},
          execution_duration: { total_duration: 0, count: 0, min: null, max: null, avg: 0 },
          by_client: {},
          by_api_key: {},
          error_types: {}
        }
      });
    }
    
    // 更新基础统计
    projectStat.execution.total = (projectStat.execution?.total || 0) + 1;
    if (isSuccess) {
      projectStat.execution.success = (projectStat.execution?.success || 0) + 1;
    } else {
      projectStat.execution.failure = (projectStat.execution?.failure || 0) + 1;
    }
    
    // 更新扩展统计
    if (!projectStat.extended) {
      projectStat.extended = {
        by_queue: {},
        by_hour: {},
        execution_duration: { total_duration: 0, count: 0, min: null, max: null, avg: 0 },
        by_client: {},
        by_api_key: {},
        error_types: {}
      };
    }
    
    // 按队列统计
    if (!projectStat.extended.by_queue[queueId]) {
      projectStat.extended.by_queue[queueId] = { total: 0, success: 0, failure: 0 };
    }
    projectStat.extended.by_queue[queueId].total++;
    if (isSuccess) {
      projectStat.extended.by_queue[queueId].success++;
    } else {
      projectStat.extended.by_queue[queueId].failure++;
    }
    
    // 按小时统计
    if (!projectStat.extended.by_hour[hourStr]) {
      projectStat.extended.by_hour[hourStr] = { total: 0, success: 0, failure: 0 };
    }
    projectStat.extended.by_hour[hourStr].total++;
    if (isSuccess) {
      projectStat.extended.by_hour[hourStr].success++;
    } else {
      projectStat.extended.by_hour[hourStr].failure++;
    }
    
    // 按客户端统计
    if (clientInfo && clientInfo.hostname) {
      if (!projectStat.extended.by_client[clientInfo.hostname]) {
        projectStat.extended.by_client[clientInfo.hostname] = { total: 0, success: 0, failure: 0 };
      }
      projectStat.extended.by_client[clientInfo.hostname].total++;
      if (isSuccess) {
        projectStat.extended.by_client[clientInfo.hostname].success++;
      } else {
        projectStat.extended.by_client[clientInfo.hostname].failure++;
      }
    }
    
    // 按 API Key 统计
    if (apiKeyName) {
      if (!projectStat.extended.by_api_key[apiKeyName]) {
        projectStat.extended.by_api_key[apiKeyName] = { total: 0, success: 0, failure: 0 };
      }
      projectStat.extended.by_api_key[apiKeyName].total++;
      if (isSuccess) {
        projectStat.extended.by_api_key[apiKeyName].success++;
      } else {
        projectStat.extended.by_api_key[apiKeyName].failure++;
      }
    }
    
    // 错误类型统计
    if (!isSuccess && errorMessage) {
      const errorCategory = categorizeError(errorMessage);
      if (!projectStat.extended.error_types[errorCategory]) {
        projectStat.extended.error_types[errorCategory] = 0;
      }
      projectStat.extended.error_types[errorCategory]++;
    }
    
    // 执行时长统计
    if (executionDuration !== null && executionDuration > 0) {
      projectStat.extended.execution_duration.total_duration = 
        (projectStat.extended.execution_duration?.total_duration || 0) + executionDuration;
      projectStat.extended.execution_duration.count = 
        (projectStat.extended.execution_duration?.count || 0) + 1;
      
      if (projectStat.extended.execution_duration.min === null || executionDuration < projectStat.extended.execution_duration.min) {
        projectStat.extended.execution_duration.min = executionDuration;
      }
      if (projectStat.extended.execution_duration.max === null || executionDuration > projectStat.extended.execution_duration.max) {
        projectStat.extended.execution_duration.max = executionDuration;
      }
      
      // 计算平均值
      if (projectStat.extended.execution_duration.count > 0) {
        projectStat.extended.execution_duration.avg = Math.round(
          projectStat.extended.execution_duration.total_duration / projectStat.extended.execution_duration.count
        );
      }
    }
    
    // 保存更新
    await projectStat.save();
    
    
    // 更新系统级别统计
    let systemStat = await Statistics.findOne({
      date: today,
      scope: 'system',
      projectId: null
    });
    
    if (!systemStat) {
      // 创建新记录
      systemStat = await Statistics.create({
        date: today,
        scope: 'system',
        projectId: null,
        projectName: null,
        execution: { total: 0, success: 0, failure: 0 },
        task_status: { total: 0, pending: 0, done: 0, error: 0 },
        extended: {
          by_queue: {},
          by_hour: {},
          execution_duration: { total_duration: 0, count: 0, min: null, max: null, avg: 0 },
          by_client: {},
          by_api_key: {},
          error_types: {}
        }
      });
    }
    
    // 更新基础统计
    systemStat.execution.total = (systemStat.execution?.total || 0) + 1;
    if (isSuccess) {
      systemStat.execution.success = (systemStat.execution?.success || 0) + 1;
    } else {
      systemStat.execution.failure = (systemStat.execution?.failure || 0) + 1;
    }
    
    // 更新扩展统计
    if (!systemStat.extended) {
      systemStat.extended = {
        by_queue: {},
        by_hour: {},
        execution_duration: { total_duration: 0, count: 0, min: null, max: null, avg: 0 },
        by_client: {},
        by_api_key: {},
        error_types: {}
      };
    }
    
    // 按小时统计
    if (!systemStat.extended.by_hour[hourStr]) {
      systemStat.extended.by_hour[hourStr] = { total: 0, success: 0, failure: 0 };
    }
    systemStat.extended.by_hour[hourStr].total++;
    if (isSuccess) {
      systemStat.extended.by_hour[hourStr].success++;
    } else {
      systemStat.extended.by_hour[hourStr].failure++;
    }
    
    // 按客户端统计
    if (clientInfo && clientInfo.hostname) {
      if (!systemStat.extended.by_client[clientInfo.hostname]) {
        systemStat.extended.by_client[clientInfo.hostname] = { total: 0, success: 0, failure: 0 };
      }
      systemStat.extended.by_client[clientInfo.hostname].total++;
      if (isSuccess) {
        systemStat.extended.by_client[clientInfo.hostname].success++;
      } else {
        systemStat.extended.by_client[clientInfo.hostname].failure++;
      }
    }
    
    // 按 API Key 统计
    if (apiKeyName) {
      if (!systemStat.extended.by_api_key[apiKeyName]) {
        systemStat.extended.by_api_key[apiKeyName] = { total: 0, success: 0, failure: 0 };
      }
      systemStat.extended.by_api_key[apiKeyName].total++;
      if (isSuccess) {
        systemStat.extended.by_api_key[apiKeyName].success++;
      } else {
        systemStat.extended.by_api_key[apiKeyName].failure++;
      }
    }
    
    // 错误类型统计
    if (!isSuccess && errorMessage) {
      const errorCategory = categorizeError(errorMessage);
      if (!systemStat.extended.error_types[errorCategory]) {
        systemStat.extended.error_types[errorCategory] = 0;
      }
      systemStat.extended.error_types[errorCategory]++;
    }
    
    // 执行时长统计
    if (executionDuration !== null && executionDuration > 0) {
      systemStat.extended.execution_duration.total_duration = 
        (systemStat.extended.execution_duration?.total_duration || 0) + executionDuration;
      systemStat.extended.execution_duration.count = 
        (systemStat.extended.execution_duration?.count || 0) + 1;
      
      if (systemStat.extended.execution_duration.min === null || executionDuration < systemStat.extended.execution_duration.min) {
        systemStat.extended.execution_duration.min = executionDuration;
      }
      if (systemStat.extended.execution_duration.max === null || executionDuration > systemStat.extended.execution_duration.max) {
        systemStat.extended.execution_duration.max = executionDuration;
      }
      
      // 计算平均值
      if (systemStat.extended.execution_duration.count > 0) {
        systemStat.extended.execution_duration.avg = Math.round(
          systemStat.extended.execution_duration.total_duration / systemStat.extended.execution_duration.count
        );
      }
    }
    
    // 保存更新
    await systemStat.save();
    
    console.log('[统计累计] 统计累计成功:', {
      projectId,
      taskId,
      date: today,
      isSuccess
    });
    
  } catch (error) {
    // 统计累计失败不应影响主业务流程
    console.error('[统计累计] 统计累计失败:', {
      error: error.message,
      stack: error.stack,
      projectId,
      queueId,
      taskId,
      previousStatus,
      newStatus
    });
    // 不重新抛出错误，避免影响主流程
  }
}

