import React, { useState, useEffect } from 'react';
import {
  Modal, Card, Button, Space, Progress, Alert, Table, Tag,
  Row, Col, Statistic, Upload, Tooltip
} from 'antd';
import { message } from '../../utils/message';
import {
  BarcodeOutlined, EyeOutlined, CheckCircleOutlined,
  ExclamationCircleOutlined, ReloadOutlined, DownloadOutlined
} from '@ant-design/icons';
import { barcodeApi } from '../../services/api';

interface ProcessedAnswerSheet {
  id: string;
  filename: string;
  previewUrl?: string;
  studentInfo?: {
    id: string;
    name: string;
    class: string;
  };
  barcodeInfo?: {
    detected: boolean;
    results: Array<{
      data: string;
      type: string;
      student_info?: any;
      confidence: number;
      rect: {
        x: number;
        y: number;
        width: number;
        height: number;
      };
    }>;
  };
}

interface BarcodeInfoProcessorProps {
  visible: boolean;
  onClose: () => void;
  answerSheets: ProcessedAnswerSheet[];
  onUpdateSheet: (sheetId: string, updates: Partial<ProcessedAnswerSheet>) => void;
}

interface ProcessItem {
  id: string;
  sheetId: string;
  filename: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  barcodeResults?: any[];
  errorMessage?: string;
}

const BarcodeInfoProcessor: React.FC<BarcodeInfoProcessorProps> = ({
  visible,
  onClose,
  answerSheets,
  onUpdateSheet
}) => {
  const [processItems, setProcessItems] = useState<ProcessItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [currentProcessingId, setCurrentProcessingId] = useState<string | null>(null);
  const [statistics, setStatistics] = useState({
    total: 0,
    completed: 0,
    failed: 0,
    pending: 0
  });

  // 初始化处理项目
  useEffect(() => {
    if (visible && answerSheets.length > 0) {
      const items: ProcessItem[] = answerSheets.map(sheet => ({
        id: `barcode-${sheet.id}`,
        sheetId: sheet.id,
        filename: sheet.filename,
        status: sheet.barcodeInfo?.detected ? 'completed' : 'pending',
        progress: sheet.barcodeInfo?.detected ? 100 : 0,
        barcodeResults: sheet.barcodeInfo?.results || []
      }));
      setProcessItems(items);
      updateStatistics(items);
    }
  }, [visible, answerSheets]);

  // 更新统计信息
  const updateStatistics = (items: ProcessItem[]) => {
    const stats = {
      total: items.length,
      completed: items.filter(item => item.status === 'completed').length,
      failed: items.filter(item => item.status === 'failed').length,
      pending: items.filter(item => item.status === 'pending').length
    };
    setStatistics(stats);
  };

  // 更新项目状态
  const updateItemStatus = (itemId: string, status: ProcessItem['status'], progress: number, results?: any[], errorMessage?: string) => {
    setProcessItems(prev => {
      const newItems = prev.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            status,
            progress,
            barcodeResults: results || item.barcodeResults,
            errorMessage
          };
        }
        return item;
      });
      updateStatistics(newItems);
      return newItems;
    });
  };

  // 处理单个项目
  const processItem = async (item: ProcessItem): Promise<ProcessItem> => {
    try {
      // 更新状态为处理中
      updateItemStatus(item.id, 'processing', 10);
      
      // 获取对应的答题卡
      const sheet = answerSheets.find(s => s.id === item.sheetId);
      if (!sheet || !sheet.previewUrl) {
        throw new Error('答题卡图片不存在');
      }

      updateItemStatus(item.id, 'processing', 30);

      // 调用条形码识别API
      const response = await barcodeApi.recognizeBarcodeByPath(sheet.previewUrl);

      updateItemStatus(item.id, 'processing', 70);

      if (response.data && response.data.status === 'success' && response.data.results && response.data.results.length > 0) {
        // 识别成功
        const barcodeInfo = {
          detected: true,
          results: response.data.results
        };
        
        // 更新答题卡信息
        onUpdateSheet(item.sheetId, { barcodeInfo });
        
        updateItemStatus(item.id, 'completed', 100, response.data.results);
        
        return {
          ...item,
          status: 'completed',
          progress: 100,
          barcodeResults: response.data.results
        };
      } else {
        // 未检测到条形码
        const barcodeInfo = {
          detected: false,
          results: []
        };
        
        onUpdateSheet(item.sheetId, { barcodeInfo });
        
        updateItemStatus(item.id, 'completed', 100, []);
        
        return {
          ...item,
          status: 'completed',
          progress: 100,
          barcodeResults: []
        };
      }
    } catch (error: any) {
      console.error('Barcode recognition failed:', error);
      const errorMessage = error.response?.data?.detail || error.message || '条形码识别失败';
      
      updateItemStatus(item.id, 'failed', 0, [], errorMessage);
      
      return {
        ...item,
        status: 'failed',
        progress: 0,
        errorMessage
      };
    }
  };

  // 开始批量处理
  const startBatchProcessing = async () => {
    const pendingItems = processItems.filter(item => item.status === 'pending' || item.status === 'failed');
    
    if (pendingItems.length === 0) {
      message.warning('没有需要处理的项目');
      return;
    }

    setProcessing(true);
    
    try {
      for (const item of pendingItems) {
        setCurrentProcessingId(item.id);
        await processItem(item);
        
        // 添加延迟避免请求过快
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      message.success('批量条形码识别完成');
    } catch (error) {
      message.error('批量处理过程中出现错误');
    } finally {
      setProcessing(false);
      setCurrentProcessingId(null);
    }
  };

  // 重试单个项目
  const retryItem = async (item: ProcessItem) => {
    setCurrentProcessingId(item.id);
    await processItem(item);
    setCurrentProcessingId(null);
  };

  // 表格列定义
  const columns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      width: 200,
      ellipsis: true
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string, record: ProcessItem) => {
        const statusConfig = {
          pending: { color: 'default', text: '待处理' },
          processing: { color: 'processing', text: '处理中' },
          completed: { color: 'success', text: '已完成' },
          failed: { color: 'error', text: '失败' }
        };
        
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '进度',
      dataIndex: 'progress',
      key: 'progress',
      width: 120,
      render: (progress: number, record: ProcessItem) => (
        <Progress 
          percent={progress} 
          size="small" 
          status={record.status === 'failed' ? 'exception' : undefined}
        />
      )
    },
    {
      title: '条形码结果',
      key: 'results',
      render: (_: any, record: ProcessItem) => {
        if (record.status === 'completed') {
          if (record.barcodeResults && record.barcodeResults.length > 0) {
            return (
              <div className="space-y-1">
                {record.barcodeResults.map((result, index) => (
                  <div key={index} className="text-xs">
                    <Tag color="green">{result.type}</Tag>
                    <span className="text-gray-600">{result.data}</span>
                  </div>
                ))}
              </div>
            );
          } else {
            return <Tag color="orange">未检测到条形码</Tag>;
          }
        }
        return record.errorMessage ? (
          <Tooltip title={record.errorMessage}>
            <Tag color="red">错误</Tag>
          </Tooltip>
        ) : '-';
      }
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (_: any, record: ProcessItem) => (
        <Space size="small">
          {record.status === 'failed' && (
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => retryItem(record)}
              loading={currentProcessingId === record.id}
            >
              重试
            </Button>
          )}
          <Button
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              const sheet = answerSheets.find(s => s.id === record.sheetId);
              if (sheet?.previewUrl) {
                // 创建一个新的图片元素来预览
                const img = new window.Image();
                img.onload = () => {
                  const newWindow = window.open('', '_blank');
                  if (newWindow) {
                    newWindow.document.write(`
                      <html>
                        <head><title>答题卡预览 - ${sheet.filename}</title></head>
                        <body style="margin:0;padding:20px;background:#f0f0f0;display:flex;justify-content:center;align-items:center;min-height:100vh;">
                          <img src="${sheet.previewUrl}" style="max-width:100%;max-height:100%;object-fit:contain;box-shadow:0 4px 8px rgba(0,0,0,0.1);" alt="答题卡预览" />
                        </body>
                      </html>
                    `);
                    newWindow.document.close();
                  }
                };
                img.onerror = () => {
                  message.error('预览图片加载失败');
                };
                img.src = sheet.previewUrl;
              } else {
                message.warning('该答题卡没有可用的预览图片');
              }
            }}
          >
            预览
          </Button>
        </Space>
      )
    }
  ];

  const progressPercentage = statistics.total > 0 
    ? Math.round((statistics.completed + statistics.failed) / statistics.total * 100)
    : 0;

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <BarcodeOutlined className="text-blue-600" />
          <div>
            <div className="text-lg font-semibold">条形码信息识别</div>
            <div className="text-sm text-gray-500 font-normal">
              共 {answerSheets.length} 张答题卡
            </div>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1000}
      footer={[
        <Button key="close" onClick={onClose}>
          关闭
        </Button>,
        <Button
          key="start"
          type="primary"
          icon={<BarcodeOutlined />}
          onClick={startBatchProcessing}
          loading={processing}
          disabled={statistics.pending === 0 && statistics.failed === 0}
        >
          {processing ? '识别中...' : '开始识别'}
        </Button>
      ]}
    >
      {/* 统计信息 */}
      <Card className="mb-4">
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总数"
              value={statistics.total}
              prefix={<BarcodeOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="已完成"
              value={statistics.completed}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="失败"
              value={statistics.failed}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
          <Col span={6}>
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">总体进度</div>
              <Progress
                type="circle"
                percent={progressPercentage}
                size={40}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
            </div>
          </Col>
        </Row>
      </Card>

      {/* 处理说明 */}
      <Alert
        message="条形码识别说明"
        description={
          <div className="space-y-1 text-sm">
            <div>• 系统将自动识别答题卡上的条形码信息</div>
            <div>• 支持多种条形码格式：CODE128、CODE39、QR码等</div>
            <div>• 识别到的条形码数据将用于自动填充学生信息</div>
            <div>• 未检测到条形码的答题卡将依赖OCR识别</div>
          </div>
        }
        type="info"
        showIcon
        className="mb-4"
      />

      {/* 处理列表 */}
      <Card title={`处理列表 (${processItems.length})`} size="small">
        <Table
          columns={columns}
          dataSource={processItems}
          rowKey="id"
          size="small"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
          }}
          scroll={{ y: 400 }}
        />
      </Card>
    </Modal>
  );
};

export default BarcodeInfoProcessor;