import React, { useState, useCallback } from 'react';
import { 
  Card, 
  Button, 
  Progress, 
  List, 
  Tag, 
  Space, 
  Typography, 
  Upload, 
  message,
  Statistic,
  Divider,
  Tooltip,
  Switch,
  InputNumber,
  Alert
} from 'antd';
import { 
  UploadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  ReloadOutlined,
  DownloadOutlined,
  SettingOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { useBatchProcessing } from '../../hooks/useBatchProcessing';

const { Text, Title } = Typography;
const { Dragger } = Upload;

interface BatchOperationsPanelProps {
  examId?: string;
  compact?: boolean;
}

interface ProcessingSettings {
  batchSize: number;
  maxConcurrency: number;
  autoRetry: boolean;
  retryLimit: number;
  qualityThreshold: number;
}

export const BatchOperationsPanel: React.FC<BatchOperationsPanelProps> = ({
  examId,
  compact = false
}) => {
  const {
    state,
    processBatch,
    cancelProcessing,
    retryErrors,
    pauseProcessing,
    resumeProcessing,
    downloadResults
  } = useBatchProcessing();

  const [settings, setSettings] = useState<ProcessingSettings>({
    batchSize: 10,
    maxConcurrency: 3,
    autoRetry: true,
    retryLimit: 3,
    qualityThreshold: 0.9
  });

  const [showSettings, setShowSettings] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  // 文件上传配置
  const uploadProps = {
    name: 'files',
    multiple: true,
    accept: '.pdf,.jpg,.jpeg,.png,.tiff',
    showUploadList: false,
    beforeUpload: (file: File) => {
      // 文件大小检查 (50MB)
      if (file.size > 50 * 1024 * 1024) {
        message.error(`${file.name} 文件大小超过50MB限制`);
        return false;
      }
      
      // 文件类型检查
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/tiff'];
      if (!allowedTypes.includes(file.type)) {
        message.error(`${file.name} 文件类型不支持`);
        return false;
      }

      setUploadedFiles(prev => [...prev, file]);
      return false; // 阻止自动上传
    },
    onDrop: (e) => {
      console.log('Dropped files', e.dataTransfer.files);
    }
  };

  // 开始批量处理
  const handleStartBatchProcessing = useCallback(async () => {
    if (uploadedFiles.length === 0) {
      message.warning('请先上传文件');
      return;
    }

    const processingItems = uploadedFiles.map(file => ({
      id: `${file.name}-${Date.now()}`,
      name: file.name,
      size: file.size,
      type: file.type,
      file
    }));

    try {
      await processBatch(processingItems, {
        maxBatchSize: settings.batchSize,
        maxConcurrency: settings.maxConcurrency,
        autoRetry: settings.autoRetry,
        retryLimit: settings.retryLimit,
        onProgress: (progress) => {
          console.log('Processing progress:', progress);
        },
        onError: (error, item) => {
          console.error('Processing error:', error, item);
        }
      });
      
      message.success('批量处理完成');
    } catch (error) {
      message.error('批量处理失败');
    }
  }, [uploadedFiles, settings, processBatch]);

  // 清空文件列表
  const handleClearFiles = useCallback(() => {
    setUploadedFiles([]);
  }, []);

  // 移除单个文件
  const handleRemoveFile = useCallback((index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  }, []);

  // 获取处理状态颜色
  const getStatusColor = (status: string) => {
    const colorMap = {
      pending: 'default',
      processing: 'processing',
      success: 'success',
      error: 'error',
      paused: 'warning'
    };
    return colorMap[status] || 'default';
  };

  // 渲染紧凑模式
  if (compact) {
    return (
      <div style={{ padding: '8px' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Statistic
            title="队列"
            value={uploadedFiles.length}
            suffix="个文件"
            valueStyle={{ fontSize: '16px' }}
          />
          
          <Progress
            percent={state.progress.overall}
            size="small"
            status={state.progress.status}
          />

          <Space>
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={handleStartBatchProcessing}
              disabled={state.isProcessing || uploadedFiles.length === 0}
            />
            
            <Button
              size="small"
              icon={<StopOutlined />}
              onClick={cancelProcessing}
              disabled={!state.isProcessing}
            />
          </Space>
        </Space>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px', height: '100%', overflow: 'auto' }}>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {/* 标题和设置 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={5} style={{ margin: 0 }}>批量操作</Title>
          <Button
            type="text"
            icon={<SettingOutlined />}
            onClick={() => setShowSettings(!showSettings)}
          />
        </div>

        {/* 设置面板 */}
        {showSettings && (
          <Card size="small" title="处理设置">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>批次大小:</Text>
                <InputNumber
                  min={1}
                  max={50}
                  value={settings.batchSize}
                  onChange={(value) => setSettings(prev => ({ ...prev, batchSize: value || 10 }))}
                  size="small"
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>最大并发:</Text>
                <InputNumber
                  min={1}
                  max={10}
                  value={settings.maxConcurrency}
                  onChange={(value) => setSettings(prev => ({ ...prev, maxConcurrency: value || 3 }))}
                  size="small"
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>自动重试:</Text>
                <Switch
                  checked={settings.autoRetry}
                  onChange={(checked) => setSettings(prev => ({ ...prev, autoRetry: checked }))}
                  size="small"
                />
              </div>
              
              {settings.autoRetry && (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>重试次数:</Text>
                  <InputNumber
                    min={1}
                    max={10}
                    value={settings.retryLimit}
                    onChange={(value) => setSettings(prev => ({ ...prev, retryLimit: value || 3 }))}
                    size="small"
                  />
                </div>
              )}
            </Space>
          </Card>
        )}

        {/* 文件上传区域 */}
        <Card size="small" title="文件上传">
          <Dragger {...uploadProps} style={{ padding: '20px' }}>
            <p className="ant-upload-drag-icon">
              <UploadOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域</p>
            <p className="ant-upload-hint">
              支持 PDF、JPG、PNG、TIFF 格式，单个文件不超过50MB
            </p>
          </Dragger>

          {uploadedFiles.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text strong>已选择 {uploadedFiles.length} 个文件</Text>
                <Button type="link" onClick={handleClearFiles} size="small">
                  清空
                </Button>
              </div>
              
              <List
                size="small"
                dataSource={uploadedFiles.slice(0, 5)} // 只显示前5个
                renderItem={(file, index) => (
                  <List.Item
                    actions={[
                      <Button 
                        type="link" 
                        onClick={() => handleRemoveFile(index)}
                        size="small"
                      >
                        移除
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={<FileTextOutlined />}
                      title={file.name}
                      description={`${(file.size / 1024 / 1024).toFixed(2)} MB`}
                    />
                  </List.Item>
                )}
              />
              
              {uploadedFiles.length > 5 && (
                <Text type="secondary">还有 {uploadedFiles.length - 5} 个文件...</Text>
              )}
            </div>
          )}
        </Card>

        {/* 处理控制 */}
        <Card size="small" title="处理控制">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleStartBatchProcessing}
                disabled={state.isProcessing || uploadedFiles.length === 0}
                block
              >
                开始处理
              </Button>
              
              <Button
                icon={state.isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                onClick={state.isPaused ? resumeProcessing : pauseProcessing}
                disabled={!state.isProcessing}
              >
                {state.isPaused ? '继续' : '暂停'}
              </Button>
              
              <Button
                icon={<StopOutlined />}
                onClick={cancelProcessing}
                disabled={!state.isProcessing}
                danger
              >
                停止
              </Button>
            </div>

            {/* 处理进度 */}
            {state.isProcessing && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <Text>整体进度</Text>
                  <Text>{state.progress.processed}/{state.progress.total}</Text>
                </div>
                <Progress
                  percent={state.progress.overall}
                  status={state.progress.status}
                  strokeColor={{
                    '0%': '#108ee9',
                    '100%': '#87d068',
                  }}
                />
                
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
                  <Text type="secondary">
                    处理速度: {state.progress.speed} 个/分钟
                  </Text>
                  <Text type="secondary">
                    预计剩余: {state.progress.estimatedTime} 分钟
                  </Text>
                </div>
              </div>
            )}
          </Space>
        </Card>

        {/* 处理统计 */}
        <Card size="small" title="处理统计">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Statistic
              title="成功"
              value={state.results.length}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
            <Statistic
              title="失败"
              value={state.errors.length}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </div>

          {/* 错误处理 */}
          {state.errors.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <Alert
                message={`${state.errors.length} 个文件处理失败`}
                type="warning"
                showIcon
                action={
                  <Button size="small" onClick={retryErrors}>
                    重试失败项
                  </Button>
                }
              />
            </div>
          )}

          {/* 结果下载 */}
          {state.results.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <Button
                icon={<DownloadOutlined />}
                onClick={downloadResults}
                block
              >
                下载处理结果
              </Button>
            </div>
          )}
        </Card>

        {/* 历史记录 */}
        <Card size="small" title="最近处理">
          <List
            size="small"
            dataSource={state.history.slice(0, 3)}
            renderItem={(item: any) => (
              <List.Item>
                <List.Item.Meta
                  title={item.name}
                  description={
                    <Space>
                      <Tag color={getStatusColor(item.status)}>
                        {item.status}
                      </Tag>
                      <Text type="secondary">{item.timestamp}</Text>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      </Space>
    </div>
  );
};

export default BatchOperationsPanel;