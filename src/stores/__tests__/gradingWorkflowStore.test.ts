/**
 * 阅卷工作流状态管理测试
 * 测试状态机模式的工作流状态转换和操作
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { useGradingWorkflowStore } from '../gradingWorkflowStore';
import type { 
  GradingWorkflowState, 
  GradingWorkflowEvent, 
  GraderInfo, 
  QualityControlSettings 
} from '../gradingWorkflowStore';

describe('GradingWorkflowStore', () => {
  beforeEach(() => {
    // 重置store到初始状态
    useGradingWorkflowStore.setState({
      currentState: 'idle' as GradingWorkflowState,
      context: {
        examId: '',
        currentStep: 0,
        totalSteps: 0,
        startTime: null,
        endTime: null,
        errorMessage: null,
        progress: {
          completed: 0,
          total: 0,
          percentage: 0
        },
        taskAssignment: {
          assignments: [],
          strategy: 'balanced',
          isBalanced: true
        },
        graderManagement: {
          graders: [],
          activeCount: 0,
          workloadDistribution: []
        },
        qualityControl: {
          enableDoubleBlind: false,
          enableCrossCheck: false,
          samplingRate: 0.1,
          conflictThreshold: 5,
          autoReassignOnConflict: true
        }
      },
      stateHistory: []
    });
  });

  describe('状态转换', () => {
    it('应该能从idle状态转换到initializing状态', () => {
      const store = useGradingWorkflowStore.getState();
      
      store.actions.transitionTo('initializing' as GradingWorkflowEvent, {
        examId: 'exam-123'
      });

      const newState = useGradingWorkflowStore.getState();
      expect(newState.currentState).toBe('initializing');
      expect(newState.context.examId).toBe('exam-123');
    });

    it('应该阻止无效的状态转换', () => {
      const store = useGradingWorkflowStore.getState();
      
      // 尝试从idle直接跳到grading（无效转换）
      const result = store.actions.transitionTo('start_grading' as GradingWorkflowEvent);

      expect(result).toBe(false);
      expect(useGradingWorkflowStore.getState().currentState).toBe('idle');
    });

    it('应该正确记录状态历史', () => {
      const store = useGradingWorkflowStore.getState();
      
      store.actions.transitionTo('initializing' as GradingWorkflowEvent, {
        examId: 'exam-123'
      });

      const newState = useGradingWorkflowStore.getState();
      expect(newState.stateHistory).toHaveLength(2); // idle + initializing
      expect(newState.stateHistory[0].state).toBe('idle');
      expect(newState.stateHistory[1].state).toBe('initializing');
    });

    it('应该限制状态历史记录数量', () => {
      const store = useGradingWorkflowStore.getState();
      
      // 模拟多次状态转换
      const states: GradingWorkflowEvent[] = [
        'initializing',
        'upload_papers', 
        'start_ocr',
        'complete_ocr',
        'start_quality_check'
      ];

      states.forEach((event, index) => {
        store.actions.transitionTo(event as GradingWorkflowEvent, {
          examId: `exam-${index}`
        });
      });

      const finalState = useGradingWorkflowStore.getState();
      expect(finalState.stateHistory.length).toBeLessThanOrEqual(10); // 假设限制为10
    });
  });

  describe('上下文管理', () => {
    it('应该正确更新上下文数据', () => {
      const store = useGradingWorkflowStore.getState();
      
      store.actions.updateContext({
        examId: 'exam-456',
        totalSteps: 5,
        currentStep: 2
      });

      const newState = useGradingWorkflowStore.getState();
      expect(newState.context.examId).toBe('exam-456');
      expect(newState.context.totalSteps).toBe(5);
      expect(newState.context.currentStep).toBe(2);
    });

    it('应该正确更新进度信息', () => {
      const store = useGradingWorkflowStore.getState();
      
      store.actions.updateProgress(30, 100);

      const newState = useGradingWorkflowStore.getState();
      expect(newState.context.progress.completed).toBe(30);
      expect(newState.context.progress.total).toBe(100);
      expect(newState.context.progress.percentage).toBe(30);
    });

    it('应该正确处理错误信息', () => {
      const store = useGradingWorkflowStore.getState();
      const errorMessage = '网络连接失败';
      
      store.actions.setError(errorMessage);

      const newState = useGradingWorkflowStore.getState();
      expect(newState.context.errorMessage).toBe(errorMessage);
    });

    it('应该能清除错误信息', () => {
      const store = useGradingWorkflowStore.getState();
      
      store.actions.setError('错误信息');
      store.actions.clearError();

      const newState = useGradingWorkflowStore.getState();
      expect(newState.context.errorMessage).toBeNull();
    });
  });

  describe('阅卷员管理', () => {
    const mockGraders: GraderInfo[] = [
      {
        id: 'grader-1',
        name: '张老师',
        email: 'zhang@school.edu',
        subject: '数学',
        isActive: true,
        workload: {
          assigned: 20,
          completed: 15,
          inProgress: 5,
          averageTime: 3.5
        },
        qualifications: ['高级教师', '数学专家']
      },
      {
        id: 'grader-2',
        name: '李老师',
        email: 'li@school.edu',
        subject: '数学',
        isActive: true,
        workload: {
          assigned: 25,
          completed: 20,
          inProgress: 5,
          averageTime: 4.0
        },
        qualifications: ['中级教师']
      }
    ];

    it('应该正确添加阅卷员', () => {
      const store = useGradingWorkflowStore.getState();
      
      store.actions.addGrader(mockGraders[0]);

      const newState = useGradingWorkflowStore.getState();
      expect(newState.context.graderManagement.graders).toHaveLength(1);
      expect(newState.context.graderManagement.graders[0]).toEqual(mockGraders[0]);
      expect(newState.context.graderManagement.activeCount).toBe(1);
    });

    it('应该正确更新阅卷员信息', () => {
      const store = useGradingWorkflowStore.getState();
      
      // 先添加阅卷员
      store.actions.addGrader(mockGraders[0]);
      
      // 更新阅卷员信息
      store.actions.updateGrader('grader-1', {
        workload: {
          ...mockGraders[0].workload,
          completed: 18,
          inProgress: 2
        }
      });

      const newState = useGradingWorkflowStore.getState();
      const updatedGrader = newState.context.graderManagement.graders.find(g => g.id === 'grader-1');
      expect(updatedGrader?.workload.completed).toBe(18);
      expect(updatedGrader?.workload.inProgress).toBe(2);
    });

    it('应该正确移除阅卷员', () => {
      const store = useGradingWorkflowStore.getState();
      
      // 添加多个阅卷员
      mockGraders.forEach(grader => store.actions.addGrader(grader));
      
      // 移除一个阅卷员
      store.actions.removeGrader('grader-1');

      const newState = useGradingWorkflowStore.getState();
      expect(newState.context.graderManagement.graders).toHaveLength(1);
      expect(newState.context.graderManagement.graders[0].id).toBe('grader-2');
      expect(newState.context.graderManagement.activeCount).toBe(1);
    });

    it('应该正确设置阅卷员活跃状态', () => {
      const store = useGradingWorkflowStore.getState();
      
      store.actions.addGrader(mockGraders[0]);
      store.actions.setGraderActive('grader-1', false);

      const newState = useGradingWorkflowStore.getState();
      const grader = newState.context.graderManagement.graders.find(g => g.id === 'grader-1');
      expect(grader?.isActive).toBe(false);
      expect(newState.context.graderManagement.activeCount).toBe(0);
    });
  });

  describe('任务分配', () => {
    it('应该正确分配任务', () => {
      const store = useGradingWorkflowStore.getState();
      
      const assignment = {
        graderId: 'grader-1',
        taskIds: ['task-1', 'task-2', 'task-3'],
        assignedAt: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 3600000).toISOString() // 1小时后
      };

      store.actions.assignTasks([assignment]);

      const newState = useGradingWorkflowStore.getState();
      expect(newState.context.taskAssignment.assignments).toHaveLength(1);
      expect(newState.context.taskAssignment.assignments[0]).toEqual(assignment);
    });

    it('应该正确重新分配任务', () => {
      const store = useGradingWorkflowStore.getState();
      
      const originalAssignment = {
        graderId: 'grader-1',
        taskIds: ['task-1', 'task-2'],
        assignedAt: new Date().toISOString(),
        estimatedCompletion: new Date(Date.now() + 3600000).toISOString()
      };

      store.actions.assignTasks([originalAssignment]);
      store.actions.reassignTask('task-1', 'grader-2');

      const newState = useGradingWorkflowStore.getState();
      // 检查任务是否从原阅卷员移除并分配给新阅卷员
      const grader1Assignment = newState.context.taskAssignment.assignments.find(a => a.graderId === 'grader-1');
      const grader2Assignment = newState.context.taskAssignment.assignments.find(a => a.graderId === 'grader-2');
      
      expect(grader1Assignment?.taskIds).not.toContain('task-1');
      expect(grader2Assignment?.taskIds).toContain('task-1');
    });

    it('应该正确设置分配策略', () => {
      const store = useGradingWorkflowStore.getState();
      
      store.actions.setAssignmentStrategy('expertise');

      const newState = useGradingWorkflowStore.getState();
      expect(newState.context.taskAssignment.strategy).toBe('expertise');
    });
  });

  describe('质量控制', () => {
    it('应该正确更新质量控制设置', () => {
      const store = useGradingWorkflowStore.getState();
      
      const newSettings: Partial<QualityControlSettings> = {
        enableDoubleBlind: true,
        enableCrossCheck: true,
        samplingRate: 0.2,
        conflictThreshold: 3
      };

      store.actions.updateQualityControlSettings(newSettings);

      const newState = useGradingWorkflowStore.getState();
      expect(newState.context.qualityControl.enableDoubleBlind).toBe(true);
      expect(newState.context.qualityControl.enableCrossCheck).toBe(true);
      expect(newState.context.qualityControl.samplingRate).toBe(0.2);
      expect(newState.context.qualityControl.conflictThreshold).toBe(3);
    });
  });

  describe('工作流重置', () => {
    it('应该正确重置工作流到初始状态', () => {
      const store = useGradingWorkflowStore.getState();
      
      // 修改一些状态
      store.actions.transitionTo('initializing' as GradingWorkflowEvent, { examId: 'test' });
      store.actions.updateProgress(50, 100);
      store.actions.setError('测试错误');

      // 重置
      store.actions.reset();

      const newState = useGradingWorkflowStore.getState();
      expect(newState.currentState).toBe('idle');
      expect(newState.context.examId).toBe('');
      expect(newState.context.progress.completed).toBe(0);
      expect(newState.context.errorMessage).toBeNull();
      expect(newState.stateHistory).toHaveLength(0);
    });
  });

  describe('状态查询', () => {
    it('应该正确检查状态是否可以转换', () => {
      const store = useGradingWorkflowStore.getState();
      
      expect(store.actions.canTransitionTo('initializing' as GradingWorkflowEvent)).toBe(true);
      expect(store.actions.canTransitionTo('start_grading' as GradingWorkflowEvent)).toBe(false);
    });

    it('应该正确获取当前状态信息', () => {
      const store = useGradingWorkflowStore.getState();
      
      expect(store.actions.getCurrentState()).toBe('idle');
      expect(store.actions.isInState('idle')).toBe(true);
      expect(store.actions.isInState('initializing')).toBe(false);
    });

    it('应该正确获取进度百分比', () => {
      const store = useGradingWorkflowStore.getState();
      
      store.actions.updateProgress(75, 100);
      
      expect(store.actions.getProgressPercentage()).toBe(75);
    });
  });
});