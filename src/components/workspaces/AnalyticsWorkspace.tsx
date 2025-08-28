import React, { useState } from 'react';
import { Card, Tabs, Button, Select, DatePicker, Space } from 'antd';
import { BarChartOutlined, ExclamationCircleOutlined, RiseOutlined, DownloadOutlined } from '@ant-design/icons';
import GradingAnalytics from '../analytics/GradingAnalytics';
import QualityMonitor from '../analytics/QualityMonitor';
import dayjs from 'dayjs';


const { RangePicker } = DatePicker;
const { Option } = Select;

interface AnalyticsWorkspaceProps {
  examId?: string;
}

const AnalyticsWorkspace: React.FC<AnalyticsWorkspaceProps> = ({ examId }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedExam, setSelectedExam] = useState(examId || 'all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);

  // 模拟考试列表
  const examList = [
    { id: 'all', name: '全部考试' },
    { id: '2024001', name: '2024年春季期中考试' },
    { id: '2024002', name: '2024年春季期末考试' },
    { id: '2024003', name: '2024年数学竞赛' }
  ];

  const handleExportReport = () => {
    console.log('导出综合分析报告', { exam: selectedExam, dateRange, tab: activeTab });
  };

  const tabItems = [
    {
      key: 'overview',
      label: (
        <span className="flex items-center gap-2">
          <BarChartOutlined />
          数据分析
        </span>
      ),
      children: <GradingAnalytics examId={selectedExam === 'all' ? undefined : selectedExam} />
    },
    {
      key: 'quality',
      label: (
        <span className="flex items-center gap-2">
          <ExclamationCircleOutlined />
          质量监控
        </span>
      ),
      children: <QualityMonitor examId={selectedExam === 'all' ? undefined : selectedExam} />
    },
    {
      key: 'trends',
      label: (
        <span className="flex items-center gap-2">
          <RiseOutlined />
          趋势分析
        </span>
      ),
      children: (
        <div className="space-y-6">
          <Card title="长期趋势分析">
            <div className="text-center py-12 text-gray-500">
              <RiseOutlined className="text-4xl mb-4" />
              <div>长期趋势分析功能开发中...</div>
              <div className="text-sm mt-2">将提供历史数据对比、趋势预测等功能</div>
            </div>
          </Card>
        </div>
      )
    }
  ];

  return (
    <div className="h-full flex flex-col">
      {/* 头部控制面板 */}
      <Card className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChartOutlined className="text-blue-600 text-2xl" />
            <div>
              <h1 className="text-2xl font-bold">阅卷分析中心</h1>
              <p className="text-gray-600 text-sm">全面的阅卷数据分析和质量监控</p>
            </div>
          </div>
          
          <Space size="middle">
            <Select
              value={selectedExam}
              onChange={setSelectedExam}
              style={{ width: 200 }}
              placeholder="选择考试"
            >
              {examList.map(exam => (
                <Option key={exam.id} value={exam.id}>{exam.name}</Option>
              ))}
            </Select>
            
            <RangePicker
              value={dateRange}
              onChange={(dates) => setDateRange(dates)}
              placeholder={['开始日期', '结束日期']}
            />
            
            <Button 
              type="primary" 
              icon={<DownloadOutlined />}
              onClick={handleExportReport}
            >
              导出报告
            </Button>
          </Space>
        </div>
      </Card>

      {/* 主要内容区域 */}
      <div className="flex-1">
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={tabItems}
          size="large"
          className="h-full"
        />
      </div>
    </div>
  );
};

export default AnalyticsWorkspace;