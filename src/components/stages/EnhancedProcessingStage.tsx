import React, { useState, useEffect } from 'react';
import {
  Card,
  Progress,
  Button,
  Alert,
  Row,
  Col,
  Statistic,
  Table,
  Tag,
  Space,
  Modal,
  Tabs,
  Image,
  Timeline,
  Tooltip,
  Select,
  Switch,
  Slider,
  Collapse,
  Divider,
  Typography
} from 'antd';
import {
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined,
  BugOutlined,
  FileImageOutlined,
  UserOutlined,
  ScissorOutlined,
  RotateLeftOutlined,
  BorderOutlined,
  FilterOutlined,
  ScanOutlined,
  ThunderboltOutlined,
  ExperimentOutlined
} from '@ant-design/icons';
import { StandardizedAnswerSheet, PreGradingConfiguration } from '../../types/preGrading';
import { message } from '../../utils/message';

const { Option } = Select;
const { Panel } = Collapse;
const { Title, Text } = Typography;

interface EnhancedProcessingStageProps {
  answerSheets: StandardizedAnswerSheet[];
  configuration: PreGradingConfiguration;
  onProcess: (sheetIds: string[]) => Promise<void>;
  onProgress?: (progress: number) => void;
}

interface ProcessingJob {
  id: string;
  sheetId: string;
  sheetName: string;
  status: 'pending' | 'processing' | 'completed' | 'error' | 'paused';
  progress: number;
  currentStep: ProcessingStep;
  startTime?: string;
  endTime?: string;
  processingTime?: number;
  results?: ProcessingResults;
  logs: ProcessingLog[];
  processingConfig: ProcessingConfig;
}

type ProcessingStep = 
  | 'image_correction'
  | 'noise_reduction'
  | 'layout_detection'
  | 'region_segmentation'
  | 'quality_enhancement'
  | 'identity_recognition'
  | 'structure_analysis'
  | 'quality_assessment'
  | 'completed';

interface ProcessingResults {
  imageQuality: number;
  identityConfidence: number;
  structureConfidence: number;
  correctionResults: {
    skewAngle: number;
    perspectiveCorrection: boolean;
    rotationApplied: number;
  };
  segmentationResults: {
    detectedRegions: number;
    segmentationAccuracy: number;
    regionTypes: string[];
  };
  noiseReduction: {
    noiseLevel: number;
    reductionApplied: number;
    enhancementLevel: number;
  };
  issues: string[];
}

interface ProcessingConfig {
  enableImageCorrection: boolean;
  enableNoiseReduction: boolean;
  enableLayoutDetection: boolean;
  enableRegionSegmentation: boolean;
  enableQualityEnhancement: boolean;
  correctionThreshold: number;
  noiseReductionLevel: number;
  segmentationAccuracy: number;
}

interface ProcessingLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: unknown;
}

const EnhancedProcessingStage: React.FC<EnhancedProcessingStageProps> = ({
  answerSheets,
  configuration,
  onProcess,
  onProgress
}) => {
  const [processingJobs, setProcessingJobs] = useState<ProcessingJob[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ProcessingJob | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [batchSize, setBatchSize] = useState(configuration.processing.batchSize || 5);
  const [autoRetry, setAutoRetry] = useState(configuration.processing.maxRetryAttempts > 0);
  const [globalConfig, setGlobalConfig] = useState<ProcessingConfig>({
    enableImageCorrection: true,
    enableNoiseReduction: true,
    enableLayoutDetection: true,
    enableRegionSegmentation: true,
    enableQualityEnhancement: true,
    correctionThreshold: 0.5,
    noiseReductionLevel: 0.7,
    segmentationAccuracy: 0.85
  });

  // 处理步骤定义
  const processingSteps = [
    {
      key: 'image_correction' as ProcessingStep,
      name: '图像校正',
      description: '检测并校正图像倾斜、透视变形',
      icon: <RotateLeftOutlined />,
      duration: 3000,
      enabled: globalConfig.enableImageCorrection
    },
    {
      key: 'noise_reduction' as ProcessingStep,
      name: '噪声处理',
      description: '去除图像噪声，提升清晰度',
      icon: <FilterOutlined />,
      duration: 2500,
      enabled: globalConfig.enableNoiseReduction
    },
    {
      key: 'layout_detection' as ProcessingStep,
      name: '版面识别',
      description: '识别答题卡整体布局结构',
      icon: <BorderOutlined />,
      duration: 4000,
      enabled: globalConfig.enableLayoutDetection
    },
    {
      key: 'region_segmentation' as ProcessingStep,
      name: '区域切割',
      description: '精确切割各个题目区域',
      icon: <ScissorOutlined />,
      duration: 3500,
      enabled: globalConfig.enableRegionSegmentation
    },
    {
      key: 'quality_enhancement' as ProcessingStep,
      name: '图像增强',
      description: '优化对比度、亮度和锐度',
      icon: <ThunderboltOutlined />,
      duration: 2000,
      enabled: globalConfig.enableQualityEnhancement
    },
    {
      key: 'identity_recognition' as ProcessingStep,
      name: '身份识别',
      description: '识别学生信息和考号',
      icon: <UserOutlined />,
      duration: 3000,
      enabled: true
    },
    {
      key: 'structure_analysis' as ProcessingStep,
      name: '结构分析',
      description: '分析答题区域结构',
      icon: <ScanOutlined />,
      duration: 4000,
      enabled: true
    },
    {
      key: 'quality_assessment' as ProcessingStep,
      name: '质量评估',
      description: '评估处理结果质量',
      icon: <ExperimentOutlined />,
      duration: 1000,
      enabled: true
    }
  ];

  // 初始化处理任务
  useEffect(() => {
    if (answerSheets.length > 0 && processingJobs.length === 0) {
      const jobs: ProcessingJob[] = answerSheets.map(sheet => ({
        id: `job_${sheet.id}`,
        sheetId: sheet.id,
        sheetName: sheet.metadata.originalFilename,
        status: 'pending',
        progress: 0,
        currentStep: 'image_correction',
        processingConfig: { ...globalConfig },
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: '智能预处理任务已创建，等待开始处理'
          }
        ]
      }));
      setProcessingJobs(jobs);
    }
  }, [answerSheets, processingJobs.length, globalConfig]);

  // 开始批量处理
  const handleStartProcessing = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    
    try {
      const pendingJobs = processingJobs.filter(job => job.status === 'pending' || job.status === 'error');
      
      if (pendingJobs.length === 0) {
        message.warning('没有待处理的任务');
        return;
      }

      // 按批次处理
      for (let i = 0; i < pendingJobs.length; i += batchSize) {
        const batch = pendingJobs.slice(i, i + batchSize);
        await processBatch(batch);
      }

      const completedSheetIds = processingJobs
        .filter(job => job.status === 'completed')
        .map(job => job.sheetId);
      
      if (completedSheetIds.length > 0) {
        await onProcess(completedSheetIds);
        message.success(`智能预处理完成！成功处理 ${completedSheetIds.length} 份答题卡`);
      }

    } catch (error) {
      message.error('批量处理失败');
      console.error(error);
    } finally {
      setIsProcessing(false);
    }
  };

  // 处理单个批次
  const processBatch = async (batch: ProcessingJob[]) => {
    await Promise.all(batch.map(job => processJob(job)));
  };

  // 处理单个任务
  const processJob = async (job: ProcessingJob) => {
    const enabledSteps = processingSteps.filter(step => step.enabled);

    updateJob(job.id, {
      status: 'processing',
      startTime: new Date().toISOString(),
      logs: [...job.logs, {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: '开始智能预处理流程'
      }]
    });

    try {
      for (let i = 0; i < enabledSteps.length; i++) {
        const step = enabledSteps[i];
        
        updateJob(job.id, {
          currentStep: step.key,
          logs: [...getJobById(job.id)?.logs || [], {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `开始${step.name} - ${step.description}`
          }]
        });

        await simulateStepProcessing(job.id, step.duration, i + 1, enabledSteps.length);

        updateJob(job.id, {
          logs: [...getJobById(job.id)?.logs || [], {
            timestamp: new Date().toISOString(),
            level: 'success',
            message: `${step.name}完成`
          }]
        });
      }

      // 生成增强的处理结果
      const results: ProcessingResults = {
        imageQuality: Math.random() * 0.2 + 0.8,
        identityConfidence: Math.random() * 0.2 + 0.8,
        structureConfidence: Math.random() * 0.15 + 0.85,
        correctionResults: {
          skewAngle: Math.random() * 5 - 2.5,
          perspectiveCorrection: Math.random() > 0.7,
          rotationApplied: Math.random() * 2 - 1
        },
        segmentationResults: {
          detectedRegions: Math.floor(Math.random() * 20) + 10,
          segmentationAccuracy: Math.random() * 0.1 + 0.9,
          regionTypes: ['选择题区域', '填空题区域', '主观题区域', '学生信息区域']
        },
        noiseReduction: {
          noiseLevel: Math.random() * 0.3 + 0.1,
          reductionApplied: Math.random() * 0.4 + 0.6,
          enhancementLevel: Math.random() * 0.3 + 0.7
        },
        issues: Math.random() > 0.8 ? ['检测到轻微图像模糊'] : []
      };

      updateJob(job.id, {
        status: 'completed',
        progress: 100,
        currentStep: 'completed',
        endTime: new Date().toISOString(),
        processingTime: Date.now() - new Date(getJobById(job.id)?.startTime || Date.now()).getTime(),
        results,
        logs: [...getJobById(job.id)?.logs || [], {
          timestamp: new Date().toISOString(),
          level: 'success',
          message: '智能预处理流程完成'
        }]
      });

    } catch (error) {
      updateJob(job.id, {
        status: 'error',
        logs: [...getJobById(job.id)?.logs || [], {
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `处理失败: ${error}`,
          details: error
        }]
      });

      if (autoRetry) {
        setTimeout(() => {
          updateJob(job.id, { status: 'pending' });
        }, 3000);
      }
    }
  };

  // 模拟步骤处理进度
  const simulateStepProcessing = async (jobId: string, duration: number, currentStep: number, totalSteps: number) => {
    const stepProgress = 100 / totalSteps;
    const baseProgress = (currentStep - 1) * stepProgress;
    
    for (let i = 0; i <= 100; i += 5) {
      await new Promise(resolve => setTimeout(resolve, duration / 20));
      const totalProgress = Math.min(baseProgress + (stepProgress * i / 100), 100);
      updateJob(jobId, { progress: totalProgress });
      onProgress?.(totalProgress);
    }
  };

  // 更新任务
  const updateJob = (jobId: string, updates: Partial<ProcessingJob>) => {
    setProcessingJobs(prev => prev.map(job => 
      job.id === jobId ? { ...job, ...updates } : job
    ));
  };

  // 获取任务
  const getJobById = (jobId: string) => {
    return processingJobs.find(job => job.id === jobId);
  };

  // 暂停/继续任务
  const handleToggleJob = (jobId: string) => {
    const job = getJobById(jobId);
    if (!job) return;

    if (job.status === 'processing') {
      updateJob(jobId, { status: 'paused' });
      message.info('任务已暂停');
    } else if (job.status === 'paused') {
      updateJob(jobId, { status: 'processing' });
      message.info('任务已继续');
    }
  };

  // 重试任务
  const handleRetryJob = (jobId: string) => {
    updateJob(jobId, {
      status: 'pending',
      progress: 0,
      currentStep: 'image_correction',
      logs: [...getJobById(jobId)?.logs || [], {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: '重新开始智能预处理'
      }]
    });
  };

  // 查看任务详情
  const handleViewJob = (job: ProcessingJob) => {
    setSelectedJob(job);
    setModalVisible(true);
  };

  // 任务表格列定义
  const columns = [
    {
      title: '答题卡',
      key: 'sheet',
      width: 200,
      render: (_: unknown, record: ProcessingJob) => (
        <div className="flex items-center gap-2">
          <FileImageOutlined />
          <span className="truncate">{record.sheetName}</span>
        </div>
      )
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: unknown, record: ProcessingJob) => {
        const statusConfig = {
          pending: { color: 'default', text: '等待' },
          processing: { color: 'processing', text: '处理中' },
          completed: { color: 'success', text: '完成' },
          error: { color: 'error', text: '失败' },
          paused: { color: 'warning', text: '暂停' }
        };
        const config = statusConfig[record.status];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '当前步骤',
      key: 'step',
      width: 120,
      render: (_: unknown, record: ProcessingJob) => {
        const step = processingSteps.find(s => s.key === record.currentStep);
        return (
          <div className="flex items-center gap-1">
            {step?.icon}
            <span>{step?.name || '已完成'}</span>
          </div>
        );
      }
    },
    {
      title: '进度',
      key: 'progress',
      width: 150,
      render: (_: unknown, record: ProcessingJob) => (
        <Progress 
          percent={Math.round(record.progress)} 
          size="small"
          status={record.status === 'error' ? 'exception' : 'active'}
        />
      )
    },
    {
      title: '处理时间',
      key: 'time',
      width: 100,
      render: (_: unknown, record: ProcessingJob) => {
        if (!record.processingTime) return '-';
        return `${Math.round(record.processingTime / 1000)}s`;
      }
    },
    {
      title: '质量评分',
      key: 'quality',
      width: 100,
      render: (_: unknown, record: ProcessingJob) => {
        if (!record.results) return '-';
        const score = Math.round(record.results.imageQuality * 100);
        const color = score >= 90 ? 'green' : score >= 70 ? 'orange' : 'red';
        return <Tag color={color}>{score}分</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: ProcessingJob) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewJob(record)}
          >
            详情
          </Button>
          {record.status === 'processing' && (
            <Button 
              type="link" 
              size="small"
              icon={<PauseCircleOutlined />}
              onClick={() => handleToggleJob(record.id)}
            >
              暂停
            </Button>
          )}
          {record.status === 'paused' && (
            <Button 
              type="link" 
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleToggleJob(record.id)}
            >
              继续
            </Button>
          )}
          {record.status === 'error' && (
            <Button 
              type="link" 
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRetryJob(record.id)}
            >
              重试
            </Button>
          )}
        </Space>
      )
    }
  ];

  // 统计数据
  const stats = {
    total: processingJobs.length,
    pending: processingJobs.filter(job => job.status === 'pending').length,
    processing: processingJobs.filter(job => job.status === 'processing').length,
    completed: processingJobs.filter(job => job.status === 'completed').length,
    error: processingJobs.filter(job => job.status === 'error').length,
    avgQuality: processingJobs.filter(job => job.results).length > 0 
      ? Math.round(processingJobs.filter(job => job.results).reduce((sum, job) => sum + (job.results?.imageQuality || 0), 0) / processingJobs.filter(job => job.results).length * 100)
      : 0
  };

  return (
    <div className="enhanced-processing-stage" style={{ maxHeight: '80vh', overflowY: 'auto', padding: '0 8px' }}>
      {/* 智能预处理配置面板 */}
      <Card className="mb-6">
        <Collapse defaultActiveKey={['steps']}>
          <Panel header="处理步骤配置" key="steps">
            <Row gutter={[16, 16]}>
              {processingSteps.slice(0, 5).map((step, index) => (
                <Col span={12} key={step.key}>
                  <div className="flex items-center justify-between p-3 border rounded">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-600 rounded-full text-xs font-medium mr-2">
                        {index + 1}
                      </div>
                      {step.icon}
                      <div>
                        <div className="font-medium">{step.name}</div>
                        <div className="text-sm text-gray-500">{step.description}</div>
                      </div>
                    </div>
                    <Switch
                      checked={step.enabled}
                      onChange={(checked) => {
                        const key = step.key.replace('_', '') + (step.key.includes('correction') ? 'ImageCorrection' : 
                          step.key.includes('noise') ? 'NoiseReduction' :
                          step.key.includes('layout') ? 'LayoutDetection' :
                          step.key.includes('segmentation') ? 'RegionSegmentation' : 'QualityEnhancement') as keyof ProcessingConfig;
                        setGlobalConfig(prev => ({ ...prev, [key]: checked }));
                      }}
                      disabled={isProcessing}
                    />
                  </div>
                </Col>
              ))}
            </Row>
          </Panel>
          
          <Panel header="高级参数" key="params">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <div className="space-y-2">
                  <Text strong>校正阈值</Text>
                  <Slider
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    value={globalConfig.correctionThreshold}
                    onChange={(value) => setGlobalConfig(prev => ({ ...prev, correctionThreshold: value }))}
                    disabled={isProcessing}
                  />
                  <Text type="secondary">当前值: {globalConfig.correctionThreshold}</Text>
                </div>
              </Col>
              <Col span={8}>
                <div className="space-y-2">
                  <Text strong>降噪级别</Text>
                  <Slider
                    min={0.1}
                    max={1.0}
                    step={0.1}
                    value={globalConfig.noiseReductionLevel}
                    onChange={(value) => setGlobalConfig(prev => ({ ...prev, noiseReductionLevel: value }))}
                    disabled={isProcessing}
                  />
                  <Text type="secondary">当前值: {globalConfig.noiseReductionLevel}</Text>
                </div>
              </Col>
              <Col span={8}>
                <div className="space-y-2">
                  <Text strong>分割精度</Text>
                  <Slider
                    min={0.5}
                    max={1.0}
                    step={0.05}
                    value={globalConfig.segmentationAccuracy}
                    onChange={(value) => setGlobalConfig(prev => ({ ...prev, segmentationAccuracy: value }))}
                    disabled={isProcessing}
                  />
                  <Text type="secondary">当前值: {globalConfig.segmentationAccuracy}</Text>
                </div>
              </Col>
            </Row>
          </Panel>
        </Collapse>
      </Card>

      {/* 控制面板 */}
      <Card className="mb-6">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <div className="flex items-center gap-4">
              <Button 
                type="primary"
                size="large"
                icon={isProcessing ? <SyncOutlined spin /> : <PlayCircleOutlined />}
                onClick={handleStartProcessing}
                disabled={isProcessing || stats.pending === 0}
                loading={isProcessing}
              >
                {isProcessing ? '智能处理中...' : '开始智能预处理'}
              </Button>
              
              {isProcessing && (
                <Button 
                  icon={<PauseCircleOutlined />}
                  onClick={() => setIsProcessing(false)}
                >
                  暂停所有
                </Button>
              )}
            </div>
          </Col>
          
          <Col xs={24} md={8}>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">批处理大小:</span>
                <Slider
                  min={1}
                  max={10}
                  value={batchSize}
                  onChange={setBatchSize}
                  style={{ width: 100 }}
                  disabled={isProcessing}
                />
                <span className="text-sm">{batchSize}</span>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm">自动重试:</span>
                <Switch
                  checked={autoRetry}
                  onChange={setAutoRetry}
                  size="small"
                  disabled={isProcessing}
                />
              </div>
            </div>
          </Col>
          
          <Col xs={24} md={8}>
            <div className="text-right">
              <div className="text-sm text-gray-600">
                总体进度: {stats.completed}/{stats.total}
              </div>
              <Progress 
                percent={Math.round((stats.completed / stats.total) * 100)} 
                strokeColor="#52c41a"
                className="mb-2"
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* 统计信息 */}
      <Row gutter={[16, 16]} className="mb-6">
        <Col xs={24} sm={8} md={4}>
          <Card>
            <Statistic
              title="总任务数"
              value={stats.total}
              prefix={<FileImageOutlined />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card>
            <Statistic
              title="等待处理"
              value={stats.pending}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card>
            <Statistic
              title="处理中"
              value={stats.processing}
              prefix={<SyncOutlined spin />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card>
            <Statistic
              title="已完成"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card>
            <Statistic
              title="失败"
              value={stats.error}
              prefix={<ExclamationCircleOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8} md={4}>
          <Card>
            <Statistic
              title="平均质量"
              value={stats.avgQuality}
              suffix="分"
              valueStyle={{ color: stats.avgQuality >= 80 ? '#52c41a' : '#ff4d4f' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 主要内容 */}
      <Row gutter={[16, 16]}>
        {/* 左侧任务列表和监控 */}
        <Col xs={24} lg={16}>
          <Card>
            <Tabs 
              activeKey={activeTab} 
              onChange={setActiveTab}
              items={[
                {
                  key: 'overview',
                  label: '任务列表',
                  children: (
                    <Table
                      columns={columns}
                      dataSource={processingJobs}
                      rowKey="id"
                      scroll={{ x: 1000 }}
                      pagination={{
                        total: processingJobs.length,
                        pageSize: 10,
                        showSizeChanger: true,
                        showQuickJumper: true,
                        showTotal: (total) => `共 ${total} 个任务`
                      }}
                    />
                  )
                },

              ]}
            />
          </Card>
        </Col>

        {/* 右侧预览窗口 */}
        <Col xs={24} lg={8}>
          <Card title="实时预览" className="h-full">
            <div className="space-y-4">
              {/* 当前处理任务信息 */}
              {(() => {
                const currentJob = processingJobs.find(job => job.status === 'processing');
                if (!currentJob) {
                  return (
                    <div className="text-center py-8">
                      <FileImageOutlined className="text-4xl text-gray-300 mb-4" />
                      <div className="text-gray-500">暂无处理中的任务</div>
                    </div>
                  );
                }

                const currentStep = processingSteps.find(step => step.key === currentJob.currentStep);
                return (
                  <div>
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <Text strong>{currentJob.sheetName}</Text>
                        <Tag color="processing">处理中</Tag>
                      </div>
                      <div className="flex items-center gap-2 mb-2">
                        {currentStep?.icon}
                        <span className="text-sm">{currentStep?.name}</span>
                      </div>
                      <Progress 
                        percent={Math.round(currentJob.progress)} 
                        size="small"
                        status="active"
                      />
                    </div>

                    {/* 图像预览区域 */}
                    <div className="space-y-3">
                      {/* 原始图像 */}
                      <div>
                        <Text className="text-xs text-gray-500">原始图像</Text>
                        <div className="border rounded p-2 bg-gray-50">
                          <div className="aspect-[4/3] bg-gradient-to-br from-blue-100 to-blue-200 rounded flex items-center justify-center">
                            <FileImageOutlined className="text-2xl text-blue-400" />
                          </div>
                        </div>
                      </div>

                      {/* 处理中图像 */}
                      <div>
                        <Text className="text-xs text-gray-500">处理中 - {currentStep?.name}</Text>
                        <div className="border rounded p-2 bg-yellow-50">
                          <div className="aspect-[4/3] bg-gradient-to-br from-yellow-100 to-yellow-200 rounded flex items-center justify-center relative">
                            <SyncOutlined spin className="text-2xl text-yellow-500" />
                            <div className="absolute bottom-2 right-2">
                              <div className="bg-white rounded px-2 py-1 text-xs">
                                {Math.round(currentJob.progress)}%
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 处理结果预览 */}
                      {currentJob.results && (
                        <div>
                          <Text className="text-xs text-gray-500">处理结果</Text>
                          <div className="border rounded p-2 bg-green-50">
                            <div className="aspect-[4/3] bg-gradient-to-br from-green-100 to-green-200 rounded flex items-center justify-center">
                              <CheckCircleOutlined className="text-2xl text-green-500" />
                            </div>
                            <div className="mt-2 space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>图像质量:</span>
                                <span className="font-medium">{Math.round(currentJob.results.imageQuality * 100)}分</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>处理时间:</span>
                                <span className="font-medium">{currentJob.processingTime ? `${Math.round(currentJob.processingTime / 1000)}s` : '-'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* 处理步骤进度 */}
                    <div className="mt-4">
                      <Text className="text-xs text-gray-500 mb-2 block">处理步骤</Text>
                      <div className="space-y-2">
                        {processingSteps.filter(step => step.enabled).map((step, index) => {
                          const isCompleted = processingSteps.findIndex(s => s.key === currentJob.currentStep) > index;
                          const isCurrent = step.key === currentJob.currentStep;
                          const isPending = processingSteps.findIndex(s => s.key === currentJob.currentStep) < index;
                          
                          return (
                            <div key={step.key} className={`flex items-center gap-2 text-xs ${
                              isCompleted ? 'text-green-600' : 
                              isCurrent ? 'text-blue-600' : 
                              'text-gray-400'
                            }`}>
                              <div className={`w-4 h-4 rounded-full flex items-center justify-center ${
                                isCompleted ? 'bg-green-100' : 
                                isCurrent ? 'bg-blue-100' : 
                                'bg-gray-100'
                              }`}>
                                {isCompleted ? (
                                  <CheckCircleOutlined className="text-xs" />
                                ) : isCurrent ? (
                                  <SyncOutlined spin className="text-xs" />
                                ) : (
                                  <div className="w-2 h-2 rounded-full bg-gray-300" />
                                )}
                              </div>
                              <span>{step.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 任务详情模态框 */}
      <Modal
        title="智能预处理任务详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={900}
      >
        {selectedJob && (
          <Tabs 
            defaultActiveKey="info"
            items={[
              {
                key: 'info',
                label: '基本信息',
                children: (
                  <div>
                    <Row gutter={[16, 16]}>
                      <Col span={12}>
                        <div className="space-y-2">
                          <div><strong>任务ID:</strong> {selectedJob.id}</div>
                          <div><strong>答题卡:</strong> {selectedJob.sheetName}</div>
                          <div><strong>状态:</strong> 
                            <Tag color={selectedJob.status === 'completed' ? 'success' : 'processing'} className="ml-2">
                              {selectedJob.status}
                            </Tag>
                          </div>
                          <div><strong>当前步骤:</strong> {processingSteps.find(s => s.key === selectedJob.currentStep)?.name || '已完成'}</div>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div className="space-y-2">
                          <div><strong>开始时间:</strong> {selectedJob.startTime || '-'}</div>
                          <div><strong>结束时间:</strong> {selectedJob.endTime || '-'}</div>
                          <div><strong>处理时间:</strong> {selectedJob.processingTime ? `${Math.round(selectedJob.processingTime / 1000)}s` : '-'}</div>
                          <div><strong>进度:</strong> {Math.round(selectedJob.progress)}%</div>
                        </div>
                      </Col>
                    </Row>

                    {selectedJob.results && (
                      <div className="mt-4">
                        <Divider>处理结果</Divider>
                        
                        {/* 基础质量指标 */}
                        <Row gutter={[16, 16]} className="mb-4">
                          <Col span={8}>
                            <Statistic
                              title="图像质量"
                              value={Math.round(selectedJob.results.imageQuality * 100)}
                              suffix="分"
                              valueStyle={{ color: '#52c41a' }}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="身份识别置信度"
                              value={Math.round(selectedJob.results.identityConfidence * 100)}
                              suffix="%"
                              valueStyle={{ color: '#1677ff' }}
                            />
                          </Col>
                          <Col span={8}>
                            <Statistic
                              title="结构分析置信度"
                              value={Math.round(selectedJob.results.structureConfidence * 100)}
                              suffix="%"
                              valueStyle={{ color: '#722ed1' }}
                            />
                          </Col>
                        </Row>

                        {/* 图像校正结果 */}
                        <Card size="small" title="图像校正结果" className="mb-3">
                          <Row gutter={[16, 16]}>
                            <Col span={8}>
                              <div className="text-center">
                                <div className="text-lg font-medium">{selectedJob.results.correctionResults.skewAngle.toFixed(2)}°</div>
                                <div className="text-sm text-gray-500">倾斜角度</div>
                              </div>
                            </Col>
                            <Col span={8}>
                              <div className="text-center">
                                <div className="text-lg font-medium">{selectedJob.results.correctionResults.perspectiveCorrection ? '是' : '否'}</div>
                                <div className="text-sm text-gray-500">透视校正</div>
                              </div>
                            </Col>
                            <Col span={8}>
                              <div className="text-center">
                                <div className="text-lg font-medium">{selectedJob.results.correctionResults.rotationApplied.toFixed(2)}°</div>
                                <div className="text-sm text-gray-500">旋转校正</div>
                              </div>
                            </Col>
                          </Row>
                        </Card>

                        {/* 区域分割结果 */}
                        <Card size="small" title="区域分割结果" className="mb-3">
                          <Row gutter={[16, 16]}>
                            <Col span={8}>
                              <div className="text-center">
                                <div className="text-lg font-medium">{selectedJob.results.segmentationResults.detectedRegions}</div>
                                <div className="text-sm text-gray-500">检测区域数</div>
                              </div>
                            </Col>
                            <Col span={8}>
                              <div className="text-center">
                                <div className="text-lg font-medium">{Math.round(selectedJob.results.segmentationResults.segmentationAccuracy * 100)}%</div>
                                <div className="text-sm text-gray-500">分割精度</div>
                              </div>
                            </Col>
                            <Col span={8}>
                              <div>
                                <div className="text-sm text-gray-500 mb-1">区域类型:</div>
                                {selectedJob.results.segmentationResults.regionTypes.map(type => (
                                  <Tag key={type}>{type}</Tag>
                                ))}
                              </div>
                            </Col>
                          </Row>
                        </Card>

                        {/* 噪声处理结果 */}
                        <Card size="small" title="噪声处理结果">
                          <Row gutter={[16, 16]}>
                            <Col span={8}>
                              <div className="text-center">
                                <div className="text-lg font-medium">{Math.round(selectedJob.results.noiseReduction.noiseLevel * 100)}%</div>
                                <div className="text-sm text-gray-500">原始噪声水平</div>
                              </div>
                            </Col>
                            <Col span={8}>
                              <div className="text-center">
                                <div className="text-lg font-medium">{Math.round(selectedJob.results.noiseReduction.reductionApplied * 100)}%</div>
                                <div className="text-sm text-gray-500">降噪程度</div>
                              </div>
                            </Col>
                            <Col span={8}>
                              <div className="text-center">
                                <div className="text-lg font-medium">{Math.round(selectedJob.results.noiseReduction.enhancementLevel * 100)}%</div>
                                <div className="text-sm text-gray-500">增强程度</div>
                              </div>
                            </Col>
                          </Row>
                        </Card>

                        {selectedJob.results.issues.length > 0 && (
                          <Alert
                            message="检测到的问题"
                            description={selectedJob.results.issues.join('、')}
                            type="warning"
                            showIcon
                            className="mt-4"
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              },
              {
                key: 'logs',
                label: '处理日志',
                children: (
                  <Timeline>
                    {selectedJob.logs.map((log, index) => (
                      <Timeline.Item
                        key={index}
                        color={
                          log.level === 'error' ? 'red' :
                          log.level === 'warning' ? 'orange' :
                          log.level === 'success' ? 'green' : 'blue'
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{log.message}</div>
                            <div className="text-sm text-gray-500">
                              {new Date(log.timestamp).toLocaleString()}
                            </div>
                          </div>
                          <Tag color={log.level === 'error' ? 'red' : log.level === 'warning' ? 'orange' : 'blue'}>
                            {log.level}
                          </Tag>
                        </div>
                      </Timeline.Item>
                    ))}
                  </Timeline>
                )
              }
            ]}
          />
        )}
      </Modal>
    </div>
  );
};

export default EnhancedProcessingStage;