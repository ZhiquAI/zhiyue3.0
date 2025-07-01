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

  const handleNavigate = (type: string, exam?: any) => {
    if (type === 'create') {
      setCreateModalVisible(true);
    } else if (type === 'startMarking') {
      // 开始阅卷 - 如果有待阅卷的考试，进入第一个
      if (markingExams.length > 0) {
        const firstMarkingExam = markingExams[0];
        if (firstMarkingExam.status === '待阅卷') {
          // 如果是待阅卷状态，提示需要先上传答题卡
          setCurrentView('markingCenter');
        } else {
          setSubViewInfo({ view: 'marking', exam: firstMarkingExam });
        }
      } else {
        // 如果没有待阅卷的考试，跳转到阅卷中心
        setCurrentView('markingCenter');
      }
    } else if (type === 'viewAnalysis') {
      // 查看分析 - 如果有已完成的考试，进入第一个的分析
      if (completedExams.length > 0) {
        const firstCompletedExam = completedExams[0];
        setSubViewInfo({ view: 'analysis', exam: firstCompletedExam });
      } else {
        // 如果没有已完成的考试，跳转到数据分析页面
        setCurrentView('dataAnalysis');
      }
    } else if (exam) {
      const viewMap = {
        '待配置': 'configure',
        '待阅卷': 'configure', // 待阅卷状态也可以回到配置页面上传答题卡
        '阅卷中': 'marking'
      };
      setSubViewInfo({ view: viewMap[exam.status] || 'configure', exam });
    }
  };

  const getActionIcon = (status: string) => {
    switch (status) {
      case '待配置':
        return <FileTextOutlined className="text-orange-600" />;
      case '待阅卷':
        return <UploadOutlined className="text-blue-600" />;
      case '阅卷中':
        return <EditOutlined className="text-green-600" />;
      default:
        return <ClockCircleOutlined className="text-gray-600" />;
    }
  };

  const getActionText = (status: string) => {
    switch (status) {
      case '待配置':
        return '配置试卷';
      case '待阅卷':
        return '上传答题卡';
      case '阅卷中':
        return '继续阅卷';
      default:
        return '查看详情';
    }
  };

  const quickActions = [
    {
      title: '创建考试',
      description: '上传试卷，开启智能评阅',
      icon: <UploadOutlined />,
      color: 'bg-blue-100 text-blue-600',
      onClick: () => handleNavigate('create')
    },
    {
      title: '开始阅卷',
      description: `处理 ${markingExams.length} 个待办阅卷任务`,
      icon: <CheckCircleOutlined />,
      color: 'bg-green-100 text-green-600',
      onClick: () => handleNavigate('startMarking'),
      disabled: markingExams.length === 0
    },
    {
      title: '查看分析',
      description: `查看 ${completedExams.length} 个已完成考试的分析报告`,
      icon: <BarChartOutlined />,
      color: 'bg-purple-100 text-purple-600',
      onClick: () => handleNavigate('viewAnalysis'),
      disabled: completedExams.length === 0
    }
  ];

  return (
    <div>
      <Breadcrumb className="mb-4" items={[{ title: '工作台' }]} />
      
      <Card title="快捷操作" className="mb-6">
        <Row gutter={[24, 24]}>
          {quickActions.map((action, index) => (
            <Col xs={24} md={8} key={index}>
              <Card 
                hoverable={!action.disabled} 
                className={`h-full ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={action.disabled ? undefined : action.onClick}
              >
                <div className="flex items-center">
                  <Avatar size={48} icon={action.icon} className={action.color} />
                  <div className="ml-4">
                    <h3 className="font-semibold text-base m-0">{action.title}</h3>
                    <p className="text-gray-500 text-sm m-0">{action.description}</p>
                    {action.disabled && (
                      <p className="text-gray-400 text-xs mt-1">暂无可用任务</p>
                    )}
                  </div>
                </div>
              </Card>
            </Col>
          ))}
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card title="待办事项" extra={<Tag color="red">{todoExams.length}</Tag>}>
            {todoExams.length > 0 ? (
              <List
                itemLayout="horizontal"
                dataSource={todoExams}
                renderItem={item => (
                  <List.Item
                    actions={[
                      <Button 
                        type="primary" 
                        onClick={() => handleNavigate('handle', item)}
                      >
                        {getActionText(item.status)}
                      </Button>
                    ]}
                  >
                    <List.Item.Meta
                      avatar={
                        <Avatar 
                          icon={getActionIcon(item.status)}
                          style={{ backgroundColor: '#ff9800' }} 
                        />
                      }
                      title={
                        <div className="flex flex-col">
                          <a 
                            onClick={() => handleNavigate('handle', item)}
                            className="font-semibold text-base text-gray-800 mb-1 hover:text-blue-600"
                          >
                            {item.name || '未命名考试'}
                          </a>
                          <div className="flex items-center gap-2 text-sm text-gray-500">
                            <Tag color="orange" size="small">{item.status}</Tag>
                            <span>{item.subject}</span>
                            <span>·</span>
                            <span>{item.grade}</span>
                          </div>
                        </div>
                      }
                      description={
                        <div className="text-gray-400 text-xs mt-2">
                          创建于: {item.createdAt}
                          {item.status === '待阅卷' && (
                            <span className="ml-2 text-blue-600">• 试卷已配置，等待上传答题卡</span>
                          )}
                          {item.status === '阅卷中' && item.tasks.total > 0 && (
                            <span className="ml-2 text-green-600">
                              • 进度: {item.tasks.completed}/{item.tasks.total}
                            </span>
                          )}
                        </div>
                      }
                    />
                  </List.Item>
                )}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ClockCircleOutlined className="text-4xl mb-2" />
                <p>暂无待办事项</p>
                <Button type="primary" onClick={() => handleNavigate('create')}>
                  创建新考试
                </Button>
              </div>
            )}
          </Card>
        </Col>
        
        <Col xs={24} lg={10}>
          <Card title="通知中心" extra={<Button type="link">查看全部</Button>}>
            <Timeline>
              {mockNotifications.map((item, index) => (
                <Timeline.Item key={index} color={item.color}>
                  <p>{item.text}</p>
                  <p className="text-xs text-gray-400">{item.time}</p>
                </Timeline.Item>
              ))}
            </Timeline>
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