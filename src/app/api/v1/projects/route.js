/**
 * GET /api/v1/projects
 * 获取项目列表（支持分页）
 */
import { createSuccessResponse, createErrorResponse, ERROR_CODES, createPaginatedResponse } from '@/lib/api-response';
import { createApiHandler, MiddlewarePresets } from '@/lib/api-middleware';
import connectDB from '@/lib/mongoose';
import Project from '@/lib/models/Project';

async function handleGET(request, context) {
  try {
    // 连接数据库
    await connectDB();

    // 解析查询参数
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20', 10), 100);
    const search = searchParams.get('search')?.trim() || null;
    const tagsParam = searchParams.get('tags')?.trim() || null;

    // 验证参数
    if (page < 1 || pageSize < 1) {
      return createErrorResponse(
        '页码和每页数量必须大于 0',
        ERROR_CODES.VALIDATION_ERROR,
        400
      );
    }

    // 解析 tags 参数（逗号分隔，转换为小写数组）
    let tagsFilter = null;
    if (tagsParam) {
      tagsFilter = tagsParam
        .split(',')
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);
      
      if (tagsFilter.length === 0) {
        tagsFilter = null;
      }
    }

    // 使用聚合操作关联 ProjectMetadata 和 Queue，一次性获取所有数据
    const pipeline = [];

    // 关联 ProjectMetadata 集合（先关联，以便后续过滤）
    pipeline.push({
      $lookup: {
        from: 'projectmetadatas',
        localField: 'projectId',
        foreignField: 'projectId',
        as: 'metadata'
      }
    });

    // 将 metadata 数组转换为单个对象（因为是一对一关系）
    pipeline.push({
      $addFields: {
        metadata: {
          $cond: {
            if: { $eq: [{ $size: '$metadata' }, 0] },
            then: null,
            else: { $arrayElemAt: ['$metadata', 0] }
          }
        }
      }
    });

    // 添加 displayTitle 字段：优先使用 metadata.customTitle，否则使用 name
    pipeline.push({
      $addFields: {
        displayTitle: {
          $cond: {
            if: {
              $and: [
                { $ne: ['$metadata', null] },
                { $ne: ['$metadata.customTitle', null] },
                { $ne: ['$metadata.customTitle', ''] }
              ]
            },
            then: '$metadata.customTitle',
            else: '$name'
          }
        }
      }
    });

    // 在 lookup 之后添加匹配条件（用于 search customTitle 和 tags 过滤）
    const postLookupMatchConditions = [];
    
    if (search) {
      // 搜索项目名称或自定义标题（使用正则表达式，MongoDB会尝试使用索引）
      postLookupMatchConditions.push({
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { 'metadata.customTitle': { $regex: search, $options: 'i' } }
        ]
      });
    }
    
    if (tagsFilter && tagsFilter.length > 0) {
      // 标签过滤：项目必须包含所有指定的标签（AND 逻辑）
      // metadata 必须存在且 tags 数组包含所有指定标签
      // 使用 $all 操作符，MongoDB会使用 tags 索引
      postLookupMatchConditions.push({
        $and: [
          { $ne: ['$metadata', null] },
          { 'metadata.tags': { $all: tagsFilter } }
        ]
      });
    }

    // 如果有过滤条件，添加 $match 阶段（在排序和分页之前）
    if (postLookupMatchConditions.length > 0) {
      if (postLookupMatchConditions.length === 1) {
        pipeline.push({
          $match: postLookupMatchConditions[0]
        });
      } else {
        // 多个条件使用 $and 组合
        pipeline.push({
          $match: {
            $and: postLookupMatchConditions
          }
        });
      }
    }

    // 关联 Queue 集合，用于统计队列和任务信息
    pipeline.push({
      $lookup: {
        from: 'queues',
        localField: '_id',
        foreignField: 'projectId',
        as: 'queues'
      }
    });

    // 统计队列数和任务数（使用聚合操作，避免N+1查询）
    pipeline.push({
      $addFields: {
        queue_count: { $size: '$queues' },
        task_stats: {
          $let: {
            vars: {
              allTasks: {
                $reduce: {
                  input: '$queues',
                  initialValue: [],
                  in: { $concatArrays: ['$$value', '$$this.tasks'] }
                }
              }
            },
            in: {
              total: { $size: '$$allTasks' },
              pending: {
                $size: {
                  $filter: {
                    input: '$$allTasks',
                    as: 'task',
                    cond: { $eq: [{ $toLower: '$$task.status' }, 'pending'] }
                  }
                }
              },
              done: {
                $size: {
                  $filter: {
                    input: '$$allTasks',
                    as: 'task',
                    cond: { $eq: [{ $toLower: '$$task.status' }, 'done'] }
                  }
                }
              },
              error: {
                $size: {
                  $filter: {
                    input: '$$allTasks',
                    as: 'task',
                    cond: { $eq: [{ $toLower: '$$task.status' }, 'error'] }
                  }
                }
              }
            }
          }
        }
      }
    });

    // 排序：按 lastTaskAt 倒序，如果为 null 则按 createdAt 倒序（使用索引）
    pipeline.push({
      $sort: {
        lastTaskAt: -1,
        createdAt: -1
      }
    });

    // 分页
    pipeline.push({
      $skip: (page - 1) * pageSize
    });
    pipeline.push({
      $limit: pageSize
    });

    // 移除 queues 字段（不需要返回给客户端）
    pipeline.push({
      $project: {
        queues: 0
      }
    });

    // 执行聚合查询
    const projects = await Project.aggregate(pipeline);

    // 统计总数（使用相同的过滤条件）
    let total;
    if (search || tagsFilter) {
      // 需要先关联 metadata 才能统计
      const countPipeline = [
        {
          $lookup: {
            from: 'projectmetadatas',
            localField: 'projectId',
            foreignField: 'projectId',
            as: 'metadata'
          }
        },
        {
          $addFields: {
            metadata: {
              $cond: {
                if: { $eq: [{ $size: '$metadata' }, 0] },
                then: null,
                else: { $arrayElemAt: ['$metadata', 0] }
              }
            }
          }
        }
      ];

      const countMatchConditions = [];
      
      if (search) {
        countMatchConditions.push({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { 'metadata.customTitle': { $regex: search, $options: 'i' } }
          ]
        });
      }
      
      if (tagsFilter && tagsFilter.length > 0) {
        countMatchConditions.push({
          $and: [
            { $ne: ['$metadata', null] },
            { 'metadata.tags': { $all: tagsFilter } }
          ]
        });
      }

      if (countMatchConditions.length > 0) {
        if (countMatchConditions.length === 1) {
          countPipeline.push({ $match: countMatchConditions[0] });
        } else {
          countPipeline.push({ $match: { $and: countMatchConditions } });
        }
      }

      countPipeline.push({ $count: 'total' });
      const countResult = await Project.aggregate(countPipeline);
      total = countResult.length > 0 ? countResult[0].total : 0;
    } else {
      total = await Project.countDocuments();
    }

    // 格式化返回数据
    const projectsWithStats = projects.map((project) => {
      // 格式化 metadata 对象（如果存在）
      let metadata = null;
      if (project.metadata) {
        metadata = {
          customTitle: project.metadata.customTitle || null,
          notes: project.metadata.notes || null,
          tags: project.metadata.tags || []
        };
      }

      // 格式化 gitInfo 对象（如果存在）
      let gitInfo = null;
      if (project.gitInfo) {
        gitInfo = {
          repository: project.gitInfo.repository || null,
          branch: project.gitInfo.branch || null
        };
      }

      // 返回格式化后的项目数据
      return {
        id: project._id.toString(),
        project_id: project.projectId,
        name: project.name,
        displayTitle: project.displayTitle || project.name,
        metadata: metadata,
        clientInfo: project.clientInfo || null,
        gitInfo: gitInfo,
        queue_count: project.queue_count || 0,
        task_count: project.task_stats?.total || 0,
        task_stats: {
          total: project.task_stats?.total || 0,
          pending: project.task_stats?.pending || 0,
          done: project.task_stats?.done || 0,
          error: project.task_stats?.error || 0
        },
        last_task_at: project.lastTaskAt ? project.lastTaskAt.toISOString() : null,
        created_at: project.createdAt.toISOString(),
        updated_at: project.updatedAt.toISOString()
      };
    });

    // 计算分页信息
    const totalPages = Math.ceil(total / pageSize);

    // 返回分页响应
    return createPaginatedResponse(
      projectsWithStats,
      {
        page,
        pageSize,
        total,
        totalPages
      },
      '查询成功'
    );

  } catch (error) {
    console.error('获取项目列表失败:', error);
    return createErrorResponse(
      error.message || '获取项目列表失败',
      ERROR_CODES.INTERNAL_ERROR,
      500
    );
  }
}

export const GET = createApiHandler(handleGET, [
  MiddlewarePresets.authenticated
]);
