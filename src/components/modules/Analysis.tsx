import React, { useState } from 'react';
import { Card, Typography, Button, Space, Select, Statistic, Row, Col, Alert, Tabs } from 'antd';
import { useNavigate } from 'react-router-dom';
import { ArrowLeftOutlined, TrophyOutlined, BarChartOutlined, TeamOutlined, BookOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

const mockAnalysisData = {
  overview: {
    totalStudents: 156,
    averageScore: 82.5,
    passRate: 89.7,
    topScore: 98
  },
  subjectAnalysis: [
    { subject: '数学', average: 85.2, passRate: 92.1, difficulty: '中等' },
    { subject: '语文', average: 78.9, passRate: 85.3, difficulty: '较难' },
    { subject: '英语', average: 83.7, passRate: 91.2, difficulty: '中等' },
    { subject: '物理', average: 79.4, passRate: 87.8, difficulty: '较难' }
  ],
  gradeAnalysis: [
    { grade: '高一', studentCount: 52, average: 81.3, passRate: 88.5 },
    { grade: '高二', studentCount: 48, average: 84.2, passRate: 91.7 },
    { grade: '高三', studentCount: 56, average: 82.1, passRate: 89.3 }
  ]
};

export const Analysis: React.FC = () => {
  const navigate = useNavigate();
  const [selectedExam, setSelectedExam] = useState('all');

  const tabItems = [
    {
      key: '1',
      label: '成绩概览',
      children: (
        <div>
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col span={6}>
              <Card>
                <Statistic
                  title="参考学生"
                  value={mockAnalysisData.overview.totalStudents}
                  prefix={<TeamOutlined />}
                  suffix="人"
                  valueStyle={{ color: '#1890ff' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="平均分"
                  value={mockAnalysisData.overview.averageScore}
                  precision={1}
                  prefix={<BarChartOutlined />}
                  suffix="分"
                  valueStyle={{ color: '#52c41a' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="及格率"
                  value={mockAnalysisData.overview.passRate}
                  precision={1}
                  prefix={<BookOutlined />}
                  suffix="%"
                  valueStyle={{ color: '#722ed1' }}
                />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic
                  title="最高分"
                  value={mockAnalysisData.overview.topScore}
                  prefix={<TrophyOutlined />}
                  suffix="分"
                  valueStyle={{ color: '#fa8c16' }}
                />
              </Card>
            </Col>
          </Row>

          <Card title="分数段分布" style={{ marginBottom: '24px' }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-around', 
              textAlign: 'center',
              padding: '20px 0' 
            }}>
              <div>
                <div style={{ fontSize: '24px', color: '#f5222d' }}>12</div>
                <Text type="secondary">90-100分</Text>
              </div>
              <div>
                <div style={{ fontSize: '24px', color: '#fa8c16' }}>45</div>
                <Text type="secondary">80-89分</Text>
              </div>
              <div>
                <div style={{ fontSize: '24px', color: '#52c41a' }}>68</div>
                <Text type="secondary">70-79分</Text>
              </div>
              <div>
                <div style={{ fontSize: '24px', color: '#1890ff' }}>25</div>
                <Text type="secondary">60-69分</Text>
              </div>
              <div>
                <div style={{ fontSize: '24px', color: '#722ed1' }}>6</div>
                <Text type="secondary">60分以下</Text>
              </div>
            </div>
          </Card>

          <Alert
            message="数据说明"
            description="以上统计数据基于最近一次考试结果，包含全年级所有班级的成绩分析。数据每日更新。"
            type="info"
            showIcon
          />
        </div>
      ),
    },
    {
      key: '2',
      label: '学科分析',
      children: (
        <div>
          <Card title="各学科成绩分析">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px' }}>
              {mockAnalysisData.subjectAnalysis.map(subject => (
                <Card key={subject.subject} size="small">
                  <div style={{ textAlign: 'center' }}>
                    <Title level={4}>{subject.subject}</Title>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Statistic
                          title="平均分"
                          value={subject.average}
                          precision={1}
                          valueStyle={{ fontSize: '16px' }}
                        />
                      </Col>
                      <Col span={8}>
                        <Statistic
                          title="及格率"
                          value={subject.passRate}
                          precision={1}
                          suffix="%"
                          valueStyle={{ fontSize: '16px' }}
                        />
                      </Col>
                      <Col span={8}>
                        <div>
                          <div style={{ fontSize: '16px', marginBottom: '4px' }}>{subject.difficulty}</div>
                          <Text type="secondary">难度</Text>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <Card title="学科对比分析" style={{ marginTop: '24px' }}>
            <Alert
              message="分析建议"
              description="数学和英语表现较好，及格率超过90%；语文和物理相对较难，建议加强这两个学科的教学重点。"
              type="warning"
              showIcon
            />
          </Card>
        </div>
      ),
    },
    {
      key: '3',
      label: '年级分析',
      children: (
        <div>
          <Card title="各年级成绩对比">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
              {mockAnalysisData.gradeAnalysis.map(grade => (
                <Card key={grade.grade} size="small">
                  <div style={{ textAlign: 'center' }}>
                    <Title level={4}>{grade.grade}</Title>
                    <Row gutter={16}>
                      <Col span={24}>
                        <Statistic
                          title="学生人数"
                          value={grade.studentCount}
                          suffix="人"
                          style={{ marginBottom: '16px' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="平均分"
                          value={grade.average}
                          precision={1}
                          valueStyle={{ fontSize: '16px' }}
                        />
                      </Col>
                      <Col span={12}>
                        <Statistic
                          title="及格率"
                          value={grade.passRate}
                          precision={1}
                          suffix="%"
                          valueStyle={{ fontSize: '16px' }}
                        />
                      </Col>
                    </Row>
                  </div>
                </Card>
              ))}
            </div>
          </Card>

          <Card title="年级趋势分析" style={{ marginTop: '24px' }}>
            <Alert
              message="趋势分析"
              description="高二年级表现最优，平均分和及格率都是最高的；高一年级作为起始年级表现平稳；高三年级在高考压力下保持稳定水平。"
              type="success"
              showIcon
            />
          </Card>
        </div>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* 顶部导航 */}
      <Card style={{ marginBottom: '24px' }}>
        <Space align="center">
          <Button 
            icon={<ArrowLeftOutlined />} 
            onClick={() => navigate('/dashboard')}
          >
            返回工作台
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            成绩分析
          </Title>
          <Text type="secondary">查看统计报告、分析学生表现</Text>
        </Space>
      </Card>

      {/* 筛选条件 */}
      <Card style={{ marginBottom: '24px' }}>
        <Space>
          <Text strong>选择考试：</Text>
          <Select 
            value={selectedExam} 
            onChange={setSelectedExam}
            style={{ width: 200 }}
          >
            <Option value="all">全部考试</Option>
            <Option value="exam1">高一数学期中考试</Option>
            <Option value="exam2">高二物理月考</Option>
            <Option value="exam3">高三化学模拟考</Option>
          </Select>
          <Button type="primary">生成报告</Button>
          <Button>导出Excel</Button>
          <Button>导出PDF</Button>
        </Space>
      </Card>

      {/* 分析内容 */}
      <Card>
        <Tabs defaultActiveKey="1" items={tabItems} />
      </Card>

      {/* 提示信息 */}
      <Alert
        message="成绩分析功能"
        description="提供全方位的成绩数据分析，包括整体概览、学科对比、年级分析等多个维度。支持导出详细报告和图表。"
        type="info"
        showIcon
        style={{ marginTop: '24px' }}
      />
    </div>
  );
};

export default Analysis;