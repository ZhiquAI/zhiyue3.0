import React, { useState, useCallback, useRef } from 'react';
import {
  Card,
  Button,
  Typography,
  Row,
  Col,
  Steps,
  Alert,
  Progress,
  Tag,
  Collapse,
  Table,
  Divider,
  Switch,
  Slider,
  Input,
  Select,
  Modal,
  Upload,
  message,
  Space,
  Tooltip,
  Form
} from 'antd';
import {
  CloudUploadOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  RobotOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';

const { Title, Text, Paragraph } = Typography;
const { Step } = Steps;
const { Panel } = Collapse;
const { Option } = Select;

interface Question {
  id: string;
  number: string;
  type: string;
  type_display: string;
  question_text: string;
  student_answer: string;
  bbox: number[];
  confidence: Record<string, number>;
  metadata: Record<string, any>;
  processing_timestamp: string;
  processing_error?: string;
}

interface GradingResult {
  question_info: Question;
  grading_result: {
    question_number: string;
    score: number;
    max_score: number;
    feedback: string;
    is_correct?: boolean;
    rubric_scores?: Record<string, number>;
    quality_indicators?: Record<string, any>;
  };
  processing_timestamp: string;
}

interface ProcessingReport {
  total_questions: number;
  successful_processing: number;
  failed_processing: number;
  type_distribution: Record<string, number>;
  average_confidence: number;
  processing_time: number;
  quality_metrics: Record<string, any>;
}

const IntelligentSegmentation: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [manualAnnotations, setManualAnnotations] = useState<Array<{id: string, bbox: number[], questionNumber: number}>>([]);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [annotationMode, setAnnotationMode] = useState<'draw' | 'view'>('view');
  const [uploadedFile, setUploadedFile] = useState<UploadFile | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [segmentationResults, setSegmentationResults] = useState<Question[]>([]);
  const [gradingResults, setGradingResults] = useState<GradingResult[]>([]);
  const [processingReport, setProcessingReport] = useState<ProcessingReport | null>(null);
  const [workflowMode, setWorkflowMode] = useState<'segmentation' | 'grading' | 'complete'>('complete');
  const [configModalVisible, setConfigModalVisible] = useState(false);
  
  // 配置状态
  const [segmentationConfig, setSegmentationConfig] = useState({
    confidence_threshold: 0.7,
    enable_ai_classification: true,
    enable_answer_extraction: true,
    quality_check: true
  });
  
  const [gradingConfig, setGradingConfig] = useState({
    enable_partial_credit: true,
    use_ai_grading: true,
    confidence_threshold: 0.6
  });
  
  const [examConfig, setExamConfig] = useState({
    subject: '',
    grade_level: '',
    total_questions: 0,
    answer_key: {} as Record<string, string>
  });
  
  const steps = [
    {
      title: '上传试卷',
      description: '上传试卷图片文件'
    },
    {
      title: '配置参数',
      description: '设置处理参数'
    },
    {
      title: '智能处理',
      description: '执行切题与评分'
    },
    {
      title: '查看结果',
      description: '查看处理结果'
    }
  ];
  
  // 文件上传处理
  const handleUpload: UploadProps['customRequest'] = (options) => {
    const { file, onSuccess } = options;
    const uploadFile = file as UploadFile;
    setUploadedFile(uploadFile);
    
    // 创建图片预览URL
    if (uploadFile.originFileObj) {
      const previewUrl = URL.createObjectURL(uploadFile.originFileObj);
      setImagePreviewUrl(previewUrl);
    }
    
    setCurrentStep(1);
    message.success('文件上传成功');
    onSuccess?.(file);
  };
  
  // 执行智能处理
  const handleIntelligentProcessing = async () => {
    if (!uploadedFile || !uploadedFile.originFileObj) {
      message.error('请先上传文件');
      return;
    }
    
    setProcessing(true);
    setCurrentStep(2);
    
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile.originFileObj);
      formData.append('exam_config', JSON.stringify(examConfig));
      formData.append('segmentation_config', JSON.stringify(segmentationConfig));
      
      // 对于完整工作流，还需要添加答案键
      if (workflowMode === 'complete') {
        formData.append('answer_key', JSON.stringify({})); // 可以根据需要添加答案键
      }
      
      let endpoint = '';
      switch (workflowMode) {
        case 'complete':
          endpoint = '/api/intelligent-segmentation/complete-workflow';
          break;
        case 'segmentation':
          endpoint = '/api/intelligent-segmentation/segment-and-classify';
          break;
        case 'grading':
          endpoint = '/api/intelligent-segmentation/grade-segmented-questions';
          break;
        default:
          endpoint = '/api/intelligent-segmentation/complete-workflow';
      }
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${endpoint}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: '服务器错误' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }
      
      const result = await response.json();
      
      // 处理不同工作流模式的响应
      if (workflowMode === 'complete') {
        // 完整工作流返回的数据结构
        if (result.segmentation_results?.questions) {
          setSegmentationResults(result.segmentation_results.questions);
        }
        if (result.grading_results?.results) {
          setGradingResults(result.grading_results.results);
        }
        if (result.segmentation_results?.processing_report) {
          setProcessingReport(result.segmentation_results.processing_report);
        }
      } else if (workflowMode === 'segmentation') {
        // 仅切题模式
        if (result.questions) {
          setSegmentationResults(result.questions);
        }
        if (result.processing_report) {
          setProcessingReport(result.processing_report);
        }
      } else if (workflowMode === 'grading') {
        // 仅评分模式
        if (result.results) {
          setGradingResults(result.results);
        }
      }
      
      setCurrentStep(3);
      message.success('智能处理完成');
      
    } catch (error: any) {
      console.error('处理失败:', error);
      message.error(`处理失败: ${error.message || '网络错误'}`);
      
      // 如果API调用失败，回退到模拟数据以便测试
      console.log('回退到模拟数据模式');
      
      const mockQuestions: Question[] = [
        {
          id: '1',
          number: '1',
          type: 'choice',
          type_display: '选择题',
          question_text: '下列哪个选项是正确的？',
          student_answer: 'A',
          bbox: [100, 100, 200, 150],
          confidence: { detection: 0.95, classification: 0.88 },
          metadata: {},
          processing_timestamp: new Date().toISOString()
        },
        {
          id: '2',
          number: '2',
          type: 'short_answer',
          type_display: '简答题',
          question_text: '请简述...？',
          student_answer: '答案内容...',
          bbox: [100, 200, 400, 300],
          confidence: { detection: 0.92, classification: 0.85 },
          metadata: {},
          processing_timestamp: new Date().toISOString()
        }
      ];
      
      const mockReport: ProcessingReport = {
        total_questions: 2,
        successful_processing: 2,
        failed_processing: 0,
        type_distribution: { 'choice': 1, 'short_answer': 1 },
        average_confidence: 0.9,
        processing_time: 3000,
        quality_metrics: {}
      };
      
      setSegmentationResults(mockQuestions);
      setProcessingReport(mockReport);
      
      if (workflowMode === 'complete') {
        const mockGradingResults: GradingResult[] = mockQuestions.map(q => ({
          question_info: q,
          grading_result: {
            question_number: q.number,
            score: q.type === 'choice' ? 5 : 8,
            max_score: 10,
            feedback: '答案正确',
            is_correct: true
          },
          processing_timestamp: new Date().toISOString()
        }));
        setGradingResults(mockGradingResults);
      }
      
      setCurrentStep(3);
      message.warning('使用模拟数据进行演示');
      
    } finally {
      setProcessing(false);
    }
  };
  
  // 导出结果
  const handleExportResults = () => {
    const exportData = {
      segmentation_results: segmentationResults,
      grading_results: gradingResults,
      processing_report: processingReport,
      export_timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `intelligent_processing_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    
    message.success('结果已导出');
  };
  
  // 重置处理
  const handleReset = () => {
    setCurrentStep(0);
    setUploadedFile(null);
    
    // 清理图片预览URL
    if (imagePreviewUrl) {
      URL.revokeObjectURL(imagePreviewUrl);
      setImagePreviewUrl(null);
    }
    
    setSegmentationResults([]);
    setGradingResults([]);
    setProcessingReport(null);
    setManualAnnotations([]);
    setIsAnnotating(false);
    setAnnotationMode('view');
  };
  
  // 手动标注相关函数
  const handleAnnotationStart = (e: React.MouseEvent<HTMLDivElement>) => {
    if (annotationMode !== 'draw') return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const img = e.currentTarget.querySelector('img');
    if (!img) return;
    
    const imgRect = img.getBoundingClientRect();
    const startX = e.clientX - imgRect.left;
    const startY = e.clientY - imgRect.top;
    
    setIsAnnotating(true);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      // 这里可以添加实时绘制逻辑
    };
    
    const handleMouseUp = (upEvent: MouseEvent) => {
      const endX = upEvent.clientX - imgRect.left;
      const endY = upEvent.clientY - imgRect.top;
      
      // 确保坐标在图片范围内
      const minX = Math.max(0, Math.min(startX, endX));
      const minY = Math.max(0, Math.min(startY, endY));
      const maxX = Math.min(img.width, Math.max(startX, endX));
      const maxY = Math.min(img.height, Math.max(startY, endY));
      
      // 只有当框选区域足够大时才添加标注
      if (maxX - minX > 20 && maxY - minY > 20) {
        const newAnnotation = {
          id: `annotation_${Date.now()}`,
          bbox: [minX, minY, maxX, maxY],
          questionNumber: manualAnnotations.length + 1
        };
        setManualAnnotations(prev => [...prev, newAnnotation]);
      }
      
      setIsAnnotating(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleManualProcessing = async () => {
    if (!uploadedFile || manualAnnotations.length === 0) {
      message.error('请先上传文件并标注题目区域');
      return;
    }

    setProcessing(true);
    setCurrentStep(2);
    
    try {
      const formData = new FormData();
      formData.append('file', uploadedFile.originFileObj as File);
      formData.append('exam_config', JSON.stringify(examConfig));
      formData.append('segmentation_config', JSON.stringify(segmentationConfig));
      formData.append('grading_config', JSON.stringify(gradingConfig));
      formData.append('manual_annotations', JSON.stringify(manualAnnotations));
      
      let endpoint = '';
      switch (workflowMode) {
        case 'complete':
          endpoint = '/api/intelligent-segmentation/complete-workflow-manual';
          break;
        case 'segmentation':
          endpoint = '/api/intelligent-segmentation/segment-manual';
          break;
        case 'grading':
          endpoint = '/api/intelligent-segmentation/grade-manual';
          break;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}${endpoint}`, {
        method: 'POST',
        body: formData,
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`,
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // 处理手动标注的结果
      if (result.questions) {
        setSegmentationResults(result.questions);
      }
      if (result.grading_results) {
        setGradingResults(result.grading_results);
      }
      if (result.processing_report) {
        setProcessingReport(result.processing_report);
      }
      
      setCurrentStep(3);
      message.success('手动标注处理完成！');
      
    } catch (error) {
      console.error('手动处理失败:', error);
      message.error('手动处理失败，使用模拟数据进行演示');
      
      // 基于手动标注生成模拟结果
      const mockQuestions: Question[] = manualAnnotations.map((annotation, index) => ({
        id: `manual_q${index + 1}`,
        number: annotation.questionNumber.toString(),
        type: 'unknown',
        type_display: '手动标注',
        question_text: `手动标注题目 ${annotation.questionNumber}`,
        student_answer: '',
        bbox: annotation.bbox,
        confidence: { detection: 1.0, manual: 1.0 },
        metadata: { manual_annotation: true },
        processing_timestamp: new Date().toISOString()
      }));
      
      const mockReport: ProcessingReport = {
        total_questions: manualAnnotations.length,
        successful_processing: manualAnnotations.length,
        failed_processing: 0,
        type_distribution: { '手动标注': manualAnnotations.length },
        average_confidence: 1.0,
        processing_time: 1000,
        quality_metrics: {}
      };
      
      setSegmentationResults(mockQuestions);
      setProcessingReport(mockReport);
      
      if (workflowMode === 'complete') {
        const mockGradingResults: GradingResult[] = mockQuestions.map(q => ({
          question_info: q,
          grading_result: {
            question_number: q.number,
            score: 0,
            max_score: 10,
            feedback: '手动标注题目，需要人工评分'
          },
          processing_timestamp: new Date().toISOString()
        }));
        setGradingResults(mockGradingResults);
      }
      
      setCurrentStep(3);
    } finally {
      setProcessing(false);
    }
  };
  
  // 渲染置信度指示器
  const renderConfidenceTag = (confidence: number) => {
    const getColor = (conf: number) => {
      if (conf >= 0.8) return 'green';
      if (conf >= 0.6) return 'orange';
      return 'red';
    };
    
    return (
      <Tag color={getColor(confidence)}>
        {(confidence * 100).toFixed(1)}%
      </Tag>
    );
  };
  
  // 渲染题型分布
  const renderTypeDistribution = () => {
    if (!processingReport?.type_distribution) return null;
    
    const total = processingReport.total_questions;
    
    return (
      <Card title="题型分布" style={{ marginTop: 16 }}>
        <Row gutter={[16, 16]}>
          {Object.entries(processingReport.type_distribution).map(([type, count]) => (
            <Col span={6} key={type}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                  {count}
                </div>
                <div style={{ color: '#666' }}>{type}</div>
                <div style={{ fontSize: '12px', color: '#999' }}>
                  {((count / total) * 100).toFixed(1)}%
                </div>
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    );
  };
  
  // 切题结果表格列定义
  const segmentationColumns = [
    {
      title: '题号',
      dataIndex: 'number',
      key: 'number',
      width: 80
    },
    {
      title: '题型',
      dataIndex: 'type_display',
      key: 'type_display',
      render: (text: string) => <Tag>{text}</Tag>
    },
    {
      title: '题目内容',
      dataIndex: 'question_text',
      key: 'question_text',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 200 }}>
            {text}
          </Text>
        </Tooltip>
      )
    },
    {
      title: '学生答案',
      dataIndex: 'student_answer',
      key: 'student_answer',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 150 }}>
            {text}
          </Text>
        </Tooltip>
      )
    },
    {
      title: '置信度',
      key: 'confidence',
      render: (record: Question) => {
        const avgConfidence = Object.values(record.confidence).reduce((a, b) => a + b, 0) / Object.values(record.confidence).length;
        return renderConfidenceTag(avgConfidence);
      }
    },
    {
      title: '状态',
      key: 'status',
      render: (record: Question) => (
        record.processing_error ? (
          <Tag color="red" icon={<CloseCircleOutlined />}>失败</Tag>
        ) : (
          <Tag color="green" icon={<CheckCircleOutlined />}>成功</Tag>
        )
      )
    }
  ];
  
  // 评分结果表格列定义
  const gradingColumns = [
    {
      title: '题号',
      dataIndex: ['grading_result', 'question_number'],
      key: 'question_number',
      width: 80
    },
    {
      title: '得分',
      dataIndex: ['grading_result', 'score'],
      key: 'score',
      render: (score: number, record: GradingResult) => (
        <Text strong style={{ 
          color: score === record.grading_result.max_score ? '#52c41a' : '#fa8c16' 
        }}>
          {score}
        </Text>
      )
    },
    {
      title: '满分',
      dataIndex: ['grading_result', 'max_score'],
      key: 'max_score'
    },
    {
      title: '正确性',
      dataIndex: ['grading_result', 'is_correct'],
      key: 'is_correct',
      render: (isCorrect: boolean) => (
        isCorrect !== undefined ? (
          <Tag color={isCorrect ? 'green' : 'red'}>
            {isCorrect ? '正确' : '错误'}
          </Tag>
        ) : null
      )
    },
    {
      title: '反馈',
      dataIndex: ['grading_result', 'feedback'],
      key: 'feedback',
      ellipsis: true,
      render: (text: string) => (
        <Tooltip title={text}>
          <Text ellipsis style={{ maxWidth: 200 }}>
            {text}
          </Text>
        </Tooltip>
      )
    }
  ];
  
  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', padding: 24 }}>
      <Title level={2}>智能切题与分类评分</Title>
      <Paragraph type="secondary">
        使用AI技术自动识别题目区域、分类题型并进行智能评分
      </Paragraph>
      
      {/* 工作流模式选择 */}
      <Card title="处理模式" style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col span={8}>
            <Button
              type={workflowMode === 'complete' ? 'primary' : 'default'}
              block
              icon={<RobotOutlined />}
              onClick={() => setWorkflowMode('complete')}
            >
              完整工作流
            </Button>
          </Col>
          <Col span={8}>
            <Button
              type={workflowMode === 'segmentation' ? 'primary' : 'default'}
              block
              icon={<EyeOutlined />}
              onClick={() => setWorkflowMode('segmentation')}
            >
              仅智能切题
            </Button>
          </Col>
          <Col span={8}>
            <Button
              block
              icon={<SettingOutlined />}
              onClick={() => setConfigModalVisible(true)}
            >
              配置参数
            </Button>
          </Col>
        </Row>
      </Card>
      
      {/* 步骤指示器 */}
      <Steps current={currentStep} style={{ marginBottom: 24 }}>
        {steps.map((step, index) => (
          <Step key={index} title={step.title} description={step.description} />
        ))}
      </Steps>
      
      {/* 步骤内容 */}
      <Card>
        {currentStep === 0 && (
          <div>
            <Title level={4}>上传试卷图片</Title>
            <Upload.Dragger
              name="file"
              multiple={false}
              accept="image/*"
              customRequest={handleUpload}
              showUploadList={false}
              style={{ marginBottom: 16 }}
            >
              <p className="ant-upload-drag-icon">
                <CloudUploadOutlined style={{ fontSize: 48, color: '#1890ff' }} />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 PNG, JPG, JPEG, BMP, TIFF 格式
              </p>
            </Upload.Dragger>
            
            {uploadedFile && (
              <div>
                <Alert
                  message={`已上传: ${uploadedFile.name}`}
                  type="success"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
                
                {/* 图片预览 */}
                {imagePreviewUrl && (
                  <Card title="图片预览" style={{ marginTop: 16 }}>
                    <div style={{ textAlign: 'center' }}>
                      <img
                        src={imagePreviewUrl}
                        alt="上传的试卷"
                        style={{
                          maxWidth: '100%',
                          maxHeight: '400px',
                          objectFit: 'contain',
                          border: '1px solid #d9d9d9',
                          borderRadius: '6px'
                        }}
                      />
                    </div>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}
        
        {currentStep === 1.5 && (
          <div>
            <Title level={4}>手动标注题目区域</Title>
            <Alert
              message="提示"
              description="请在图片上框选题目区域。点击'开始标注'后，在图片上拖拽鼠标框选每道题目的区域。"
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <Space style={{ marginBottom: 16 }}>
              <Button
                type={annotationMode === 'draw' ? 'primary' : 'default'}
                icon={<EyeOutlined />}
                onClick={() => setAnnotationMode(annotationMode === 'draw' ? 'view' : 'draw')}
              >
                {annotationMode === 'draw' ? '完成标注' : '开始标注'}
              </Button>
              <Button
                onClick={() => setManualAnnotations([])}
                disabled={manualAnnotations.length === 0}
              >
                清除标注
              </Button>
              <Button
                type="primary"
                onClick={() => {
                  if (manualAnnotations.length > 0) {
                    // 使用手动标注的区域进行处理
                    handleManualProcessing();
                  } else {
                    message.warning('请先标注题目区域');
                  }
                }}
                disabled={manualAnnotations.length === 0}
              >
                使用标注区域切题
              </Button>
              <Button
                onClick={() => setCurrentStep(1)}
              >
                返回配置
              </Button>
            </Space>
            
            {imagePreviewUrl && (
              <Card title={`图片标注 (已标注 ${manualAnnotations.length} 个区域)`}>
                <div 
                  style={{ 
                    position: 'relative', 
                    display: 'inline-block',
                    cursor: annotationMode === 'draw' ? 'crosshair' : 'default'
                  }}
                  onMouseDown={annotationMode === 'draw' ? handleAnnotationStart : undefined}
                >
                  <img
                    src={imagePreviewUrl}
                    alt="标注图片"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '600px',
                      objectFit: 'contain',
                      border: '1px solid #d9d9d9',
                      borderRadius: '6px',
                      userSelect: 'none'
                    }}
                    draggable={false}
                  />
                  {/* 渲染标注框 */}
                  {manualAnnotations.map((annotation, index) => (
                    <div
                      key={annotation.id}
                      style={{
                        position: 'absolute',
                        left: `${annotation.bbox[0]}px`,
                        top: `${annotation.bbox[1]}px`,
                        width: `${annotation.bbox[2] - annotation.bbox[0]}px`,
                        height: `${annotation.bbox[3] - annotation.bbox[1]}px`,
                        border: '2px solid #1890ff',
                        backgroundColor: 'rgba(24, 144, 255, 0.1)',
                        pointerEvents: 'none'
                      }}
                    >
                      <div
                        style={{
                          position: 'absolute',
                          top: '-25px',
                          left: '0',
                          background: '#1890ff',
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '3px',
                          fontSize: '12px'
                        }}
                      >
                        题目 {annotation.questionNumber}
                      </div>
                    </div>
                  ))}
                </div>
                
                {annotationMode === 'draw' && (
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">
                      提示：按住鼠标左键拖拽来框选题目区域
                    </Text>
                  </div>
                )}
              </Card>
            )}
          </div>
        )}
        
        {currentStep === 1 && (
          <div>
            <Title level={4}>配置处理参数</Title>
            <Form layout="vertical">
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Form.Item label="科目">
                    <Input
                      value={examConfig.subject}
                      onChange={(e) => setExamConfig(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="请输入科目"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="年级">
                    <Input
                      value={examConfig.grade_level}
                      onChange={(e) => setExamConfig(prev => ({ ...prev, grade_level: e.target.value }))}
                      placeholder="请输入年级"
                    />
                  </Form.Item>
                </Col>
                <Col span={24}>
                  <Form.Item label="预期题目数量">
                    <Input
                      type="number"
                      value={examConfig.total_questions}
                      onChange={(e) => setExamConfig(prev => ({ ...prev, total_questions: parseInt(e.target.value) || 0 }))}
                      placeholder="请输入预期题目数量"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
            
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                loading={processing}
                onClick={handleIntelligentProcessing}
                disabled={!uploadedFile}
              >
                {processing ? '处理中...' : '开始智能切题'}
              </Button>
              <Button
                icon={<EyeOutlined />}
                onClick={() => setCurrentStep(1.5)}
                disabled={!uploadedFile}
              >
                手动标注题目
              </Button>
            </Space>
          </div>
        )}
        
        {currentStep === 2 && (
          <div>
            <Title level={4}>执行智能处理</Title>
            {processing && (
              <div style={{ marginBottom: 16 }}>
                <Text>正在处理，请稍候...</Text>
                <Progress percent={66} status="active" style={{ marginTop: 8 }} />
              </div>
            )}
            
            {segmentationResults.length > 0 && (
              <Alert
                message={`智能切题完成，识别到 ${segmentationResults.length} 道题目`}
                type="success"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}
          </div>
        )}
        
        {currentStep === 3 && processingReport && (
          <div>
            <Title level={4}>处理结果报告</Title>
            
            {/* 处理概览 */}
            <Card title="处理概览" style={{ marginBottom: 16 }}>
              <Row gutter={[16, 16]}>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#1890ff' }}>
                      {processingReport.total_questions}
                    </div>
                    <div>总题目数</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#52c41a' }}>
                      {processingReport.successful_processing}
                    </div>
                    <div>成功处理</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#ff4d4f' }}>
                      {processingReport.failed_processing}
                    </div>
                    <div>处理失败</div>
                  </div>
                </Col>
                <Col span={6}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '32px', fontWeight: 'bold', color: '#722ed1' }}>
                      {(processingReport.processing_time / 1000).toFixed(1)}s
                    </div>
                    <div>处理时间</div>
                  </div>
                </Col>
              </Row>
            </Card>
            
            {/* 原图片显示 */}
            {imagePreviewUrl && (
              <Card title="原始图片" style={{ marginTop: 16 }}>
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={imagePreviewUrl}
                    alt="处理的试卷"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '500px',
                      objectFit: 'contain',
                      border: '1px solid #d9d9d9',
                      borderRadius: '6px'
                    }}
                  />
                  <div style={{ marginTop: 8, color: '#666', fontSize: '14px' }}>
                    在此图片上识别到 {segmentationResults.length} 道题目
                  </div>
                </div>
              </Card>
            )}
            
            {/* 题型分布 */}
            {renderTypeDistribution()}
            
            {/* 详细结果 */}
            <Collapse style={{ marginTop: 16 }}>
              {segmentationResults.length > 0 && (
                <Panel header={`切题结果详情 (${segmentationResults.length} 道题目)`} key="segmentation">
                  <Table
                    columns={segmentationColumns}
                    dataSource={segmentationResults}
                    rowKey="id"
                    size="small"
                    pagination={{ pageSize: 10 }}
                  />
                </Panel>
              )}
              
              {gradingResults.length > 0 && (
                <Panel header={`评分结果详情 (${gradingResults.length} 道题目)`} key="grading">
                  <Table
                    columns={gradingColumns}
                    dataSource={gradingResults}
                    rowKey={(record) => record.question_info.id}
                    size="small"
                    pagination={{ pageSize: 10 }}
                  />
                </Panel>
              )}
            </Collapse>
            
            {/* 操作按钮 */}
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleExportResults}
              >
                导出结果
              </Button>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleReset}
              >
                重新开始
              </Button>
            </Space>
          </div>
        )}
      </Card>
      
      {/* 配置模态框 */}
      <Modal
        title="配置处理参数"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        onOk={() => setConfigModalVisible(false)}
        width={600}
      >
        <Form layout="vertical">
          <Title level={5}>切题配置</Title>
          <Form.Item label="置信度阈值">
            <Slider
              value={segmentationConfig.confidence_threshold}
              onChange={(value) => setSegmentationConfig(prev => ({ ...prev, confidence_threshold: value }))}
              min={0.1}
              max={1.0}
              step={0.1}
              marks={{ 0.1: '0.1', 0.5: '0.5', 1.0: '1.0' }}
            />
          </Form.Item>
          
          <Form.Item>
            <Space direction="vertical">
              <div>
                <Switch
                  checked={segmentationConfig.enable_ai_classification}
                  onChange={(checked) => setSegmentationConfig(prev => ({ ...prev, enable_ai_classification: checked }))}
                />
                <span style={{ marginLeft: 8 }}>启用AI分类</span>
              </div>
              <div>
                <Switch
                  checked={segmentationConfig.enable_answer_extraction}
                  onChange={(checked) => setSegmentationConfig(prev => ({ ...prev, enable_answer_extraction: checked }))}
                />
                <span style={{ marginLeft: 8 }}>启用答案提取</span>
              </div>
            </Space>
          </Form.Item>
          
          <Divider />
          
          <Title level={5}>评分配置</Title>
          <Form.Item>
            <Space direction="vertical">
              <div>
                <Switch
                  checked={gradingConfig.enable_partial_credit}
                  onChange={(checked) => setGradingConfig(prev => ({ ...prev, enable_partial_credit: checked }))}
                />
                <span style={{ marginLeft: 8 }}>启用部分分数</span>
              </div>
              <div>
                <Switch
                  checked={gradingConfig.use_ai_grading}
                  onChange={(checked) => setGradingConfig(prev => ({ ...prev, use_ai_grading: checked }))}
                />
                <span style={{ marginLeft: 8 }}>使用AI评分</span>
              </div>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default IntelligentSegmentation;