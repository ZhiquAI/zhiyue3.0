/**
 * 多模态评分界面组件 - Phase 3 AI智能化前端
 * 提供智能评分、批量处理和结果分析的用户界面
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Card,
  Button,
  Form,
  Input,
  Select,
  Upload,
  Progress,
  Table,
  Tag,
  Space,
  Modal,
  message,
  Tabs,
  Statistic,
  Row,
  Col,
  Typography,
  Tooltip,
  Alert,
  Spin,
  Badge,
  Drawer,
  Timeline,
  Divider
} from 'antd';
import {
  RobotOutlined,
  UploadOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  EyeOutlined,
  DownloadOutlined,
  BarChartOutlined,
  BulbOutlined,
  ThunderboltOutlined,
  BrainIcon,
  ClockCircleOutlined,
  FileTextOutlined,
  SettingOutlined
} from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import { Line, Column, Pie } from '@ant-design/plots';

const { TextArea } = Input;
const { Option } = Select;
const { TabPane } = Tabs;
const { Title, Text, Paragraph } = Typography;

// 接口定义
interface QuestionType {
  value: string;
  label: string;
  description: string;
}

interface GradingMode {
  value: string;
  label: string;
  description: string;
}

interface GradingResult {
  question_id: string;
  student_id: string;
  score: number;
  max_score: number;
  confidence: number;
  grading_mode: string;
  detailed_feedback: Record<string, any>;
  ai_reasoning: string;
  suggestions: string[];
  review_required: boolean;
  timestamp: string;
  processing_time?: number;
}

interface BatchGradingResult {
  exam_id: string;
  total_count: number;
  success_count: number;
  failed_count: number;
  results: GradingResult[];
  overall_statistics: Record<string, any>;
  processing_time: number;
}

interface EngineStatus {
  initialized: boolean;
  models: Record<string, Record<string, string>>;
  supported_question_types: string[];
  supported_grading_modes: string[];
  performance_metrics: Record<string, any>;
}

const MultimodalGradingInterface: React.FC = () => {
  // 状态管理
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [engineStatus, setEngineStatus] = useState<EngineStatus | null>(null);
  const [questionTypes, setQuestionTypes] = useState<QuestionType[]>([]);
  const [gradingModes, setGradingModes] = useState<GradingMode[]>([]);
  const [gradingResults, setGradingResults] = useState<GradingResult[]>([]);
  const [batchResults, setBatchResults] = useState<BatchGradingResult | null>(null);
  const [activeTab, setActiveTab] = useState('single');
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] = useState<GradingResult | null>(null);
  const [imagePreviewVisible, setImagePreviewVisible] = useState(false);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);

  // 初始化数据
  useEffect(() => {
    loadEngineStatus();
    loadQuestionTypes();
    loadGradingModes();
  }, []);

  const loadEngineStatus = async () => {
    try {
      // 模拟API调用
      const mockStatus: EngineStatus = {
        initialized: true,
        models: {
          "text_classification": {
            "name": "Text Classification Model",
            "type": "BERT-based",
            "version": "1.0.0",
            "device": "cuda"
          },
          "handwriting_recognition": {
            "name": "Handwriting Recognition Model",
            "type": "CNN-LSTM",
            "version": "1.0.0",
            "device": "cuda"
          },
          "semantic_similarity": {
            "name": "Semantic Similarity Model",
            "type": "Sentence-BERT",
            "version": "1.0.0"
          }
        },
        supported_question_types: ["multiple_choice", "short_answer", "essay", "handwriting"],
        supported_grading_modes: ["automatic", "assisted", "hybrid"],
        performance_metrics: {
          "average_grading_time": 0.5,
          "daily_grading_count": 1500,
          "accuracy_rate": 0.95,
          "model_load_time": 2.3
        }
      };
      setEngineStatus(mockStatus);
    } catch (error) {
      message.error('加载引擎状态失败');
    }
  };

  const loadQuestionTypes = async () => {
    try {
      // 模拟API调用
      const mockTypes: QuestionType[] = [
        { value: "multiple_choice", label: "选择题", description: "单选或多选题，AI自动识别选项" },
        { value: "fill_in_blank", label: "填空题", description: "填空题，支持部分匹配和关键词识别" },
        { value: "short_answer", label: "简答题", description: "简答题，基于语义相似度评分" },
        { value: "essay", label: "作文题", description: "作文题，多维度综合评分" },
        { value: "calculation", label: "计算题", description: "计算题，数值答案匹配" },
        { value: "handwriting", label: "手写题", description: "手写题，OCR识别后语义评分" }
      ];
      setQuestionTypes(mockTypes);
    } catch (error) {
      message.error('加载题型列表失败');
    }
  };

  const loadGradingModes = async () => {
    try {
      // 模拟API调用
      const mockModes: GradingMode[] = [
        { value: "automatic", label: "全自动评分", description: "完全由AI系统自动评分，适用于客观题" },
        { value: "assisted", label: "AI辅助评分", description: "AI提供评分建议，人工确认，适用于主观题" },
        { value: "manual", label: "人工评分", description: "完全人工评分，AI不参与" },
        { value: "hybrid", label: "混合评分", description: "结合AI和人工评分，确保最高准确性" }
      ];
      setGradingModes(mockModes);
    } catch (error) {
      message.error('加载评分模式失败');
    }
  };

  // 单题评分
  const handleSingleGrading = async (values: any) => {
    setLoading(true);
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockResult: GradingResult = {
        question_id: values.question_id || "Q001",
        student_id: values.student_id || "S001",
        score: Math.random() * parseFloat(values.max_score || "10"),
        max_score: parseFloat(values.max_score || "10"),
        confidence: 0.85 + Math.random() * 0.1,
        grading_mode: values.grading_mode || "automatic",
        detailed_feedback: {
          semantic_similarity: 0.82,
          keyword_matches: ["关键词1", "关键词2"],
          grammar_score: 0.9,
          completeness: 0.8
        },
        ai_reasoning: "基于语义分析，学生答案与标准答案相似度较高，包含主要知识点，表达清晰。",
        suggestions: ["答案较为完整", "建议增加更多细节描述"],
        review_required: Math.random() > 0.7,
        timestamp: new Date().toISOString(),
        processing_time: 1.2
      };

      setGradingResults(prev => [mockResult, ...prev]);
      setSelectedResult(mockResult);
      setResultModalVisible(true);
      
      message.success('评分完成！');
    } catch (error) {
      message.error('评分失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 批量评分
  const handleBatchGrading = async () => {
    setBatchProcessing(true);
    setProcessingProgress(0);
    
    try {
      // 模拟批量处理进度
      const progressInterval = setInterval(() => {
        setProcessingProgress(prev => {
          if (prev >= 95) {
            clearInterval(progressInterval);
            return 95;
          }
          return prev + Math.random() * 10;
        });
      }, 300);

      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 5000));
      
      clearInterval(progressInterval);
      setProcessingProgress(100);

      // 生成模拟批量结果
      const mockBatchResult: BatchGradingResult = {
        exam_id: "EXAM001",
        total_count: 120,
        success_count: 115,
        failed_count: 5,
        results: Array.from({ length: 120 }, (_, i) => ({
          question_id: `Q${i + 1}`,
          student_id: `S${i + 1}`,
          score: Math.random() * 10,
          max_score: 10,
          confidence: 0.8 + Math.random() * 0.15,
          grading_mode: "automatic",
          detailed_feedback: {},
          ai_reasoning: "AI自动评分",
          suggestions: [],
          review_required: Math.random() > 0.8,
          timestamp: new Date().toISOString()
        })),
        overall_statistics: {
          average_score: 7.5,
          average_confidence: 0.89,
          review_required_count: 24,
          score_distribution: {
            "0-20": 2,
            "20-40": 8,
            "40-60": 15,
            "60-80": 45,
            "80-100": 50
          }
        },
        processing_time: 45.6
      };

      setBatchResults(mockBatchResult);
      message.success(`批量评分完成！成功评分 ${mockBatchResult.success_count} 题`);
      
    } catch (error) {
      message.error('批量评分失败');
    } finally {
      setBatchProcessing(false);
      setProcessingProgress(0);
    }
  };

  // 结果表格列定义
  const resultColumns = [
    {
      title: '题目ID',
      dataIndex: 'question_id',
      key: 'question_id',
      width: 100,
    },
    {
      title: '学生ID',
      dataIndex: 'student_id',
      key: 'student_id',
      width: 100,
    },
    {
      title: '得分',
      key: 'score',
      width: 120,
      render: (record: GradingResult) => (
        <Space>
          <Text strong>{record.score.toFixed(1)}</Text>
          <Text type="secondary">/ {record.max_score}</Text>
        </Space>
      ),
    },
    {
      title: '置信度',
      dataIndex: 'confidence',
      key: 'confidence',
      width: 100,
      render: (confidence: number) => (
        <Progress
          percent={confidence * 100}
          size="small"
          status={confidence > 0.8 ? 'success' : confidence > 0.6 ? 'active' : 'exception'}
          showInfo={false}
        />
      ),
    },
    {
      title: '评分模式',
      dataIndex: 'grading_mode',
      key: 'grading_mode',
      width: 100,
      render: (mode: string) => {
        const modeConfig = {
          automatic: { color: 'blue', text: '自动' },
          assisted: { color: 'green', text: '辅助' },
          manual: { color: 'orange', text: '人工' },
          hybrid: { color: 'purple', text: '混合' }
        };
        const config = modeConfig[mode as keyof typeof modeConfig] || { color: 'default', text: mode };
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (record: GradingResult) => (
        <Space>
          {record.review_required ? (
            <Tag color="warning" icon={<WarningOutlined />}>需复核</Tag>
          ) : (
            <Tag color="success" icon={<CheckCircleOutlined />}>已完成</Tag>
          )}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 120,
      render: (record: GradingResult) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedResult(record);
              setResultModalVisible(true);
            }}
          >
            查看详情
          </Button>
        </Space>
      ),
    },
  ];

  // 上传配置
  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    accept: '.jpg,.jpeg,.png,.pdf',
    beforeUpload: () => false, // 阻止自动上传
    onChange: (info) => {
      console.log('上传文件变化:', info.fileList);
    },
  };

  // 统计图表数据
  const scoreDistributionData = batchResults ? 
    Object.entries(batchResults.overall_statistics.score_distribution).map(([range, count]) => ({
      range,
      count: count as number
    })) : [];

  const confidenceData = gradingResults.map((result, index) => ({
    index: index + 1,
    confidence: result.confidence * 100
  }));

  return (
    <div className="multimodal-grading-interface" style={{ padding: '24px' }}>
      {/* 页面标题和状态 */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>
              <RobotOutlined style={{ color: '#1890ff', marginRight: '12px' }} />
              AI智能评分系统
            </Title>
            <Text type="secondary">Phase 3 多模态评分引擎</Text>
          </div>
          
          {/* 引擎状态指示器 */}
          {engineStatus && (
            <Card size="small" style={{ minWidth: '300px' }}>
              <Row gutter={16}>
                <Col span={8}>
                  <Statistic
                    title="模型状态"
                    value={Object.keys(engineStatus.models).length}
                    suffix="个已加载"
                    prefix={<ThunderboltOutlined style={{ color: '#52c41a' }} />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="准确率"
                    value={engineStatus.performance_metrics.accuracy_rate * 100}
                    suffix="%"
                    precision={1}
                    prefix={<BarChartOutlined style={{ color: '#1890ff' }} />}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="日评分量"
                    value={engineStatus.performance_metrics.daily_grading_count}
                    prefix={<FileTextOutlined style={{ color: '#722ed1' }} />}
                  />
                </Col>
              </Row>
            </Card>
          )}
        </div>
      </div>

      {/* 主要功能标签页 */}
      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
        {/* 单题评分 */}
        <TabPane tab="单题评分" key="single">
          <Row gutter={24}>
            <Col span={14}>
              <Card title="智能评分" extra={<Badge status="processing" text="AI引擎就绪" />}>
                <Form
                  form={form}
                  layout="vertical"
                  onFinish={handleSingleGrading}
                >
                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="question_id"
                        label="题目ID"
                        rules={[{ required: true, message: '请输入题目ID' }]}
                      >
                        <Input placeholder="例如: Q001" />
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="student_id"
                        label="学生ID"
                        rules={[{ required: true, message: '请输入学生ID' }]}
                      >
                        <Input placeholder="例如: S001" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item
                        name="question_type"
                        label="题型"
                        rules={[{ required: true, message: '请选择题型' }]}
                      >
                        <Select placeholder="选择题型">
                          {questionTypes.map(type => (
                            <Option key={type.value} value={type.value}>
                              <Tooltip title={type.description} placement="right">
                                {type.label}
                              </Tooltip>
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item
                        name="max_score"
                        label="满分"
                        rules={[{ required: true, message: '请输入满分' }]}
                      >
                        <Input type="number" placeholder="10" min="0" step="0.1" />
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item
                    name="grading_mode"
                    label="评分模式"
                    rules={[{ required: true, message: '请选择评分模式' }]}
                  >
                    <Select placeholder="选择评分模式">
                      {gradingModes.map(mode => (
                        <Option key={mode.value} value={mode.value}>
                          <Tooltip title={mode.description} placement="right">
                            {mode.label}
                          </Tooltip>
                        </Option>
                      ))}
                    </Select>
                  </Form.Item>

                  <Form.Item
                    name="answer_text"
                    label="学生答案"
                    rules={[{ required: true, message: '请输入学生答案' }]}
                  >
                    <TextArea
                      rows={6}
                      placeholder="请输入学生的答案内容..."
                      showCount
                    />
                  </Form.Item>

                  <Form.Item name="standard_answer" label="标准答案（可选）">
                    <TextArea
                      rows={4}
                      placeholder="输入标准答案，用于语义对比..."
                    />
                  </Form.Item>

                  <Form.Item name="keywords" label="关键词（可选）">
                    <Input placeholder="用逗号分隔多个关键词" />
                  </Form.Item>

                  <Form.Item name="image" label="相关图片（可选）">
                    <Upload {...uploadProps} listType="picture">
                      <Button icon={<UploadOutlined />}>上传图片</Button>
                    </Upload>
                  </Form.Item>

                  <Form.Item>
                    <Button
                      type="primary"
                      htmlType="submit"
                      loading={loading}
                      size="large"
                      icon={<RobotOutlined />}
                    >
                      开始AI评分
                    </Button>
                  </Form.Item>
                </Form>
              </Card>
            </Col>

            <Col span={10}>
              {/* AI评分建议面板 */}
              <Card title="AI评分建议" style={{ marginBottom: '16px' }}>
                <Timeline
                  items={[
                    {
                      dot: <BulbOutlined style={{ color: '#1890ff' }} />,
                      children: (
                        <div>
                          <Text strong>智能推荐</Text>
                          <Paragraph style={{ margin: '4px 0' }}>
                            基于题型选择推荐评分模式
                          </Paragraph>
                        </div>
                      ),
                    },
                    {
                      dot: <BarChartOutlined style={{ color: '#52c41a' }} />,
                      children: (
                        <div>
                          <Text strong>实时分析</Text>
                          <Paragraph style={{ margin: '4px 0' }}>
                            语义相似度实时计算
                          </Paragraph>
                        </div>
                      ),
                    },
                    {
                      dot: <CheckCircleOutlined style={{ color: '#722ed1' }} />,
                      children: (
                        <div>
                          <Text strong>质量检查</Text>
                          <Paragraph style={{ margin: '4px 0' }}>
                            自动检测需要人工复核的答案
                          </Paragraph>
                        </div>
                      ),
                    },
                  ]}
                />
              </Card>

              {/* 最近评分记录 */}
              <Card title="最近评分记录">
                {gradingResults.length > 0 ? (
                  <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                    {gradingResults.slice(0, 5).map((result, index) => (
                      <div key={index} style={{ marginBottom: '12px', padding: '8px', border: '1px solid #f0f0f0', borderRadius: '6px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Text strong>{result.question_id}</Text>
                          <Tag color={result.confidence > 0.8 ? 'success' : 'warning'}>
                            {(result.confidence * 100).toFixed(0)}%
                          </Tag>
                        </div>
                        <div style={{ marginTop: '4px' }}>
                          <Text>得分: {result.score.toFixed(1)}/{result.max_score}</Text>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', color: '#999', padding: '20px' }}>
                    暂无评分记录
                  </div>
                )}
              </Card>
            </Col>
          </Row>
        </TabPane>

        {/* 批量评分 */}
        <TabPane tab="批量评分" key="batch">
          <Row gutter={24}>
            <Col span={16}>
              <Card title="批量智能评分">
                <Alert
                  message="批量评分功能"
                  description="支持同时处理大量答题卡，使用并行AI算法确保高效处理"
                  type="info"
                  showIcon
                  style={{ marginBottom: '24px' }}
                />

                <Form layout="vertical">
                  <Form.Item name="exam_id" label="考试ID">
                    <Input placeholder="例如: EXAM_2024_001" />
                  </Form.Item>

                  <Form.Item name="batch_files" label="批量文件上传">
                    <Upload.Dragger {...uploadProps} multiple>
                      <p className="ant-upload-drag-icon">
                        <UploadOutlined style={{ fontSize: '48px', color: '#1890ff' }} />
                      </p>
                      <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                      <p className="ant-upload-hint">
                        支持单个或批量上传。支持JPG、PNG、PDF格式。
                      </p>
                    </Upload.Dragger>
                  </Form.Item>

                  <Row gutter={16}>
                    <Col span={12}>
                      <Form.Item name="batch_grading_mode" label="批量评分模式">
                        <Select defaultValue="automatic" placeholder="选择评分模式">
                          {gradingModes.map(mode => (
                            <Option key={mode.value} value={mode.value}>
                              {mode.label}
                            </Option>
                          ))}
                        </Select>
                      </Form.Item>
                    </Col>
                    <Col span={12}>
                      <Form.Item name="parallel_processing" label="处理选项">
                        <Select defaultValue="parallel" placeholder="选择处理方式">
                          <Option value="parallel">并行处理（推荐）</Option>
                          <Option value="sequential">顺序处理</Option>
                        </Select>
                      </Form.Item>
                    </Col>
                  </Row>

                  <Form.Item>
                    <Space>
                      <Button
                        type="primary"
                        size="large"
                        icon={<ThunderboltOutlined />}
                        loading={batchProcessing}
                        onClick={handleBatchGrading}
                      >
                        开始批量评分
                      </Button>
                      <Button icon={<SettingOutlined />}>
                        高级设置
                      </Button>
                    </Space>
                  </Form.Item>
                </Form>

                {/* 批量处理进度 */}
                {batchProcessing && (
                  <Card style={{ marginTop: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <Spin size="large" />
                      <div style={{ marginTop: '16px' }}>
                        <Text strong>AI批量评分进行中...</Text>
                        <Progress 
                          percent={processingProgress} 
                          status="active"
                          style={{ marginTop: '8px' }}
                        />
                      </div>
                    </div>
                  </Card>
                )}
              </Card>
            </Col>

            <Col span={8}>
              {/* 批量评分统计 */}
              {batchResults && (
                <Card title="批量评分结果">
                  <Row gutter={[16, 16]}>
                    <Col span={24}>
                      <Statistic
                        title="总处理量"
                        value={batchResults.total_count}
                        suffix="题"
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="成功"
                        value={batchResults.success_count}
                        valueStyle={{ color: '#3f8600' }}
                      />
                    </Col>
                    <Col span={12}>
                      <Statistic
                        title="失败"
                        value={batchResults.failed_count}
                        valueStyle={{ color: '#cf1322' }}
                      />
                    </Col>
                    <Col span={24}>
                      <Statistic
                        title="处理时间"
                        value={batchResults.processing_time}
                        suffix="秒"
                        precision={1}
                      />
                    </Col>
                  </Row>

                  <Divider />

                  {/* 分数分布图 */}
                  <div style={{ height: '200px' }}>
                    <Title level={5}>分数分布</Title>
                    <Column
                      data={scoreDistributionData}
                      xField="range"
                      yField="count"
                      color="#1890ff"
                      height={150}
                    />
                  </div>
                </Card>
              )}
            </Col>
          </Row>
        </TabPane>

        {/* 结果分析 */}
        <TabPane tab="结果分析" key="analysis">
          <Row gutter={24}>
            <Col span={24}>
              <Card title="评分结果汇总">
                <Table
                  columns={resultColumns}
                  dataSource={batchResults?.results || gradingResults}
                  rowKey="question_id"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 条记录`,
                  }}
                  scroll={{ x: 800 }}
                />
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* 评分结果详情模态框 */}
      <Modal
        title="评分结果详情"
        open={resultModalVisible}
        onCancel={() => setResultModalVisible(false)}
        width={800}
        footer={[
          <Button key="download" icon={<DownloadOutlined />}>
            导出结果
          </Button>,
          <Button key="close" onClick={() => setResultModalVisible(false)}>
            关闭
          </Button>
        ]}
      >
        {selectedResult && (
          <div>
            <Row gutter={24}>
              <Col span={12}>
                <Card size="small" title="基本信息">
                  <p><strong>题目ID:</strong> {selectedResult.question_id}</p>
                  <p><strong>学生ID:</strong> {selectedResult.student_id}</p>
                  <p><strong>得分:</strong> {selectedResult.score.toFixed(1)} / {selectedResult.max_score}</p>
                  <p><strong>评分模式:</strong> {selectedResult.grading_mode}</p>
                  <p><strong>处理时间:</strong> {selectedResult.processing_time?.toFixed(2)}秒</p>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="质量指标">
                  <div style={{ marginBottom: '8px' }}>
                    <Text>AI置信度</Text>
                    <Progress 
                      percent={selectedResult.confidence * 100} 
                      size="small"
                      status={selectedResult.confidence > 0.8 ? 'success' : 'normal'}
                    />
                  </div>
                  <p><strong>状态:</strong> 
                    {selectedResult.review_required ? 
                      <Tag color="warning">需要人工复核</Tag> : 
                      <Tag color="success">自动评分完成</Tag>
                    }
                  </p>
                </Card>
              </Col>
            </Row>

            <Card size="small" title="AI分析推理" style={{ marginTop: '16px' }}>
              <Paragraph>{selectedResult.ai_reasoning}</Paragraph>
            </Card>

            {selectedResult.suggestions.length > 0 && (
              <Card size="small" title="改进建议" style={{ marginTop: '16px' }}>
                <ul>
                  {selectedResult.suggestions.map((suggestion, index) => (
                    <li key={index}>{suggestion}</li>
                  ))}
                </ul>
              </Card>
            )}

            <Card size="small" title="详细反馈" style={{ marginTop: '16px' }}>
              <pre style={{ background: '#f5f5f5', padding: '12px', borderRadius: '6px', fontSize: '12px' }}>
                {JSON.stringify(selectedResult.detailed_feedback, null, 2)}
              </pre>
            </Card>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MultimodalGradingInterface;