// Gemini OCR 识别面板组件
import React, { useState, useCallback } from 'react';
import { Card, Button, Upload, Progress, Alert, Table, Tag, Space, Modal, Tooltip, Divider } from 'antd';
import { CloudUploadOutlined, EyeOutlined, DeleteOutlined, ReloadOutlined, CheckCircleOutlined, ExclamationCircleOutlined, RobotOutlined } from '@ant-design/icons';
import { useGeminiOCR, OCRResult } from '../../hooks/useGeminiOCR';
import type { UploadFile } from 'antd/es/upload/interface';

interface GeminiOCRPanelProps {
  type: 'answer_sheet' | 'paper';
  onRecognitionComplete?: (results: any[]) => void;
  maxFiles?: number;
}

interface ProcessedFile {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: OCRResult;
  error?: string;
  quality?: any;
}

const GeminiOCRPanel: React.FC<GeminiOCRPanelProps> = ({
  type,
  onRecognitionComplete,
  maxFiles = 10
}) => {
  const {
    isHealthy,
    isOCRLoading,
    isBatchLoading,
    checkHealth,
    recognizeAnswerSheet,
    recognizePaperDocument,
    batchRecognize,
    validateFile,
    getQualityAssessment
  } = useGeminiOCR();

  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [processedFiles, setProcessedFiles] = useState<ProcessedFile[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [selectedFile, setSelectedFile] = useState<ProcessedFile | null>(null);

  // 文件上传前验证
  const beforeUpload = useCallback((file: File) => {
    if (!validateFile(file)) {
      return false;
    }

    if (fileList.length >= maxFiles) {
      message.error(`最多只能上传 ${maxFiles} 个文件`);
      return false;
    }

    return false; // 阻止自动上传
  }, [fileList.length, maxFiles, validateFile]);

  // 处理文件选择
  const handleChange = useCallback((info: any) => {
    setFileList(info.fileList);
  }, []);

  // 开始识别
  const handleStartRecognition = useCallback(async () => {
    if (fileList.length === 0) {
      message.warning('请先选择要识别的文件');
      return;
    }

    const files = fileList.map(f => f.originFileObj!).filter(Boolean);
    
    // 初始化处理状态
    const initialProcessedFiles: ProcessedFile[] = files.map(file => ({
      id: `${Date.now()}_${Math.random()}`,
      file,
      status: 'pending'
    }));
    
    setProcessedFiles(initialProcessedFiles);

    try {
      // 逐个处理文件以便实时更新状态
      const results = [];
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const processedFile = initialProcessedFiles[i];
        
        // 更新为处理中状态
        setProcessedFiles(prev => prev.map(pf => 
          pf.id === processedFile.id 
            ? { ...pf, status: 'processing' }
            : pf
        ));

        try {
          let result: OCRResult;
          
          if (type === 'answer_sheet') {
            result = await recognizeAnswerSheet(file);
          } else {
            result = await recognizePaperDocument(file);
          }

          const quality = getQualityAssessment(result);
          
          // 更新为完成状态
          setProcessedFiles(prev => prev.map(pf => 
            pf.id === processedFile.id 
              ? { ...pf, status: 'completed', result, quality }
              : pf
          ));

          results.push({
            filename: file.name,
            status: 'success',
            result,
            quality
          });

        } catch (error) {
          // 更新为错误状态
          setProcessedFiles(prev => prev.map(pf => 
            pf.id === processedFile.id 
              ? { ...pf, status: 'error', error: error.message }
              : pf
          ));

          results.push({
            filename: file.name,
            status: 'error',
            error: error.message
          });
        }
      }

      // 通知父组件识别完成
      if (onRecognitionComplete) {
        onRecognitionComplete(results);
      }

    } catch (error) {
      console.error('Recognition failed:', error);
    }
  }, [fileList, type, recognizeAnswerSheet, recognizePaperDocument, getQualityAssessment, onRecognitionComplete]);

  // 重试单个文件
  const handleRetryFile = useCallback(async (processedFile: ProcessedFile) => {
    setProcessedFiles(prev => prev.map(pf => 
      pf.id === processedFile.id 
        ? { ...pf, status: 'processing', error: undefined }
        : pf
    ));

    try {
      let result: OCRResult;
      
      if (type === 'answer_sheet') {
        result = await recognizeAnswerSheet(processedFile.file);
      } else {
        result = await recognizePaperDocument(processedFile.file);
      }

      const quality = getQualityAssessment(result);
      
      setProcessedFiles(prev => prev.map(pf => 
        pf.id === processedFile.id 
          ? { ...pf, status: 'completed', result, quality }
          : pf
      ));

    } catch (error) {
      setProcessedFiles(prev => prev.map(pf => 
        pf.id === processedFile.id 
          ? { ...pf, status: 'error', error: error.message }
          : pf
      ));
    }
  }, [type, recognizeAnswerSheet, recognizePaperDocument, getQualityAssessment]);

  // 预览文件
  const handlePreview = useCallback((processedFile: ProcessedFile) => {
    const url = URL.createObjectURL(processedFile.file);
    setPreviewImage(url);
    setPreviewVisible(true);
  }, []);

  // 查看识别结果
  const handleViewResult = useCallback((processedFile: ProcessedFile) => {
    setSelectedFile(processedFile);
  }, []);

  // 删除文件
  const handleDeleteFile = useCallback((processedFile: ProcessedFile) => {
    setProcessedFiles(prev => prev.filter(pf => pf.id !== processedFile.id));
    setFileList(prev => prev.filter(f => f.name !== processedFile.file.name));
  }, []);

  // 清空所有文件
  const handleClearAll = useCallback(() => {
    setFileList([]);
    setProcessedFiles([]);
  }, []);

  // 表格列定义
  const columns = [
    {
      title: '文件名',
      dataIndex: 'file',
      key: 'filename',
      render: (file: File) => (
        <div className="flex items-center gap-2">
          <CloudUploadOutlined className="text-blue-500" />
          <div>
            <div className="font-medium">{file.name}</div>
            <div className="text-xs text-gray-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
          </div>
        </div>
      )
    },
    {
      title: '识别状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: ProcessedFile) => {
        const statusConfig = {
          pending: { color: 'default', text: '等待中', icon: null },
          processing: { color: 'processing', text: '识别中', icon: <RobotOutlined className="animate-spin" /> },
          completed: { color: 'success', text: '已完成', icon: <CheckCircleOutlined /> },
          error: { color: 'error', text: '识别失败', icon: <ExclamationCircleOutlined /> }
        };
        
        const config = statusConfig[status as keyof typeof statusConfig];
        
        return (
          <div className="flex items-center gap-2">
            <Tag color={config.color} icon={config.icon}>
              {config.text}
            </Tag>
            {record.quality && (
              <Tooltip title={`质量评分: ${record.quality.score}/10, 置信度: ${(record.quality.confidence * 100).toFixed(1)}%`}>
                <Tag color={record.quality.color} size="small">
                  质量: {record.quality.level}
                </Tag>
              </Tooltip>
            )}
          </div>
        );
      }
    },
    {
      title: '识别结果',
      key: 'result',
      render: (_, record: ProcessedFile) => {
        if (record.status === 'completed' && record.result) {
          if (type === 'answer_sheet') {
            const studentInfo = record.result.student_info;
            return studentInfo ? (
              <div>
                <div className="font-medium">{studentInfo.name || '未识别'}</div>
                <div className="text-sm text-gray-500">
                  {studentInfo.student_id || '无学号'} · {studentInfo.class || '无班级'}
                </div>
              </div>
            ) : (
              <span className="text-gray-400">未识别到学生信息</span>
            );
          } else {
            const paperInfo = record.result.paper_info;
            const questions = record.result.questions || [];
            return (
              <div>
                <div className="font-medium">{paperInfo?.subject || '历史'}</div>
                <div className="text-sm text-gray-500">
                  {questions.length} 道题目 · {paperInfo?.total_score || 0} 分
                </div>
              </div>
            );
          }
        }
        
        if (record.status === 'error') {
          return (
            <div className="text-red-500 text-sm">
              {record.error || '识别失败'}
            </div>
          );
        }
        
        return <span className="text-gray-400">-</span>;
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record: ProcessedFile) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
          >
            预览
          </Button>
          
          {record.status === 'completed' && (
            <Button
              type="text"
              size="small"
              onClick={() => handleViewResult(record)}
            >
              查看结果
            </Button>
          )}
          
          {record.status === 'error' && (
            <Button
              type="text"
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => handleRetryFile(record)}
            >
              重试
            </Button>
          )}
          
          <Button
            type="text"
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteFile(record)}
          >
            删除
          </Button>
        </Space>
      )
    }
  ];

  const completedCount = processedFiles.filter(f => f.status === 'completed').length;
  const errorCount = processedFiles.filter(f => f.status === 'error').length;
  const processingCount = processedFiles.filter(f => f.status === 'processing').length;

  return (
    <div className="space-y-4">
      {/* 服务状态 */}
      <Alert
        message={
          <div className="flex items-center justify-between">
            <span>
              Gemini OCR 服务状态: {isHealthy ? 
                <Tag color="green">正常</Tag> : 
                <Tag color="red">异常</Tag>
              }
            </span>
            <Button type="link" size="small" onClick={checkHealth}>
              检查状态
            </Button>
          </div>
        }
        type={isHealthy ? 'success' : 'warning'}
        className="mb-4"
      />

      {/* 文件上传区域 */}
      <Card title={`${type === 'answer_sheet' ? '答题卡' : '试卷'}识别`}>
        <Upload.Dragger
          multiple
          fileList={fileList}
          beforeUpload={beforeUpload}
          onChange={handleChange}
          accept=".jpg,.jpeg,.png,.pdf"
          disabled={isOCRLoading || isBatchLoading}
        >
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined style={{ fontSize: '48px', color: '#1677ff' }} />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持 JPG、PNG、PDF 格式，单个文件不超过 10MB，最多 {maxFiles} 个文件
          </p>
        </Upload.Dragger>

        {fileList.length > 0 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-600">
              已选择 {fileList.length} 个文件
            </span>
            <Space>
              <Button onClick={handleClearAll} disabled={isOCRLoading}>
                清空
              </Button>
              <Button
                type="primary"
                icon={<RobotOutlined />}
                onClick={handleStartRecognition}
                loading={isOCRLoading || isBatchLoading}
                disabled={fileList.length === 0 || !isHealthy}
              >
                开始识别
              </Button>
            </Space>
          </div>
        )}

        {/* 处理进度 */}
        {processedFiles.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">识别进度</span>
              <span className="text-sm text-gray-500">
                {completedCount + errorCount} / {processedFiles.length}
              </span>
            </div>
            <Progress 
              percent={Math.round(((completedCount + errorCount) / processedFiles.length) * 100)}
              status={processingCount > 0 ? 'active' : 'normal'}
            />
            
            {/* 统计信息 */}
            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
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

      {/* 识别结果列表 */}
      {processedFiles.length > 0 && (
        <Card title="识别结果">
          <Table
            columns={columns}
            dataSource={processedFiles}
            rowKey="id"
            pagination={false}
            size="small"
          />
        </Card>
      )}

      {/* 预览模态框 */}
      <Modal
        open={previewVisible}
        title="文件预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
        centered
      >
        <div className="text-center">
          <img
            alt="文件预览"
            style={{ width: '100%', maxHeight: '600px', objectFit: 'contain' }}
            src={previewImage}
          />
        </div>
      </Modal>

      {/* 识别结果详情模态框 */}
      <Modal
        open={!!selectedFile}
        title="识别结果详情"
        footer={null}
        onCancel={() => setSelectedFile(null)}
        width={800}
      >
        {selectedFile && selectedFile.result && (
          <div className="space-y-4">
            {type === 'answer_sheet' ? (
              <div>
                <h4>学生信息</h4>
                <div className="bg-gray-50 p-4 rounded">
                  <p><strong>姓名:</strong> {selectedFile.result.student_info?.name || '未识别'}</p>
                  <p><strong>学号:</strong> {selectedFile.result.student_info?.student_id || '未识别'}</p>
                  <p><strong>班级:</strong> {selectedFile.result.student_info?.class || '未识别'}</p>
                </div>
                
                <Divider />
                
                <h4>答题内容</h4>
                <div className="space-y-2">
                  {selectedFile.result.objective_answers && Object.keys(selectedFile.result.objective_answers).length > 0 && (
                    <div>
                      <h5>客观题答案</h5>
                      <div className="bg-gray-50 p-4 rounded">
                        {Object.entries(selectedFile.result.objective_answers).map(([q, a]) => (
                          <span key={q} className="mr-4">第{q}题: {a}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {selectedFile.result.subjective_answers && Object.keys(selectedFile.result.subjective_answers).length > 0 && (
                    <div>
                      <h5>主观题答案</h5>
                      <div className="space-y-2">
                        {Object.entries(selectedFile.result.subjective_answers).map(([q, a]) => (
                          <div key={q} className="bg-gray-50 p-4 rounded">
                            <p className="font-medium">第{q}题:</p>
                            <p className="whitespace-pre-wrap">{a}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div>
                <h4>试卷信息</h4>
                <div className="bg-gray-50 p-4 rounded">
                  <p><strong>科目:</strong> {selectedFile.result.paper_info?.subject || '历史'}</p>
                  <p><strong>考试名称:</strong> {selectedFile.result.paper_info?.exam_name || '未识别'}</p>
                  <p><strong>总分:</strong> {selectedFile.result.paper_info?.total_score || 0}</p>
                  <p><strong>考试时间:</strong> {selectedFile.result.paper_info?.duration || '未识别'}</p>
                </div>
                
                <Divider />
                
                <h4>题目列表</h4>
                <div className="space-y-2 max-h-400 overflow-y-auto">
                  {selectedFile.result.questions?.map((question, index) => (
                    <div key={index} className="bg-gray-50 p-4 rounded">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">第{question.number}题</span>
                        <div className="space-x-2">
                          <Tag color="blue">{question.type}</Tag>
                          <Tag color="green">{question.points}分</Tag>
                          <Tag color="orange">{question.difficulty}</Tag>
                        </div>
                      </div>
                      <p className="text-sm">{question.content}</p>
                      {question.knowledge_points && question.knowledge_points.length > 0 && (
                        <div className="mt-2">
                          <span className="text-xs text-gray-500">知识点: </span>
                          {question.knowledge_points.map((kp, idx) => (
                            <Tag key={idx} size="small">{kp}</Tag>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 质量评估 */}
            {selectedFile.quality && (
              <div>
                <Divider />
                <h4>质量评估</h4>
                <div className="bg-gray-50 p-4 rounded">
                  <p><strong>清晰度评分:</strong> {selectedFile.quality.score}/10</p>
                  <p><strong>识别置信度:</strong> {(selectedFile.quality.confidence * 100).toFixed(1)}%</p>
                  {selectedFile.quality.issues.length > 0 && (
                    <div>
                      <p><strong>发现问题:</strong></p>
                      <ul className="list-disc list-inside">
                        {selectedFile.quality.issues.map((issue, idx) => (
                          <li key={idx} className="text-sm text-red-600">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {selectedFile.quality.suggestions.length > 0 && (
                    <div>
                      <p><strong>建议:</strong></p>
                      <ul className="list-disc list-inside">
                        {selectedFile.quality.suggestions.map((suggestion, idx) => (
                          <li key={idx} className="text-sm text-blue-600">{suggestion}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default GeminiOCRPanel;