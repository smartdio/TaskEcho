#!/usr/bin/env node
/**
 * 数据库模型单元测试
 * 测试 Project、Queue、ApiKey、ProjectMetadata 模型的基本功能
 */

import mongoose from 'mongoose';
import connectDB from '../src/lib/mongoose.js';
import { Project, Queue, ApiKey, ProjectMetadata } from '../src/lib/models/index.js';

// 测试配置
const TEST_DB_NAME = 'taskecho_test';
const MONGODB_URI = process.env.MONGODB_URI || `mongodb://localhost:27017/${TEST_DB_NAME}`;

// 测试统计
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

// 辅助函数：打印测试结果
function printTest(name, passed, message = '') {
  totalTests++;
  if (passed) {
    passedTests++;
    console.log(`✓ ${name}${message ? `: ${message}` : ''}`);
  } else {
    failedTests++;
    console.error(`✗ ${name}${message ? `: ${message}` : ''}`);
  }
}

// 辅助函数：断言
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || '断言失败');
  }
}

// 清理测试数据
async function cleanup() {
  try {
    await Project.deleteMany({});
    await Queue.deleteMany({});
    await ApiKey.deleteMany({});
    await ProjectMetadata.deleteMany({});
  } catch (error) {
    // 如果是认证错误，给出友好提示
    if (error.code === 13 || error.codeName === 'Unauthorized') {
      console.warn('⚠ 清理测试数据需要 MongoDB 认证，跳过清理步骤');
      return;
    }
    console.error('清理测试数据失败:', error.message);
  }
}

// 测试数据库连接
async function testDatabaseConnection() {
  try {
    await connectDB();
    printTest('数据库连接', true);
    return true;
  } catch (error) {
    const errorMsg = error.code === 13 || error.codeName === 'Unauthorized' 
      ? 'MongoDB 需要认证，请配置正确的 MONGODB_URI（包含用户名和密码）'
      : error.message;
    printTest('数据库连接', false, errorMsg);
    return false;
  }
}

// 测试 Project 模型
async function testProjectModel() {
  console.log('\n--- 测试 Project 模型 ---');
  
  try {
    // 测试创建项目
    const project = await Project.create({
      projectId: 'test-project-001',
      name: '测试项目'
    });
    assert(project.projectId === 'test-project-001', '项目ID不正确');
    assert(project.name === '测试项目', '项目名称不正确');
    assert(project.createdAt, '创建时间不存在');
    printTest('创建项目', true);
    
    // 测试查询项目
    const foundProject = await Project.findOne({ projectId: 'test-project-001' });
    assert(foundProject !== null, '查询项目失败');
    assert(foundProject.name === '测试项目', '查询的项目名称不正确');
    printTest('查询项目', true);
    
    // 测试更新项目
    await Project.findOneAndUpdate(
      { projectId: 'test-project-001' },
      { name: '更新后的项目名称', lastTaskAt: new Date() }
    );
    const updatedProject = await Project.findOne({ projectId: 'test-project-001' });
    assert(updatedProject.name === '更新后的项目名称', '更新项目失败');
    assert(updatedProject.lastTaskAt !== null, 'lastTaskAt 未更新');
    printTest('更新项目', true);
    
    // 测试唯一性约束
    try {
      await Project.create({
        projectId: 'test-project-001',  // 重复的 projectId
        name: '另一个项目'
      });
      printTest('唯一性约束', false, '应该抛出重复键错误');
    } catch (error) {
      if (error.code === 11000) {
        printTest('唯一性约束', true);
      } else {
        throw error;
      }
    }
    
    // 测试删除项目
    await Project.deleteOne({ projectId: 'test-project-001' });
    const deletedProject = await Project.findOne({ projectId: 'test-project-001' });
    assert(deletedProject === null, '删除项目失败');
    printTest('删除项目', true);
    
  } catch (error) {
    if (error.code === 13 || error.codeName === 'Unauthorized') {
      printTest('Project 模型测试', false, 'MongoDB 需要认证，请配置正确的 MONGODB_URI');
    } else {
      printTest('Project 模型测试', false, error.message);
      console.error(error);
    }
  }
}

// 测试 Queue 模型
async function testQueueModel() {
  console.log('\n--- 测试 Queue 模型 ---');
  
  try {
    // 先创建一个项目
    const project = await Project.create({
      projectId: 'test-project-002',
      name: '测试项目2'
    });
    
    // 测试创建队列（包含任务）
    const queue = await Queue.create({
      projectId: project._id,
      queueId: 'test-queue-001',
      name: '测试队列',
      meta: { customField: 'value' },
      tasks: [
        {
          id: 'task-001',
          name: '测试任务1',
          prompt: '这是任务提示',
          spec_file: ['.flow/skills/specwriter.md'],
          status: 'pending',
          messages: [],
          logs: []
        }
      ]
    });
    assert(queue.queueId === 'test-queue-001', '队列ID不正确');
    assert(queue.tasks.length === 1, '任务数量不正确');
    assert(queue.tasks[0].id === 'task-001', '任务ID不正确');
    assert(queue.tasks[0].status === 'pending', '任务状态不正确');
    printTest('创建队列（包含任务）', true);
    
    // 测试查询队列
    const foundQueue = await Queue.findOne({ queueId: 'test-queue-001' });
    assert(foundQueue !== null, '查询队列失败');
    assert(foundQueue.tasks.length === 1, '查询的队列任务数量不正确');
    printTest('查询队列', true);
    
    // 测试添加消息到任务
    await Queue.findOneAndUpdate(
      { _id: queue._id, 'tasks.id': 'task-001' },
      {
        $push: {
          'tasks.$.messages': {
            role: 'USER',
            content: '用户消息',
            createdAt: new Date()
          }
        }
      }
    );
    const queueWithMessage = await Queue.findOne({ _id: queue._id });
    assert(queueWithMessage.tasks[0].messages.length === 1, '消息未添加');
    assert(queueWithMessage.tasks[0].messages[0].role === 'USER', '消息角色不正确');
    printTest('添加消息到任务', true);
    
    // 测试添加日志到任务
    await Queue.findOneAndUpdate(
      { _id: queue._id, 'tasks.id': 'task-001' },
      {
        $push: {
          'tasks.$.logs': {
            content: '执行日志',
            createdAt: new Date()
          }
        }
      }
    );
    const queueWithLog = await Queue.findOne({ _id: queue._id });
    assert(queueWithLog.tasks[0].logs.length === 1, '日志未添加');
    assert(queueWithLog.tasks[0].logs[0].content === '执行日志', '日志内容不正确');
    printTest('添加日志到任务', true);
    
    // 测试更新任务状态
    await Queue.findOneAndUpdate(
      { _id: queue._id, 'tasks.id': 'task-001' },
      {
        $set: {
          'tasks.$.status': 'done',
          'tasks.$.report': '.flow/tasks/report/report.md',
          lastTaskAt: new Date()
        }
      }
    );
    const updatedQueue = await Queue.findOne({ _id: queue._id });
    assert(updatedQueue.tasks[0].status === 'done', '任务状态未更新');
    assert(updatedQueue.tasks[0].report === '.flow/tasks/report/report.md', '任务报告未更新');
    assert(updatedQueue.lastTaskAt !== null, 'lastTaskAt 未更新');
    printTest('更新任务状态', true);
    
    // 测试复合唯一性约束
    try {
      await Queue.create({
        projectId: project._id,
        queueId: 'test-queue-001',  // 重复的 queueId（同一项目）
        name: '另一个队列'
      });
      printTest('复合唯一性约束', false, '应该抛出重复键错误');
    } catch (error) {
      if (error.code === 11000) {
        printTest('复合唯一性约束', true);
      } else {
        throw error;
      }
    }
    
    // 测试列表查询（排除 messages 和 logs）
    const queues = await Queue.find({ projectId: project._id })
      .select({ 'tasks.messages': 0, 'tasks.logs': 0 })
      .lean();
    assert(queues.length > 0, '查询队列列表失败');
    // 验证 messages 和 logs 被排除
    const firstQueue = queues[0];
    const firstTask = firstQueue.tasks && firstQueue.tasks[0];
    if (firstTask) {
      // 在 lean() 模式下，排除的字段应该是 undefined
      assert(firstTask.messages === undefined || firstTask.messages === null, 'messages 应该被排除');
      assert(firstTask.logs === undefined || firstTask.logs === null, 'logs 应该被排除');
    }
    printTest('列表查询（排除大字段）', true);
    
    // 清理
    await Queue.deleteOne({ _id: queue._id });
    await Project.deleteOne({ _id: project._id });
    printTest('删除队列', true);
    
  } catch (error) {
    if (error.code === 13 || error.codeName === 'Unauthorized') {
      printTest('Queue 模型测试', false, 'MongoDB 需要认证，请配置正确的 MONGODB_URI');
    } else {
      printTest('Queue 模型测试', false, error.message);
      console.error(error);
    }
  }
}

// 测试 ApiKey 模型
async function testApiKeyModel() {
  console.log('\n--- 测试 ApiKey 模型 ---');
  
  try {
    // 测试创建 API Key
    const apiKey = await ApiKey.create({
      name: '测试 API Key',
      key: 'hashed_key_value_12345',
      projectId: 'test-project-001',
      isActive: true
    });
    assert(apiKey.name === '测试 API Key', 'API Key 名称不正确');
    assert(apiKey.key === 'hashed_key_value_12345', 'API Key 值不正确');
    assert(apiKey.isActive === true, 'isActive 状态不正确');
    printTest('创建 API Key', true);
    
    // 测试查询 API Key
    const foundKey = await ApiKey.findOne({ key: 'hashed_key_value_12345' });
    assert(foundKey !== null, '查询 API Key 失败');
    assert(foundKey.isActive === true, '查询的 API Key 状态不正确');
    printTest('查询 API Key', true);
    
    // 测试更新 API Key
    await ApiKey.findOneAndUpdate(
      { key: 'hashed_key_value_12345' },
      { isActive: false }
    );
    const updatedKey = await ApiKey.findOne({ key: 'hashed_key_value_12345' });
    assert(updatedKey.isActive === false, '更新 API Key 失败');
    printTest('更新 API Key', true);
    
    // 测试唯一性约束
    try {
      await ApiKey.create({
        name: '另一个 API Key',
        key: 'hashed_key_value_12345',  // 重复的 key
        isActive: true
      });
      printTest('API Key 唯一性约束', false, '应该抛出重复键错误');
    } catch (error) {
      if (error.code === 11000) {
        printTest('API Key 唯一性约束', true);
      } else {
        throw error;
      }
    }
    
    // 测试删除 API Key
    await ApiKey.deleteOne({ key: 'hashed_key_value_12345' });
    const deletedKey = await ApiKey.findOne({ key: 'hashed_key_value_12345' });
    assert(deletedKey === null, '删除 API Key 失败');
    printTest('删除 API Key', true);
    
  } catch (error) {
    if (error.code === 13 || error.codeName === 'Unauthorized') {
      printTest('ApiKey 模型测试', false, 'MongoDB 需要认证，请配置正确的 MONGODB_URI');
    } else {
      printTest('ApiKey 模型测试', false, error.message);
      console.error(error);
    }
  }
}

// 测试 ProjectMetadata 模型
async function testProjectMetadataModel() {
  console.log('\n--- 测试 ProjectMetadata 模型 ---');
  
  try {
    // 先创建一个项目（用于关联）
    const project = await Project.create({
      projectId: 'test-project-metadata-001',
      name: '测试项目元数据'
    });
    
    // 测试创建元数据
    const metadata = await ProjectMetadata.create({
      projectId: 'test-project-metadata-001',
      customTitle: '我的自定义标题',
      notes: '这是项目的备注信息',
      tags: ['前端', 'React', '重要']
    });
    assert(metadata.projectId === 'test-project-metadata-001', '项目ID不正确');
    assert(metadata.customTitle === '我的自定义标题', '自定义标题不正确');
    assert(metadata.notes === '这是项目的备注信息', '备注信息不正确');
    assert(metadata.tags.length === 3, '标签数量不正确');
    assert(metadata.createdAt, '创建时间不存在');
    printTest('创建元数据', true);
    
    // 测试标签自动处理（去重、转小写）
    const metadata2 = await ProjectMetadata.create({
      projectId: 'test-project-metadata-002',
      tags: ['前端', 'Frontend', '前端', 'REACT']  // 重复和大小写混合
    });
    // 验证标签已去重并转小写
    const uniqueTags = [...new Set(metadata2.tags.map(t => t.toLowerCase()))];
    assert(metadata2.tags.length === uniqueTags.length, '标签未正确去重');
    assert(metadata2.tags.every(t => t === t.toLowerCase()), '标签未转换为小写');
    printTest('标签自动处理（去重、转小写）', true);
    
    // 测试查询元数据
    const foundMetadata = await ProjectMetadata.findOne({ projectId: 'test-project-metadata-001' });
    assert(foundMetadata !== null, '查询元数据失败');
    assert(foundMetadata.customTitle === '我的自定义标题', '查询的自定义标题不正确');
    assert(foundMetadata.tags.length === 3, '查询的标签数量不正确');
    printTest('查询元数据', true);
    
    // 测试更新元数据
    await ProjectMetadata.findOneAndUpdate(
      { projectId: 'test-project-metadata-001' },
      { 
        customTitle: '更新后的标题',
        notes: '更新后的备注',
        tags: ['后端', 'Node.js']
      }
    );
    const updatedMetadata = await ProjectMetadata.findOne({ projectId: 'test-project-metadata-001' });
    assert(updatedMetadata.customTitle === '更新后的标题', '更新元数据失败');
    assert(updatedMetadata.notes === '更新后的备注', '更新备注失败');
    assert(updatedMetadata.tags.length === 2, '更新标签失败');
    printTest('更新元数据', true);
    
    // 测试唯一性约束（projectId）
    try {
      await ProjectMetadata.create({
        projectId: 'test-project-metadata-001',  // 重复的 projectId
        customTitle: '另一个标题'
      });
      printTest('projectId 唯一性约束', false, '应该抛出重复键错误');
    } catch (error) {
      if (error.code === 11000) {
        printTest('projectId 唯一性约束', true);
      } else {
        throw error;
      }
    }
    
    // 测试标签数量限制（最多20个）
    try {
      const manyTags = Array.from({ length: 21 }, (_, i) => `tag${i}`);
      await ProjectMetadata.create({
        projectId: 'test-project-metadata-003',
        tags: manyTags
      });
      printTest('标签数量限制', false, '应该抛出验证错误');
    } catch (error) {
      if (error.message && error.message.includes('标签数量不能超过 20 个')) {
        printTest('标签数量限制', true);
      } else {
        throw error;
      }
    }
    
    // 测试按标签查询（使用索引）
    const projectsWithTag = await ProjectMetadata.find({ tags: '前端' });
    assert(projectsWithTag.length > 0, '按标签查询失败');
    printTest('按标签查询', true);
    
    // 测试文本搜索（customTitle 和 notes）
    const searchResults = await ProjectMetadata.find({
      $text: { $search: '自定义' }
    });
    assert(searchResults.length > 0, '文本搜索失败');
    printTest('文本搜索（customTitle 和 notes）', true);
    
    // 测试删除元数据
    await ProjectMetadata.deleteOne({ projectId: 'test-project-metadata-001' });
    const deletedMetadata = await ProjectMetadata.findOne({ projectId: 'test-project-metadata-001' });
    assert(deletedMetadata === null, '删除元数据失败');
    printTest('删除元数据', true);
    
    // 清理
    await ProjectMetadata.deleteMany({ projectId: { $in: ['test-project-metadata-002', 'test-project-metadata-003'] } });
    await Project.deleteOne({ _id: project._id });
    
  } catch (error) {
    if (error.code === 13 || error.codeName === 'Unauthorized') {
      printTest('ProjectMetadata 模型测试', false, 'MongoDB 需要认证，请配置正确的 MONGODB_URI');
    } else {
      printTest('ProjectMetadata 模型测试', false, error.message);
      console.error(error);
    }
  }
}

// 主测试函数
async function runTests() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  数据库模型单元测试');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 设置测试数据库连接（如果环境变量未设置）
  if (!process.env.MONGODB_URI) {
    process.env.MONGODB_URI = MONGODB_URI;
  }
  
  console.log(`使用 MongoDB URI: ${process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@')}\n`);
  
  // 测试数据库连接
  const connected = await testDatabaseConnection();
  if (!connected) {
    console.error('\n数据库连接失败，无法继续测试');
    process.exit(1);
  }
  
  // 清理测试数据
  await cleanup();
  
  // 运行测试
  await testProjectModel();
  await testQueueModel();
  await testApiKeyModel();
  await testProjectMetadataModel();
  
  // 最终清理
  await cleanup();
  
  // 打印测试统计
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  测试统计');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`  总测试数: ${totalTests}`);
  console.log(`  通过: ${passedTests}`);
  console.log(`  失败: ${failedTests}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  // 关闭数据库连接
  await mongoose.connection.close();
  
  if (failedTests > 0) {
    console.error('✗ 部分测试失败');
    process.exit(1);
  } else {
    console.log('✓ 所有测试通过！');
    process.exit(0);
  }
}

// 运行测试
runTests().catch((error) => {
  console.error('测试执行失败:', error);
  process.exit(1);
});
