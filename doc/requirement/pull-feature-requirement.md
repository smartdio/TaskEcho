# TaskEcho 拉取功能升级需求说明

## 功能概述
系统从纯推送模式升级为推送+拉取双模式，增加服务端任务管理和客户端拉取功能。

## 核心功能

### 1. 服务端任务管理

#### 1.1 项目级任务管理
- 每个项目支持直接添加任务（不属于任何队列）
- 支持编辑项目中的任务（包括不属于队列的任务）
- 支持将不属于队列的任务添加到指定队列

#### 1.2 队列级任务管理
- 在指定队列中添加任务
- 编辑队列中的任务
- 将任务从一个队列移动到另一个队列

#### 1.3 任务来源标识
- 区分任务来源：服务端创建/编辑 vs 客户端推送
- 记录任务创建/编辑的来源信息（服务端/客户端）
- 记录任务创建/编辑时间戳

#### 1.4 任务编辑对拉取的影响
- 服务端编辑已拉取的任务时，需要重置拉取状态（`pulled_at` 设为 null），使任务重新可拉取
- 服务端编辑未拉取的任务时，更新 `server_modified_at` 时间戳
- 客户端推送任务时，如果任务已被服务端编辑，需要处理冲突：
  - 方案1：客户端推送覆盖服务端编辑（默认）
  - 方案2：检测冲突，返回错误，要求客户端重新拉取
  - 方案3：合并策略（复杂，暂不考虑）

#### 1.5 任务优先级（可选）
- 支持任务优先级字段：high/medium/low 或数字 1-10
- 拉取时支持按优先级排序：高优先级任务优先拉取
- 服务端创建/编辑任务时可以设置优先级

#### 1.6 任务过期机制（可选）
- 支持任务过期时间：超过指定时间未拉取的任务自动标记为过期
- 支持任务过期后自动删除或归档
- 拉取接口可以排除过期任务

### 2. 客户端拉取功能

#### 2.1 拉取接口
- 客户端根据项目ID拉取任务
- 支持按任务状态过滤拉取（pending/running/done/error/cancelled）
- 只拉取服务端新增或编辑的任务（排除客户端推送的任务）
- 支持增量拉取（基于时间戳或版本号）

#### 2.2 拉取范围
- 拉取指定项目下的所有任务（包括不属于队列的任务）
- 拉取指定队列下的所有任务
- 支持拉取指定状态的任务

### 2.3 拉取后任务处理策略

**问题背景**：客户端拉取任务后，会重新推送更新后的任务和任务队列，这些任务会变成客户端推送的任务。

**处理方案**：拉取后标记为已拉取，不删除

**流程**：
1. 客户端拉取服务端任务
2. 服务端标记任务为已拉取状态（`pulled_at` 时间戳）
3. 客户端处理任务并更新状态
4. 客户端通过推送接口重新推送任务（source 变为 client）
5. 服务端保留原始任务记录，但不再出现在拉取列表中

**优点**：
- 数据安全，不会丢失任务
- 可以追踪任务的完整流转历史
- 支持重复拉取（如果需要）
- 可以统计拉取成功率

**实现要点**：
- 增加 `pulled_at` 字段：记录任务被拉取的时间戳（null 表示未拉取）
- 增加 `pulled_by` 字段：记录拉取任务的客户端标识（可选，用于审计）
- 拉取接口只返回 `source=server` 且 `pulled_at=null` 的任务
- 客户端推送后，服务端任务保留但标记为已拉取，便于审计和追踪

### 2.4 拉取锁定机制（防止并发拉取）

**问题**：多个客户端同时拉取同一个任务时，可能导致重复处理。

**解决方案**：
- 拉取时使用原子操作标记 `pulled_at` 和 `pulled_by`
- 如果任务已被其他客户端拉取，返回空结果或错误
- 支持拉取超时机制：如果客户端拉取后长时间未推送（如超过1小时），可以自动释放锁定

**实现要点**：
- 拉取操作必须是原子性的（使用 MongoDB 的 findOneAndUpdate）
- 增加 `pull_timeout` 配置：拉取超时时间（默认1小时）
- 增加定时任务：定期检查超时的拉取，自动释放锁定（可选）

### 2.5 拉取失败和重试机制

**场景**：
- 客户端拉取后处理失败，需要重新拉取
- 客户端拉取后崩溃，任务需要重新可用

**解决方案**：
- 支持"拉取回退"接口：客户端可以主动释放已拉取的任务
- 支持超时自动释放：超过 `pull_timeout` 时间未推送，自动重置 `pulled_at` 为 null
- 支持手动重置：服务端可以手动重置任务的拉取状态

**实现要点**：
- POST /api/v1/projects/{projectId}/tasks/{taskId}/pull/release - 释放拉取锁定
- 支持批量释放接口
- 队列操作（reset/reset-error/re-run）时，自动重置相关任务的拉取状态

### 2.6 拉取过滤增强

**当前支持**：按状态过滤（pending/running/done/error/cancelled）

**需要增强**：
- 按标签过滤：只拉取包含指定标签的任务
- 按时间范围过滤：拉取指定时间范围内创建/修改的任务
- 按优先级过滤：如果任务有优先级字段
- 按队列过滤：拉取指定队列的任务
- 排除已拉取：只拉取未拉取的任务（默认行为）

**实现要点**：
- 拉取接口支持更多查询参数：tags, created_after, created_before, modified_after, modified_before, priority
- 支持组合查询条件

### 2.7 批量拉取和确认

**场景**：客户端需要一次性拉取多个任务，或批量确认拉取。

**解决方案**：
- 支持批量拉取接口：一次拉取多个任务
- 支持批量确认接口：一次确认多个任务的拉取
- 支持批量释放接口：一次释放多个任务的拉取锁定

**实现要点**：
- POST /api/v1/projects/{projectId}/tasks/pull/batch - 批量拉取
- POST /api/v1/projects/{projectId}/tasks/pull/confirm/batch - 批量确认
- POST /api/v1/projects/{projectId}/tasks/pull/release/batch - 批量释放
- 支持 limit 参数控制批量大小

### 2.8 拉取限流和配额

**问题**：防止客户端频繁拉取，造成服务器压力。

**解决方案**：
- 支持拉取频率限制：每个 API Key 每分钟/每小时最多拉取次数
- 支持拉取配额：每个 API Key 每天最多拉取任务数
- 支持拉取间隔：两次拉取之间的最小时间间隔

**实现要点**：
- 使用 Redis 或内存缓存记录拉取频率
- 返回 429 Too Many Requests 状态码
- 在响应头中返回剩余配额信息

### 2.9 拉取历史查询和统计

**场景**：需要查看任务的拉取历史、统计拉取成功率等。

**解决方案**：
- 查询任务的拉取历史：哪些客户端拉取过，什么时候拉取的
- 统计拉取成功率：拉取后成功推送的比例
- 统计拉取耗时：从拉取到推送的时间分布
- 查询未推送的已拉取任务：拉取后长时间未推送的任务

**实现要点**：
- GET /api/v1/projects/{projectId}/tasks/{taskId}/pull/history - 查询拉取历史
- GET /api/v1/projects/{projectId}/tasks/pull/stats - 拉取统计信息
- GET /api/v1/projects/{projectId}/tasks/pull/pending - 查询已拉取但未推送的任务

### 3. 队列管理操作

#### 3.1 队列操作类型
- **reset**：重置队列（清空队列中所有任务的状态，重新开始）
- **reset-error**：重置错误任务（将队列中所有错误任务重置为pending状态）
- **re-run**：重新运行队列（重新执行队列中的所有任务）

#### 3.2 任务级操作
- 对单个错误任务执行重新执行操作
- 将任务状态从error重置为pending
- 支持批量操作多个错误任务

#### 3.3 操作同步
- 队列管理操作的状态变更需要同步到客户端拉取
- 客户端拉取时能够获取到队列和任务的状态变更信息
- 状态变更记录时间戳，支持增量拉取

#### 3.4 队列操作对拉取的影响
- **reset**：重置队列时，重置队列中所有任务的拉取状态（`pulled_at` 设为 null），使任务重新可拉取
- **reset-error**：重置错误任务时，只重置错误任务的拉取状态
- **re-run**：重新运行队列时，重置队列中所有任务的拉取状态，使任务重新可拉取
- 单个任务的 re-run：重置该任务的拉取状态

#### 3.5 任务删除和拉取状态
- 服务端删除任务时，如果任务已被拉取，需要记录删除操作
- 支持软删除：标记任务为已删除，但保留拉取历史记录
- 客户端拉取已删除的任务时，返回错误或空结果

## 数据模型变更

### 任务模型扩展
- 增加 `source` 字段：标识任务来源（server/client）
- 增加 `created_at` 字段：任务创建时间
- 增加 `updated_at` 字段：任务最后更新时间
- 增加 `server_modified_at` 字段：服务端最后修改时间（用于拉取判断）
- 增加 `pulled_at` 字段：任务被拉取的时间戳（null 表示未拉取）
- 增加 `pulled_by` 字段：拉取任务的客户端标识（可选，用于审计）
- 增加 `priority` 字段：任务优先级（可选，high/medium/low 或数字 1-10）
- 增加 `expires_at` 字段：任务过期时间（可选，null 表示永不过期）
- 增加 `deleted_at` 字段：任务删除时间（软删除，null 表示未删除）
- 增加 `pull_history` 字段：拉取历史记录数组（可选，用于审计）
  - 包含：pulled_at, pulled_by, released_at, released_by

### 队列模型扩展
- 增加 `last_reset_at` 字段：最后重置时间
- 增加 `last_operation` 字段：最后操作类型（reset/reset-error/re-run）

## API 接口需求

### 服务端任务管理接口
- POST /api/v1/projects/{projectId}/tasks - 在项目中创建任务
  - 请求体支持：priority, expires_at 等字段
- PUT /api/v1/projects/{projectId}/tasks/{taskId} - 编辑项目中的任务
  - 编辑已拉取的任务时，自动重置拉取状态（`pulled_at` 设为 null）
- DELETE /api/v1/projects/{projectId}/tasks/{taskId} - 删除项目中的任务（软删除）
  - 设置 `deleted_at` 字段，不物理删除
- POST /api/v1/projects/{projectId}/queues/{queueId}/tasks - 在队列中创建任务
  - 请求体支持：priority, expires_at 等字段
- PUT /api/v1/projects/{projectId}/queues/{queueId}/tasks/{taskId} - 编辑队列中的任务
  - 编辑已拉取的任务时，自动重置拉取状态（`pulled_at` 设为 null）
- DELETE /api/v1/projects/{projectId}/queues/{queueId}/tasks/{taskId} - 删除队列中的任务（软删除）
  - 设置 `deleted_at` 字段，不物理删除
- POST /api/v1/projects/{projectId}/tasks/{taskId}/move - 将任务移动到指定队列
  - 移动任务时，保持拉取状态不变
- POST /api/v1/projects/{projectId}/tasks/{taskId}/pull/reset - 手动重置任务的拉取状态
  - 服务端可以手动重置任务的拉取状态，使任务重新可拉取

### 客户端拉取接口
- GET /api/v1/projects/{projectId}/tasks/pull - 拉取项目任务
  - 只返回 `source=server` 且 `pulled_at=null` 且 `deleted_at=null` 的任务
  - 支持查询参数：status, since（时间戳）, tags, created_after, created_before, modified_after, modified_before, priority, limit
  - 拉取时自动标记 `pulled_at` 和 `pulled_by`（原子操作）
- GET /api/v1/projects/{projectId}/queues/{queueId}/tasks/pull - 拉取队列任务
  - 只返回 `source=server` 且 `pulled_at=null` 且 `deleted_at=null` 的任务
  - 支持查询参数：status, since（时间戳）, tags, created_after, created_before, modified_after, modified_before, priority, limit
  - 拉取时自动标记 `pulled_at` 和 `pulled_by`（原子操作）
- POST /api/v1/projects/{projectId}/tasks/pull/batch - 批量拉取任务
  - 支持一次拉取多个任务
  - 请求体：{ taskIds: [], filters: {} }
  - 返回拉取结果和失败原因
- POST /api/v1/projects/{projectId}/tasks/{taskId}/pull/release - 释放拉取锁定
  - 重置任务的 `pulled_at` 和 `pulled_by` 字段
  - 用于客户端拉取后处理失败，需要重新拉取的场景
- POST /api/v1/projects/{projectId}/tasks/pull/release/batch - 批量释放拉取锁定
  - 批量重置多个任务的拉取状态
- GET /api/v1/projects/{projectId}/tasks/{taskId}/pull/history - 查询任务拉取历史
  - 返回任务的拉取历史记录（`pull_history` 字段）
- GET /api/v1/projects/{projectId}/tasks/pull/stats - 拉取统计信息
  - 返回拉取成功率、平均拉取耗时等统计信息
- GET /api/v1/projects/{projectId}/tasks/pull/pending - 查询已拉取但未推送的任务
  - 返回拉取后超过指定时间未推送的任务列表
  - 支持查询参数：timeout（超时时间，默认1小时）

### 队列管理接口
- POST /api/v1/projects/{projectId}/queues/{queueId}/reset - 重置队列
- POST /api/v1/projects/{projectId}/queues/{queueId}/reset-error - 重置错误任务
- POST /api/v1/projects/{projectId}/queues/{queueId}/re-run - 重新运行队列
- POST /api/v1/projects/{projectId}/queues/{queueId}/tasks/{taskId}/re-run - 重新执行单个任务

## UI 功能需求

### 项目详情页
- 增加"添加任务"按钮（创建不属于队列的任务）
- 显示不属于队列的任务列表
- 支持将任务添加到队列的操作
- 显示任务的拉取状态（未拉取/已拉取/已拉取未推送）
- 支持筛选：只显示未拉取的任务、只显示已拉取的任务等

### 队列详情页
- 增加"添加任务"按钮
- 增加队列管理操作按钮（reset/reset-error/re-run）
- 任务列表中显示任务来源标识（服务端/客户端）
- 任务列表中显示拉取状态（未拉取/已拉取/已拉取未推送）
- 错误任务支持单独重新执行操作
- 支持批量操作：批量重置拉取状态、批量删除等

### 任务详情页
- 显示任务来源信息
- 显示任务创建和更新时间
- 显示拉取历史信息（如果已拉取）
- 显示任务优先级（如果设置了）
- 显示任务过期时间（如果设置了）
- 支持编辑任务（标题、标签、状态、优先级等）
- 支持将任务移动到其他队列
- 支持删除任务（软删除）
- 支持重置拉取状态（如果任务已拉取）

### 拉取管理页面（新增）
- 显示拉取统计信息：拉取成功率、平均拉取耗时等
- 显示已拉取但未推送的任务列表
- 支持批量释放拉取锁定
- 支持查询任务的拉取历史

## 权限控制
- 服务端任务管理操作需要认证（API Key）
- 客户端拉取操作需要认证（API Key）
- 队列管理操作需要认证（API Key）

## 兼容性
- 保持现有推送接口（POST /api/v1/submit）完全兼容
- 客户端推送的任务默认标记为 client 来源
- 现有任务数据需要迁移，补充 source 字段（默认为 client）
- 现有任务数据需要补充 `pulled_at` 字段（默认为 null）

## 性能优化

### 数据库索引
- `source` 字段索引：用于快速筛选服务端任务
- `pulled_at` 字段索引：用于快速筛选未拉取的任务
- `(source, pulled_at)` 复合索引：用于拉取查询优化
- `deleted_at` 字段索引：用于排除已删除任务
- `server_modified_at` 字段索引：用于增量拉取
- `priority` 字段索引：用于优先级排序

### 查询优化
- 拉取接口使用索引查询，避免全表扫描
- 批量拉取时使用批量查询，减少数据库往返
- 使用 MongoDB 的 `findOneAndUpdate` 实现原子操作
- 拉取历史记录使用分页查询，避免一次性加载大量数据

### 缓存策略（可选）
- 缓存未拉取任务数量统计
- 缓存拉取统计信息（设置过期时间）
- 使用 Redis 实现拉取限流

## 错误处理

### 拉取错误
- 任务不存在：返回 404 Not Found
- 任务已被拉取：返回 409 Conflict 或空结果
- 任务已删除：返回 410 Gone 或空结果
- 拉取限流：返回 429 Too Many Requests
- 权限不足：返回 403 Forbidden

### 推送冲突处理
- 客户端推送任务时，如果任务已被服务端编辑：
  - 默认：客户端推送覆盖服务端编辑
  - 可选：返回 409 Conflict，提示客户端重新拉取
- 客户端推送任务时，如果任务已被删除：
  - 返回 410 Gone，提示任务已删除

## 监控和告警

### 监控指标
- 拉取请求数量（按项目、按队列）
- 拉取成功率（拉取后成功推送的比例）
- 平均拉取耗时（从拉取到推送的时间）
- 拉取超时任务数量（拉取后长时间未推送）
- 拉取限流触发次数
- 队列操作频率（reset/reset-error/re-run）

### 告警规则（可选）
- 拉取成功率低于阈值（如 < 80%）
- 拉取超时任务数量超过阈值
- 拉取请求频率异常（可能被攻击）
- 队列操作频率异常

## 安全考虑

### API Key 权限
- 不同 API Key 可以有不同的权限：
  - 只读权限：只能拉取任务
  - 读写权限：可以拉取和推送任务
  - 管理权限：可以管理任务和队列
- API Key 可以绑定到特定项目，限制访问范围

### 拉取审计
- 记录所有拉取操作：谁拉取了什么任务，什么时候拉取的
- 记录所有拉取释放操作：谁释放了什么任务
- 记录所有队列操作：谁执行了什么操作

## 配置项

### 拉取相关配置
- `pull_timeout`：拉取超时时间（默认1小时）
- `pull_rate_limit`：拉取频率限制（每分钟/每小时最多拉取次数）
- `pull_quota`：拉取配额（每天最多拉取任务数）
- `pull_batch_size`：批量拉取最大数量（默认100）
- `task_expiry_time`：任务过期时间（可选，默认永不过期）

### 队列操作配置
- `reset_clear_pull_status`：reset 操作是否清除拉取状态（默认 true）
- `rerun_clear_pull_status`：re-run 操作是否清除拉取状态（默认 true）

