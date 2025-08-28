import React, { useState } from 'react';
import { Card, Row, Col, Avatar, Tag, Timeline, List, Button, Breadcrumb } from 'antd';
import { 
  UploadOutlined, 
  CheckCircleOutlined, 
  BarChartOutlined,
  ClockCircleOutlined,
  EditOutlined,
  FileTextOutlined
} from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import CreateExamModal from '../modals/CreateExamModal';
import { mockNotifications } from '../../data/mockData';
import { Exam } from '../../types/exam';
import { cn, cardStyles, buttonStyles, layout } from '../../design-system';

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
  disabled?: boolean;
  tips?: string;
}

const DashboardView: React.FC = () => {
  const { exams, setSubViewInfo, setCurrentView } = useAppContext();
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);

  const todoExams = exams.filter(e => 
    ['待配置', '阅卷中', '待阅卷'].includes(e.status)
  );

  // 获取可以阅卷的考试（状态为"阅卷中"或"待阅卷"）
  const markingExams = exams.filter(e => 
    e.status === '阅卷中' || e.status === '待阅卷'
  );

  // 获取已完成的考试（可以查看分析）
  const completedExams = exams.filter(e => e.status === '已完成');

  const handleNavigate = (type: string, exam?: Exam) => {
    if (type === 'create') {
      setCreateModalVisible(true);
    } else if (type === 'startMarking') {
      // 阅卷中心已移除，跳转到考试管理
      setCurrentView('examList');
    } else if (type === 'viewAnalysis') {
      // 查看分析 - 如果有已完成的考试，进入第一个的分析
      if (completedExams.length > 0) {
        const firstCompletedExam = completedExams[0];
        setSubViewInfo({ view: 'analysis', exam: firstCompletedExam, source: null });
      } else {
        // 如果没有已完成的考试，跳转到数据分析页面
        setCurrentView('dataAnalysis');
      }
    } else if (type === 'handle' && exam) {
      // 处理待办事项的点击 - 阅卷中心已移除，跳转到考试管理
      setCurrentView('examList');
      setSubViewInfo({ view: null, exam, source: null });
    }
  };

  const handleExamAction = (exam: Exam) => {
    if (exam.status === '已完成') {
      // 如果是已完成的考试，跳转到数据分析
      setCurrentView('dataAnalysis');
      setSubViewInfo({ view: 'analysis', exam, source: null });
    } else {
      // 其他状态的考试跳转到考试管理
      setCurrentView('examList');
      setSubViewInfo({ view: null, exam, source: null });
    }
  };

  const getActionIcon = (status: string) => {
    switch (status) {
      case '待配置':
        return <FileTextOutlined className="text-orange-600" />;
      case '待阅卷':
        return <UploadOutlined className="text-primary-600" />;
      case '阅卷中':
        return <EditOutlined className="text-green-600" />;
      default:
        return <ClockCircleOutlined className="text-neutral-600" />;
    }
  };

  const getActionText = (status: string) => {
    switch (status) {
      case '待配置':
        return '上传答题卡';
      case '待阅卷':
        return '上传答题卡';
      case '阅卷中':
        return '继续阅卷';
      default:
        return '查看详情';
    }
  };

  const quickActions: QuickAction[] = [
    {
      title: '创建考试',
      description: '上传试卷文件，配置考试信息，开启智能阅卷流程',
      icon: <UploadOutlined />,
      color: 'bg-primary-100 text-primary-600',
      onClick: () => handleNavigate('create'),
      tips: '支持PDF、图片格式，AI自动识别题目结构'
    },
    {
      title: '智能阅卷',
      description: `${markingExams.length} 个考试等待处理，AI辅助快速完成阅卷`,
      icon: <CheckCircleOutlined />,
      color: 'bg-green-100 text-green-600',
      onClick: () => handleNavigate('startMarking'),
      disabled: markingExams.length === 0,
      tips: markingExams.length > 0 ? '包含答题卡上传、智能分割、评分设置等完整流程' : '暂无待阅卷任务'
    },
    {
      title: '🚀 体验优化版',
      description: '全新优化的阅卷界面，50%性能提升，更智能的批量处理',
      icon: <EditOutlined />,
      color: 'bg-orange-100 text-orange-600',
      onClick: () => window.open('/optimized-demo', '_blank'),
      tips: '⚡ 智能批量处理 | 📊 实时质量监控 | 🛡️ 异常自动恢复'
    },
    {
      title: '数据分析',
      description: `${completedExams.length} 份报告可查看，深度分析学情数据`,
      icon: <BarChartOutlined />,
      color: 'bg-purple-100 text-purple-600',
      onClick: () => handleNavigate('viewAnalysis'),
      disabled: completedExams.length === 0,
      tips: completedExams.length > 0 ? '提供班级对比、能力分析、个人诊断等多维度报告' : '完成阅卷后可查看分析报告'
    }
  ];

  return (
    <div>
      <Breadcrumb className="mb-4" items={[{ title: '工作台' }]} />
      
      <Card title="快捷操作" className="mb-6">
        <Row gutter={[16, 16]}>
          {quickActions.map((action, index) => (
            <Col xs={24} sm={12} lg={6} key={index}>
              <Card 
                hoverable={!action.disabled} 
                className={`h-full ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={action.disabled ? undefined : action.onClick}
                styles={{ body: { padding: '16px' } }}
              >
                <div className="flex items-center">
                  <Avatar 
                    size={{ xs: 40, sm: 48 }} 
                    icon={action.icon} 
                    className={action.color} 
                  />
                  <div className="ml-3 sm:ml-4 flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base m-0 truncate">{action.title}</h3>
                    <p className="text-neutral-500 text-xs sm:text-sm m-0 line-clamp-2">{action.description}</p>
                    {action.tips && (
                      <p className="text-primary-600 text-xs mt-1 line-clamp-1">
                        💡 {action.tips}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[16, 16]}>
        {/* 左侧：通知中心 */}
        <Col xs={24} xl={10}>
          <Card 
            title="通知中心" 
            extra={<Button type="link" size="small">查看全部</Button>}
            className="h-full"
          >
            <Timeline
              items={mockNotifications.map((item, index) => ({
                key: index,
                color: item.color,
                children: (
                  <div>
                    <p className="text-sm sm:text-base mb-1">{item.text}</p>
                    <p className="text-xs text-neutral-400">{item.time}</p>
                  </div>
                )
              }))}
            />
          </Card>
        </Col>
        
        {/* 右侧：待办事项 */}
        <Col xs={24} xl={14}>
          <Card title="待办事项" extra={<Tag color="red">{todoExams.length}</Tag>}>
            {todoExams.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={todoExams}
                renderItem={item => (
                  <List.Item
                    className="px-0"
                    actions={[
                      <Button 
                        type="primary" 
                        size="small"
                        onClick={() => handleExamAction(item)}
                        className="text-xs sm:text-sm"
                      >
                        {getActionText(item.status)}
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          size={{ xs: 32, sm: 40 }}
                          icon={getActionIcon(item.status)}
                          style={{ backgroundColor: '#ff9800' }} 
                        />
                      }
                      title={
                        <div className="flex flex-col">
                          <a 
                            onClick={() => handleExamAction(item)}
                            className="font-semibold text-sm sm:text-base text-neutral-800 mb-1 hover:text-primary-600 line-clamp-1"
                          >
                            {item.name || '未命名考试'}
                          </a>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-neutral-500">
                            <Tag color="orange" className="text-xs">{item.status}</Tag>
                            <span className="truncate">{item.subject}</span>
                            <span className="hidden sm:inline">·</span>
                            <span className="truncate">{item.grade}</span>
                          </div>
                        </div>
                      }
                      description={
                        <div className="text-neutral-400 text-xs mt-2">
                          <div className="truncate">创建于: {item.createdAt}</div>
                          {item.status === '待阅卷' && (
                            <div className="text-primary-600 mt-1">• 等待上传答题卡</div>
                          )}
                          {item.status === '阅卷中' && item.tasks && item.tasks.total > 0 && (
                            <div className="text-green-600 mt-1">
                              • 进度: {item.tasks.completed}/{item.tasks.total}
                            </div>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div className="text-center py-8 text-neutral-500">
                <ClockCircleOutlined className="text-4xl mb-2" />
                <p>暂无待办事项</p>
                <Button type="primary" onClick={() => handleNavigate('create')}>
                  创建新考试
                </Button>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      <CreateExamModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
    </div>
  );
};

export default DashboardView;