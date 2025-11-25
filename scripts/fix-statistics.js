/**
 * 修复统计数据脚本
 * 从 StatisticsLog 中重新计算统计数据
 */
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// 必须在导入其他模块之前加载环境变量
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '..', '.env.local');

// 加载 .env.local 文件
try {
  const envFile = readFileSync(envPath, 'utf-8');
  envFile.split('\n').forEach(line => {
    const trimmedLine = line.trim();
    if (trimmedLine && !trimmedLine.startsWith('#')) {
      const equalIndex = trimmedLine.indexOf('=');
      if (equalIndex > 0) {
        const key = trimmedLine.substring(0, equalIndex).trim();
        let value = trimmedLine.substring(equalIndex + 1).trim();
        // 移除引号（单引号或双引号）
        if ((value.startsWith('"') && value.endsWith('"')) || 
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        // 强制设置环境变量（覆盖已存在的）
        process.env[key] = value;
      }
    }
  });
  console.log('已加载 .env.local 文件');
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? 
    process.env.MONGODB_URI.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@') : 
    '未设置');
} catch (error) {
  if (error.code !== 'ENOENT') {
    console.warn('读取 .env.local 文件失败:', error.message);
  } else {
    console.log('.env.local 文件不存在，使用默认环境变量或系统环境变量');
  }
}

// 在环境变量加载后再导入其他模块
import mongoose from 'mongoose';
import connectDB from '../src/lib/mongoose.js';
import Statistics from '../src/lib/models/Statistics.js';
import StatisticsLog from '../src/lib/models/StatisticsLog.js';

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

async function fixStatistics() {
  try {
    await connectDB();
    
    console.log('开始修复统计数据...');
    
    // 1. 查询所有执行记录
    const executionLogs = await StatisticsLog.find({
      isExecution: true
    }).lean();
    
    console.log(`找到 ${executionLogs.length} 条执行记录`);
    
    if (executionLogs.length === 0) {
      console.log('没有执行记录，无需修复');
      return;
    }
    
    // 2. 按日期分组统计
    const statsByDate = new Map();
    
    executionLogs.forEach(log => {
      const date = log.date;
      const projectId = log.projectId;
      const scope = projectId ? 'project' : 'system';
      
      // 项目级别统计
      if (projectId) {
        const projectKey = `${date}_project_${projectId}`;
        if (!statsByDate.has(projectKey)) {
          statsByDate.set(projectKey, {
            date,
            scope: 'project',
            projectId,
            projectName: log.projectName,
            execution: { total: 0, success: 0, failure: 0 },
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
        
        const projectStat = statsByDate.get(projectKey);
        projectStat.execution.total++;
        if (log.executionResult === 'success') {
          projectStat.execution.success++;
        } else {
          projectStat.execution.failure++;
        }
        
        // 按队列统计
        if (log.queueId) {
          if (!projectStat.extended.by_queue[log.queueId]) {
            projectStat.extended.by_queue[log.queueId] = { total: 0, success: 0, failure: 0 };
          }
          projectStat.extended.by_queue[log.queueId].total++;
          if (log.executionResult === 'success') {
            projectStat.extended.by_queue[log.queueId].success++;
          } else {
            projectStat.extended.by_queue[log.queueId].failure++;
          }
        }
        
        // 按小时统计
        const hourStr = String(log.hour).padStart(2, '0');
        if (!projectStat.extended.by_hour[hourStr]) {
          projectStat.extended.by_hour[hourStr] = { total: 0, success: 0, failure: 0 };
        }
        projectStat.extended.by_hour[hourStr].total++;
        if (log.executionResult === 'success') {
          projectStat.extended.by_hour[hourStr].success++;
        } else {
          projectStat.extended.by_hour[hourStr].failure++;
        }
        
        // 按客户端统计
        if (log.clientInfo && log.clientInfo.hostname) {
          const hostname = log.clientInfo.hostname;
          if (!projectStat.extended.by_client[hostname]) {
            projectStat.extended.by_client[hostname] = { total: 0, success: 0, failure: 0 };
          }
          projectStat.extended.by_client[hostname].total++;
          if (log.executionResult === 'success') {
            projectStat.extended.by_client[hostname].success++;
          } else {
            projectStat.extended.by_client[hostname].failure++;
          }
        }
        
        // 按 API Key 统计
        if (log.apiKeyName) {
          if (!projectStat.extended.by_api_key[log.apiKeyName]) {
            projectStat.extended.by_api_key[log.apiKeyName] = { total: 0, success: 0, failure: 0 };
          }
          projectStat.extended.by_api_key[log.apiKeyName].total++;
          if (log.executionResult === 'success') {
            projectStat.extended.by_api_key[log.apiKeyName].success++;
          } else {
            projectStat.extended.by_api_key[log.apiKeyName].failure++;
          }
        }
        
        // 错误类型统计
        if (log.executionResult === 'failure' && log.errorMessage) {
          const errorCategory = categorizeError(log.errorMessage);
          if (!projectStat.extended.error_types[errorCategory]) {
            projectStat.extended.error_types[errorCategory] = 0;
          }
          projectStat.extended.error_types[errorCategory]++;
        }
        
        // 执行时长统计
        if (log.executionDuration && log.executionDuration > 0) {
          projectStat.extended.execution_duration.total_duration += log.executionDuration;
          projectStat.extended.execution_duration.count++;
          if (projectStat.extended.execution_duration.min === null || log.executionDuration < projectStat.extended.execution_duration.min) {
            projectStat.extended.execution_duration.min = log.executionDuration;
          }
          if (projectStat.extended.execution_duration.max === null || log.executionDuration > projectStat.extended.execution_duration.max) {
            projectStat.extended.execution_duration.max = log.executionDuration;
          }
        }
      }
      
      // 系统级别统计
      const systemKey = `${date}_system`;
      if (!statsByDate.has(systemKey)) {
        statsByDate.set(systemKey, {
          date,
          scope: 'system',
          projectId: null,
          projectName: null,
          execution: { total: 0, success: 0, failure: 0 },
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
      
      const systemStat = statsByDate.get(systemKey);
      systemStat.execution.total++;
      if (log.executionResult === 'success') {
        systemStat.execution.success++;
      } else {
        systemStat.execution.failure++;
      }
      
      // 按小时统计
      const hourStr = String(log.hour).padStart(2, '0');
      if (!systemStat.extended.by_hour[hourStr]) {
        systemStat.extended.by_hour[hourStr] = { total: 0, success: 0, failure: 0 };
      }
      systemStat.extended.by_hour[hourStr].total++;
      if (log.executionResult === 'success') {
        systemStat.extended.by_hour[hourStr].success++;
      } else {
        systemStat.extended.by_hour[hourStr].failure++;
      }
      
      // 按客户端统计
      if (log.clientInfo && log.clientInfo.hostname) {
        const hostname = log.clientInfo.hostname;
        if (!systemStat.extended.by_client[hostname]) {
          systemStat.extended.by_client[hostname] = { total: 0, success: 0, failure: 0 };
        }
        systemStat.extended.by_client[hostname].total++;
        if (log.executionResult === 'success') {
          systemStat.extended.by_client[hostname].success++;
        } else {
          systemStat.extended.by_client[hostname].failure++;
        }
      }
      
      // 按 API Key 统计
      if (log.apiKeyName) {
        if (!systemStat.extended.by_api_key[log.apiKeyName]) {
          systemStat.extended.by_api_key[log.apiKeyName] = { total: 0, success: 0, failure: 0 };
        }
        systemStat.extended.by_api_key[log.apiKeyName].total++;
        if (log.executionResult === 'success') {
          systemStat.extended.by_api_key[log.apiKeyName].success++;
        } else {
          systemStat.extended.by_api_key[log.apiKeyName].failure++;
        }
      }
      
      // 错误类型统计
      if (log.executionResult === 'failure' && log.errorMessage) {
        const errorCategory = categorizeError(log.errorMessage);
        if (!systemStat.extended.error_types[errorCategory]) {
          systemStat.extended.error_types[errorCategory] = 0;
        }
        systemStat.extended.error_types[errorCategory]++;
      }
      
      // 执行时长统计
      if (log.executionDuration && log.executionDuration > 0) {
        systemStat.extended.execution_duration.total_duration += log.executionDuration;
        systemStat.extended.execution_duration.count++;
        if (systemStat.extended.execution_duration.min === null || log.executionDuration < systemStat.extended.execution_duration.min) {
          systemStat.extended.execution_duration.min = log.executionDuration;
        }
        if (systemStat.extended.execution_duration.max === null || log.executionDuration > systemStat.extended.execution_duration.max) {
          systemStat.extended.execution_duration.max = log.executionDuration;
        }
      }
    });
    
    // 3. 计算平均执行时长
    statsByDate.forEach(stat => {
      if (stat.extended.execution_duration.count > 0) {
        stat.extended.execution_duration.avg = Math.round(
          stat.extended.execution_duration.total_duration / stat.extended.execution_duration.count
        );
      }
    });
    
    // 4. 更新或创建统计记录
    let updatedCount = 0;
    for (const stat of statsByDate.values()) {
      await Statistics.findOneAndUpdate(
        {
          date: stat.date,
          scope: stat.scope,
          projectId: stat.projectId || null
        },
        {
          $set: stat
        },
        { upsert: true, new: true }
      );
      updatedCount++;
    }
    
    console.log(`成功更新 ${updatedCount} 条统计记录`);
    console.log('统计数据修复完成！');
    
  } catch (error) {
    console.error('修复统计数据失败:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

// 运行脚本
fixStatistics().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});

