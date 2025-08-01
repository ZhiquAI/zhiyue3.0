import { StandardizedAnswerSheet, BatchProcessingResult, ProcessingIssue } from '../types/preGrading';
import { message } from '../utils/message';

// 批处理任务类型
export type BatchTaskType = 
  | 'upload'
  | 'quality_analysis' 
  | 'identity_recognition'
  | 'structure_analysis'
  | 'validation'
  | 'enhancement';

// 批处理任务状态
export type BatchTaskStatus = 
  | 'pending'
  | 'running' 
  | 'completed'
  | 'failed'
  | 'cancelled'
  | 'paused';

// 批处理任务接口
export interface BatchTask {
  id: string;
  type: BatchTaskType;
  status: BatchTaskStatus;
  priority: number;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  data: {
    examId: string;
    sheetIds?: string[];
    files?: File[];
    options?: Record<string, unknown>;
  };
  progress: {
    total: number;
    completed: number;
    failed: number;
    current?: string;
  };
  result?: BatchProcessingResult;
  error?: string;
  retryCount: number;
  maxRetries: number;
}

// 批处理配置
export interface BatchProcessingConfig {
  maxConcurrentTasks: number;
  maxConcurrentItemsPerTask: number;
  retryAttempts: number;
  retryDelay: number;
  timeout: number;
  enablePriority: boolean;
  enableProgressTracking: boolean;
}

// 批处理统计
export interface BatchProcessingStats {
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  runningTasks: number;
  pendingTasks: number;
  avgProcessingTime: number;
  throughput: number; // 每分钟处理的任务数
  errorRate: number;
  queueLength: number;
}

// 批处理事件
export type BatchProcessingEvent = 
  | { type: 'TASK_CREATED'; payload: { task: BatchTask } }
  | { type: 'TASK_STARTED'; payload: { taskId: string } }
  | { type: 'TASK_PROGRESS'; payload: { taskId: string; progress: BatchTask['progress'] } }
  | { type: 'TASK_COMPLETED'; payload: { taskId: string; result: BatchProcessingResult } }
  | { type: 'TASK_FAILED'; payload: { taskId: string; error: string } }
  | { type: 'QUEUE_UPDATED'; payload: { stats: BatchProcessingStats } };

// 任务处理器类型
type TaskProcessor = (task: BatchTask, onProgress?: (progress: BatchTask['progress']) => void) => Promise<BatchProcessingResult>;

class BatchProcessingService {
  private config: BatchProcessingConfig;
  private tasks: Map<string, BatchTask> = new Map();
  private runningTasks: Set<string> = new Set();
  private taskQueue: string[] = [];
  private processors: Map<BatchTaskType, TaskProcessor> = new Map();
  private eventListeners: ((event: BatchProcessingEvent) => void)[] = [];
  private isProcessing = false;
  private processInterval?: NodeJS.Timeout;

  constructor(config: Partial<BatchProcessingConfig> = {}) {
    this.config = {
      maxConcurrentTasks: 3,
      maxConcurrentItemsPerTask: 5,
      retryAttempts: 3,
      retryDelay: 5000,
      timeout: 300000, // 5分钟
      enablePriority: true,
      enableProgressTracking: true,
      ...config
    };

    this.initializeProcessors();
    this.startProcessing();
  }

  // 初始化任务处理器
  private initializeProcessors() {
    // 上传处理器
    this.processors.set('upload', async (task, onProgress) => {
      const { files, examId, options } = task.data;
      if (!files || !examId) {
        throw new Error('Missing required data for upload task');
      }

      const batchId = `batch_${Date.now()}`;
      const results: StandardizedAnswerSheet[] = [];
      let processed = 0;

      for (const file of files) {
        try {
          // 模拟文件上传和处理
          await this.simulateFileProcessing(file, examId, options);
          
          // 创建标准化答题卡数据
          const sheet: StandardizedAnswerSheet = {
            id: `sheet_${Date.now()}_${Math.random()}`,
            examId,
            uploadTime: new Date().toISOString(),
            processingTime: Math.random() * 3000 + 1000,
            studentIdentity: {
              studentId: `202400${Math.floor(Math.random() * 100) + 1}`,
              name: `学生${Math.floor(Math.random() * 100) + 1}`,
              class: `八年级${Math.floor(Math.random() * 5) + 1}班`,
              verificationStatus: Math.random() > 0.2 ? 'verified' : 'pending',
              confidence: Math.random() * 0.3 + 0.7,
              verificationMethods: [{
                method: 'barcode',
                confidence: Math.random() * 0.3 + 0.7,
                extractedData: {},
                processingTime: 100
              }]
            },
            imageData: {
              originalPath: `/uploads/${file.name}`,
              previewUrl: URL.createObjectURL(file),
              fileSize: file.size,
              dimensions: { width: 2480, height: 3508 },
              qualityMetrics: {
                clarity: Math.random() * 20 + 80,
                brightness: Math.random() * 20 + 70,
                contrast: Math.random() * 20 + 75,
                skew: Math.random() * 5,
                noise: Math.random() * 30 + 10,
                overall_score: Math.random() * 0.3 + 0.7,
                issues: Math.random() > 0.7 ? ['图片略微模糊'] : []
              }
            },
            questionStructure: {
              totalQuestions: 25,
              objectiveQuestions: [],
              subjectiveRegions: [],
              detectionConfidence: Math.random() * 0.2 + 0.8
            },
            processingStatus: {
              stage: 'uploaded',
              progress: 100,
              lastProcessed: new Date().toISOString(),
              issues: [],
              retryCount: 0
            },
            metadata: {
              originalFilename: file.name,
              uploadedBy: 'current_user',
              processingVersion: '1.0.0',
              batchId
            }
          };

          results.push(sheet);
          processed++;

          // 更新进度
          onProgress?.({
            total: files.length,
            completed: processed,
            failed: 0,
            current: file.name
          });

        } catch (error) {
          console.error(`Failed to process file ${file.name}:`, error);
          onProgress?.({
            total: files.length,
            completed: processed,
            failed: task.progress.failed + 1,
            current: file.name
          });
        }
      }

      return {
        batchId,
        totalFiles: files.length,
        processedFiles: results.length,
        successCount: results.length,
        failureCount: files.length - results.length,
        warningCount: results.filter(r => r.imageData.qualityMetrics.issues.length > 0).length,
        processingTime: files.length * 1500,
        results,
        summary: {
          qualityDistribution: {
            excellent: results.filter(r => r.imageData.qualityMetrics.overall_score > 0.9).length,
            good: results.filter(r => r.imageData.qualityMetrics.overall_score > 0.7).length,
            fair: results.filter(r => r.imageData.qualityMetrics.overall_score > 0.5).length,
            poor: results.filter(r => r.imageData.qualityMetrics.overall_score <= 0.5).length
          },
          identityVerificationStats: {
            verified: results.filter(r => r.studentIdentity.verificationStatus === 'verified').length,
            pending: results.filter(r => r.studentIdentity.verificationStatus === 'pending').length,
            failed: results.filter(r => r.studentIdentity.verificationStatus === 'failed').length
          },
          commonIssues: [
            { issue: '图片略微模糊', count: 2, percentage: 8.3 }
          ]
        }
      };
    });

    // 质量分析处理器
    this.processors.set('quality_analysis', async (task, onProgress) => {
      const { sheetIds } = task.data;
      if (!sheetIds) {
        throw new Error('Missing sheet IDs for quality analysis');
      }

      const results: StandardizedAnswerSheet[] = [];
      let processed = 0;

      for (const sheetId of sheetIds) {
        try {
          // 模拟质量分析
          await this.simulateQualityAnalysis(sheetId);
          processed++;

          onProgress?.({
            total: sheetIds.length,
            completed: processed,
            failed: 0,
            current: sheetId
          });

        } catch (error) {
          console.error(`Failed to analyze quality for sheet ${sheetId}:`, error);
          onProgress?.({
            total: sheetIds.length,
            completed: processed,
            failed: task.progress.failed + 1,
            current: sheetId
          });
        }
      }

      return {
        batchId: `quality_batch_${Date.now()}`,
        totalFiles: sheetIds.length,
        processedFiles: processed,
        successCount: processed,
        failureCount: sheetIds.length - processed,
        warningCount: 0,
        processingTime: sheetIds.length * 2000,
        results,
        summary: {
          qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
          identityVerificationStats: { verified: 0, pending: 0, failed: 0 },
          commonIssues: []
        }
      };
    });

    // 身份识别处理器
    this.processors.set('identity_recognition', async (task, onProgress) => {
      const { sheetIds } = task.data;
      if (!sheetIds) {
        throw new Error('Missing sheet IDs for identity recognition');
      }

      let processed = 0;

      for (const sheetId of sheetIds) {
        try {
          // 模拟身份识别
          await this.simulateIdentityRecognition(sheetId);
          processed++;

          onProgress?.({
            total: sheetIds.length,
            completed: processed,
            failed: 0,
            current: sheetId
          });

        } catch (error) {
          console.error(`Failed to recognize identity for sheet ${sheetId}:`, error);
          onProgress?.({
            total: sheetIds.length,
            completed: processed,
            failed: task.progress.failed + 1,
            current: sheetId
          });
        }
      }

      return {
        batchId: `identity_batch_${Date.now()}`,
        totalFiles: sheetIds.length,
        processedFiles: processed,
        successCount: processed,
        failureCount: sheetIds.length - processed,
        warningCount: 0,
        processingTime: sheetIds.length * 3000,
        results: [],
        summary: {
          qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
          identityVerificationStats: { verified: processed, pending: 0, failed: 0 },
          commonIssues: []
        }
      };
    });

    // 结构分析处理器
    this.processors.set('structure_analysis', async (task, onProgress) => {
      const { sheetIds } = task.data;
      if (!sheetIds) {
        throw new Error('Missing sheet IDs for structure analysis');
      }

      let processed = 0;

      for (const sheetId of sheetIds) {
        try {
          // 模拟结构分析
          await this.simulateStructureAnalysis(sheetId);
          processed++;

          onProgress?.({
            total: sheetIds.length,
            completed: processed,
            failed: 0,
            current: sheetId
          });

        } catch (error) {
          console.error(`Failed to analyze structure for sheet ${sheetId}:`, error);
          onProgress?.({
            total: sheetIds.length,
            completed: processed,
            failed: task.progress.failed + 1,
            current: sheetId
          });
        }
      }

      return {
        batchId: `structure_batch_${Date.now()}`,
        totalFiles: sheetIds.length,
        processedFiles: processed,
        successCount: processed,
        failureCount: sheetIds.length - processed,
        warningCount: 0,
        processingTime: sheetIds.length * 4000,
        results: [],
        summary: {
          qualityDistribution: { excellent: 0, good: 0, fair: 0, poor: 0 },
          identityVerificationStats: { verified: 0, pending: 0, failed: 0 },
          commonIssues: []
        }
      };
    });
  }

  // 模拟文件处理
  private async simulateFileProcessing(file: File, examId: string, options?: Record<string, unknown>): Promise<void> {
    const processingTime = Math.random() * 2000 + 1000;
    await new Promise(resolve => setTimeout(resolve, processingTime));
    
    // 随机失败概率
    if (Math.random() < 0.05) {
      throw new Error(`Failed to process file: ${file.name}`);
    }
  }

  // 模拟质量分析
  private async simulateQualityAnalysis(sheetId: string): Promise<void> {
    const processingTime = Math.random() * 1500 + 500;
    await new Promise(resolve => setTimeout(resolve, processingTime));
  }

  // 模拟身份识别
  private async simulateIdentityRecognition(sheetId: string): Promise<void> {
    const processingTime = Math.random() * 2500 + 1000;
    await new Promise(resolve => setTimeout(resolve, processingTime));
  }

  // 模拟结构分析
  private async simulateStructureAnalysis(sheetId: string): Promise<void> {
    const processingTime = Math.random() * 3500 + 1500;
    await new Promise(resolve => setTimeout(resolve, processingTime));
  }

  // 创建批处理任务
  public createTask(
    type: BatchTaskType,
    data: BatchTask['data'],
    options: {
      priority?: number;
      maxRetries?: number;
    } = {}
  ): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2)}`;
    
    const task: BatchTask = {
      id: taskId,
      type,
      status: 'pending',
      priority: options.priority || 0,
      createdAt: new Date().toISOString(),
      data,
      progress: {
        total: data.files?.length || data.sheetIds?.length || 0,
        completed: 0,
        failed: 0
      },
      retryCount: 0,
      maxRetries: options.maxRetries || this.config.retryAttempts
    };

    this.tasks.set(taskId, task);
    this.taskQueue.push(taskId);

    // 按优先级排序
    if (this.config.enablePriority) {
      this.taskQueue.sort((a, b) => {
        const taskA = this.tasks.get(a)!;
        const taskB = this.tasks.get(b)!;
        return taskB.priority - taskA.priority;
      });
    }

    this.emitEvent({ type: 'TASK_CREATED', payload: { task } });
    this.emitEvent({ type: 'QUEUE_UPDATED', payload: { stats: this.getStats() } });

    return taskId;
  }

  // 开始处理队列
  private startProcessing() {
    if (this.isProcessing) return;
    
    this.isProcessing = true;
    this.processInterval = setInterval(() => {
      this.processQueue();
    }, 1000);
  }

  // 处理队列
  private async processQueue() {
    if (this.runningTasks.size >= this.config.maxConcurrentTasks) {
      return;
    }

    const availableSlots = this.config.maxConcurrentTasks - this.runningTasks.size;
    const tasksToProcess = this.taskQueue.splice(0, availableSlots);

    for (const taskId of tasksToProcess) {
      this.processTask(taskId);
    }
  }

  // 处理单个任务
  private async processTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'pending') {
      return;
    }

    this.runningTasks.add(taskId);
    task.status = 'running';
    task.startedAt = new Date().toISOString();

    this.emitEvent({ type: 'TASK_STARTED', payload: { taskId } });

    const processor = this.processors.get(task.type);
    if (!processor) {
      this.failTask(taskId, `No processor found for task type: ${task.type}`);
      return;
    }

    try {
      // 设置超时
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error('Task timeout')), this.config.timeout);
      });

      // 执行任务
      const taskPromise = processor(task, (progress) => {
        task.progress = progress;
        this.emitEvent({ type: 'TASK_PROGRESS', payload: { taskId, progress } });
      });

      const result = await Promise.race([taskPromise, timeoutPromise]);
      
      this.completeTask(taskId, result);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      if (task.retryCount < task.maxRetries) {
        this.retryTask(taskId, errorMessage);
      } else {
        this.failTask(taskId, errorMessage);
      }
    }
  }

  // 完成任务
  private completeTask(taskId: string, result: BatchProcessingResult) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'completed';
    task.completedAt = new Date().toISOString();
    task.result = result;

    this.runningTasks.delete(taskId);

    this.emitEvent({ type: 'TASK_COMPLETED', payload: { taskId, result } });
    this.emitEvent({ type: 'QUEUE_UPDATED', payload: { stats: this.getStats() } });
  }

  // 失败任务
  private failTask(taskId: string, error: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.status = 'failed';
    task.completedAt = new Date().toISOString();
    task.error = error;

    this.runningTasks.delete(taskId);

    this.emitEvent({ type: 'TASK_FAILED', payload: { taskId, error } });
    this.emitEvent({ type: 'QUEUE_UPDATED', payload: { stats: this.getStats() } });
  }

  // 重试任务
  private retryTask(taskId: string, error: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.retryCount++;
    task.status = 'pending';
    task.error = error;

    this.runningTasks.delete(taskId);

    // 延迟重试
    setTimeout(() => {
      this.taskQueue.unshift(taskId); // 优先重试
    }, this.config.retryDelay);
  }

  // 取消任务
  public cancelTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status === 'completed') {
      return false;
    }

    task.status = 'cancelled';
    task.completedAt = new Date().toISOString();

    this.runningTasks.delete(taskId);
    
    // 从队列中移除
    const queueIndex = this.taskQueue.indexOf(taskId);
    if (queueIndex > -1) {
      this.taskQueue.splice(queueIndex, 1);
    }

    this.emitEvent({ type: 'QUEUE_UPDATED', payload: { stats: this.getStats() } });

    return true;
  }

  // 暂停任务
  public pauseTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'running') {
      return false;
    }

    task.status = 'paused';
    this.runningTasks.delete(taskId);

    return true;
  }

  // 恢复任务
  public resumeTask(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || task.status !== 'paused') {
      return false;
    }

    task.status = 'pending';
    this.taskQueue.unshift(taskId); // 优先处理

    return true;
  }

  // 获取任务信息
  public getTask(taskId: string): BatchTask | undefined {
    return this.tasks.get(taskId);
  }

  // 获取所有任务
  public getAllTasks(): BatchTask[] {
    return Array.from(this.tasks.values());
  }

  // 获取统计信息
  public getStats(): BatchProcessingStats {
    const tasks = Array.from(this.tasks.values());
    const completedTasks = tasks.filter(t => t.status === 'completed');
    const failedTasks = tasks.filter(t => t.status === 'failed');
    const runningTasks = tasks.filter(t => t.status === 'running');
    const pendingTasks = tasks.filter(t => t.status === 'pending');

    const avgProcessingTime = completedTasks.length > 0
      ? completedTasks.reduce((sum, task) => {
          if (task.startedAt && task.completedAt) {
            return sum + (new Date(task.completedAt).getTime() - new Date(task.startedAt).getTime());
          }
          return sum;
        }, 0) / completedTasks.length
      : 0;

    return {
      totalTasks: tasks.length,
      completedTasks: completedTasks.length,
      failedTasks: failedTasks.length,
      runningTasks: runningTasks.length,
      pendingTasks: pendingTasks.length,
      avgProcessingTime: Math.round(avgProcessingTime),
      throughput: 0, // TODO: 计算实际吞吐量
      errorRate: tasks.length > 0 ? failedTasks.length / tasks.length : 0,
      queueLength: this.taskQueue.length
    };
  }

  // 添加事件监听器
  public addEventListener(listener: (event: BatchProcessingEvent) => void) {
    this.eventListeners.push(listener);
  }

  // 移除事件监听器
  public removeEventListener(listener: (event: BatchProcessingEvent) => void) {
    const index = this.eventListeners.indexOf(listener);
    if (index > -1) {
      this.eventListeners.splice(index, 1);
    }
  }

  // 发送事件
  private emitEvent(event: BatchProcessingEvent) {
    this.eventListeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in batch processing event listener:', error);
      }
    });
  }

  // 停止处理服务
  public stop() {
    this.isProcessing = false;
    if (this.processInterval) {
      clearInterval(this.processInterval);
      this.processInterval = undefined;
    }
  }

  // 清理已完成的任务
  public cleanupCompletedTasks(olderThan?: Date) {
    const cutoffTime = olderThan || new Date(Date.now() - 24 * 60 * 60 * 1000); // 默认24小时前
    
    for (const [taskId, task] of this.tasks.entries()) {
      if (task.status === 'completed' || task.status === 'failed') {
        const taskTime = new Date(task.completedAt || task.createdAt);
        if (taskTime < cutoffTime) {
          this.tasks.delete(taskId);
        }
      }
    }
  }
}

// 创建单例实例
export const batchProcessingService = new BatchProcessingService();

export default batchProcessingService; 