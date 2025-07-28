import React, { useState } from 'react';
import { Card, Row, Col, Statistic, Select, Space, Button } from 'antd';
import { UserOutlined, BarChartOutlined, BookOutlined, ArrowUpOutlined } from '@ant-design/icons';

const SimpleDataAnalysisView: React.FC = () => {
  const [selectedSubject, setSelectedSubject] = useState('history');
  const [selectedGrade, setSelectedGrade] = useState('g8');

  return (
    <div style={{ padding: '24px' }}>
      <Card title="📈 数据分析" style={{ marginBottom: '24px' }}>
        {/* 筛选控制区 */}
        <Row gutter={[16, 16]} align="middle" style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={8} md={4}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>选择学科</span>
              <Select
                value={selectedSubject}
                onChange={setSelectedSubject}
                style={{ width: '100%' }}
                options={[
                  { label: '历史', value: 'history' },
                  { label: '语文', value: 'chinese' },
                  { label: '数学', value: 'math' }
                ]}
              />
            </Space>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <span style={{ fontSize: '14px', color: '#666' }}>选择年级</span>
              <Select
                value={selectedGrade}
                onChange={setSelectedGrade}
                style={{ width: '100%' }}
                options={[
                  { label: '七年级', value: 'g7' },
                  { label: '八年级', value: 'g8' },
                  { label: '九年级', value: 'g9' }
                ]}
              />
            </Space>
          </Col>
          <Col xs={24} sm={8} md={4}>
            <Button type="primary">生成报告</Button>
          </Col>
        </Row>

        {/* 核心指标卡片 */}
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="总参考人数"
                value={1248}
                prefix={<UserOutlined style={{ color: '#666' }} />}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="平均分"
                value={85.2}
                precision={1}
                prefix={<BarChartOutlined style={{ color: '#52c41a' }} />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="及格率"
                value={92.5}
                suffix="%"
                prefix={<BarChartOutlined style={{ color: '#722ed1' }} />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card style={{ textAlign: 'center' }}>
              <Statistic
                title="优秀率"
                value={68.3}
                suffix="%"
                prefix={<BookOutlined style={{ color: '#fa8c16' }} />}
                valueStyle={{ color: '#fa8c16' }}
              />
            </Card>
          </Col>
        </Row>

        {/* 简单的图表占位 */}
        <Row gutter={[24, 24]} style={{ marginTop: '24px' }}>
          <Col xs={24} lg={16}>
            <Card title="成绩趋势分析">
              <div style={{ 
                height: '300px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <BarChartOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                  <p style={{ color: '#999', margin: 0 }}>图表功能开发中...</p>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card title="成绩分布">
              <div style={{ 
                height: '300px', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                backgroundColor: '#f5f5f5',
                borderRadius: '8px'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <ArrowUpOutlined style={{ fontSize: '48px', color: '#d9d9d9', marginBottom: '16px' }} />
                  <p style={{ color: '#999', margin: 0 }}>分布图开发中...</p>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </Card>
    </div>
  );
};

export default SimpleDataAnalysisView;
