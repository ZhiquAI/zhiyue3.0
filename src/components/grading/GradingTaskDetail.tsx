import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Descriptions,
  Button,
  Steps,
  Progress,
  Tag,
  Table,
  Tabs,
  Statistic,
  Space,
  Alert,
  Timeline,
  Modal,
  Upload,
  message as antMessage
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  FileTextOutlined,
  BarChartOutlined,
  TeamOutlined,
  InboxOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  DownloadOutlined,
  EyeOutlined
} from '@ant-design/icons';
import { message } from '../../utils/message';

const { Step } = Steps;
const { TabPane } = Tabs;
const { Dragger } = Upload;

interface GradingTask {
  id: string;
  name: string;
  subject: string;
  grade: string;
  status: '待配置' | '待阅卷' | '阅卷中' | '已完成';
  createdAt: string;
  totalStudents: number;
  completedStudents: number;
  description?: string;
  dueDate?: string;
}

interface GradingTaskDetailProps {
  taskId?: string;
  onClose?: () => void;
}

const GradingTaskDetail: React.FC<GradingTaskDetailProps> = ({ taskId, onClose }) => {
  const [task, setTask] = useState<GradingTask | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [processing, setProcessing] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  // 模拟任务数据
  useEffect(() => {
    // 模拟从API获取任务详情
    const mockTask: GradingTask = {
      id: taskId || 'task_001',
      name: '高二数学期中考试',
      subject: '数学',
      grade: '高二',
      status: '待阅卷',
      createdAt: '2025-08-25',
      totalStudents: 150,
      completedStudents: 0,
      description: '高二年级数学期中考试阅卷任务，包含选择题、填空题和解答题',
      dueDate: '2025-08-30'
    };
    setTask(mockTask);
  }, [taskId]);

  const handleStartGrading = async () => {
    if (!task) return;
    
    setProcessing(true);
    try {
      // 模拟开始阅卷的API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setTask(prev => prev ? { ...prev, status: '阅卷中' } : null);
      message.success('阅卷任务已开始');
    } catch (error) {
      message.error('启动阅卷失败');
    } finally {
      setProcessing(false);
    }
  };

  const handleUploadAnswerSheets = ({ fileList }: any) => {
    console.log('上传答题卡文件:', fileList);
    
    if (fileList.length > 0) {
      message.success(`成功上传 ${fileList.length} 个文件`);
      setUploadModalVisible(false);
      
      // 模拟上传后更新任务状态
      setTask(prev => prev ? { 
        ...prev, 
        status: '阅卷中',
        completedStudents: Math.floor(Math.random() * 50) + 10
      } : null);
    }
  };

  const getStatusSteps = () => {
    if (!task) return 0;
    
    const statusMap = {
      '待配置': 0,
      '待阅卷': 1,
      '阅卷中': 2,
      '已完成': 3
    };
    
    return statusMap[task.status];
  };

  const getProgressPercent = () => {
    if (!task || task.totalStudents === 0) return 0;
    return Math.round((task.completedStudents / task.totalStudents) * 100);
  };

  if (!task) {
    return <Card loading title="加载阅卷任务详情..." />;
  }

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* 页头 */}
        <Card className="mb-6">
          <Row justify="space-between" align="middle">
            <Col>
              <div>
                <h1 className="text-2xl font-bold mb-2">{task.name}</h1>
                <Space>
                  <Tag color="blue">{task.subject}</Tag>
                  <Tag color="green">{task.grade}</Tag>
                  <Tag color={
                    task.status === '已完成' ? 'success' :
                    task.status === '阅卷中' ? 'processing' :
                    task.status === '待阅卷' ? 'warning' : 'default'
                  }>
                    {task.status}
                  </Tag>
                </Space>
              </div>
            </Col>
            <Col>
              <Space>
                {task.status === '待阅卷' && (
                  <>
                    <Button 
                      type="primary"
                      icon={<InboxOutlined />}
                      onClick={() => setUploadModalVisible(true)}
                    >
                      上传答题卡
                    </Button>
                    <Button
                      type="primary"
                      icon={<PlayCircleOutlined />}
                      loading={processing}
                      onClick={handleStartGrading}
                      disabled={task.completedStudents === 0}
                    >
                      开始阅卷
                    </Button>
                  </>
                )}
                {task.status === '阅卷中' && (
                  <Button
                    icon={<PauseCircleOutlined />}
                    onClick={() => setTask(prev => prev ? { ...prev, status: '待阅卷' } : null)}
                  >
                    暂停阅卷
                  </Button>
                )}
                {onClose && (
                  <Button onClick={onClose}>
                    返回列表
                  </Button>
                )}
              </Space>
            </Col>
          </Row>
        </Card>

        {/* 进度概览 */}
        <Card className="mb-6">
          <Row gutter={24}>
            <Col span={12}>
              <Steps current={getStatusSteps()} size="small">
                <Step title="任务创建" />
                <Step title="准备阅卷" />
                <Step title="正在阅卷" />
                <Step title="阅卷完成" />
              </Steps>
            </Col>
            <Col span={12}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic title="总学生数" value={task.totalStudents} />
                </Col>
                <Col span={8}>
                  <Statistic title="已完成" value={task.completedStudents} />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title="完成率" 
                    value={getProgressPercent()} 
                    suffix="%" 
                  />
                </Col>
              </Row>
              <Progress 
                percent={getProgressPercent()} 
                status={task.status === '已完成' ? 'success' : 'active'}
                className="mt-4"
              />
            </Col>
          </Row>
        </Card>

        {/* 详细信息标签页 */}
        <Card>
          <Tabs activeKey={activeTab} onChange={setActiveTab}>
            <TabPane tab="任务概览" key="overview">
              <Row gutter={24}>
                <Col span={16}>
                  <Descriptions title="基本信息" bordered>
                    <Descriptions.Item label="任务名称">{task.name}</Descriptions.Item>
                    <Descriptions.Item label="科目">{task.subject}</Descriptions.Item>
                    <Descriptions.Item label="年级">{task.grade}</Descriptions.Item>
                    <Descriptions.Item label="创建时间">{task.createdAt}</Descriptions.Item>
                    <Descriptions.Item label="截止时间">{task.dueDate || '未设置'}</Descriptions.Item>
                    <Descriptions.Item label="任务描述" span={3}>
                      {task.description}
                    </Descriptions.Item>
                  </Descriptions>
                </Col>
                <Col span={8}>
                  <Card title="快速操作" size="small">
                    <Space direction="vertical" style={{ width: '100%' }}>
                      <Button 
                        block 
                        icon={<InboxOutlined />}
                        onClick={() => setUploadModalVisible(true)}
                      >
                        上传答题卡
                      </Button>
                      <Button block icon={<FileTextOutlined />}>
                        查看模板
                      </Button>
                      <Button block icon={<TeamOutlined />}>
                        学生名单
                      </Button>
                      <Button block icon={<BarChartOutlined />}>
                        阅卷统计
                      </Button>
                    </Space>
                  </Card>
                </Col>
              </Row>
            </TabPane>

            <TabPane tab="处理进度" key="progress">
              <Timeline>
                <Timeline.Item 
                  color="green" 
                  dot={<CheckCircleOutlined />}
                >
                  <p>任务创建完成</p>
                  <p className="text-gray-500">2025-08-25 10:00</p>
                </Timeline.Item>
                <Timeline.Item 
                  color={task.completedStudents > 0 ? "green" : "gray"}
                  dot={task.completedStudents > 0 ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
                >
                  <p>答题卡上传</p>
                  <p className="text-gray-500">
                    {task.completedStudents > 0 ? `已上传 ${task.completedStudents} 份` : '等待上传'}
                  </p>
                </Timeline.Item>
                <Timeline.Item 
                  color={task.status === '阅卷中' || task.status === '已完成' ? "blue" : "gray"}
                >
                  <p>智能阅卷处理</p>
                  <p className="text-gray-500">
                    {task.status === '阅卷中' ? '正在处理中...' : 
                     task.status === '已完成' ? '处理完成' : '等待开始'}
                  </p>
                </Timeline.Item>
                <Timeline.Item 
                  color={task.status === '已完成' ? "green" : "gray"}
                >
                  <p>阅卷完成</p>
                  <p className="text-gray-500">
                    {task.status === '已完成' ? '所有答题卡已完成阅卷' : '等待完成'}
                  </p>
                </Timeline.Item>
              </Timeline>
            </TabPane>

            <TabPane tab="学生列表" key="students">
              <Table
                dataSource={[
                  { key: 1, name: '张三', studentId: '202301001', status: '已提交', score: 85 },
                  { key: 2, name: '李四', studentId: '202301002', status: '已提交', score: 78 },
                  { key: 3, name: '王五', studentId: '202301003', status: '未提交', score: null },
                ]}
                columns={[
                  { title: '学生姓名', dataIndex: 'name', key: 'name' },
                  { title: '学号', dataIndex: 'studentId', key: 'studentId' },
                  { 
                    title: '状态', 
                    dataIndex: 'status', 
                    key: 'status',
                    render: (status: string) => (
                      <Tag color={status === '已提交' ? 'green' : 'orange'}>
                        {status}
                      </Tag>
                    )
                  },
                  { 
                    title: '分数', 
                    dataIndex: 'score', 
                    key: 'score',
                    render: (score: number | null) => score !== null ? score : '-'
                  },
                  {
                    title: '操作',
                    key: 'action',
                    render: () => (
                      <Space>
                        <Button size="small" icon={<EyeOutlined />}>查看</Button>
                        <Button size="small" icon={<DownloadOutlined />}>下载</Button>
                      </Space>
                    )
                  }
                ]}
                size="small"
              />
            </TabPane>
          </Tabs>
        </Card>

        {/* 上传答题卡Modal */}
        <Modal
          title="上传答题卡"
          open={uploadModalVisible}
          onCancel={() => setUploadModalVisible(false)}
          footer={null}
          width={600}
        >
          <Alert
            message="上传说明"
            description="支持批量上传答题卡图片或PDF文件，系统将自动进行智能识别和评分。"
            type="info"
            showIcon
            className="mb-4"
          />
          
          <Dragger
            name="files"
            multiple
            accept=".jpg,.jpeg,.png,.pdf"
            onChange={handleUploadAnswerSheets}
            onDrop={e => {
              console.log('Dropped files', e.dataTransfer.files);
            }}
          >
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
            <p className="ant-upload-hint">
              支持单个或批量上传，支持 JPG、PNG、PDF 格式
            </p>
          </Dragger>
        </Modal>
      </div>
    </div>
  );
};

export default GradingTaskDetail;