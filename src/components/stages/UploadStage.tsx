import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Upload,
  Button,
  Progress,
  Table,
  Alert,
  Row,
  Col,
  Statistic,
  Tag,
  Space,
  Modal,
  Image,
  Tooltip,
  Divider,
  Steps,
  Result
} from 'antd';
import {
  UploadOutlined,
  CloudUploadOutlined,
  CheckCircleOutlined,
  EyeOutlined,
  DeleteOutlined,
  ReloadOutlined,
  FileImageOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { PreGradingConfiguration, BatchProcessingResult } from '../../types/preGrading';
import { message } from '../../utils/message';

const { Dragger } = Upload;
const { Step } = Steps;

interface UploadStageProps {
  examId: string;
  configuration: PreGradingConfiguration;
  onComplete: (files: File[]) => Promise<BatchProcessingResult>;
  onProgress?: (progress: number) => void;
}

interface UploadedFile {
  id: string;
  file: File;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  progress: number;
  previewUrl?: string;
  qualityScore?: number;
  studentInfo?: {
    id?: string;
    name?: string;
    class?: string;
  };
  issues: string[];
  processingTime?: number;
}

const UploadStage: React.FC<UploadStageProps> = ({
  examId: _examId,
  configuration,
  onComplete,
  onProgress: _onProgress
}) => {
  const [fileList, setFileList] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [previewModal, setPreviewModal] = useState<{
    visible: boolean;
    file?: UploadedFile;
  }>({ visible: false });
  const [batchResult, setBatchResult] = useState<BatchProcessingResult | null>(null);
  const [showUploadGuide, setShowUploadGuide] = useState(true);
  const [processingQueue, setProcessingQueue] = useState<any[]>([]);
  const [isProcessingItem, setIsProcessingItem] = useState(false);

  // 文件上传前的验证
  const beforeUpload = (file: File) => {
    const isImage = file.type.startsWith('image/');
    if (!isImage) {
      message.error('只能上传图片文件');
      return false;
    }

    const isLtSize = file.size / 1024 / 1024 < 50; // 限制50MB
    if (!isLtSize) {
      message.error('文件大小不能超过50MB');
      return false;
    }

    return true; // 允许上传，使用自定义上传逻辑
  };

  useEffect(() => {
    const allDone = fileList.length > 0 && fileList.every(f => f.status === 'completed' || f.status === 'error');
    if (allDone) {
      const handleComplete = async () => {
        const result = await onComplete(fileList.map(f => f.file));
        setBatchResult(result);
        setCurrentStep(3); // Step index 3 is '完成处理'
        message.success(`批量处理完成！`);
      };
      handleComplete();
    }
  }, [fileList, onComplete]);

  // 自定义上传逻辑 - 现在只负责将文件加入队列
  const handleCustomUpload = useCallback((options: any) => {
    setProcessingQueue(currentQueue => [...currentQueue, options]);
  }, []);

  // 使用 useEffect 来串行处理队列中的文件
  useEffect(() => {
    if (processingQueue.length === 0 || isProcessingItem) {
      return;
    }

    const options = processingQueue[0];
    const { file, onSuccess, onError, onProgress } = options;

    const processFile = async () => {
      setIsProcessingItem(true);
      try {
        const isDuplicate = fileList.some(f => f.file.name === file.name && f.file.size === file.size);
        if (isDuplicate) {
          message.warning(`文件 ${file.name} 已存在，已自动跳过。`);
          if (onError) onError(new Error('Duplicate file'));
          return;
        }

        const newFile: UploadedFile = {
          id: `file-${Date.now()}-${Math.random()}`,
          file: file,
          status: 'uploading',
          progress: 0,
          issues: [],
          previewUrl: URL.createObjectURL(file),
        };
        setFileList(currentList => [...currentList, newFile]);

        // 1. 模拟上传进度
        for (let progress = 0; progress <= 100; progress += 10) {
          await new Promise(resolve => setTimeout(resolve, 50));
          if (onProgress) onProgress({ percent: progress });
          setFileList(prev => prev.map(f =>
            f.id === newFile.id
              ? { ...f, progress, status: progress < 100 ? 'uploading' : 'processing' }
              : f
          ));
        }

        // 2. 模拟图像处理和质量检测
        await new Promise(resolve => setTimeout(resolve, 1000));

        const qualityScore = Math.random() * 0.3 + 0.7;
        const issues: string[] = [];
        if (qualityScore < 0.8) issues.push('图像质量偏低');
        if (Math.random() > 0.9) issues.push('检测到倾斜');

        const studentInfo = {
          id: `202400${Math.floor(Math.random() * 100) + 1}`,
          name: `学生${Math.floor(Math.random() * 100) + 1}`,
          class: `八年级${Math.floor(Math.random() * 5) + 1}班`
        };

        setFileList(prev => prev.map(f => {
          if (f.id === newFile.id) {
            return {
              ...f,
              status: issues.length > 0 ? 'error' : 'completed',
              qualityScore,
              studentInfo,
              issues,
              processingTime: Math.floor(Math.random() * 3000) + 1000
            };
          }
          return f;
        }));

        if (onSuccess) onSuccess(null, file);

      } catch (error: any) {
        console.error('处理失败:', error);
        message.error(`文件 ${file.name} 处理失败`);
      } finally {
        setProcessingQueue(currentQueue => currentQueue.slice(1));
        setIsProcessingItem(false);
      }
    };

    processFile();
  }, [processingQueue, fileList, isProcessingItem]);

  const handleRetryFile = useCallback((fileId: string) => {
    const fileToRetry = fileList.find(f => f.id === fileId);
    if (fileToRetry) {
      // 先从列表中移除，再通过 handleCustomUpload 重新添加和处理
      setFileList(prev => prev.filter(f => f.id !== fileId));
      handleCustomUpload({
        file: fileToRetry.file,
        onSuccess: () => message.success(`文件 ${fileToRetry.file.name} 已成功重试。`),
        onError: () => message.error(`文件 ${fileToRetry.file.name} 重试失败。`),
        onProgress: () => {},
      });
    }
  }, [fileList, handleCustomUpload]);

  // 删除文件
  const handleDeleteFile = (fileId: string) => {
    setFileList(prev => prev.filter(f => f.id !== fileId));
    message.success('文件已删除');
  };

  // 预览文件
  const handlePreviewFile = (file: UploadedFile) => {
    setPreviewModal({ visible: true, file });
  };

  // 表格列定义
  const columns = [
    {
      title: '文件名',
      key: 'filename',
      width: 200,
      render: (_: any, record: UploadedFile) => (
        <div className="flex items-center gap-2">
          <FileImageOutlined />
          <span className="truncate">{record.file.name}</span>
        </div>
      )
    },
    {
      title: '文件大小',
      key: 'size',
      width: 100,
             render: (_: unknown, record: UploadedFile) => 
         `${(record.file.size / 1024 / 1024).toFixed(2)} MB`
    },
    {
      title: '状态',
      key: 'status',
      width: 120,
      render: (_: any, record: UploadedFile) => {
        const statusConfig = {
          uploading: { color: 'processing', text: '上传中' },
          processing: { color: 'processing', text: '处理中' },
          completed: { color: 'success', text: '完成' },
          error: { color: 'error', text: '有问题' }
        };
        const config = statusConfig[record.status];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '进度',
      key: 'progress',
      width: 120,
      render: (_: any, record: UploadedFile) => (
        <Progress 
          percent={record.progress} 
          size="small"
          status={record.status === 'error' ? 'exception' : 'active'}
        />
      )
    },
    {
      title: '质量评分',
      key: 'quality',
      width: 100,
      render: (_: any, record: UploadedFile) => {
        if (!record.qualityScore) return '-';
        const score = Math.round(record.qualityScore * 100);
        const color = score >= 90 ? 'green' : score >= 70 ? 'orange' : 'red';
        return <Tag color={color}>{score}分</Tag>;
      }
    },
    {
      title: '学生信息',
      key: 'student',
      width: 150,
      render: (_: any, record: UploadedFile) => 
        record.studentInfo ? (
          <div className="text-sm">
            <div>{record.studentInfo.name}</div>
            <div className="text-gray-500">{record.studentInfo.class}</div>
          </div>
        ) : '-'
    },
    {
      title: '问题',
      key: 'issues',
      width: 120,
      render: (_: any, record: UploadedFile) => 
        record.issues.length > 0 ? (
          <Tooltip title={record.issues.join(', ')}>
            <Tag color="warning">{record.issues.length} 个问题</Tag>
          </Tooltip>
        ) : (
          <Tag color="success">无问题</Tag>
        )
    },
    {
      title: '操作',
      key: 'action',
      width: 120,
      render: (_: any, record: UploadedFile) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreviewFile(record)}
          >
            预览
          </Button>
          {record.status === 'error' && (
            <Button 
              type="link" 
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRetryFile(record.id)}
            >
              重试
            </Button>
          )}
          <Button 
            type="link" 
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteFile(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  // 统计数据
  const stats = {
    total: fileList.length,
    completed: fileList.filter(f => f.status === 'completed').length,
    processing: fileList.filter(f => f.status === 'processing' || f.status === 'uploading').length,
    error: fileList.filter(f => f.status === 'error').length,
    avgQuality: fileList.filter(f => f.qualityScore).length > 0 
      ? Math.round(fileList.filter(f => f.qualityScore).reduce((sum, f) => sum + (f.qualityScore || 0), 0) / fileList.filter(f => f.qualityScore).length * 100)
      : 0
  };

  return (
    <div className="upload-stage">
      {/* 进度步骤 */}
      <Card className="mb-6">
        <Steps current={currentStep} className="mb-4">
          <Step title="选择文件" icon={<CloudUploadOutlined />} />
          <Step title="上传文件" icon={<UploadOutlined />} />
          <Step title="质量检测" icon={<SettingOutlined />} />
          <Step title="完成处理" icon={<CheckCircleOutlined />} />
        </Steps>
      </Card>

      {/* 统计信息 */}
      {fileList.length > 0 && (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="总文件数"
                value={stats.total}
                suffix="个"
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="已完成"
                value={stats.completed}
                suffix="个"
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="处理中"
                value={stats.processing}
                suffix="个"
                valueStyle={{ color: '#faad14' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
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
      )}

      {/* 上传区域 */}
      <Card 
        extra={
          fileList.length > 0 && (
            <Space>
              <Button 
                danger
                onClick={() => {
                  Modal.confirm({
                    title: '确认清空',
                    content: '确定要清空所有文件吗？',
                    onOk: () => setFileList([])
                  });
                }}
              >
                清空列表
              </Button>
            </Space>
          )
        }
      >


        {/* 拖拽上传区域 */}
        <Dragger
          name="files"
          multiple
          accept="image/*"
          beforeUpload={beforeUpload}
          customRequest={handleCustomUpload}
          disabled={uploading || processing}
          showUploadList={false}
          className="mb-4"
        >
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持批量上传，系统将自动处理答题卡图像
          </p>
        </Dragger>

        {/* 文件列表 */}
        {fileList.length > 0 && (
          <div>
            <Divider>上传文件列表</Divider>
            <Table
              columns={columns}
              dataSource={fileList}
              rowKey="id"
              scroll={{ x: 1000 }}
              pagination={false}
              size="small"
            />
          </div>
        )}


      </Card>

      {/* 预览模态框 */}
      <Modal
        title="答题卡预览"
        open={previewModal.visible}
        onCancel={() => setPreviewModal({ visible: false })}
        footer={null}
        width={800}
      >
        {previewModal.file && (
          <div>
            <div className="mb-4">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <div><strong>文件名:</strong> {previewModal.file.file.name}</div>
                  <div><strong>文件大小:</strong> {(previewModal.file.file.size / 1024 / 1024).toFixed(2)} MB</div>
                </Col>
                <Col span={12}>
                  {previewModal.file.qualityScore && (
                    <div><strong>质量评分:</strong> {Math.round(previewModal.file.qualityScore * 100)}分</div>
                  )}
                  {previewModal.file.studentInfo && (
                    <div><strong>学生信息:</strong> {previewModal.file.studentInfo.name} ({previewModal.file.studentInfo.class})</div>
                  )}
                </Col>
              </Row>
            </div>
            
            {previewModal.file.issues.length > 0 && (
              <Alert
                message="检测到的问题"
                description={previewModal.file.issues.join('、')}
                type="warning"
                showIcon
                className="mb-4"
              />
            )}
            
            <Image
              src={previewModal.file.previewUrl}
              alt="答题卡预览"
              style={{ width: '100%' }}
            />
          </div>
        )}
      </Modal>
    </div>
  );
};

export default UploadStage;