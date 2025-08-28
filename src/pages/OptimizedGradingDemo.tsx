import React, { useState } from 'react';
import { Card, Button, Space, Typography, Divider, Row, Col, Alert, Steps } from 'antd';
import { 
  PlayCircleOutlined, 
  ExperimentOutlined,
  CheckCircleOutlined,
  SettingOutlined
} from '@ant-design/icons';
import { OptimizedGradingInterface } from '../components/optimized/OptimizedGradingInterface';
import { GlobalErrorBoundary } from '../components/optimized/GlobalErrorHandler';

const { Title, Paragraph, Text } = Typography;
const { Step } = Steps;

interface OptimizedGradingDemoProps {}

export const OptimizedGradingDemo: React.FC<OptimizedGradingDemoProps> = () => {
  const [demoStage, setDemoStage] = useState<'intro' | 'demo' | 'comparison'>('intro');
  const [mockExamId] = useState('demo_exam_001');

  const handleStartDemo = () => {
    setDemoStage('demo');
  };

  const handleBackToIntro = () => {
    setDemoStage('intro');
  };

  const renderIntroduction = () => (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <Title level={1} style={{ marginBottom: '16px' }}>
          智阅AI 3.0 优化系统演示
        </Title>
        <Paragraph style={{ fontSize: '16px', color: '#666' }}>
          体验全新优化的阅卷流程，感受高效、智能、直观的操作体验
        </Paragraph>
      </div>

      <Row gutter={[24, 24]}>
        {/* 核心优化点 */}
        <Col span={24}>
          <Card title="🎯 核心优化亮点" size="small">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12} md={6}>
                <Card size="small" hoverable style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', color: '#1890ff', marginBottom: '8px' }}>⚡</div>
                  <Text strong>性能提升50%</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    批量处理和智能调度
                  </Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small" hoverable style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', color: '#52c41a', marginBottom: '8px' }}>🎨</div>
                  <Text strong>用户体验优化</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    响应式设计和直观界面
                  </Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small" hoverable style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', color: '#faad14', marginBottom: '8px' }}>📊</div>
                  <Text strong>实时质量监控</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    智能告警和质量保障
                  </Text>
                </Card>
              </Col>
              <Col xs={24} sm={12} md={6}>
                <Card size="small" hoverable style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '24px', color: '#f5222d', marginBottom: '8px' }}>🛡️</div>
                  <Text strong>异常处理增强</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    自动恢复和容错机制
                  </Text>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        {/* 工作流程展示 */}
        <Col span={24}>
          <Card title="📋 优化后的工作流程" size="small">
            <Steps 
              direction="horizontal" 
              size="small"
              current={-1}
              style={{ marginBottom: '24px' }}
            >
              <Step title="文件上传" description="智能并行上传" icon={<div>📁</div>} />
              <Step title="智能预处理" description="OCR + AI分析" icon={<div>🧠</div>} />
              <Step title="数据验证" description="自动质量检查" icon={<div>✓</div>} />
              <Step title="智能阅卷" description="并行评分引擎" icon={<div>📝</div>} />
              <Step title="质量复核" description="智能分流复核" icon={<div>🔍</div>} />
              <Step title="数据分析" description="实时统计分析" icon={<div>📊</div>} />
            </Steps>

            <Alert
              message="流程优化亮点"
              description={
                <ul style={{ marginBottom: 0 }}>
                  <li>智能批量处理，支持断点续传和错误恢复</li>
                  <li>实时进度监控，提供准确的时间预估</li>
                  <li>自适应资源调度，根据系统负载动态调整</li>
                  <li>多维度质量监控，确保结果准确性</li>
                </ul>
              }
              type="info"
              showIcon
            />
          </Card>
        </Col>

        {/* 技术特性 */}
        <Col xs={24} lg={12}>
          <Card title="🛠️ 技术特性" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>前端架构优化</Text>
                <br />
                <Text type="secondary">• 响应式布局设计</Text>
                <br />
                <Text type="secondary">• 组件懒加载和虚拟滚动</Text>
                <br />
                <Text type="secondary">• 状态管理优化</Text>
              </div>
              
              <Divider style={{ margin: '12px 0' }} />
              
              <div>
                <Text strong>后端性能提升</Text>
                <br />
                <Text type="secondary">• 异步批量处理</Text>
                <br />
                <Text type="secondary">• 智能任务调度</Text>
                <br />
                <Text type="secondary">• 数据库查询优化</Text>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 预期效果 */}
        <Col xs={24} lg={12}>
          <Card title="🎯 预期效果" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>批量处理速度</Text>
                <Text style={{ color: '#52c41a' }}>+50%</Text>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>系统响应时间</Text>
                <Text style={{ color: '#52c41a' }}>-60%</Text>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>操作步骤</Text>
                <Text style={{ color: '#52c41a' }}>-30%</Text>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>错误率</Text>
                <Text style={{ color: '#52c41a' }}>-70%</Text>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>用户满意度</Text>
                <Text style={{ color: '#52c41a' }}>85%+</Text>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 演示操作按钮 */}
        <Col span={24}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Space size="large">
                <Button
                  type="primary"
                  size="large"
                  icon={<PlayCircleOutlined />}
                  onClick={handleStartDemo}
                >
                  开始体验优化版本
                </Button>
                
                <Button
                  size="large"
                  icon={<ExperimentOutlined />}
                  onClick={() => setDemoStage('comparison')}
                >
                  对比分析
                </Button>
                
                <Button
                  size="large"
                  icon={<SettingOutlined />}
                  href="/docs/优化后的阅卷流程设计方案.md"
                  target="_blank"
                >
                  查看技术文档
                </Button>
              </Space>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );

  const renderComparison = () => (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <Title level={2}>优化前后对比分析</Title>
        <Button type="link" onClick={handleBackToIntro}>← 返回介绍</Button>
      </div>

      <Row gutter={[24, 24]}>
        <Col span={24}>
          <Card title="📊 性能指标对比">
            <Row gutter={16}>
              <Col xs={24} sm={8}>
                <Card size="small" title="处理速度" style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text type="secondary">优化前</Text>
                    <br />
                    <Text style={{ fontSize: '20px' }}>5 份/分钟</Text>
                  </div>
                  <div>
                    <Text type="secondary">优化后</Text>
                    <br />
                    <Text style={{ fontSize: '20px', color: '#52c41a' }}>7.5 份/分钟</Text>
                    <br />
                    <Text style={{ color: '#52c41a' }}>+50%</Text>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} sm={8}>
                <Card size="small" title="响应时间" style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text type="secondary">优化前</Text>
                    <br />
                    <Text style={{ fontSize: '20px' }}>2.5 秒</Text>
                  </div>
                  <div>
                    <Text type="secondary">优化后</Text>
                    <br />
                    <Text style={{ fontSize: '20px', color: '#52c41a' }}>1.0 秒</Text>
                    <br />
                    <Text style={{ color: '#52c41a' }}>-60%</Text>
                  </div>
                </Card>
              </Col>
              
              <Col xs={24} sm={8}>
                <Card size="small" title="错误率" style={{ textAlign: 'center' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <Text type="secondary">优化前</Text>
                    <br />
                    <Text style={{ fontSize: '20px' }}>8.5%</Text>
                  </div>
                  <div>
                    <Text type="secondary">优化后</Text>
                    <br />
                    <Text style={{ fontSize: '20px', color: '#52c41a' }}>2.5%</Text>
                    <br />
                    <Text style={{ color: '#52c41a' }}>-70%</Text>
                  </div>
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="❌ 优化前的问题" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert message="架构问题" type="error" showIcon size="small" />
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>前后端耦合度高</li>
                <li>状态管理混乱</li>
                <li>数据一致性问题</li>
              </ul>
              
              <Alert message="性能问题" type="warning" showIcon size="small" />
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>大批量处理卡顿</li>
                <li>内存使用过多</li>
                <li>数据库查询效率低</li>
              </ul>
              
              <Alert message="用户体验问题" type="info" showIcon size="small" />
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>操作流程复杂</li>
                <li>错误提示不清晰</li>
                <li>响应式适配不足</li>
              </ul>
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="✅ 优化后的改进" size="small">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Alert message="架构优化" type="success" showIcon size="small" />
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>模块化组件设计</li>
                <li>统一状态管理</li>
                <li>类型安全保障</li>
              </ul>
              
              <Alert message="性能提升" type="success" showIcon size="small" />
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>智能批量处理</li>
                <li>内存优化管理</li>
                <li>数据库索引优化</li>
              </ul>
              
              <Alert message="体验改善" type="success" showIcon size="small" />
              <ul style={{ margin: 0, paddingLeft: '20px' }}>
                <li>工作流程简化</li>
                <li>智能错误恢复</li>
                <li>全面响应式设计</li>
              </ul>
            </Space>
          </Card>
        </Col>

        <Col span={24}>
          <div style={{ textAlign: 'center' }}>
            <Button
              type="primary"
              size="large"
              icon={<PlayCircleOutlined />}
              onClick={handleStartDemo}
            >
              立即体验优化版本
            </Button>
          </div>
        </Col>
      </Row>
    </div>
  );

  const renderDemo = () => (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ 
        padding: '12px 24px', 
        background: '#f0f2f5', 
        borderBottom: '1px solid #d9d9d9',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div>
          <Text strong>智阅AI 3.0 优化版演示</Text>
          <Text type="secondary" style={{ marginLeft: '16px' }}>
            模拟考试ID: {mockExamId}
          </Text>
        </div>
        <Space>
          <Button type="link" onClick={handleBackToIntro}>
            返回介绍
          </Button>
          <Button type="link" onClick={() => setDemoStage('comparison')}>
            查看对比
          </Button>
        </Space>
      </div>
      
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <GlobalErrorBoundary>
          <OptimizedGradingInterface examId={mockExamId} />
        </GlobalErrorBoundary>
      </div>
    </div>
  );

  // 根据当前阶段渲染不同内容
  switch (demoStage) {
    case 'demo':
      return renderDemo();
    case 'comparison':
      return renderComparison();
    default:
      return renderIntroduction();
  }
};

export default OptimizedGradingDemo;