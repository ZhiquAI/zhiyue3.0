import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Progress,
  Tag,
  Alert,
  Statistic,
  Row,
  Col,
  Tooltip,
  Modal,
  Switch,
  Select,
  Slider,
  Tabs,
  Badge,
  Space,
  Divider,
  Typography,
  List,
  Avatar
} from 'antd';
import {
  RobotOutlined,
  BulbOutlined,
  BarChartOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { Brain, Target, Zap, TrendingUp, Award, Clock } from 'lucide-react';

const { Title, Text, Paragraph } = Typography;

interface AIMarkingAssistantProps {
  questionId: string;
  questionType: string;
  studentAnswer: string;
  standardAnswer?: string;
  maxScore: number;
  onScoreChange: (score: number) => void;
  onSuggestionApply: (suggestion: any) => void;
}

interface AIAnalysis {
  confidence: number;
  suggestedScore: number;
  dimensions: {
    accuracy: number;
    completeness: number;
    logic: number;
    expression: number;
  };
  keyPoints: {
    identified: string[];
    missing: string[];
    incorrect: string[];
  };
  suggestions: string[];
  similarAnswers: {
    score: number;
    similarity: number;
    sample: string;
  }[];
  riskFactors: {
    type: string;
    description: string;
    severity: 'low' | 'medium' | 'high';
  }[];
}

const AIMarkingAssistant: React.FC<AIMarkingAssistantProps> = ({
  questionId,
  questionType,
  studentAnswer,
  standardAnswer,
  maxScore,
  onScoreChange,
  onSuggestionApply
}) => {
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(true);
  const [analysisMode, setAnalysisMode] = useState<'standard' | 'deep' | 'comparative'>('standard');
  const [confidenceThreshold, setConfidenceThreshold] = useState(80);
  const [showDetailedAnalysis, setShowDetailedAnalysis] = useState(false);
  const [autoApplyHighConfidence, setAutoApplyHighConfidence] = useState(false);

  // 模拟AI分析数据
  const mockAIAnalysis: AIAnalysis = {
    confidence: 87,
    suggestedScore: Math.floor(maxScore * 0.85),
    dimensions: {
      accuracy: 85,
      completeness: 90,
      logic: 82,
      expression: 88
    },
    keyPoints: {
      identified: [
        '正确提及了武汉长江大桥建设时间',
        '准确描述了邓稼先的贡献',
        '理解了三大改造的基本概念'
      ],
      missing: [
        '缺少对历史背景的深入分析',
        '未提及政策影响的具体表现'
      ],
      incorrect: [
        '武汉长江大桥建成时间有误（应为1957年）'
      ]
    },
    suggestions: [
      '建议补充历史背景分析以提高完整性',
      '可以增加具体事例来支撑观点',
      '注意核实关键时间节点的准确性'
    ],
    similarAnswers: [
      {
        score: 9,
        similarity: 0.92,
        sample: '1957年武汉长江大桥建成，邓稼先为原子弹研制做出重要贡献...'
      },
      {
        score: 7,
        similarity: 0.78,
        sample: '新中国成立后的重大工程包括长江大桥建设...'
      }
    ],
    riskFactors: [
      {
        type: '事实错误',
        description: '时间节点不准确',
        severity: 'medium'
      },
      {
        type: '内容不完整',
        description: '缺少深入分析',
        severity: 'low'
      }
    ]
  };

  useEffect(() => {
    if (aiEnabled && studentAnswer) {
      performAIAnalysis();
    }
  }, [studentAnswer, analysisMode, aiEnabled]);

  const performAIAnalysis = async () => {
    setLoading(true);
    // 模拟AI分析延迟
    setTimeout(() => {
      setAiAnalysis(mockAIAnalysis);
      setLoading(false);
      
      // 自动应用高置信度评分
      if (autoApplyHighConfidence && mockAIAnalysis.confidence >= confidenceThreshold) {
        onScoreChange(mockAIAnalysis.suggestedScore);
      }
    }, 1500);
  };

  const getDimensionColor = (score: number) => {
    if (score >= 85) return '#52c41a';
    if (score >= 70) return '#faad14';
    return '#ff4d4f';
  };

  const getRiskSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'default';
      default: return 'default';
    }
  };

  const renderDimensionAnalysis = () => {
    if (!aiAnalysis) return null;

    return (
      <Card size="small" title="评分维度分析">
        <Row gutter={[16, 16]}>
          {Object.entries(aiAnalysis.dimensions).map(([key, value]) => {
            const labels = {
              accuracy: '准确性',
              completeness: '完整性',
              logic: '逻辑性',
              expression: '表达性'
            };
            
            return (
              <Col span={12} key={key}>
                <div className="text-center">
                  <Progress
                    type="circle"
                    percent={value}
                    size={60}
                    strokeColor={getDimensionColor(value)}
                    format={(percent) => `${percent}%`}
                  />
                  <div className="mt-2 text-sm font-medium">
                    {labels[key as keyof typeof labels]}
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      </Card>
    );
  };

  const renderKeyPointsAnalysis = () => {
    if (!aiAnalysis) return null;

    return (
      <Card size="small" title="要点分析">
        <Tabs
          size="small"
          items={[
            {
              key: 'identified',
              label: (
                <span>
                  <CheckCircleOutlined className="text-green-500" />
                  已识别 ({aiAnalysis.keyPoints.identified.length})
                </span>
              ),
              children: (
                <List
                  size="small"
                  dataSource={aiAnalysis.keyPoints.identified}
                  renderItem={(item) => (
                    <List.Item>
                      <CheckCircleOutlined className="text-green-500 mr-2" />
                      {item}
                    </List.Item>
                  )}
                />
              )
            },
            {
              key: 'missing',
              label: (
                <span>
                  <ExclamationCircleOutlined className="text-orange-500" />
                  缺失 ({aiAnalysis.keyPoints.missing.length})
                </span>
              ),
              children: (
                <List
                  size="small"
                  dataSource={aiAnalysis.keyPoints.missing}
                  renderItem={(item) => (
                    <List.Item>
                      <ExclamationCircleOutlined className="text-orange-500 mr-2" />
                      {item}
                    </List.Item>
                  )}
                />
              )
            },
            {
              key: 'incorrect',
              label: (
                <span>
                  <ClockCircleOutlined className="text-red-500" />
                  错误 ({aiAnalysis.keyPoints.incorrect.length})
                </span>
              ),
              children: (
                <List
                  size="small"
                  dataSource={aiAnalysis.keyPoints.incorrect}
                  renderItem={(item) => (
                    <List.Item>
                      <ClockCircleOutlined className="text-red-500 mr-2" />
                      {item}
                    </List.Item>
                  )}
                />
              )
            }
          ]}
        />
      </Card>
    );
  };

  const renderSimilarAnswers = () => {
    if (!aiAnalysis) return null;

    return (
      <Card size="small" title="相似答案参考">
        <List
          size="small"
          dataSource={aiAnalysis.similarAnswers}
          renderItem={(item, index) => (
            <List.Item>
              <List.Item.Meta
                avatar={
                  <Avatar 
                    style={{ 
                      backgroundColor: getDimensionColor(item.score * 10),
                      color: 'white'
                    }}
                  >
                    {item.score}
                  </Avatar>
                }
                title={`相似度: ${(item.similarity * 100).toFixed(1)}%`}
                description={
                  <Text ellipsis={{ tooltip: item.sample }}>
                    {item.sample}
                  </Text>
                }
              />
            </List.Item>
          )}
        />
      </Card>
    );
  };

  const renderRiskFactors = () => {
    if (!aiAnalysis || aiAnalysis.riskFactors.length === 0) return null;

    return (
      <Card size="small" title="风险提示">
        <List
          size="small"
          dataSource={aiAnalysis.riskFactors}
          renderItem={(item) => (
            <List.Item>
              <Tag color={getRiskSeverityColor(item.severity)}>
                {item.type}
              </Tag>
              <span className="ml-2">{item.description}</span>
            </List.Item>
          )}
        />
      </Card>
    );
  };

  if (!aiEnabled) {
    return (
      <Card size="small" title="AI辅助阅卷">
        <div className="text-center py-8">
          <RobotOutlined className="text-4xl text-gray-400 mb-4" />
          <p className="text-gray-500">AI辅助功能已关闭</p>
          <Button 
            type="primary" 
            onClick={() => setAiEnabled(true)}
            icon={<ThunderboltOutlined />}
          >
            启用AI辅助
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* AI分析概览 */}
      <Card 
        size="small" 
        title={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-500" />
              <span>AI智能分析</span>
              {loading && <Badge status="processing" text="分析中" />}
            </div>
            <div className="flex items-center gap-2">
              <Tooltip title="分析设置">
                <Button 
                  size="small" 
                  icon={<SettingOutlined />}
                  onClick={() => setShowDetailedAnalysis(true)}
                />
              </Tooltip>
              <Switch
                size="small"
                checked={aiEnabled}
                onChange={setAiEnabled}
                checkedChildren="AI"
                unCheckedChildren="OFF"
              />
            </div>
          </div>
        }
      >
        {loading ? (
          <div className="text-center py-4">
            <Progress percent={60} status="active" />
            <p className="text-sm text-gray-500 mt-2">AI正在分析答案...</p>
          </div>
        ) : aiAnalysis ? (
          <div className="space-y-4">
            {/* 置信度和建议分数 */}
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="AI置信度"
                  value={aiAnalysis.confidence}
                  suffix="%"
                  valueStyle={{ 
                    color: aiAnalysis.confidence >= 80 ? '#52c41a' : 
                           aiAnalysis.confidence >= 60 ? '#faad14' : '#ff4d4f'
                  }}
                  prefix={<TrophyOutlined />}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="建议分数"
                  value={aiAnalysis.suggestedScore}
                  suffix={`/${maxScore}`}
                  valueStyle={{ color: '#1677ff' }}
                  prefix={<Target className="w-4 h-4" />}
                />
              </Col>
            </Row>

            {/* 快速操作 */}
            <div className="flex items-center gap-2">
              <Button
                type="primary"
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => {
                  onScoreChange(aiAnalysis.suggestedScore);
                  onSuggestionApply(aiAnalysis);
                }}
              >
                采用AI建议
              </Button>
              <Button
                size="small"
                icon={<EyeOutlined />}
                onClick={() => setShowDetailedAnalysis(true)}
              >
                详细分析
              </Button>
              <Button
                size="small"
                icon={<BarChartOutlined />}
                onClick={() => performAIAnalysis()}
                loading={loading}
              >
                重新分析
              </Button>
            </div>

            {/* AI建议 */}
            {aiAnalysis.suggestions.length > 0 && (
              <Alert
                message="AI评分建议"
                description={
                  <ul className="text-sm space-y-1 mt-2">
                    {aiAnalysis.suggestions.map((suggestion, index) => (
                      <li key={index}>• {suggestion}</li>
                    ))}
                  </ul>
                }
                type="info"
                showIcon
                icon={<BulbOutlined />}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <Button 
              type="primary" 
              onClick={performAIAnalysis}
              loading={loading}
              icon={<ThunderboltOutlined />}
            >
              开始AI分析
            </Button>
          </div>
        )}
      </Card>

      {/* 详细分析模态框 */}
      <Modal
        title={
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-500" />
            <span>AI详细分析报告</span>
          </div>
        }
        open={showDetailedAnalysis}
        onCancel={() => setShowDetailedAnalysis(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setShowDetailedAnalysis(false)}>
            关闭
          </Button>,
          <Button
            key="apply"
            type="primary"
            onClick={() => {
              if (aiAnalysis) {
                onScoreChange(aiAnalysis.suggestedScore);
                onSuggestionApply(aiAnalysis);
              }
              setShowDetailedAnalysis(false);
            }}
          >
            采用建议
          </Button>
        ]}
      >
        <div className="space-y-4">
          {/* 分析模式设置 */}
          <Card size="small" title="分析设置">
            <Row gutter={16}>
              <Col span={12}>
                <div className="mb-2">分析模式</div>
                <Select
                  value={analysisMode}
                  onChange={setAnalysisMode}
                  className="w-full"
                  options={[
                    { value: 'standard', label: '标准分析' },
                    { value: 'deep', label: '深度分析' },
                    { value: 'comparative', label: '对比分析' }
                  ]}
                />
              </Col>
              <Col span={12}>
                <div className="mb-2">置信度阈值: {confidenceThreshold}%</div>
                <Slider
                  value={confidenceThreshold}
                  onChange={setConfidenceThreshold}
                  min={50}
                  max={95}
                  step={5}
                />
              </Col>
            </Row>
            <div className="mt-4">
              <Switch
                checked={autoApplyHighConfidence}
                onChange={setAutoApplyHighConfidence}
                checkedChildren="自动应用高置信度评分"
                unCheckedChildren="手动确认评分"
              />
            </div>
          </Card>

          {/* 详细分析内容 */}
          <Tabs
            items={[
              {
                key: 'dimensions',
                label: '维度分析',
                children: renderDimensionAnalysis()
              },
              {
                key: 'keypoints',
                label: '要点分析',
                children: renderKeyPointsAnalysis()
              },
              {
                key: 'similar',
                label: '相似答案',
                children: renderSimilarAnswers()
              },
              {
                key: 'risks',
                label: '风险提示',
                children: renderRiskFactors()
              }
            ]}
          />
        </div>
      </Modal>
    </div>
  );
};

export default AIMarkingAssistant;