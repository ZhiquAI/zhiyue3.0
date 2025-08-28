/**
 * 数据库优化仪表板组件
 * 提供数据库性能监控、优化管理、统计分析等功能
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Button,
  Table,
  Progress,
  Alert,
  Tabs,
  Tag,
  Typography,
  Space,
  Modal,
  message,
  Spin,
  Badge,
  Tooltip
} from 'antd';
import {
  DatabaseOutlined,
  BarChartOutlined,
  SettingOutlined,
  ReloadOutlined,
  TuningOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;

interface DatabaseMetrics {
  pool_stats: {
    pool_size: number;
    checked_in: number;
    checked_out: number;
    overflow: number;
    total_connections: number;
    peak_connections: number;
    average_checkout_time: number;
    longest_checkout_time: number;
  };
  query_stats: {
    total_unique_queries: number;
    total_executions: number;
    avg_execution_time: number;
    slow_queries_count: number;
  };
  cache_stats: {
    size: number;
    max_size: number;
    hit_rate: number;
  };
}

const DatabaseOptimizationDashboard: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [metrics, setMetrics] = useState<DatabaseMetrics | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);

  // 模拟数据
  useEffect(() => {
    const mockMetrics: DatabaseMetrics = {
      pool_stats: {
        pool_size: 20,
        checked_in: 18,
        checked_out: 2,
        overflow: 0,
        total_connections: 20,
        peak_connections: 15,
        average_checkout_time: 0.25,
        longest_checkout_time: 1.2
      },
      query_stats: {
        total_unique_queries: 156,
        total_executions: 2834,
        avg_execution_time: 12.5,
        slow_queries_count: 3
      },
      cache_stats: {
        size: 1024,
        max_size: 2048,
        hit_rate: 0.85
      }
    };
    setMetrics(mockMetrics);
  }, []);

  // 刷新所有数据
  const refreshAllData = async () => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      setLoading(false);
      message.success('数据刷新成功');
    }, 1000);
  };

  // 连接池状态卡片
  const renderConnectionPoolCard = () => {
    if (!metrics?.pool_stats) return null;

    const { pool_stats } = metrics;
    const utilizationRate = (pool_stats.checked_out / pool_stats.pool_size) * 100;

    return (
      <Card title="连接池状态" extra={<DatabaseOutlined />}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="池大小"
              value={pool_stats.pool_size}
              suffix="连接"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="已使用"
              value={pool_stats.checked_out}
              suffix="连接"
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="使用率"
              value={utilizationRate}
              suffix="%"
              precision={1}
            />
          </Col>
        </Row>
        <div style={{ marginTop: 16 }}>
          <Progress 
            percent={utilizationRate} 
            status={utilizationRate > 80 ? 'exception' : utilizationRate > 60 ? 'active' : 'success'}
          />
        </div>
      </Card>
    );
  };

  // 查询性能卡片
  const renderQueryPerformanceCard = () => {
    if (!metrics?.query_stats) return null;

    const { query_stats } = metrics;

    return (
      <Card title="查询性能" extra={<BarChartOutlined />}>
        <Row gutter={16}>
          <Col span={6}>
            <Statistic
              title="总查询数"
              value={query_stats.total_executions}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="唯一查询"
              value={query_stats.total_unique_queries}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均耗时"
              value={query_stats.avg_execution_time}
              suffix="ms"
              precision={3}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="慢查询"
              value={query_stats.slow_queries_count}
              prefix={query_stats.slow_queries_count > 0 ? <WarningOutlined style={{ color: '#faad14' }} /> : <CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
          </Col>
        </Row>
      </Card>
    );
  };

  // 缓存状态卡片
  const renderCacheCard = () => {
    if (!metrics?.cache_stats) return null;

    const { cache_stats } = metrics;
    const cacheUsage = (cache_stats.size / cache_stats.max_size) * 100;

    return (
      <Card title="查询缓存" extra={<ClockCircleOutlined />}>
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="缓存大小"
              value={cache_stats.size}
              suffix={`/ ${cache_stats.max_size}`}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="命中率"
              value={cache_stats.hit_rate * 100}
              suffix="%"
              precision={1}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="使用率"
              value={cacheUsage}
              suffix="%"
              precision={1}
            />
          </Col>
        </Row>
        <div style={{ marginTop: 16 }}>
          <Progress 
            percent={cache_stats.hit_rate * 100} 
            status={cache_stats.hit_rate > 0.8 ? 'success' : cache_stats.hit_rate > 0.5 ? 'active' : 'exception'}
          />
        </div>
      </Card>
    );
  };

  return (
    <div style={{ padding: 24 }}>
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={2}>数据库优化仪表板</Title>
        <Space>
          <Button 
            type="default" 
            icon={<ReloadOutlined />} 
            onClick={refreshAllData}
            loading={loading}
          >
            刷新
          </Button>
          <Button 
            type={autoRefresh ? 'primary' : 'default'} 
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '停止自动刷新' : '开启自动刷新'}
          </Button>
        </Space>
      </div>

      {loading && <Spin size="large" style={{ display: 'block', textAlign: 'center', marginBottom: 24 }} />}

      <Tabs defaultActiveKey="overview">
        <Tabs.TabPane tab="概览" key="overview">
          <Row gutter={[16, 16]}>
            <Col span={8}>
              {renderConnectionPoolCard()}
            </Col>
            <Col span={8}>
              {renderQueryPerformanceCard()}
            </Col>
            <Col span={8}>
              {renderCacheCard()}
            </Col>
          </Row>

          <Alert
            message="系统运行良好"
            description="数据库性能指标正常，连接池使用率适中，查询缓存命中率良好"
            type="success"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Tabs.TabPane>
      </Tabs>
    </div>
  );
};

export default DatabaseOptimizationDashboard;