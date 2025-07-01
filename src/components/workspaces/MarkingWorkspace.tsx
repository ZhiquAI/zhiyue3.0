import React, { useState } from 'react';
import { Card, Row, Col, Breadcrumb, Button, Segmented, Alert, Slider, Space, Tag, Progress, Statistic } from 'antd';
import { InfoCircleOutlined, UserOutlined, FileTextOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { Sparkles } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { Exam } from '../../types/exam';
import { mockConfigureData, mockMarkingData } from '../../data/mockData';

interface MarkingWorkspaceProps {
  exam: Exam;
}

const MarkingWorkspace: React.FC<MarkingWorkspaceProps> = ({ exam }) => {
  const { setSubViewInfo } = useAppContext();
  const [currentQuestionId, setCurrentQuestionId] = useState('q13');
  const [scores, setScores] = useState(mockMarkingData.subjectiveScores);
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);

  const currentRubric = mockConfigureData.rubrics[currentQuestionId];
  const currentScores = scores[currentQuestionId];
  const totalSubjectiveScore = Object.values(scores).reduce((sum, q) => sum + q.totalScore, 0);
  const finalScore = mockMarkingData.objectiveScore + totalSubjectiveScore;

  // 模拟学生列表
  const students = [
    { id: '2024001', name: '王同学', status: 'current' },
    { id: '2024002', name: '李同学', status: 'pending' },
    { id: '2024003', name: '张同学', status: 'pending' },
    { id: '2024004', name: '刘同学', status: 'completed' },
    { id: '2024005', name: '陈同学', status: 'completed' },
  ];

  const handleBack = () => {
    setSubViewInfo({ view: null, exam: null });
  };

  const handleScoreChange = (dimensionId: string, newScore: number) => {
    setScores(prev => ({
      ...prev,
      [currentQuestionId]: {
        ...prev[currentQuestionId],
        dimensionScores: prev[currentQuestionId].dimensionScores.map(dim =>
          dim.id === dimensionId ? { ...dim, score: newScore } : dim
        ),
        totalScore: prev[currentQuestionId].dimensionScores.reduce((sum, dim) => 
          sum + (dim.id === dimensionId ? newScore : dim.score), 0
        )
      }
    }));
  };

  const handleNextStudent = () => {
    if (currentStudentIndex < students.length - 1) {
      setCurrentStudentIndex(prev => prev + 1);
    }
  };

  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) {
      setCurrentStudentIndex(prev => prev - 1);
    }
  };

  const handleSubmitGrading = () => {
    // 提交当前学生的评分
    console.log('提交评分:', { student: students[currentStudentIndex], scores, finalScore });
    // 自动跳转到下一个学生
    if (currentStudentIndex < students.length - 1) {
      handleNextStudent();
    }
  };

  const currentStudent = students[currentStudentIndex];
  const completedCount = students.filter(s => s.status === 'completed').length;
  const progressPercent = Math.round((completedCount / students.length) * 100);

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
            阅卷进度: {completedCount}/{students.length}
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
              <Tag color="green">剩余 {students.length - currentStudentIndex - 1} 份</Tag>
            </div>
          </div>
        }
        type="info"
        className="mb-4"
      />

      <Row gutter={[24, 24]}>
        {/* 左侧：学生答题卡 */}
        <Col xs={24} lg={14}>
          <Card 
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileTextOutlined className="text-blue-600" />
                  <span>学生答题卡</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    size="small"
                    disabled={currentStudentIndex === 0}
                    onClick={handlePrevStudent}
                  >
                    上一份
                  </Button>
                  <Button 
                    size="small"
                    disabled={currentStudentIndex === students.length - 1}
                    onClick={handleNextStudent}
                  >
                    下一份
                  </Button>
                </div>
              </div>
            }
            className="h-full"
          >
            {/* 答题卡图片显示区域 */}
            <div className="relative w-full bg-gray-100 rounded-md overflow-hidden" style={{ paddingBottom: '141.4%' }}>
              <img
                src="https://images.pexels.com/photos/301926/pexels-photo-301926.jpeg?auto=compress&cs=tinysrgb&w=800"
                alt={`${currentStudent.name}的答题卡`}
                className="absolute top-0 left-0 w-full h-full object-cover"
              />
              
              {/* 题目区域标注 */}
              <div className="absolute inset-0">
                {mockConfigureData.questions.map(q => (
                  <div
                    key={q.id}
                    className={`absolute border-2 transition-all duration-300 cursor-pointer ${
                      currentQuestionId === q.id
                        ? 'border-blue-500 bg-blue-500/30 ring-4 ring-blue-300'
                        : 'border-dashed border-gray-400 hover:border-blue-300 hover:bg-blue-100/20'
                    }`}
                    style={{ ...q.area }}
                    onClick={() => setCurrentQuestionId(q.id)}
                  >
                    <div className="absolute -top-6 left-0 bg-blue-600 text-white text-xs px-2 py-1 rounded">
                      {q.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 答题卡操作区域 */}
            <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                点击答题卡上的题目区域可切换评分题目
              </div>
              <div className="flex items-center gap-2">
                <Button size="small" type="text">
                  放大查看
                </Button>
                <Button size="small" type="text">
                  旋转图片
                </Button>
              </div>
            </div>
          </Card>
        </Col>

        {/* 右侧：AI辅助评分 */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <div className="flex items-center gap-2">
                <Sparkles className="text-purple-500" />
                <span>AI辅助评分</span>
              </div>
            }
            className="h-full"
          >
            {/* 总分统计 */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <Card size="small" className="text-center bg-blue-50">
                <Statistic
                  title="客观题得分"
                  value={mockMarkingData.objectiveScore}
                  suffix="分"
                  valueStyle={{ color: '#1677ff', fontSize: '20px' }}
                />
              </Card>
              <Card size="small" className="text-center bg-purple-50">
                <Statistic
                  title="主观题得分"
                  value={totalSubjectiveScore}
                  suffix="分"
                  valueStyle={{ color: '#722ed1', fontSize: '20px' }}
                />
              </Card>
            </div>

            <Card size="small" className="mb-4 bg-gradient-to-r from-green-50 to-blue-50">
              <Statistic
                title="总分"
                value={finalScore}
                suffix="分"
                valueStyle={{ color: '#52c41a', fontSize: '28px', fontWeight: 'bold' }}
              />
            </Card>

            {/* 题目选择 */}
            <div className="mb-4">
              <div className="text-sm font-medium text-gray-700 mb-2">选择评分题目:</div>
              <Segmented
                options={mockConfigureData.questions.map(q => ({
                  label: q.title.replace('第', '').replace('题：', ''),
                  value: q.id
                }))}
                value={currentQuestionId}
                onChange={setCurrentQuestionId}
                size="small"
                block
              />
            </div>

            {/* 当前题目评分 */}
            <div className="space-y-4">
              <div className="text-sm font-medium text-gray-700 border-b pb-2">
                {mockConfigureData.questions.find(q => q.id === currentQuestionId)?.title} 评分详情
              </div>

              {currentRubric?.dimensions.map(dim => {
                const score = currentScores?.dimensionScores.find(s => s.id === dim.id);
                if (!score) return null;

                return (
                  <div
                    key={dim.id}
                    className="p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow bg-white"
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="font-medium text-base text-gray-800">
                        {dim.name}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xl text-purple-600">
                          {score.score}
                        </span>
                        <span className="text-gray-400 text-sm"> / {dim.points}</span>
                      </div>
                    </div>
                    
                    <Slider
                      min={0}
                      max={dim.points}
                      value={score.score}
                      onChange={(value) => handleScoreChange(dim.id, value)}
                      className="mb-3"
                      tooltip={{ formatter: (value) => `${value}分` }}
                    />
                    
                    <div className="bg-blue-50 p-3 rounded text-sm">
                      <div className="flex items-start gap-2">
                        <InfoCircleOutlined className="text-blue-600 mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-blue-800 mb-1">AI评分理由:</div>
                          <div className="text-blue-700">{score.reason}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 提交按钮 */}
            <div className="mt-6 space-y-3">
              <Button
                type="primary"
                size="large"
                block
                icon={<CheckCircleOutlined />}
                onClick={handleSubmitGrading}
              >
                确认评分并继续下一份
              </Button>
              
              <div className="text-xs text-gray-500 text-center">
                确认后将自动保存评分结果并跳转到下一份答题卡
              </div>
            </div>

            {/* 快捷操作 */}
            <div className="mt-4 p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-600 mb-2">快捷操作:</div>
              <div className="grid grid-cols-2 gap-2">
                <Button size="small" type="text">
                  标记疑问
                </Button>
                <Button size="small" type="text">
                  添加批注
                </Button>
                <Button size="small" type="text">
                  查看原题
                </Button>
                <Button size="small" type="text">
                  参考答案
                </Button>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MarkingWorkspace;