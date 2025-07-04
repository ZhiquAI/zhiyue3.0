// 试题识别与配置工作台
import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button, Steps, Alert, Progress, Table, Tag, Collapse, Input, InputNumber, Space, Tooltip, message, Modal, Tabs } from 'antd';
import { CheckCircleOutlined, EyeOutlined, EditOutlined, DeleteOutlined, PlusOutlined, RobotOutlined, BulbOutlined, SaveOutlined, ReloadOutlined } from '@ant-design/icons';
import { questionRecognitionService, RecognizedQuestion, AutoGeneratedRubric, RubricDimension } from '../../services/questionRecognitionApi';

interface QuestionRecognitionWorkspaceProps {
  file: File;
  onComplete: (questions: RecognizedQuestion[], rubrics: AutoGeneratedRubric[]) => void;
  onCancel: () => void;
}

const QuestionRecognitionWorkspace: React.FC<QuestionRecognitionWorkspaceProps> = ({
  file,
  onComplete,
  onCancel
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [recognitionProgress, setRecognitionProgress] = useState(0);
  const [questions, setQuestions] = useState<RecognizedQuestion[]>([]);
  const [rubrics, setRubrics] = useState<AutoGeneratedRubric[]>([]);
  const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(null);
  const [editingRubric, setEditingRubric] = useState<AutoGeneratedRubric | null>(null);
  const [loading, setLoading] = useState(false);

  const steps = [
    {
      title: '文档分析',
      description: 'AI识别试题结构'
    },
    {
      title: '题目确认',
      description: '确认识别的题目'
    },
    {
      title: '评分配置',
      description: '设置多维评分标准'
    },
    {
      title: '完成配置',
      description: '保存并应用配置'
    }
  ];

  useEffect(() => {
    if (currentStep === 0) {
      startRecognition();
    }
  }, []);

  const startRecognition = async () => {
    try {
      setLoading(true);
      setRecognitionProgress(0);

      // 模拟进度更新
      const progressInterval = setInterval(() => {
        setRecognitionProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 500);

      const result = await questionRecognitionService.analyzeDocument(file);
      
      clearInterval(progressInterval);
      setRecognitionProgress(100);
      setQuestions(result.questions);
      
      setTimeout(() => {
        setCurrentStep(1);
        setLoading(false);
      }, 1000);

    } catch (error) {
      setLoading(false);
      message.error('文档分析失败，请重试');
    }
  };

  const generateRubrics = async () => {
    try {
      setLoading(true);
      message.loading('AI正在生成评分标准...', 0);

      const generatedRubrics = await questionRecognitionService.batchGenerateRubrics(questions);
      setRubrics(generatedRubrics);
      
      message.destroy();
      message.success('评分标准生成完成');
      setCurrentStep(2);
      setLoading(false);
    } catch (error) {
      setLoading(false);
      message.destroy();
      message.error('评分标准生成失败');
    }
  };

  const handleQuestionEdit = (question: RecognizedQuestion, field: string, value: any) => {
    setQuestions(prev => prev.map(q => 
      q.id === question.id ? { ...q, [field]: value } : q
    ));
  };

  const handleRubricEdit = (rubric: AutoGeneratedRubric) => {
    setEditingRubric({ ...rubric });
  };

  const saveRubricEdit = () => {
    if (editingRubric) {
      setRubrics(prev => prev.map(r => 
        r.questionId === editingRubric.questionId ? editingRubric : r
      ));
      setEditingRubric(null);
      message.success('评分标准已更新');
    }
  };

  const handleDimensionEdit = (dimensionId: string, field: string, value: any) => {
    if (editingRubric) {
      setEditingRubric(prev => ({
        ...prev!,
        dimensions: prev!.dimensions.map(dim =>
          dim.id === dimensionId ? { ...dim, [field]: value } : dim
        )
      }));
    }
  };

  const addNewDimension = () => {
    if (editingRubric) {
      const newDimension: RubricDimension = {
        id: `custom_${Date.now()}`,
        name: '新评分维度',
        description: '请输入评分维度描述',
        maxPoints: 2,
        criteria: ['优秀', '良好', '一般', '需改进'],
        keywords: [],
        weight: 0.1
      };
      
      setEditingRubric(prev => ({
        ...prev!,
        dimensions: [...prev!.dimensions, newDimension]
      }));
    }
  };

  const deleteDimension = (dimensionId: string) => {
    if (editingRubric) {
      setEditingRubric(prev => ({
        ...prev!,
        dimensions: prev!.dimensions.filter(dim => dim.id !== dimensionId)
      }));
    }
  };

  const completeConfiguration = () => {
    onComplete(questions, rubrics);
  };

  const renderRecognitionStep = () => (
    <div className="text-center py-12">
      <div className="mb-6">
        <RobotOutlined style={{ fontSize: '64px', color: '#1677ff' }} />
      </div>
      <h3 className="text-xl font-semibold mb-4">AI正在分析试卷文档</h3>
      <Progress 
        percent={recognitionProgress} 
        status={recognitionProgress === 100 ? 'success' : 'active'}
        className="mb-4"
      />
      <div className="text-sm text-gray-500 space-y-1">
        <p>• 解析文档结构和布局</p>
        <p>• 识别题目类型和分值</p>
        <p>• 提取知识点和难度信息</p>
        <p>• 生成题目区域坐标</p>
      </div>
    </div>
  );

  const renderQuestionConfirmStep = () => {
    const columns = [
      {
        title: '题号',
        dataIndex: 'number',
        key: 'number',
        width: 80,
        render: (text: string) => <Tag color="blue">{text}</Tag>
      },
      {
        title: '题目类型',
        dataIndex: 'type',
        key: 'type',
        width: 100,
        render: (type: string) => {
          const typeMap = {
            choice: { text: '选择题', color: 'green' },
            fill: { text: '填空题', color: 'orange' },
            short_answer: { text: '简答题', color: 'blue' },
            essay: { text: '论述题', color: 'purple' },
            analysis: { text: '材料分析题', color: 'red' }
          };
          const config = typeMap[type as keyof typeof typeMap] || { text: type, color: 'default' };
          return <Tag color={config.color}>{config.text}</Tag>;
        }
      },
      {
        title: '题目内容',
        dataIndex: 'content',
        key: 'content',
        ellipsis: true,
        render: (text: string) => (
          <Tooltip title={text}>
            <div className="max-w-xs truncate">{text}</div>
          </Tooltip>
        )
      },
      {
        title: '分值',
        dataIndex: 'points',
        key: 'points',
        width: 80,
        render: (points: number, record: RecognizedQuestion) => (
          <InputNumber
            size="small"
            min={1}
            max={50}
            value={points}
            onChange={(value) => handleQuestionEdit(record, 'points', value || 1)}
            addonAfter="分"
          />
        )
      },
      {
        title: '难度',
        dataIndex: 'difficulty',
        key: 'difficulty',
        width: 100,
        render: (difficulty: string) => {
          const colorMap = { easy: 'green', medium: 'orange', hard: 'red' };
          const textMap = { easy: '简单', medium: '中等', hard: '困难' };
          return <Tag color={colorMap[difficulty as keyof typeof colorMap]}>{textMap[difficulty as keyof typeof textMap]}</Tag>;
        }
      },
      {
        title: '知识点',
        dataIndex: 'knowledgePoints',
        key: 'knowledgePoints',
        render: (points: string[]) => (
          <div className="space-x-1">
            {points.slice(0, 2).map((point, index) => (
              <Tag key={index} size="small">{point}</Tag>
            ))}
            {points.length > 2 && <Tag size="small">+{points.length - 2}</Tag>}
          </div>
        )
      },
      {
        title: '操作',
        key: 'action',
        width: 120,
        render: (_, record: RecognizedQuestion) => (
          <Space size="small">
            <Button 
              type="text" 
              size="small" 
              icon={<EyeOutlined />}
              onClick={() => setSelectedQuestionId(record.id)}
            >
              查看
            </Button>
            <Button 
              type="text" 
              size="small" 
              icon={<EditOutlined />}
            >
              编辑
            </Button>
          </Space>
        )
      }
    ];

    return (
      <div>
        <Alert
          message="AI识别结果确认"
          description={`共识别出 ${questions.length} 道题目，总分 ${questions.reduce((sum, q) => sum + q.points, 0)} 分。请检查并确认题目信息的准确性。`}
          type="info"
          showIcon
          className="mb-4"
        />
        
        <Table
          columns={columns}
          dataSource={questions}
          rowKey="id"
          pagination={false}
          size="small"
          scroll={{ y: 400 }}
        />

        <div className="mt-6 flex justify-between">
          <Button onClick={() => setCurrentStep(0)} icon={<ReloadOutlined />}>
            重新识别
          </Button>
          <Button type="primary" onClick={generateRubrics} loading={loading}>
            确认并生成评分标准
          </Button>
        </div>
      </div>
    );
  };

  const renderRubricConfigStep = () => {
    const subjectiveQuestions = questions.filter(q => 
      ['short_answer', 'essay', 'analysis'].includes(q.type)
    );

    return (
      <div>
        <Alert
          message="多维评分标准配置"
          description="AI已为主观题生成多维评分标准，您可以根据需要进行调整。客观题将使用标准答案进行自动评分。"
          type="success"
          showIcon
          className="mb-4"
        />

        <Tabs
          tabPosition="left"
          items={subjectiveQuestions.map(question => {
            const rubric = rubrics.find(r => r.questionId === question.id);
            return {
              key: question.id,
              label: (
                <div className="text-left">
                  <div className="font-medium">第{question.number}题</div>
                  <div className="text-xs text-gray-500">{question.points}分</div>
                </div>
              ),
              children: rubric ? (
                <Card 
                  title={
                    <div className="flex items-center justify-between">
                      <span>第{question.number}题 评分标准</span>
                      <div className="flex items-center gap-2">
                        {rubric.aiGenerated && (
                          <Tag color="purple" icon={<RobotOutlined />}>AI生成</Tag>
                        )}
                        <Button 
                          type="primary" 
                          ghost 
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => handleRubricEdit(rubric)}
                        >
                          编辑
                        </Button>
                      </div>
                    </div>
                  }
                  size="small"
                >
                  <div className="mb-4 p-3 bg-gray-50 rounded">
                    <p className="text-sm text-gray-600 mb-2">题目内容：</p>
                    <p className="text-sm">{question.content}</p>
                  </div>

                  <Collapse size="small" ghost>
                    {rubric.dimensions.map((dimension, index) => (
                      <Collapse.Panel
                        key={dimension.id}
                        header={
                          <div className="flex items-center justify-between w-full">
                            <span className="font-medium">{dimension.name}</span>
                            <div className="flex items-center gap-2">
                              <Tag color="blue">{dimension.maxPoints}分</Tag>
                              <Tag color="green">权重 {(dimension.weight * 100).toFixed(0)}%</Tag>
                            </div>
                          </div>
                        }
                      >
                        <div className="space-y-3">
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">评分描述：</p>
                            <p className="text-sm text-gray-600">{dimension.description}</p>
                          </div>
                          
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">评分标准：</p>
                            <div className="space-y-1">
                              {dimension.criteria.map((criterion, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                  <Tag size="small" color={idx === 0 ? 'green' : idx === 1 ? 'blue' : idx === 2 ? 'orange' : 'red'}>
                                    {dimension.maxPoints - idx}分
                                  </Tag>
                                  <span className="text-sm">{criterion}</span>
                                </div>
                              ))}
                            </div>
                          </div>

                          {dimension.keywords.length > 0 && (
                            <div>
                              <p className="text-sm font-medium text-gray-700 mb-1">关键词：</p>
                              <div className="space-x-1">
                                {dimension.keywords.map((keyword, idx) => (
                                  <Tag key={idx} size="small">{keyword}</Tag>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </Collapse.Panel>
                    ))}
                  </Collapse>
                </Card>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <BulbOutlined style={{ fontSize: '32px' }} className="mb-2" />
                  <p>评分标准生成中...</p>
                </div>
              )
            };
          })}
        />

        <div className="mt-6 flex justify-end">
          <Button type="primary" onClick={() => setCurrentStep(3)}>
            完成评分标准配置
          </Button>
        </div>
      </div>
    );
  };

  const renderCompleteStep = () => {
    const totalQuestions = questions.length;
    const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);
    const subjectiveQuestions = questions.filter(q => ['short_answer', 'essay', 'analysis'].includes(q.type));
    const objectiveQuestions = questions.filter(q => ['choice', 'fill'].includes(q.type));

    return (
      <div className="text-center py-8">
        <CheckCircleOutlined style={{ fontSize: '64px', color: '#52c41a' }} className="mb-4" />
        <h3 className="text-xl font-semibold mb-4">配置完成</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card size="small" className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalQuestions}</div>
            <div className="text-sm text-gray-500">总题数</div>
          </Card>
          <Card size="small" className="text-center">
            <div className="text-2xl font-bold text-green-600">{totalPoints}</div>
            <div className="text-sm text-gray-500">总分值</div>
          </Card>
          <Card size="small" className="text-center">
            <div className="text-2xl font-bold text-orange-600">{objectiveQuestions.length}</div>
            <div className="text-sm text-gray-500">客观题</div>
          </Card>
          <Card size="small" className="text-center">
            <div className="text-2xl font-bold text-purple-600">{subjectiveQuestions.length}</div>
            <div className="text-sm text-gray-500">主观题</div>
          </Card>
        </div>

        <Alert
          message="配置摘要"
          description={
            <div className="text-left">
              <p>• 已识别 {totalQuestions} 道题目，总分 {totalPoints} 分</p>
              <p>• 客观题 {objectiveQuestions.length} 道，将使用标准答案自动评分</p>
              <p>• 主观题 {subjectiveQuestions.length} 道，已配置多维评分标准</p>
              <p>• 评分标准包含历史知识、史料运用、逻辑论证等维度</p>
            </div>
          }
          type="success"
          showIcon
          className="mb-6"
        />

        <div className="flex justify-center gap-4">
          <Button onClick={() => setCurrentStep(2)}>
            返回修改
          </Button>
          <Button type="primary" size="large" onClick={completeConfiguration} icon={<SaveOutlined />}>
            保存配置并开始阅卷
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      <div className="mb-6">
        <Steps current={currentStep} items={steps} />
      </div>

      <div className="flex-1 overflow-auto">
        {currentStep === 0 && renderRecognitionStep()}
        {currentStep === 1 && renderQuestionConfirmStep()}
        {currentStep === 2 && renderRubricConfigStep()}
        {currentStep === 3 && renderCompleteStep()}
      </div>

      {/* 评分标准编辑模态框 */}
      <Modal
        title="编辑评分标准"
        open={!!editingRubric}
        onCancel={() => setEditingRubric(null)}
        onOk={saveRubricEdit}
        width={800}
        okText="保存"
        cancelText="取消"
      >
        {editingRubric && (
          <div className="space-y-4">
            <Alert
              message="评分标准编辑"
              description="您可以调整评分维度、分值分配和评分标准。系统将根据您的设置进行智能评分。"
              type="info"
              showIcon
            />

            <div className="space-y-4">
              {editingRubric.dimensions.map((dimension, index) => (
                <Card key={dimension.id} size="small" title={
                  <div className="flex items-center justify-between">
                    <Input
                      value={dimension.name}
                      onChange={(e) => handleDimensionEdit(dimension.id, 'name', e.target.value)}
                      className="font-medium"
                      bordered={false}
                    />
                    <Button 
                      type="text" 
                      danger 
                      size="small"
                      icon={<DeleteOutlined />}
                      onClick={() => deleteDimension(dimension.id)}
                    >
                      删除
                    </Button>
                  </div>
                }>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">评分描述：</label>
                      <Input.TextArea
                        value={dimension.description}
                        onChange={(e) => handleDimensionEdit(dimension.id, 'description', e.target.value)}
                        rows={2}
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">最高分值：</label>
                        <InputNumber
                          value={dimension.maxPoints}
                          onChange={(value) => handleDimensionEdit(dimension.id, 'maxPoints', value || 1)}
                          min={1}
                          max={20}
                          className="w-full"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-700">权重：</label>
                        <InputNumber
                          value={dimension.weight}
                          onChange={(value) => handleDimensionEdit(dimension.id, 'weight', value || 0.1)}
                          min={0.1}
                          max={1}
                          step={0.1}
                          className="w-full"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-700">关键词（用逗号分隔）：</label>
                      <Input
                        value={dimension.keywords.join(', ')}
                        onChange={(e) => handleDimensionEdit(dimension.id, 'keywords', e.target.value.split(',').map(k => k.trim()).filter(k => k))}
                        placeholder="输入关键词，用逗号分隔"
                      />
                    </div>
                  </div>
                </Card>
              ))}
            </div>

            <Button 
              type="dashed" 
              onClick={addNewDimension}
              icon={<PlusOutlined />}
              className="w-full"
            >
              添加新的评分维度
            </Button>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QuestionRecognitionWorkspace;