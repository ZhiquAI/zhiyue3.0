/**
 * 阅卷工作流状态管理
 * 基于状态机模式实现工作流程控制
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// 阅卷工作流状态枚举
export enum GradingWorkflowState {
  IDLE = 'idle',
  INITIALIZING = 'initializing', 
  PAPER_UPLOAD = 'paper_upload',
  OCR_PROCESSING = 'ocr_processing',
  QUALITY_CHECK = 'quality_check',
  TASK_ASSIGNMENT = 'task_assignment',
  GRADING_IN_PROGRESS = 'grading_in_progress',
  QUALITY_REVIEW = 'quality_review',
  DISPUTE_RESOLUTION = 'dispute_resolution',
  COMPLETED = 'completed',
  ERROR = 'error'
}

// 工作流事件枚举
export enum GradingWorkflowEvent {
  START_WORKFLOW = 'start_workflow',
  PAPERS_UPLOADED = 'papers_uploaded',
  OCR_COMPLETED = 'ocr_completed',
  QUALITY_PASSED = 'quality_passed',
  QUALITY_FAILED = 'quality_failed',
  TASKS_ASSIGNED = 'tasks_assigned',
  GRADING_STARTED = 'grading_started',
  GRADING_COMPLETED = 'grading_completed',
  REVIEW_COMPLETED = 'review_completed',
  DISPUTE_RAISED = 'dispute_raised',
  DISPUTE_RESOLVED = 'dispute_resolved',
  WORKFLOW_COMPLETED = 'workflow_completed',
  ERROR_OCCURRED = 'error_occurred',
  RESET_WORKFLOW = 'reset_workflow'
}

// 阅卷任务接口
export interface GradingTask {
  id: string;
  examId: string;
  paperId: string;
  questionId: string;
  assignedTo?: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'reviewed' | 'disputed';
  aiScore?: number;
  humanScore?: number;
  finalScore?: number;
  confidence: number;
  createdAt: string;
  completedAt?: string;
  reviewNotes?: string;
}

// 阅卷员信息
export interface Grader {
  id: string;
  name: string;
  email: string;
  expertise: string[];
  maxCapacity: number;
  currentLoad: number;
  averageGradingTime: number;
  accuracyScore: number;
  isActive: boolean;
}

// 工作流统计信息
export interface WorkflowStatistics {
  totalTasks: number;
  completedTasks: number;
  pendingTasks: number;
  averageGradingTime: number;
  accuracyRate: number;
  throughput: number;
  qualityScore: number;
}

// 状态机转换规则
const STATE_TRANSITIONS: Record<GradingWorkflowState, Partial<Record<GradingWorkflowEvent, GradingWorkflowState>>> = {
  [GradingWorkflowState.IDLE]: {
    [GradingWorkflowEvent.START_WORKFLOW]: GradingWorkflowState.INITIALIZING
  },
  [GradingWorkflowState.INITIALIZING]: {
    [GradingWorkflowEvent.PAPERS_UPLOADED]: GradingWorkflowState.OCR_PROCESSING,
    [GradingWorkflowEvent.ERROR_OCCURRED]: GradingWorkflowState.ERROR
  },
  [GradingWorkflowState.PAPER_UPLOAD]: {
    [GradingWorkflowEvent.PAPERS_UPLOADED]: GradingWorkflowState.OCR_PROCESSING,
    [GradingWorkflowEvent.ERROR_OCCURRED]: GradingWorkflowState.ERROR
  },
  [GradingWorkflowState.OCR_PROCESSING]: {
    [GradingWorkflowEvent.OCR_COMPLETED]: GradingWorkflowState.QUALITY_CHECK,
    [GradingWorkflowEvent.ERROR_OCCURRED]: GradingWorkflowState.ERROR
  },
  [GradingWorkflowState.QUALITY_CHECK]: {
    [GradingWorkflowEvent.QUALITY_PASSED]: GradingWorkflowState.TASK_ASSIGNMENT,
    [GradingWorkflowEvent.QUALITY_FAILED]: GradingWorkflowState.PAPER_UPLOAD,
    [GradingWorkflowEvent.ERROR_OCCURRED]: GradingWorkflowState.ERROR
  },
  [GradingWorkflowState.TASK_ASSIGNMENT]: {
    [GradingWorkflowEvent.TASKS_ASSIGNED]: GradingWorkflowState.GRADING_IN_PROGRESS,
    [GradingWorkflowEvent.ERROR_OCCURRED]: GradingWorkflowState.ERROR
  },
  [GradingWorkflowState.GRADING_IN_PROGRESS]: {
    [GradingWorkflowEvent.GRADING_COMPLETED]: GradingWorkflowState.QUALITY_REVIEW,
    [GradingWorkflowEvent.DISPUTE_RAISED]: GradingWorkflowState.DISPUTE_RESOLUTION,
    [GradingWorkflowEvent.ERROR_OCCURRED]: GradingWorkflowState.ERROR
  },
  [GradingWorkflowState.QUALITY_REVIEW]: {
    [GradingWorkflowEvent.REVIEW_COMPLETED]: GradingWorkflowState.COMPLETED,
    [GradingWorkflowEvent.DISPUTE_RAISED]: GradingWorkflowState.DISPUTE_RESOLUTION,
    [GradingWorkflowEvent.ERROR_OCCURRED]: GradingWorkflowState.ERROR
  },
  [GradingWorkflowState.DISPUTE_RESOLUTION]: {
    [GradingWorkflowEvent.DISPUTE_RESOLVED]: GradingWorkflowState.QUALITY_REVIEW,
    [GradingWorkflowEvent.ERROR_OCCURRED]: GradingWorkflowState.ERROR
  },
  [GradingWorkflowState.COMPLETED]: {
    [GradingWorkflowEvent.RESET_WORKFLOW]: GradingWorkflowState.IDLE
  },
  [GradingWorkflowState.ERROR]: {
    [GradingWorkflowEvent.RESET_WORKFLOW]: GradingWorkflowState.IDLE
  }
};

// Store 接口定义
interface GradingWorkflowStore {
  // 当前状态
  currentState: GradingWorkflowState;
  previousState: GradingWorkflowState | null;
  
  // 当前考试ID
  currentExamId: string | null;
  
  // 任务列表
  tasks: GradingTask[];
  
  // 阅卷员列表
  graders: Grader[];
  
  // 统计信息
  statistics: WorkflowStatistics;
  
  // 错误信息
  error: string | null;
  
  // 加载状态
  isLoading: boolean;
  
  // 事件历史
  eventHistory: Array<{
    event: GradingWorkflowEvent;
    timestamp: string;
    fromState: GradingWorkflowState;
    toState: GradingWorkflowState;
    data?: any;
  }>;
  
  // Actions
  actions: {
    // 状态机操作
    transition: (event: GradingWorkflowEvent, data?: any) => boolean;
    canTransition: (event: GradingWorkflowEvent) => boolean;
    getCurrentState: () => GradingWorkflowState;
    
    // 工作流操作
    startWorkflow: (examId: string) => Promise<void>;
    resetWorkflow: () => void;
    
    // 任务管理
    createTasks: (tasks: Omit<GradingTask, 'id' | 'createdAt' | 'status'>[]) => void;
    assignTask: (taskId: string, graderId: string) => boolean;
    updateTaskStatus: (taskId: string, status: GradingTask['status'], data?: Partial<GradingTask>) => void;
    submitGrading: (taskId: string, score: number, notes?: string) => boolean;
    
    // 阅卷员管理
    addGrader: (grader: Omit<Grader, 'id' | 'currentLoad'>) => void;
    updateGrader: (graderId: string, updates: Partial<Grader>) => void;
    removeGrader: (graderId: string) => void;
    
    // 自动分配策略
    autoAssignTasks: (strategy?: 'balanced' | 'expertise' | 'random') => void;
    optimizeAssignments: () => void;
    
    // 质量控制
    checkQuality: (taskId: string) => boolean;
    raiseDispute: (taskId: string, reason: string) => void;
    resolveDispute: (taskId: string, resolution: string) => void;
    
    // 统计更新
    updateStatistics: () => void;
    
    // 错误处理
    setError: (error: string | null) => void;
    setLoading: (loading: boolean) => void;
  };
}

// 默认统计信息
const createDefaultStatistics = (): WorkflowStatistics => ({
  totalTasks: 0,
  completedTasks: 0,
  pendingTasks: 0,
  averageGradingTime: 0,
  accuracyRate: 0,
  throughput: 0,
  qualityScore: 0
});

// 创建 Store
export const useGradingWorkflowStore = create<GradingWorkflowStore>()(
  subscribeWithSelector(
    immer((set, get) => ({
      // 初始状态
      currentState: GradingWorkflowState.IDLE,
      previousState: null,
      currentExamId: null,
      tasks: [],
      graders: [],
      statistics: createDefaultStatistics(),
      error: null,
      isLoading: false,
      eventHistory: [],
      
      actions: {
        // 状态转换
        transition: (event: GradingWorkflowEvent, data?: any): boolean => {
          const currentState = get().currentState;
          const nextState = STATE_TRANSITIONS[currentState]?.[event];
          
          if (!nextState) {
            console.warn(`Invalid transition: ${event} from ${currentState}`);
            return false;
          }
          
          set((state) => {
            state.previousState = state.currentState;
            state.currentState = nextState;
            
            // 记录事件历史
            state.eventHistory.push({
              event,
              timestamp: new Date().toISOString(),
              fromState: currentState,
              toState: nextState,
              data
            });
            
            // 限制历史记录数量
            if (state.eventHistory.length > 100) {
              state.eventHistory = state.eventHistory.slice(-100);
            }
          });
          
          // 触发状态变更后的副作用
          get().actions.onStateChanged(nextState, event, data);
          
          return true;
        },
        
        // 检查是否可以执行转换
        canTransition: (event: GradingWorkflowEvent): boolean => {
          const currentState = get().currentState;
          return !!STATE_TRANSITIONS[currentState]?.[event];
        },
        
        // 获取当前状态
        getCurrentState: () => get().currentState,
        
        // 开始工作流
        startWorkflow: async (examId: string) => {
          set((state) => {
            state.currentExamId = examId;
            state.isLoading = true;
            state.error = null;
          });
          
          try {
            // 这里可以添加初始化逻辑
            await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟异步操作
            
            get().actions.transition(GradingWorkflowEvent.START_WORKFLOW, { examId });
            
          } catch (error) {
            get().actions.setError(error instanceof Error ? error.message : '启动工作流失败');
            get().actions.transition(GradingWorkflowEvent.ERROR_OCCURRED);
          } finally {
            set((state) => {
              state.isLoading = false;
            });
          }
        },
        
        // 重置工作流
        resetWorkflow: () => {
          set((state) => {
            state.currentState = GradingWorkflowState.IDLE;
            state.previousState = null;
            state.currentExamId = null;
            state.tasks = [];
            state.statistics = createDefaultStatistics();
            state.error = null;
            state.isLoading = false;
            state.eventHistory = [];
          });
        },
        
        // 创建任务
        createTasks: (taskData: Omit<GradingTask, 'id' | 'createdAt' | 'status'>[]) => {
          set((state) => {
            const newTasks = taskData.map(data => ({
              ...data,
              id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              status: 'pending' as const,
              createdAt: new Date().toISOString()
            }));
            state.tasks.push(...newTasks);
          });
          
          get().actions.updateStatistics();
        },
        
        // 分配任务
        assignTask: (taskId: string, graderId: string): boolean => {
          const grader = get().graders.find(g => g.id === graderId);
          if (!grader || grader.currentLoad >= grader.maxCapacity) {
            return false;
          }
          
          set((state) => {
            const task = state.tasks.find(t => t.id === taskId);
            const graderIndex = state.graders.findIndex(g => g.id === graderId);
            
            if (task && graderIndex !== -1 && task.status === 'pending') {
              task.assignedTo = graderId;
              task.status = 'assigned';
              state.graders[graderIndex].currentLoad += 1;
            }
          });
          
          get().actions.updateStatistics();
          return true;
        },
        
        // 更新任务状态
        updateTaskStatus: (taskId: string, status: GradingTask['status'], data?: Partial<GradingTask>) => {
          set((state) => {
            const task = state.tasks.find(t => t.id === taskId);
            if (task) {
              task.status = status;
              if (data) {
                Object.assign(task, data);
              }
              if (status === 'completed') {
                task.completedAt = new Date().toISOString();
              }
            }
          });
          
          get().actions.updateStatistics();
        },
        
        // 提交评分
        submitGrading: (taskId: string, score: number, notes?: string): boolean => {
          set((state) => {
            const task = state.tasks.find(t => t.id === taskId);
            if (task && task.status === 'in_progress') {
              task.humanScore = score;
              task.finalScore = score;
              task.reviewNotes = notes;
              task.status = 'completed';
              task.completedAt = new Date().toISOString();
              
              // 更新阅卷员工作负载
              if (task.assignedTo) {
                const graderIndex = state.graders.findIndex(g => g.id === task.assignedTo);
                if (graderIndex !== -1) {
                  state.graders[graderIndex].currentLoad -= 1;
                }
              }
            }
          });
          
          get().actions.updateStatistics();
          return true;
        },
        
        // 添加阅卷员
        addGrader: (graderData: Omit<Grader, 'id' | 'currentLoad'>) => {
          set((state) => {
            const newGrader: Grader = {
              ...graderData,
              id: `grader_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              currentLoad: 0
            };
            state.graders.push(newGrader);
          });
        },
        
        // 更新阅卷员
        updateGrader: (graderId: string, updates: Partial<Grader>) => {
          set((state) => {
            const graderIndex = state.graders.findIndex(g => g.id === graderId);
            if (graderIndex !== -1) {
              Object.assign(state.graders[graderIndex], updates);
            }
          });
        },
        
        // 移除阅卷员
        removeGrader: (graderId: string) => {
          set((state) => {
            state.graders = state.graders.filter(g => g.id !== graderId);
            // 重新分配该阅卷员的任务
            state.tasks.forEach(task => {
              if (task.assignedTo === graderId && task.status !== 'completed') {
                task.assignedTo = undefined;
                task.status = 'pending';
              }
            });
          });
        },
        
        // 自动分配任务
        autoAssignTasks: (strategy: 'balanced' | 'expertise' | 'random' = 'balanced') => {
          const state = get();
          const pendingTasks = state.tasks.filter(t => t.status === 'pending');
          const activeGraders = state.graders.filter(g => g.isActive && g.currentLoad < g.maxCapacity);
          
          if (pendingTasks.length === 0 || activeGraders.length === 0) {
            return;
          }
          
          switch (strategy) {
            case 'balanced':
              // 均衡分配：根据当前负载分配
              activeGraders.sort((a, b) => (a.currentLoad / a.maxCapacity) - (b.currentLoad / b.maxCapacity));
              pendingTasks.forEach((task, index) => {
                const grader = activeGraders[index % activeGraders.length];
                if (grader.currentLoad < grader.maxCapacity) {
                  get().actions.assignTask(task.id, grader.id);
                }
              });
              break;
              
            case 'expertise':
              // 专业匹配：根据阅卷员专业领域匹配
              pendingTasks.forEach(task => {
                const suitableGrader = activeGraders.find(grader => 
                  grader.currentLoad < grader.maxCapacity &&
                  grader.expertise.some(exp => task.questionId.includes(exp))
                );
                if (suitableGrader) {
                  get().actions.assignTask(task.id, suitableGrader.id);
                }
              });
              break;
              
            case 'random':
              // 随机分配
              pendingTasks.forEach(task => {
                const availableGraders = activeGraders.filter(g => g.currentLoad < g.maxCapacity);
                if (availableGraders.length > 0) {
                  const randomGrader = availableGraders[Math.floor(Math.random() * availableGraders.length)];
                  get().actions.assignTask(task.id, randomGrader.id);
                }
              });
              break;
          }
          
          // 检查是否所有任务都已分配
          const remainingPendingTasks = get().tasks.filter(t => t.status === 'pending');
          if (remainingPendingTasks.length === 0) {
            get().actions.transition(GradingWorkflowEvent.TASKS_ASSIGNED);
          }
        },
        
        // 优化分配
        optimizeAssignments: () => {
          // 实现分配优化逻辑
          // 可以基于阅卷员的准确性、速度等因素重新分配任务
          console.log('Optimizing task assignments...');
        },
        
        // 质量检查
        checkQuality: (taskId: string): boolean => {
          const task = get().tasks.find(t => t.id === taskId);
          if (!task || !task.aiScore || !task.humanScore) {
            return false;
          }
          
          // 简单的质量检查：AI和人工评分差异
          const scoreDifference = Math.abs(task.aiScore - task.humanScore);
          const isQualityPassed = scoreDifference <= 2; // 差异小于等于2分认为通过
          
          if (!isQualityPassed) {
            get().actions.raiseDispute(taskId, `AI评分(${task.aiScore})与人工评分(${task.humanScore})差异过大`);
          }
          
          return isQualityPassed;
        },
        
        // 提出争议
        raiseDispute: (taskId: string, reason: string) => {
          set((state) => {
            const task = state.tasks.find(t => t.id === taskId);
            if (task) {
              task.status = 'disputed';
              task.reviewNotes = (task.reviewNotes || '') + `\n争议原因: ${reason}`;
            }
          });
          
          get().actions.transition(GradingWorkflowEvent.DISPUTE_RAISED, { taskId, reason });
        },
        
        // 解决争议
        resolveDispute: (taskId: string, resolution: string) => {
          set((state) => {
            const task = state.tasks.find(t => t.id === taskId);
            if (task && task.status === 'disputed') {
              task.status = 'reviewed';
              task.reviewNotes = (task.reviewNotes || '') + `\n争议解决: ${resolution}`;
            }
          });
          
          get().actions.transition(GradingWorkflowEvent.DISPUTE_RESOLVED, { taskId, resolution });
        },
        
        // 更新统计信息
        updateStatistics: () => {
          set((state) => {
            const { tasks } = state;
            const completedTasks = tasks.filter(t => t.status === 'completed' || t.status === 'reviewed');
            const pendingTasks = tasks.filter(t => t.status === 'pending' || t.status === 'assigned');
            
            // 计算平均评分时间
            const gradingTimes = completedTasks
              .filter(t => t.createdAt && t.completedAt)
              .map(t => new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime());
            
            const averageGradingTime = gradingTimes.length > 0 
              ? gradingTimes.reduce((sum, time) => sum + time, 0) / gradingTimes.length / 1000 / 60 // 转换为分钟
              : 0;
            
            // 计算准确率（基于AI和人工评分的一致性）
            const scoredTasks = completedTasks.filter(t => t.aiScore !== undefined && t.humanScore !== undefined);
            const accurateScores = scoredTasks.filter(t => Math.abs(t.aiScore! - t.humanScore!) <= 2);
            const accuracyRate = scoredTasks.length > 0 ? (accurateScores.length / scoredTasks.length) * 100 : 0;
            
            state.statistics = {
              totalTasks: tasks.length,
              completedTasks: completedTasks.length,
              pendingTasks: pendingTasks.length,
              averageGradingTime,
              accuracyRate,
              throughput: completedTasks.length, // 可以根据时间窗口计算
              qualityScore: accuracyRate // 简化的质量分数
            };
          });
        },
        
        // 设置错误
        setError: (error: string | null) => {
          set((state) => {
            state.error = error;
          });
        },
        
        // 设置加载状态
        setLoading: (loading: boolean) => {
          set((state) => {
            state.isLoading = loading;
          });
        },
        
        // 状态变更回调
        onStateChanged: (newState: GradingWorkflowState, event: GradingWorkflowEvent, data?: any) => {
          console.log(`Workflow state changed: ${event} -> ${newState}`, data);
          
          // 根据状态执行相应的副作用
          switch (newState) {
            case GradingWorkflowState.GRADING_IN_PROGRESS:
              // 开始阅卷时，可以发送通知给阅卷员
              console.log('Notifying graders to start grading...');
              break;
              
            case GradingWorkflowState.COMPLETED:
              // 工作流完成时，可以生成报告
              console.log('Generating completion report...');
              break;
              
            case GradingWorkflowState.ERROR:
              // 错误状态时，可以发送警报
              console.error('Workflow entered error state:', data);
              break;
          }
        }
      }
    }))
  )
);

// 选择器钩子
export const useGradingWorkflow = () => useGradingWorkflowStore(state => ({
  currentState: state.currentState,
  previousState: state.previousState,
  currentExamId: state.currentExamId,
  error: state.error,
  isLoading: state.isLoading,
  eventHistory: state.eventHistory
}));

export const useGradingTasks = () => useGradingWorkflowStore(state => state.tasks);
export const useGraders = () => useGradingWorkflowStore(state => state.graders);
export const useWorkflowStatistics = () => useGradingWorkflowStore(state => state.statistics);
export const useGradingWorkflowActions = () => useGradingWorkflowStore(state => state.actions);

// 状态检查钩子
export const useCanTransition = (event: GradingWorkflowEvent) => 
  useGradingWorkflowStore(state => state.actions.canTransition(event));

// 当前状态检查钩子
export const useIsInState = (targetState: GradingWorkflowState) => 
  useGradingWorkflowStore(state => state.currentState === targetState);