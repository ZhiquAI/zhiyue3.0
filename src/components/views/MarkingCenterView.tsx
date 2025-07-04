import React from 'react';
import { Card, Table, Button, Tag, Progress, Tooltip, Breadcrumb, message, Empty } from 'antd';
import { EditOutlined, ClockCircleOutlined, CheckCircleOutlined, UploadOutlined } from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import { Exam } from '../../types/exam';

const MarkingCenterView: React.FC = () => {
  const { exams, setSubViewInfo } = useAppContext();

  const markingExams = exams.filter(e => 
    e.status === '阅卷中' || e.status === '待阅卷'
  );

  const handleEnterMarking = (exam: Exam) => {
    if (exam.status === '待阅卷') {
      message.info('请先上传答题卡后再开始阅卷');
      // 跳转到答题卡上传界面
      setSubViewInfo({ view: 'upload', exam });
      return;
    }
    setSubViewInfo({ view: 'marking', exam });
  };

  const handleUploadAnswerSheets = (exam: Exam) => {
    // 跳转到答题卡上传界面
    setSubViewInfo({ view: 'upload', exam });
  };

  const columns = [
    {
      title: '考试名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: Exam) => (
        <div>
          <div className="font-medium text-gray-800">{text}</div>
          <div className="text-sm text-gray-500">
            {record.subject} · {record.grade} · {record.createdAt}
          </div>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          '待阅卷': { color: 'geekblue', icon: <ClockCircleOutlined /> },
          '阅卷中': { color: 'processing', icon: <EditOutlined /> }
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        
        return (
          <Tag color={config.color} icon={config.icon}>
            {status}
          </Tag>
        );
      }
    },
    {
      title: '阅卷进度',
      key: 'progress',
      render: (_: any, record: Exam) => {
        if (record.status === '待阅卷') {
          return (
            <div className="text-center">
              <div className="text-sm text-gray-500 mb-1">等待上传答题卡</div>
              <Progress percent={0} size="small" />
            </div>
          );
        }
        
        const percent = record.tasks.total > 0 
          ? Math.round((record.tasks.completed / record.tasks.total) * 100) 
          : 0;
          
        return (
          <Tooltip title={`${record.tasks.completed} / ${record.tasks.total}`}>
            <Progress 
              percent={percent}
              size="small"
              status={record.tasks.hasError ? 'exception' : 'active'}
            />
          </Tooltip>
        );
      }
    },
    {
      title: '异常答卷',
      key: 'errors',
      render: (_: any, record: Exam) => {
        if (record.status === '待阅卷') {
          return <Tag color="default">-</Tag>;
        }
        
        return record.tasks.hasError ? (
          <Button 
            type="link" 
            danger 
            onClick={() => message.info('正在打开异常处理工作台...')}
          >
            {record.tasks.errorCount} 份
          </Button>
        ) : (
          <Tag color="success">无</Tag>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      render: (_: any, record: Exam) => {
        if (record.status === '待阅卷') {
          return (
            <div className="space-x-2">
              <Button 
                type="primary"
                icon={<UploadOutlined />}
                onClick={() => handleUploadAnswerSheets(record)}
              >
                上传答题卡
              </Button>
              <Button 
                type="default"
                disabled
              >
                进入阅卷
              </Button>
            </div>
          );
        }
        
        return (
          <Button 
            type="primary" 
            icon={<EditOutlined />}
            onClick={() => handleEnterMarking(record)}
          >
            进入阅卷
          </Button>
        );
      }
    }
  ];

  return (
    <div>
      <Breadcrumb className="mb-4" items={[{ title: '阅卷中心' }]} />
      
      <Card 
        title={
          <div className="flex items-center justify-between">
            <span>阅卷任务列表</span>
            <Tag color="blue">{markingExams.length} 个任务</Tag>
          </div>
        }
      >
        {markingExams.length > 0 ? (
          <Table 
            columns={columns} 
            dataSource={markingExams} 
            rowKey="id"
            pagination={false}
          />
        ) : (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div className="text-center">
                <p className="text-gray-500 mb-2">暂无阅卷任务</p>
                <p className="text-sm text-gray-400">
                  请先在考试管理中配置试卷，完成配置后考试将出现在这里
                </p>
              </div>
            }
          />
        )}
      </Card>

      {/* 阅卷流程说明 */}
      <Card title="阅卷流程说明" className="mt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-blue-600 font-bold text-lg">1</span>
            </div>
            <h4 className="font-medium text-gray-800 mb-2">配置试卷</h4>
            <p className="text-sm text-gray-600">
              在考试管理中上传试卷文件，使用AI智能识别生成评分标准
            </p>
          </div>
          
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-green-600 font-bold text-lg">2</span>
            </div>
            <h4 className="font-medium text-gray-800 mb-2">上传答题卡</h4>
            <p className="text-sm text-gray-600">
              批量上传学生答题卡，系统自动进行OCR识别和预处理
            </p>
          </div>
          
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-purple-600 font-bold text-lg">3</span>
            </div>
            <h4 className="font-medium text-gray-800 mb-2">AI辅助阅卷</h4>
            <p className="text-sm text-gray-600">
              AI自动评分主观题，教师复核确认，确保评分准确性
            </p>
          </div>

          <div className="text-center p-4 bg-orange-50 rounded-lg">
            <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-orange-600 font-bold text-lg">4</span>
            </div>
            <h4 className="font-medium text-gray-800 mb-2">生成报告</h4>
            <p className="text-sm text-gray-600">
              自动生成详细的分析报告，为教学决策提供数据支撑
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default MarkingCenterView;