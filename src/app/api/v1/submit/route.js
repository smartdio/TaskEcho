/**
 * POST /api/v1/submit
 * 核心数据提交接口 - 提交项目、任务队列和批量任务
 */
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import { createSuccessResponse, createErrorResponse, ERROR_CODES } from '@/lib/api-response';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';
import Queue from '@/lib/models/Queue';
import { validateApiKeyProject } from '@/lib/auth';
import { incrementExecutionStats } from '@/lib/statistics/increment-stats';

/**
 * 验证提交数据
 * @param {Object} data - 请求数据
 * @returns {Array} 错误数组
 */
function validateSubmitData(data) {
  const errors = [];
  
  // 验证必填字段
  if (!data.project_id || typeof data.project_id !== 'string' || !data.project_id.trim()) {
    errors.push({ field: 'project_id', reason: 'project_id 不能为空' });
  } else if (data.project_id.length > 255) {
    errors.push({ field: 'project_id', reason: 'project_id 长度不能超过255个字符' });
  }
  
  if (!data.project_name || typeof data.project_name !== 'string' || !data.project_name.trim()) {
    errors.push({ field: 'project_name', reason: 'project_name 不能为空' });
  } else if (data.project_name.length > 1000) {
    errors.push({ field: 'project_name', reason: 'project_name 长度不能超过1000个字符' });
  }
  
  if (!data.queue_id || typeof data.queue_id !== 'string' || !data.queue_id.trim()) {
    errors.push({ field: 'queue_id', reason: 'queue_id 不能为空' });
  } else if (data.queue_id.length > 255) {
    errors.push({ field: 'queue_id', reason: 'queue_id 长度不能超过255个字符' });
  }
  
  if (!data.queue_name || typeof data.queue_name !== 'string' || !data.queue_name.trim()) {
    errors.push({ field: 'queue_name', reason: 'queue_name 不能为空' });
  } else if (data.queue_name.length > 1000) {
    errors.push({ field: 'queue_name', reason: 'queue_name 长度不能超过1000个字符' });
  }
  
  // 验证 clientInfo（可选）
  if (data.clientInfo !== undefined) {
    if (typeof data.clientInfo !== 'object' || data.clientInfo === null) {
      errors.push({ field: 'clientInfo', reason: 'clientInfo 必须是对象' });
    } else {
      if (data.clientInfo.username !== undefined && (typeof data.clientInfo.username !== 'string' || data.clientInfo.username.length > 255)) {
        errors.push({ field: 'clientInfo.username', reason: 'clientInfo.username 必须是字符串且长度不超过255个字符' });
      }
      if (data.clientInfo.hostname !== undefined && (typeof data.clientInfo.hostname !== 'string' || data.clientInfo.hostname.length > 255)) {
        errors.push({ field: 'clientInfo.hostname', reason: 'clientInfo.hostname 必须是字符串且长度不超过255个字符' });
      }
      if (data.clientInfo.project_path !== undefined && (typeof data.clientInfo.project_path !== 'string' || data.clientInfo.project_path.length > 1000)) {
        errors.push({ field: 'clientInfo.project_path', reason: 'clientInfo.project_path 必须是字符串且长度不超过1000个字符' });
      }
    }
  }
  
  if (!data.tasks || !Array.isArray(data.tasks) || data.tasks.length === 0) {
    errors.push({ field: 'tasks', reason: 'tasks 必须是非空数组' });
  }
  
  // 验证任务数据
  if (data.tasks && Array.isArray(data.tasks)) {
    const taskIds = new Set();
    
    data.tasks.forEach((task, index) => {
      // 验证任务ID
      if (!task.id || typeof task.id !== 'string' || !task.id.trim()) {
        errors.push({ field: `tasks[${index}].id`, reason: 'id 不能为空' });
      } else if (task.id.length > 255) {
        errors.push({ field: `tasks[${index}].id`, reason: 'id 长度不能超过255个字符' });
      } else {
        // 检查ID重复
        if (taskIds.has(task.id)) {
          errors.push({ field: `tasks[${index}].id`, reason: `id ${task.id} 在本次请求中重复` });
        }
        taskIds.add(task.id);
      }
      
      // 验证任务名称
      if (!task.name || typeof task.name !== 'string' || !task.name.trim()) {
        errors.push({ field: `tasks[${index}].name`, reason: 'name 不能为空' });
      } else if (task.name.length > 1000) {
        errors.push({ field: `tasks[${index}].name`, reason: 'name 长度不能超过1000个字符' });
      }
      
      // 验证任务提示
      if (!task.prompt || typeof task.prompt !== 'string' || !task.prompt.trim()) {
        errors.push({ field: `tasks[${index}].prompt`, reason: 'prompt 不能为空' });
      } else if (task.prompt.length > 100000) {
        errors.push({ field: `tasks[${index}].prompt`, reason: 'prompt 长度不能超过100000个字符' });
      }
      
      // 验证状态
      if (!task.status || typeof task.status !== 'string') {
        errors.push({ field: `tasks[${index}].status`, reason: 'status 不能为空' });
      } else {
        const statusLower = task.status.toLowerCase();
        if (!['pending', 'done', 'error'].includes(statusLower)) {
          errors.push({ field: `tasks[${index}].status`, reason: 'status 必须是 pending、done 或 error' });
        }
      }
      
      // 验证 spec_file（可选，支持字符串或数组）
      if (task.spec_file !== undefined && task.spec_file !== null) {
        // 将字符串或数组统一转换为数组进行验证
        let specFileArray = [];
        if (typeof task.spec_file === 'string') {
          // 字符串：转换为单元素数组
          specFileArray = [task.spec_file];
        } else if (Array.isArray(task.spec_file)) {
          // 数组：直接使用
          specFileArray = task.spec_file;
        } else {
          // 既不是字符串也不是数组，报错
          errors.push({ field: `tasks[${index}].spec_file`, reason: 'spec_file 必须是字符串或数组' });
        }
        
        // 验证数组元素
        if (specFileArray.length > 0) {
          const specFileSet = new Set();
          specFileArray.forEach((file, fileIndex) => {
            if (typeof file !== 'string' || !file.trim()) {
              errors.push({ field: `tasks[${index}].spec_file[${fileIndex}]`, reason: 'spec_file 数组元素必须是非空字符串' });
            } else if (file.length > 500) {
              errors.push({ field: `tasks[${index}].spec_file[${fileIndex}]`, reason: 'spec_file 路径长度不能超过500个字符' });
            } else {
              // 检查路径重复
              if (specFileSet.has(file)) {
                errors.push({ field: `tasks[${index}].spec_file[${fileIndex}]`, reason: `路径 ${file} 在 spec_file 中重复` });
              }
              specFileSet.add(file);
            }
          });
        }
      }
      
      // 验证 report（可选）
      if (task.report !== undefined && task.report !== null) {
        if (typeof task.report !== 'string') {
          errors.push({ field: `tasks[${index}].report`, reason: 'report 必须是字符串' });
        } else if (task.report.length > 500) {
          errors.push({ field: `tasks[${index}].report`, reason: 'report 长度不能超过500个字符' });
        }
      }
      
      // 验证 messages（可选）
      if (task.messages !== undefined) {
        if (!Array.isArray(task.messages)) {
          errors.push({ field: `tasks[${index}].messages`, reason: 'messages 必须是数组' });
        } else {
          task.messages.forEach((msg, msgIndex) => {
            if (!msg.role || typeof msg.role !== 'string') {
              errors.push({ field: `tasks[${index}].messages[${msgIndex}].role`, reason: 'role 不能为空' });
            } else {
              const roleLower = msg.role.toLowerCase();
              if (!['user', 'assistant'].includes(roleLower)) {
                errors.push({ field: `tasks[${index}].messages[${msgIndex}].role`, reason: 'role 必须是 user 或 assistant' });
              }
            }
            
            if (!msg.content || typeof msg.content !== 'string' || !msg.content.trim()) {
              errors.push({ field: `tasks[${index}].messages[${msgIndex}].content`, reason: 'content 不能为空' });
            } else if (msg.content.length > 100000) {
              errors.push({ field: `tasks[${index}].messages[${msgIndex}].content`, reason: 'content 长度不能超过100000个字符' });
            }
          });
        }
      }
      
      // 验证 logs（可选）
      if (task.logs !== undefined) {
        if (!Array.isArray(task.logs)) {
          errors.push({ field: `tasks[${index}].logs`, reason: 'logs 必须是数组' });
        } else {
          task.logs.forEach((log, logIndex) => {
            if (!log.content || typeof log.content !== 'string' || !log.content.trim()) {
              errors.push({ field: `tasks[${index}].logs[${logIndex}].content`, reason: 'content 不能为空' });
            } else if (log.content.length > 100000) {
              errors.push({ field: `tasks[${index}].logs[${logIndex}].content`, reason: 'content 长度不能超过100000个字符' });
            }
          });
        }
      }
    });
  }
  
  return errors;
}

/**
 * 处理提交请求
 */
async function handlePOST(request, context) {
  const startTime = Date.now();
  const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    console.log(`[Submit API] [${requestId}] ========== 请求开始 ==========`);
    console.log(`[Submit API] [${requestId}] 请求方法: ${request.method}`);
    console.log(`[Submit API] [${requestId}] 请求URL: ${request.url}`);
    console.log(`[Submit API] [${requestId}] 请求头:`, {
      'content-type': request.headers.get('content-type'),
      'x-api-key': context.apiKey ? `${context.apiKey.key?.substring(0, 8)}...` : '未提供',
      'user-agent': request.headers.get('user-agent')
    });
    
    await connectDB();
    console.log(`[Submit API] [${requestId}] 数据库连接成功`);
    
    // 1. 解析请求体
    let data;
    try {
      const rawBody = await request.text();
      console.log(`[Submit API] [${requestId}] 原始请求体长度: ${rawBody.length} 字符`);
      
      // 尝试解析 JSON
      data = JSON.parse(rawBody);
      console.log(`[Submit API] [${requestId}] JSON 解析成功`);
      console.log(`[Submit API] [${requestId}] 请求数据摘要:`, {
        project_id: data.project_id,
        project_name: data.project_name,
        queue_id: data.queue_id,
        queue_name: data.queue_name,
        tasks_count: data.tasks?.length || 0,
        has_clientInfo: !!data.clientInfo,
        has_meta: !!data.meta
      });
    } catch (parseError) {
      console.error(`[Submit API] [${requestId}] JSON 解析失败:`, {
        error: parseError.message,
        stack: parseError.stack,
        rawBodyPreview: rawBody?.substring(0, 500)
      });
      return createErrorResponse(
        `请求体解析失败: ${parseError.message}`,
        ERROR_CODES.VALIDATION_ERROR,
        400,
        { parse_error: parseError.message }
      );
    }
    
    // 2. 验证 API Key 项目关联（如果 API Key 关联了项目）
    if (context.apiKey && context.apiKey.projectId) {
      console.log(`[Submit API] [${requestId}] 检查 API Key 项目关联:`, {
        apiKey_projectId: context.apiKey.projectId,
        request_project_id: data.project_id
      });
      
      if (!validateApiKeyProject(context.apiKey, data.project_id)) {
        console.error(`[Submit API] [${requestId}] API Key 项目关联验证失败`);
        return createErrorResponse(
          'API Key 只能用于指定项目',
          ERROR_CODES.INVALID_API_KEY,
          401,
          { project_id: data.project_id }
        );
      }
      console.log(`[Submit API] [${requestId}] API Key 项目关联验证通过`);
    } else {
      console.log(`[Submit API] [${requestId}] API Key 未关联项目，跳过项目关联验证`);
    }
    
    // 3. 验证请求数据
    console.log(`[Submit API] [${requestId}] 开始验证请求数据...`);
    const validationErrors = validateSubmitData(data);
    
    if (validationErrors.length > 0) {
      console.error(`[Submit API] [${requestId}] 数据验证失败，共 ${validationErrors.length} 个错误:`);
      validationErrors.forEach((error, index) => {
        console.error(`[Submit API] [${requestId}]   错误 ${index + 1}: ${error.field} - ${error.reason}`);
      });
      
      // 返回第一个错误（简化处理）
      const firstError = validationErrors[0];
      return createErrorResponse(
        '请求参数验证失败',
        ERROR_CODES.VALIDATION_ERROR,
        400,
        {
          field: firstError.field,
          reason: firstError.reason,
          all_errors: validationErrors // 包含所有错误信息
        }
      );
    }
    console.log(`[Submit API] [${requestId}] 数据验证通过`);
    
    // 4. 开始数据库操作（使用事务确保原子性）
    const now = new Date();
    console.log(`[Submit API] [${requestId}] 开始数据库操作，时间戳: ${now.toISOString()}`);
    
    // 5. 处理项目（Upsert）
    console.log(`[Submit API] [${requestId}] 查询现有项目: project_id=${data.project_id}`);
    const existingProject = await Project.findOne({ projectId: data.project_id }).lean();
    console.log(`[Submit API] [${requestId}] 项目查询结果:`, existingProject ? '项目已存在' : '项目不存在，将创建');
    
    const projectUpdate = {
      $set: {
        projectId: data.project_id,
        name: data.project_name
      },
      $setOnInsert: { createdAt: now }
    };
    
    // 如果提供了 clientInfo，则更新它（使用点符号确保嵌套对象正确更新）
    if (data.clientInfo) {
      // 使用点符号更新嵌套字段，确保 Mongoose 正确处理
      projectUpdate.$set['clientInfo.username'] = data.clientInfo.username || null;
      projectUpdate.$set['clientInfo.hostname'] = data.clientInfo.hostname || null;
      projectUpdate.$set['clientInfo.project_path'] = data.clientInfo.project_path || null;
      console.log(`[Submit API] [${requestId}] 保存 clientInfo:`, JSON.stringify({
        username: data.clientInfo.username || null,
        hostname: data.clientInfo.hostname || null,
        project_path: data.clientInfo.project_path || null
      }));
    } else {
      console.log(`[Submit API] [${requestId}] 未提供 clientInfo`);
    }
    
    console.log(`[Submit API] [${requestId}] 执行项目 Upsert 操作...`);
    const project = await Project.findOneAndUpdate(
      { projectId: data.project_id },
      projectUpdate,
      { upsert: true, new: true, runValidators: true }
    );
    console.log(`[Submit API] [${requestId}] 项目 Upsert 成功，项目ID: ${project._id}`);
    
    // 验证保存结果 - 重新查询以确保获取最新数据
    if (data.clientInfo) {
      const savedProject = await Project.findOne({ projectId: data.project_id }).lean();
      if (savedProject) {
        console.log(`[Submit API] [${requestId}] 保存后的 clientInfo:`, JSON.stringify(savedProject.clientInfo));
      } else {
        console.log(`[Submit API] [${requestId}] 警告: 重新查询项目失败`);
      }
    }
    
    // 6. 查询现有队列（需要在准备任务数组之前查询，以便保留已完成的任务的 messages 和 logs）
    console.log(`[Submit API] [${requestId}] 查询现有队列: projectId=${project._id}, queueId=${data.queue_id}`);
    const existingQueue = await Queue.findOne({
      projectId: project._id,
      queueId: data.queue_id
    }).lean();
    console.log(`[Submit API] [${requestId}] 队列查询结果:`, existingQueue ? `队列已存在，现有任务数: ${existingQueue.tasks?.length || 0}` : '队列不存在，将创建');
    
    // 7. 准备任务数组（完全替换策略，确保幂等性）
    // 特殊处理：如果客户端提交的任务状态是 done 或 error，且数据库中同样的任务状态也是 done 或 error（状态一致），则保留数据库中的 messages 和 logs
    console.log(`[Submit API] [${requestId}] 开始准备任务数组，任务数量: ${data.tasks?.length || 0}`);
    const tasks = (data.tasks || []).map((taskData, index) => {
      const clientStatus = taskData.status.toLowerCase();
      const taskId = taskData.id;
      
      // 查找数据库中对应的任务
      let existingTask = null;
      if (existingQueue && existingQueue.tasks) {
        existingTask = existingQueue.tasks.find(t => t.id === taskId);
      }
      
      // 判断是否需要保留数据库中的 messages 和 logs
      // 条件：客户端状态是 done 或 error，且数据库中任务存在且状态也是 done 或 error（状态一致）
      const existingStatus = existingTask && existingTask.status ? existingTask.status.toLowerCase() : null;
      const shouldPreserveMessagesAndLogs = 
        (clientStatus === 'done' || clientStatus === 'error') && 
        existingTask && 
        existingStatus &&
        existingStatus === clientStatus;
      
      let messages, logs;
      
      if (shouldPreserveMessagesAndLogs) {
        // 保留数据库中的 messages 和 logs
        console.log(`[Submit API] [${requestId}] 任务 ${taskId} 状态为 ${clientStatus}，保留数据库中的 messages 和 logs`);
        messages = existingTask.messages || [];
        logs = existingTask.logs || [];
      } else {
        // 使用客户端提交的 messages 和 logs
        messages = (taskData.messages || []).map(msg => ({
          role: msg.role.toUpperCase(),
          content: msg.content,
          sessionId: msg.session_id || null,  // 客户端与 cursor-agent 交互时的对话会话ID，原样保存
          createdAt: msg.createdAt ? new Date(msg.createdAt) : now
        }));
        
        logs = (taskData.logs || []).map(log => ({
          content: log.content,
          createdAt: log.createdAt ? new Date(log.createdAt) : now
        }));
      }
      
      // 处理 spec_file：支持字符串或数组，统一转换为数组
      let specFileArray = [];
      if (taskData.spec_file !== undefined && taskData.spec_file !== null) {
        if (typeof taskData.spec_file === 'string') {
          // 字符串：转换为单元素数组
          specFileArray = [taskData.spec_file];
        } else if (Array.isArray(taskData.spec_file)) {
          // 数组：直接使用
          specFileArray = taskData.spec_file;
        } else {
          // 如果既不是字符串也不是数组，使用空数组（验证阶段应该已经捕获错误）
          specFileArray = [];
        }
      }
      
      const task = {
        id: taskData.id,
        name: taskData.name,
        prompt: taskData.prompt,
        spec_file: specFileArray,
        status: clientStatus,
        report: taskData.report || null,
        messages: messages,
        logs: logs
      };
      
      if (index < 3) {
        console.log(`[Submit API] [${requestId}] 任务 ${index + 1} 摘要:`, {
          id: task.id,
          name: task.name?.substring(0, 50),
          status: task.status,
          messages_count: task.messages.length,
          logs_count: task.logs.length,
          spec_file_count: task.spec_file.length,
          preserved_messages_logs: shouldPreserveMessagesAndLogs
        });
      }
      
      return task;
    });
    console.log(`[Submit API] [${requestId}] 任务数组准备完成，共 ${tasks.length} 个任务`);
    
    // 8. 处理任务队列（Upsert，完全替换 tasks 数组，但保留已完成任务的 messages 和 logs）
    console.log(`[Submit API] [${requestId}] 执行队列 Upsert 操作...`);
    const queue = await Queue.findOneAndUpdate(
      {
        projectId: project._id,
        queueId: data.queue_id
      },
      {
        projectId: project._id,
        queueId: data.queue_id,
        name: data.queue_name,
        meta: data.meta || null,
        tasks: tasks,  // 完全替换任务数组（幂等性）
        lastTaskAt: now,
        $setOnInsert: { createdAt: now }
      },
      { upsert: true, new: true }
    );
    console.log(`[Submit API] [${requestId}] 队列 Upsert 成功，队列ID: ${queue._id}`);
    
    // 9. 更新项目的 lastTaskAt
    console.log(`[Submit API] [${requestId}] 更新项目的 lastTaskAt...`);
    await Project.findByIdAndUpdate(project._id, {
      lastTaskAt: now
    });
    console.log(`[Submit API] [${requestId}] 项目 lastTaskAt 更新成功`);
    
    // 9.5. 累计统计数据（对于状态从 pending 变为 done/error 的任务）
    if (existingQueue && existingQueue.tasks) {
      tasks.forEach((newTask) => {
        const existingTask = existingQueue.tasks.find(t => t.id === newTask.id);
        if (existingTask) {
          const previousStatus = existingTask.status ? existingTask.status.toLowerCase() : 'pending';
          const newStatus = newTask.status.toLowerCase();
          
          // 如果状态从 pending 变为 done/error，需要统计累计
          if (previousStatus === 'pending' && ['done', 'error'].includes(newStatus)) {
            const clientInfo = project.clientInfo || null;
            const apiKeyName = context.apiKey?.name || null;
            const errorMessage = newStatus === 'error' ? '任务执行失败' : null;
            
            // 异步执行统计累计，不阻塞响应
            incrementExecutionStats({
              projectId: data.project_id,
              projectName: project.name,
              queueId: data.queue_id,
              queueName: data.queue_name,
              taskId: newTask.id,
              previousStatus: previousStatus,
              newStatus: newStatus,
              executionDuration: null,
              clientInfo: clientInfo,
              apiKeyName: apiKeyName,
              errorMessage: errorMessage
            }).catch(error => {
              console.error(`[Submit API] [${requestId}] 任务 ${newTask.id} 统计累计失败:`, error);
            });
          }
        }
      });
    }
    
    // 10. 统计创建和更新的任务数量
    // 由于采用完全替换策略，如果队列已存在，所有任务都是更新的；如果队列不存在，所有任务都是新创建的
    const isNewQueue = !existingQueue;
    const tasksCount = tasks.length;
    const createdTasks = isNewQueue ? tasksCount : 0;
    const updatedTasks = isNewQueue ? 0 : tasksCount;
    
    const duration = Date.now() - startTime;
    console.log(`[Submit API] [${requestId}] ========== 请求成功 ==========`);
    console.log(`[Submit API] [${requestId}] 处理结果:`, {
      project_id: data.project_id,
      queue_id: data.queue_id,
      tasks_count: tasksCount,
      created_tasks: createdTasks,
      updated_tasks: updatedTasks,
      is_new_queue: isNewQueue,
      duration_ms: duration
    });
    
    // 11. 返回成功响应
    return createSuccessResponse(
      {
        project_id: data.project_id,
        queue_id: data.queue_id,
        tasks_count: tasksCount,
        created_tasks: createdTasks,
        updated_tasks: updatedTasks
      },
      '提交成功',
      200
    );
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[Submit API] [${requestId}] ========== 请求失败 ==========`);
    console.error(`[Submit API] [${requestId}] 错误类型: ${error.name || 'Unknown'}`);
    console.error(`[Submit API] [${requestId}] 错误消息: ${error.message || '无错误消息'}`);
    console.error(`[Submit API] [${requestId}] 错误代码: ${error.code || '无错误代码'}`);
    console.error(`[Submit API] [${requestId}] 错误堆栈:`, error.stack);
    console.error(`[Submit API] [${requestId}] 错误详情:`, {
      name: error.name,
      message: error.message,
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      errors: error.errors
    });
    console.error(`[Submit API] [${requestId}] 请求耗时: ${duration}ms`);
    
    // 处理数据库唯一约束错误
    if (error.code === 11000) {
      console.error(`[Submit API] [${requestId}] 数据库唯一约束错误:`, {
        keyPattern: error.keyPattern,
        keyValue: error.keyValue
      });
      return createErrorResponse(
        '资源已存在',
        ERROR_CODES.DUPLICATE_KEY,
        400,
        {
          duplicate_fields: error.keyPattern,
          duplicate_values: error.keyValue
        }
      );
    }
    
    // 处理 Mongoose 验证错误
    if (error.name === 'ValidationError') {
      const validationDetails = {};
      const messages = Object.values(error.errors).map(err => {
        validationDetails[err.path] = {
          message: err.message,
          kind: err.kind,
          value: err.value
        };
        return err.message;
      });
      
      console.error(`[Submit API] [${requestId}] Mongoose 验证错误详情:`, validationDetails);
      
      return createErrorResponse(
        messages.join(', '),
        ERROR_CODES.VALIDATION_ERROR,
        400,
        {
          validation_errors: validationDetails
        }
      );
    }
    
    // 处理 JSON 解析错误
    if (error instanceof SyntaxError && error.message.includes('JSON')) {
      console.error(`[Submit API] [${requestId}] JSON 解析错误`);
      return createErrorResponse(
        `请求体格式错误: ${error.message}`,
        ERROR_CODES.VALIDATION_ERROR,
        400,
        { parse_error: error.message }
      );
    }
    
    // 处理数据库连接错误
    if (error.name === 'MongoServerError' || error.name === 'MongooseError') {
      console.error(`[Submit API] [${requestId}] 数据库错误:`, {
        name: error.name,
        message: error.message,
        code: error.code
      });
      return createErrorResponse(
        `数据库操作失败: ${error.message}`,
        ERROR_CODES.INTERNAL_ERROR,
        500,
        { db_error: error.message }
      );
    }
    
    // 默认错误处理
    console.error(`[Submit API] [${requestId}] 未处理的错误类型`);
    return createErrorResponse(
      error.message || '服务器内部错误',
      ERROR_CODES.INTERNAL_ERROR,
      500,
      {
        error_type: error.name || 'Unknown',
        error_message: error.message || '无错误消息'
      }
    );
  }
}

// 导出 POST 处理器（需要 API Key 认证）
export const POST = createApiHandler(handlePOST, [
  MiddlewarePresets.authenticated
]);
