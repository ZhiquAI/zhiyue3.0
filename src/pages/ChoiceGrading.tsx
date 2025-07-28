import React, { useState, useEffect, useRef } from 'react';
import {
  Card,
  Form,
  Input,
  Button,
  Upload,
  message,
  Divider,
  Row,
  Col,
  Typography,
  Space,
  Table,
  Tag,
  Progress,
  Alert,
  Select,
  Radio,
  Modal,
  Spin
} from 'antd';
import { UploadOutlined, CheckCircleOutlined, CloseCircleOutlined, EditOutlined, LoadingOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import axios from 'axios';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface QuestionScore {
  question_number: string;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  score: number;
  max_score: number;
  confidence: number;
  feedback: string;
  quality_issues: string[];
}

interface GradingSummary {
  total_questions: number;
  correct_count: number;
  total_score: number;
  max_total_score: number;
  accuracy_rate: string;
  average_confidence: string;
  grading_time: string;
}

interface GradingResult {
  summary: GradingSummary;
  question_details: QuestionScore[];
  quality_summary?: any;
}

interface NonChoiceQuestion {
  id: string;
  content: string;
  answer: string;
  gradingType: 'auto' | 'manual';
  score?: number;
  maxScore: number;
}

const ChoiceGrading: React.FC = () => {

  const [loading, setLoading] = useState(false);
  const [gradingResult, setGradingResult] = useState<GradingResult | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  
  // 实时评分状态
  const [realtimeGrading, setRealtimeGrading] = useState({
    isActive: false,
    taskId: '',
    progress: 0,
    status: 'pending',
    error: null as string | null
  });
  const [showProgressModal, setShowProgressModal] = useState(false);
  const websocketRef = useRef<WebSocket | null>(null);
  const [nonChoiceQuestions, setNonChoiceQuestions] = useState<NonChoiceQuestion[]>([
    {
      id: '1',
      content: '请简述人工智能的发展历程。',
      answer: '',
      gradingType: 'auto',
      maxScore: 10
    },
    {
      id: '2', 
      content: '分析机器学习在医疗领域的应用前景。',
      answer: '',
      gradingType: 'auto',
      maxScore: 15
    }
  ]);
  const [choiceAnswers, setChoiceAnswers] = useState<Record<string, string>>({});

  // WebSocket连接管理
  useEffect(() => {
    return () => {
      // 组件卸载时清理WebSocket连接
      if (websocketRef.current) {
        websocketRef.current.close();
      }
    };
  }, []);

  // 建立WebSocket连接
  const connectWebSocket = (taskId: string) => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/choice-grading/ws/${taskId}`;
    
    websocketRef.current = new WebSocket(wsUrl);
    
    websocketRef.current.onopen = () => {
      console.log('WebSocket连接已建立');
    };
    
    websocketRef.current.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
      } catch (error) {
        console.error('WebSocket消息解析错误:', error);
      }
    };
    
    websocketRef.current.onclose = () => {
      console.log('WebSocket连接已关闭');
    };
    
    websocketRef.current.onerror = (error) => {
      console.error('WebSocket连接错误:', error);
      setRealtimeGrading(prev => ({
        ...prev,
        error: 'WebSocket连接失败'
      }));
    };
  };

  // 处理WebSocket消息
  const handleWebSocketMessage = (data: any) => {
    switch (data.type) {
      case 'task_status':
      case 'task_update':
        setRealtimeGrading(prev => ({
          ...prev,
          progress: data.progress || 0,
          status: data.status || 'pending',
          error: data.error || null
        }));
        
        // 如果任务完成，设置结果
        if (data.status === 'completed' && data.result) {
          setGradingResult(data.result);
          setShowProgressModal(false);
          setRealtimeGrading(prev => ({ ...prev, isActive: false }));
          message.success('实时评分完成！');
        } else if (data.status === 'failed') {
          setShowProgressModal(false);
          setRealtimeGrading(prev => ({ ...prev, isActive: false }));
          message.error(`评分失败: ${data.error || '未知错误'}`);
        }
        break;
        
      case 'error':
        message.error(data.message || '发生错误');
        setShowProgressModal(false);
        setRealtimeGrading(prev => ({ ...prev, isActive: false }));
        break;
        
      case 'pong':
        // 心跳响应
        break;
        
      default:
        console.log('未知WebSocket消息类型:', data.type);
    }
  };

  // 发送心跳
  const sendHeartbeat = () => {
    if (websocketRef.current && websocketRef.current.readyState === WebSocket.OPEN) {
      websocketRef.current.send(JSON.stringify({ type: 'ping' }));
    }
  };

  // 默认参考答案（12道选择题）
  const defaultReferenceAnswers = {
    "1": "A",
    "2": "B", 
    "3": "C",
    "4": "D",
    "5": "A",
    "6": "B",
    "7": "C",
    "8": "D",
    "9": "A",
    "10": "B",
    "11": "C",
    "12": "D"
  };

  // 默认分值配置（每题5分）
  const defaultScoreConfig = {
    "1": 5.0, "2": 5.0, "3": 5.0, "4": 5.0,
    "5": 5.0, "6": 5.0, "7": 5.0, "8": 5.0,
    "9": 5.0, "10": 5.0, "11": 5.0, "12": 5.0
  };

  const handleManualGrading = async () => {
    if (Object.keys(choiceAnswers).length === 0) {
      message.warning('请先填写选择题答案');
      return;
    }

    setLoading(true);
    try {
      // 使用异步评分接口
      const response = await axios.post('/api/choice-grading/grade-async', {
        student_answers: choiceAnswers,
        reference_answers: defaultReferenceAnswers,
        score_config: defaultScoreConfig,
        enable_bubble_analysis: false
      });

      if (response.data.success) {
        const taskId = response.data.data.task_id;
        
        // 设置实时评分状态
        setRealtimeGrading({
          isActive: true,
          taskId: taskId,
          progress: 0,
          status: 'pending',
          error: null
        });
        
        // 显示进度弹窗
        setShowProgressModal(true);
        
        // 建立WebSocket连接
        connectWebSocket(taskId);
        
        message.success('评分任务已启动，正在实时处理...');
      } else {
        message.error('创建评分任务失败');
      }
    } catch (error: any) {
      console.error('评分错误:', error);
      message.error('评分失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // 传统同步评分（备用）
  const handleSyncGrading = async () => {
    if (Object.keys(choiceAnswers).length === 0) {
      message.warning('请先填写选择题答案');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post('/api/choice-grading/grade', {
        student_answers: choiceAnswers,
        reference_answers: defaultReferenceAnswers,
        score_config: defaultScoreConfig,
        enable_bubble_analysis: false
      });

      if (response.data.success) {
        setGradingResult(response.data.data);
        message.success('选择题评分完成！');
      } else {
        message.error('评分失败');
      }
    } catch (error: any) {
      console.error('评分错误:', error);
      message.error('评分失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOCRGrading = async () => {
    if (fileList.length === 0) {
      message.error('请先上传答题卡图片');
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', fileList[0].originFileObj as File);
      formData.append('reference_answers', JSON.stringify(defaultReferenceAnswers));
      formData.append('score_config', JSON.stringify(defaultScoreConfig));
      formData.append('enable_bubble_analysis', 'true');

      const response = await axios.post('/api/choice-grading/grade-with-ocr', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setGradingResult(response.data.data.grading_result);
        message.success('OCR识别和评分完成！');
      } else {
        message.error('OCR评分失败');
      }
    } catch (error: any) {
      console.error('OCR评分错误:', error);
      message.error('OCR评分失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    fileList,
    beforeUpload: (file) => {
      const isImage = file.type.startsWith('image/');
      if (!isImage) {
        message.error('只能上传图片文件！');
        return false;
      }
      setFileList([file]);
      return false;
    },
    onRemove: () => {
      setFileList([]);
    }
  };

  const renderGradingResult = () => {
    if (!gradingResult) return null;

    const columns = [
      {
        title: '题号',
        dataIndex: 'question_number',
        key: 'question_number',
        width: 80,
      },
      {
        title: '学生答案',
        dataIndex: 'student_answer',
        key: 'student_answer',
        width: 100,
        render: (text: string) => text || '-'
      },
      {
        title: '参考答案',
        dataIndex: 'reference_answer',
        key: 'reference_answer',
        width: 100,
      },
      {
        title: '是否正确',
        dataIndex: 'is_correct',
        key: 'is_correct',
        width: 100,
        render: (correct: boolean) => (
          <Tag color={correct ? 'success' : 'error'} icon={correct ? <CheckCircleOutlined /> : <CloseCircleOutlined />}>
            {correct ? '正确' : '错误'}
          </Tag>
        )
      },
      {
        title: '得分',
        dataIndex: 'score',
        key: 'score',
        width: 80,
        render: (score: any) => `${Number(score) || 0}分`
      },
      {
        title: '置信度',
        dataIndex: 'confidence',
        key: 'confidence',
        width: 100,
        render: (confidence: any) => {
          const confNum = Number(confidence) || 0;
          return (
            <Progress 
              percent={Math.round(confNum * 100)} 
              size="small" 
              status={confNum > 0.8 ? 'success' : confNum > 0.6 ? 'normal' : 'exception'}
            />
          );
        }
      }
    ];

    const dataSource = gradingResult.question_details?.map(score => ({
      key: score.question_number,
      question_number: score.question_number,
      student_answer: score.student_answer,
      reference_answer: score.correct_answer,
      is_correct: score.is_correct,
      score: Number(score.score) || 0,
      confidence: Number(score.confidence) || 0
    })) || [];

    // 从后端返回的数据结构中正确提取总分和统计信息
    const summary = gradingResult.summary || {};
    const totalScore = Number(summary.total_score) || 0;
    const correctCount = Number(summary.correct_count) || 0;
    const totalQuestions = Number(summary.total_questions) || 0;
    const incorrectCount = totalQuestions - correctCount;
    const accuracyRate = totalQuestions > 0 ? (correctCount / totalQuestions) : 0;
    
    // 验证总分一致性（手动计算vs后端返回）
    const calculatedTotalScore = gradingResult.question_details?.reduce((sum, q) => sum + Number(q.score), 0) || 0;
    const scoreConsistent = Math.abs(totalScore - calculatedTotalScore) < 0.001;
    
    // 如果发现不一致，在控制台输出警告
    if (!scoreConsistent) {
      console.warn('分数不一致警告:', {
        backend_total: totalScore,
        calculated_total: calculatedTotalScore,
        question_details: gradingResult.question_details
      });
    }

    return (
      <Card title="评分结果" style={{ marginTop: 24 }}>
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                  {totalScore}
                </Title>
                <Text type="secondary">总分</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
                  {correctCount}
                </Title>
                <Text type="secondary">正确题数</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#f5222d' }}>
                  {incorrectCount}
                </Title>
                <Text type="secondary">错误题数</Text>
              </div>
            </Card>
          </Col>
          <Col span={6}>
            <Card size="small">
              <div style={{ textAlign: 'center' }}>
                <Title level={3} style={{ margin: 0, color: '#722ed1' }}>
                  {Math.round(accuracyRate * 100)}%
                </Title>
                <Text type="secondary">正确率</Text>
              </div>
            </Card>
          </Col>
        </Row>

        {gradingResult.quality_summary && (
          <Alert
            message="质量分析"
            description={gradingResult.quality_summary}
            type="info"
            style={{ marginBottom: 16 }}
          />
        )}

        <Table
          columns={columns}
          dataSource={dataSource}
          pagination={false}
          size="small"
          bordered
        />
      </Card>
    );
  };

  // 渲染实时评分进度弹窗
  const renderProgressModal = () => {
    const getStatusText = (status: string) => {
      switch (status) {
        case 'pending': return '等待处理';
        case 'processing': return '正在评分';
        case 'completed': return '评分完成';
        case 'failed': return '评分失败';
        default: return '未知状态';
      }
    };

    const getStatusColor = (status: string) => {
      switch (status) {
        case 'pending': return '#1890ff';
        case 'processing': return '#52c41a';
        case 'completed': return '#52c41a';
        case 'failed': return '#f5222d';
        default: return '#d9d9d9';
      }
    };

    return (
      <Modal
        title="实时评分进度"
        open={showProgressModal}
        footer={[
          <Button 
            key="close" 
            onClick={() => {
              setShowProgressModal(false);
              if (websocketRef.current) {
                websocketRef.current.close();
              }
              setRealtimeGrading(prev => ({ ...prev, isActive: false }));
            }}
            disabled={realtimeGrading.status === 'processing'}
          >
            {realtimeGrading.status === 'processing' ? '评分中...' : '关闭'}
          </Button>
        ]}
        closable={realtimeGrading.status !== 'processing'}
        maskClosable={false}
        width={500}
      >
        <div style={{ textAlign: 'center', padding: '20px 0' }}>
          <div style={{ marginBottom: 20 }}>
            <Spin 
              indicator={<LoadingOutlined style={{ fontSize: 48, color: getStatusColor(realtimeGrading.status) }} spin />}
              spinning={realtimeGrading.status === 'processing'}
            >
              <div style={{ height: 48 }} />
            </Spin>
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <Text strong style={{ fontSize: 16, color: getStatusColor(realtimeGrading.status) }}>
              {getStatusText(realtimeGrading.status)}
            </Text>
          </div>
          
          <div style={{ marginBottom: 20 }}>
            <Progress 
              percent={realtimeGrading.progress} 
              status={realtimeGrading.status === 'failed' ? 'exception' : 
                     realtimeGrading.status === 'completed' ? 'success' : 'active'}
              strokeColor={getStatusColor(realtimeGrading.status)}
            />
          </div>
          
          {realtimeGrading.error && (
            <Alert
              message="评分错误"
              description={realtimeGrading.error}
              type="error"
              style={{ marginBottom: 16, textAlign: 'left' }}
            />
          )}
          
          <div style={{ color: '#666', fontSize: 12 }}>
            任务ID: {realtimeGrading.taskId}
          </div>
        </div>
      </Modal>
    );
  };

  const handleChoiceAnswerChange = (questionNum: string, value: string) => {
    setChoiceAnswers(prev => ({
      ...prev,
      [questionNum]: value
    }));
  };

  const handleNonChoiceAnswerChange = (questionId: string, value: string) => {
    setNonChoiceQuestions(prev => 
      prev.map(q => q.id === questionId ? { ...q, answer: value } : q)
    );
  };

  const handleGradingTypeChange = (questionId: string, type: 'auto' | 'manual') => {
    setNonChoiceQuestions(prev => 
      prev.map(q => q.id === questionId ? { ...q, gradingType: type } : q)
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <Title level={2}>智能评分系统</Title>
      <Text type="secondary">
        支持选择题和非选择题的智能评分，提供多种评分模式和详细分析报告。
      </Text>

      <Row gutter={24} style={{ marginTop: 24 }}>
        {/* 左侧：答题内容区域 */}
        <Col span={12}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 选择题答案区域 */}
            <Card title="选择题答案" size="small">
              <Row gutter={8}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                  <Col span={4} key={num}>
                    <div style={{ 
                      textAlign: 'center', 
                      padding: '12px 8px', 
                      border: '1px solid #d9d9d9', 
                      borderRadius: '6px',
                      backgroundColor: choiceAnswers[num.toString()] ? '#f6ffed' : '#fafafa'
                    }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>第{num}题</div>
                      <Radio.Group 
                        value={choiceAnswers[num.toString()]} 
                        onChange={(e) => handleChoiceAnswerChange(num.toString(), e.target.value)}
                        size="small"
                      >
                        <Radio.Button value="A">A</Radio.Button>
                        <Radio.Button value="B">B</Radio.Button>
                        <Radio.Button value="C">C</Radio.Button>
                        <Radio.Button value="D">D</Radio.Button>
                      </Radio.Group>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>

            {/* 非选择题答案区域 */}
            <Card title="非选择题答案" size="small">
              <Space direction="vertical" style={{ width: '100%' }} size="middle">
                {nonChoiceQuestions.map((question, index) => (
                  <Card key={question.id} size="small" style={{ backgroundColor: '#fafafa' }}>
                    <div style={{ marginBottom: 12 }}>
                      <Text strong>第{index + 1}题 (满分: {question.maxScore}分)</Text>
                      <div style={{ marginTop: 4 }}>
                        <Text>{question.content}</Text>
                      </div>
                    </div>
                    
                    <TextArea
                      value={question.answer}
                      onChange={(e) => handleNonChoiceAnswerChange(question.id, e.target.value)}
                      placeholder="请输入答案内容..."
                      rows={3}
                      style={{ marginBottom: 12 }}
                    />
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <Text type="secondary" style={{ marginRight: 8 }}>评分方式:</Text>
                        <Select
                          value={question.gradingType}
                          onChange={(value) => handleGradingTypeChange(question.id, value)}
                          size="small"
                          style={{ width: 120 }}
                        >
                          <Option value="auto">智能评分</Option>
                          <Option value="manual">人工评分</Option>
                        </Select>
                      </div>
                      {question.score !== undefined && (
                        <Tag color="blue">得分: {question.score}分</Tag>
                      )}
                    </div>
                  </Card>
                ))}
              </Space>
            </Card>
          </Space>
        </Col>

        {/* 右侧：评分功能区域 */}
        <Col span={12}>
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            {/* 手动评分 */}
             <Card title="手动输入评分" size="small">
               <Button 
                 type="primary" 
                 onClick={handleManualGrading} 
                 loading={loading} 
                 block
                 disabled={Object.keys(choiceAnswers).length === 0}
               >
                 开始选择题评分
               </Button>
             </Card>

            {/* OCR识别评分 */}
            <Card title="OCR识别评分" size="small">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Upload {...uploadProps}>
                  <Button icon={<UploadOutlined />}>上传答题卡图片</Button>
                </Upload>
                
                <Button 
                  type="primary" 
                  onClick={handleOCRGrading} 
                  loading={loading}
                  disabled={fileList.length === 0}
                  block
                >
                  OCR识别并评分
                </Button>
              </Space>
            </Card>

            {/* 参考答案 */}
            <Card title="选择题参考答案" size="small">
              <Row gutter={8}>
                {Object.entries(defaultReferenceAnswers).map(([num, answer]) => (
                  <Col span={4} key={num}>
                    <div style={{ textAlign: 'center', padding: '8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
                      <div style={{ fontSize: '12px', color: '#666' }}>第{num}题</div>
                      <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#1890ff' }}>{answer}</div>
                    </div>
                  </Col>
                ))}
              </Row>
            </Card>
          </Space>
        </Col>
      </Row>

      {renderGradingResult()}
        
        {/* 实时评分进度弹窗 */}
        {renderProgressModal()}
      </div>
    );
};

export default ChoiceGrading;