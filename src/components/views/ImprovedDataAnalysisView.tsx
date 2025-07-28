import React, { useState, useMemo, useCallback } from 'react';
import { Row, Col, Breadcrumb, Tabs, message, Empty, Spin } from 'antd';
import { 
  BarChartOutlined, 
  LineChartOutlined, 
  PieChartOutlined, 
  UserOutlined,
  ArrowUpOutlined,
  BookOutlined,
  TagOutlined
} from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import AnalyticsCard from '../analytics/AnalyticsCard';
import ChartContainer from '../analytics/ChartContainer';
import FilterPanel, { FilterConfig } from '../analytics/FilterPanel';
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';

const ImprovedDataAnalysisView: React.FC = () => {
  const { exams } = useAppContext();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [filters, setFilters] = useState<FilterConfig>({
    subject: 'history',
    grade: 'g8',
    class: 'all',
    dateRange: null,
    examType: 'all'
  });

  // 模拟数据处理
  const analyticsData = useMemo(() => {
    // 这里应该根据筛选条件处理真实数据
    return {
      overview: {
        totalStudents: 850,
        avgScore: 85.2,
        passRate: 91.5,
        excellentRate: 65.4,
        improvement: 2.3,
        totalExams: 12
      },
      trendData: [
        { name: '三月月考', avgScore: 82.1, passRate: 88.5, excellentRate: 62.1 },
        { name: '四月联考', avgScore: 85.3, passRate: 91.2, excellentRate: 64.8 },
        { name: '期中考试', avgScore: 83.5, passRate: 89.7, excellentRate: 61.5 },
        { name: '期末考试', avgScore: 85.2, passRate: 91.5, excellentRate: 65.4 }
      ],
      scoreDistribution: [
        { name: '优秀(90-100)', value: 65.4, color: '#52c41a', count: 556 },
        { name: '良好(80-89)', value: 26.1, color: '#1677ff', count: 222 },
        { name: '及格(60-79)', value: 6.8, color: '#faad14', count: 58 },
        { name: '不及格(<60)', value: 1.7, color: '#ff4d4f', count: 14 }
      ],
      classComparison: [
        { name: '八(1)班', avgScore: 87.2, passRate: 93.3, excellentRate: 68.9, studentCount: 45 },
        { name: '八(2)班', avgScore: 85.8, passRate: 90.9, excellentRate: 65.9, studentCount: 44 },
        { name: '八(3)班', avgScore: 84.1, passRate: 89.1, excellentRate: 63.0, studentCount: 46 },
        { name: '八(4)班', avgScore: 86.5, passRate: 92.2, excellentRate: 66.7, studentCount: 45 }
      ],
      abilityAnalysis: [
        { ability: '史料理解', score: 85.2, fullScore: 100 },
        { ability: '历史概念', score: 78.9, fullScore: 100 },
        { ability: '时空观念', score: 82.1, fullScore: 100 },
        { ability: '史学方法', score: 76.5, fullScore: 100 },
        { ability: '历史解释', score: 80.3, fullScore: 100 }
      ]
    };
  }, [filters]);

  const handleFiltersChange = useCallback((newFilters: FilterConfig) => {
    setFilters(newFilters);
  }, []);

  const handleApplyFilters = useCallback(async () => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000));
      message.success('筛选条件已应用');
    } catch (error) {
      message.error('应用筛选条件失败');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const handleResetFilters = useCallback(() => {
    setFilters({
      subject: 'history',
      grade: 'g8',
      class: 'all',
      dateRange: null,
      examType: 'all'
    });
    message.info('筛选条件已重置');
  }, []);

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* 核心指标 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <AnalyticsCard
            title="总参考人数"
            value={analyticsData.overview.totalStudents}
            prefix={<UserOutlined />}
            trend={{
              value: 5.2,
              isPositive: true,
              period: '较上次'
            }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <AnalyticsCard
            title="平均分"
            value={analyticsData.overview.avgScore}
            prefix={<BarChartOutlined />}
            trend={{
              value: analyticsData.overview.improvement,
              isPositive: analyticsData.overview.improvement > 0,
              period: '较上次'
            }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <AnalyticsCard
            title="及格率"
            value={analyticsData.overview.passRate}
            suffix="%"
            prefix={<ArrowUpOutlined />}
            progress={{
              percent: analyticsData.overview.passRate,
              status: analyticsData.overview.passRate >= 90 ? 'success' : 'normal'
            }}
          />
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <AnalyticsCard
            title="优秀率"
            value={analyticsData.overview.excellentRate}
            suffix="%"
            prefix={<TagOutlined />}
            progress={{
              percent: analyticsData.overview.excellentRate,
              status: analyticsData.overview.excellentRate >= 60 ? 'success' : 'normal'
            }}
          />
        </Col>
      </Row>

      {/* 图表区域 */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <ChartContainer
            title="成绩趋势分析"
            onRefresh={() => message.info('数据已刷新')}
            onExport={(format) => message.info(`正在导出${format}格式`)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analyticsData.trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="avgScore" 
                  stroke="#1677ff" 
                  strokeWidth={2}
                  name="平均分"
                />
                <Line 
                  type="monotone" 
                  dataKey="passRate" 
                  stroke="#52c41a" 
                  strokeWidth={2}
                  name="及格率"
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Col>
        
        <Col xs={24} lg={8}>
          <ChartContainer
            title="成绩分布"
            onExport={(format) => message.info(`正在导出${format}格式`)}
          >
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={analyticsData.scoreDistribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {analyticsData.scoreDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value}%`, name]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Col>
      </Row>
    </div>
  );

  const renderComparisonTab = () => (
    <div className="space-y-6">
      <ChartContainer
        title="班级成绩对比"
        onRefresh={() => message.info('数据已刷新')}
        onExport={(format) => message.info(`正在导出${format}格式`)}
        height={500}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={analyticsData.classComparison}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="avgScore" fill="#1677ff" name="平均分" />
            <Bar dataKey="passRate" fill="#52c41a" name="及格率" />
            <Bar dataKey="excellentRate" fill="#faad14" name="优秀率" />
          </BarChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );

  return (
    <div className="space-y-6">
      <Breadcrumb 
        items={[
          { title: '数据分析' },
          { title: '学情概览' }
        ]} 
      />
      
      <FilterPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
        loading={loading}
      />

      <Spin spinning={loading}>
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
              children: renderComparisonTab()
            },
            {
              key: 'trend',
              label: (
                <span>
                  <LineChartOutlined />
                  趋势分析
                </span>
              ),
              children: (
                <Empty description="趋势分析功能开发中..." />
              )
            }
          ]}
        />
      </Spin>
    </div>
  );
};

export default ImprovedDataAnalysisView;
