import React, { useState, useEffect } from 'react';
import {
  Modal, Card, Row, Col, Button, Space, Tag, Divider,
  Progress, Table, message, Spin, Alert, Select,
  Checkbox, Input, Form, Radio, Tooltip, Badge,
  Steps, Upload, List, Avatar, Typography
} from 'antd';
import {
  UserOutlined, BarcodeOutlined, ScissorOutlined,
  CheckCircleOutlined, ExclamationCircleOutlined,
  ClockCircleOutlined, PlayCircleOutlined, PauseCircleOutlined,
  ReloadOutlined, DownloadOutlined, EyeOutlined,
  SettingOutlined, FileImageOutlined, TeamOutlined,
  ThunderboltOutlined, RobotOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Step } = Steps;

interface StudentInfoRegion {
  id: string;
  type: 'student_info' | 'barcode' | 'exam_number' | 'name_field' | 'class_field';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
  isManuallyAdjusted: boolean;
}

interface BatchProcessItem {
  id: string;
  filename: string;
  imageUrl: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'manual_review';
  progress: number;
  regions: StudentInfoRegion[];
  studentInfo?: {
    studentId?: string;
    studentName?: string;
    className?: string;
    examNumber?: string;
    paperType?: string;
    barcode?: string;
  };
  recognitionResult?: {
    confidence: number;
    issues: string[];
    needsReview: boolean;
  };
  error?: string;
  processedAt?: Date;
}

interface BatchStudentInfoProcessorProps {
  visible: boolean;
  onClose: () => void;
  answerSheets: {
    id: string;
    filename: string;
    imageUrl: string;
    regions?: StudentInfoRegion[];
  }[];
  onComplete: (results: BatchProcessItem[]) => void;
}

const BatchStudentInfoProcessor: React.FC<BatchStudentInfoProcessorProps> = ({
  visible,
  onClose,
  answerSheets,
  onComplete
}) => {
  // 状态管理
  const [processItems, setProcessItems] = useState<BatchProcessItem[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [processingConfig, setProcessingConfig] = useState({
    enableAIDetection: true,
    confidenceThreshold: 0.8,
    autoApproveHighConfidence: true,
    batchSize: 5,
    enableParallelProcessing: true
  });
  const [statistics, setStatistics] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    needsReview: 0,
    processing: 0
  });

  // 初始化处理项目
  useEffect(() => {
    if (visible && answerSheets.length > 0) {
      const items: BatchProcessItem[] = answerSheets.map(sheet => ({
        id: sheet.id,
        filename: sheet.filename,
        imageUrl: sheet.imageUrl,
        status: 'pending',
        progress: 0,
        regions: sheet.regions || []
      }));
      
      setProcessItems(items);
      setStatistics({
        total: items.length,
        completed: 0,
        failed: 0,
        needsReview: 0,
        processing: 0
      });
      setSelectedItems(items.map(item => item.id));
    }
  }, [visible, answerSheets]);

  // 更新统计信息
  useEffect(() => {
    const stats = processItems.reduce((acc, item) => {
      switch (item.status) {
        case 'completed':
          acc.completed++;
          break;
        case 'failed':
          acc.failed++;
          break;
        case 'manual_review':
          acc.needsReview++;
          break;
        case 'processing':
          acc.processing++;
          break;
      }
      return acc;
    }, {
      total: processItems.length,
      completed: 0,
      failed: 0,
      needsReview: 0,
      processing: 0
    });
    
    setStatistics(stats);
  }, [processItems]);

  // 模拟AI区域检测
  const performAIDetection = async (item: BatchProcessItem): Promise<StudentInfoRegion[]> => {
    // 模拟AI检测延迟
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // 模拟检测结果
    const mockRegions: StudentInfoRegion[] = [
      {
        id: `ai-student-info-${item.id}`,
        type: 'student_info',
        x: 50,
        y: 50,
        width: 400,
        height: 150,
        label: '学生信息区',
        confidence: 0.85 + Math.random() * 0.15,
        isManuallyAdjusted: false
      },
      {
        id: `ai-barcode-${item.id}`,
        type: 'barcode',
        x: 500,
        y: 50,
        width: 450,
        height: 80,
        label: '条形码区',
        confidence: 0.80 + Math.random() * 0.20,
        isManuallyAdjusted: false
      }
    ];
    
    return mockRegions;
  };

  // 模拟学生信息识别
  const performStudentInfoRecognition = async (regions: StudentInfoRegion[]) => {
    await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 1200));
    
    const mockStudentInfo = {
      studentId: `2024${String(Math.floor(Math.random() * 9999)).padStart(4, '0')}`,
      studentName: ['张三', '李四', '王五', '赵六', '钱七'][Math.floor(Math.random() * 5)],
      className: ['高三(1)班', '高三(2)班', '高三(3)班'][Math.floor(Math.random() * 3)],
      examNumber: `E${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`,
      paperType: 'A卷',
      barcode: `BC${String(Math.floor(Math.random() * 999999999)).padStart(9, '0')}`
    };
    
    const confidence = 0.7 + Math.random() * 0.3;
    const issues: string[] = [];
    
    if (confidence < 0.85) {
      issues.push('识别置信度较低');
    }
    if (Math.random() < 0.2) {
      issues.push('条形码模糊');
    }
    if (Math.random() < 0.15) {
      issues.push('手写字迹不清晰');
    }
    
    return {
      studentInfo: mockStudentInfo,
      recognitionResult: {
        confidence,
        issues,
        needsReview: confidence < processingConfig.confidenceThreshold || issues.length > 0
      }
    };
  };

  // 处理单个项目
  const processItem = async (item: BatchProcessItem): Promise<BatchProcessItem> => {
    try {
      // 更新状态为处理中
      updateItemStatus(item.id, 'processing', 10);
      
      // AI区域检测
      let regions: StudentInfoRegion[] = [];
      if (processingConfig.enableAIDetection) {
        updateItemStatus(item.id, 'processing', 30);
        regions = await performAIDetection(item);
      }
      
      // 学生信息识别
      updateItemStatus(item.id, 'processing', 60);
      const { studentInfo, recognitionResult } = await performStudentInfoRecognition(regions);
      
      updateItemStatus(item.id, 'processing', 90);
      
      // 判断是否需要人工审核
      const needsReview = recognitionResult.needsReview && !processingConfig.autoApproveHighConfidence;
      const finalStatus = needsReview ? 'manual_review' : 'completed';
      
      const updatedItem: BatchProcessItem = {
        ...item,
        status: finalStatus,
        progress: 100,
        regions,
        studentInfo,
        recognitionResult,
        processedAt: new Date()
      };
      
      updateItemStatus(item.id, finalStatus, 100);
      return updatedItem;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '处理失败';
      updateItemStatus(item.id, 'failed', 0, errorMessage);
      
      return {
        ...item,
        status: 'failed',
        progress: 0,
        error: errorMessage,
        processedAt: new Date()
      };
    }
  };

  // 更新项目状态
  const updateItemStatus = (id: string, status: BatchProcessItem['status'], progress: number, error?: string) => {
    setProcessItems(prev => prev.map(item => 
      item.id === id 
        ? { ...item, status, progress, error, processedAt: status === 'completed' ? new Date() : item.processedAt }
        : item
    ));
  };

  // 开始批量处理
  const startBatchProcessing = async () => {
    setIsProcessing(true);
    setIsPaused(false);
    setCurrentStep(1);
    
    const itemsToProcess = processItems.filter(item => 
      selectedItems.includes(item.id) && item.status === 'pending'
    );
    
    if (itemsToProcess.length === 0) {
      message.warning('没有可处理的项目');
      setIsProcessing(false);
      return;
    }
    
    try {
      if (processingConfig.enableParallelProcessing) {
        // 并行处理
        const batchSize = processingConfig.batchSize;
        for (let i = 0; i < itemsToProcess.length; i += batchSize) {
          if (isPaused) break;
          
          const batch = itemsToProcess.slice(i, i + batchSize);
          const promises = batch.map(item => processItem(item));
          
          await Promise.allSettled(promises);
        }
      } else {
        // 串行处理
        for (const item of itemsToProcess) {
          if (isPaused) break;
          await processItem(item);
        }
      }
      
      setCurrentStep(2);
      message.success('批量处理完成');
      
    } catch (error) {
      message.error('批量处理过程中发生错误');
    } finally {
      setIsProcessing(false);
    }
  };

  // 暂停/恢复处理
  const togglePause = () => {
    setIsPaused(!isPaused);
    message.info(isPaused ? '处理已恢复' : '处理已暂停');
  };

  // 重新处理失败项目
  const retryFailedItems = () => {
    const failedItems = processItems.filter(item => item.status === 'failed');
    failedItems.forEach(item => {
      updateItemStatus(item.id, 'pending', 0);
    });
    message.success(`已重置 ${failedItems.length} 个失败项目`);
  };

  // 导出结果
  const exportResults = () => {
    const completedItems = processItems.filter(item => item.status === 'completed');
    const exportData = completedItems.map(item => ({
      filename: item.filename,
      studentInfo: item.studentInfo,
      confidence: item.recognitionResult?.confidence,
      processedAt: item.processedAt
    }));
    
    // 模拟导出
    console.log('导出数据:', exportData);
    message.success('结果已导出');
  };

  // 完成处理
  const handleComplete = () => {
    onComplete(processItems);
    onClose();
  };

  // 表格列定义
  const columns: ColumnsType<BatchProcessItem> = [
    {
      title: '选择',
      width: 50,
      render: (_, record) => (
        <Checkbox
          checked={selectedItems.includes(record.id)}
          onChange={(e) => {
            if (e.target.checked) {
              setSelectedItems([...selectedItems, record.id]);
            } else {
              setSelectedItems(selectedItems.filter(id => id !== record.id));
            }
          }}
          disabled={record.status === 'processing'}
        />
      )
    },
    {
      title: '文件名',
      dataIndex: 'filename',
      width: 200,
      render: (filename, record) => (
        <div className="flex items-center gap-2">
          <FileImageOutlined className="text-blue-500" />
          <div>
            <div className="font-medium">{filename}</div>
            <div className="text-xs text-gray-500">{record.id}</div>
          </div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 120,
      render: (status: BatchProcessItem['status'], record) => {
        const statusConfig: Record<BatchProcessItem['status'], { color: string; text: string; icon: React.ReactNode }> = {
          pending: { color: 'default', text: '待处理', icon: <ClockCircleOutlined /> },
          processing: { color: 'processing', text: '处理中', icon: <Spin size="small" /> },
          completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
          failed: { color: 'error', text: '失败', icon: <ExclamationCircleOutlined /> },
          manual_review: { color: 'warning', text: '需审核', icon: <EyeOutlined /> }
        };
        
        const config = statusConfig[status];
        return (
          <div className="flex items-center gap-1">
            {config.icon}
            <Tag color={config.color}>{config.text}</Tag>
          </div>
        );
      }
    },
    {
      title: '进度',
      dataIndex: 'progress',
      width: 120,
      render: (progress, record) => (
        <div>
          <Progress 
            percent={progress} 
            size="small" 
            status={record.status === 'failed' ? 'exception' : undefined}
          />
          {record.status === 'processing' && (
            <div className="text-xs text-gray-500 mt-1">处理中...</div>
          )}
        </div>
      )
    },
    {
      title: '学生信息',
      width: 200,
      render: (_, record) => {
        if (!record.studentInfo) return <span className="text-gray-400">未识别</span>;
        
        return (
          <div className="space-y-1">
            <div className="text-sm">
              <strong>{record.studentInfo.studentName}</strong>
            </div>
            <div className="text-xs text-gray-600">
              学号: {record.studentInfo.studentId}
            </div>
            <div className="text-xs text-gray-600">
              班级: {record.studentInfo.className}
            </div>
          </div>
        );
      }
    },
    {
      title: '识别质量',
      width: 120,
      render: (_, record) => {
        if (!record.recognitionResult) return null;
        
        const { confidence, issues, needsReview } = record.recognitionResult;
        
        return (
          <div className="space-y-1">
            <div className="text-sm">
              置信度: {Math.round(confidence * 100)}%
            </div>
            {issues.length > 0 && (
              <div className="text-xs text-orange-600">
                {issues.length} 个问题
              </div>
            )}
            {needsReview && (
              <Tag color="orange">需审核</Tag>
            )}
          </div>
        );
      }
    },
    {
      title: '操作',
      width: 100,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="预览">
            <Button 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => window.open(record.imageUrl, '_blank')}
            />
          </Tooltip>
          
          {record.status === 'failed' && (
            <Tooltip title="重新处理">
              <Button 
                size="small" 
                icon={<ReloadOutlined />}
                onClick={() => updateItemStatus(record.id, 'pending', 0)}
              />
            </Tooltip>
          )}
        </Space>
      )
    }
  ];

  const totalProgress = processItems.length > 0 
    ? Math.round((statistics.completed + statistics.failed + statistics.needsReview) / statistics.total * 100)
    : 0;

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <TeamOutlined className="text-blue-600" />
          <div>
            <div className="text-lg font-semibold">批量学生信息处理</div>
            <div className="text-sm text-gray-500 font-normal">
              共 {answerSheets.length} 张答题卡
            </div>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width="95vw"
      style={{ top: 20, maxWidth: 1600 }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button 
          key="export" 
          icon={<DownloadOutlined />}
          onClick={exportResults}
          disabled={statistics.completed === 0}
        >
          导出结果
        </Button>,
        <Button 
          key="complete" 
          type="primary" 
          onClick={handleComplete}
          disabled={isProcessing || statistics.completed === 0}
        >
          完成处理
        </Button>
      ]}
      className="batch-student-info-processor-modal"
    >
      <div className="space-y-4">
        {/* 处理步骤 */}
        <Steps current={currentStep} className="mb-6">
          <Step title="配置参数" description="设置处理选项" />
          <Step title="批量处理" description="AI识别学生信息" />
          <Step title="结果审核" description="检查和导出结果" />
        </Steps>

        {/* 统计信息 */}
        <Row gutter={16} className="mb-4">
          <Col span={6}>
            <Card size="small">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
                <div className="text-sm text-gray-600">总数</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{statistics.completed}</div>
                <div className="text-sm text-gray-600">已完成</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{statistics.needsReview}</div>
                <div className="text-sm text-gray-600">需审核</div>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{statistics.failed}</div>
                <div className="text-sm text-gray-600">失败</div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* 总体进度 */}
        {isProcessing && (
          <Card size="small">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="flex justify-between mb-2">
                  <span>总体进度</span>
                  <span>{totalProgress}%</span>
                </div>
                <Progress percent={totalProgress} status={isPaused ? 'active' : undefined} />
              </div>
              <div className="text-sm text-gray-600">
                {statistics.processing > 0 && `${statistics.processing} 个正在处理`}
                {isPaused && <Tag color="orange">已暂停</Tag>}
              </div>
            </div>
          </Card>
        )}

        {/* 控制面板 */}
        <Card title="处理控制" size="small">
          <Row gutter={16}>
            <Col span={12}>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Checkbox
                    checked={processingConfig.enableAIDetection}
                    onChange={(e) => setProcessingConfig(prev => ({ ...prev, enableAIDetection: e.target.checked }))}
                  >
                    启用AI区域检测
                  </Checkbox>
                  
                  <Checkbox
                    checked={processingConfig.autoApproveHighConfidence}
                    onChange={(e) => setProcessingConfig(prev => ({ ...prev, autoApproveHighConfidence: e.target.checked }))}
                  >
                    高置信度自动通过
                  </Checkbox>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-sm">置信度阈值:</span>
                  <Select
                    value={processingConfig.confidenceThreshold}
                    onChange={(value) => setProcessingConfig(prev => ({ ...prev, confidenceThreshold: value }))}
                    style={{ width: 120 }}
                    size="small"
                  >
                    <Select.Option value={0.7}>70%</Select.Option>
                    <Select.Option value={0.8}>80%</Select.Option>
                    <Select.Option value={0.9}>90%</Select.Option>
                  </Select>
                  
                  <span className="text-sm">批处理大小:</span>
                  <Select
                    value={processingConfig.batchSize}
                    onChange={(value) => setProcessingConfig(prev => ({ ...prev, batchSize: value }))}
                    style={{ width: 80 }}
                    size="small"
                  >
                    <Select.Option value={1}>1</Select.Option>
                    <Select.Option value={3}>3</Select.Option>
                    <Select.Option value={5}>5</Select.Option>
                    <Select.Option value={10}>10</Select.Option>
                  </Select>
                </div>
              </div>
            </Col>
            
            <Col span={12}>
              <div className="flex justify-end gap-2">
                <Button
                  icon={<ThunderboltOutlined />}
                  onClick={() => setSelectedItems(processItems.map(item => item.id))}
                  disabled={isProcessing}
                >
                  全选
                </Button>
                
                <Button
                  icon={<ReloadOutlined />}
                  onClick={retryFailedItems}
                  disabled={isProcessing || statistics.failed === 0}
                >
                  重试失败项
                </Button>
                
                {!isProcessing ? (
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={startBatchProcessing}
                    disabled={selectedItems.length === 0}
                  >
                    开始处理 ({selectedItems.length})
                  </Button>
                ) : (
                  <Button
                    icon={isPaused ? <PlayCircleOutlined /> : <PauseCircleOutlined />}
                    onClick={togglePause}
                  >
                    {isPaused ? '恢复' : '暂停'}
                  </Button>
                )}
              </div>
            </Col>
          </Row>
        </Card>

        {/* 处理列表 */}
        <Card title={`处理列表 (${processItems.length})`} size="small">
          <Table
            columns={columns}
            dataSource={processItems}
            rowKey="id"
            size="small"
            scroll={{ y: 400 }}
            pagination={{
              pageSize: 20,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `第 ${range[0]}-${range[1]} 项，共 ${total} 项`
            }}
            rowClassName={(record) => {
              if (record.status === 'completed') return 'bg-green-50';
              if (record.status === 'failed') return 'bg-red-50';
              if (record.status === 'manual_review') return 'bg-orange-50';
              if (record.status === 'processing') return 'bg-blue-50';
              return '';
            }}
          />
        </Card>

        {/* 处理提示 */}
        {currentStep === 0 && (
          <Alert
            message="处理说明"
            description={
              <div className="space-y-2">
                <div>• AI将自动识别学生信息区域和条形码区域</div>
                <div>• 低置信度结果将标记为需要人工审核</div>
                <div>• 可以设置批处理大小来控制并发处理数量</div>
                <div>• 处理过程中可以随时暂停和恢复</div>
              </div>
            }
            type="info"
            showIcon
          />
        )}
      </div>
    </Modal>
  );
};

export default BatchStudentInfoProcessor;