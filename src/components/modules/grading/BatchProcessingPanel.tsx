import React, { useState } from 'react';
import {
  Card,
  Upload,
  Button,
  Table,
  Progress,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Alert,
  Steps,
  Select,
  Input,
  message
} from 'antd';
import {
  CloudUploadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  DownloadOutlined,
  FileExcelOutlined,
  FilePdfOutlined,
  ReloadOutlined
} from '@ant-design/icons';

const { Step } = Steps;
const { Option } = Select;
const { TextArea } = Input;

interface BatchJob {
  id: string;
  name: string;
  fileCount: number;
  processedCount: number;
  status: 'pending' | 'processing' | 'paused' | 'completed' | 'failed';
  progress: number;
  createdAt: string;
  estimatedTime: string;
  accuracy: number;
}

const BatchProcessingPanel: React.FC = () => {
  const [uploadedBatch, setUploadedBatch] = useState<any[]>([]);
  const [batchJobs, setBatchJobs] = useState<BatchJob[]>([
    {
      id: 'batch_001',
      name: '高三模拟考试批量阅卷',
      fileCount: 200,
      processedCount: 150,
      status: 'processing',
      progress: 75,
      createdAt: '2025-08-25 10:30:00',
      estimatedTime: '15分钟',
      accuracy: 97.2
    },
    {
      id: 'batch_002',
      name: '高二期中考试批量阅卷',
      fileCount: 180,
      processedCount: 180,
      status: 'completed',
      progress: 100,
      createdAt: '2025-08-24 14:20:00',
      estimatedTime: '0分钟',
      accuracy: 96.8
    }
  ]);
  const [processingSettings, setProcessingSettings] = useState({
    quality: 'high',
    parallel: 4,
    autoReview: true
  });

  const batchUploadProps = {
    name: 'files',
    multiple: true,
    directory: true, // 支持文件夹上传
    accept: '.jpg,.jpeg,.png,.pdf',
    beforeUpload: () => false,
    onChange: (info: any) => {
      setUploadedBatch(info.fileList);
    },
  };

  const handleStartBatchProcessing = () => {
    if (uploadedBatch.length === 0) {
      message.warning('请先上传文件');
      return;
    }

    const newJob: BatchJob = {
      id: `batch_${Date.now()}`,
      name: `批量处理任务 ${new Date().toLocaleString()}`,
      fileCount: uploadedBatch.length,
      processedCount: 0,
      status: 'processing',
      progress: 0,
      createdAt: new Date().toLocaleString(),
      estimatedTime: `${Math.ceil(uploadedBatch.length / 10)}分钟`,
      accuracy: 0
    };

    setBatchJobs([newJob, ...batchJobs]);
    simulateBatchProcessing(newJob.id);
    message.success('批量处理已开始');
  };

  const simulateBatchProcessing = (jobId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 5; // 更慢的进度模拟批量处理
      
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);
        
        setBatchJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { 
                ...job, 
                progress: 100, 
                status: 'completed' as const,
                processedCount: job.fileCount,
                accuracy: 96 + Math.random() * 3,
                estimatedTime: '0分钟'
              }
            : job
        ));
      } else {
        setBatchJobs(prev => prev.map(job => 
          job.id === jobId 
            ? { 
                ...job, 
                progress: Math.round(progress),
                processedCount: Math.round((progress / 100) * job.fileCount),
                estimatedTime: `${Math.ceil((100 - progress) / 5)}分钟`
              }
            : job
        ));
      }
    }, 2000); // 2秒更新一次
  };

  const handlePauseJob = (jobId: string) => {
    setBatchJobs(prev => prev.map(job => 
      job.id === jobId && job.status === 'processing'
        ? { ...job, status: 'paused' as const }
        : job
    ));
    message.info('批量处理已暂停');
  };

  const handleResumeJob = (jobId: string) => {
    setBatchJobs(prev => prev.map(job => 
      job.id === jobId && job.status === 'paused'
        ? { ...job, status: 'processing' as const }
        : job
    ));
    message.info('批量处理已恢复');
  };

  const handleStopJob = (jobId: string) => {
    setBatchJobs(prev => prev.map(job => 
      job.id === jobId 
        ? { ...job, status: 'failed' as const }
        : job
    ));
    message.warning('批量处理已停止');
  };

  const getStatusColor = (status: string) => {
    const colorMap = {
      pending: 'default',
      processing: 'blue',
      paused: 'warning',
      completed: 'success',
      failed: 'error'
    };
    return colorMap[status as keyof typeof colorMap] || 'default';
  };

  const getStatusText = (status: string) => {
    const textMap = {
      pending: '等待中',
      processing: '处理中',
      paused: '已暂停',
      completed: '已完成',
      failed: '已失败'
    };
    return textMap[status as keyof typeof textMap] || status;
  };

  const columns = [
    {
      title: '任务名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: BatchJob) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-sm text-gray-500">
            {record.fileCount} 个文件 · 创建于 {record.createdAt}
          </div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      )
    },
    {
      title: '处理进度',
      key: 'progress',
      render: (_: any, record: BatchJob) => (
        <div style={{ width: 150 }}>
          <Progress 
            percent={record.progress} 
            size="small"
            status={record.status === 'failed' ? 'exception' : 
                   record.status === 'completed' ? 'success' : 'active'}
          />
          <div className="text-xs text-gray-500 mt-1">
            {record.processedCount}/{record.fileCount} 
            {record.status === 'processing' && ` · 剩余${record.estimatedTime}`}
          </div>
        </div>
      )
    },
    {
      title: '准确率',
      dataIndex: 'accuracy',
      key: 'accuracy',
      render: (accuracy: number) => 
        accuracy > 0 ? `${accuracy.toFixed(1)}%` : '-'
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: BatchJob) => (
        <Space>
          {record.status === 'processing' && (
            <>
              <Button 
                size="small" 
                icon={<PauseCircleOutlined />}
                onClick={() => handlePauseJob(record.id)}
              >
                暂停
              </Button>
              <Button 
                size="small" 
                danger
                icon={<StopOutlined />}
                onClick={() => handleStopJob(record.id)}
              >
                停止
              </Button>
            </>
          )}
          {record.status === 'paused' && (
            <Button 
              size="small" 
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={() => handleResumeJob(record.id)}
            >
              继续
            </Button>
          )}
          {record.status === 'completed' && (
            <>
              <Button size="small" icon={<DownloadOutlined />}>
                下载结果
              </Button>
              <Button size="small" icon={<FileExcelOutlined />}>
                导出Excel
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  return (
    <div>
      {/* 批量处理统计 */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="处理队列"
              value={batchJobs.filter(j => j.status === 'processing' || j.status === 'pending').length}
              valueStyle={{ color: '#1890ff' }}
              prefix={<CloudUploadOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已完成"
              value={batchJobs.filter(j => j.status === 'completed').length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<FilePdfOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="总文件数"
              value={batchJobs.reduce((sum, job) => sum + job.fileCount, 0)}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="平均准确率"
              value={batchJobs.length > 0 
                ? batchJobs.reduce((sum, job) => sum + job.accuracy, 0) / batchJobs.length
                : 0
              }
              precision={1}
              suffix="%"
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={24} style={{ marginBottom: '24px' }}>
        {/* 批量上传 */}
        <Col span={16}>
          <Card title="批量文件上传" extra={<Tag color="blue">{uploadedBatch.length} 个文件</Tag>}>
            <Upload.Dragger {...batchUploadProps} style={{ marginBottom: '16px' }}>
              <p className="ant-upload-drag-icon">
                <CloudUploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件/文件夹到此区域</p>
              <p className="ant-upload-hint">
                支持批量上传整个文件夹，支持 JPG、PNG、PDF 格式
              </p>
            </Upload.Dragger>

            <Alert
              message="批量处理提示"
              description="批量处理适合大量答题卡的场景，系统会自动分配资源进行并行处理，提高处理效率。"
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Button 
              type="primary" 
              size="large"
              block
              disabled={uploadedBatch.length === 0}
              onClick={handleStartBatchProcessing}
              icon={<PlayCircleOutlined />}
            >
              开始批量处理 ({uploadedBatch.length} 个文件)
            </Button>
          </Card>
        </Col>

        {/* 处理设置 */}
        <Col span={8}>
          <Card title="处理设置">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">处理质量</label>
                <Select 
                  value={processingSettings.quality}
                  onChange={(value) => setProcessingSettings({...processingSettings, quality: value})}
                  style={{ width: '100%' }}
                >
                  <Option value="fast">快速模式</Option>
                  <Option value="standard">标准模式</Option>
                  <Option value="high">高精度模式</Option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">并行处理数</label>
                <Select 
                  value={processingSettings.parallel}
                  onChange={(value) => setProcessingSettings({...processingSettings, parallel: value})}
                  style={{ width: '100%' }}
                >
                  <Option value={2}>2个任务并行</Option>
                  <Option value={4}>4个任务并行</Option>
                  <Option value={8}>8个任务并行</Option>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">自动审核</label>
                <Select 
                  value={processingSettings.autoReview}
                  onChange={(value) => setProcessingSettings({...processingSettings, autoReview: value})}
                  style={{ width: '100%' }}
                >
                  <Option value={true}>启用自动审核</Option>
                  <Option value={false}>仅AI评分</Option>
                </Select>
              </div>

              <Alert
                message="高精度模式"
                description="处理速度较慢，但准确率更高，适合重要考试。"
                type="warning"
                showIcon
                size="small"
              />
            </div>
          </Card>
        </Col>
      </Row>

      {/* 批量任务列表 */}
      <Card title="批量处理任务">
        <Table
          dataSource={batchJobs}
          columns={columns}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
          }}
        />
      </Card>
    </div>
  );
};

export default BatchProcessingPanel;