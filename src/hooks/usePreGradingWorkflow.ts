import { useState, useCallback, useReducer, useEffect } from 'react';
import { message } from '../utils/message';
import {
  PreGradingWorkflowState,
  PreGradingStage,
  PreGradingConfiguration,
  StandardizedAnswerSheet,
  BatchProcessingResult,
  ProcessingIssue,
  UsePreGradingWorkflow
} from '../types/preGrading';
import preGradingApi from '../services/preGradingApi';
import { batchProcessingService, BatchTaskType } from '../services/batchProcessingService';
// import qualityMonitoringService from '../services/qualityMonitoringService'; // 已删除实时监控功能

// 工作流状态reducer
type WorkflowAction = 
  | { type: 'INITIALIZE'; payload: { examId: string; config: PreGradingConfiguration } }
  | { type: 'SET_STAGE'; payload: { stage: PreGradingStage } }
  | { type: 'UPDATE_PROGRESS'; payload: { stage: PreGradingStage; progress: number } }
  | { type: 'ADD_ANSWER_SHEETS'; payload: { sheets: StandardizedAnswerSheet[] } }
  | { type: 'UPDATE_ANSWER_SHEET'; payload: { sheetId: string; updates: Partial<StandardizedAnswerSheet> } }
  | { type: 'ADD_ISSUE'; payload: { issue: ProcessingIssue; sheetId?: string } }
  | { type: 'UPDATE_STATISTICS'; payload: Partial<PreGradingWorkflowState['statistics']> }
  | { type: 'UPDATE_CONFIG'; payload: Partial<PreGradingConfiguration> }
  | { type: 'RESET' };

const initialState: PreGradingWorkflowState = {
  examId: '',
  currentStage: 'upload',
  stages: {
    upload: { status: 'pending', progress: 0 },
    processing: { status: 'pending', progress: 0 },
    validation: { status: 'pending', progress: 0 },
    completed: { status: 'pending', progress: 0 }
  },
  answerSheets: [],
  statistics: {
    totalUploaded: 0,
    processed: 0,
    verified: 0,
    hasIssues: 0,
    ready: 0
  },
  configuration: {
    qualityThreshold: 0.7,
    identityVerificationRequired: true,
    autoProcessEnabled: true,
    batchSize: 10
  }
};

function workflowReducer(state: PreGradingWorkflowState, action: WorkflowAction): PreGradingWorkflowState {
  switch (action.type) {
    case 'INITIALIZE':
      return {
        ...initialState,
        examId: action.payload.examId,
        configuration: { ...initialState.configuration, ...action.payload.config },
        stages: {
          upload: { status: 'in_progress', progress: 0 },
          processing: { status: 'pending', progress: 0 },
          validation: { status: 'pending', progress: 0 },
          completed: { status: 'pending', progress: 0 }
        }
      };

    case 'SET_STAGE':
      return {
        ...state,
        currentStage: action.payload.stage,
        stages: {
          ...state.stages,
          [action.payload.stage]: {
            ...state.stages[action.payload.stage],
            status: 'in_progress',
            startTime: new Date().toISOString()
          }
        }
      };

    case 'UPDATE_PROGRESS':
      return {
        ...state,
        stages: {
          ...state.stages,
          [action.payload.stage]: {
            ...state.stages[action.payload.stage],
            progress: action.payload.progress,
            ...(action.payload.progress === 100 && {
              status: 'completed' as const,
              endTime: new Date().toISOString()
            })
          }
        }
      };

    case 'ADD_ANSWER_SHEETS': {
      const newSheets = action.payload.sheets;
      const updatedStatistics = {
        totalUploaded: state.statistics.totalUploaded + newSheets.length,
        processed: state.statistics.processed + newSheets.filter(s => s.processingStatus.stage !== 'uploaded').length,
        verified: state.statistics.verified + newSheets.filter(s => s.studentIdentity.verificationStatus === 'verified').length,
        hasIssues: state.statistics.hasIssues + newSheets.filter(s => s.processingStatus.issues.length > 0).length,
        ready: state.statistics.ready + newSheets.filter(s => s.processingStatus.stage === 'ready').length
      };

      return {
        ...state,
        answerSheets: [...state.answerSheets, ...newSheets],
        statistics: updatedStatistics
      };
    }

    case 'UPDATE_ANSWER_SHEET':
      return {
        ...state,
        answerSheets: state.answerSheets.map(sheet =>
          sheet.id === action.payload.sheetId
            ? { ...sheet, ...action.payload.updates }
            : sheet
        )
      };

    case 'UPDATE_STATISTICS':
      return {
        ...state,
        statistics: { ...state.statistics, ...action.payload }
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

export const usePreGradingWorkflow = (): UsePreGradingWorkflow => {
  const [state, dispatch] = useReducer(workflowReducer, initialState);
  const [workflowId, setWorkflowId] = useState<string | null>(null);

  // 监听批处理和质量监控事件
  useEffect(() => {
    const handleBatchEvent = (event: any) => {
      if (event.type === 'TASK_COMPLETED' && event.payload.result?.results) {
        const sheets = event.payload.result.results;
        if (sheets.length > 0 && sheets[0].examId === state.examId) {
          dispatch({ type: 'ADD_ANSWER_SHEETS', payload: { sheets } });
        }
      }
    };

    const handleQualityEvent = (event: any) => {
      if (event.type === 'QUALITY_ALERT' && event.payload.examId === state.examId) {
        // 处理质量警告
        console.warn('Quality alert:', event.payload.issue);
      }
    };

    batchProcessingService.addEventListener(handleBatchEvent);
    // qualityMonitoringService.addEventListener(handleQualityEvent); // 已删除实时监控功能

    return () => {
      batchProcessingService.removeEventListener(handleBatchEvent);
      // qualityMonitoringService.removeEventListener(handleQualityEvent); // 已删除实时监控功能
    };
  }, [state.examId]);

  // 初始化工作流
  const initializeWorkflow = useCallback(async (examId: string, config: PreGradingConfiguration) => {
    try {
      dispatch({ type: 'INITIALIZE', payload: { examId, config } });
      
      // 调用API初始化工作流
      const response = await preGradingApi.initializeWorkflow(examId, config);
      
      if (response.success && response.data) {
        setWorkflowId(response.data.workflowId);
        dispatch({ type: 'UPDATE_PROGRESS', payload: { stage: 'upload', progress: 0 } });
        message.success('阅卷前处理工作流初始化完成');
      } else {
        throw new Error(response.message || '初始化失败');
      }
    } catch (error) {
      message.error('工作流初始化失败');
      console.error('Workflow initialization error:', error);
      throw error;
    }
  }, []);

  // 上传答题卡
  const uploadAnswerSheets = useCallback(async (files: File[]): Promise<BatchProcessingResult> => {
    try {
      dispatch({ type: 'SET_STAGE', payload: { stage: 'upload' } });

      // 使用批处理服务进行上传
      const taskId = batchProcessingService.createTask('upload', {
        examId: state.examId,
        files,
        options: {
          enableQualityCheck: true,
          enableIdentityRecognition: true,
          qualityThreshold: state.configuration.qualityThreshold
        }
      }, {
        priority: 1,
        maxRetries: 3
      });

      // 监听任务进度
      const checkProgress = () => {
        const task = batchProcessingService.getTask(taskId);
        if (task) {
          const progress = Math.round((task.progress.completed / task.progress.total) * 100);
          dispatch({ type: 'UPDATE_PROGRESS', payload: { stage: 'upload', progress } });

          if (task.status === 'completed' && task.result) {
            message.success(`批量上传完成，共处理 ${task.result.successCount} 份答题卡`);
            
            // 更新质量监控 - 已删除实时监控功能
            // if (task.result.results.length > 0) {
            //   qualityMonitoringService.updateQualityStatistics(state.examId, task.result.results);
            // }

            // 自动开始处理流程
            if (state.configuration.autoProcessEnabled) {
              const sheetIds = task.result.results.map(s => s.id);
              if (sheetIds.length > 0) {
                processAnswerSheets(sheetIds);
              }
            }
            
            return task.result;
          } else if (task.status === 'failed') {
            throw new Error(task.error || '上传任务失败');
          }
        }
        return null;
      };

      // 轮询检查任务状态
      return new Promise<BatchProcessingResult>((resolve, reject) => {
        const interval = setInterval(() => {
          try {
            const result = checkProgress();
            if (result) {
              clearInterval(interval);
              resolve(result);
            }
          } catch (error) {
            clearInterval(interval);
            reject(error);
          }
        }, 1000);

        // 超时处理
        setTimeout(() => {
          clearInterval(interval);
          batchProcessingService.cancelTask(taskId);
          reject(new Error('上传任务超时'));
        }, 300000); // 5分钟超时
      });

    } catch (error) {
      message.error('答题卡上传失败');
      console.error('Upload error:', error);
      throw error;
    }
  }, [state.examId, state.configuration]);

  // 处理答题卡
  const processAnswerSheets = useCallback(async (sheetIds: string[]) => {
    try {
      dispatch({ type: 'SET_STAGE', payload: { stage: 'processing' } });

      // 创建多个并行处理任务
      const tasks = [
        // 质量分析任务
        batchProcessingService.createTask('quality_analysis', {
          examId: state.examId,
          sheetIds,
          options: {
            enableEnhancement: true,
            qualityThreshold: state.configuration.qualityThreshold
          }
        }, { priority: 2 }),

        // 身份识别任务
        batchProcessingService.createTask('identity_recognition', {
          examId: state.examId,
          sheetIds,
          options: {
            method: 'barcode' as const,
            confidenceThreshold: 0.8,
            enableManualVerification: state.configuration.identityVerificationRequired
          }
        }, { priority: 2 }),

        // 结构分析任务
        batchProcessingService.createTask('structure_analysis', {
          examId: state.examId,
          sheetIds,
          options: {
            templateId: 'default',
            enableAISegmentation: true,
            confidenceThreshold: 0.8
          }
        }, { priority: 2 })
      ];

      // 监听所有任务的进度
      const checkAllTasksProgress = () => {
        const taskResults = tasks.map(taskId => batchProcessingService.getTask(taskId));
        const completedTasks = taskResults.filter(task => task?.status === 'completed').length;
        const failedTasks = taskResults.filter(task => task?.status === 'failed').length;
        
        const progress = Math.round((completedTasks / tasks.length) * 100);
        dispatch({ type: 'UPDATE_PROGRESS', payload: { stage: 'processing', progress } });

        if (completedTasks === tasks.length) {
          message.success('答题卡处理完成');
          return true;
        } else if (failedTasks > 0) {
          const failedTask = taskResults.find(task => task?.status === 'failed');
          throw new Error(failedTask?.error || '处理任务失败');
        }
        return false;
      };

      // 等待所有任务完成
      await new Promise<void>((resolve, reject) => {
        const interval = setInterval(() => {
          try {
            if (checkAllTasksProgress()) {
              clearInterval(interval);
              resolve();
            }
          } catch (error) {
            clearInterval(interval);
            reject(error);
          }
        }, 1000);

        // 超时处理
        setTimeout(() => {
          clearInterval(interval);
          tasks.forEach(taskId => batchProcessingService.cancelTask(taskId));
          reject(new Error('处理任务超时'));
        }, 600000); // 10分钟超时
      });

    } catch (error) {
      message.error('答题卡处理失败');
      console.error('Processing error:', error);
      throw error;
    }
  }, [state.examId, state.configuration]);

  // 验证结果
  const validateResults = useCallback(async () => {
    try {
      dispatch({ type: 'SET_STAGE', payload: { stage: 'validation' } });

      // 调用API进行综合验证
      const response = await preGradingApi.validateAnswerSheets(state.examId, {
        qualityThreshold: state.configuration.qualityThreshold,
        identityVerificationRequired: state.configuration.identityVerificationRequired,
        structureValidationRequired: true
      });

      if (response.success && response.data) {
        const { validationReport } = response.data;
        
        // 更新统计信息
        dispatch({
          type: 'UPDATE_STATISTICS',
          payload: {
            verified: validationReport.validSheets,
            hasIssues: validationReport.invalidSheets
          }
        });

        dispatch({ type: 'UPDATE_PROGRESS', payload: { stage: 'validation', progress: 100 } });
        dispatch({ type: 'SET_STAGE', payload: { stage: 'completed' } });
        dispatch({ type: 'UPDATE_PROGRESS', payload: { stage: 'completed', progress: 100 } });

        if (validationReport.issues.length > 0) {
          message.warning(`验证完成，发现 ${validationReport.issues.length} 个问题需要处理`);
        } else {
          message.success('结果验证完成，可以开始阅卷');
        }
      } else {
        throw new Error(response.message || '验证失败');
      }
    } catch (error) {
      message.error('结果验证失败');
      console.error('Validation error:', error);
      throw error;
    }
  }, [state.examId, state.configuration]);

  // 重试处理
  const retryProcessing = useCallback(async (sheetId: string) => {
    try {
      // 调用API重新处理答题卡
      const response = await preGradingApi.retryProcessing(sheetId, {
        stage: 'all',
        forceReprocess: true
      });

      if (response.success && response.data) {
        const { jobId, estimatedTime } = response.data;
        
        // 更新答题卡状态
        dispatch({
          type: 'UPDATE_ANSWER_SHEET',
          payload: {
            sheetId,
            updates: {
              processingStatus: {
                stage: 'uploaded',
                progress: 0,
                lastProcessed: new Date().toISOString(),
                issues: [],
                retryCount: 1
              }
            }
          }
        });

        message.success(`重试处理已开始，预计需要 ${Math.round(estimatedTime / 1000)} 秒`);
        
        // 监听重试进度
        const checkRetryProgress = setInterval(async () => {
          try {
            // 这里可以添加获取重试进度的逻辑
            // const progressResponse = await preGradingApi.getProcessingProgress(jobId);
            // 更新进度...
          } catch (error) {
            console.error('Failed to check retry progress:', error);
            clearInterval(checkRetryProgress);
          }
        }, 2000);

        // 设置超时清理
        setTimeout(() => {
          clearInterval(checkRetryProgress);
        }, estimatedTime + 10000);

      } else {
        throw new Error(response.message || '重试处理失败');
      }
    } catch (error) {
      message.error('重试处理失败');
      console.error('Retry processing error:', error);
      throw error;
    }
  }, []);

  // 更新配置
  const updateConfiguration = useCallback(async (config: Partial<PreGradingConfiguration>) => {
    try {
      dispatch({ type: 'UPDATE_CONFIG', payload: config });
      
      // 如果有工作流ID，同步更新到服务器
      if (workflowId) {
        const response = await preGradingApi.updateWorkflowConfiguration(workflowId, config);
        if (!response.success) {
          throw new Error(response.message || '配置更新失败');
        }
      }

      // 更新质量监控配置 - 已删除实时监控功能
      // if (config.processing?.qualityThreshold) {
      //   qualityMonitoringService.updateConfig({
      //     alertThresholds: {
      //       ...qualityMonitoringService['config'].alertThresholds,
      //       overall_score: {
      //         min: config.processing.qualityThreshold || 0.7,
      //         warning: (config.processing.qualityThreshold || 0.7) + 0.1,
      //         critical: (config.processing.qualityThreshold || 0.7) + 0.2
      //       }
      //     }
      //  });
      // }
    } catch (error) {
      message.error('配置更新失败');
      console.error('Configuration update error:', error);
      throw error;
    }
  }, [workflowId]);

  // 重置工作流
  const resetWorkflow = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  // 工具函数
  const getStageProgress = useCallback((stage: PreGradingStage) => {
    return state.stages[stage].progress;
  }, [state.stages]);

  const getOverallProgress = useCallback(() => {
    const stages = Object.values(state.stages);
    const totalProgress = stages.reduce((sum, stage) => sum + stage.progress, 0);
    return Math.round(totalProgress / stages.length);
  }, [state.stages]);

  const getIssuesByType = useCallback((type: ProcessingIssue['type']) => {
    return state.answerSheets
      .flatMap(sheet => sheet.processingStatus.issues)
      .filter(issue => issue.type === type);
  }, [state.answerSheets]);

  const canProceedToNextStage = useCallback(() => {
    const currentStageData = state.stages[state.currentStage];
    return currentStageData.status === 'completed' && currentStageData.progress === 100;
  }, [state.currentStage, state.stages]);

  const exportResults = useCallback(async (format: 'json' | 'csv' | 'excel' = 'json'): Promise<Blob> => {
    try {
      // 调用API导出结果
      const response = await preGradingApi.exportResults(state.examId, format, {
        includeImages: false,
        includeStatistics: true,
        filterOptions: {}
      });

      if (response.success && response.data) {
        const { downloadUrl } = response.data;
        
        // 下载文件
        const fileResponse = await fetch(downloadUrl);
        if (!fileResponse.ok) {
          throw new Error('下载文件失败');
        }
        
        return await fileResponse.blob();
      } else {
        throw new Error(response.message || '导出失败');
      }
    } catch (error) {
      console.error('Export error:', error);
      // 降级到本地导出
      const data = JSON.stringify(state.answerSheets, null, 2);
      return new Blob([data], { type: 'application/json' });
    }
  }, [state.examId, state.answerSheets]);

  return {
    state,
    actions: {
      initializeWorkflow,
      uploadAnswerSheets,
      processAnswerSheets,
      validateResults,
      retryProcessing,
      updateConfiguration,
      resetWorkflow
    },
    utils: {
      getStageProgress,
      getOverallProgress,
      getIssuesByType,
      canProceedToNextStage,
      exportResults
    }
  };
};