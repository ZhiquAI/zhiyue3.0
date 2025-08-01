import React, { useState } from 'react';
import { Card, Row, Col, Breadcrumb, Button, Alert, Progress, Statistic, Empty, Tag, Modal, InputNumber, Switch, Select, Tooltip, Badge, Divider, Space, Tabs } from 'antd';
import { UserOutlined, FileTextOutlined, CheckCircleOutlined, SaveOutlined, FastForwardOutlined, LeftOutlined, RightOutlined, SettingOutlined, ThunderboltOutlined, BarChartOutlined } from '@ant-design/icons';
import { Sparkles, Brain, Target, TrendingUp } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { Exam } from '../../types/exam';
import { mockQuestionData } from '../../data/mockData';
import { message } from '../../utils/message';
import BubbleSheetAnalysis from '../BubbleSheetAnalysis';
import AIMarkingAssistant from '../AIMarkingAssistant';
import IntelligentScoringStrategy from '../IntelligentScoringStrategy';
import AIGradingQualityMonitor from '../AIGradingQualityMonitor';

interface MarkingWorkspaceProps {
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
       'q3': { score: 3, isCorrect: true, studentAnswer: 'ABC', correctAnswer: 'ABC' },
       'q4': { score: 1, isCorrect: true, studentAnswer: '正确', correctAnswer: '正确' },
       'q5': { score: 0, isCorrect: false, studentAnswer: '人民公社', correctAnswer: '家庭联产承包责任制' }
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
    bubbleSheetAnalysis: {
      total_bubbles_detected: 25,
      filled_bubbles: 23,
      unclear_bubbles: 2,
      quality_issues: ['第3题涂卡不清晰', '第5题有擦拭痕迹']
    },
    bubbleQualityScore: 85,
    bubbleValidation: {
      is_consistent: true,
      inconsistencies: [],
      recommendations: ['建议重新确认第3题和第5题的答案']
    }
  },
  {
    id: '2024002',
    name: '李同学',
    status: 'pending',
    answers: {
      q13: '武汉长江大桥是1953年建成的，邓稼先是原子弹之父。公私合营是三大改造的方式。',
      q14: '中国梦就是要实现中华民族伟大复兴。火箭军是新成立的军种。',
      q15: '西藏实行民族区域自治。香港澳门回归祖国。'
    },
    aiScores: {
      q13: { total: 6, suggestions: '要点提及但不够完整，缺少对历史影响的分析' },
      q14: { total: 5, suggestions: '基本概念正确但表述过于简单' },
      q15: { total: 7, suggestions: '要点正确但缺少深入分析' }
    },
    bubbleSheetAnalysis: {
      total_bubbles_detected: 25,
      filled_bubbles: 24,
      unclear_bubbles: 1,
      quality_issues: ['第2题涂卡偏轻']
    },
    bubbleQualityScore: 92,
    bubbleValidation: {
      is_consistent: true,
      inconsistencies: [],
      recommendations: ['涂卡质量良好']
    }
  },
  {
    id: '2024003',
    name: '张同学',
    status: 'pending',
    answers: {
      q13: '1953年武汉长江大桥，1964年邓稼先研制原子弹。三大改造通过公私合营方式，实现了生产资料所有制的社会主义改造，建立了社会主义制度。家庭联产承包责任制解放了农村生产力。',
      q14: '中国梦是实现国家富强、民族振兴、人民幸福的伟大梦想。火箭军的成立和五大战区的设立体现了国防现代化。军队建设为经济发展提供安全保障。',
      q15: '民族区域自治制度在西藏等地区的实施促进了经济社会发展。一国两制在香港澳门的成功实践为台海问题提供了借鉴。独立自主的和平外交政策体现了中国的外交智慧。'
    },
    aiScores: {
      q13: { total: 11, suggestions: '答案完整准确，各个要点都有涉及' },
      q14: { total: 10, suggestions: '理解深入，表述准确' },
      q15: { total: 13, suggestions: '分析全面，逻辑清晰' }
    },
    bubbleSheetAnalysis: {
      total_bubbles_detected: 25,
      filled_bubbles: 25,
      unclear_bubbles: 0,
      quality_issues: []
    },
    bubbleQualityScore: 98,
    bubbleValidation: {
      is_consistent: true,
      inconsistencies: [],
      recommendations: ['涂卡质量优秀']
    }
  },
  {
    id: '2024004',
    name: '刘同学',
    status: 'completed',
    finalScores: { q13: 8, q14: 6, q15: 9 },
    bubbleSheetAnalysis: {
      total_bubbles_detected: 25,
      filled_bubbles: 24,
      unclear_bubbles: 1,
      quality_issues: ['第4题涂卡不完整']
    },
    bubbleQualityScore: 88,
    bubbleValidation: {
      is_consistent: true,
      inconsistencies: [],
      recommendations: ['总体涂卡质量良好']
    }
  },
  {
    id: '2024005',
    name: '陈同学',
    status: 'completed',
    finalScores: { q13: 10, q14: 8, q15: 11 },
    bubbleSheetAnalysis: {
      total_bubbles_detected: 25,
      filled_bubbles: 25,
      unclear_bubbles: 0,
      quality_issues: []
    },
    bubbleQualityScore: 95,
    bubbleValidation: {
      is_consistent: true,
      inconsistencies: [],
      recommendations: ['涂卡质量优秀']
    }
  }
];

const MarkingWorkspace: React.FC<MarkingWorkspaceProps> = ({ exam }) => {
  const { setSubViewInfo, updateExamStatus } = useAppContext();
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [currentQuestionId, setCurrentQuestionId] = useState('q13');
  const [manualScores, setManualScores] = useState<Record<string, number>>({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [classifiedGradingEnabled, setClassifiedGradingEnabled] = useState(true);
  const [gradingStrategy, setGradingStrategy] = useState<'strict' | 'moderate' | 'lenient'>('moderate');
  const [showGradingSettings, setShowGradingSettings] = useState(false);
  const [autoApplyAI, setAutoApplyAI] = useState(false);

  const currentStudent = mockStudentAnswers[currentStudentIndex];
  // 计算已完成的学生数量（包括当前正在评阅的学生）
  const completedCount = mockStudentAnswers.filter(s => s.status === 'completed' || s.status === 'current').length;
  const progressPercent = Math.round((completedCount / mockStudentAnswers.length) * 100);

  const handleBack = () => {
    setSubViewInfo({ view: null, exam: null });
  };

  const handleNextStudent = () => {
    if (currentStudentIndex < mockStudentAnswers.length - 1) {
      setCurrentStudentIndex(prev => prev + 1);
      setCurrentQuestionId('q13');
      setManualScores({});
    }
  };

  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(prev => prev - 1);
      setCurrentQuestionId('q13');
      setManualScores({});
    }
  };

  const handleSubmitGrading = () => {
    setShowConfirmModal(true);
  };

  const confirmSubmitGrading = () => {
    setLoading(true);
    
    // 模拟提交评分
    setTimeout(() => {
      // 更新学生状态
      mockStudentAnswers[currentStudentIndex].status = 'completed';
      
      message.success(`${currentStudent.name}的评分已提交！`);
      setLoading(false);
      setShowConfirmModal(false);
      
    // 自动跳转到下一个学生
      if (currentStudentIndex < mockStudentAnswers.length - 1) {
        handleNextStudent();
      } else {
        // 如果是最后一个学生，提示完成阅卷
        Modal.confirm({
          title: '阅卷完成',
          content: '所有学生的答卷已评阅完成，是否生成分析报告？',
          okText: '生成报告',
          cancelText: '稍后处理',
          onOk: () => {
            updateExamStatus(exam.id, '已完成');
            message.success('阅卷完成！正在生成分析报告...');
            setTimeout(() => {
              setSubViewInfo({ view: 'analysis', exam: { ...exam, status: '已完成' } });
            }, 1500);
          }
        });
      }
    }, 1000);
  };

  const handleSkipStudent = () => {
    message.info('已跳过当前学生，稍后可在异常处理中继续评阅');
      handleNextStudent();
  };

  const getQuestionScore = (questionId: string) => {
    if (manualScores[questionId] !== undefined) {
      return manualScores[questionId];
    }
    const aiScore = currentStudent.aiScores?.[questionId as keyof typeof currentStudent.aiScores];
    return aiScore?.total || 0;
  };

  const getTotalScore = () => {
    return mockQuestionData.questions.reduce((total, q) => total + getQuestionScore(q.id), 0);
  };

  const getQuestionType = (questionId: string) => {
    const typeMap: Record<string, string> = {
      'q13': '论述题',
      'q14': '分析题', 
      'q15': '综合题'
    };
    return typeMap[questionId] || '未知类型';
  };

  const getGradingDifficulty = (questionId: string) => {
    const difficultyMap: Record<string, { level: string; color: string }> = {
      'q13': { level: '中等', color: 'orange' },
      'q14': { level: '困难', color: 'red' },
      'q15': { level: '简单', color: 'green' }
    };
    return difficultyMap[questionId] || { level: '未知', color: 'gray' };
  };

  const renderQuestionTabs = () => {
    const items = mockQuestionData.questions.map(question => {
      const questionType = getQuestionType(question.id);
      const difficulty = getGradingDifficulty(question.id);
      const isManuallyGraded = manualScores[question.id] !== undefined;
      const isObjective = ['choice', 'multiple_choice', 'true_false', 'fill_blank'].includes(question.questionType || '');
      
      return {
        key: question.id,
        label: (
          <div className="flex items-center gap-2">
            <span>{question.title.split('：')[0]}</span>
            <Tag color={isObjective ? 'green' : difficulty.color}>
              {isObjective ? '客观题' : difficulty.level}
            </Tag>
            <Tag color={isManuallyGraded ? 'green' : 'blue'}>
              {getQuestionScore(question.id)}/{question.points}
            </Tag>
            {classifiedGradingEnabled && (
              <Badge count={<Brain className="w-3 h-3" />} color="purple" />
            )}
          </div>
        ),
        children: (
          <div className="space-y-4">
            {/* 学生答案 */}
            <Card size="small" title="学生答案">
              {['choice', 'multiple_choice', 'true_false', 'fill_blank'].includes(question.questionType || '') ? (
                <div className="space-y-4">
                  {/* 题目内容 */}
                  {question.questionText && (
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">题目：</h4>
                      <p className="text-gray-700">{question.questionText}</p>
                    </div>
                  )}
                  
                  {/* 选择题选项 */}
                  {question.options && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-medium text-gray-900 mb-2">选项：</h4>
                      <div className="space-y-2">
                        {question.options.map((option, index) => (
                          <div key={index} className="text-gray-700">{option}</div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 学生答案和正确答案对比 */}
                  {currentStudent?.objectiveResults?.[question.id] && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-yellow-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">学生答案：</h4>
                        <p className="text-gray-700">
                          {currentStudent.objectiveResults[question.id].studentAnswer}
                        </p>
                      </div>
                      <div className="bg-green-50 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">正确答案：</h4>
                        <p className="text-gray-700">
                          {currentStudent.objectiveResults[question.id].correctAnswer}
                        </p>
                      </div>
                    </div>
                  )}
                  
                  {/* 评分结果 */}
                  {currentStudent?.objectiveResults?.[question.id] && (
                    <div className={`rounded-lg p-4 ${
                      currentStudent.objectiveResults[question.id].isCorrect
                        ? 'bg-green-50 border border-green-200'
                        : 'bg-red-50 border border-red-200'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          currentStudent.objectiveResults[question.id].isCorrect
                            ? 'text-green-800'
                            : 'text-red-800'
                        }`}>
                          {currentStudent.objectiveResults[question.id].isCorrect ? '答案正确' : '答案错误'}
                        </span>
                        <span className="text-sm text-gray-600">
                          得分：{currentStudent.objectiveResults[question.id].score}/{question.points}分
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* 主观题显示 */
                <div className="bg-gray-50 p-4 rounded-lg">
                  <p className="whitespace-pre-wrap text-gray-800">
                    {currentStudent.answers?.[question.id as keyof typeof currentStudent.answers] || '暂无答案'}
                  </p>
                </div>
              )}
            </Card>

            {/* 分类评分建议 */}
            {currentStudent.aiScores?.[question.id as keyof typeof currentStudent.aiScores] && (
              <Card size="small" title={
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Brain className="w-4 h-4 text-purple-500" />
                    <span>智能分类评分</span>
                    <Tag color="purple">{questionType}</Tag>
                  </div>
                  {classifiedGradingEnabled && (
                    <Tooltip title="基于题型的智能评分策略">
                      <Tag color="green">已启用</Tag>
                    </Tooltip>
                  )}
                </div>
              }>
                <div className="space-y-4">
                  {/* 评分策略显示 */}
                  <div className="bg-purple-50 p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">评分策略：</span>
                      <Tag color="purple">{gradingStrategy === 'strict' ? '严格' : gradingStrategy === 'moderate' ? '适中' : '宽松'}</Tag>
                    </div>
                    <div className="text-xs text-gray-600">
                      {gradingStrategy === 'strict' && '严格按照标准答案评分，注重准确性'}
                      {gradingStrategy === 'moderate' && '平衡准确性和灵活性，允许合理表述'}
                      {gradingStrategy === 'lenient' && '注重核心要点，允许多样化表达'}
                    </div>
                  </div>
                  
                  {/* AI评分结果 */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span>AI建议得分：</span>
                      <Tag color="purple" className="text-lg">
                        {currentStudent.aiScores[question.id as keyof typeof currentStudent.aiScores]?.total}/{question.points}
                      </Tag>
                    </div>
                    
                    {/* 评分维度分析 */}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="text-center p-2 bg-blue-50 rounded">
                        <div className="font-medium">内容准确性</div>
                        <div className="text-blue-600">85%</div>
                      </div>
                      <div className="text-center p-2 bg-green-50 rounded">
                        <div className="font-medium">逻辑完整性</div>
                        <div className="text-green-600">90%</div>
                      </div>
                      <div className="text-center p-2 bg-orange-50 rounded">
                        <div className="font-medium">表达规范性</div>
                        <div className="text-orange-600">75%</div>
                      </div>
                    </div>
                    
                    <div className="text-sm text-gray-600 mt-2">
                      {currentStudent.aiScores[question.id as keyof typeof currentStudent.aiScores]?.suggestions}
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* 手动评分 */}
            <Card size="small" title={
              <div className="flex items-center justify-between">
                <span>最终评分</span>
                <div className="flex items-center gap-2">
                  {classifiedGradingEnabled && (
                    <Tooltip title="分类评分已启用">
                      <ThunderboltOutlined className="text-purple-500" />
                    </Tooltip>
                  )}
                  <Tag color={manualScores[question.id] !== undefined ? 'green' : 'blue'}>
                    {manualScores[question.id] !== undefined ? '已人工评分' : 'AI评分'}
                  </Tag>
                </div>
              </div>
            }>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <span>最终得分：</span>
                  <InputNumber
                    min={0}
                    max={question.points}
                    value={getQuestionScore(question.id)}
                    onChange={(value) => setManualScores(prev => ({ ...prev, [question.id]: value || 0 }))}
                    addonAfter={`/${question.points}`}
                    size="large"
                  />
                  <Button
                    size="small"
                    type={autoApplyAI ? 'primary' : 'default'}
                    onClick={() => {
                      const aiScore = currentStudent.aiScores?.[question.id as keyof typeof currentStudent.aiScores];
                      if (aiScore) {
                        setManualScores(prev => ({ ...prev, [question.id]: aiScore.total }));
                        message.success('已采用AI建议分数');
                      }
                    }}
                  >
                    采用AI建议
                  </Button>
                </div>
                
                {/* 快速评分按钮 */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">快速评分：</span>
                  {[0, Math.floor(question.points * 0.6), Math.floor(question.points * 0.8), question.points].map(score => (
                    <Button
                      key={score}
                      size="small"
                      type={getQuestionScore(question.id) === score ? 'primary' : 'default'}
                      onClick={() => setManualScores(prev => ({ ...prev, [question.id]: score }))}
                    >
                      {score}
                    </Button>
                  ))}
                </div>
              </div>
            </Card>
          </div>
        )
      };
    });

    return (
      <Tabs
        activeKey={currentQuestionId}
        onChange={setCurrentQuestionId}
        items={items}
        className="h-full"
      />
    );
  };

  if (currentStudent.status === 'completed') {
    return (
      <div className="flex items-center justify-center h-96">
        <Empty
          description="该学生已完成评阅"
        >
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
      <div className="flex justify-between items-center mb-4">
        <Breadcrumb
          items={[
            { title: <a onClick={handleBack}>阅卷中心</a> },
            { title: exam.name },
            { title: '人机协同阅卷' }
          ]}
        />
        
        {/* 阅卷进度 */}
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
            </div>
          </div>
        }
        type="info"
        className="mb-4"
      />

      <Row gutter={[24, 24]}>
        {/* 左侧：答题内容 */}
        <Col xs={24} lg={14}>
          <Card 
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileTextOutlined className="text-blue-600" />
                  <span>答题内容</span>
                </div>
                <div className="flex items-center gap-2">
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
            className="h-full"
          >
            {renderQuestionTabs()}
          </Card>
        </Col>

        {/* 右侧：评分统计 */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Brain className="text-purple-500" />
                  <span>智能评分中心</span>
                  {classifiedGradingEnabled && (
                    <Tag color="purple">分类评分已启用</Tag>
                  )}
                </div>
                <Button
                  size="small"
                  icon={<SettingOutlined />}
                  onClick={() => setShowGradingSettings(true)}
                >
                  评分设置
                </Button>
              </div>
            }
            className="h-full"
          >
            {/* AI辅助阅卷功能集成 */}
            <Tabs
              size="small"
              items={[
                {
                  key: 'overview',
                  label: '评分概览',
                  children: (
                    <div className="space-y-4">
                      {/* 总分统计 */}
                      <div className="grid grid-cols-3 gap-2">
                        <Card size="small" className="text-center bg-gradient-to-r from-green-50 to-green-100">
                          <Statistic
                            title="客观题"
                            value={currentStudent?.objectiveResults ? Object.values(currentStudent.objectiveResults).reduce((sum, result) => sum + result.score, 0) : 0}
                            suffix={`/ ${mockQuestionData.questions.filter(q => ['choice', 'multiple_choice', 'true_false', 'fill_blank'].includes(q.questionType || '')).reduce((sum, q) => sum + q.points, 0)}`}
                            valueStyle={{ color: '#52c41a', fontSize: '16px', fontWeight: 'bold' }}
                          />
                        </Card>
                        <Card size="small" className="text-center bg-gradient-to-r from-blue-50 to-blue-100">
                          <Statistic
                            title="主观题"
                            value={mockQuestionData.questions.filter(q => !['choice', 'multiple_choice', 'true_false', 'fill_blank'].includes(q.questionType || '')).reduce((sum, q) => sum + getQuestionScore(q.id), 0)}
                            suffix={`/ ${mockQuestionData.questions.filter(q => !['choice', 'multiple_choice', 'true_false', 'fill_blank'].includes(q.questionType || '')).reduce((sum, q) => sum + q.points, 0)}`}
                            valueStyle={{ color: '#1677ff', fontSize: '16px', fontWeight: 'bold' }}
                          />
                        </Card>
                        <Card size="small" className="text-center bg-gradient-to-r from-purple-50 to-purple-100">
                          <Statistic
                            title="总分"
                            value={getTotalScore()}
                            suffix={`/ ${mockQuestionData.questions.reduce((sum, q) => sum + q.points, 0)}`}
                            valueStyle={{ color: '#722ed1', fontSize: '16px', fontWeight: 'bold' }}
                          />
                        </Card>
                      </div>
                    </div>
                  )
                },
                {
                   key: 'ai-assistant',
                   label: 'AI助手',
                   children: currentStudent && currentQuestionId ? (
                     <AIMarkingAssistant
                       questionId={currentQuestionId}
                       questionType={mockQuestionData.questions.find(q => q.id === currentQuestionId)?.questionType || 'subjective'}
                       studentAnswer={(currentStudent.answers as any)?.[currentQuestionId] || ''}
                       standardAnswer={mockQuestionData.questions.find(q => q.id === currentQuestionId)?.answer}
                       maxScore={mockQuestionData.questions.find(q => q.id === currentQuestionId)?.points || 10}
                       onScoreChange={(score: number) => {
                         setManualScores(prev => ({ ...prev, [currentQuestionId]: score }));
                       }}
                       onSuggestionApply={(suggestion: any) => {
                         console.log('AI建议已应用:', suggestion);
                       }}
                     />
                   ) : (
                     <div className="text-center py-8 text-gray-500">
                       请选择题目以使用AI助手
                     </div>
                   )
                 },
                 {
                   key: 'scoring-strategy',
                   label: '评分策略',
                   children: (
                     <IntelligentScoringStrategy
                       onStrategyChange={(strategy) => {
                         console.log('评分策略已更新:', strategy);
                       }}
                     />
                   )
                 },
                 {
                   key: 'quality-monitor',
                   label: '质量监控',
                   children: (
                     <AIGradingQualityMonitor />
                   )
                 }
              ]}
            />

            {/* 涂卡分析 */}
            <BubbleSheetAnalysis
              bubbleAnalysis={currentStudent.bubbleSheetAnalysis}
              bubbleQualityScore={currentStudent.bubbleQualityScore}
              bubbleValidation={currentStudent.bubbleValidation}
            />

            {/* 各题得分 */}
            <div className="space-y-3 mb-6">
              <h4 className="font-medium">各题得分详情</h4>
              {mockQuestionData.questions.map(question => (
                <div key={question.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <span className="font-medium">{question.title.split('：')[0]}</span>
                  <div className="flex items-center gap-2">
                    <Tag color={manualScores[question.id] !== undefined ? 'green' : 'blue'}>
                      {getQuestionScore(question.id)}/{question.points}
                    </Tag>
                    {manualScores[question.id] !== undefined && (
                      <Tag color="green">已评</Tag>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* 操作按钮 */}
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
                  onClick={handleSkipStudent}
                >
                  跳过此份
                </Button>
              </div>
            </div>

            {/* 分类评分状态 */}
            {classifiedGradingEnabled && (
              <Card size="small" className="mb-4 bg-gradient-to-r from-purple-50 to-blue-50">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">分类评分状态</span>
                    <Tag color="green">运行中</Tag>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="text-center">
                      <div className="text-gray-500">评分策略</div>
                      <div className="font-medium">
                        {gradingStrategy === 'strict' ? '严格' : gradingStrategy === 'moderate' ? '适中' : '宽松'}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-gray-500">AI置信度</div>
                      <div className="font-medium text-green-600">92%</div>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* 评分说明 */}
            <Alert
              message={classifiedGradingEnabled ? "智能分类评分说明" : "评分说明"}
              description={
                <div className="text-sm space-y-1">
                  {classifiedGradingEnabled ? (
                    <>
                      <p>• 系统已根据题型启用分类评分策略</p>
                      <p>• AI会根据题目类型调整评分标准</p>
                      <p>• 评分维度包括内容准确性、逻辑完整性、表达规范性</p>
                      <p>• 您可以在评分设置中调整策略和参数</p>
                    </>
                  ) : (
                    <>
                      <p>• AI已完成初步评分，您可以参考或调整</p>
                      <p>• 点击"采用AI建议"快速应用AI评分</p>
                      <p>• 手动调整分数后会覆盖AI评分</p>
                      <p>• 建议逐题评阅，确保评分准确性</p>
                    </>
                  )}
                </div>
              }
              type="info"
              showIcon
              className="mt-4"
            />
          </Card>
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

      {/* 分类评分设置模态框 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <SettingOutlined className="text-purple-500" />
            <span>分类评分设置</span>
          </div>
        }
        open={showGradingSettings}
        onCancel={() => setShowGradingSettings(false)}
        footer={[
          <Button key="cancel" onClick={() => setShowGradingSettings(false)}>
            取消
          </Button>,
          <Button
            key="save"
            type="primary"
            onClick={() => {
              message.success('评分设置已保存');
              setShowGradingSettings(false);
            }}
          >
            保存设置
          </Button>
        ]}
        width={600}
      >
        <div className="space-y-6">
          {/* 启用分类评分 */}
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">启用分类评分</div>
              <div className="text-sm text-gray-500">根据题目类型自动调整评分策略</div>
            </div>
            <Switch
              checked={classifiedGradingEnabled}
              onChange={setClassifiedGradingEnabled}
              checkedChildren="启用"
              unCheckedChildren="关闭"
            />
          </div>

          {classifiedGradingEnabled && (
            <>
              {/* 评分策略 */}
              <div>
                <div className="font-medium mb-2">评分策略</div>
                <Select
                  value={gradingStrategy}
                  onChange={setGradingStrategy}
                  className="w-full"
                  options={[
                    { value: 'strict', label: '严格模式 - 严格按照标准答案评分' },
                    { value: 'moderate', label: '适中模式 - 平衡准确性和灵活性' },
                    { value: 'lenient', label: '宽松模式 - 注重核心要点，允许多样化表达' }
                  ]}
                />
              </div>

              {/* 自动应用AI建议 */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium">自动应用AI建议</div>
                  <div className="text-sm text-gray-500">自动采用AI评分结果，无需手动确认</div>
                </div>
                <Switch
                  checked={autoApplyAI}
                  onChange={setAutoApplyAI}
                  checkedChildren="自动"
                  unCheckedChildren="手动"
                />
              </div>

              {/* 评分维度权重 */}
              <div>
                <div className="font-medium mb-3">评分维度权重</div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span>内容准确性</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">40%</span>
                      <div className="w-20 h-2 bg-blue-100 rounded">
                        <div className="w-2/5 h-full bg-blue-500 rounded"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>逻辑完整性</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">35%</span>
                      <div className="w-20 h-2 bg-green-100 rounded">
                        <div className="w-1/3 h-full bg-green-500 rounded"></div>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>表达规范性</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">25%</span>
                      <div className="w-20 h-2 bg-orange-100 rounded">
                        <div className="w-1/4 h-full bg-orange-500 rounded"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* 题型特殊设置 */}
              <div>
                <div className="font-medium mb-3">题型特殊设置</div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                    <span>客观题 - 自动评分，支持选择题、判断题、填空题</span>
                    <Tag color="green">已启用</Tag>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>论述题 - 注重逻辑性和深度</span>
                    <Tag color="orange">已配置</Tag>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>分析题 - 强调分析能力</span>
                    <Tag color="red">已配置</Tag>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-gray-50 rounded">
                    <span>综合题 - 综合运用知识</span>
                    <Tag color="green">已配置</Tag>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default MarkingWorkspace;