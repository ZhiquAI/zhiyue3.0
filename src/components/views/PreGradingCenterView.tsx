import React, { useState, useEffect } from 'react';
import { Card, Steps, Button, Breadcrumb, Alert, Row, Col, Statistic, Progress, Tag, Empty, Modal, Space } from 'antd';
import { 
  CheckCircleOutlined, 
  UploadOutlined, 
  EyeOutlined, 
  SettingOutlined,
  TeamOutlined,
  SyncOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import { usePreGradingWorkflow } from '../../hooks/usePreGradingWorkflow';
import { Exam } from '../../types/exam';
import { PreGradingStage, PreGradingConfiguration } from '../../types/preGrading';
import { message } from '../../utils/message';
// 引入各阶段组件

import UploadStage from '../stages/UploadStage';
import EnhancedProcessingStage from '../stages/EnhancedProcessingStage';
import ValidationStage from '../stages/ValidationStage';

const { Step } = Steps;

interface PreGradingCenterViewProps {
  exam: Exam;
  onBack?: () => void;
  onComplete?: () => void;
}

const PreGradingCenterView: React.FC<PreGradingCenterViewProps> = ({ 
  exam, 
  onBack, 
  onComplete 
}) => {
  const { setCurrentView } = useAppContext();
  const { state, actions, utils } = usePreGradingWorkflow();
  const [showConfigModal, setShowConfigModal] = useState(false);

  // 工作流配置
  const [configuration, setConfiguration] = useState<PreGradingConfiguration>({
    exam: {
      id: exam.id,
      name: exam.name,
      subject: exam.subject,
      grade: exam.grade,
      questionCount: 25,
      objectiveQuestionCount: 20,
      subjectiveQuestionCount: 5
    },
    processing: {
      enableQualityEnhancement: true,
      qualityThreshold: 0.7,
      enableAutomaticCorrection: true,
      maxRetryAttempts: 3,
      batchSize: 10
    },
    identity: {
      verificationMethod: 'multiple',
      confidenceThreshold: 0.8,
      requireManualVerification: false,
      allowDuplicates: false
    },
    structure: {
      useTemplate: true,
      enableAISegmentation: true,
      segmentationConfidence: 0.8,
      questionTypes: ['choice', 'fill_blank', 'short_answer', 'essay']
    }
  });

  // 初始化工作流
  useEffect(() => {
    if (exam.id && !state.examId) {
      actions.initializeWorkflow(exam.id, configuration);
    }
  }, [exam.id, state.examId, actions, configuration]);

  // 处理配置更新
  const handleConfigurationUpdate = (newConfig: Partial<PreGradingConfiguration>) => {
    const updatedConfig = { ...configuration, ...newConfig };
    setConfiguration(updatedConfig);
    actions.updateConfiguration(updatedConfig);
  };

  // 完成工作流
  const handleWorkflowComplete = () => {
    if (state.currentStage === 'completed' || utils.canProceedToNextStage()) {
      message.success('阅卷前处理已完成，即将进入阅卷阶段');
      onComplete?.();
    } else {
      message.warning('请完成所有必要步骤后再继续');
    }
  };

  // 返回处理
  const handleBack = () => {
    Modal.confirm({
      title: '确认退出',
      content: '退出将丢失当前工作流进度，确定要退出吗？',
      okText: '确定退出',
      cancelText: '取消',
      onOk: () => {
        actions.resetWorkflow();
        onBack?.() || setCurrentView('examList');
      }
    });
  };

  // 工作流步骤定义
  const workflowSteps = [
    {
      key: 'upload' as PreGradingStage,
      title: '答题卡上传',
      description: '批量上传、质量检测、初步验证',
      icon: <UploadOutlined />,
      component: <UploadStage 
        examId={exam.id} 
        configuration={configuration}
        onComplete={actions.uploadAnswerSheets}
        onProgress={(progress) => {
          // 更新上传进度
          console.log('Upload progress:', progress);
        }}
      />
    },
    {
      key: 'processing' as PreGradingStage,
      title: '智能预处理',
      description: '图像校正、版面识别与切割、噪声处理与图像增强',
      icon: <SyncOutlined />,
      component: <EnhancedProcessingStage 
        answerSheets={state.answerSheets}
        configuration={configuration}
        onProcess={actions.processAnswerSheets}
        onProgress={(progress) => {
          // 更新处理进度
          console.log('Processing progress:', progress);
        }}
      />
    },
    {
      key: 'validation' as PreGradingStage,
      title: '数据验证',
      description: '结果确认、异常处理、质量保证',
      icon: <EyeOutlined />,
      component: <ValidationStage 
        answerSheets={state.answerSheets}
        onValidate={actions.validateResults}
        onRetry={actions.retryProcessing}
        onComplete={() => {
          // 完成验证，准备进入阅卷阶段
          handleWorkflowComplete();
        }}
      />
    }
  ];

  // 获取当前步骤索引
  const currentStepIndex = workflowSteps.findIndex(step => step.key === state.currentStage);

  // 处理步骤切换
  const handleStepChange = (stepIndex: number) => {
    const targetStep = workflowSteps[stepIndex];
    if (targetStep && stepIndex <= currentStepIndex + 1) {
      // 只允许前进到下一步或回到之前的步骤
      // TODO: 添加步骤切换逻辑
      message.info(`切换到：${targetStep.title}`);
    }
  };

  return (
    <div className="pre-grading-center">
      {/* 头部导航 */}
      <div className="mb-6">
        <Breadcrumb
          items={[
                         { title: <span style={{ cursor: 'pointer' }} onClick={handleBack}>考试管理</span> },
            { title: exam.name },
            { title: '阅卷前处理' }
          ]}
        />
      </div>

      {/* 工作流进度概览 */}
      <Card className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h2 className="text-xl font-bold m-0">阅卷前处理工作流</h2>
            <Tag color="blue">{exam.subject} · {exam.grade}</Tag>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              icon={<SettingOutlined />} 
              onClick={() => setShowConfigModal(true)}
            >
              配置
            </Button>
            <Button 
              type="primary" 
              icon={<CheckCircleOutlined />}
              onClick={handleWorkflowComplete}
              disabled={!utils.canProceedToNextStage()}
            >
              完成并进入阅卷
            </Button>
          </div>
        </div>

        {/* 总体进度 */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">总体进度</span>
            <span className="text-lg font-semibold text-blue-600">{utils.getOverallProgress()}%</span>
          </div>
        </div>


      </Card>



      {/* 问题提醒 */}
      {utils.getIssuesByType('error').length > 0 && (
        <Alert
          message="检测到处理错误"
          description={`${utils.getIssuesByType('error').length} 个错误需要处理`}
          type="error"
          icon={<ExclamationCircleOutlined />}
          showIcon
          className="mb-6"
        />
      )}

      {utils.getIssuesByType('warning').length > 0 && (
        <Alert
          message="检测到警告信息"
          description={`${utils.getIssuesByType('warning').length} 个警告需要关注`}
          type="warning"
          showIcon
          className="mb-6"
        />
      )}

      {/* 当前阶段内容 */}
      <Card 
        title={
          <div className="flex items-center gap-2">
            {workflowSteps[currentStepIndex]?.icon}
            <span>{workflowSteps[currentStepIndex]?.title}</span>
            <Tag color="processing">
              {utils.getStageProgress(state.currentStage)}%
            </Tag>
          </div>
        }
        extra={
          <Space>
            {currentStepIndex > 0 && (
              <Button onClick={() => handleStepChange(currentStepIndex - 1)}>
                上一步
              </Button>
            )}
            {currentStepIndex < workflowSteps.length - 1 && utils.canProceedToNextStage() && (
              <Button type="primary" onClick={() => handleStepChange(currentStepIndex + 1)}>
                下一步
              </Button>
            )}
          </Space>
        }
      >
        {workflowSteps[currentStepIndex]?.component || (
          <Empty description="当前阶段组件正在开发中" />
        )}
      </Card>

      {/* 配置模态框 */}
      <Modal
        title="阅卷前处理配置"
        open={showConfigModal}
        onCancel={() => setShowConfigModal(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowConfigModal(false)}>
            取消
          </Button>,
          <Button
            key="save"
            type="primary"
            onClick={() => {
              message.success('配置已保存');
              setShowConfigModal(false);
            }}
          >
            保存配置
          </Button>
        ]}
        width={800}
      >
        <div className="space-y-6">
          {/* 配置内容将在后续实现 */}
          <Alert
            message="配置功能"
            description="详细的配置选项将在后续版本中实现"
            type="info"
            showIcon
          />
        </div>
      </Modal>
    </div>
  );
};

export default PreGradingCenterView;