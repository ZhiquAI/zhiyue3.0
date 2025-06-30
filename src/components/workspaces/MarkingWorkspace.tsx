import React, { useState } from 'react';
import { Card, Row, Col, Breadcrumb, Button, Tabs, Segmented, Alert, Slider, Space, Tag } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';
import { Sparkles } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { Exam } from '../../types/exam';
import { mockConfigureData, mockMarkingData } from '../../data/mockData';

interface MarkingWorkspaceProps {
  exam: Exam;
}

const MarkingWorkspace: React.FC<MarkingWorkspaceProps> = ({ exam }) => {
  const { setSubViewInfo } = useAppContext();
  const [activeTab, setActiveTab] = useState('student');
  const [currentQuestionId, setCurrentQuestionId] = useState('q13');
  const [scores, setScores] = useState(mockMarkingData.subjectiveScores);

  const currentRubric = mockConfigureData.rubrics[currentQuestionId];
  const currentScores = scores[currentQuestionId];
  const totalSubjectiveScore = Object.values(scores).reduce((sum, q) => sum + q.totalScore, 0);
  const finalScore = mockMarkingData.objectiveScore + totalSubjectiveScore;

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

  const tabsItems = [
    {
      key: 'student',
      label: '学生答卷',
      children: (
        <div className="relative w-full bg-gray-100 rounded-md" style={{ paddingBottom: '141.4%' }}>
          <img
            src="https://images.pexels.com/photos/301926/pexels-photo-301926.jpeg?auto=compress&cs=tinysrgb&w=800"
            alt="学生答卷图片"
            className="absolute top-0 left-0 w-full h-full object-cover rounded-md"
          />
        </div>
      )
    },
    {
      key: 'question',
      label: '原卷试题',
      children: <Card>原卷试题内容...</Card>
    },
    {
      key: 'answer',
      label: '参考答案',
      children: <Card>参考答案内容...</Card>
    }
  ];

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
        <Space>
          <span className="text-gray-500">
            当前考生: {mockMarkingData.studentName} ({mockMarkingData.studentId})
          </span>
          <Button>上一份</Button>
          <Button type="primary">下一份</Button>
        </Space>
      </div>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card>
            <Tabs
              activeKey={activeTab}
              onChange={setActiveTab}
              items={tabsItems}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card
            title={
              <div className="flex items-center gap-2">
                <Sparkles className="text-purple-500" />
                <span>AI辅助评分</span>
              </div>
            }
            extra={
              <Tag color="blue" className="text-lg">
                最终总分: {finalScore}
              </Tag>
            }
          >
            <div className="mb-4">
              <Segmented
                options={mockConfigureData.questions.map(q => ({
                  label: q.title,
                  value: q.id
                }))}
                value={currentQuestionId}
                onChange={setCurrentQuestionId}
              />
            </div>

            <div className="flex flex-col gap-4">
              <Alert
                message={`客观题得分: ${mockMarkingData.objectiveScore}分 (由系统自动判定)`}
                type="success"
              />

              {currentRubric?.dimensions.map(dim => {
                const score = currentScores?.dimensionScores.find(s => s.id === dim.id);
                if (!score) return null;

                return (
                  <div
                    key={dim.id}
                    className="p-3 rounded-lg border hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-semibold text-base text-gray-800">
                        {dim.name}
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-xl text-purple-600">
                          {score.score}
                        </span>
                        <span className="text-gray-400"> / {dim.points}</span>
                      </div>
                    </div>
                    <Slider
                      min={0}
                      max={dim.points}
                      value={score.score}
                      onChange={(value) => handleScoreChange(dim.id, value)}
                      className="mb-1"
                    />
                    <p className="text-sm text-gray-500 italic">
                      <InfoCircleOutlined className="mr-2" />
                      {score.reason}
                    </p>
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MarkingWorkspace;