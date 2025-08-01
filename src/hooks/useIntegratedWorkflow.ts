import { useState, useCallback, useReducer, useEffect } from 'react';
import { message } from '../utils/message';
import { Exam } from '../types/exam';
import {
  IntegratedWorkflowState,
  IntegratedWorkflowStage,
  IntegratedWorkflowConfiguration,
  IntegratedWorkflowActions,
  IntegratedWorkflowUtils,
  UseIntegratedWorkflow,
  WorkflowStageStatus,
  StudentWorkflowInfo,
  TemplateWorkflowInfo,
  ProcessingWorkflowInfo,
  WorkflowSummary,
  DEFAULT_INTEGRATED_WORKFLOW_CONFIG,
  WORKFLOW_STAGES
} from '../types/integratedWorkflow';
import { studentApi } from '../api/studentApi';
import preGradingApi from '../services/preGradingApi';

// 工作流状态reducer
type WorkflowAction = 
  | { type: 'INITIALIZE'; payload: { exam: Exam; config: IntegratedWorkflowConfiguration } }
  | { type: 'SET_STAGE'; payload: { stage: IntegratedWorkflowStage; status?: WorkflowStageStatus } }
  | { type: 'UPDATE_STUDENT_INFO'; payload: StudentWorkflowInfo }
  | { type: 'UPDATE_TEMPLATE_INFO'; payload: TemplateWorkflowInfo }
  | { type: 'UPDATE_PROCESSING_INFO'; payload: ProcessingWorkflowInfo }
  | { type: 'UPDATE_STAGE_STATUS'; payload: { stage: IntegratedWorkflowStage; status: WorkflowStageStatus } }
  | { type: 'UPDATE_CONFIG'; payload: Partial<IntegratedWorkflowConfiguration> }
  | { type: 'RESET' };

const initialState: IntegratedWorkflowState = {
  examId: '',
  currentStage: 'student_setup',
  stageStatus: {
    student_setup: 'pending',
    template_setup: 'pending',
    upload_processing: 'pending',
    marking: 'pending',
    review: 'pending',
    completed: 'pending'
  },
  studentInfo: {
    totalStudents: 0,
    importedStudents: 0,
    verifiedStudents: 0,
    classesList: [],
    importMethod: 'manual'
  },
  templateInfo: {
    isCustomTemplate: false,
    templateValidated: false
  },
  processingInfo: {
    uploadedSheets: 0,
    processedSheets: 0,
    readyForMarking: 0,
    qualityIssues: 0,
    identityIssues: 0,
    processingProgress: 0
  },
  configuration: DEFAULT_INTEGRATED_WORKFLOW_CONFIG
};

function workflowReducer(state: IntegratedWorkflowState, action: WorkflowAction): IntegratedWorkflowState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...initialState,
        examId: action.payload.exam.id,
        configuration: { ...DEFAULT_INTEGRATED_WORKFLOW_CONFIG, ...action.payload.config },
        stageStatus: {
          ...initialState.stageStatus,
          student_setup: 'in_progress'
        }
      };

    case 'SET_STAGE':
      return {
        ...state,
        currentStage: action.payload.stage,
        stageStatus: {
          ...state.stageStatus,
          [action.payload.stage]: action.payload.status || 'in_progress'
        }
      };

    case 'UPDATE_STUDENT_INFO':
      return {
        ...state,
        studentInfo: { ...state.studentInfo, ...action.payload }
      };

    case 'UPDATE_TEMPLATE_INFO':
      return {
        ...state,
        templateInfo: { ...state.templateInfo, ...action.payload }
      };

    case 'UPDATE_PROCESSING_INFO':
      return {
        ...state,
        processingInfo: { ...state.processingInfo, ...action.payload }
      };

    case 'UPDATE_STAGE_STATUS':
      return {
        ...state,
        stageStatus: {
          ...state.stageStatus,
          [action.payload.stage]: action.payload.status
        }
      };

    case 'UPDATE_CONFIG':
      return {
        ...state,
        configuration: { ...state.configuration, ...action.payload }
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

export const useIntegratedWorkflow = (): UseIntegratedWorkflow => {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  // 初始化工作流
  const initializeWorkflow = useCallback(async (exam: Exam, config?: Partial<IntegratedWorkflowConfiguration>) => {
    try {
      const fullConfig = { ...DEFAULT_INTEGRATED_WORKFLOW_CONFIG, ...config };
      dispatch({ type: 'INITIALIZE', payload: { exam, config: fullConfig } });
      
      // 调用API初始化工作流
      const response = await preGradingApi.initializeWorkflow(exam.id, fullConfig);
      
      if (response.success && response.data) {
        setWorkflowId(response.data.workflowId);
        message.success('阅卷工作流初始化完成');
      } else {
        throw new Error(response.message || '初始化失败');
      }
    } catch (error) {
      message.error('工作流初始化失败');
      console.error('Workflow initialization error:', error);
      throw error;
    }
  }, []);

  // 更新阶段状态
  const updateStageStatus = useCallback((stage: IntegratedWorkflowStage, status: WorkflowStageStatus) => {
    dispatch({ type: 'UPDATE_STAGE_STATUS', payload: { stage, status } });
  }, []);

  // 完成学生信息设置
  const completeStudentSetup = useCallback(async (data: StudentWorkflowInfo) => {
    try {
      // 验证学生信息完整性
      if (data.totalStudents === 0) {
        throw new Error('学生信息不能为空');
      }

      dispatch({ type: 'UPDATE_STUDENT_INFO', payload: data });
      dispatch({ type: 'UPDATE_STAGE_STATUS', payload: { stage: 'student_setup', status: 'completed' } });
      dispatch({ type: 'SET_STAGE', payload: { stage: 'template_setup', status: 'in_progress' } });

      // 调用API保存学生信息
      if (workflowId) {
        await preGradingApi.updateWorkflowData(workflowId, { studentInfo: data });
      }

      message.success('学生信息配置完成');
    } catch (error) {
      message.error('学生信息配置失败');
      console.error('Student setup error:', error);
      throw error;
    }
  }, [workflowId]);

  // 完成模板设置
  const completeTemplateSetup = useCallback(async (data: TemplateWorkflowInfo) => {
    try {
      // 验证模板信息
      if (!data.selectedTemplateId) {
        throw new Error('必须选择模板');
      }

      dispatch({ type: 'UPDATE_TEMPLATE_INFO', payload: data });
      dispatch({ type: 'UPDATE_STAGE_STATUS', payload: { stage: 'template_setup', status: 'completed' } });
      dispatch({ type: 'SET_STAGE', payload: { stage: 'upload_processing', status: 'in_progress' } });

      // 调用API保存模板信息
      if (workflowId) {
        await preGradingApi.updateWorkflowData(workflowId, { templateInfo: data });
      }

      message.success('模板配置完成');
    } catch (error) {
      message.error('模板配置失败');
      console.error('Template setup error:', error);
      throw error;
    }
  }, [workflowId]);

  // 完成答题卡处理
  const completeUploadProcessing = useCallback(async (data: ProcessingWorkflowInfo) => {
    try {
      // 验证处理结果
      if (data.readyForMarking === 0) {
        throw new Error('没有可用于阅卷的答题卡');
      }

      dispatch({ type: 'UPDATE_PROCESSING_INFO', payload: data });
      dispatch({ type: 'UPDATE_STAGE_STATUS', payload: { stage: 'upload_processing', status: 'completed' } });
      dispatch({ type: 'SET_STAGE', payload: { stage: 'marking', status: 'in_progress' } });

      // 调用API保存处理信息
      if (workflowId) {
        await preGradingApi.updateWorkflowData(workflowId, { processingInfo: data });
      }

      message.success('答题卡处理完成');
    } catch (error) {
      message.error('答题卡处理失败');
      console.error('Upload processing error:', error);
      throw error;
    }
  }, [workflowId]);

  // 完成阅卷
  const completeMarking = useCallback(async () => {
    try {
      dispatch({ type: 'UPDATE_STAGE_STATUS', payload: { stage: 'marking', status: 'completed' } });
      
      // 根据配置决定是否进入复核阶段
      if (state.configuration.qualityAssurance.requireManualReview) {
        dispatch({ type: 'SET_STAGE', payload: { stage: 'review', status: 'in_progress' } });
      } else {
        dispatch({ type: 'SET_STAGE', payload: { stage: 'completed', status: 'completed' } });
      }

      // 调用API更新阅卷状态
      if (workflowId) {
        await preGradingApi.updateWorkflowStage(workflowId, 'marking', 'completed');
      }

      message.success('阅卷完成');
    } catch (error) {
      message.error('阅卷完成失败');
      console.error('Marking completion error:', error);
      throw error;
    }
  }, [state.configuration, workflowId]);

  // 完成复核
  const completeReview = useCallback(async () => {
    try {
      dispatch({ type: 'UPDATE_STAGE_STATUS', payload: { stage: 'review', status: 'completed' } });
      dispatch({ type: 'SET_STAGE', payload: { stage: 'completed', status: 'completed' } });

      // 调用API完成整个工作流
      if (workflowId) {
        await preGradingApi.completeWorkflow(workflowId);
      }

      message.success('复核完成，阅卷工作流已完成');
    } catch (error) {
      message.error('复核完成失败');
      console.error('Review completion error:', error);
      throw error;
    }
  }, [workflowId]);

  // 跳转到指定阶段
  const goToStage = useCallback(async (stage: IntegratedWorkflowStage): Promise<boolean> => {
    try {
      // 检查是否可以跳转到该阶段
      const canProceed = canProceedToStage(stage);
      if (!canProceed) {
        message.warning('请先完成前置步骤');
        return false;
      }

      // 验证阶段切换的合法性
      const validation = validateStageCompletion(state.currentStage);
      if (validation && state.stageStatus[state.currentStage] !== 'completed') {
        message.error(validation);
        return false;
      }

      dispatch({ type: 'SET_STAGE', payload: { stage, status: 'in_progress' } });

      // 调用API更新阶段
      if (workflowId) {
        await preGradingApi.updateWorkflowStage(workflowId, stage, 'in_progress');
      }

      return true;
    } catch (error) {
      message.error('阶段切换失败');
      console.error('Stage transition error:', error);
      return false;
    }
  }, [state.currentStage, state.stageStatus, workflowId]);

  // 重置工作流
  const resetWorkflow = useCallback(() => {
    dispatch({ type: 'RESET' });
    setWorkflowId(null);
  }, []);

  // 导出工作流报告
  const exportWorkflowReport = useCallback(async (): Promise<Blob> => {
    try {
      const summary = getWorkflowSummary();
      const reportData = JSON.stringify(summary, null, 2);
      return new Blob([reportData], { type: 'application/json' });
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  }, []);

  // 检查是否可以进入指定阶段
  const canProceedToStage = useCallback((stage: IntegratedWorkflowStage): boolean => {
    const stageConfig = WORKFLOW_STAGES.find(s => s.key === stage);
    if (!stageConfig) return false;

    // 检查依赖阶段是否已完成
    return stageConfig.dependencies.every(dep => state.stageStatus[dep] === 'completed');
  }, [state.stageStatus]);

  // 获取阶段进度
  const getStageProgress = useCallback((stage: IntegratedWorkflowStage): number => {
    const status = state.stageStatus[stage];
    switch (status) {
      case 'completed': return 100;
      case 'in_progress': return 50;
      case 'failed': return 0;
      default: return 0;
    }
  }, [state.stageStatus]);

  // 获取总体进度
  const getOverallProgress = useCallback((): number => {
    const stages = Object.keys(state.stageStatus) as IntegratedWorkflowStage[];
    const totalProgress = stages.reduce((sum, stage) => sum + getStageProgress(stage), 0);
    return Math.round(totalProgress / stages.length);
  }, [state.stageStatus, getStageProgress]);

  // 验证阶段完成情况
  const validateStageCompletion = useCallback((stage: IntegratedWorkflowStage): string | null => {
    switch (stage) {
      case 'student_setup':
        if (state.studentInfo.totalStudents === 0) {
          return '请先导入学生信息';
        }
        break;
      case 'template_setup':
        if (!state.templateInfo.selectedTemplateId) {
          return '请先选择或创建模板';
        }
        break;
      case 'upload_processing':
        if (state.processingInfo.readyForMarking === 0) {
          return '请先上传并处理答题卡';
        }
        break;
      default:
        break;
    }
    return null;
  }, [state.studentInfo, state.templateInfo, state.processingInfo]);

  // 获取下一个阶段
  const getNextStage = useCallback((): IntegratedWorkflowStage | null => {
    const currentIndex = WORKFLOW_STAGES.findIndex(s => s.key === state.currentStage);
    if (currentIndex === -1 || currentIndex === WORKFLOW_STAGES.length - 1) return null;
    return WORKFLOW_STAGES[currentIndex + 1].key;
  }, [state.currentStage]);

  // 获取上一个阶段
  const getPreviousStage = useCallback((): IntegratedWorkflowStage | null => {
    const currentIndex = WORKFLOW_STAGES.findIndex(s => s.key === state.currentStage);
    if (currentIndex <= 0) return null;
    return WORKFLOW_STAGES[currentIndex - 1].key;
  }, [state.currentStage]);

  // 获取工作流摘要
  const getWorkflowSummary = useCallback((): WorkflowSummary => {
    return {
      exam: {
        id: state.examId,
        name: state.configuration.exam.name,
        subject: state.configuration.exam.subject,
        grade: state.configuration.exam.grade
      },
      timeline: {
        startTime: new Date().toISOString(), // 这里应该从实际数据获取
        stageTimings: {} // 这里应该从实际数据计算
      },
      statistics: {
        students: state.studentInfo,
        processing: state.processingInfo,
        quality: {
          averageQualityScore: 0, // 这里应该从实际数据计算
          passRate: 0,
          issueCount: state.processingInfo.qualityIssues + state.processingInfo.identityIssues
        }
      },
      status: {
        currentStage: state.currentStage,
        completedStages: Object.keys(state.stageStatus).filter(
          stage => state.stageStatus[stage as IntegratedWorkflowStage] === 'completed'
        ) as IntegratedWorkflowStage[],
        overallProgress: getOverallProgress(),
        isCompleted: state.currentStage === 'completed' && state.stageStatus.completed === 'completed'
      }
    };
  }, [state, getOverallProgress]);

  const actions: IntegratedWorkflowActions = {
    initializeWorkflow,
    updateStageStatus,
    completeStudentSetup,
    completeTemplateSetup,
    completeUploadProcessing,
    completeMarking,
    completeReview,
    goToStage,
    resetWorkflow,
    exportWorkflowReport
  };

  const utils: IntegratedWorkflowUtils = {
    canProceedToStage,
    getStageProgress,
    getOverallProgress,
    validateStageCompletion,
    getNextStage,
    getPreviousStage,
    getWorkflowSummary
  };

  return {
    state,
    actions,
    utils
  };
};