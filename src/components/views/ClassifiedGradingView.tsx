import React, { useState, useEffect } from 'react';
import { Card, Button, Progress, Table, Modal, Form, Input, Select, Tag, Space, Alert, Spin, Divider, Typography, Row, Col, Statistic, Slider, Switch, InputNumber } from 'antd';
import { Brain, Settings, BarChart3, FileText, Edit, Eye, Download, RefreshCw } from 'lucide-react';
import { classifiedGradingApi, handleApiError, isApiSuccess } from '../../api/classifiedGrading';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

interface Question {
  id: string;
  type: string;
  content: string;
  studentAnswer?: string;
  correctAnswer?: string;
  totalPoints: number;
  score?: number;
  maxScore?: number;
  confidence?: number;
  feedback?: string;
  gradingDetails?: any;
}

interface GradingConfig {
  examType: string;
  mode: string;
  partialCredit: boolean;
  aiAssisted: boolean;
  keywordWeight: number;
  structureWeight: number;
  qualityWeight: number;
  aiWeight: number;
}

interface GradingResult {
  questionId: string;
  score: number;
  maxScore: number;
  confidence: number;
  feedback: string;
  gradingDetails: any;
  processingTime: number;
}

interface GradingStatistics {
  totalQuestions: number;
  gradedQuestions: number;
  gradingInProgress: number;
  totalScore: number;
  scoreRate: number;
  typeDistribution: Record<string, number>;
  qualityScore: number;
}

const ClassifiedGradingView: React.FC = () => {
  const [grading, setGrading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [gradingResults, setGradingResults] = useState<GradingResult[]>([]);
  const [gradingConfig, setGradingConfig] = useState<GradingConfig>({
    examType: 'standard',
    mode: 'standard',
    partialCredit: true,
    aiAssisted: true,
    keywordWeight: 0.3,
    structureWeight: 0.2,
    qualityWeight: 0.2,
    aiWeight: 0.3
  });
  const [statistics, setStatistics] = useState<GradingStatistics | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [adjustModalVisible, setAdjustModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [hasQuestions, setHasQuestions] = useState(false);
  const [form] = Form.useForm();
  const [adjustForm] = Form.useForm();

  // 模拟题目数据
  useEffect(() => {
    const mockQuestions: Question[] = [
      {
        id: '1',
        type: 'choice',
        content: '下列哪个选项是正确的？\nA. 选项A\nB. 选项B\nC. 选项C\nD. 选项D',
        studentAnswer: 'B',
        correctAnswer: 'C',
        totalPoints: 5,
        score: 0,
        maxScore: 5,
        confidence: 0.95
      },
      {
        id: '2',
        type: 'subjective',
        content: '请简述你对这个问题的观点，并说明理由。',
        studentAnswer: '我认为这个问题需要从多个角度来分析。首先，我们需要考虑历史背景...',
        correctAnswer: '参考答案：应该从历史、社会、经济等多个维度进行分析...',
        totalPoints: 15,
        score: 12,
        maxScore: 15,
        confidence: 0.88
      },
      {
        id: '3',
        type: 'calculation',
        content: '计算下列表达式的值：\n2x + 3y = 15\n当x=3时，求y的值',
        studentAnswer: 'x = 3\n2×3 + 3y = 15\n6 + 3y = 15\n3y = 9\ny = 3',
        correctAnswer: 'y = 3',
        totalPoints: 10,
        score: 10,
        maxScore: 10,
        confidence: 0.92
      }
    ];
    setQuestions(mockQuestions);
    setHasQuestions(true);

    // 模拟统计数据
    const mockStatistics: GradingStatistics = {
      totalQuestions: 3,
      gradedQuestions: 2,
      gradingInProgress: 1,
      totalScore: 22,
      scoreRate: 73.3,
      typeDistribution: {
        'choice': 1,
        'subjective': 1,
        'calculation': 1
      },
      qualityScore: 0.89
    };
    setStatistics(mockStatistics);
  }, []);

  const startGrading = async () => {
    if (!hasQuestions) {
      return;
    }

    setGrading(true);
    setProgress(0);

    try {
      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 15;
        });
      }, 500);

      // 批量评分
      const gradingRequest = {
        questions: questions.map(q => ({
          question_type: q.type,
          question_text: q.content,
          student_answer: q.studentAnswer,
          correct_answer: q.correctAnswer,
          total_points: q.totalPoints
        })),
        config: gradingConfig
      };

      // 调用评分API (暂时注释，使用模拟数据)
      // const response = await classifiedGradingApi.batchGrade(gradingRequest);

      clearInterval(progressInterval);
      setProgress(100);

      // 模拟评分结果
      const mockResults: GradingResult[] = [
        {
          questionId: '1',
          score: 0,
          maxScore: 5,
          confidence: 0.95,
          feedback: '答案错误。正确答案是C，学生选择了B。',
          gradingDetails: {
            keywordScore: 0,
            structureScore: 0.8,
            qualityScore: 0.7,
            aiScore: 0.2
          },
          processingTime: 1.2
        },
        {
          questionId: '2',
          score: 12,
          maxScore: 15,
          confidence: 0.88,
          feedback: '回答较好，观点明确，论述有理有据，但可以更加深入。',
          gradingDetails: {
            keywordScore: 0.8,
            structureScore: 0.9,
            qualityScore: 0.7,
            aiScore: 0.85
          },
          processingTime: 2.5
        },
        {
          questionId: '3',
          score: 10,
          maxScore: 10,
          confidence: 0.92,
          feedback: '计算过程正确，答案准确。',
          gradingDetails: {
            keywordScore: 1.0,
            structureScore: 1.0,
            qualityScore: 0.9,
            aiScore: 0.95
          },
          processingTime: 1.8
        }
      ];

      setGradingResults(mockResults);

      // 更新题目分数
      const updatedQuestions = questions.map(q => {
        const result = mockResults.find(r => r.questionId === q.id);
        return result ? { ...q, score: result.score, feedback: result.feedback, gradingDetails: result.gradingDetails } : q;
      });
      setQuestions(updatedQuestions);

      // 更新统计信息
      const totalScore = mockResults.reduce((sum, r) => sum + r.score, 0);
      const maxTotalScore = mockResults.reduce((sum, r) => sum + r.maxScore, 0);
      setStatistics({
        totalQuestions: questions.length,
        gradedQuestions: questions.length,
        gradingInProgress: 0,
        totalScore,
        scoreRate: (totalScore / maxTotalScore) * 100,
        typeDistribution: {
          'choice': 1,
          'subjective': 1,
          'calculation': 1
        },
        qualityScore: 0.89
      });

    } catch (error) {
      console.error('评分失败:', error);
    } finally {
      setGrading(false);
    }
  };

  const handleConfigSave = async () => {
    try {
      const values = await form.validateFields();
      setGradingConfig(values);
      setConfigModalVisible(false);
      
      // 保存配置到后端
      // await classifiedGradingApi.saveConfig(values);
    } catch (error) {
      console.error('配置保存失败:', error);
    }
  };

  const handleScoreAdjust = async () => {
    try {
      const values = await adjustForm.validateFields();
      if (selectedQuestion) {
        // 调用调整分数API
        // await classifiedGradingApi.adjustScore({
        //   question_id: selectedQuestion.id,
        //   new_score: values.newScore,
        //   reason: values.reason
        // });

        // 更新本地数据
        const updatedQuestions = questions.map(q =>
          q.id === selectedQuestion.id ? { ...q, score: values.newScore } : q
        );
        setQuestions(updatedQuestions);
        setAdjustModalVisible(false);
      }
    } catch (error) {
      console.error('分数调整失败:', error);
    }
  };

  const handleViewDetail = (question: Question) => {
    setSelectedQuestion(question);
    setDetailModalVisible(true);
  };

  const handleAdjustScore = (question: Question) => {
    setSelectedQuestion(question);
    adjustForm.setFieldsValue({
      currentScore: question.score,
      newScore: question.score,
      reason: ''
    });
    setAdjustModalVisible(true);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'choice': return 'blue';
      case 'subjective': return 'green';
      case 'calculation': return 'orange';
      case 'fill_blank': return 'purple';
      default: return 'default';
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'choice': return '选择题';
      case 'subjective': return '主观题';
      case 'calculation': return '计算题';
      case 'fill_blank': return '填空题';
      default: return '未知类型';
    }
  };

  const getScoreColor = (score: number, maxScore: number) => {
    const rate = score / maxScore;
    if (rate >= 0.8) return 'success';
    if (rate >= 0.6) return 'warning';
    return 'danger';
  };

  const columns = [
    {
      title: '题目编号',
      dataIndex: 'id',
      key: 'id',
      width: 100,
    },
    {
      title: '题型',
      dataIndex: 'type',
      key: 'type',
      width: 120,
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>{getTypeName(type)}</Tag>
      ),
    },
    {
      title: '题目内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (content: string) => (
        <Text ellipsis={{ tooltip: content }} style={{ maxWidth: 200 }}>
          {content}
        </Text>
      ),
    },
    {
      title: '学生答案',
      dataIndex: 'studentAnswer',
      key: 'studentAnswer',
      ellipsis: true,
      render: (answer: string) => (
        <Text ellipsis={{ tooltip: answer }} style={{ maxWidth: 150 }}>
          {answer || '未作答'}
        </Text>
      ),
    },
    {
      title: '得分',
      key: 'score',
      width: 120,
      render: (_: any, record: Question) => (
        <div>
          <Text strong style={{ color: record.score !== undefined ? '#52c41a' : '#999' }}>
            {record.score !== undefined ? record.score : '-'} / {record.totalPoints}
          </Text>
          {record.score !== undefined && (
            <div>
              <Progress
                percent={Math.round((record.score / record.totalPoints) * 100)}
                size="small"
                status={getScoreColor(record.score, record.totalPoints) as any}
                showInfo={false}
              />
            </div>
          )}
        </div>
      ),
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 120,
      render: (confidence?: number) => (
        confidence !== undefined ? (
          <Progress
            percent={Math.round(confidence * 100)}
            size="small"
            status={confidence > 0.8 ? 'success' : confidence > 0.6 ? 'normal' : 'exception'}
          />
        ) : '-'
      ),
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: any, record: Question) => {
        if (record.score !== undefined) {
          return <Tag color="green">已评分</Tag>;
        }
        return <Tag color="orange">待评分</Tag>;
      },
    },
    {
      title: '操作',
      key: 'actions',
      width: 180,
      render: (_: any, record: Question) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<Eye size={14} />}
            onClick={() => handleViewDetail(record)}
          >
            查看
          </Button>
          {record.score !== undefined && (
            <Button
              type="link"
              size="small"
              icon={<Edit size={14} />}
              onClick={() => handleAdjustScore(record)}
            >
              调分
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="classified-grading p-6">
      {/* 头部工具栏 */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <Title level={2} className="mb-2">
              <Brain className="inline mr-2" size={24} />
              智能评分
            </Title>
            <Text type="secondary">基于题型分类的专业评分系统</Text>
          </div>
          <div className="space-x-2">
            <Button
              type="default"
              icon={<Settings size={16} />}
              onClick={() => {
                form.setFieldsValue(gradingConfig);
                setConfigModalVisible(true);
              }}
            >
              评分配置
            </Button>
            <Button
              type="primary"
              loading={grading}
              onClick={startGrading}
              disabled={!hasQuestions}
              icon={<Brain size={16} />}
            >
              开始评分
            </Button>
            {gradingResults.length > 0 && (
              <>
                <Button
                  type="default"
                  icon={<BarChart3 size={16} />}
                  onClick={() => setReportModalVisible(true)}
                >
                  评分报告
                </Button>
                <Button
                  type="default"
                  icon={<Download size={16} />}
                >
                  导出结果
                </Button>
              </>
            )}
          </div>
        </div>

        {!hasQuestions && (
          <Alert
            message="请先进行智能切题"
            description="需要先完成题目分割和分类才能开始智能评分"
            type="warning"
            showIcon
          />
        )}
      </div>

      {/* 评分配置展示 */}
      {hasQuestions && (
        <Card title="当前评分配置" className="mb-6">
          <Row gutter={16}>
            <Col span={6}>
              <div className="text-center">
                <Text strong>评分模式</Text>
                <br />
                <Tag color="blue">{gradingConfig.mode === 'standard' ? '标准模式' : '严格模式'}</Tag>
              </div>
            </Col>
            <Col span={6}>
              <div className="text-center">
                <Text strong>部分分数</Text>
                <br />
                <Tag color={gradingConfig.partialCredit ? 'green' : 'red'}>
                  {gradingConfig.partialCredit ? '启用' : '禁用'}
                </Tag>
              </div>
            </Col>
            <Col span={6}>
              <div className="text-center">
                <Text strong>AI辅助</Text>
                <br />
                <Tag color={gradingConfig.aiAssisted ? 'green' : 'red'}>
                  {gradingConfig.aiAssisted ? '启用' : '禁用'}
                </Tag>
              </div>
            </Col>
            <Col span={6}>
              <div className="text-center">
                <Text strong>权重配置</Text>
                <br />
                <Text type="secondary">
                  关键词{(gradingConfig.keywordWeight * 100).toFixed(0)}% | 
                  结构{(gradingConfig.structureWeight * 100).toFixed(0)}% | 
                  AI{(gradingConfig.aiWeight * 100).toFixed(0)}%
                </Text>
              </div>
            </Col>
          </Row>
        </Card>
      )}

      {/* 评分进度 */}
      {grading && (
        <Card className="mb-6">
          <div className="text-center">
            <Spin size="large" className="mb-4" />
            <Title level={4}>正在进行智能评分...</Title>
            <Progress percent={progress} status="active" className="mb-2" />
            <Text type="secondary">
              {progress < 30 && '正在分析题目类型...'}
              {progress >= 30 && progress < 60 && '正在应用评分策略...'}
              {progress >= 60 && progress < 90 && '正在生成评分结果...'}
              {progress >= 90 && '正在完成最终评分...'}
            </Text>
          </div>
        </Card>
      )}

      {/* 评分统计 */}
      {statistics && (
        <Card title="评分统计" className="mb-6">
          <Row gutter={16}>
            <Col span={4}>
              <Statistic title="总题目数" value={statistics.totalQuestions} />
            </Col>
            <Col span={4}>
              <Statistic title="已评分" value={statistics.gradedQuestions} />
            </Col>
            <Col span={4}>
              <Statistic title="评分中" value={statistics.gradingInProgress} />
            </Col>
            <Col span={4}>
              <Statistic title="总分" value={statistics.totalScore} />
            </Col>
            <Col span={4}>
              <Statistic 
                title="得分率" 
                value={statistics.scoreRate} 
                precision={1}
                suffix="%"
              />
            </Col>
            <Col span={4}>
              <Statistic 
                title="评分质量" 
                value={statistics.qualityScore} 
                precision={2}
                suffix="%"
                formatter={(value) => `${((value as number) * 100).toFixed(1)}%`}
              />
            </Col>
          </Row>
          <Divider />
          <div>
            <Text strong>题型分布：</Text>
            <Space className="ml-2">
              {Object.entries(statistics.typeDistribution).map(([type, count]) => (
                <Tag key={type} color={getTypeColor(type)}>
                  {getTypeName(type)}: {count}
                </Tag>
              ))}
            </Space>
          </div>
        </Card>
      )}

      {/* 题目列表 */}
      {hasQuestions && (
        <Card title="题目列表" className="mb-6">
          <Table
            columns={columns}
            dataSource={questions}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total) => `共 ${total} 道题目`,
            }}
          />
        </Card>
      )}

      {/* 评分配置对话框 */}
      <Modal
        title="评分配置"
        open={configModalVisible}
        onOk={handleConfigSave}
        onCancel={() => setConfigModalVisible(false)}
        width={600}
      >
        <Form form={form} layout="vertical">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="examType"
                label="考试类型"
                rules={[{ required: true, message: '请选择考试类型' }]}
              >
                <Select>
                  <Option value="standard">标准考试</Option>
                  <Option value="quiz">随堂测验</Option>
                  <Option value="homework">课后作业</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="mode"
                label="评分模式"
                rules={[{ required: true, message: '请选择评分模式' }]}
              >
                <Select>
                  <Option value="standard">标准模式</Option>
                  <Option value="strict">严格模式</Option>
                  <Option value="lenient">宽松模式</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="partialCredit"
                label="部分分数"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="aiAssisted"
                label="AI辅助评分"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
          <Divider>权重配置</Divider>
          <Form.Item
            name="keywordWeight"
            label={`关键词权重: ${(form.getFieldValue('keywordWeight') || 0.3) * 100}%`}
          >
            <Slider min={0} max={1} step={0.1} />
          </Form.Item>
          <Form.Item
            name="structureWeight"
            label={`结构权重: ${(form.getFieldValue('structureWeight') || 0.2) * 100}%`}
          >
            <Slider min={0} max={1} step={0.1} />
          </Form.Item>
          <Form.Item
            name="qualityWeight"
            label={`质量权重: ${(form.getFieldValue('qualityWeight') || 0.2) * 100}%`}
          >
            <Slider min={0} max={1} step={0.1} />
          </Form.Item>
          <Form.Item
            name="aiWeight"
            label={`AI权重: ${(form.getFieldValue('aiWeight') || 0.3) * 100}%`}
          >
            <Slider min={0} max={1} step={0.1} />
          </Form.Item>
        </Form>
      </Modal>

      {/* 题目详情对话框 */}
      <Modal
        title="题目详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {selectedQuestion && (
          <div>
            <Row gutter={16} className="mb-4">
              <Col span={8}>
                <Text strong>题目编号：</Text>
                <Text>{selectedQuestion.id}</Text>
              </Col>
              <Col span={8}>
                <Text strong>题目类型：</Text>
                <Tag color={getTypeColor(selectedQuestion.type)}>
                  {getTypeName(selectedQuestion.type)}
                </Tag>
              </Col>
              <Col span={8}>
                <Text strong>总分：</Text>
                <Text>{selectedQuestion.totalPoints}分</Text>
              </Col>
            </Row>
            <Divider />
            <div className="mb-4">
              <Text strong>题目内容：</Text>
              <Paragraph className="mt-2 p-3 bg-gray-50 rounded">
                {selectedQuestion.content}
              </Paragraph>
            </div>
            {selectedQuestion.studentAnswer && (
              <div className="mb-4">
                <Text strong>学生答案：</Text>
                <Paragraph className="mt-2 p-3 bg-blue-50 rounded">
                  {selectedQuestion.studentAnswer}
                </Paragraph>
              </div>
            )}
            {selectedQuestion.correctAnswer && (
              <div className="mb-4">
                <Text strong>参考答案：</Text>
                <Paragraph className="mt-2 p-3 bg-green-50 rounded">
                  {selectedQuestion.correctAnswer}
                </Paragraph>
              </div>
            )}
            {selectedQuestion.score !== undefined && (
              <>
                <div className="mb-4">
                  <Text strong>评分结果：</Text>
                  <div className="mt-2 p-3 bg-yellow-50 rounded">
                    <Row gutter={16}>
                      <Col span={8}>
                        <Statistic title="得分" value={selectedQuestion.score} suffix={`/ ${selectedQuestion.totalPoints}`} />
                      </Col>
                      <Col span={8}>
                        <Statistic 
                          title="得分率" 
                          value={(selectedQuestion.score / selectedQuestion.totalPoints) * 100} 
                          precision={1}
                          suffix="%"
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic 
                          title="置信度" 
                          value={(selectedQuestion.confidence || 0) * 100} 
                          precision={1}
                          suffix="%"
                        />
                      </Col>
                    </Row>
                  </div>
                </div>
                {selectedQuestion.feedback && (
                  <div className="mb-4">
                    <Text strong>评分反馈：</Text>
                    <Paragraph className="mt-2 p-3 bg-orange-50 rounded">
                      {selectedQuestion.feedback}
                    </Paragraph>
                  </div>
                )}
                {selectedQuestion.gradingDetails && (
                  <div>
                    <Text strong>评分详情：</Text>
                    <div className="mt-2 p-3 bg-gray-50 rounded">
                      <Row gutter={16}>
                        <Col span={6}>
                          <Text>关键词得分：</Text>
                          <br />
                          <Text strong>{(selectedQuestion.gradingDetails.keywordScore * 100).toFixed(1)}%</Text>
                        </Col>
                        <Col span={6}>
                          <Text>结构得分：</Text>
                          <br />
                          <Text strong>{(selectedQuestion.gradingDetails.structureScore * 100).toFixed(1)}%</Text>
                        </Col>
                        <Col span={6}>
                          <Text>质量得分：</Text>
                          <br />
                          <Text strong>{(selectedQuestion.gradingDetails.qualityScore * 100).toFixed(1)}%</Text>
                        </Col>
                        <Col span={6}>
                          <Text>AI得分：</Text>
                          <br />
                          <Text strong>{(selectedQuestion.gradingDetails.aiScore * 100).toFixed(1)}%</Text>
                        </Col>
                      </Row>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </Modal>

      {/* 分数调整对话框 */}
      <Modal
        title="调整分数"
        open={adjustModalVisible}
        onOk={handleScoreAdjust}
        onCancel={() => setAdjustModalVisible(false)}
        width={500}
      >
        <Form form={adjustForm} layout="vertical">
          <Form.Item
            name="currentScore"
            label="当前分数"
          >
            <InputNumber disabled style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item
            name="newScore"
            label="新分数"
            rules={[
              { required: true, message: '请输入新分数' },
              { type: 'number', min: 0, message: '分数不能小于0' },
              { 
                validator: (_, value) => {
                  if (selectedQuestion && value > selectedQuestion.totalPoints) {
                    return Promise.reject(new Error(`分数不能超过总分${selectedQuestion.totalPoints}`));
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber 
              style={{ width: '100%' }} 
              max={selectedQuestion?.totalPoints}
              min={0}
              precision={1}
            />
          </Form.Item>
          <Form.Item
            name="reason"
            label="调整原因"
            rules={[{ required: true, message: '请输入调整原因' }]}
          >
            <TextArea rows={3} placeholder="请说明调整分数的原因..." />
          </Form.Item>
        </Form>
      </Modal>

      {/* 评分报告对话框 */}
      <Modal
        title="评分报告"
        open={reportModalVisible}
        onCancel={() => setReportModalVisible(false)}
        footer={[
          <Button key="export" type="primary" icon={<Download size={16} />}>
            导出报告
          </Button>,
          <Button key="close" onClick={() => setReportModalVisible(false)}>
            关闭
          </Button>
        ]}
        width={800}
      >
        {statistics && (
          <div>
            <Title level={4}>评分概览</Title>
            <Row gutter={16} className="mb-6">
              <Col span={8}>
                <Card>
                  <Statistic title="总题目数" value={statistics.totalQuestions} />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic title="平均得分率" value={statistics.scoreRate} precision={1} suffix="%" />
                </Card>
              </Col>
              <Col span={8}>
                <Card>
                  <Statistic 
                    title="评分质量" 
                    value={statistics.qualityScore} 
                    precision={2}
                    suffix="%"
                    formatter={(value) => `${((value as number) * 100).toFixed(1)}%`}
                  />
                </Card>
              </Col>
            </Row>
            
            <Title level={4}>题型分析</Title>
            <div className="mb-6">
              {Object.entries(statistics.typeDistribution).map(([type, count]) => (
                <div key={type} className="mb-2">
                  <Text>{getTypeName(type)}：{count} 道题目</Text>
                  <Progress 
                    percent={(count / statistics.totalQuestions) * 100} 
                    strokeColor={getTypeColor(type)}
                    className="ml-4"
                  />
                </div>
              ))}
            </div>
            
            <Title level={4}>评分建议</Title>
            <div>
              <Alert
                message="评分质量良好"
                description="本次评分整体质量较高，AI评分结果可信度强。建议重点关注得分率较低的主观题，可能需要人工复核。"
                type="success"
                showIcon
              />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default ClassifiedGradingView;