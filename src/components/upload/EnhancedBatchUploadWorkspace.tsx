import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Row, 
  Col, 
  Upload, 
  Button, 
  Progress, 
  Table, 
  Tag, 
  Modal, 
  Space, 
  Alert, 
  Divider, 
  Statistic, 
  Steps,
  Tabs,
  Switch,
  InputNumber,
  Form,
  Select
} from 'antd';
import { 
  InboxOutlined, 
  FileImageOutlined, 
  CheckCircleOutlined, 
  ExclamationCircleOutlined,
  EyeOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ReloadOutlined
} from '@ant-design/icons';
import { message } from '../../utils/message';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { Exam } from '../../types/exam';

const { Dragger } = Upload;
const { Step } = Steps;
const { TabPane } = Tabs;
const { Option } = Select;

interface EnhancedBatchUploadWorkspaceProps {
  exam: Exam;
  onComplete?: (results: any) => void;
}

interface BatchUploadResult {
  batch_id: string;
  upload_summary: {
    total_files: number;
    success_count: number;
    failed_count: number;
    success_rate: number;
  };
  upload_results: UploadResult[];
  processing_status: string;
}

interface UploadResult {
  sheet_id: string;
  original_filename: string;
  file_size: number;
  mime_type: string;
  upload_status: 'success' | 'failed';
  error_message?: string;
}

interface ProcessingConfig {
  auto_process: boolean;
  max_concurrent: number;
  confidence_threshold: number;
  enable_quality_check: boolean;
  enable_manual_review: boolean;
  processing_stages: {
    preprocessing: boolean;
    student_info_recognition: boolean;
    question_segmentation: boolean;
    answer_extraction: boolean;
    grading: boolean;
    quality_check: boolean;
  };
}

interface BatchStatus {
  batch_id: string;
  overall_status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: {
    total_files: number;
    completed_files: number;
    processing_files: number;
    failed_files: number;
    pending_files: number;
    completion_percentage: number;
  };
  processing_stages: Record<string, number>;
  estimated_completion_time?: string;
  error_summary?: {
    total_errors: number;
    error_types: Record<string, number>;
  };
}

const EnhancedBatchUploadWorkspace: React.FC<EnhancedBatchUploadWorkspaceProps> = ({
  exam,
  onComplete
}) => {
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BatchUploadResult | null>(null);
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [processingConfig, setProcessingConfig] = useState<ProcessingConfig>({
    auto_process: true,
    max_concurrent: 3,
    confidence_threshold: 0.8,
    enable_quality_check: true,
    enable_manual_review: true,
    processing_stages: {
      preprocessing: true,
      student_info_recognition: true,
      question_segmentation: true,
      answer_extraction: true,
      grading: true,
      quality_check: true
    }
  });
  
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [previewTitle, setPreviewTitle] = useState('');
  const [configVisible, setConfigVisible] = useState(false);
  const [statusPolling, setStatusPolling] = useState(false);

  // 文件上传配置
  const uploadProps: UploadProps = {
    name: 'files',
    multiple: true,
    accept: '.pdf,.jpg,.jpeg,.png,.tiff',
    beforeUpload: () => false, // 阻止自动上传
    onChange: (info) => {
      setFileList(info.fileList);
    },
    onPreview: handlePreview,
    listType: 'picture-card',
    showUploadList: {
      showPreviewIcon: true,
      showRemoveIcon: true,
      showDownloadIcon: false
    }
  };

  async function handlePreview(file: UploadFile) {
    if (!file.url && !file.preview) {
      file.preview = await getBase64(file.originFileObj as File);
    }
    setPreviewImage(file.url || file.preview || '');
    setPreviewVisible(true);
    setPreviewTitle(file.name || file.url!.substring(file.url!.lastIndexOf('/') + 1));
  }

  const getBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });

  const handleBatchUpload = async () => {
    if (fileList.length === 0) {
      message.warning('请选择要上传的文件');
      return;
    }

    if (fileList.length > 50) {
      message.error('单次最多上传50个文件');
      return;
    }

    setUploading(true);
    setCurrentStep(1);

    try {
      const formData = new FormData();
      formData.append('exam_id', exam.id);
      formData.append('processing_config', JSON.stringify(processingConfig));
      formData.append('auto_process', processingConfig.auto_process.toString());
      formData.append('max_concurrent', processingConfig.max_concurrent.toString());

      fileList.forEach((file) => {
        if (file.originFileObj) {
          formData.append('files', file.originFileObj);
        }
      });

      const response = await fetch('/api/batch-upload/answer-sheets', {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setUploadResult(result.data);
        setCurrentStep(2);
        message.success(`批量上传完成，成功上传 ${result.data.upload_summary.success_count} 个文件`);
        
        if (result.data.processing_status === 'started') {
          setCurrentStep(3);
          startStatusPolling(result.data.batch_id);
        }
      } else {
        throw new Error(result.message || '上传失败');
      }
    } catch (error) {
      message.error(`批量上传失败: ${error}`);
      setCurrentStep(0);
    } finally {
      setUploading(false);
    }
  };

  const startStatusPolling = (batchId: string) => {
    setStatusPolling(true);
    
    const pollStatus = async () => {
      try {
        const response = await fetch(`/api/batch-upload/batch-status/${batchId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        const result = await response.json();
        
        if (result.success) {
          setBatchStatus(result.data);
          
          if (result.data.overall_status === 'completed' || result.data.overall_status === 'failed') {
            setStatusPolling(false);
            setCurrentStep(4);
            if (result.data.overall_status === 'completed') {
              message.success('批次处理完成');
              if (onComplete) {
                onComplete(result.data);
              }
            } else {
              message.error('批次处理失败');
            }
          }
        }
      } catch (error) {
        console.error('状态轮询失败:', error);
      }
    };

    // 立即执行一次
    pollStatus();
    
    // 设置定时轮询
    const interval = setInterval(pollStatus, 2000);
    
    // 清理函数
    return () => {
      clearInterval(interval);
      setStatusPolling(false);
    };
  };

  const handleStartProcessing = async () => {
    if (!uploadResult) return;

    try {
      const response = await fetch(`/api/batch-upload/process-batch/${uploadResult.batch_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          processing_config: JSON.stringify(processingConfig),
          max_concurrent: processingConfig.max_concurrent
        })
      });

      const result = await response.json();

      if (result.success) {
        setCurrentStep(3);
        startStatusPolling(uploadResult.batch_id);
        message.success('开始处理批次');
      } else {
        throw new Error(result.message || '启动处理失败');
      }
    } catch (error) {
      message.error(`启动处理失败: ${error}`);
    }
  };

  const renderUploadArea = () => (
    <Card title="批量上传答题卡" style={{ marginBottom: 16 }}>
      <Row gutter={16}>
        <Col span={18}>
          <Dragger {...uploadProps} style={{ marginBottom: 16 }}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到这里上传</p>
            <p className="ant-upload-hint">
              支持单个或批量上传，支持 PDF、JPG、PNG、TIFF 格式，单个文件最大20MB
            </p>
          </Dragger>
          
          {fileList.length > 0 && (
            <Alert
              message={`已选择 ${fileList.length} 个文件`}
              description={`总大小: ${(fileList.reduce((acc, file) => acc + (file.size || 0), 0) / 1024 / 1024).toFixed(2)} MB`}
              type="info"
              style={{ marginBottom: 16 }}
            />
          )}
        </Col>
        
        <Col span={6}>
          <Card size="small" title="上传设置">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <span>自动处理: </span>
                <Switch
                  checked={processingConfig.auto_process}
                  onChange={(checked) => 
                    setProcessingConfig(prev => ({ ...prev, auto_process: checked }))
                  }
                />
              </div>
              <div>
                <span>并发数: </span>
                <InputNumber
                  min={1}
                  max={10}
                  value={processingConfig.max_concurrent}
                  onChange={(value) => 
                    setProcessingConfig(prev => ({ ...prev, max_concurrent: value || 3 }))
                  }
                  size="small"
                />
              </div>
              <Button
                type="link"
                icon={<SettingOutlined />}
                onClick={() => setConfigVisible(true)}
                size="small"
              >
                高级设置
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
      
      <Space>
        <Button
          type="primary"
          onClick={handleBatchUpload}
          disabled={fileList.length === 0 || uploading}
          loading={uploading}
          size="large"
        >
          开始批量上传
        </Button>
        <Button onClick={() => setFileList([])} disabled={uploading}>
          清空文件
        </Button>
      </Space>
    </Card>
  );

  const renderUploadResults = () => {
    if (!uploadResult) return null;

    const columns = [
      {
        title: '文件名',
        dataIndex: 'original_filename',
        key: 'filename',
        render: (text: string, record: UploadResult) => (
          <Space>
            <FileImageOutlined />
            <span title={text}>{text.length > 30 ? text.substring(0, 30) + '...' : text}</span>
          </Space>
        )
      },
      {
        title: '文件大小',
        dataIndex: 'file_size',
        key: 'size',
        render: (size: number) => `${(size / 1024 / 1024).toFixed(2)} MB`
      },
      {
        title: '上传状态',
        dataIndex: 'upload_status',
        key: 'status',
        render: (status: string) => (
          <Tag color={status === 'success' ? 'green' : 'red'}>
            {status === 'success' ? '上传成功' : '上传失败'}
          </Tag>
        )
      },
      {
        title: '错误信息',
        dataIndex: 'error_message',
        key: 'error',
        render: (error: string) => error ? (
          <Tag color="red">{error}</Tag>
        ) : '-'
      }
    ];

    return (
      <Card title="上传结果" style={{ marginBottom: 16 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic
              title="总文件数"
              value={uploadResult.upload_summary.total_files}
              prefix={<FileImageOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="上传成功"
              value={uploadResult.upload_summary.success_count}
              valueStyle={{ color: '#3f8600' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="上传失败"
              value={uploadResult.upload_summary.failed_count}
              valueStyle={{ color: '#cf1322' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="成功率"
              value={uploadResult.upload_summary.success_rate * 100}
              suffix="%"
              precision={1}
              valueStyle={{ 
                color: uploadResult.upload_summary.success_rate > 0.8 ? '#3f8600' : '#cf1322' 
              }}
            />
          </Col>
        </Row>
        
        <Table
          dataSource={uploadResult.upload_results}
          columns={columns}
          rowKey="original_filename"
          pagination={false}
          size="small"
        />
        
        {uploadResult.processing_status === 'pending' && (
          <div style={{ marginTop: 16, textAlign: 'center' }}>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={handleStartProcessing}
              size="large"
            >
              开始处理
            </Button>
          </div>
        )}
      </Card>
    );
  };

  const renderProcessingStatus = () => {
    if (!batchStatus) return null;

    const stageNames = {
      uploaded: '已上传',
      preprocessing: '预处理',
      student_info_recognition: '学生信息识别',
      question_segmentation: '题目切分',
      answer_extraction: '答案提取',
      grading: '智能评分',
      quality_check: '质量检查',
      completed: '处理完成'
    };

    return (
      <Card title="处理进度" style={{ marginBottom: 16 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Statistic
              title="总体进度"
              value={batchStatus.progress.completion_percentage}
              suffix="%"
              precision={1}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已完成"
              value={batchStatus.progress.completed_files}
              suffix={`/${batchStatus.progress.total_files}`}
              valueStyle={{ color: '#3f8600' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="处理中"
              value={batchStatus.progress.processing_files}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="失败数"
              value={batchStatus.progress.failed_files}
              valueStyle={{ color: '#cf1322' }}
            />
          </Col>
        </Row>

        <Progress
          percent={batchStatus.progress.completion_percentage}
          status={batchStatus.overall_status === 'failed' ? 'exception' : 'active'}
          style={{ marginBottom: 16 }}
        />

        <Card size="small" title="各阶段进度">
          <Row gutter={16}>
            {Object.entries(batchStatus.processing_stages).map(([stage, count]) => (
              <Col span={6} key={stage} style={{ marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {stageNames[stage] || stage}
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                    {count}/{batchStatus.progress.total_files}
                  </div>
                  <Progress
                    percent={(count / batchStatus.progress.total_files) * 100}
                    size="small"
                    showInfo={false}
                  />
                </div>
              </Col>
            ))}
          </Row>
        </Card>

        {batchStatus.error_summary && batchStatus.error_summary.total_errors > 0 && (
          <Alert
            message="处理异常"
            description={
              <div>
                <div>总异常数: {batchStatus.error_summary.total_errors}</div>
                {Object.entries(batchStatus.error_summary.error_types).map(([type, count]) => (
                  <div key={type}>• {type}: {count}</div>
                ))}
              </div>
            }
            type="warning"
            style={{ marginTop: 16 }}
          />
        )}
      </Card>
    );
  };

  const steps = [
    { title: '选择文件', description: '选择要上传的答题卡文件' },
    { title: '批量上传', description: '上传文件到服务器' },
    { title: '上传完成', description: '查看上传结果' },
    { title: '智能处理', description: '答题卡智能识别和评分' },
    { title: '处理完成', description: '查看最终结果' }
  ];

  return (
    <div>
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map((step, index) => (
          <Step key={index} title={step.title} description={step.description} />
        ))}
      </Steps>

      {currentStep === 0 && renderUploadArea()}
      {currentStep >= 2 && renderUploadResults()}
      {currentStep >= 3 && renderProcessingStatus()}

      {/* 预览模态框 */}
      <Modal
        visible={previewVisible}
        title={previewTitle}
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
      >
        <img alt="preview" style={{ width: '100%' }} src={previewImage} />
      </Modal>

      {/* 配置模态框 */}
      <Modal
        title="高级处理配置"
        visible={configVisible}
        onOk={() => setConfigVisible(false)}
        onCancel={() => setConfigVisible(false)}
        width={600}
      >
        <Form layout="vertical">
          <Form.Item label="置信度阈值">
            <InputNumber
              min={0.1}
              max={1.0}
              step={0.1}
              value={processingConfig.confidence_threshold}
              onChange={(value) => 
                setProcessingConfig(prev => ({ ...prev, confidence_threshold: value || 0.8 }))
              }
            />
          </Form.Item>
          
          <Form.Item label="启用的处理阶段">
            <Space direction="vertical">
              {Object.entries(processingConfig.processing_stages).map(([stage, enabled]) => (
                <div key={stage}>
                  <Switch
                    checked={enabled}
                    onChange={(checked) => 
                      setProcessingConfig(prev => ({
                        ...prev,
                        processing_stages: {
                          ...prev.processing_stages,
                          [stage]: checked
                        }
                      }))
                    }
                  />
                  <span style={{ marginLeft: 8 }}>
                    {stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </span>
                </div>
              ))}
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default EnhancedBatchUploadWorkspace;