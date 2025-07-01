import React, { useState, useCallback } from 'react';
import { Card, Row, Col, Breadcrumb, Button, Upload, Progress, Alert, Table, Tag, message, Modal, Spin, Empty, Tooltip, Space } from 'antd';
import { UploadOutlined, DeleteOutlined, EyeOutlined, CheckCircleOutlined, ExclamationCircleOutlined, FileImageOutlined, ReloadOutlined, CloudUploadOutlined } from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import { Exam } from '../../types/exam';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

interface AnswerSheetUploadWorkspaceProps {
  exam: Exam;
}

interface ProcessedAnswerSheet {
  id: string;
  filename: string;
  size: number;
  status: 'processing' | 'completed' | 'error' | 'duplicate';
  studentInfo?: {
    id: string;
    name: string;
    class: string;
  };
  recognitionResult?: {
    confidence: number;
    issues: string[];
  };
  previewUrl?: string;
  errorMessage?: string;
}

const AnswerSheetUploadWorkspace: React.FC<AnswerSheetUploadWorkspaceProps> = ({ exam }) => {
  const { setSubViewInfo, updateExamStatus } = useAppContext();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [processedSheets, setProcessedSheets] = useState<ProcessedAnswerSheet[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [selectedSheet, setSelectedSheet] = useState<ProcessedAnswerSheet | null>(null);

  const handleBack = () => {
    setSubViewInfo({ view: null, exam: null });
  };

  // 文件上传前的验证
  const beforeUpload = (file: File) => {
    const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type);
    if (!isValidType) {
      message.error('只支持 JPG、PNG、PDF 格式的文件！');
      return false;
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过 10MB！');
      return false;
    }

    return false; // 阻止自动上传，手动控制
  };

  // 处理文件选择
  const handleChange: UploadProps['onChange'] = (info) => {
    setFileList(info.fileList);
  };

  // 批量上传答题卡
  const handleBatchUpload = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择要上传的答题卡文件');
      return;
    }

    setUploading(true);
    setProcessing(true);

    try {
      message.loading('正在上传答题卡...', 0);

      // 模拟批量上传和处理过程
      const results: ProcessedAnswerSheet[] = [];
      
      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        const fileObj = file.originFileObj!;
        
        // 模拟上传进度
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 模拟OCR识别和学生信息提取
        const mockResult: ProcessedAnswerSheet = {
          id: `sheet_${Date.now()}_${i}`,
          filename: fileObj.name,
          size: fileObj.size,
          status: Math.random() > 0.1 ? 'completed' : 'error', // 90%成功率
          previewUrl: URL.createObjectURL(fileObj),
        };

        if (mockResult.status === 'completed') {
          // 模拟成功识别的学生信息
          const mockStudents = [
            { id: '2024001', name: '张三', class: '八年级1班' },
            { id: '2024002', name: '李四', class: '八年级1班' },
            { id: '2024003', name: '王五', class: '八年级2班' },
            { id: '2024004', name: '赵六', class: '八年级2班' },
            { id: '2024005', name: '钱七', class: '八年级3班' },
          ];
          
          const randomStudent = mockStudents[Math.floor(Math.random() * mockStudents.length)];
          mockResult.studentInfo = randomStudent;
          mockResult.recognitionResult = {
            confidence: Math.floor(Math.random() * 20) + 80, // 80-100的置信度
            issues: Math.random() > 0.7 ? ['图片略微模糊'] : []
          };
        } else {
          mockResult.errorMessage = '无法识别学生信息，请检查答题卡质量';
        }

        results.push(mockResult);
      }

      message.destroy();
      setProcessedSheets(results);
      
      const successCount = results.filter(r => r.status === 'completed').length;
      const errorCount = results.filter(r => r.status === 'error').length;
      
      if (errorCount === 0) {
        message.success(`答题卡上传完成！成功处理 ${successCount} 份答题卡`);
      } else {
        message.warning(`上传完成！成功 ${successCount} 份，失败 ${errorCount} 份`);
      }

    } catch (error) {
      message.destroy();
      message.error('答题卡上传失败，请重试');
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  // 重新处理失败的答题卡
  const handleRetryProcessing = async (sheetId: string) => {
    const sheet = processedSheets.find(s => s.id === sheetId);
    if (!sheet) return;

    // 更新状态为处理中
    setProcessedSheets(prev => prev.map(s => 
      s.id === sheetId ? { ...s, status: 'processing' } : s
    ));

    // 模拟重新处理
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 模拟处理结果
    const success = Math.random() > 0.3; // 70%成功率
    
    setProcessedSheets(prev => prev.map(s => {
      if (s.id === sheetId) {
        if (success) {
          return {
            ...s,
            status: 'completed',
            studentInfo: {
              id: '2024999',
              name: '重试学生',
              class: '八年级1班'
            },
            recognitionResult: {
              confidence: 85,
              issues: []
            },
            errorMessage: undefined
          };
        } else {
          return {
            ...s,
            status: 'error',
            errorMessage: '重新处理仍然失败，建议手动输入学生信息'
          };
        }
      }
      return s;
    }));

    if (success) {
      message.success('重新处理成功！');
    } else {
      message.error('重新处理失败，请检查文件质量');
    }
  };

  // 删除答题卡
  const handleDeleteSheet = (sheetId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这份答题卡吗？删除后无法恢复。',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setProcessedSheets(prev => {
          const sheet = prev.find(s => s.id === sheetId);
          if (sheet?.previewUrl) {
            URL.revokeObjectURL(sheet.previewUrl);
          }
          return prev.filter(s => s.id !== sheetId);
        });
        message.success('答题卡已删除');
      }
    });
  };

  // 预览答题卡
  const handlePreview = (sheet: ProcessedAnswerSheet) => {
    if (sheet.previewUrl) {
      setPreviewImage(sheet.previewUrl);
      setPreviewVisible(true);
    }
  };

  // 完成上传，开始阅卷
  const handleStartGrading = () => {
    const completedSheets = processedSheets.filter(s => s.status === 'completed');
    
    if (completedSheets.length === 0) {
      message.warning('没有成功处理的答题卡，无法开始阅卷');
      return;
    }

    Modal.confirm({
      title: '开始阅卷确认',
      content: `即将开始阅卷，共有 ${completedSheets.length} 份答题卡。确认开始吗？`,
      okText: '开始阅卷',
      cancelText: '取消',
      onOk: () => {
        // 更新考试状态为"阅卷中"
        updateExamStatus(exam.id, '阅卷中');
        message.success('答题卡上传完成，考试已进入阅卷状态！');
        
        // 跳转到阅卷工作台
        setTimeout(() => {
          setSubViewInfo({ view: 'marking', exam: { ...exam, status: '阅卷中' } });
        }, 1500);
      }
    });
  };

  // 清空所有文件
  const handleClearAll = () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空所有已上传的答题卡吗？此操作无法撤销。',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        // 清理URL对象
        processedSheets.forEach(sheet => {
          if (sheet.previewUrl) {
            URL.revokeObjectURL(sheet.previewUrl);
          }
        });
        
        setFileList([]);
        setProcessedSheets([]);
        message.success('已清空所有文件');
      }
    });
  };

  // 表格列定义
  const columns = [
    {
      title: '文件名',
      dataIndex: 'filename',
      key: 'filename',
      render: (text: string, record: ProcessedAnswerSheet) => (
        <div className="flex items-center gap-2">
          <FileImageOutlined className="text-blue-500" />
          <div>
            <div className="font-medium">{text}</div>
            <div className="text-xs text-gray-500">
              {(record.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        </div>
      )
    },
    {
      title: '处理状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: ProcessedAnswerSheet) => {
        const statusConfig = {
          processing: { color: 'processing', text: '处理中', icon: <Spin size="small" /> },
          completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
          error: { color: 'error', text: '处理失败', icon: <ExclamationCircleOutlined /> },
          duplicate: { color: 'warning', text: '重复文件', icon: <ExclamationCircleOutlined /> }
        };
        
        const config = statusConfig[status as keyof typeof statusConfig];
        
        return (
          <div className="flex items-center gap-2">
            <Tag color={config.color} icon={config.icon}>
              {config.text}
            </Tag>
            {status === 'completed' && record.recognitionResult && (
              <Tooltip title={`识别置信度: ${record.recognitionResult.confidence}%`}>
                <Tag color="blue" size="small">
                  {record.recognitionResult.confidence}%
                </Tag>
              </Tooltip>
            )}
          </div>
        );
      }
    },
    {
      title: '学生信息',
      key: 'studentInfo',
      render: (_, record: ProcessedAnswerSheet) => {
        if (record.status === 'processing') {
          return <Spin size="small" />;
        }
        
        if (record.status === 'error') {
          return (
            <div className="text-red-500 text-sm">
              {record.errorMessage || '识别失败'}
            </div>
          );
        }
        
        if (record.studentInfo) {
          return (
            <div>
              <div className="font-medium">{record.studentInfo.name}</div>
              <div className="text-sm text-gray-500">
                {record.studentInfo.id} · {record.studentInfo.class}
              </div>
            </div>
          );
        }
        
        return <span className="text-gray-400">-</span>;
      }
    },
    {
      title: '质量检查',
      key: 'quality',
      render: (_, record: ProcessedAnswerSheet) => {
        if (record.status !== 'completed' || !record.recognitionResult) {
          return <span className="text-gray-400">-</span>;
        }
        
        const { issues } = record.recognitionResult;
        
        if (issues.length === 0) {
          return <Tag color="green">质量良好</Tag>;
        }
        
        return (
          <Tooltip title={issues.join('、')}>
            <Tag color="orange">有问题 ({issues.length})</Tag>
          </Tooltip>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: ProcessedAnswerSheet) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
            disabled={!record.previewUrl}
          >
            预览
          </Button>
          
          {record.status === 'error' && (
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRetryProcessing(record.id)}
            >
              重试
            </Button>
          )}
          
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteSheet(record.id)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  const completedCount = processedSheets.filter(s => s.status === 'completed').length;
  const errorCount = processedSheets.filter(s => s.status === 'error').length;
  const processingCount = processedSheets.filter(s => s.status === 'processing').length;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Breadcrumb
          items={[
            { title: <a onClick={handleBack}>考试管理</a> },
            { title: exam.name },
            { title: '上传答题卡' }
          ]}
        />
        
        <div className="flex items-center gap-2">
          {processedSheets.length > 0 && (
            <Button onClick={handleClearAll} disabled={processing}>
              清空所有
            </Button>
          )}
          
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={handleStartGrading}
            disabled={completedCount === 0}
          >
            完成上传，开始阅卷 ({completedCount})
          </Button>
        </div>
      </div>

      {/* 上传说明 */}
      <Alert
        message="答题卡上传说明"
        description={
          <div className="space-y-2">
            <p><strong>支持格式：</strong>JPG、PNG、PDF（单个文件最大10MB）</p>
            <p><strong>建议规格：</strong>清晰度300DPI以上，确保学生信息和答题内容清晰可见</p>
            <p><strong>批量上传：</strong>可一次选择多个文件，系统将自动识别学生信息</p>
            <p><strong>质量检查：</strong>系统会自动检查答题卡质量，标记需要人工复核的文件</p>
          </div>
        }
        type="info"
        showIcon
        className="mb-6"
      />

      <Row gutter={[24, 24]}>
        {/* 左侧：文件上传区域 */}
        <Col xs={24} lg={10}>
          <Card 
            title={
              <div className="flex items-center gap-2">
                <CloudUploadOutlined className="text-blue-600" />
                <span>批量上传答题卡</span>
              </div>
            }
            className="h-full"
          >
            <Upload.Dragger
              multiple
              fileList={fileList}
              beforeUpload={beforeUpload}
              onChange={handleChange}
              accept=".jpg,.jpeg,.png,.pdf"
              className="mb-4"
              disabled={uploading}
            >
              <p className="ant-upload-drag-icon">
                <CloudUploadOutlined style={{ fontSize: '48px', color: '#1677ff' }} />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个或批量上传。支持JPG、PNG、PDF格式，单个文件不超过10MB
              </p>
            </Upload.Dragger>

            {fileList.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    已选择 {fileList.length} 个文件
                  </span>
                  <Button 
                    type="primary"
                    icon={<UploadOutlined />}
                    onClick={handleBatchUpload}
                    loading={uploading}
                    disabled={fileList.length === 0}
                  >
                    {uploading ? '上传中...' : '开始上传'}
                  </Button>
                </div>

                {uploading && (
                  <div className="space-y-2">
                    <Progress 
                      percent={Math.floor((processedSheets.length / fileList.length) * 100)}
                      status="active"
                    />
                    <p className="text-sm text-gray-600 text-center">
                      正在处理第 {processedSheets.length + 1} / {fileList.length} 个文件...
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* 上传统计 */}
            {processedSheets.length > 0 && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <div className="text-sm font-medium text-gray-700 mb-3">处理统计</div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold text-green-600">{completedCount}</div>
                    <div className="text-xs text-gray-500">成功</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-red-600">{errorCount}</div>
                    <div className="text-xs text-gray-500">失败</div>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{processingCount}</div>
                    <div className="text-xs text-gray-500">处理中</div>
                  </div>
                </div>
              </div>
            )}
          </Card>
        </Col>

        {/* 右侧：处理结果列表 */}
        <Col xs={24} lg={14}>
          <Card 
            title={
              <div className="flex items-center justify-between">
                <span>答题卡处理结果</span>
                {processedSheets.length > 0 && (
                  <Tag color="blue">{processedSheets.length} 份</Tag>
                )}
              </div>
            }
            className="h-full"
          >
            {processedSheets.length === 0 ? (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="请先上传答题卡文件"
              />
            ) : (
              <Table
                columns={columns}
                dataSource={processedSheets}
                rowKey="id"
                pagination={false}
                size="small"
                scroll={{ y: 400 }}
              />
            )}

            {/* 操作提示 */}
            {completedCount > 0 && (
              <Alert
                message="准备就绪"
                description={`已成功处理 ${completedCount} 份答题卡，可以开始阅卷流程。${errorCount > 0 ? `还有 ${errorCount} 份处理失败，可以重试或手动处理。` : ''}`}
                type="success"
                showIcon
                className="mt-4"
                action={
                  <Button
                    type="primary"
                    size="small"
                    onClick={handleStartGrading}
                  >
                    开始阅卷
                  </Button>
                }
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* 预览模态框 */}
      <Modal
        open={previewVisible}
        title="答题卡预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        centered
      >
        <div className="text-center">
          <img
            alt="答题卡预览"
            style={{ width: '100%', maxHeight: '600px', objectFit: 'contain' }}
            src={previewImage}
          />
        </div>
      </Modal>
    </div>
  );
};

export default AnswerSheetUploadWorkspace;