import React, { useState } from 'react';
import { Card, Row, Col, Breadcrumb, Button, Alert, Progress, Statistic, Empty, Tag, Modal, InputNumber, Switch, Select, Tooltip, Badge, Divider, Space, Tabs } from 'antd';
import { UserOutlined, FileTextOutlined, CheckCircleOutlined, SaveOutlined, FastForwardOutlined, LeftOutlined, RightOutlined, SettingOutlined, ThunderboltOutlined, BarChartOutlined } from '@ant-design/icons';
import { Sparkles, Brain, Target, TrendingUp } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { Exam } from '../../types/exam';
import { mockQuestionData } from '../../data/mockData';
import { message } from '../../utils/message';


interface NewMarkingWorkspaceProps {
  exam: Exam;
}

// 模拟学生答题数据
const mockStudentAnswers = [
  {
    id: '2024001',
    name: '王同学',
    status: 'current',
    objectiveResults: {
       'q1': { score: 2, isCorrect: true, studentAnswer: 'A', correctAnswer: 'A' },
       'q2': { score: 2, isCorrect: true, studentAnswer: 'C', correctAnswer: 'C' },
       'q3': { score: 2, isCorrect: true, studentAnswer: 'B', correctAnswer: 'B' },
       'q4': { score: 2, isCorrect: true, studentAnswer: 'D', correctAnswer: 'D' },
       'q5': { score: 0, isCorrect: false, studentAnswer: 'B', correctAnswer: 'A' },
       'q6': { score: 2, isCorrect: true, studentAnswer: 'C', correctAnswer: 'C' },
       'q7': { score: 2, isCorrect: true, studentAnswer: 'B', correctAnswer: 'B' },
       'q8': { score: 2, isCorrect: true, studentAnswer: 'A', correctAnswer: 'A' },
       'q9': { score: 0, isCorrect: false, studentAnswer: 'C', correctAnswer: 'D' },
       'q10': { score: 2, isCorrect: true, studentAnswer: 'C', correctAnswer: 'C' },
       'q11': { score: 2, isCorrect: true, studentAnswer: 'B', correctAnswer: 'B' },
       'q12': { score: 2, isCorrect: true, studentAnswer: 'A', correctAnswer: 'A' }
     } as Record<string, { score: number; isCorrect: boolean; studentAnswer: string; correctAnswer: string }>,
    answers: {
      q13: '1953年，武汉长江大桥建成通车，这是新中国成立后的重大工程成就。1964年，邓稼先参与了原子弹的研制工作。三大改造采用了公私合营的方式，这是一个重要的创举。',
      q14: '中国梦的蓝图是实现国家富强、民族振兴、人民幸福。在国防建设方面，成立了火箭军这一新军种，并设立了五大战区。',
      q15: '民族区域自治制度促进了西藏地区的经济发展。一国两制在香港和澳门得到了成功实践。'
    },
    aiScores: {
      q13: { total: 9, suggestions: '答案基本正确，但对三大改造的影响阐述不够深入' },
      q14: { total: 7, suggestions: '核心概念理解正确，但军民关系的论述可以更深入' },
      q15: { total: 10, suggestions: '各个要点都有涉及，表述准确' }
    },

  }
];

const NewMarkingWorkspace: React.FC<NewMarkingWorkspaceProps> = ({ exam }) => {
  const { setSubViewInfo, updateExamStatus } = useAppContext();
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [classifiedGradingEnabled, setClassifiedGradingEnabled] = useState(true);
  const [gradingStrategy, setGradingStrategy] = useState<'strict' | 'moderate' | 'lenient'>('moderate');
  const [showGradingSettings, setShowGradingSettings] = useState(false);
  const [autoApplyAI, setAutoApplyAI] = useState(false);

  const currentStudent = mockStudentAnswers[currentStudentIndex];
  const completedCount = mockStudentAnswers.filter(s => s.status === 'completed' || s.status === 'current').length;
  const progressPercent = Math.round((completedCount / mockStudentAnswers.length) * 100);

  const handleBack = () => {
    setSubViewInfo({ view: null, exam: null, source: null });
  };

  const handleNextStudent = () => {
    if (currentStudentIndex < mockStudentAnswers.length - 1) {
      setCurrentStudentIndex(prev => prev + 1);
      setManualScores({});
    }
  };

  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(prev => prev - 1);
      setManualScores({});
    }
  };

  const handleSubmitGrading = () => {
    setShowConfirmModal(true);
  };

  const confirmSubmitGrading = () => {
    setLoading(true);
    
    // 收集当前学生的最终评分结果
    const finalScores: Record<string, number> = {};
    const gradingDetails: Record<string, any> = {};
    
    // 收集所有题目的最终得分
    mockQuestionData.questions.forEach(question => {
      const finalScore = getQuestionScore(question.id);
      finalScores[question.id] = finalScore;
      
      // 记录评分详情
      const isManuallyGraded = manualScores[question.id] !== undefined;
      gradingDetails[question.id] = {
        score: finalScore,
        maxScore: question.points,
        isManuallyGraded,
        gradingMethod: isManuallyGraded ? 'manual' : 'ai',
        timestamp: new Date().toISOString()
      };
    });
    
    const totalScore = getTotalScore();
    const maxTotalScore = mockQuestionData.questions.reduce((sum, q) => sum + q.points, 0);
    
    setTimeout(() => {
      // 保存评分结果到学生数据
      const studentData = mockStudentAnswers[currentStudentIndex];
      studentData.status = 'completed';
      
      // 将评分结果保存到现有的aiScores结构中
      const aiScores = studentData.aiScores as any;
      Object.keys(finalScores).forEach(questionId => {
        if (aiScores[questionId]) {
          aiScores[questionId].finalScore = finalScores[questionId];
          aiScores[questionId].isManuallyGraded = manualScores[questionId] !== undefined;
          aiScores[questionId].gradingMethod = manualScores[questionId] !== undefined ? 'manual' : 'ai';
          aiScores[questionId].gradingTimestamp = new Date().toISOString();
        }
      });
      
      console.log('评分结果已保存:', {
        studentId: currentStudent.id,
        studentName: currentStudent.name,
        finalScores,
        totalScore,
        maxTotalScore,
        gradingDetails
      });
      
      message.success(`${currentStudent.name}的评分已提交！总分：${totalScore}/${maxTotalScore}`);
      setLoading(false);
      setShowConfirmModal(false);
      
      if (currentStudentIndex < mockStudentAnswers.length - 1) {
        handleNextStudent();
      } else {
        Modal.confirm({
          title: '阅卷完成',
          content: '所有学生的答卷已评阅完成，是否生成分析报告？',
          okText: '生成报告',
          cancelText: '稍后处理',
          onOk: () => {
            updateExamStatus(exam.id, '已完成');
            message.success('阅卷完成！正在生成分析报告...');
            setTimeout(() => {
              setSubViewInfo({ view: 'analysis', exam: { ...exam, status: '已完成' }, source: 'markingCenter' });
            }, 1500);
          }
        });
      }
    }, 1000);
  };

  const getQuestionScore = (questionId: string) => {
    if (manualScores[questionId] !== undefined) {
      return manualScores[questionId];
    }
    // 检查是否为客观题
    const objectiveResult = currentStudent.objectiveResults?.[questionId as keyof typeof currentStudent.objectiveResults];
    if (objectiveResult) {
      return objectiveResult.score;
    }
    const aiScore = currentStudent.aiScores?.[questionId as keyof typeof currentStudent.aiScores];
    return aiScore?.total || 0;
  };

  const getTotalScore = () => {
    return mockQuestionData.questions.reduce((total, q) => total + getQuestionScore(q.id), 0);
  };

  // 获取客观题总分
  const getObjectiveScore = () => {
    return currentStudent?.objectiveResults ? 
      Object.values(currentStudent.objectiveResults).reduce((sum, result) => sum + result.score, 0) : 0;
  };

  // 获取主观题总分
  const getSubjectiveScore = () => {
    return mockQuestionData.questions
      .filter(q => !['choice', 'multiple_choice', 'true_false', 'fill_blank'].includes(q.questionType || ''))
      .reduce((sum, q) => sum + getQuestionScore(q.id), 0);
  };

  // 获取客观题满分
  const getObjectiveMaxScore = () => {
    return mockQuestionData.questions
      .filter(q => ['choice', 'multiple_choice', 'true_false', 'fill_blank'].includes(q.questionType || ''))
      .reduce((sum, q) => sum + q.points, 0);
  };

  // 获取主观题满分
  const getSubjectiveMaxScore = () => {
    return mockQuestionData.questions
      .filter(q => !['choice', 'multiple_choice', 'true_false', 'fill_blank'].includes(q.questionType || ''))
      .reduce((sum, q) => sum + q.points, 0);
  };

  // 渲染选择题部分
  const renderObjectiveQuestions = () => {
    const objectiveQuestions = mockQuestionData.questions.filter(q => 
      ['choice', 'multiple_choice', 'true_false', 'fill_blank'].includes(q.questionType || '')
    );

    return (
      <Card 
        title={
          <div className="flex items-center gap-2">
            <CheckCircleOutlined className="text-green-600" />
            <span>选择题</span>
            <Tag color="green">{objectiveQuestions.length}题</Tag>
          </div>
        }
        size="small"
        className="mb-4"
      >
        <Tabs 
          defaultActiveKey={objectiveQuestions[0]?.id} 
          type="card" 
          size="small" 
          tabBarStyle={{marginBottom: '16px'}}
          items={objectiveQuestions.map(question => {
            const result = currentStudent?.objectiveResults?.[question.id];
            return {
              key: question.id,
              label: (
                <span className={result?.isCorrect ? 'text-green-600' : 'text-red-600'}>
                  {question.title.split('：')[0]}
                </span>
              ),
              children: (
                <div className="p-2">
                  {/* 题目内容 */}
                  <div className="mb-3">
                    <h4 className="font-medium mb-3">{question.questionText || question.title}</h4>
                  </div>

                  {/* 选项 */}
                  {question.options && (
                    <div className="mb-3">
                      <div className="grid grid-cols-1 gap-2">
                        {question.options.map((option, index) => {
                          const optionLabel = String.fromCharCode(65 + index);
                          const isStudentAnswer = result?.studentAnswer === optionLabel;
                          const isCorrectAnswer = result?.correctAnswer === optionLabel;
                          return (
                            <div
                              key={index}
                              className={`p-3 rounded border ${
                                isStudentAnswer && isCorrectAnswer
                                  ? 'bg-green-50 border-green-300'
                                  : isStudentAnswer
                                  ? 'bg-red-50 border-red-300'
                                  : isCorrectAnswer
                                  ? 'bg-blue-50 border-blue-300'
                                  : 'bg-gray-50'
                              }`}
                            >
                              <span className="font-medium">{optionLabel}. </span>
                              {option}
                              {isStudentAnswer && (
                                <span className="ml-2 text-xs text-blue-600">(学生答案)</span>
                              )}
                              {isCorrectAnswer && (
                                <span className="ml-2 text-xs text-green-600">(正确答案)</span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 答案对比 */}
                  {result && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-yellow-50 rounded p-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">学生答案：</div>
                        <div className="text-gray-900">{result.studentAnswer}</div>
                      </div>
                      <div className="bg-green-50 rounded p-3">
                        <div className="text-sm font-medium text-gray-700 mb-1">正确答案：</div>
                        <div className="text-gray-900">{result.correctAnswer}</div>
                      </div>
                    </div>
                  )}
                </div>
              )
            };
          })}
        />
      </Card>
    );
  };

  // 渲染非选择题部分
  const renderSubjectiveQuestions = () => {
    const subjectiveQuestions = mockQuestionData.questions.filter(q => 
      !['choice', 'multiple_choice', 'true_false', 'fill_blank'].includes(q.questionType || '')
    );

    return (
      <Card 
        title={
          <div className="flex items-center gap-2">
            <FileTextOutlined className="text-blue-600" />
            <span>非选择题</span>
            <Tag color="blue">{subjectiveQuestions.length}题</Tag>
          </div>
        }
        size="small"
      >
        <div className="space-y-6">
          {subjectiveQuestions.map(question => {
            const aiScore = currentStudent.aiScores?.[question.id as keyof typeof currentStudent.aiScores];
            const isManuallyGraded = manualScores[question.id] !== undefined;
            
            return (
              <div key={question.id} className="border rounded-lg p-4">
                {/* 题目标题 */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{question.title}</span>
                    <Tag color="blue">{question.points}分</Tag>
                  </div>
                  <Tag color={isManuallyGraded ? 'green' : 'purple'}>
                    {isManuallyGraded ? '已人工评分' : 'AI评分'}
                  </Tag>
                </div>

                {/* 学生答案 */}
                <div className="mb-4">
                  <div className="text-sm font-medium text-gray-700 mb-2">学生答案：</div>
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <p className="whitespace-pre-wrap text-gray-800">
                      {currentStudent.answers?.[question.id as keyof typeof currentStudent.answers] || '暂无答案'}
                    </p>
                  </div>
                </div>

                {/* AI评分建议 */}
                {aiScore && (
                  <div className="mb-4">
                    <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <Brain className="w-4 h-4 text-purple-500" />
                        <span className="text-sm font-medium">AI评分建议</span>
                        <Tag color="purple">{aiScore.total}/{question.points}分</Tag>
                      </div>
                      <div className="text-sm text-gray-600">{aiScore.suggestions}</div>
                    </div>
                  </div>
                )}

                {/* 评分操作 */}
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">最终得分：</span>
                    <InputNumber
                      min={0}
                      max={question.points}
                      value={getQuestionScore(question.id)}
                      onChange={(value) => setManualScores(prev => ({ ...prev, [question.id]: value || 0 }))}
                      addonAfter={`/${question.points}`}
                      size="small"
                      disabled={!isManuallyGraded}
                    />
                  </div>
                  
                  {/* 评分模式按钮 */}
                  <div className="flex items-center gap-2">
                    <Button
                      size="small"
                      type={!isManuallyGraded ? "primary" : "default"}
                      icon={<Brain className="w-3 h-3" />}
                      onClick={() => {
                        if (aiScore) {
                          // 移除手动评分，使用AI评分
                          setManualScores(prev => {
                            const newScores = { ...prev };
                            delete newScores[question.id];
                            return newScores;
                          });
                          message.success('已应用AI评分结果');
                        }
                      }}
                      disabled={!aiScore}
                    >
                      AI评分
                    </Button>
                    
                    <Button
                      size="small"
                      type={isManuallyGraded ? "primary" : "default"}
                      icon={<UserOutlined className="w-3 h-3" />}
                      onClick={() => {
                        // 切换到人工评分模式，保持当前分数
                        const currentScore = getQuestionScore(question.id);
                        setManualScores(prev => ({ ...prev, [question.id]: currentScore }));
                        message.success('已切换为人工评分模式');
                      }}
                    >
                      人工评分
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    );
  };

  if (currentStudent.status === 'completed') {
    return (
      <div className="flex items-center justify-center h-96">
        <Empty description="该学生已完成评阅">
          <div className="space-x-2">
            <Button onClick={handlePrevStudent} disabled={currentStudentIndex === 0}>
              上一位学生
            </Button>
            <Button type="primary" onClick={handleNextStudent} disabled={currentStudentIndex === mockStudentAnswers.length - 1}>
              下一位学生
            </Button>
          </div>
        </Empty>
      </div>
    );
  }

  return (
    <div>
      {/* 顶部导航和进度 */}
      <div className="flex justify-between items-center mb-4">
        <Breadcrumb
          items={[
            { title: <a onClick={handleBack}>阅卷中心</a> },
            { title: exam.name },
            { title: '智能阅卷' }
          ]}
        />
        
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            阅卷进度: {completedCount}/{mockStudentAnswers.length}
          </div>
          <Progress 
            percent={progressPercent} 
            size="small" 
            className="w-32"
            strokeColor="#52c41a"
          />
        </div>
      </div>

      {/* 当前学生信息 */}
      <Alert
        message={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <UserOutlined className="text-blue-600" />
              <span>当前评阅: <strong>{currentStudent.name}</strong> ({currentStudent.id})</span>
            </div>
            <div className="flex items-center gap-2">
              <Tag color="blue">第 {currentStudentIndex + 1} 份</Tag>
              <Tag color="green">剩余 {mockStudentAnswers.length - currentStudentIndex - 1} 份</Tag>
              <Button 
                size="small"
                icon={<LeftOutlined />}
                disabled={currentStudentIndex === 0}
                onClick={handlePrevStudent}
              >
                上一份
              </Button>
              <Button 
                size="small"
                icon={<RightOutlined />}
                disabled={currentStudentIndex === mockStudentAnswers.length - 1}
                onClick={handleNextStudent}
              >
                下一份
              </Button>
            </div>
          </div>
        }
        type="info"
        className="mb-4"
      />

      <Row gutter={[24, 24]}>
        {/* 左侧：答题内容区域 */}
        <Col xs={24} lg={14}>
          <div className="space-y-4">
            {/* 上部：选择题 */}
            {renderObjectiveQuestions()}
            
            {/* 下部：非选择题 */}
            {renderSubjectiveQuestions()}
          </div>
        </Col>

        {/* 右侧：得分详情区域 */}
        <Col xs={24} lg={10}>
          <div className="space-y-4">
            {/* 上部：总体得分 */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <BarChartOutlined className="text-purple-600" />
                  <span>总体得分</span>
                </div>
              }
              size="small"
            >
              <div className="grid grid-cols-3 gap-4 mb-4">
                <Card size="small" className="text-center bg-gradient-to-r from-green-50 to-green-100">
                  <Statistic
                    title="客观题"
                    value={getObjectiveScore()}
                    suffix={`/ ${getObjectiveMaxScore()}`}
                    valueStyle={{ color: '#52c41a', fontSize: '18px', fontWeight: 'bold' }}
                  />
                </Card>
                <Card size="small" className="text-center bg-gradient-to-r from-blue-50 to-blue-100">
                  <Statistic
                    title="主观题"
                    value={getSubjectiveScore()}
                    suffix={`/ ${getSubjectiveMaxScore()}`}
                    valueStyle={{ color: '#1677ff', fontSize: '18px', fontWeight: 'bold' }}
                  />
                </Card>
                <Card size="small" className="text-center bg-gradient-to-r from-purple-50 to-purple-100">
                  <Statistic
                    title="总分"
                    value={getTotalScore()}
                    suffix={`/ ${mockQuestionData.questions.reduce((sum, q) => sum + q.points, 0)}`}
                    valueStyle={{ color: '#722ed1', fontSize: '18px', fontWeight: 'bold' }}
                  />
                </Card>
              </div>

              {/* 得分率显示 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">客观题得分率</span>
                  <span className="font-medium">
                    {getObjectiveMaxScore() > 0 ? Math.round((getObjectiveScore() / getObjectiveMaxScore()) * 100) : 0}%
                  </span>
                </div>
                <Progress 
                  percent={getObjectiveMaxScore() > 0 ? Math.round((getObjectiveScore() / getObjectiveMaxScore()) * 100) : 0}
                  strokeColor="#52c41a"
                  size="small"
                />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">主观题得分率</span>
                  <span className="font-medium">
                    {getSubjectiveMaxScore() > 0 ? Math.round((getSubjectiveScore() / getSubjectiveMaxScore()) * 100) : 0}%
                  </span>
                </div>
                <Progress 
                  percent={getSubjectiveMaxScore() > 0 ? Math.round((getSubjectiveScore() / getSubjectiveMaxScore()) * 100) : 0}
                  strokeColor="#1677ff"
                  size="small"
                />
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">总体得分率</span>
                  <span className="font-medium">
                    {Math.round((getTotalScore() / mockQuestionData.questions.reduce((sum, q) => sum + q.points, 0)) * 100)}%
                  </span>
                </div>
                <Progress 
                  percent={Math.round((getTotalScore() / mockQuestionData.questions.reduce((sum, q) => sum + q.points, 0)) * 100)}
                  strokeColor="#722ed1"
                  size="small"
                />
              </div>
            </Card>

            {/* 下部：各题得分详情 */}
            <Card
              title={
                <div className="flex items-center gap-2">
                  <Target className="text-blue-600" />
                  <span>各题得分详情</span>
                </div>
              }
              size="small"
            >
              <div className="space-y-4">
                {/* 选择题网格布局 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag color="green">客观题</Tag>
                    <span className="text-sm text-gray-600">选择题得分详情</span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {mockQuestionData.questions
                      .filter(q => ['choice', 'multiple_choice', 'true_false', 'fill_blank'].includes(q.questionType || ''))
                      .map(question => {
                        const objectiveResult = currentStudent?.objectiveResults?.[question.id];
                        const score = objectiveResult?.score || 0;
                        const percentage = Math.round((score / question.points) * 100);
                        const isCorrect = objectiveResult?.isCorrect || false;
                        
                        return (
                          <Tooltip 
                            key={question.id}
                            title={`${question.title.split('：')[0]}: ${score}/${question.points}分 (${percentage}%)`}
                          >
                            <div 
                              className={`border rounded-lg p-2 text-center cursor-pointer transition-all hover:shadow-md ${
                                isCorrect 
                                  ? 'bg-green-50 border-green-300' 
                                  : 'bg-red-50 border-red-300'
                              }`}
                            >
                              <div className={`font-medium text-sm ${
                                isCorrect ? 'text-green-700' : 'text-red-700'
                              }`}>
                                {question.title.split('：')[0]}
                              </div>
                              <div className={`text-xs mt-1 ${
                                isCorrect ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {score}/{question.points}
                              </div>
                              <div className={`w-full h-1 rounded mt-1 ${
                                isCorrect ? 'bg-green-400' : 'bg-red-400'
                              }`} />
                            </div>
                          </Tooltip>
                        );
                      })
                    }
                  </div>
                </div>
                
                {/* 主观题保持原有布局 */}
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Tag color="blue">主观题</Tag>
                    <span className="text-sm text-gray-600">主观题得分详情</span>
                  </div>
                  <div className="space-y-3">
                    {mockQuestionData.questions
                      .filter(q => !['choice', 'multiple_choice', 'true_false', 'fill_blank'].includes(q.questionType || ''))
                      .map(question => {
                        const isManuallyGraded = manualScores[question.id] !== undefined;
                        const score = getQuestionScore(question.id);
                        const percentage = Math.round((score / question.points) * 100);
                        
                        return (
                          <div key={question.id} className="border rounded-lg p-3">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-sm">{question.title.split('：')[0]}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Tag color={percentage >= 80 ? 'green' : percentage >= 60 ? 'orange' : 'red'}>
                                  {score}/{question.points}
                                </Tag>
                                <Tag color={isManuallyGraded ? 'green' : 'purple'}>
                                  {isManuallyGraded ? '已评' : 'AI'}
                                </Tag>
                              </div>
                            </div>

                          </div>
                        );
                      })
                    }
                  </div>
                </div>
              </div>
            </Card>



            {/* 操作按钮 */}
            <Card size="small" title="操作">
              <div className="space-y-3">
                <Button
                  type="primary"
                  size="large"
                  icon={<CheckCircleOutlined />}
                  onClick={handleSubmitGrading}
                  loading={loading}
                  block
                >
                  提交评分
                </Button>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    icon={<SaveOutlined />}
                    onClick={() => message.success('评分已暂存')}
                  >
                    暂存评分
                  </Button>
                  <Button
                    icon={<FastForwardOutlined />}
                    onClick={() => {
                      message.info('已跳过当前学生，稍后可在异常处理中继续评阅');
                      handleNextStudent();
                    }}
                  >
                    跳过此份
                  </Button>
                </div>
              </div>
            </Card>

            {/* 评分说明 */}
            <Alert
              message="评分说明"
              description={
                <div className="text-sm space-y-1">
                  <p>• 客观题已自动评分，无需手动调整</p>
                  <p>• 主观题可参考AI建议进行评分</p>
                  <p>• 点击"人工评分"快速应用AI评分</p>
                  <p>• 手动调整分数后会覆盖AI评分</p>
                </div>
              }
              type="info"
              showIcon
            />
          </div>
        </Col>
      </Row>

      {/* 确认提交模态框 */}
      <Modal
        title="确认提交评分"
        open={showConfirmModal}
        onOk={confirmSubmitGrading}
        onCancel={() => setShowConfirmModal(false)}
        okText="确认提交"
        cancelText="取消"
        confirmLoading={loading}
      >
        <div className="space-y-4">
          <p>即将提交 <strong>{currentStudent.name}</strong> 的评分结果：</p>
          <div className="bg-gray-50 p-4 rounded-lg">
            {mockQuestionData.questions.map(question => (
              <div key={question.id} className="flex justify-between items-center py-2">
                <span>{question.title.split('：')[0]}</span>
                <span className="font-medium">{getQuestionScore(question.id)}/{question.points}</span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2 flex justify-between items-center font-bold">
              <span>总分</span>
              <span>{getTotalScore()}/{mockQuestionData.questions.reduce((sum, q) => sum + q.points, 0)}</span>
            </div>
          </div>
          <p className="text-sm text-gray-500">提交后将无法修改，请确认评分准确。</p>
        </div>
      </Modal>
    </div>
  );
};

export default NewMarkingWorkspace;