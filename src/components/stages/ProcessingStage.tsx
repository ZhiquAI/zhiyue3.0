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
  Slider
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
  ScissorOutlined
} from '@ant-design/icons';
import { StandardizedAnswerSheet, PreGradingConfiguration } from '../../types/preGrading';
import { message } from '../../utils/message';

// 移除废弃的TabPane导入
const { Option } = Select;

interface ProcessingStageProps {
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
  currentStep: 'image_enhancement' | 'identity_recognition' | 'structure_analysis' | 'quality_assessment' | 'completed';
  startTime?: string;
  endTime?: string;
  processingTime?: number;
  results?: {
    imageQuality: number;
    identityConfidence: number;
    structureConfidence: number;
    issues: string[];
  };
  logs: ProcessingLog[];
}

interface ProcessingLog {
  timestamp: string;
  level: 'info' | 'warning' | 'error' | 'success';
  message: string;
  details?: unknown;
}

const ProcessingStage: React.FC<ProcessingStageProps> = ({
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

  // 初始化处理任务
  useEffect(() => {
    if (answerSheets.length > 0 && processingJobs.length === 0) {
      const jobs: ProcessingJob[] = answerSheets.map(sheet => ({
        id: `job_${sheet.id}`,
        sheetId: sheet.id,
        sheetName: sheet.metadata.originalFilename,
        status: 'pending',
        progress: 0,
        currentStep: 'image_enhancement',
        logs: [
          {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: '任务已创建，等待开始处理'
          }
        ]
      }));
      setProcessingJobs(jobs);
    }
  }, [answerSheets, processingJobs.length]);

  // 开始批量处理
  const handleStartProcessing = async () => {
    if (isProcessing) return;

    setIsProcessing(true);
    
    try {
      // 获取待处理的任务
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

      // 调用完成回调
      const completedSheetIds = processingJobs
        .filter(job => job.status === 'completed')
        .map(job => job.sheetId);
      
      if (completedSheetIds.length > 0) {
        await onProcess(completedSheetIds);
        message.success(`批量处理完成！成功处理 ${completedSheetIds.length} 份答题卡`);
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
    // 并行处理批次中的任务
    await Promise.all(batch.map(job => processJob(job)));
  };

  // 处理单个任务
  const processJob = async (job: ProcessingJob) => {
    const steps = [
      { key: 'image_enhancement', name: '图像增强', duration: 2000 },
      { key: 'identity_recognition', name: '身份识别', duration: 3000 },
      { key: 'structure_analysis', name: '结构分析', duration: 4000 },
      { key: 'quality_assessment', name: '质量评估', duration: 1000 }
    ];

    // 更新任务状态为处理中
    updateJob(job.id, {
      status: 'processing',
      startTime: new Date().toISOString(),
      logs: [...job.logs, {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: '开始处理答题卡'
      }]
    });

    try {
      for (let i = 0; i < steps.length; i++) {
        const step = steps[i];
        
        // 更新当前步骤
        updateJob(job.id, {
          currentStep: step.key as ProcessingJob['currentStep'],
          logs: [...getJobById(job.id)?.logs || [], {
            timestamp: new Date().toISOString(),
            level: 'info',
            message: `开始${step.name}`
          }]
        });

        // 模拟处理过程
        await simulateStepProcessing(job.id, step.duration, i + 1, steps.length);

        // 添加步骤完成日志
        updateJob(job.id, {
          logs: [...getJobById(job.id)?.logs || [], {
            timestamp: new Date().toISOString(),
            level: 'success',
            message: `${step.name}完成`
          }]
        });
      }

      // 生成处理结果
      const results = {
        imageQuality: Math.random() * 0.3 + 0.7,
        identityConfidence: Math.random() * 0.3 + 0.7,
        structureConfidence: Math.random() * 0.3 + 0.8,
        issues: Math.random() > 0.8 ? ['图像略有倾斜'] : []
      };

      // 任务完成
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
          message: '答题卡处理完成'
        }]
      });

    } catch (error) {
      // 处理失败
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
        // 自动重试逻辑
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
      currentStep: 'image_enhancement',
      logs: [...getJobById(jobId)?.logs || [], {
        timestamp: new Date().toISOString(),
        level: 'info',
        message: '重新开始处理'
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
        const stepNames = {
          image_enhancement: '图像增强',
          identity_recognition: '身份识别',
          structure_analysis: '结构分析',
          quality_assessment: '质量评估',
          completed: '已完成'
        };
        return stepNames[record.currentStep];
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
    <div className="processing-stage">
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
                {isProcessing ? '处理中...' : '开始批量处理'}
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

      {/* 任务详情模态框 */}
      <Modal
        title="任务详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={800}
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
                          <div><strong>当前步骤:</strong> {selectedJob.currentStep}</div>
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
                        <h4>处理结果</h4>
                        <Row gutter={[16, 16]}>
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

export default ProcessingStage;