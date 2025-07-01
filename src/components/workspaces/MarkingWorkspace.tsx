import React, { useState } from 'react';
import { Card, Row, Col, Breadcrumb, Button, Segmented, Alert, Slider, Space, Tag, Progress, Statistic, Empty } from 'antd';
import { InfoCircleOutlined, UserOutlined, FileTextOutlined, CheckCircleOutlined, RobotOutlined } from '@ant-design/icons';
import { Sparkles } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import { Exam } from '../../types/exam';

interface MarkingWorkspaceProps {
  exam: Exam;
}

const MarkingWorkspace: React.FC<MarkingWorkspaceProps> = ({ exam }) => {
  const { setSubViewInfo } = useAppContext();
  const [currentStudentIndex, setCurrentStudentIndex] = useState(0);

  // 模拟学生列表 - 实际应该从后端获取
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
    console.log('提交评分:', { student: students[currentStudentIndex] });
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
            {/* 答题卡显示区域 - 显示空白状态 */}
            <div className="relative w-full bg-gray-100 rounded-md overflow-hidden flex items-center justify-center" style={{ height: '600px' }}>
              <div className="text-center text-gray-500">
                <FileTextOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} className="mb-4" />
                <p className="text-lg font-medium mb-2">等待上传答题卡</p>
                <p className="text-sm">请先在考试配置中上传学生答题卡文件</p>
              </div>
            </div>

            {/* 答题卡操作区域 */}
            <div className="mt-4 flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="text-sm text-gray-600">
                上传答题卡后，可点击题目区域切换评分
              </div>
              <div className="flex items-center gap-2">
                <Button size="small" type="text" disabled>
                  放大查看
                </Button>
                <Button size="small" type="text" disabled>
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
            {/* 总分统计 - 三项在同一排显示，但显示空状态 */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <Card size="small" className="text-center bg-blue-50">
                <Statistic
                  title="客观题得分"
                  value={0}
                  suffix="分"
                  valueStyle={{ color: '#1677ff', fontSize: '18px' }}
                />
              </Card>
              <Card size="small" className="text-center bg-purple-50">
                <Statistic
                  title="主观题得分"
                  value={0}
                  suffix="分"
                  valueStyle={{ color: '#722ed1', fontSize: '18px' }}
                />
              </Card>
              <Card size="small" className="text-center bg-green-50">
                <Statistic
                  title="总分"
                  value={0}
                  suffix="分"
                  valueStyle={{ color: '#52c41a', fontSize: '18px', fontWeight: 'bold' }}
                />
              </Card>
            </div>

            {/* AI评分空状态 */}
            <div className="flex flex-col items-center justify-center py-12">
              <Empty
                image={<RobotOutlined style={{ fontSize: '64px', color: '#d9d9d9' }} />}
                description={
                  <div className="text-center">
                    <p className="text-gray-500 mb-2">AI评分功能待激活</p>
                    <p className="text-sm text-gray-400 mb-4">
                      上传答题卡后，AI将自动识别并辅助评分
                    </p>
                  </div>
                }
              >
                <div className="space-y-3">
                  <Alert
                    message="AI评分流程"
                    description={
                      <div className="text-left text-sm">
                        <p>1. 上传学生答题卡文件</p>
                        <p>2. AI自动识别手写内容</p>
                        <p>3. 基于评分标准智能评分</p>
                        <p>4. 教师复核确认最终分数</p>
                      </div>
                    }
                    type="info"
                    showIcon
                    className="text-left"
                  />
                  
                  <Button type="primary" disabled>
                    等待答题卡上传
                  </Button>
                </div>
              </Empty>
            </div>

            {/* 功能说明 */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <div className="text-sm font-medium text-gray-700 mb-3">AI评分特点:</div>
              <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                  <span>多维度评分</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                  <span>智能识别</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                  <span>历史专业</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  <span>人工复核</span>
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default MarkingWorkspace;