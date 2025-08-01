import React, { useState, useMemo } from 'react';
import { Card, Form, Select, List, Button, Breadcrumb, Row, Col, Statistic, Tabs, DatePicker, Space, Tag, Empty, Spin } from 'antd';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { ArrowUpOutlined, ArrowDownOutlined, UserOutlined, BookOutlined, BarChartOutlined, PieChartOutlined, FundOutlined, TeamOutlined, DashboardOutlined } from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import { mockScoreTrendData } from '../../data/mockData';
import { Exam } from '../../types/exam';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
// 移除废弃的TabPane导入

const DataAnalysisView: React.FC = () => {
  const { exams, setSubViewInfo } = useAppContext();
  const [selectedSubject, setSelectedSubject] = useState('history');
  const [selectedGrade, setSelectedGrade] = useState('g8');
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs, dayjs.Dayjs] | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [showSubMenu, setShowSubMenu] = useState(true); // 控制是否显示子菜单卡片

  const finishedExams = exams.filter(e => e.status === '已完成');

  // 子菜单卡片数据
  const subMenuCards = [
    {
      key: 'overview',
      title: '数据概览',
      description: '查看考试整体数据统计和关键指标',
      icon: <DashboardOutlined className="text-2xl" />,
      color: 'from-blue-500 to-blue-600',
      onClick: () => {
        setShowSubMenu(false);
        setActiveTab('overview');
      }
    },
    {
      key: 'scoreAnalysis',
      title: '成绩分析',
      description: '深入分析成绩分布、趋势和统计数据',
      icon: <BarChartOutlined className="text-2xl" />,
      color: 'from-green-500 to-green-600',
      onClick: () => {
        setShowSubMenu(false);
        setActiveTab('scoreAnalysis');
      }
    },
    {
      key: 'classComparison',
      title: '班级对比',
      description: '对比不同班级的成绩表现和排名',
      icon: <TeamOutlined className="text-2xl" />,
      color: 'from-purple-500 to-purple-600',
      onClick: () => {
        setShowSubMenu(false);
        setActiveTab('classComparison');
      }
    },
    {
      key: 'trendAnalysis',
      title: '趋势分析',
      description: '分析成绩变化趋势和发展轨迹',
      icon: <FundOutlined className="text-2xl" />,
      color: 'from-orange-500 to-orange-600',
      onClick: () => {
        setShowSubMenu(false);
        setActiveTab('trendAnalysis');
      }
    }
  ];

  // 渲染卡片式子菜单
  const renderSubMenuCards = () => (
    <div className="space-y-6">
      <Breadcrumb className="mb-4" items={[{ title: '数据分析' }]} />
      
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">数据分析</h2>
        <p className="text-gray-600">选择您要查看的分析模块</p>
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

  const handleViewReport = (exam: Exam) => {
    setSubViewInfo({ view: 'analysis', exam });
  };

  // 模拟数据处理
  const processedData = useMemo(() => {
    // 这里应该根据筛选条件处理真实数据
    return {
      overview: {
        totalStudents: 850,
        avgScore: 85.2,
        passRate: 91.5,
        excellentRate: 65.4,
        improvement: 2.3
      },
      trendData: mockScoreTrendData,
      subjectDistribution: [
        { name: '优秀(90-100)', value: 65.4, color: '#52c41a' },
        { name: '良好(80-89)', value: 26.1, color: '#1677ff' },
        { name: '及格(60-79)', value: 6.8, color: '#faad14' },
        { name: '不及格(<60)', value: 1.7, color: '#ff4d4f' }
      ],
      classComparison: [
        { name: '八(1)班', avgScore: 87.2, studentCount: 45 },
        { name: '八(2)班', avgScore: 85.8, studentCount: 44 },
        { name: '八(3)班', avgScore: 84.1, studentCount: 46 },
        { name: '八(4)班', avgScore: 86.5, studentCount: 45 }
      ]
    };
  }, [selectedSubject, selectedGrade, dateRange]);

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="text-center">
            <Statistic
              title="总参考人数"
              value={processedData.overview.totalStudents}
              prefix={<UserOutlined className="text-slate-600" />}
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="text-center">
            <Statistic
              title="平均分"
              value={processedData.overview.avgScore}
              precision={1}
              prefix={<BarChartOutlined className="text-emerald-600" />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="text-center">
            <Statistic
              title="及格率"
              value={processedData.overview.passRate}
              suffix="%"
              prefix={<ArrowUpOutlined className="text-indigo-600" />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="text-center">
            <Statistic
              title="优秀率"
              value={processedData.overview.excellentRate}
              suffix="%"
              prefix={<BookOutlined className="text-amber-600" />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            title="成绩趋势分析"
            extra={
              <Tag color={processedData.overview.improvement > 0 ? 'green' : 'red'}>
                {processedData.overview.improvement > 0 ? '↗' : '↘'}
                {Math.abs(processedData.overview.improvement)}%
              </Tag>
            }
          >
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={processedData.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <YAxis
                  domain={[75, 90]}
                  tick={{ fontSize: 12 }}
                  stroke="#666"
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#fff',
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="历史平均分"
                  stroke="#1677ff"
                  strokeWidth={3}
                  activeDot={{ r: 6, fill: '#1677ff' }}
                  dot={{ fill: '#1677ff', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={8}>
          <Card title="成绩分布">
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={processedData.subjectDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}%`}
                  labelLine={false}
                >
                  {processedData.subjectDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}%`, '占比']} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );

  return (
    <div className="space-y-6">
      <Breadcrumb
        className="mb-6"
        items={[
          { title: <span style={{ cursor: 'pointer' }} onClick={() => setShowSubMenu(true)}>数据分析</span> },
          { title: activeTab === 'overview' ? '数据概览' : activeTab === 'scoreAnalysis' ? '成绩分析' : activeTab === 'classComparison' ? '班级对比' : '趋势分析' }
        ]}
      />

      {/* 筛选控制区 */}
      <Card className="mb-6">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={8} md={4}>
            <Space direction="vertical" size="small" className="w-full">
              <span className="text-sm text-slate-600">选择学科</span>
              <Select
                value={selectedSubject}
                onChange={setSelectedSubject}
                className="w-full"
                options={[
                  { label: '历史', value: 'history' },
                  { label: '语文', value: 'chinese' },
                  { label: '数学', value: 'math' }
                ]}
              />
            </Space>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Space direction="vertical" size="small" className="w-full">
              <span className="text-sm text-slate-600">选择年级</span>
              <Select
                value={selectedGrade}
                onChange={setSelectedGrade}
                className="w-full"
                options={[
                  { label: '七年级', value: 'g7' },
                  { label: '八年级', value: 'g8' },
                  { label: '九年级', value: 'g9' }
                ]}
              />
            </Space>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Space direction="vertical" size="small" className="w-full">
              <span className="text-sm text-slate-600">时间范围</span>
              <RangePicker
                value={dateRange}
                onChange={(dates) => {
                  if (dates && dates[0] && dates[1]) {
                    setDateRange([dates[0], dates[1]]);
                  } else {
                    setDateRange(null);
                  }
                }}
                className="w-full"
                placeholder={['开始日期', '结束日期']}
              />
            </Space>
          </Col>
          <Col xs={24} sm={24} md={10}>
            <div className="flex justify-end">
              <Space>
                <Button onClick={() => {
                  setSelectedSubject('history');
                  setSelectedGrade('g8');
                  setDateRange(null);
                }}>
                  重置筛选
                </Button>
                <Button type="primary" loading={loading}>
                  应用筛选
                </Button>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 主要内容区 */}
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'overview',
              label: (
                <span>
                  <BarChartOutlined />
                  数据概览
                </span>
              ),
              children: renderOverviewTab()
            },
            {
              key: 'comparison',
              label: (
                <span>
                  <PieChartOutlined />
                  班级对比
                </span>
              ),
              children: (
                <Card title="班级成绩对比">
                  <ResponsiveContainer width="100%" height={400}>
                    <BarChart data={processedData.classComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgScore" fill="#1677ff" name="平均分" />
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
              )
            },
            {
              key: 'reports',
              label: (
                <span>
                  <BookOutlined />
                  考试报告
                </span>
              ),
              children: (
                <Card title="已完成考试报告">
                  {finishedExams.length > 0 ? (
                    <List
                      dataSource={finishedExams}
                      renderItem={item => (
                        <List.Item
                          actions={[
                            <Button
                              type="primary"
                              ghost
                              onClick={() => handleViewReport(item)}
                            >
                              查看详细报告
                            </Button>
                          ]}
                        >
                          <List.Item.Meta
                            title={item.name}
                            description={
                              <Space>
                                <Tag color="blue">{item.subject}</Tag>
                                <Tag color="green">{item.grade}</Tag>
                                <span className="text-slate-500">完成于: {item.createdAt}</span>
                              </Space>
                            }
                          />
                        </List.Item>
                      )}
                    />
                  ) : (
                    <Empty description="暂无已完成的考试" />
                  )}
                </Card>
              )
            }
          ]}
        />
      </Card>
    </div>
  );
};

export default DataAnalysisView;