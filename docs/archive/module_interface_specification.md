# 智阅阅卷系统模块间接口规范

## 1. 接口设计原则

### 1.1 核心原则
1. **统一性**: 所有模块遵循相同的接口设计规范
2. **版本化**: 支持接口版本管理和向后兼容
3. **标准化**: 采用RESTful API + GraphQL混合架构
4. **安全性**: 统一的认证授权和数据加密
5. **可观测性**: 完整的日志追踪和性能监控

### 1.2 技术标准
- **协议**: HTTP/2 + WebSocket
- **数据格式**: JSON + Protocol Buffers
- **认证**: JWT + OAuth 2.0
- **文档**: OpenAPI 3.0 规范
- **监控**: OpenTelemetry标准

## 2. 通用接口规范

### 2.1 HTTP响应格式标准

```typescript
interface StandardResponse<T = any> {
  success: boolean;
  code: number;
  message: string;
  data?: T;
  error?: ErrorDetail;
  meta?: ResponseMeta;
  timestamp: string;
  requestId: string;
}

interface ErrorDetail {
  type: string;
  field?: string;
  details?: string;
  stack?: string; // 仅开发环境
}

interface ResponseMeta {
  pagination?: PaginationInfo;
  performance?: PerformanceInfo;
  version: string;
}
```

### 2.2 分页查询标准

```typescript
interface PaginationRequest {
  page?: number; // 默认1
  size?: number; // 默认20，最大100
  sort?: string; // 格式: "field:asc|desc"
  filters?: FilterCondition[];
}

interface PaginationInfo {
  page: number;
  size: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface FilterCondition {
  field: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'like';
  value: any;
}
```

### 2.3 批量操作标准

```typescript
interface BatchRequest<T> {
  items: T[];
  options?: {
    skipErrors?: boolean;
    maxConcurrency?: number;
    timeout?: number;
  };
}

interface BatchResponse<T> {
  totalCount: number;
  successCount: number;
  failureCount: number;
  results: BatchResult<T>[];
}

interface BatchResult<T> {
  index: number;
  success: boolean;
  data?: T;
  error?: string;
}
```

## 3. 阅卷中心对外接口

### 3.1 核心业务接口

#### 3.1.1 阅卷会话管理

```typescript
/**
 * 阅卷会话管理接口
 * 负责阅卷任务的生命周期管理
 */
interface GradingSessionAPI {
  /**
   * 创建阅卷会话
   * POST /api/v1/grading/sessions
   */
  createSession(request: CreateGradingSessionRequest): Promise<StandardResponse<GradingSession>>;
  
  /**
   * 获取阅卷会话详情
   * GET /api/v1/grading/sessions/{sessionId}
   */
  getSession(sessionId: string): Promise<StandardResponse<GradingSession>>;
  
  /**
   * 更新会话状态
   * PATCH /api/v1/grading/sessions/{sessionId}/status
   */
  updateSessionStatus(sessionId: string, status: SessionStatus): Promise<StandardResponse<void>>;
  
  /**
   * 获取会话列表
   * GET /api/v1/grading/sessions
   */
  getSessions(request: GetSessionsRequest): Promise<StandardResponse<GradingSession[]>>;
  
  /**
   * 删除阅卷会话
   * DELETE /api/v1/grading/sessions/{sessionId}
   */
  deleteSession(sessionId: string): Promise<StandardResponse<void>>;
}

interface CreateGradingSessionRequest {
  examId: string;
  config: GradingConfig;
  priority?: 'high' | 'medium' | 'low';
  deadline?: string;
  assignedGraders?: string[];
}

interface GradingSession {
  id: string;
  examId: string;
  status: SessionStatus;
  config: GradingConfig;
  progress: SessionProgress;
  metrics: SessionMetrics;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

type SessionStatus = 
  | 'initializing'
  | 'ready' 
  | 'processing'
  | 'paused'
  | 'completed'
  | 'failed'
  | 'cancelled';
```

#### 3.1.2 阅卷任务管理

```typescript
/**
 * 阅卷任务管理接口
 * 负责具体阅卷任务的分配和执行
 */
interface GradingTaskAPI {
  /**
   * 获取任务列表
   * GET /api/v1/grading/sessions/{sessionId}/tasks
   */
  getTasks(sessionId: string, request: GetTasksRequest): Promise<StandardResponse<GradingTask[]>>;
  
  /**
   * 分配任务
   * POST /api/v1/grading/tasks/{taskId}/assign
   */
  assignTask(taskId: string, request: AssignTaskRequest): Promise<StandardResponse<void>>;
  
  /**
   * 完成任务
   * POST /api/v1/grading/tasks/{taskId}/complete
   */
  completeTask(taskId: string, result: TaskCompletionResult): Promise<StandardResponse<void>>;
  
  /**
   * 批量分配任务
   * POST /api/v1/grading/sessions/{sessionId}/tasks/batch-assign
   */
  batchAssignTasks(sessionId: string, request: BatchAssignRequest): Promise<StandardResponse<BatchResponse<AssignResult>>>;
}

interface GradingTask {
  id: string;
  sessionId: string;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  
  // 任务内容
  questionId: string;
  studentAnswer: StudentAnswer;
  scoringCriteria: ScoringCriteria;
  
  // 分配信息
  assignedTo?: string;
  assignedAt?: string;
  deadline?: string;
  
  // 执行结果
  result?: GradingResult;
  confidence?: number;
  reviewRequired: boolean;
  
  // 时间信息
  createdAt: string;
  updatedAt: string;
}

type TaskType = 'ai_grading' | 'human_grading' | 'review' | 'arbitration';
type TaskStatus = 'pending' | 'assigned' | 'in_progress' | 'completed' | 'disputed';
type TaskPriority = 'high' | 'medium' | 'low';
```

#### 3.1.3 质量控制接口

```typescript
/**
 * 质量控制接口
 * 负责阅卷质量的监控和保证
 */
interface QualityControlAPI {
  /**
   * 获取质量指标
   * GET /api/v1/grading/sessions/{sessionId}/quality/metrics
   */
  getQualityMetrics(sessionId: string): Promise<StandardResponse<QualityMetrics>>;
  
  /**
   * 执行质量检查
   * POST /api/v1/grading/sessions/{sessionId}/quality/check
   */
  performQualityCheck(sessionId: string, config: QualityCheckConfig): Promise<StandardResponse<QualityReport>>;
  
  /**
   * 获取异常报告
   * GET /api/v1/grading/sessions/{sessionId}/quality/anomalies
   */
  getAnomalies(sessionId: string): Promise<StandardResponse<QualityAnomaly[]>>;
  
  /**
   * 处理质量异常
   * POST /api/v1/grading/quality/anomalies/{anomalyId}/resolve
   */
  resolveAnomaly(anomalyId: string, resolution: AnomalyResolution): Promise<StandardResponse<void>>;
}

interface QualityMetrics {
  sessionId: string;
  
  // 一致性指标
  aiHumanConsistency: number;
  interRaterReliability: number;
  
  // 效率指标  
  averageGradingTime: number;
  throughput: number;
  
  // 质量指标
  accuracyRate: number;
  errorRate: number;
  disputeRate: number;
  
  // 覆盖率指标
  aiCoverageRate: number;
  humanReviewRate: number;
  
  updatedAt: string;
}
```

### 3.2 实时通信接口

#### 3.2.1 WebSocket连接规范

```typescript
/**
 * WebSocket通信接口
 * 支持实时状态更新和任务推送
 */
interface GradingWebSocketAPI {
  // 连接地址格式
  connectionUrl: '/ws/grading/{sessionId}?token={jwt_token}';
  
  // 消息格式
  messageFormat: {
    type: MessageType;
    data: any;
    timestamp: string;
    id: string;
  };
  
  // 支持的消息类型
  messageTypes: {
    // 服务端推送
    'progress.updated': ProgressUpdate;
    'task.assigned': TaskAssignment;
    'quality.alert': QualityAlert;
    'session.status_changed': StatusChange;
    
    // 客户端请求
    'subscribe.events': SubscriptionRequest;
    'unsubscribe.events': UnsubscriptionRequest;
    'heartbeat.ping': HeartbeatPing;
  };
}

interface ProgressUpdate {
  sessionId: string;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  completionRate: number;
  estimatedRemaining: number;
}

interface TaskAssignment {
  taskId: string;
  assigneeId: string;
  taskType: TaskType;
  priority: TaskPriority;
  deadline: string;
}
```

## 4. 外部模块对阅卷中心接口

### 4.1 考务管理模块接口

```typescript
/**
 * 考务管理模块向阅卷中心提供的接口
 * 用于获取考试配置和学生信息
 */
interface ExamManagementIntegration {
  /**
   * 获取考试配置
   * GET /api/v1/exams/{examId}/config
   */
  getExamConfig(examId: string): Promise<StandardResponse<ExamConfig>>;
  
  /**
   * 获取评分规则
   * GET /api/v1/exams/{examId}/scoring-rules
   */
  getScoringRules(examId: string): Promise<StandardResponse<ScoringRule[]>>;
  
  /**
   * 获取学生信息
   * GET /api/v1/exams/{examId}/students
   */
  getStudentInfo(examId: string, studentIds?: string[]): Promise<StandardResponse<StudentInfo[]>>;
  
  /**
   * 获取答题卡模板
   * GET /api/v1/exams/{examId}/template
   */
  getAnswerSheetTemplate(examId: string): Promise<StandardResponse<AnswerSheetTemplate>>;
}

interface ExamConfig {
  examId: string;
  name: string;
  subject: string;
  grade: string;
  
  // 考试结构
  totalQuestions: number;
  objectiveQuestions: number;
  subjectiveQuestions: number;
  totalScore: number;
  
  // 时间限制
  duration: number; // 分钟
  
  // 阅卷配置
  gradingConfig: {
    aiGradingEnabled: boolean;
    humanReviewThreshold: number;
    multipleGradersRequired: boolean;
  };
}
```

### 4.2 采集识别模块接口

```typescript
/**
 * 采集识别模块向阅卷中心提供的接口
 * 用于获取OCR/OMR识别结果
 */
interface CaptureOCRIntegration {
  /**
   * 获取识别结果
   * GET /api/v1/ocr/exams/{examId}/results
   */
  getRecognitionResults(examId: string, filters?: RecognitionFilter): Promise<StandardResponse<RecognitionResult[]>>;
  
  /**
   * 获取答题卡图像
   * GET /api/v1/capture/sheets/{sheetId}/images
   */
  getAnswerSheetImages(sheetId: string): Promise<StandardResponse<AnswerSheetImages>>;
  
  /**
   * 请求重新识别
   * POST /api/v1/ocr/sheets/{sheetId}/reprocess
   */
  requestReprocessing(sheetId: string, reason: string): Promise<StandardResponse<void>>;
  
  /**
   * 上传识别质量反馈
   * POST /api/v1/ocr/feedback
   */
  submitQualityFeedback(feedback: RecognitionFeedback): Promise<StandardResponse<void>>;
}

interface RecognitionResult {
  sheetId: string;
  studentId: string;
  examId: string;
  
  // 客观题结果
  objectiveAnswers: OMRResult[];
  
  // 主观题结果
  subjectiveAnswers: OCRResult[];
  
  // 质量信息
  qualityScore: number;
  confidence: number;
  issues: RecognitionIssue[];
  
  processedAt: string;
}
```

### 4.3 数据分析模块接口

```typescript
/**
 * 数据分析模块从阅卷中心接收数据的接口
 */
interface DataAnalyticsIntegration {
  /**
   * 接收阅卷结果
   * POST /api/v1/analytics/grading-results
   */
  receiveGradingResults(results: GradingResult[]): Promise<StandardResponse<void>>;
  
  /**
   * 接收质量指标
   * POST /api/v1/analytics/quality-metrics
   */
  receiveQualityMetrics(metrics: QualityMetrics): Promise<StandardResponse<void>>;
  
  /**
   * 接收实时进度
   * POST /api/v1/analytics/progress-updates
   */
  receiveProgressUpdates(updates: ProgressUpdate[]): Promise<StandardResponse<void>>;
}
```

### 4.4 工作台模块接口

```typescript
/**
 * 工作台模块从阅卷中心接收通知的接口
 */
interface WorkbenchIntegration {
  /**
   * 推送任务通知
   * POST /api/v1/workbench/notifications
   */
  pushTaskNotification(notification: TaskNotification): Promise<StandardResponse<void>>;
  
  /**
   * 更新任务统计
   * PUT /api/v1/workbench/users/{userId}/task-stats
   */
  updateTaskStats(userId: string, stats: TaskStats): Promise<StandardResponse<void>>;
  
  /**
   * 推送系统警报
   * POST /api/v1/workbench/alerts
   */
  pushSystemAlert(alert: SystemAlert): Promise<StandardResponse<void>>;
}
```

## 5. GraphQL接口规范

### 5.1 Schema定义

```graphql
type Query {
  # 阅卷会话查询
  gradingSession(id: ID!): GradingSession
  gradingSessions(filter: SessionFilter, pagination: PaginationInput): SessionConnection
  
  # 任务查询
  gradingTask(id: ID!): GradingTask
  gradingTasks(sessionId: ID!, filter: TaskFilter, pagination: PaginationInput): TaskConnection
  
  # 质量指标查询
  qualityMetrics(sessionId: ID!): QualityMetrics
  qualityAnomalies(sessionId: ID!): [QualityAnomaly!]!
}

type Mutation {
  # 会话管理
  createGradingSession(input: CreateGradingSessionInput!): GradingSession!
  updateGradingSession(id: ID!, input: UpdateGradingSessionInput!): GradingSession!
  
  # 任务管理
  assignGradingTask(taskId: ID!, assigneeId: ID!): GradingTask!
  completeGradingTask(taskId: ID!, result: TaskResultInput!): GradingTask!
  
  # 质量控制
  performQualityCheck(sessionId: ID!, config: QualityCheckInput!): QualityReport!
  resolveAnomaly(anomalyId: ID!, resolution: AnomalyResolutionInput!): QualityAnomaly!
}

type Subscription {
  # 实时更新
  gradingProgressUpdated(sessionId: ID!): ProgressUpdate!
  taskAssigned(userId: ID!): TaskAssignment!
  qualityAlertRaised(sessionId: ID!): QualityAlert!
}
```

### 5.2 类型定义

```graphql
type GradingSession {
  id: ID!
  examId: ID!
  status: SessionStatus!
  progress: SessionProgress!
  config: GradingConfig!
  tasks(filter: TaskFilter, pagination: PaginationInput): TaskConnection!
  qualityMetrics: QualityMetrics
  createdAt: DateTime!
  updatedAt: DateTime!
}

type GradingTask {
  id: ID!
  sessionId: ID!
  type: TaskType!
  status: TaskStatus!
  priority: TaskPriority!
  studentAnswer: StudentAnswer!
  assignedTo: User
  result: GradingResult
  createdAt: DateTime!
  deadline: DateTime
}

type QualityMetrics {
  sessionId: ID!
  aiHumanConsistency: Float!
  accuracyRate: Float!
  throughput: Float!
  anomalyCount: Int!
  updatedAt: DateTime!
}
```

## 6. 事件驱动接口

### 6.1 事件定义

```typescript
/**
 * 事件总线消息格式
 * 用于模块间异步通信
 */
interface EventMessage {
  // 基础信息
  eventId: string;
  eventType: EventType;
  version: string;
  
  // 来源信息
  source: {
    service: string;
    module: string;
    userId?: string;
  };
  
  // 业务数据
  data: any;
  
  // 元数据
  metadata: {
    correlationId?: string;
    causationId?: string;
    timestamp: string;
    retryCount?: number;
  };
}

// 阅卷中心发出的事件
enum GradingEventType {
  // 会话事件
  SESSION_CREATED = 'grading.session.created',
  SESSION_STARTED = 'grading.session.started', 
  SESSION_COMPLETED = 'grading.session.completed',
  SESSION_FAILED = 'grading.session.failed',
  
  // 任务事件
  TASK_ASSIGNED = 'grading.task.assigned',
  TASK_COMPLETED = 'grading.task.completed',
  TASK_DISPUTED = 'grading.task.disputed',
  
  // 质量事件
  QUALITY_ALERT_RAISED = 'grading.quality.alert_raised',
  ANOMALY_DETECTED = 'grading.quality.anomaly_detected',
  
  // 进度事件
  PROGRESS_UPDATED = 'grading.progress.updated',
  MILESTONE_REACHED = 'grading.progress.milestone_reached'
}
```

### 6.2 事件处理器接口

```typescript
/**
 * 事件处理器接口
 * 各模块实现此接口处理相关事件
 */
interface EventHandler {
  // 支持的事件类型
  supportedEventTypes: EventType[];
  
  // 处理事件
  handleEvent(event: EventMessage): Promise<EventHandleResult>;
  
  // 错误处理
  handleError(event: EventMessage, error: Error): Promise<void>;
}

interface EventHandleResult {
  success: boolean;
  shouldRetry?: boolean;
  nextRetryDelay?: number;
  resultEvents?: EventMessage[];
}

// 示例：数据分析模块的事件处理器
class DataAnalyticsEventHandler implements EventHandler {
  supportedEventTypes = [
    GradingEventType.SESSION_COMPLETED,
    GradingEventType.PROGRESS_UPDATED,
    GradingEventType.QUALITY_ALERT_RAISED
  ];
  
  async handleEvent(event: EventMessage): Promise<EventHandleResult> {
    switch (event.eventType) {
      case GradingEventType.SESSION_COMPLETED:
        await this.generateAnalysisReport(event.data);
        break;
      case GradingEventType.PROGRESS_UPDATED:
        await this.updateProgressDashboard(event.data);
        break;
      case GradingEventType.QUALITY_ALERT_RAISED:
        await this.recordQualityIssue(event.data);
        break;
    }
    return { success: true };
  }
}
```

## 7. 接口安全规范

### 7.1 认证授权

```typescript
/**
 * JWT Token格式
 */
interface JWTPayload {
  // 标准声明
  iss: string; // 发行者
  sub: string; // 用户ID
  aud: string; // 目标受众
  exp: number; // 过期时间
  iat: number; // 发行时间
  jti: string; // JWT ID
  
  // 自定义声明
  roles: string[]; // 用户角色
  permissions: string[]; // 权限列表
  examIds?: string[]; // 可访问的考试ID
  sessionContext?: {
    sessionId: string;
    sessionRole: 'grader' | 'reviewer' | 'administrator';
  };
}

/**
 * API权限定义
 */
const APIPermissions = {
  // 会话管理权限
  'grading.session.create': ['admin', 'exam_manager'],
  'grading.session.read': ['admin', 'exam_manager', 'grader'],
  'grading.session.update': ['admin', 'exam_manager'],
  'grading.session.delete': ['admin'],
  
  // 任务管理权限
  'grading.task.assign': ['admin', 'exam_manager'],
  'grading.task.complete': ['admin', 'grader'],
  'grading.task.review': ['admin', 'reviewer'],
  
  // 质量控制权限
  'grading.quality.view': ['admin', 'exam_manager', 'reviewer'],
  'grading.quality.control': ['admin', 'reviewer']
};
```

### 7.2 数据加密

```typescript
/**
 * 数据传输加密规范
 */
interface EncryptionConfig {
  // 传输层加密
  transport: {
    protocol: 'HTTPS';
    tlsVersion: 'TLS 1.3';
    cipherSuites: string[];
  };
  
  // 应用层加密
  application: {
    sensitiveFields: string[]; // 需要加密的字段
    algorithm: 'AES-256-GCM';
    keyRotation: {
      interval: '30 days';
      automatic: true;
    };
  };
  
  // 数据库加密
  storage: {
    encryptionAtRest: true;
    keyManagement: 'AWS KMS' | 'Azure Key Vault' | 'HashiCorp Vault';
  };
}

// 敏感数据字段
const SensitiveFields = [
  'studentAnswer.content', // 学生答案内容
  'gradingResult.feedback', // 评分反馈
  'personalIdentifiers.*' // 个人标识信息
];
```

## 8. 接口监控规范

### 8.1 性能监控

```typescript
/**
 * API性能指标
 */
interface APIMetrics {
  // 基础指标
  requestCount: number;
  responseTime: {
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  errorRate: number;
  
  // 业务指标
  businessMetrics: {
    gradingThroughput: number; // 阅卷吞吐量
    qualityScore: number; // 质量分数
    userSatisfaction: number; // 用户满意度
  };
  
  // 系统指标
  systemMetrics: {
    cpuUsage: number;
    memoryUsage: number;
    diskIO: number;
    networkIO: number;
  };
}

/**
 * 监控规则配置
 */
interface MonitoringRules {
  // 性能告警
  performance: {
    responseTimeThreshold: 5000; // 5秒
    errorRateThreshold: 0.01; // 1%
    throughputThreshold: 100; // 每分钟最低处理量
  };
  
  // 业务告警
  business: {
    qualityScoreThreshold: 0.95; // 95%
    disputeRateThreshold: 0.05; // 5%
  };
  
  // 系统告警
  system: {
    cpuThreshold: 0.8; // 80%
    memoryThreshold: 0.9; // 90%
    diskThreshold: 0.8; // 80%
  };
}
```

### 8.2 日志规范

```typescript
/**
 * 结构化日志格式
 */
interface StructuredLog {
  // 基础信息
  timestamp: string;
  level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';
  message: string;
  
  // 上下文信息
  context: {
    requestId: string;
    sessionId?: string;
    userId?: string;
    examId?: string;
  };
  
  // 技术信息
  technical: {
    service: string;
    module: string;
    function: string;
    file: string;
    line: number;
  };
  
  // 性能信息
  performance?: {
    duration: number;
    memoryUsage: number;
    queries?: QueryInfo[];
  };
  
  // 错误信息
  error?: {
    type: string;
    message: string;
    stack: string;
    code?: string;
  };
  
  // 业务信息
  business?: {
    action: string;
    entity: string;
    entityId: string;
    result: 'success' | 'failure';
  };
}
```

## 9. 接口文档规范

### 9.1 OpenAPI文档结构

```yaml
openapi: 3.0.3
info:
  title: 智阅阅卷系统API
  description: 智阅阅卷系统模块间接口文档
  version: 1.0.0
  contact:
    name: API Support
    email: api-support@zhiyue.ai
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT

servers:
  - url: https://api.zhiyue.ai/v1
    description: 生产环境
  - url: https://staging-api.zhiyue.ai/v1
    description: 测试环境

security:
  - BearerAuth: []

paths:
  /grading/sessions:
    post:
      summary: 创建阅卷会话
      operationId: createGradingSession
      tags:
        - Grading Sessions
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/CreateGradingSessionRequest'
      responses:
        '201':
          description: 会话创建成功
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/StandardResponse'
```

### 9.2 代码示例规范

```typescript
/**
 * 接口使用示例
 */

// 1. 基础调用示例
const gradingAPI = new GradingCenterAPI({
  baseURL: 'https://api.zhiyue.ai/v1',
  timeout: 30000,
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

// 2. 创建阅卷会话
try {
  const session = await gradingAPI.createSession({
    examId: 'exam-123',
    config: {
      aiGradingEnabled: true,
      qualityThreshold: 0.95,
      maxConcurrency: 10
    }
  });
  
  console.log(`会话创建成功: ${session.data.id}`);
} catch (error) {
  console.error('创建会话失败:', error.message);
}

// 3. 监听实时事件
const ws = new WebSocket(`wss://api.zhiyue.ai/ws/grading/${sessionId}`);
ws.on('message', (data) => {
  const message = JSON.parse(data);
  switch (message.type) {
    case 'progress.updated':
      updateProgressBar(message.data.completionRate);
      break;
    case 'task.assigned':
      showTaskNotification(message.data);
      break;
  }
});

// 4. 错误处理示例
gradingAPI.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // 处理认证失效
      redirectToLogin();
    } else if (error.response?.status === 429) {
      // 处理限流
      showRateLimitMessage();
    }
    return Promise.reject(error);
  }
);
```

## 10. 接口测试规范

### 10.1 单元测试

```typescript
/**
 * 接口单元测试示例
 */
describe('GradingSessionAPI', () => {
  let api: GradingSessionAPI;
  let mockServer: MockServer;
  
  beforeEach(() => {
    mockServer = new MockServer();
    api = new GradingSessionAPI(mockServer.url);
  });
  
  describe('createSession', () => {
    it('should create session successfully', async () => {
      // Arrange
      const request: CreateGradingSessionRequest = {
        examId: 'exam-123',
        config: { aiGradingEnabled: true }
      };
      
      mockServer.expectPost('/grading/sessions')
        .withBody(request)
        .respondWith(201, { 
          success: true, 
          data: { id: 'session-456' } 
        });
      
      // Act
      const response = await api.createSession(request);
      
      // Assert
      expect(response.success).toBe(true);
      expect(response.data.id).toBe('session-456');
    });
    
    it('should handle validation errors', async () => {
      // Arrange
      const invalidRequest = { examId: '' };
      
      mockServer.expectPost('/grading/sessions')
        .withBody(invalidRequest)
        .respondWith(400, {
          success: false,
          error: {
            type: 'ValidationError',
            field: 'examId',
            message: 'examId cannot be empty'
          }
        });
      
      // Act & Assert
      await expect(api.createSession(invalidRequest))
        .rejects.toThrow('examId cannot be empty');
    });
  });
});
```

### 10.2 集成测试

```typescript
/**
 * 端到端集成测试
 */
describe('Grading Workflow Integration', () => {
  let examId: string;
  let sessionId: string;
  
  beforeAll(async () => {
    // 创建测试考试
    const exam = await examAPI.createExam({
      name: 'Integration Test Exam',
      subject: 'Mathematics'
    });
    examId = exam.data.id;
  });
  
  it('should complete full grading workflow', async () => {
    // 1. 创建阅卷会话
    const sessionResponse = await gradingAPI.createSession({
      examId,
      config: { aiGradingEnabled: true }
    });
    sessionId = sessionResponse.data.id;
    expect(sessionResponse.success).toBe(true);
    
    // 2. 上传答题卡
    const uploadResponse = await uploadAnswerSheets(examId, testSheets);
    expect(uploadResponse.success).toBe(true);
    
    // 3. 等待处理完成
    const finalStatus = await waitForProcessingComplete(sessionId);
    expect(finalStatus).toBe('completed');
    
    // 4. 验证结果
    const results = await gradingAPI.getResults(sessionId);
    expect(results.data).toHaveLength(testSheets.length);
    expect(results.data.every(r => r.score >= 0)).toBe(true);
  });
});
```

## 11. 总结

### 11.1 接口规范核心价值
1. **统一标准**: 所有模块遵循相同的接口设计原则
2. **向后兼容**: 版本化管理确保系统升级平滑
3. **安全可靠**: 完整的安全策略和错误处理机制
4. **可观测性**: 全面的监控和日志记录
5. **开发友好**: 详细的文档和示例代码

### 11.2 实施建议
1. **分阶段实施**: 优先实现核心业务接口，再完善监控和安全
2. **自动化生成**: 使用OpenAPI规范自动生成客户端代码和文档
3. **持续测试**: 建立完整的接口测试体系，确保质量
4. **版本管理**: 制定清晰的版本升级策略和兼容性规则

通过这套完整的接口规范，智阅阅卷系统的各个模块将能够高效、安全、稳定地协同工作，为用户提供优质的阅卷服务体验。