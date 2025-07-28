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
import { Exam, ExamStatus } from '../../types/exam';

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
      // 开始阅卷 - 如果有待阅卷的考试，提示需要先上传答题卡
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
      const viewMap: Partial<Record<ExamStatus, string>> = {
        '待配置': 'upload',
        '待阅卷': 'upload', // 待阅卷状态跳转到上传答题卡工作台
        '阅卷中': 'marking'
      };
      setSubViewInfo({ view: viewMap[exam.status] || 'upload', exam });
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
        return '上传答题卡';
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
        <Row gutter={[16, 16]}>
          {quickActions.map((action, index) => (
            <Col xs={24} sm={12} lg={8} key={index}>
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
                    <p className="text-gray-500 text-xs sm:text-sm m-0 line-clamp-2">{action.description}</p>
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
                    <p className="text-xs text-gray-400">{item.time}</p>
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
                        onClick={() => handleNavigate('handle', item)}
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
                            onClick={() => handleNavigate('handle', item)}
                            className="font-semibold text-sm sm:text-base text-gray-800 mb-1 hover:text-blue-600 line-clamp-1"
                          >
                            {item.name || '未命名考试'}
                          </a>
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2 text-xs sm:text-sm text-gray-500">
                            <Tag color="orange" className="text-xs">{item.status}</Tag>
                            <span className="truncate">{item.subject}</span>
                            <span className="hidden sm:inline">·</span>
                            <span className="truncate">{item.grade}</span>
                          </div>
                        </div>
                      }
                      description={
                        <div className="text-gray-400 text-xs mt-2">
                          <div className="truncate">创建于: {item.createdAt}</div>
                          {item.status === '待阅卷' && (
                            <div className="text-blue-600 mt-1">• 等待上传答题卡</div>
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
      </Row>

      <CreateExamModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
    </div>
  );
};

export default DashboardView;