import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Tag, Select, DatePicker, Button, Alert } from 'antd';
import { BarChartOutlined, RiseOutlined, UserOutlined, FileTextOutlined, ClockCircleOutlined, CheckCircleOutlined, DownloadOutlined } from '@ant-design/icons';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

// 模拟数据
const mockGradingData = {
  overview: {
    totalPapers: 1250,
    completedPapers: 856,
    inProgressPapers: 234,
    pendingPapers: 160,
    averageScore: 78.5,
    averageGradingTime: 12.3, // 分钟
    qualityScore: 92.1
  },
  graderPerformance: [
    { name: '张老师', completed: 145, avgTime: 10.2, quality: 95.2, efficiency: 'high' },
    { name: '李老师', completed: 132, avgTime: 11.8, quality: 93.8, efficiency: 'high' },
    { name: '王老师', completed: 128, avgTime: 13.5, quality: 91.5, efficiency: 'medium' },
    { name: '刘老师', completed: 98, avgTime: 15.2, quality: 89.2, efficiency: 'medium' },
    { name: '陈老师', completed: 87, avgTime: 18.1, quality: 87.3, efficiency: 'low' }
  ],
  dailyProgress: [
    { date: '2024-01-15', completed: 45, target: 50, efficiency: 90 },
    { date: '2024-01-16', completed: 52, target: 50, efficiency: 104 },
    { date: '2024-01-17', completed: 48, target: 50, efficiency: 96 },
    { date: '2024-01-18', completed: 55, target: 50, efficiency: 110 },
    { date: '2024-01-19', completed: 42, target: 50, efficiency: 84 },
    { date: '2024-01-20', completed: 58, target: 50, efficiency: 116 },
    { date: '2024-01-21', completed: 51, target: 50, efficiency: 102 }
  ],
  scoreDistribution: [
    { range: '0-60', count: 125, percentage: 10.0 },
    { range: '60-70', count: 188, percentage: 15.0 },
    { range: '70-80', count: 375, percentage: 30.0 },
    { range: '80-90', count: 438, percentage: 35.0 },
    { range: '90-100', count: 125, percentage: 10.0 }
  ],
  qualityMetrics: {
    consistency: 94.2,
    accuracy: 91.8,
    fairness: 93.5,
    timeliness: 89.7
  },
  alerts: [
    { type: 'warning', message: '陈老师的阅卷速度较慢，建议关注', time: '2小时前' },
    { type: 'info', message: '今日阅卷进度已达成目标的102%', time: '30分钟前' },
    { type: 'error', message: '发现3份试卷评分差异较大，需要复核', time: '1小时前' }
  ]
};



interface GradingAnalyticsProps {
  examId?: string;
}

const GradingAnalytics: React.FC<GradingAnalyticsProps> = () => {
  const [timeRange, setTimeRange] = useState<'week' | 'month' | 'quarter'>('week');
  const [selectedGrader, setSelectedGrader] = useState<string>('all');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null] | null>(null);
  const [loading, setLoading] = useState(false);

  // 模拟数据加载
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [timeRange, selectedGrader, dateRange]);

  const handleExportReport = () => {
    // 模拟导出报告
    console.log('导出阅卷分析报告');
  };

  const graderColumns = [
    {
      title: '阅卷员',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => (
        <div className="flex items-center gap-2">
          <UserOutlined className="text-blue-500" />
          <span className="font-medium">{name}</span>
        </div>
      )
    },
    {
      title: '已完成',
      dataIndex: 'completed',
      key: 'completed',
      render: (completed: number) => (
        <div className="text-center">
          <div className="font-semibold text-green-600">{completed}</div>
          <div className="text-xs text-gray-500">份试卷</div>
        </div>
      )
    },
    {
      title: '平均用时',
      dataIndex: 'avgTime',
      key: 'avgTime',
      render: (time: number) => (
        <div className="text-center">
          <div className="font-semibold">{time}</div>
          <div className="text-xs text-gray-500">分钟/份</div>
        </div>
      )
    },
    {
      title: '质量评分',
      dataIndex: 'quality',
      key: 'quality',
      render: (quality: number) => (
        <div className="text-center">
          <div className={`font-semibold ${
            quality >= 95 ? 'text-green-600' :
            quality >= 90 ? 'text-blue-600' :
            quality >= 85 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {quality}%
          </div>
          <Progress 
            percent={quality} 
            size="small" 
            showInfo={false}
            strokeColor={
              quality >= 95 ? '#10b981' :
              quality >= 90 ? '#3b82f6' :
              quality >= 85 ? '#f59e0b' :
              '#ef4444'
            }
          />
        </div>
      )
    },
    {
      title: '效率等级',
      dataIndex: 'efficiency',
      key: 'efficiency',
      render: (efficiency: string) => {
        const config = {
          high: { color: 'green', text: '高效' },
          medium: { color: 'blue', text: '中等' },
          low: { color: 'red', text: '较低' }
        };
        return <Tag color={config[efficiency as keyof typeof config].color}>{config[efficiency as keyof typeof config].text}</Tag>;
      }
    }
  ];

  return (
    <div className="space-y-6">
      {/* 控制面板 */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BarChartOutlined className="text-blue-600 text-xl" />
            <h2 className="text-xl font-semibold">阅卷数据分析</h2>
          </div>
          <div className="flex items-center gap-3">
            <Select
              value={timeRange}
              onChange={setTimeRange}
              style={{ width: 120 }}
            >
              <Option value="week">近一周</Option>
              <Option value="month">近一月</Option>
              <Option value="quarter">近三月</Option>
            </Select>
            <Select
              value={selectedGrader}
              onChange={setSelectedGrader}
              style={{ width: 150 }}
              placeholder="选择阅卷员"
            >
              <Option value="all">全部阅卷员</Option>
              {mockGradingData.graderPerformance.map(grader => (
                <Option key={grader.name} value={grader.name}>{grader.name}</Option>
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
          </div>
        </div>

        {/* 实时警报 */}
        {mockGradingData.alerts.length > 0 && (
          <div className="mb-4">
            {mockGradingData.alerts.map((alert, index) => (
              <Alert
                key={index}
                message={alert.message}
                description={alert.time}
                type={alert.type as 'warning' | 'info' | 'error'}
                showIcon
                className="mb-2"
                closable
              />
            ))}
          </div>
        )}
      </Card>

      {/* 概览统计 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总试卷数"
              value={mockGradingData.overview.totalPapers}
              prefix={<FileTextOutlined className="text-blue-500" />}
              suffix="份"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="已完成"
              value={mockGradingData.overview.completedPapers}
              prefix={<CheckCircleOutlined className="text-green-500" />}
              suffix="份"
            />
            <Progress 
              percent={Math.round((mockGradingData.overview.completedPapers / mockGradingData.overview.totalPapers) * 100)}
              size="small"
              className="mt-2"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均分数"
              value={mockGradingData.overview.averageScore}
              prefix={<RiseOutlined className="text-orange-500" />}
              precision={1}
              suffix="分"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="平均用时"
              value={mockGradingData.overview.averageGradingTime}
              prefix={<ClockCircleOutlined className="text-purple-500" />}
              precision={1}
              suffix="分钟"
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[16, 16]}>
        {/* 每日进度趋势 */}
        <Col xs={24} lg={12}>
          <Card title="每日阅卷进度" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={mockGradingData.dailyProgress}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="completed" stroke="#3b82f6" name="已完成" strokeWidth={2} />
                <Line type="monotone" dataKey="target" stroke="#ef4444" name="目标" strokeWidth={2} strokeDasharray="5 5" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* 分数分布 */}
        <Col xs={24} lg={12}>
          <Card title="分数分布" loading={loading}>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={mockGradingData.scoreDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <RechartsTooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* 质量指标 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={8}>
          <Card title="质量指标" loading={loading}>
            <div className="space-y-4">
              {Object.entries(mockGradingData.qualityMetrics).map(([key, value]) => {
                const labels = {
                  consistency: '一致性',
                  accuracy: '准确性', 
                  fairness: '公平性',
                  timeliness: '及时性'
                };
                return (
                  <div key={key}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm text-gray-600">{labels[key as keyof typeof labels]}</span>
                      <span className="font-semibold">{value}%</span>
                    </div>
                    <Progress 
                      percent={value} 
                      size="small" 
                      strokeColor={
                        value >= 95 ? '#10b981' :
                        value >= 90 ? '#3b82f6' :
                        value >= 85 ? '#f59e0b' :
                        '#ef4444'
                      }
                    />
                  </div>
                );
              })}
            </div>
          </Card>
        </Col>

        {/* 阅卷员效率对比 */}
        <Col xs={24} lg={16}>
          <Card title="阅卷员绩效分析" loading={loading}>
            <Table
              columns={graderColumns}
              dataSource={mockGradingData.graderPerformance}
              pagination={false}
              size="small"
              rowKey="name"
            />
          </Card>
        </Col>
      </Row>

      {/* 效率分析 */}
      <Card title="效率分析" loading={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <div className="text-center">
              <h4 className="mb-4">阅卷员效率分布</h4>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={[
                      { name: '高效', value: 2, color: '#10b981' },
                      { name: '中等', value: 2, color: '#3b82f6' },
                      { name: '较低', value: 1, color: '#ef4444' }
                    ]}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {[
                      { name: '高效', value: 2, color: '#10b981' },
                      { name: '中等', value: 2, color: '#3b82f6' },
                      { name: '较低', value: 1, color: '#ef4444' }
                    ].map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Col>
          <Col xs={24} lg={12}>
            <div className="space-y-4">
              <h4>效率提升建议</h4>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg border-l-4 border-green-400">
                  <div className="font-medium text-green-800">优秀表现</div>
                  <div className="text-sm text-green-600">张老师和李老师保持高效率和高质量，可作为标杆</div>
                </div>
                <div className="p-3 bg-yellow-50 rounded-lg border-l-4 border-yellow-400">
                  <div className="font-medium text-yellow-800">需要关注</div>
                  <div className="text-sm text-yellow-600">王老师和刘老师效率中等，建议提供培训支持</div>
                </div>
                <div className="p-3 bg-red-50 rounded-lg border-l-4 border-red-400">
                  <div className="font-medium text-red-800">重点改进</div>
                  <div className="text-sm text-red-600">陈老师需要重点关注，建议一对一指导</div>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default GradingAnalytics;