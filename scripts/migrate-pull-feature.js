/**
 * 拉取功能数据迁移脚本
 * 为现有任务补充 source、pulled_at、created_at、updated_at 等字段
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
import Queue from '../src/lib/models/Queue.js';

async function migratePullFeature() {
  try {
    await connectDB();
    
    console.log('开始迁移拉取功能数据...');
    
    // 1. 查询所有队列
    const queues = await Queue.find({}).lean();
    console.log(`找到 ${queues.length} 个队列`);
    
    if (queues.length === 0) {
      console.log('没有队列数据，无需迁移');
      return;
    }
    
    let updatedQueues = 0;
    let updatedTasks = 0;
    
    // 2. 遍历每个队列，更新任务字段
    for (const queue of queues) {
      let queueUpdated = false;
      const tasks = queue.tasks || [];
      
      if (tasks.length === 0) {
        continue;
      }
      
      // 准备更新操作
      const updateOperations = tasks.map((task, index) => {
        const taskUpdate = {};
        let taskNeedsUpdate = false;
        
        // 补充 source 字段（默认为 'client'，因为现有任务都是客户端推送的）
        if (task.source === undefined || task.source === null) {
          taskUpdate[`tasks.${index}.source`] = 'client';
          taskNeedsUpdate = true;
        }
        
        // 补充 pulled_at 字段（默认为 null）
        if (task.pulled_at === undefined) {
          taskUpdate[`tasks.${index}.pulled_at`] = null;
          taskNeedsUpdate = true;
        }
        
        // 补充 pulled_by 字段（默认为 null）
        if (task.pulled_by === undefined) {
          taskUpdate[`tasks.${index}.pulled_by`] = null;
          taskNeedsUpdate = true;
        }
        
        // 补充 created_at 字段（使用队列的 createdAt 或当前时间）
        if (task.created_at === undefined || task.created_at === null) {
          taskUpdate[`tasks.${index}.created_at`] = queue.createdAt || new Date();
          taskNeedsUpdate = true;
        }
        
        // 补充 updated_at 字段（使用队列的 updatedAt 或当前时间）
        if (task.updated_at === undefined || task.updated_at === null) {
          taskUpdate[`tasks.${index}.updated_at`] = queue.updatedAt || queue.createdAt || new Date();
          taskNeedsUpdate = true;
        }
        
        // 补充 server_modified_at 字段（默认为 null，因为现有任务都是客户端推送的）
        if (task.server_modified_at === undefined) {
          taskUpdate[`tasks.${index}.server_modified_at`] = null;
          taskNeedsUpdate = true;
        }
        
        // 补充 deleted_at 字段（默认为 null）
        if (task.deleted_at === undefined) {
          taskUpdate[`tasks.${index}.deleted_at`] = null;
          taskNeedsUpdate = true;
        }
        
        // 补充 priority 字段（默认为 null）
        if (task.priority === undefined) {
          taskUpdate[`tasks.${index}.priority`] = null;
          taskNeedsUpdate = true;
        }
        
        // 补充 expires_at 字段（默认为 null）
        if (task.expires_at === undefined) {
          taskUpdate[`tasks.${index}.expires_at`] = null;
          taskNeedsUpdate = true;
        }
        
        // 补充 pull_history 字段（默认为空数组）
        if (task.pull_history === undefined) {
          taskUpdate[`tasks.${index}.pull_history`] = [];
          taskNeedsUpdate = true;
        }
        
        // 补充 tags 字段（如果不存在，默认为空数组）
        if (task.tags === undefined) {
          taskUpdate[`tasks.${index}.tags`] = [];
          taskNeedsUpdate = true;
        }
        
        // 更新 status 枚举值（如果状态不在新枚举中，保持原值）
        if (task.status && !['pending', 'running', 'done', 'error', 'cancelled'].includes(task.status)) {
          // 如果状态不在新枚举中，保持原值（MongoDB 会验证）
          // 这里不做修改，让 MongoDB 验证失败时再处理
        }
        
        return { taskUpdate, taskNeedsUpdate };
      });
      
      // 执行批量更新
      const updatesToApply = {};
      let hasUpdates = false;
      
      updateOperations.forEach(({ taskUpdate, taskNeedsUpdate }) => {
        if (taskNeedsUpdate) {
          Object.assign(updatesToApply, taskUpdate);
          hasUpdates = true;
        }
      });
      
      if (hasUpdates) {
        await Queue.updateOne(
          { _id: queue._id },
          { $set: updatesToApply }
        );
        
        updatedQueues++;
        updatedTasks += tasks.length;
        queueUpdated = true;
      }
      
      if (queueUpdated) {
        console.log(`已更新队列 ${queue.queueId}，包含 ${tasks.length} 个任务`);
      }
    }
    
    console.log(`\n迁移完成！`);
    console.log(`- 更新了 ${updatedQueues} 个队列`);
    console.log(`- 更新了 ${updatedTasks} 个任务`);
    console.log('\n所有现有任务已补充以下字段：');
    console.log('- source: "client"（现有任务都是客户端推送的）');
    console.log('- pulled_at: null');
    console.log('- pulled_by: null');
    console.log('- created_at: 队列创建时间或当前时间');
    console.log('- updated_at: 队列更新时间或创建时间');
    console.log('- server_modified_at: null');
    console.log('- deleted_at: null');
    console.log('- priority: null');
    console.log('- expires_at: null');
    console.log('- pull_history: []');
    console.log('- tags: []（如果不存在）');
    
  } catch (error) {
    console.error('迁移失败:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
  }
}

// 运行脚本
migratePullFeature().catch(error => {
  console.error('脚本执行失败:', error);
  process.exit(1);
});







