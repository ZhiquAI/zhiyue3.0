import React, { useState, useCallback, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Progress,
  Tabs,
  Form,
  Input,
  Switch,
  Modal,
  List,
  Typography,
  Slider,
  Radio,
  Upload,
  Image,
  Tooltip,
  Badge,
  Descriptions,
  notification
} from 'antd';
import {
  RobotOutlined,
  EyeOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  ReloadOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  ThunderboltOutlined,
  TrophyOutlined,
  StarOutlined,
  FireOutlined,
  DatabaseOutlined,
  ApiOutlined
} from '@ant-design/icons';

const { TabPane } = Tabs;
const { Text, Title } = Typography;

// AI模型类型
type ModelType = 'cnn' | 'rnn' | 'transformer' | 'hybrid' | 'ensemble';

// 模型状态
type ModelStatus = 'idle' | 'loading' | 'running' | 'completed' | 'error';

// AI识别模型
interface RecognitionModel {
  id: string;
  name: string;
  type: ModelType;
  version: string;
  accuracy: number;
  speed: number; // ms per character
  confidence: number;
  status: ModelStatus;
  description: string;
  capabilities: string[];
  lastTrained: Date;
  modelSize: number; // MB
  supportedLanguages: string[];
  specialties: string[];
  performance: {
    precision: number;
    recall: number;
    f1Score: number;
    processingTime: number;
  };
  config: {
    enabled: boolean;
    weight: number;
    threshold: number;
    maxRetries: number;
    timeout: number;
  };
}

// 识别结果
interface RecognitionResult {
  id: string;
  modelId: string;
  text: string;
  confidence: number;
  processingTime: number;
  boundingBoxes: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    confidence: number;
  }>;
  alternatives: Array<{
    text: string;
    confidence: number;
  }>;
  metadata: {
    imageSize: { width: number; height: number };
    dpi: number;
    colorMode: string;
    noiseLevel: number;
  };
}

// 集成识别结果
interface EnsembleResult {
  id: string;
  finalText: string;
  confidence: number;
  consensusLevel: number;
  modelResults: RecognitionResult[];
  votingStrategy: 'majority' | 'weighted' | 'confidence_based' | 'hybrid';
  processingTime: number;
  qualityScore: number;
  improvements: string[];
}

const MultiModelRecognitionEngine: React.FC = () => {
  const [models, setModels] = useState<RecognitionModel[]>([]);
  const [recognitionResults, setRecognitionResults] = useState<EnsembleResult[]>([]);
  const [activeTab, setActiveTab] = useState('models');
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [resultDetailModalVisible, setResultDetailModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<EnsembleResult | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [ensembleConfig, setEnsembleConfig] = useState({
    votingStrategy: 'weighted' as const,
    minConsensus: 0.7,
    confidenceThreshold: 0.8,
    enableFallback: true,
    maxProcessingTime: 30000
  });
  
  const [configForm] = Form.useForm();

  // 生成模拟AI模型
  const generateMockModels = useCallback(() => {
    const modelTypes: ModelType[] = ['cnn', 'rnn', 'transformer', 'hybrid', 'ensemble'];
    const modelNames = {
      cnn: ['ResNet-OCR', 'VGG-Text', 'DenseNet-Handwriting'],
      rnn: ['LSTM-Writer', 'GRU-Script', 'BiLSTM-Recognition'],
      transformer: ['BERT-OCR', 'GPT-Handwriting', 'Vision-Transformer'],
      hybrid: ['CNN-RNN-Fusion', 'Multi-Scale-Net', 'Attention-OCR'],
      ensemble: ['Voting-Ensemble', 'Stacking-Model', 'Boosting-OCR']
    };
    
    const mockModels: RecognitionModel[] = [];
    
    modelTypes.forEach(type => {
      modelNames[type].forEach((name, index) => {
        const accuracy = 0.85 + Math.random() * 0.12;
        const speed = 50 + Math.random() * 200;
        
        mockModels.push({
          id: `model_${type}_${index + 1}`,
          name,
          type,
          version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}`,
          accuracy,
          speed,
          confidence: accuracy * 0.95,
          status: 'idle',
          description: {
            cnn: '基于卷积神经网络的图像识别模型，擅长处理清晰的印刷体和规整手写体',
            rnn: '基于循环神经网络的序列识别模型，擅长处理连续手写体和草书',
            transformer: '基于注意力机制的现代模型，具有强大的上下文理解能力',
            hybrid: '融合多种架构的混合模型，平衡准确性和速度',
            ensemble: '集成多个模型的投票系统，通过模型协作提高准确性'
          }[type],
          capabilities: {
            cnn: ['印刷体识别', '数字识别', '符号识别'],
            rnn: ['连续手写体', '草书识别', '上下文推理'],
            transformer: ['语义理解', '错误纠正', '多语言支持'],
            hybrid: ['多尺度识别', '噪声处理', '实时识别'],
            ensemble: ['高精度识别', '置信度评估', '结果融合']
          }[type],
          lastTrained: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
          modelSize: 50 + Math.random() * 200,
          supportedLanguages: ['中文', '英文', '数字'],
          specialties: {
            cnn: ['清晰图像', '标准字体'],
            rnn: ['连笔字', '个性化手写'],
            transformer: ['复杂语境', '多语言混合'],
            hybrid: ['模糊图像', '多样化输入'],
            ensemble: ['高要求场景', '关键应用']
          }[type],
          performance: {
            precision: accuracy,
            recall: accuracy * 0.98,
            f1Score: accuracy * 0.99,
            processingTime: speed
          },
          config: {
            enabled: true,
            weight: type === 'ensemble' ? 1.5 : type === 'transformer' ? 1.2 : 1.0,
            threshold: 0.7,
            maxRetries: 3,
            timeout: 10000
          }
        });
      });
    });
    
    setModels(mockModels);
  }, []);

  // 运行多模型识别
  const runMultiModelRecognition = useCallback(async () => {
    if (uploadedImages.length === 0) {
      notification.warning({
        message: '请先上传图片',
        description: '需要上传待识别的手写体图片'
      });
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const enabledModels = models.filter(m => m.config.enabled);
      
      if (enabledModels.length === 0) {
        notification.error({
          message: '没有启用的模型',
          description: '请至少启用一个识别模型'
        });
        return;
      }
      
      // 更新模型状态为运行中
      setModels(prev => prev.map(model => 
        model.config.enabled ? { ...model, status: 'running' as ModelStatus } : model
      ));
      
      // 模拟识别过程
      const results: EnsembleResult[] = [];
      
      for (let i = 0; i < uploadedImages.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟处理时间
        
        // 为每个模型生成识别结果
        const modelResults: RecognitionResult[] = enabledModels.map(model => {
          const confidence = 0.7 + Math.random() * 0.25;
          const texts = [
            '这是一段手写文字',
            '识别测试内容',
            '多模型协同识别',
            '智能阅卷系统',
            '手写体识别引擎'
          ];
          const text = texts[Math.floor(Math.random() * texts.length)];
          
          return {
            id: `result_${model.id}_${i}`,
            modelId: model.id,
            text,
            confidence,
            processingTime: model.speed + Math.random() * 100,
            boundingBoxes: [
              {
                x: 10,
                y: 10,
                width: 200,
                height: 30,
                text,
                confidence
              }
            ],
            alternatives: [
              { text: text + '(备选1)', confidence: confidence * 0.9 },
              { text: text + '(备选2)', confidence: confidence * 0.8 }
            ],
            metadata: {
              imageSize: { width: 800, height: 600 },
              dpi: 300,
              colorMode: 'RGB',
              noiseLevel: Math.random() * 0.3
            }
          };
        });
        
        // 集成结果
        const consensusLevel = Math.random() * 0.3 + 0.7;
        const finalText = modelResults[0].text; // 简化：使用第一个结果
        const avgConfidence = modelResults.reduce((sum, r) => sum + r.confidence, 0) / modelResults.length;
        
        const ensembleResult: EnsembleResult = {
          id: `ensemble_${i}`,
          finalText,
          confidence: avgConfidence,
          consensusLevel,
          modelResults,
          votingStrategy: ensembleConfig.votingStrategy,
          processingTime: Math.max(...modelResults.map(r => r.processingTime)),
          qualityScore: consensusLevel * avgConfidence,
          improvements: [
            consensusLevel > 0.9 ? '模型高度一致' : '存在分歧，建议人工复核',
            avgConfidence > 0.8 ? '识别置信度高' : '置信度偏低，建议重新识别',
            '建议优化图像质量以提高识别准确性'
          ]
        };
        
        results.push(ensembleResult);
      }
      
      setRecognitionResults(results);
      
      // 更新模型状态为完成
      setModels(prev => prev.map(model => 
        model.config.enabled ? { ...model, status: 'completed' as ModelStatus } : model
      ));
      
      notification.success({
        message: '识别完成',
        description: `成功识别 ${results.length} 张图片，平均置信度 ${(results.reduce((sum, r) => sum + r.confidence, 0) / results.length * 100).toFixed(1)}%`
      });
      
    } catch {
      notification.error({
        message: '识别失败',
        description: '多模型识别过程中发生错误'
      });
      
      // 更新模型状态为错误
      setModels(prev => prev.map(model => 
        model.config.enabled ? { ...model, status: 'error' as ModelStatus } : model
      ));
    } finally {
      setIsProcessing(false);
    }
  }, [uploadedImages, models, ensembleConfig]);

  // 更新模型配置
  const updateModelConfig = useCallback((modelId: string, config: Partial<RecognitionModel['config']>) => {
    setModels(prev => prev.map(model => 
      model.id === modelId 
        ? { ...model, config: { ...model.config, ...config } }
        : model
    ));
  }, []);

  // 重置所有模型状态
  const resetModelStatus = useCallback(() => {
    setModels(prev => prev.map(model => ({ ...model, status: 'idle' as ModelStatus })));
  }, []);

  // 初始化数据
  useEffect(() => {
    generateMockModels();
  }, [generateMockModels]);

  // 模型表格列
  const modelColumns = [
    {
      title: '模型名称',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: RecognitionModel) => (
        <Space>
          <Tag color={{
            cnn: 'blue',
            rnn: 'green', 
            transformer: 'purple',
            hybrid: 'orange',
            ensemble: 'red'
          }[record.type]}>
            {record.type.toUpperCase()}
          </Tag>
          <Text strong>{name}</Text>
          <Text type="secondary">({record.version})</Text>
        </Space>
      )
    },
    {
      title: '准确率',
      dataIndex: 'accuracy',
      key: 'accuracy',
      width: 120,
      render: (accuracy: number) => (
        <div>
          <Progress 
            percent={accuracy * 100} 
            size="small" 
            status={accuracy > 0.9 ? 'success' : accuracy > 0.8 ? 'active' : 'exception'}
            showInfo={false}
          />
          <Text>{(accuracy * 100).toFixed(1)}%</Text>
        </div>
      )
    },
    {
      title: '处理速度',
      dataIndex: 'speed',
      key: 'speed',
      width: 100,
      render: (speed: number) => (
        <Tooltip title="每字符处理时间">
          <Text>{speed.toFixed(0)}ms</Text>
        </Tooltip>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: ModelStatus) => {
        const config = {
          idle: { color: 'default', text: '空闲', icon: <ClockCircleOutlined /> },
          loading: { color: 'processing', text: '加载中', icon: <ReloadOutlined spin /> },
          running: { color: 'processing', text: '运行中', icon: <PlayCircleOutlined /> },
          completed: { color: 'success', text: '完成', icon: <CheckCircleOutlined /> },
          error: { color: 'error', text: '错误', icon: <ExclamationCircleOutlined /> }
        };
        const { color, text, icon } = config[status];
        return <Tag color={color} icon={icon}>{text}</Tag>;
      }
    },
    {
      title: '权重',
      dataIndex: ['config', 'weight'],
      key: 'weight',
      width: 100,
      render: (weight: number, record: RecognitionModel) => (
        <Slider
          min={0.1}
          max={2.0}
          step={0.1}
          value={weight}
          onChange={(value) => updateModelConfig(record.id, { weight: value })}
          style={{ width: '80px' }}
        />
      )
    },
    {
      title: '启用',
      dataIndex: ['config', 'enabled'],
      key: 'enabled',
      width: 80,
      render: (enabled: boolean, record: RecognitionModel) => (
        <Switch
          checked={enabled}
          onChange={(checked) => updateModelConfig(record.id, { enabled: checked })}
        />
      )
    }
  ];

  // 识别结果表格列
  const resultColumns = [
    {
      title: '图片',
      key: 'image',
      width: 100,
      render: (_: unknown, record: EnsembleResult, index: number) => (
        <Image
          width={60}
          height={40}
          src={uploadedImages[index] || '/api/placeholder/60/40'}
          style={{ objectFit: 'cover' }}
        />
      )
    },
    {
      title: '识别结果',
      dataIndex: 'finalText',
      key: 'finalText',
      ellipsis: true
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 120,
      render: (confidence: number) => (
        <div>
          <Progress 
            percent={confidence * 100} 
            size="small" 
            status={confidence > 0.8 ? 'success' : confidence > 0.6 ? 'active' : 'exception'}
            showInfo={false}
          />
          <Text>{(confidence * 100).toFixed(1)}%</Text>
        </div>
      )
    },
    {
      title: '一致性',
      dataIndex: 'consensusLevel',
      key: 'consensusLevel',
      width: 120,
      render: (consensusLevel: number) => (
        <div>
          <Progress 
            percent={consensusLevel * 100} 
            size="small" 
            status={consensusLevel > 0.8 ? 'success' : 'active'}
            showInfo={false}
          />
          <Text>{(consensusLevel * 100).toFixed(1)}%</Text>
        </div>
      )
    },
    {
      title: '质量评分',
      dataIndex: 'qualityScore',
      key: 'qualityScore',
      width: 100,
      render: (score: number) => (
        <Badge 
          count={score > 0.8 ? <StarOutlined style={{ color: '#faad14' }} /> : null}
        >
          <Text>{(score * 100).toFixed(0)}</Text>
        </Badge>
      )
    },
    {
      title: '处理时间',
      dataIndex: 'processingTime',
      key: 'processingTime',
      width: 100,
      render: (time: number) => <Text>{time.toFixed(0)}ms</Text>
    },
    {
      title: '操作',
      key: 'actions',
      width: 100,
      render: (_: unknown, record: EnsembleResult) => (
        <Button
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedResult(record);
            setResultDetailModalVisible(true);
          }}
        >
          详情
        </Button>
      )
    }
  ];

  // 统计数据
  const stats = {
    totalModels: models.length,
    enabledModels: models.filter(m => m.config.enabled).length,
    avgAccuracy: models.length > 0 ? models.reduce((sum, m) => sum + m.accuracy, 0) / models.length : 0,
    avgSpeed: models.length > 0 ? models.reduce((sum, m) => sum + m.speed, 0) / models.length : 0,
    totalResults: recognitionResults.length,
    avgConfidence: recognitionResults.length > 0 ? recognitionResults.reduce((sum, r) => sum + r.confidence, 0) / recognitionResults.length : 0
  };

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title={
          <Space>
            <RobotOutlined />
            <Title level={3} style={{ margin: 0 }}>多模型手写体识别引擎</Title>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setConfigModalVisible(true)}
            >
              集成配置
            </Button>
            <Button
              icon={<ReloadOutlined />}
              onClick={resetModelStatus}
            >
              重置状态
            </Button>
            <Button
              type="primary"
              icon={<ThunderboltOutlined />}
              loading={isProcessing}
              onClick={runMultiModelRecognition}
            >
              开始识别
            </Button>
          </Space>
        }
      >
        {/* 统计面板 */}
        <Row gutter={16} style={{ marginBottom: '24px' }}>
          <Col span={4}>
            <Statistic title="总模型数" value={stats.totalModels} prefix={<DatabaseOutlined />} />
          </Col>
          <Col span={4}>
            <Statistic title="启用模型" value={stats.enabledModels} prefix={<ApiOutlined />} />
          </Col>
          <Col span={4}>
            <Statistic 
              title="平均准确率" 
              value={stats.avgAccuracy * 100} 
              precision={1}
              suffix="%"
              prefix={<TrophyOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic 
              title="平均速度" 
              value={stats.avgSpeed} 
              precision={0}
              suffix="ms"
              prefix={<ThunderboltOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic title="识别结果" value={stats.totalResults} prefix={<EyeOutlined />} />
          </Col>
          <Col span={4}>
            <Statistic 
              title="平均置信度" 
              value={stats.avgConfidence * 100} 
              precision={1}
              suffix="%"
              prefix={<StarOutlined />}
            />
          </Col>
        </Row>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 模型管理 */}
          <TabPane tab="AI模型" key="models">
            <Table
              columns={modelColumns}
              dataSource={models}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </TabPane>

          {/* 图片上传 */}
          <TabPane tab="图片上传" key="upload">
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="上传待识别图片">
                  <Upload.Dragger
                    name="files"
                    multiple
                    accept="image/*"
                    showUploadList={false}
                    beforeUpload={(file) => {
                      const reader = new FileReader();
                      reader.onload = (e) => {
                        setUploadedImages(prev => [...prev, e.target?.result as string]);
                      };
                      reader.readAsDataURL(file);
                      return false;
                    }}
                  >
                    <p className="ant-upload-drag-icon">
                      <UploadOutlined />
                    </p>
                    <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                    <p className="ant-upload-hint">支持单个或批量上传手写体图片</p>
                  </Upload.Dragger>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title={`已上传图片 (${uploadedImages.length})`}>
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    <Row gutter={8}>
                      {uploadedImages.map((image, index) => (
                        <Col span={8} key={index} style={{ marginBottom: '8px' }}>
                          <Image
                            width="100%"
                            height={80}
                            src={image}
                            style={{ objectFit: 'cover' }}
                          />
                        </Col>
                      ))}
                    </Row>
                  </div>
                  {uploadedImages.length > 0 && (
                    <Button
                      danger
                      size="small"
                      style={{ marginTop: '8px' }}
                      onClick={() => setUploadedImages([])}
                    >
                      清空所有
                    </Button>
                  )}
                </Card>
              </Col>
            </Row>
          </TabPane>

          {/* 识别结果 */}
          <TabPane tab="识别结果" key="results">
            <Table
              columns={resultColumns}
              dataSource={recognitionResults}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </TabPane>

          {/* 性能分析 */}
          <TabPane tab="性能分析" key="performance">
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="模型性能对比">
                  <List
                    size="small"
                    dataSource={models.slice(0, 5)}
                    renderItem={(model) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Tag color={{
                              cnn: 'blue',
                              rnn: 'green', 
                              transformer: 'purple',
                              hybrid: 'orange',
                              ensemble: 'red'
                            }[model.type]}>
                              {model.type.toUpperCase()}
                            </Tag>
                          }
                          title={model.name}
                          description={
                            <Space>
                              <Text>准确率: {(model.accuracy * 100).toFixed(1)}%</Text>
                              <Text>速度: {model.speed.toFixed(0)}ms</Text>
                            </Space>
                          }
                        />
                        <Progress 
                          percent={model.performance.f1Score * 100} 
                          size="small" 
                          style={{ width: '100px' }}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="识别质量分布">
                  <div style={{ textAlign: 'center', padding: '20px' }}>
                    <Statistic
                      title="高质量识别"
                      value={recognitionResults.filter(r => r.qualityScore > 0.8).length}
                      suffix={`/ ${recognitionResults.length}`}
                      prefix={<FireOutlined style={{ color: '#f5222d' }} />}
                    />
                    <Progress
                      type="circle"
                      percent={recognitionResults.length > 0 
                        ? (recognitionResults.filter(r => r.qualityScore > 0.8).length / recognitionResults.length) * 100
                        : 0
                      }
                      style={{ marginTop: '16px' }}
                    />
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* 集成配置模态框 */}
      <Modal
        title="多模型集成配置"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={configForm}
          layout="vertical"
          initialValues={ensembleConfig}
          onFinish={(values) => {
            setEnsembleConfig(values);
            setConfigModalVisible(false);
            notification.success({ message: '配置已保存' });
          }}
        >
          <Form.Item label="投票策略" name="votingStrategy">
            <Radio.Group>
              <Radio value="majority">多数投票</Radio>
              <Radio value="weighted">加权投票</Radio>
              <Radio value="confidence_based">置信度优先</Radio>
              <Radio value="hybrid">混合策略</Radio>
            </Radio.Group>
          </Form.Item>
          
          <Form.Item label="最小一致性阈值" name="minConsensus">
            <Slider min={0.5} max={1.0} step={0.05} marks={{ 0.5: '50%', 0.7: '70%', 0.9: '90%', 1.0: '100%' }} />
          </Form.Item>
          
          <Form.Item label="置信度阈值" name="confidenceThreshold">
            <Slider min={0.5} max={1.0} step={0.05} marks={{ 0.5: '50%', 0.7: '70%', 0.9: '90%', 1.0: '100%' }} />
          </Form.Item>
          
          <Form.Item label="启用降级策略" name="enableFallback" valuePropName="checked">
            <Switch />
          </Form.Item>
          
          <Form.Item label="最大处理时间(ms)" name="maxProcessingTime">
            <Input type="number" min={5000} max={60000} />
          </Form.Item>
          
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存配置
              </Button>
              <Button onClick={() => setConfigModalVisible(false)}>
                取消
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 结果详情模态框 */}
      <Modal
        title="识别结果详情"
        open={resultDetailModalVisible}
        onCancel={() => setResultDetailModalVisible(false)}
        width={1000}
        footer={null}
      >
        {selectedResult && (
          <div>
            <Descriptions bordered size="small" style={{ marginBottom: '16px' }}>
              <Descriptions.Item label="最终结果">{selectedResult.finalText}</Descriptions.Item>
              <Descriptions.Item label="置信度">{(selectedResult.confidence * 100).toFixed(1)}%</Descriptions.Item>
              <Descriptions.Item label="一致性">{(selectedResult.consensusLevel * 100).toFixed(1)}%</Descriptions.Item>
              <Descriptions.Item label="投票策略">{selectedResult.votingStrategy}</Descriptions.Item>
              <Descriptions.Item label="处理时间">{selectedResult.processingTime.toFixed(0)}ms</Descriptions.Item>
              <Descriptions.Item label="质量评分">{(selectedResult.qualityScore * 100).toFixed(0)}</Descriptions.Item>
            </Descriptions>
            
            <Card size="small" title="各模型识别结果" style={{ marginBottom: '16px' }}>
              <Table
                size="small"
                dataSource={selectedResult.modelResults}
                rowKey="id"
                pagination={false}
                columns={[
                  {
                    title: '模型',
                    dataIndex: 'modelId',
                    render: (modelId: string) => {
                      const model = models.find(m => m.id === modelId);
                      return model ? model.name : modelId;
                    }
                  },
                  { title: '识别文本', dataIndex: 'text' },
                  {
                    title: '置信度',
                    dataIndex: 'confidence',
                    render: (confidence: number) => `${(confidence * 100).toFixed(1)}%`
                  },
                  {
                    title: '处理时间',
                    dataIndex: 'processingTime',
                    render: (time: number) => `${time.toFixed(0)}ms`
                  }
                ]}
              />
            </Card>
            
            <Card size="small" title="改进建议">
              <List
                size="small"
                dataSource={selectedResult.improvements}
                renderItem={(item) => (
                  <List.Item>
                    <Text>• {item}</Text>
                  </List.Item>
                )}
              />
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MultiModelRecognitionEngine;