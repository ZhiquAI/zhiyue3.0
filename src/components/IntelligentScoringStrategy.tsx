import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  Slider,
  Switch,
  Tabs,
  Table,
  Tag,
  Modal,
  Space,
  Divider,
  Alert,
  Progress,
  Tooltip,
  Row,
  Col,
  Typography,
  InputNumber,
  Collapse,
  Badge,
  Statistic
} from 'antd';
import {
  SettingOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ExportOutlined,
  ImportOutlined,
  SaveOutlined,
  ReloadOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  BarChartOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import { Settings, Brain, Target, Zap, TrendingUp, Award } from 'lucide-react';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface ScoringStrategy {
  id: string;
  name: string;
  description: string;
  type: 'objective' | 'subjective' | 'mixed';
  difficulty: 'easy' | 'medium' | 'hard';
  subject: string;
  config: {
    strictness: number; // 严格程度 0-100
    accuracy_weight: number; // 准确性权重
    completeness_weight: number; // 完整性权重
    logic_weight: number; // 逻辑性权重
    expression_weight: number; // 表达性权重
    keyword_matching: boolean; // 关键词匹配
    semantic_analysis: boolean; // 语义分析
    structure_analysis: boolean; // 结构分析
    auto_apply_threshold: number; // 自动应用阈值
    penalty_rules: {
      spelling_error: number; // 拼写错误扣分
      grammar_error: number; // 语法错误扣分
      logic_error: number; // 逻辑错误扣分
      incomplete_answer: number; // 答案不完整扣分
    };
    bonus_rules: {
      extra_points: number; // 额外要点加分
      creative_thinking: number; // 创新思维加分
      clear_expression: number; // 表达清晰加分
    };
  };
  performance: {
    accuracy_rate: number;
    consistency_rate: number;
    efficiency_score: number;
    teacher_satisfaction: number;
  };
  usage_count: number;
  created_at: string;
  updated_at: string;
  is_default: boolean;
  is_active: boolean;
}

interface IntelligentScoringStrategyProps {
  onStrategyChange?: (strategy: ScoringStrategy) => void;
  currentStrategy?: ScoringStrategy;
}

const IntelligentScoringStrategy: React.FC<IntelligentScoringStrategyProps> = ({
  onStrategyChange,
  currentStrategy
}) => {
  const [strategies, setStrategies] = useState<ScoringStrategy[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<ScoringStrategy | null>(currentStrategy || null);
  const [editingStrategy, setEditingStrategy] = useState<ScoringStrategy | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form] = Form.useForm();

  // 模拟策略数据
  const mockStrategies: ScoringStrategy[] = [
    {
      id: '1',
      name: '标准客观题策略',
      description: '适用于选择题、填空题等客观题型的标准评分策略',
      type: 'objective',
      difficulty: 'easy',
      subject: '数学',
      config: {
        strictness: 90,
        accuracy_weight: 100,
        completeness_weight: 0,
        logic_weight: 0,
        expression_weight: 0,
        keyword_matching: true,
        semantic_analysis: false,
        structure_analysis: false,
        auto_apply_threshold: 95,
        penalty_rules: {
          spelling_error: 0,
          grammar_error: 0,
          logic_error: 0,
          incomplete_answer: 0
        },
        bonus_rules: {
          extra_points: 0,
          creative_thinking: 0,
          clear_expression: 0
        }
      },
      performance: {
        accuracy_rate: 98.5,
        consistency_rate: 99.2,
        efficiency_score: 95.8,
        teacher_satisfaction: 4.8
      },
      usage_count: 1250,
      created_at: '2024-01-15',
      updated_at: '2024-01-20',
      is_default: true,
      is_active: true
    },
    {
      id: '2',
      name: '语文主观题策略',
      description: '适用于语文阅读理解、作文等主观题型的智能评分策略',
      type: 'subjective',
      difficulty: 'hard',
      subject: '语文',
      config: {
        strictness: 70,
        accuracy_weight: 30,
        completeness_weight: 25,
        logic_weight: 25,
        expression_weight: 20,
        keyword_matching: true,
        semantic_analysis: true,
        structure_analysis: true,
        auto_apply_threshold: 80,
        penalty_rules: {
          spelling_error: 1,
          grammar_error: 2,
          logic_error: 3,
          incomplete_answer: 5
        },
        bonus_rules: {
          extra_points: 2,
          creative_thinking: 3,
          clear_expression: 2
        }
      },
      performance: {
        accuracy_rate: 85.2,
        consistency_rate: 82.7,
        efficiency_score: 88.9,
        teacher_satisfaction: 4.3
      },
      usage_count: 890,
      created_at: '2024-01-10',
      updated_at: '2024-01-25',
      is_default: false,
      is_active: true
    },
    {
      id: '3',
      name: '理科综合策略',
      description: '适用于物理、化学等理科综合题型的评分策略',
      type: 'mixed',
      difficulty: 'medium',
      subject: '物理',
      config: {
        strictness: 80,
        accuracy_weight: 40,
        completeness_weight: 30,
        logic_weight: 20,
        expression_weight: 10,
        keyword_matching: true,
        semantic_analysis: true,
        structure_analysis: false,
        auto_apply_threshold: 85,
        penalty_rules: {
          spelling_error: 0.5,
          grammar_error: 1,
          logic_error: 4,
          incomplete_answer: 3
        },
        bonus_rules: {
          extra_points: 1,
          creative_thinking: 2,
          clear_expression: 1
        }
      },
      performance: {
        accuracy_rate: 91.8,
        consistency_rate: 89.5,
        efficiency_score: 92.3,
        teacher_satisfaction: 4.6
      },
      usage_count: 650,
      created_at: '2024-01-12',
      updated_at: '2024-01-22',
      is_default: false,
      is_active: true
    }
  ];

  useEffect(() => {
    loadStrategies();
  }, []);

  const loadStrategies = async () => {
    setLoading(true);
    // 模拟API调用
    setTimeout(() => {
      setStrategies(mockStrategies);
      if (!selectedStrategy && mockStrategies.length > 0) {
        const defaultStrategy = mockStrategies.find(s => s.is_default) || mockStrategies[0];
        setSelectedStrategy(defaultStrategy);
        onStrategyChange?.(defaultStrategy);
      }
      setLoading(false);
    }, 1000);
  };

  const handleCreateStrategy = () => {
    setEditingStrategy(null);
    form.resetFields();
    setShowCreateModal(true);
  };

  const handleEditStrategy = (strategy: ScoringStrategy) => {
    setEditingStrategy(strategy);
    form.setFieldsValue({
      ...strategy,
      ...strategy.config
    });
    setShowEditModal(true);
  };

  const handleSaveStrategy = async (values: any) => {
    setLoading(true);
    
    const newStrategy: ScoringStrategy = {
      id: editingStrategy?.id || Date.now().toString(),
      name: values.name,
      description: values.description,
      type: values.type,
      difficulty: values.difficulty,
      subject: values.subject,
      config: {
        strictness: values.strictness,
        accuracy_weight: values.accuracy_weight,
        completeness_weight: values.completeness_weight,
        logic_weight: values.logic_weight,
        expression_weight: values.expression_weight,
        keyword_matching: values.keyword_matching,
        semantic_analysis: values.semantic_analysis,
        structure_analysis: values.structure_analysis,
        auto_apply_threshold: values.auto_apply_threshold,
        penalty_rules: {
          spelling_error: values.spelling_error || 0,
          grammar_error: values.grammar_error || 0,
          logic_error: values.logic_error || 0,
          incomplete_answer: values.incomplete_answer || 0
        },
        bonus_rules: {
          extra_points: values.extra_points || 0,
          creative_thinking: values.creative_thinking || 0,
          clear_expression: values.clear_expression || 0
        }
      },
      performance: editingStrategy?.performance || {
        accuracy_rate: 0,
        consistency_rate: 0,
        efficiency_score: 0,
        teacher_satisfaction: 0
      },
      usage_count: editingStrategy?.usage_count || 0,
      created_at: editingStrategy?.created_at || new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString().split('T')[0],
      is_default: values.is_default || false,
      is_active: true
    };

    // 模拟保存
    setTimeout(() => {
      if (editingStrategy) {
        setStrategies(prev => prev.map(s => s.id === editingStrategy.id ? newStrategy : s));
      } else {
        setStrategies(prev => [...prev, newStrategy]);
      }
      setShowCreateModal(false);
      setShowEditModal(false);
      setLoading(false);
    }, 1000);
  };

  const handleDeleteStrategy = (id: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这个评分策略吗？此操作不可撤销。',
      onOk: () => {
        setStrategies(prev => prev.filter(s => s.id !== id));
        if (selectedStrategy?.id === id) {
          const remaining = strategies.filter(s => s.id !== id);
          setSelectedStrategy(remaining[0] || null);
        }
      }
    });
  };

  const handleSelectStrategy = (strategy: ScoringStrategy) => {
    setSelectedStrategy(strategy);
    onStrategyChange?.(strategy);
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'objective': return 'blue';
      case 'subjective': return 'green';
      case 'mixed': return 'purple';
      default: return 'default';
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'green';
      case 'medium': return 'orange';
      case 'hard': return 'red';
      default: return 'default';
    }
  };

  const columns = [
    {
      title: '策略名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string, record: ScoringStrategy) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-xs text-gray-500">{record.description}</div>
        </div>
      )
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={getTypeColor(type)}>
          {type === 'objective' ? '客观题' : type === 'subjective' ? '主观题' : '混合题'}
        </Tag>
      )
    },
    {
      title: '难度',
      dataIndex: 'difficulty',
      key: 'difficulty',
      render: (difficulty: string) => (
        <Tag color={getDifficultyColor(difficulty)}>
          {difficulty === 'easy' ? '简单' : difficulty === 'medium' ? '中等' : '困难'}
        </Tag>
      )
    },
    {
      title: '学科',
      dataIndex: 'subject',
      key: 'subject'
    },
    {
      title: '性能指标',
      key: 'performance',
      render: (record: ScoringStrategy) => (
        <div className="space-y-1">
          <div className="text-xs">
            准确率: <span className="font-medium">{record.performance.accuracy_rate}%</span>
          </div>
          <div className="text-xs">
            一致性: <span className="font-medium">{record.performance.consistency_rate}%</span>
          </div>
        </div>
      )
    },
    {
      title: '使用次数',
      dataIndex: 'usage_count',
      key: 'usage_count',
      render: (count: number) => (
        <Badge count={count} showZero style={{ backgroundColor: '#52c41a' }} />
      )
    },
    {
      title: '状态',
      key: 'status',
      render: (record: ScoringStrategy) => (
        <div className="space-y-1">
          {record.is_default && <Tag color="gold">默认</Tag>}
          {record.is_active ? (
            <Tag color="green">启用</Tag>
          ) : (
            <Tag color="red">禁用</Tag>
          )}
        </div>
      )
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: ScoringStrategy) => (
        <Space size="small">
          <Tooltip title="选择策略">
            <Button
              size="small"
              type={selectedStrategy?.id === record.id ? 'primary' : 'default'}
              icon={<CheckCircleOutlined />}
              onClick={() => handleSelectStrategy(record)}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditStrategy(record)}
            />
          </Tooltip>
          <Tooltip title="复制">
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={() => {
                const copied = { ...record, id: Date.now().toString(), name: `${record.name} (副本)` };
                setStrategies(prev => [...prev, copied]);
              }}
            />
          </Tooltip>
          <Tooltip title="删除">
            <Button
              size="small"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteStrategy(record.id)}
              disabled={record.is_default}
            />
          </Tooltip>
        </Space>
      )
    }
  ];

  const renderStrategyForm = () => (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSaveStrategy}
      initialValues={{
        strictness: 80,
        accuracy_weight: 40,
        completeness_weight: 30,
        logic_weight: 20,
        expression_weight: 10,
        auto_apply_threshold: 85,
        keyword_matching: true,
        semantic_analysis: true,
        structure_analysis: false
      }}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name="name"
            label="策略名称"
            rules={[{ required: true, message: '请输入策略名称' }]}
          >
            <Input placeholder="请输入策略名称" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name="subject"
            label="适用学科"
            rules={[{ required: true, message: '请选择适用学科' }]}
          >
            <Select
              placeholder="请选择学科"
              options={[
                { value: '语文', label: '语文' },
                { value: '数学', label: '数学' },
                { value: '英语', label: '英语' },
                { value: '物理', label: '物理' },
                { value: '化学', label: '化学' },
                { value: '生物', label: '生物' },
                { value: '历史', label: '历史' },
                { value: '地理', label: '地理' },
                { value: '政治', label: '政治' }
              ]}
            />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name="description"
        label="策略描述"
        rules={[{ required: true, message: '请输入策略描述' }]}
      >
        <Input.TextArea rows={3} placeholder="请描述该策略的适用场景和特点" />
      </Form.Item>

      <Row gutter={16}>
        <Col span={8}>
          <Form.Item
            name="type"
            label="题型类型"
            rules={[{ required: true, message: '请选择题型类型' }]}
          >
            <Select
              placeholder="请选择题型"
              options={[
                { value: 'objective', label: '客观题' },
                { value: 'subjective', label: '主观题' },
                { value: 'mixed', label: '混合题' }
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            name="difficulty"
            label="难度等级"
            rules={[{ required: true, message: '请选择难度等级' }]}
          >
            <Select
              placeholder="请选择难度"
              options={[
                { value: 'easy', label: '简单' },
                { value: 'medium', label: '中等' },
                { value: 'hard', label: '困难' }
              ]}
            />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="is_default" valuePropName="checked">
            <Switch checkedChildren="默认策略" unCheckedChildren="普通策略" />
          </Form.Item>
        </Col>
      </Row>

      <Divider>评分权重配置</Divider>
      
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="accuracy_weight" label="准确性权重 (%)">
            <Slider min={0} max={100} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="completeness_weight" label="完整性权重 (%)">
            <Slider min={0} max={100} />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="logic_weight" label="逻辑性权重 (%)">
            <Slider min={0} max={100} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="expression_weight" label="表达性权重 (%)">
            <Slider min={0} max={100} />
          </Form.Item>
        </Col>
      </Row>

      <Divider>AI分析配置</Divider>
      
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item name="strictness" label="严格程度">
            <Slider min={0} max={100} marks={{ 0: '宽松', 50: '适中', 100: '严格' }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item name="auto_apply_threshold" label="自动应用阈值 (%)">
            <Slider min={50} max={100} />
          </Form.Item>
        </Col>
      </Row>
      
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item name="keyword_matching" valuePropName="checked">
            <Switch checkedChildren="关键词匹配" unCheckedChildren="关键词匹配" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="semantic_analysis" valuePropName="checked">
            <Switch checkedChildren="语义分析" unCheckedChildren="语义分析" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item name="structure_analysis" valuePropName="checked">
            <Switch checkedChildren="结构分析" unCheckedChildren="结构分析" />
          </Form.Item>
        </Col>
      </Row>

      <Collapse>
        <Panel header="扣分规则" key="penalty">
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="spelling_error" label="拼写错误扣分">
                <InputNumber min={0} max={10} step={0.5} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="grammar_error" label="语法错误扣分">
                <InputNumber min={0} max={10} step={0.5} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="logic_error" label="逻辑错误扣分">
                <InputNumber min={0} max={10} step={0.5} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="incomplete_answer" label="答案不完整扣分">
                <InputNumber min={0} max={10} step={0.5} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
        </Panel>
        
        <Panel header="加分规则" key="bonus">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item name="extra_points" label="额外要点加分">
                <InputNumber min={0} max={5} step={0.5} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="creative_thinking" label="创新思维加分">
                <InputNumber min={0} max={5} step={0.5} className="w-full" />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item name="clear_expression" label="表达清晰加分">
                <InputNumber min={0} max={5} step={0.5} className="w-full" />
              </Form.Item>
            </Col>
          </Row>
        </Panel>
      </Collapse>

      <div className="flex justify-end gap-2 mt-6">
        <Button onClick={() => { setShowCreateModal(false); setShowEditModal(false); }}>
          取消
        </Button>
        <Button type="primary" htmlType="submit" loading={loading} icon={<SaveOutlined />}>
          保存策略
        </Button>
      </div>
    </Form>
  );

  return (
    <div className="space-y-4">
      {/* 当前选中策略概览 */}
      {selectedStrategy && (
        <Card
          size="small"
          title={
            <div className="flex items-center gap-2">
              <Target className="w-4 h-4 text-blue-500" />
              <span>当前评分策略</span>
            </div>
          }
          extra={
            <Button
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditStrategy(selectedStrategy)}
            >
              编辑
            </Button>
          }
        >
          <Row gutter={16}>
            <Col span={12}>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Text strong>{selectedStrategy.name}</Text>
                  <Tag color={getTypeColor(selectedStrategy.type)}>
                    {selectedStrategy.type === 'objective' ? '客观题' : 
                     selectedStrategy.type === 'subjective' ? '主观题' : '混合题'}
                  </Tag>
                  <Tag color={getDifficultyColor(selectedStrategy.difficulty)}>
                    {selectedStrategy.difficulty === 'easy' ? '简单' : 
                     selectedStrategy.difficulty === 'medium' ? '中等' : '困难'}
                  </Tag>
                </div>
                <Text type="secondary">{selectedStrategy.description}</Text>
              </div>
            </Col>
            <Col span={12}>
              <Row gutter={8}>
                <Col span={6}>
                  <Statistic
                    title="准确率"
                    value={selectedStrategy.performance.accuracy_rate}
                    suffix="%"
                    valueStyle={{ fontSize: '14px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="一致性"
                    value={selectedStrategy.performance.consistency_rate}
                    suffix="%"
                    valueStyle={{ fontSize: '14px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="效率"
                    value={selectedStrategy.performance.efficiency_score}
                    suffix="%"
                    valueStyle={{ fontSize: '14px' }}
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="满意度"
                    value={selectedStrategy.performance.teacher_satisfaction}
                    suffix="/5"
                    valueStyle={{ fontSize: '14px' }}
                  />
                </Col>
              </Row>
            </Col>
          </Row>
        </Card>
      )}

      {/* 策略管理 */}
      <Card
        title={
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-purple-500" />
            <span>智能评分策略管理</span>
          </div>
        }
        extra={
          <Space>
            <Button icon={<ImportOutlined />} size="small">
              导入
            </Button>
            <Button icon={<ExportOutlined />} size="small">
              导出
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={handleCreateStrategy}
            >
              新建策略
            </Button>
          </Space>
        }
      >
        <Table
          columns={columns}
          dataSource={strategies}
          rowKey="id"
          size="small"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 条策略`
          }}
        />
      </Card>

      {/* 创建策略模态框 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <PlusOutlined className="text-green-500" />
            <span>创建评分策略</span>
          </div>
        }
        open={showCreateModal}
        onCancel={() => setShowCreateModal(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        {renderStrategyForm()}
      </Modal>

      {/* 编辑策略模态框 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <EditOutlined className="text-blue-500" />
            <span>编辑评分策略</span>
          </div>
        }
        open={showEditModal}
        onCancel={() => setShowEditModal(false)}
        footer={null}
        width={800}
        destroyOnClose
      >
        {renderStrategyForm()}
      </Modal>
    </div>
  );
};

export default IntelligentScoringStrategy;