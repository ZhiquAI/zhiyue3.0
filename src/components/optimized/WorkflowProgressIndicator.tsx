import React, { useMemo } from 'react';
import { Steps, Progress, Typography, Tooltip, Badge } from 'antd';
import { 
  UploadOutlined,
  ScanOutlined,
  CheckCircleOutlined,
  EditOutlined,
  BarChartOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { cn, layout } from '../../design-system';

const { Step } = Steps;
const { Text } = Typography;

interface WorkflowStage {
  id: string;
  title: string;
  description: string;
  status: 'wait' | 'process' | 'finish' | 'error';
  progress?: number;
  index: number;
}

interface WorkflowProgress {
  overall: number;
  currentStage: number;
  processed: number;
  total: number;
  speed: number;
  status: 'normal' | 'exception' | 'active' | 'success';
}

interface WorkflowProgressIndicatorProps {
  currentStage: WorkflowStage;
  progress: WorkflowProgress;
  onStageClick: (stage: WorkflowStage) => void;
  compact?: boolean;
}

const getStageIcon = (stageId: string) => {
  const iconMap = {
    upload: <UploadOutlined />,
    preprocessing: <ScanOutlined />,
    validation: <CheckCircleOutlined />,
    grading: <EditOutlined />,
    review: <FileTextOutlined />,
    analysis: <BarChartOutlined />
  };
  return iconMap[stageId] || <CheckCircleOutlined />;
};

const getStageColor = (status: string) => {
  const colorMap = {
    wait: 'var(--color-neutral-300)',
    process: 'var(--color-primary-500)',
    finish: 'var(--color-success-500)',
    error: 'var(--color-error-500)'
  };
  return colorMap[status] || 'var(--color-neutral-300)';
};

export const WorkflowProgressIndicator: React.FC<WorkflowProgressIndicatorProps> = ({
  currentStage,
  progress,
  onStageClick,
  compact = false
}) => {
  // 模拟工作流阶段数据
  const stages = useMemo<WorkflowStage[]>(() => [
    {
      id: 'upload',
      title: '文件上传',
      description: '上传答题卡文件',
      status: currentStage.index > 0 ? 'finish' : currentStage.index === 0 ? 'process' : 'wait',
      progress: currentStage.index > 0 ? 100 : currentStage.index === 0 ? progress.currentStage : 0,
      index: 0
    },
    {
      id: 'preprocessing',
      title: '智能预处理',
      description: 'OCR识别和图像处理',
      status: currentStage.index > 1 ? 'finish' : currentStage.index === 1 ? 'process' : 'wait',
      progress: currentStage.index > 1 ? 100 : currentStage.index === 1 ? progress.currentStage : 0,
      index: 1
    },
    {
      id: 'validation',
      title: '数据验证',
      description: '验证处理结果',
      status: currentStage.index > 2 ? 'finish' : currentStage.index === 2 ? 'process' : 'wait',
      progress: currentStage.index > 2 ? 100 : currentStage.index === 2 ? progress.currentStage : 0,
      index: 2
    },
    {
      id: 'grading',
      title: '智能阅卷',
      description: 'AI评分和批量处理',
      status: currentStage.index > 3 ? 'finish' : currentStage.index === 3 ? 'process' : 'wait',
      progress: currentStage.index > 3 ? 100 : currentStage.index === 3 ? progress.currentStage : 0,
      index: 3
    },
    {
      id: 'review',
      title: '质量复核',
      description: '复核评分结果',
      status: currentStage.index > 4 ? 'finish' : currentStage.index === 4 ? 'process' : 'wait',
      progress: currentStage.index > 4 ? 100 : currentStage.index === 4 ? progress.currentStage : 0,
      index: 4
    },
    {
      id: 'analysis',
      title: '数据分析',
      description: '生成分析报告',
      status: currentStage.index > 5 ? 'finish' : currentStage.index === 5 ? 'process' : 'wait',
      progress: currentStage.index > 5 ? 100 : currentStage.index === 5 ? progress.currentStage : 0,
      index: 5
    }
  ], [currentStage.index, progress.currentStage]);

  if (compact) {
    return (
      <div className="workflow-progress-compact">
        <div className={cn(layout.flex.center(), "gap-4")}>
          <Text strong className="text-neutral-800">{currentStage.title}</Text>
          <Progress
            percent={progress.overall}
            size="small"
            style={{ flex: 1, maxWidth: '200px' }}
          />
          <Text type="secondary" className="text-neutral-600">
            {progress.processed}/{progress.total}
          </Text>
        </div>
      </div>
    );
  }

  return (
    <div className="workflow-progress-indicator">
      {/* 主要工作流步骤 */}
      <div style={{ marginBottom: '16px' }}>
        <Steps 
          current={currentStage.index} 
          className="workflow-steps"
          size="small"
        >
          {stages.map(stage => (
            <Step
              key={stage.id}
              title={stage.title}
              description={stage.description}
              status={stage.status}
              icon={
                <Badge 
                  count={stage.status === 'process' ? stage.progress : 0}
                  showZero={false}
                  style={{ backgroundColor: getStageColor(stage.status) }}
                >
                  {getStageIcon(stage.id)}
                </Badge>
              }
              onClick={() => onStageClick(stage)}
              className={`stage-${stage.id} ${stage.status === 'process' ? 'stage-active' : ''}`}
              style={{ cursor: 'pointer' }}
            />
          ))}
        </Steps>
      </div>

      {/* 详细进度信息 */}
      <div className={cn("progress-details", layout.flex.center(), "gap-6", "flex-wrap")}>
        {/* 整体进度 */}
        <div style={{ minWidth: '200px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>整体进度</Text>
          <Progress
            percent={progress.overall}
            size="small"
            showInfo={true}
            status={progress.status}
            strokeColor={{
              '0%': 'var(--color-primary-500)',
              '100%': 'var(--color-success-500)',
            }}
          />
        </div>

        {/* 当前阶段进度 */}
        <div style={{ minWidth: '200px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {currentStage.title}进度
          </Text>
          <Progress
            percent={progress.currentStage}
            size="small"
            showInfo={true}
            status={progress.status === 'exception' ? 'exception' : 'active'}
          />
        </div>

        {/* 处理统计 */}
        <div className={cn(layout.flex.center(), "gap-4")}>
          <Tooltip title="已处理/总数量">
            <Text>
              <span className="text-success-500 font-bold">
                {progress.processed}
              </span>
              <span className="mx-1">/</span>
              <span className="text-primary-500 font-bold">
                {progress.total}
              </span>
            </Text>
          </Tooltip>

          <Tooltip title="处理速度">
            <Text type="secondary">
              {progress.speed} 份/分钟
            </Text>
          </Tooltip>

          {/* 预计剩余时间 */}
          {progress.speed > 0 && progress.processed < progress.total && (
            <Tooltip title="预计剩余时间">
              <Text type="secondary">
                预计还需 {Math.ceil((progress.total - progress.processed) / progress.speed)} 分钟
              </Text>
            </Tooltip>
          )}
        </div>
      </div>

      {/* 当前阶段详细信息 */}
      {currentStage && (
        <div className={cn("current-stage-info", "mt-3 p-3 bg-neutral-100 rounded-md")}>
          <Text className="text-xs text-neutral-700">
            <span className="font-bold">当前阶段：</span>
            {currentStage.description}
          </Text>
        </div>
      )}
    </div>
  );
};

export default WorkflowProgressIndicator;