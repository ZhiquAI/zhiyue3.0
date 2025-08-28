import React, { useState, useEffect } from 'react';
import {
  Card,
  Tabs,
  Button,
  Form,
  Input,
  Select,
  InputNumber,
  Upload,
  Table,
  Tag,
  Progress,
  Modal,
  Descriptions,
  Row,
  Col,
  Statistic,
  Timeline,
  Chart,
  message,
  Space,
  Tooltip,
  Badge,
  Popconfirm
} from 'antd';
import {
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  EyeOutlined,
  UploadOutlined,
  RocketOutlined,
  CompareArrowsOutlined,
  BarChartOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { Line } from '@ant-design/plots';

const { TabPane } = Tabs;
const { Option } = Select;
const { TextArea } = Input;
const { Dragger } = Upload;

interface TrainingConfig {
  model_type: string;
  model_name: string;
  dataset_path: string;
  epochs: number;
  batch_size: number;
  learning_rate: number;
  validation_split: number;
  early_stopping_patience: number;
  max_sequence_length: number;
  num_labels?: number;
  custom_parameters?: any;
}

interface TrainingRecord {
  training_id: string;
  model_type: string;
  model_name: string;
  status: string;
  config: TrainingConfig;
  metrics?: any[];
  best_score?: number;
  created_at: string;
  completed_at?: string;
  error_message?: string;
}

interface ModelInfo {
  id: string;
  name: string;
  version: string;
  model_type: string;
  status: string;
  description: string;
  author: string;
  model_size_mb: number;
  performance_metrics?: any;
  created_at: string;
}

interface DeploymentInfo {
  id: string;
  model_id: string;
  environment: string;
  endpoint_url?: string;
  status: string;
  deployed_at?: string;
  health_status: string;
  request_count: number;
  avg_response_time_ms: number;
  error_rate: number;
}

const ModelTrainingDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('training');
  const [trainingRecords, setTrainingRecords] = useState<TrainingRecord[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [deployments, setDeployments] = useState<DeploymentInfo[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [trainingForm] = Form.useForm();
  const [registrationForm] = Form.useForm();
  const [deploymentForm] = Form.useForm();

  // 模态框状态
  const [metricsModalVisible, setMetricsModalVisible] = useState<boolean>(false);
  const [compareModalVisible, setCompareModalVisible] = useState<boolean>(false);
  const [deployModalVisible, setDeployModalVisible] = useState<boolean>(false);
  const [selectedTrainingId, setSelectedTrainingId] = useState<string>('');
  const [selectedModelId, setSelectedModelId] = useState<string>('');
  const [selectedModels, setSelectedModels] = useState<string[]>([]);

  // 图表数据
  const [metricsData, setMetricsData] = useState<any>([]);
  const [comparisonData, setComparisonData] = useState<any>(null);

  // 支持的模型类型
  const modelTypes = [
    { value: 'text_classification', label: '文本分类' },
    { value: 'semantic_similarity', label: '语义相似度' },
    { value: 'essay_evaluator', label: '作文评估' },
    { value: 'math_evaluator', label: '数学评估' },
    { value: 'handwriting_assessor', label: '手写评估' },
    { value: 'multi_task', label: '多任务学习' },
    { value: 'adaptive_attention', label: '自适应注意力' }
  ];

  const environments = [
    { value: 'development', label: '开发环境' },
    { value: 'staging', label: '测试环境' },
    { value: 'production', label: '生产环境' },
    { value: 'ab_testing', label: 'A/B测试' }
  ];

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'training') {
        await loadTrainingRecords();
      } else if (activeTab === 'models') {
        await loadModels();
      } else if (activeTab === 'deployment') {
        await loadDeployments();
      }
    } catch (error) {
      message.error('加载数据失败');
    } finally {
      setLoading(false);
    }
  };

  const loadTrainingRecords = async () => {
    // API调用获取训练记录
    const response = await fetch('/api/model-training/training-records');
    const data = await response.json();
    setTrainingRecords(data.records || []);
  };

  const loadModels = async () => {
    // API调用获取模型列表
    const response = await fetch('/api/model-training/models');
    const data = await response.json();
    setModels(data.models || []);
  };

  const loadDeployments = async () => {
    // API调用获取部署列表
    const response = await fetch('/api/model-training/deployments');
    const data = await response.json();
    setDeployments(data.deployments || []);
  };

  const handleStartTraining = async (values: any) => {
    try {
      setLoading(true);
      const response = await fetch('/api/model-training/start-training', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const result = await response.json();
        message.success(`训练已启动，训练ID: ${result.training_id}`);
        trainingForm.resetFields();
        loadTrainingRecords();
      } else {
        const error = await response.json();
        message.error(`启动训练失败: ${error.detail}`);
      }
    } catch (error) {
      message.error('启动训练失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterModel = async (values: any, modelFile: File) => {
    try {
      setLoading(true);
      const formData = new FormData();
      
      // 添加模型文件
      formData.append('model_file', modelFile);
      
      // 添加其他字段
      Object.keys(values).forEach(key => {
        if (values[key] !== undefined && values[key] !== null) {
          if (typeof values[key] === 'object') {
            formData.append(key, JSON.stringify(values[key]));
          } else {
            formData.append(key, values[key]);
          }
        }
      });

      const response = await fetch('/api/model-training/register-model', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        message.success(`模型注册成功，ID: ${result.model_id}`);
        registrationForm.resetFields();
        loadModels();
      } else {
        const error = await response.json();
        message.error(`注册失败: ${error.detail}`);
      }
    } catch (error) {
      message.error('模型注册失败');
    } finally {
      setLoading(false);
    }
  };

  const handleDeployModel = async (values: any) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/model-training/models/${selectedModelId}/deploy`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(values),
      });

      if (response.ok) {
        const result = await response.json();
        message.success(`模型部署成功，部署ID: ${result.deployment_id}`);
        setDeployModalVisible(false);
        deploymentForm.resetFields();
        loadDeployments();
      } else {
        const error = await response.json();
        message.error(`部署失败: ${error.detail}`);
      }
    } catch (error) {
      message.error('模型部署失败');
    } finally {
      setLoading(false);
    }
  };

  const showMetrics = async (trainingId: string) => {
    try {
      const response = await fetch(`/api/model-training/training-metrics/${trainingId}`);
      const data = await response.json();
      
      if (data.epochs && data.epochs.length > 0) {
        // 准备图表数据
        const chartData = data.epochs.map((epoch: number, index: number) => [
          { epoch, type: 'Train Loss', value: data.losses.train[index] },
          { epoch, type: 'Val Loss', value: data.losses.validation[index] },
          { epoch, type: 'Train Acc', value: data.accuracies.train[index] },
          { epoch, type: 'Val Acc', value: data.accuracies.validation[index] }
        ]).flat();
        
        setMetricsData(chartData);
      }
      
      setSelectedTrainingId(trainingId);
      setMetricsModalVisible(true);
    } catch (error) {
      message.error('获取训练指标失败');
    }
  };

  const compareModels = async () => {
    if (selectedModels.length < 2) {
      message.warning('请选择至少2个模型进行比较');
      return;
    }

    try {
      const response = await fetch('/api/model-training/models/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ model_ids: selectedModels }),
      });

      const data = await response.json();
      setComparisonData(data);
      setCompareModalVisible(true);
    } catch (error) {
      message.error('模型比较失败');
    }
  };

  const cancelTraining = async (trainingId: string) => {
    try {
      const response = await fetch(`/api/model-training/cancel-training/${trainingId}`, {
        method: 'POST',
      });

      if (response.ok) {
        message.success('训练已取消');
        loadTrainingRecords();
      } else {
        message.error('取消训练失败');
      }
    } catch (error) {
      message.error('取消训练失败');
    }
  };

  const undeployModel = async (deploymentId: string) => {
    try {
      const response = await fetch(`/api/model-training/deployments/${deploymentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        message.success('模型已取消部署');
        loadDeployments();
      } else {
        message.error('取消部署失败');
      }
    } catch (error) {
      message.error('取消部署失败');
    }
  };

  const getStatusTag = (status: string) => {
    const statusConfig = {
      pending: { color: 'orange', icon: <ClockCircleOutlined /> },
      training: { color: 'blue', icon: <PlayCircleOutlined /> },
      completed: { color: 'green', icon: <CheckCircleOutlined /> },
      failed: { color: 'red', icon: <ExclamationCircleOutlined /> },
      deployed: { color: 'cyan', icon: <RocketOutlined /> },
      ready: { color: 'purple', icon: <CheckCircleOutlined /> }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || { color: 'default', icon: null };
    return (
      <Tag color={config.color} icon={config.icon}>
        {status.toUpperCase()}
      </Tag>
    );
  };

  const trainingColumns = [
    {
      title: '模型名称',
      dataIndex: 'model_name',
      key: 'model_name',
      render: (text: string, record: TrainingRecord) => (
        <div>
          <div style={{ fontWeight: 500 }}>{text}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>{record.model_type}</div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '最佳分数',
      dataIndex: 'best_score',
      key: 'best_score',
      render: (score: number) => score ? score.toFixed(4) : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: TrainingRecord) => (
        <Space>
          <Tooltip title="查看指标">
            <Button 
              type="text" 
              icon={<BarChartOutlined />}
              onClick={() => showMetrics(record.training_id)}
            />
          </Tooltip>
          {record.status === 'training' && (
            <Popconfirm
              title="确定要取消这个训练吗？"
              onConfirm={() => cancelTraining(record.training_id)}
            >
              <Tooltip title="取消训练">
                <Button type="text" danger icon={<StopOutlined />} />
              </Tooltip>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const modelColumns = [
    {
      title: '模型信息',
      key: 'info',
      render: (record: ModelInfo) => (
        <div>
          <div style={{ fontWeight: 500 }}>{record.name}:{record.version}</div>
          <div style={{ fontSize: '12px', color: '#666' }}>
            {record.model_type} | {record.model_size_mb.toFixed(1)}MB
          </div>
        </div>
      ),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '作者',
      dataIndex: 'author',
      key: 'author',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: ModelInfo) => (
        <Space>
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} />
          </Tooltip>
          <Tooltip title="部署模型">
            <Button 
              type="text" 
              icon={<RocketOutlined />}
              onClick={() => {
                setSelectedModelId(record.id);
                setDeployModalVisible(true);
              }}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const deploymentColumns = [
    {
      title: '模型ID',
      dataIndex: 'model_id',
      key: 'model_id',
      render: (text: string) => text.substring(0, 8) + '...',
    },
    {
      title: '环境',
      dataIndex: 'environment',
      key: 'environment',
      render: (env: string) => (
        <Tag color={env === 'production' ? 'red' : env === 'staging' ? 'orange' : 'blue'}>
          {env.toUpperCase()}
        </Tag>
      ),
    },
    {
      title: '状态',
      key: 'status',
      render: (record: DeploymentInfo) => (
        <Space>
          {getStatusTag(record.status)}
          <Badge 
            status={record.health_status === 'healthy' ? 'success' : 'error'} 
            text={record.health_status}
          />
        </Space>
      ),
    },
    {
      title: '性能指标',
      key: 'metrics',
      render: (record: DeploymentInfo) => (
        <div style={{ fontSize: '12px' }}>
          <div>请求数: {record.request_count}</div>
          <div>平均响应: {record.avg_response_time_ms}ms</div>
          <div>错误率: {(record.error_rate * 100).toFixed(2)}%</div>
        </div>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (record: DeploymentInfo) => (
        <Space>
          <Tooltip title="查看详情">
            <Button type="text" icon={<EyeOutlined />} />
          </Tooltip>
          <Popconfirm
            title="确定要取消部署吗？"
            onConfirm={() => undeployModel(record.id)}
          >
            <Tooltip title="取消部署">
              <Button type="text" danger icon={<StopOutlined />} />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  const metricsChartConfig = {
    data: metricsData,
    xField: 'epoch',
    yField: 'value',
    seriesField: 'type',
    smooth: true,
    point: {
      size: 3,
    },
    legend: {
      position: 'top' as const,
    },
    color: ['#ff4d4f', '#1890ff', '#52c41a', '#722ed1'],
  };

  return (
    <div style={{ padding: '24px', background: '#f5f5f5', minHeight: '100vh' }}>
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={6}>
          <Card>
            <Statistic 
              title="进行中的训练" 
              value={trainingRecords.filter(r => r.status === 'training').length}
              prefix={<PlayCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="已注册模型" 
              value={models.length}
              prefix={<SettingOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="活跃部署" 
              value={deployments.filter(d => d.status === 'deployed').length}
              prefix={<RocketOutlined />}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic 
              title="平均响应时间" 
              value={deployments.length > 0 ? 
                (deployments.reduce((acc, d) => acc + d.avg_response_time_ms, 0) / deployments.length).toFixed(0) : 0
              }
              suffix="ms"
              prefix={<BarChartOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          tabBarExtraContent={
            activeTab === 'models' && (
              <Space>
                <Button 
                  icon={<CompareArrowsOutlined />}
                  onClick={compareModels}
                  disabled={selectedModels.length < 2}
                >
                  比较模型 ({selectedModels.length})
                </Button>
              </Space>
            )
          }
        >
          <TabPane tab="模型训练" key="training">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card title="开始新训练" size="small">
                  <Form
                    form={trainingForm}
                    layout="vertical"
                    onFinish={handleStartTraining}
                    size="small"
                  >
                    <Form.Item
                      name="model_type"
                      label="模型类型"
                      rules={[{ required: true, message: '请选择模型类型' }]}
                    >
                      <Select placeholder="选择模型类型">
                        {modelTypes.map(type => (
                          <Option key={type.value} value={type.value}>
                            {type.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="model_name"
                      label="模型名称"
                      rules={[{ required: true, message: '请输入模型名称' }]}
                    >
                      <Input placeholder="输入模型名称" />
                    </Form.Item>

                    <Form.Item
                      name="dataset_path"
                      label="数据集路径"
                      rules={[{ required: true, message: '请输入数据集路径' }]}
                    >
                      <Input placeholder="输入数据集文件路径" />
                    </Form.Item>

                    <Row gutter={8}>
                      <Col span={12}>
                        <Form.Item
                          name="epochs"
                          label="训练轮数"
                          initialValue={10}
                        >
                          <InputNumber min={1} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="batch_size"
                          label="批次大小"
                          initialValue={32}
                        >
                          <InputNumber min={1} max={256} style={{ width: '100%' }} />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Form.Item
                      name="learning_rate"
                      label="学习率"
                      initialValue={2e-5}
                    >
                      <InputNumber 
                        min={1e-6} 
                        max={1e-2} 
                        step={1e-5} 
                        style={{ width: '100%' }}
                        formatter={value => `${value}`}
                      />
                    </Form.Item>

                    <Form.Item>
                      <Button 
                        type="primary" 
                        htmlType="submit" 
                        loading={loading}
                        icon={<PlayCircleOutlined />}
                        block
                      >
                        开始训练
                      </Button>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
              <Col span={16}>
                <Card title="训练记录" size="small">
                  <Table
                    columns={trainingColumns}
                    dataSource={trainingRecords}
                    rowKey="training_id"
                    loading={loading}
                    size="small"
                    pagination={{ pageSize: 10 }}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="模型注册" key="models">
            <Row gutter={[16, 16]}>
              <Col span={8}>
                <Card title="注册新模型" size="small">
                  <Form
                    form={registrationForm}
                    layout="vertical"
                    size="small"
                  >
                    <Form.Item
                      name="name"
                      label="模型名称"
                      rules={[{ required: true, message: '请输入模型名称' }]}
                    >
                      <Input placeholder="输入模型名称" />
                    </Form.Item>

                    <Form.Item
                      name="version"
                      label="版本号"
                      rules={[
                        { required: true, message: '请输入版本号' },
                        { pattern: /^\d+\.\d+\.\d+$/, message: '版本号格式: x.y.z' }
                      ]}
                    >
                      <Input placeholder="例如: 1.0.0" />
                    </Form.Item>

                    <Form.Item
                      name="model_type"
                      label="模型类型"
                      rules={[{ required: true, message: '请选择模型类型' }]}
                    >
                      <Select placeholder="选择模型类型">
                        {modelTypes.map(type => (
                          <Option key={type.value} value={type.value}>
                            {type.label}
                          </Option>
                        ))}
                      </Select>
                    </Form.Item>

                    <Form.Item
                      name="description"
                      label="描述"
                      rules={[{ required: true, message: '请输入模型描述' }]}
                    >
                      <TextArea rows={2} placeholder="描述模型用途和特性" />
                    </Form.Item>

                    <Form.Item
                      name="tags"
                      label="标签"
                    >
                      <Select mode="tags" placeholder="添加标签">
                        <Option value="nlp">NLP</Option>
                        <Option value="cv">计算机视觉</Option>
                        <Option value="classification">分类</Option>
                        <Option value="regression">回归</Option>
                      </Select>
                    </Form.Item>

                    <Form.Item label="模型文件">
                      <Dragger
                        name="model_file"
                        accept=".pt,.pth,.pkl"
                        beforeUpload={() => false}
                        maxCount={1}
                      >
                        <p className="ant-upload-drag-icon">
                          <UploadOutlined />
                        </p>
                        <p className="ant-upload-text">点击或拖拽上传模型文件</p>
                        <p className="ant-upload-hint">支持 .pt, .pth, .pkl 格式</p>
                      </Dragger>
                    </Form.Item>
                  </Form>
                </Card>
              </Col>
              <Col span={16}>
                <Card 
                  title="模型列表" 
                  size="small"
                  extra={
                    selectedModels.length > 0 && (
                      <Tag color="blue">{selectedModels.length} 个模型已选择</Tag>
                    )
                  }
                >
                  <Table
                    columns={modelColumns}
                    dataSource={models}
                    rowKey="id"
                    loading={loading}
                    size="small"
                    pagination={{ pageSize: 10 }}
                    rowSelection={{
                      selectedRowKeys: selectedModels,
                      onChange: setSelectedModels,
                    }}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="模型部署" key="deployment">
            <Card title="部署列表" size="small">
              <Table
                columns={deploymentColumns}
                dataSource={deployments}
                rowKey="id"
                loading={loading}
                size="small"
                pagination={{ pageSize: 15 }}
              />
            </Card>
          </TabPane>
        </Tabs>
      </Card>

      {/* 训练指标模态框 */}
      <Modal
        title="训练指标"
        visible={metricsModalVisible}
        onCancel={() => setMetricsModalVisible(false)}
        footer={null}
        width={800}
      >
        {metricsData.length > 0 ? (
          <Line {...metricsChartConfig} height={400} />
        ) : (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            暂无训练指标数据
          </div>
        )}
      </Modal>

      {/* 模型比较模态框 */}
      <Modal
        title="模型比较"
        visible={compareModalVisible}
        onCancel={() => setCompareModalVisible(false)}
        footer={null}
        width={1000}
      >
        {comparisonData && (
          <div>
            <Row gutter={[16, 16]}>
              {comparisonData.models.map((model: any, index: number) => (
                <Col span={12} key={model.id}>
                  <Card size="small">
                    <Descriptions title={`${model.name}:${model.version}`} column={1} size="small">
                      <Descriptions.Item label="类型">{model.model_type}</Descriptions.Item>
                      <Descriptions.Item label="大小">{model.model_size_mb}MB</Descriptions.Item>
                      {model.performance_metrics && (
                        <Descriptions.Item label="准确率">
                          {(model.performance_metrics.accuracy * 100).toFixed(2)}%
                        </Descriptions.Item>
                      )}
                    </Descriptions>
                  </Card>
                </Col>
              ))}
            </Row>
            {comparisonData.recommendations && (
              <Card title="推荐" size="small" style={{ marginTop: 16 }}>
                <Timeline size="small">
                  {comparisonData.recommendations.map((rec: string, index: number) => (
                    <Timeline.Item key={index}>{rec}</Timeline.Item>
                  ))}
                </Timeline>
              </Card>
            )}
          </div>
        )}
      </Modal>

      {/* 部署模态框 */}
      <Modal
        title="部署模型"
        visible={deployModalVisible}
        onCancel={() => setDeployModalVisible(false)}
        onOk={() => deploymentForm.submit()}
        confirmLoading={loading}
      >
        <Form
          form={deploymentForm}
          layout="vertical"
          onFinish={handleDeployModel}
        >
          <Form.Item
            name="environment"
            label="部署环境"
            rules={[{ required: true, message: '请选择部署环境' }]}
          >
            <Select placeholder="选择部署环境">
              {environments.map(env => (
                <Option key={env.value} value={env.value}>
                  {env.label}
                </Option>
              ))}
            </Select>
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="replicas"
                label="副本数"
                initialValue={1}
              >
                <InputNumber min={1} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="gpu_enabled"
                label="启用GPU"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="cpu_limit"
                label="CPU限制"
                initialValue="1000m"
              >
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="memory_limit"
                label="内存限制"
                initialValue="2Gi"
              >
                <Input />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
};

export default ModelTrainingDashboard;