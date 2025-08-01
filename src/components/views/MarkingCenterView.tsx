import React, { useState } from 'react';
import { Card, Button, Tag, Breadcrumb, Empty, Alert, Space, message, Row, Col } from 'antd';
import { EditOutlined, ExperimentOutlined, UploadOutlined, ScissorOutlined, RobotOutlined } from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import { Exam } from '../../types/exam';
import MarkingWorkspace from '../workspaces/MarkingWorkspace';
import PreGradingCenterView from './PreGradingCenterView';

interface WorkflowState {
  exam: Exam;
  currentStep: 'pre_grading' | 'marking' | 'review' | 'completed';
}

const MarkingCenterView: React.FC = () => {
  const { currentView, subViewInfo, setCurrentView, setSubViewInfo } = useAppContext();
  const [workflowState, setWorkflowState] = useState<WorkflowState | null>(null);
  const [showSubMenu, setShowSubMenu] = useState(true); // 控制是否显示子菜单卡片
  
  // 获取当前选中的考试
  const selectedExam = subViewInfo?.exam as Exam;

  // 子菜单卡片数据
  const subMenuCards = [
    {
      key: 'preGrading',
      title: '阅卷前处理',
      description: '上传答题卡，进行图像预处理和质量检查',
      icon: <UploadOutlined className="text-2xl" />,
      color: 'from-blue-500 to-blue-600',
      onClick: () => {
        setShowSubMenu(false);
        setWorkflowState(prev => prev ? { ...prev, currentStep: 'pre_grading' } : null);
      }
    },
    {
      key: 'marking',
      title: '在线阅卷',
      description: '进行主观题阅卷，评分和质量控制',
      icon: <EditOutlined className="text-2xl" />,
      color: 'from-green-500 to-green-600',
      onClick: () => {
        setShowSubMenu(false);
        setWorkflowState(prev => prev ? { ...prev, currentStep: 'marking' } : null);
      }
    },
    {
      key: 'aiMarking',
      title: 'AI智能阅卷',
      description: '使用人工智能技术进行自动阅卷',
      icon: <RobotOutlined className="text-2xl" />,
      color: 'from-purple-500 to-purple-600',
      onClick: () => {
        setCurrentView('aiMarking');
      }
    },
    {
      key: 'markingTools',
      title: '阅卷工具',
      description: '阅卷辅助工具和设置管理',
      icon: <ScissorOutlined className="text-2xl" />,
      color: 'from-orange-500 to-orange-600',
      onClick: () => {
        setCurrentView('markingTools');
      }
    }
  ];

  // 渲染卡片式子菜单
  const renderSubMenuCards = () => (
    <div className="space-y-6">
      <Breadcrumb className="mb-4" items={[{ title: '阅卷中心' }]} />
      
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">阅卷中心</h2>
        <p className="text-gray-600">选择您要使用的阅卷功能</p>
      </div>
      
      <Row gutter={[24, 24]}>
        {subMenuCards.map((card) => (
          <Col xs={24} sm={12} lg={6} key={card.key}>
            <Card
              hoverable
              className="h-full transition-all duration-300 hover:shadow-lg border-0 overflow-hidden"
              onClick={card.onClick}
              style={{ cursor: 'pointer' }}
            >
              <div className={`bg-gradient-to-br ${card.color} p-6 -m-6 mb-4 text-white`}>
                <div className="flex items-center justify-center mb-3">
                  {card.icon}
                </div>
                <h3 className="text-lg font-semibold text-center text-white">
                  {card.title}
                </h3>
              </div>
              <div className="pt-2">
                <p className="text-gray-600 text-sm text-center leading-relaxed">
                  {card.description}
                </p>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );

  // 如果显示子菜单，则渲染卡片式子菜单
  if (showSubMenu) {
    return renderSubMenuCards();
  }

  // 如果没有选中考试，显示考试列表
  if (!selectedExam) {
    return (
      <div className="marking-center-overview">
        <div className="mb-6">
          <Breadcrumb
            items={[
              { title: <span style={{ cursor: 'pointer' }} onClick={() => setCurrentView('examList')}>考试管理</span> },
              { title: <span style={{ cursor: 'pointer' }} onClick={() => setShowSubMenu(true)}>阅卷中心</span> }
            ]}
          />
        </div>

        <Card>
          <Empty 
            description="请先从考试管理页面选择要处理的考试"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button 
              type="primary" 
              onClick={() => setCurrentView('examList')}
            >
              返回考试管理
            </Button>
          </Empty>
        </Card>
      </div>
    );
  }

  // 初始化工作流状态
  if (!workflowState) {
    const initialStep = determineInitialStep(selectedExam);
    setWorkflowState({
      exam: selectedExam,
      currentStep: initialStep
    });
    return <div>初始化中...</div>;
  }

  // 确定考试的初始步骤
  function determineInitialStep(exam: Exam): 'pre_grading' | 'marking' | 'review' | 'completed' {
    switch (exam.status) {
      case '待配置':
        return 'pre_grading';
             case '阅卷中':
         return 'marking';
       case '待复核':
         return 'review';
      case '已完成':
        return 'completed';
      default:
        return 'pre_grading';
    }
  }

  // 处理阅卷前处理完成
  const handlePreGradingComplete = () => {
    setWorkflowState(prev => prev ? { ...prev, currentStep: 'marking' } : null);
    message.success('阅卷前处理已完成，开始在线阅卷');
  };

  // 处理阅卷完成
  const handleMarkingComplete = () => {
    setWorkflowState(prev => prev ? { ...prev, currentStep: 'review' } : null);
    message.success('阅卷已完成，进入复核阶段');
  };



  // 返回考试管理
  const handleBackToOverview = () => {
    setCurrentView('examList');
    setSubViewInfo({ view: null, exam: null, source: null });
    setWorkflowState(null);
  };

  // 根据当前步骤渲染内容
  const renderCurrentStep = () => {
    switch (workflowState.currentStep) {
      case 'pre_grading':
        return (
          <PreGradingCenterView 
            exam={selectedExam}
            onBack={handleBackToOverview}
            onComplete={handlePreGradingComplete}
          />
        );
      
      case 'marking':
        return (
          <div>
            <div className="mb-6">
              <Breadcrumb
                items={[
                  { title: <span style={{ cursor: 'pointer' }} onClick={handleBackToOverview}>考试管理</span> },
                  { title: selectedExam.name },
                  { title: '在线阅卷' }
                ]}
              />
            </div>
            
            <Card 
              title={
                <div className="flex items-center gap-2">
                  <EditOutlined />
                  <span>在线阅卷</span>
                  <Tag color="processing">进行中</Tag>
                </div>
              }
              extra={
                <Space>
                  <Button onClick={() => setWorkflowState(prev => prev ? { ...prev, currentStep: 'pre_grading' } : null)}>
                    返回预处理
                  </Button>
                  <Button type="primary" onClick={handleMarkingComplete}>
                    完成阅卷
                  </Button>
                </Space>
              }
            >
              <MarkingWorkspace exam={selectedExam} />
            </Card>
          </div>
        );
      
      case 'review':
        return (
          <div>
            <div className="mb-6">
              <Breadcrumb
                items={[
                  { title: <span style={{ cursor: 'pointer' }} onClick={handleBackToOverview}>考试管理</span> },
                  { title: selectedExam.name },
                  { title: '复核确认' }
                ]}
              />
            </div>
            
            <Card title="复核确认">
              <Alert
                message="阅卷复核功能"
                description="复核功能正在开发中，当前版本暂不支持"
                type="info"
                showIcon
                action={
                  <Space>
                    <Button onClick={() => setWorkflowState(prev => prev ? { ...prev, currentStep: 'marking' } : null)}>
                      返回阅卷
                    </Button>
                    <Button type="primary" onClick={() => setWorkflowState(prev => prev ? { ...prev, currentStep: 'completed' } : null)}>
                      确认完成
                    </Button>
                  </Space>
                }
              />
            </Card>
          </div>
        );
      
      case 'completed':
        return (
          <div>
            <div className="mb-6">
              <Breadcrumb
                items={[
                  { title: <span style={{ cursor: 'pointer' }} onClick={handleBackToOverview}>考试管理</span> },
                  { title: selectedExam.name },
                  { title: '已完成' }
                ]}
              />
            </div>
            
            <Card title="阅卷完成">
              <Alert
                message="阅卷已完成"
                description="本次考试的所有阅卷工作已经完成，您可以查看统计报告或进行数据分析"
                type="success"
                showIcon
                action={
                  <Space>
                    <Button onClick={() => setCurrentView('dataAnalysis')}>
                      查看分析报告
                    </Button>
                    <Button onClick={handleBackToOverview}>
                      返回考试管理
                    </Button>
                  </Space>
                }
              />
            </Card>
          </div>
        );
      
      default:
        return <Empty description="未知状态" />;
    }
  };

  return (
    <div className="marking-center">
      {renderCurrentStep()}
    </div>
  );
};

export default MarkingCenterView;