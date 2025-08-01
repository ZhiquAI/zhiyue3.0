import React, { useState } from 'react';
import { Card, Tabs, Breadcrumb, Button, Space } from 'antd';
import { ArrowLeftOutlined, UserOutlined, FileTextOutlined, BarChartOutlined, UploadOutlined } from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import StudentManagement from '../../pages/StudentManagement';
import { Exam } from '../../types/exam';

interface ExamDetailViewProps {
  exam: Exam;
  onBack?: () => void;
}

const ExamDetailView: React.FC<ExamDetailViewProps> = ({ exam, onBack }) => {
  const { setSubViewInfo } = useAppContext();
  const [activeTab, setActiveTab] = useState('overview');

  const handleNavigateToWorkspace = (workspaceType: string) => {
    setSubViewInfo({
      view: workspaceType,
      exam,
      source: 'examManagement'
    });
  };

  const getStatusActions = () => {
    switch (exam.status) {
      case '待配置':
      case '待阅卷':
        return (
          <Button 
            type="primary" 
            icon={<UploadOutlined />}
            onClick={() => handleNavigateToWorkspace('upload')}
          >
            上传答题卡
          </Button>
        );
      case '阅卷中':
        return (
          <Button 
            type="primary"
            onClick={() => handleNavigateToWorkspace('marking')}
          >
            进入阅卷
          </Button>
        );
      case '已完成':
        return (
          <Button 
            type="primary" 
            icon={<BarChartOutlined />}
            onClick={() => handleNavigateToWorkspace('analysis')}
          >
            查看分析报告
          </Button>
        );
      default:
        return null;
    }
  };

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span>
          <FileTextOutlined />
          考试概览
        </span>
      ),
      children: (
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card title="基本信息" size="small">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">考试名称:</span>
                  <span className="font-medium">{exam.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">科目:</span>
                  <span>{exam.subject}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">年级:</span>
                  <span>{exam.grade}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">创建时间:</span>
                  <span>{exam.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">状态:</span>
                  <span className={`px-2 py-1 rounded text-sm ${
                    exam.status === '已完成' ? 'bg-green-100 text-green-800' :
                    exam.status === '阅卷中' ? 'bg-blue-100 text-blue-800' :
                    exam.status === '待阅卷' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {exam.status}
                  </span>
                </div>
              </div>
            </Card>

            <Card title="统计信息" size="small">
              <div className="space-y-3">
                {exam.status === '阅卷中' && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">阅卷进度:</span>
                    <span>{exam.tasks.completed}/{exam.tasks.total}</span>
                  </div>
                )}
                {exam.status === '已完成' && exam.avgScore && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">平均分:</span>
                    <span className="font-medium">{exam.avgScore}分</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-600">任务总数:</span>
                  <span>{exam.tasks.total}个</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="mt-6 flex justify-center">
            {getStatusActions()}
          </div>
        </div>
      ),
    },
    {
      key: 'students',
      label: (
        <span>
          <UserOutlined />
          学生管理
        </span>
      ),
      children: (
        <div className="p-4">
          <StudentManagement examId={exam.id} />
        </div>
      ),
    },
  ];

  return (
    <div>
      <Breadcrumb 
        className="mb-4" 
        items={[
          { title: '考试管理' },
          { title: exam.name }
        ]} 
      />
      
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <Button 
              icon={<ArrowLeftOutlined />} 
              onClick={onBack}
            >
              返回
            </Button>
            <h2 className="text-xl font-semibold mb-0">{exam.name}</h2>
          </div>
          <Space>
            {getStatusActions()}
          </Space>
        </div>

        <Tabs 
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>
    </div>
  );
};

export default ExamDetailView;