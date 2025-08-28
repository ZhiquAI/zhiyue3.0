import React, { useState, useCallback, useEffect } from "react";
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
  notification,
  Empty,
  Badge,
  Steps,
} from "antd";
import {
  BankOutlined,
  SettingOutlined,
  ReloadOutlined,
  TrophyOutlined,
  ThunderboltOutlined,
  DatabaseOutlined,
  ApiOutlined,
  RiseOutlined,
  FallOutlined,
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  FireOutlined,
  BulbOutlined,
  RobotOutlined,
  HeartOutlined,
} from "@ant-design/icons";

const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { Step } = Steps;

// 评分维度
type ScoringDimension =
  | "content"
  | "structure"
  | "language"
  | "creativity"
  | "logic"
  | "accuracy";

// 学习状态
type LearningStatus =
  | "idle"
  | "training"
  | "optimizing"
  | "completed"
  | "error";

// 评分规则
interface ScoringRule {
  id: string;
  dimension: ScoringDimension;
  name: string;
  description: string;
  weight: number;
  threshold: number;
  adaptiveWeight: number;
  confidence: number;
  performance: {
    accuracy: number;
    consistency: number;
    reliability: number;
  };
  learningData: {
    sampleCount: number;
    lastUpdated: Date;
    improvementRate: number;
  };
  enabled: boolean;
}

// 自适应配置
interface AdaptiveConfig {
  learningRate: number;
  adaptationThreshold: number;
  maxWeightChange: number;
  minSampleSize: number;
  convergenceThreshold: number;
  enableRealTimeAdaptation: boolean;
  enableCrossValidation: boolean;
  optimizationStrategy:
    | "gradient_descent"
    | "genetic_algorithm"
    | "reinforcement_learning"
    | "ensemble";
}

// 学习记录
interface LearningRecord {
  id: string;
  timestamp: Date;
  iteration: number;
  loss: number;
  accuracy: number;
  weightChanges: Record<string, number>;
  improvements: string[];
  convergenceScore: number;
}

// 评分结果
interface ScoringResult {
  id: string;
  studentId: string;
  questionId: string;
  originalScore: number;
  adaptiveScore: number;
  confidence: number;
  dimensionScores: Record<ScoringDimension, number>;
  explanation: string;
  improvements: string[];
  processingTime: number;
  qualityIndicators: {
    consistency: number;
    fairness: number;
    reliability: number;
  };
}

const AdaptiveScoringSystem: React.FC = () => {
  const [scoringRules, setScoringRules] = useState<ScoringRule[]>([]);
  const [adaptiveConfig, setAdaptiveConfig] = useState<AdaptiveConfig>({
    learningRate: 0.01,
    adaptationThreshold: 0.05,
    maxWeightChange: 0.2,
    minSampleSize: 100,
    convergenceThreshold: 0.001,
    enableRealTimeAdaptation: true,
    enableCrossValidation: true,
    optimizationStrategy: "gradient_descent",
  });
  const [learningRecords, setLearningRecords] = useState<LearningRecord[]>([]);
  const [scoringResults, setScoringResults] = useState<ScoringResult[]>([]);
  const [activeTab, setActiveTab] = useState("rules");
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [learningStatus, setLearningStatus] = useState<LearningStatus>("idle");
  const [currentIteration, setCurrentIteration] = useState(0);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const [configForm] = Form.useForm();

  // 生成模拟评分规则
  const generateMockRules = useCallback(() => {
    const dimensions: ScoringDimension[] = [
      "content",
      "structure",
      "language",
      "creativity",
      "logic",
      "accuracy",
    ];
    const ruleNames = {
      content: ["内容完整性", "主题相关性", "深度分析"],
      structure: ["逻辑结构", "段落组织", "层次清晰"],
      language: ["语言表达", "词汇运用", "语法正确"],
      creativity: ["创新思维", "独特见解", "想象力"],
      logic: ["逻辑推理", "论证严密", "因果关系"],
      accuracy: ["事实准确", "数据正确", "引用规范"],
    };

    const mockRules: ScoringRule[] = [];

    dimensions.forEach((dimension) => {
      ruleNames[dimension].forEach((name, index) => {
        const baseWeight = 1.0 / ruleNames[dimension].length;
        const accuracy = 0.8 + Math.random() * 0.15;

        mockRules.push({
          id: `rule_${dimension}_${index + 1}`,
          dimension,
          name,
          description: {
            content: "评估答案内容的质量和完整性",
            structure: "评估答案的组织结构和逻辑性",
            language: "评估语言表达的准确性和流畅性",
            creativity: "评估思维的创新性和独特性",
            logic: "评估逻辑推理的严密性",
            accuracy: "评估事实和数据的准确性",
          }[dimension],
          weight: baseWeight,
          threshold: 0.6 + Math.random() * 0.3,
          adaptiveWeight: baseWeight * (0.8 + Math.random() * 0.4),
          confidence: accuracy,
          performance: {
            accuracy,
            consistency: accuracy * 0.95,
            reliability: accuracy * 0.98,
          },
          learningData: {
            sampleCount: Math.floor(Math.random() * 500) + 100,
            lastUpdated: new Date(
              Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
            ),
            improvementRate: (Math.random() - 0.5) * 0.1,
          },
          enabled: true,
        });
      });
    });

    setScoringRules(mockRules);
  }, []);

  // 开始自适应学习
  const startAdaptiveLearning = useCallback(async () => {
    setLearningStatus("training");
    setCurrentIteration(0);
    setIsOptimizing(true);

    try {
      const maxIterations = 50;
      const records: LearningRecord[] = [];

      for (let i = 0; i < maxIterations; i++) {
        setCurrentIteration(i + 1);

        // 模拟学习过程
        await new Promise((resolve) => setTimeout(resolve, 200));

        // 计算损失和准确率
        const loss = Math.exp(-i * 0.1) * (0.5 + Math.random() * 0.3);
        const accuracy = 1 - loss + Math.random() * 0.1;

        // 生成权重变化
        const weightChanges: Record<string, number> = {};
        scoringRules.forEach((rule) => {
          const change = (Math.random() - 0.5) * adaptiveConfig.maxWeightChange;
          weightChanges[rule.id] = change;

          // 更新自适应权重
          setScoringRules((prev) =>
            prev.map((r) =>
              r.id === rule.id
                ? {
                    ...r,
                    adaptiveWeight: Math.max(
                      0.1,
                      Math.min(2.0, r.adaptiveWeight + change)
                    ),
                    confidence: Math.min(
                      1.0,
                      r.confidence + Math.random() * 0.01
                    ),
                  }
                : r
            )
          );
        });

        const convergenceScore = Math.max(
          0,
          1 - i / maxIterations + Math.random() * 0.1
        );

        const record: LearningRecord = {
          id: `record_${i + 1}`,
          timestamp: new Date(),
          iteration: i + 1,
          loss,
          accuracy,
          weightChanges,
          improvements: [
            loss < 0.1 ? "损失函数收敛良好" : "继续优化损失函数",
            accuracy > 0.9 ? "准确率达到预期" : "准确率有待提升",
            convergenceScore > 0.8 ? "模型趋于稳定" : "模型仍在学习中",
          ],
          convergenceScore,
        };

        records.push(record);
        setLearningRecords((prev) => [...prev, record]);

        // 检查收敛条件
        if (loss < adaptiveConfig.convergenceThreshold) {
          break;
        }
      }

      setLearningStatus("completed");

      notification.success({
        message: "自适应学习完成",
        description: `经过 ${currentIteration} 次迭代，模型已收敛到最优状态`,
      });
    } catch {
      setLearningStatus("error");
      notification.error({
        message: "学习失败",
        description: "自适应学习过程中发生错误",
      });
    } finally {
      setIsOptimizing(false);
    }
  }, [scoringRules, adaptiveConfig, currentIteration]);

  // 运行自适应评分
  const runAdaptiveScoring = useCallback(async () => {
    if (scoringRules.filter((r) => r.enabled).length === 0) {
      notification.warning({
        message: "请先启用评分规则",
        description: "需要至少启用一个评分规则",
      });
      return;
    }

    setIsOptimizing(true);

    try {
      // 模拟评分过程
      const results: ScoringResult[] = [];
      const sampleCount = 20;

      for (let i = 0; i < sampleCount; i++) {
        await new Promise((resolve) => setTimeout(resolve, 100));

        const enabledRules = scoringRules.filter((r) => r.enabled);
        const dimensionScores: Record<ScoringDimension, number> = {} as Record<
          ScoringDimension,
          number
        >;

        // 计算各维度得分
        const dimensions: ScoringDimension[] = [
          "content",
          "structure",
          "language",
          "creativity",
          "logic",
          "accuracy",
        ];
        dimensions.forEach((dim) => {
          const dimRules = enabledRules.filter((r) => r.dimension === dim);
          if (dimRules.length > 0) {
            const weightedScore =
              dimRules.reduce(
                (sum, rule) =>
                  sum + (0.6 + Math.random() * 0.4) * rule.adaptiveWeight,
                0
              ) / dimRules.reduce((sum, rule) => sum + rule.adaptiveWeight, 0);
            dimensionScores[dim] = Math.min(1.0, weightedScore);
          }
        });

        const originalScore = 0.7 + Math.random() * 0.25;
        const adaptiveScore =
          Object.values(dimensionScores).reduce(
            (sum, score) => sum + score,
            0
          ) / Object.keys(dimensionScores).length;
        const confidence =
          enabledRules.reduce((sum, rule) => sum + rule.confidence, 0) /
          enabledRules.length;

        const result: ScoringResult = {
          id: `result_${i + 1}`,
          studentId: `student_${i + 1}`,
          questionId: `question_${Math.floor(i / 4) + 1}`,
          originalScore,
          adaptiveScore,
          confidence,
          dimensionScores,
          explanation: `基于自适应算法的综合评分，考虑了${
            Object.keys(dimensionScores).length
          }个维度`,
          improvements: [
            adaptiveScore > originalScore
              ? "自适应算法提升了评分准确性"
              : "建议进一步优化算法参数",
            confidence > 0.8 ? "评分置信度较高" : "建议增加训练样本",
            "持续学习将进一步提升评分质量",
          ],
          processingTime: 50 + Math.random() * 100,
          qualityIndicators: {
            consistency: 0.85 + Math.random() * 0.1,
            fairness: 0.9 + Math.random() * 0.08,
            reliability: confidence * 0.95,
          },
        };

        results.push(result);
      }

      setScoringResults(results);

      notification.success({
        message: "自适应评分完成",
        description: `成功评分 ${results.length} 份答卷，平均置信度 ${(
          (results.reduce((sum, r) => sum + r.confidence, 0) / results.length) *
          100
        ).toFixed(1)}%`,
      });
    } catch {
      notification.error({
        message: "评分失败",
        description: "自适应评分过程中发生错误",
      });
    } finally {
      setIsOptimizing(false);
    }
  }, [scoringRules]);

  // 更新规则配置
  const updateRuleConfig = useCallback(
    (ruleId: string, updates: Partial<ScoringRule>) => {
      setScoringRules((prev) =>
        prev.map((rule) =>
          rule.id === ruleId ? { ...rule, ...updates } : rule
        )
      );
    },
    []
  );

  // 重置学习状态
  const resetLearningState = useCallback(() => {
    setLearningStatus("idle");
    setCurrentIteration(0);
    setLearningRecords([]);
    setScoringResults([]);

    // 重置权重
    setScoringRules((prev) =>
      prev.map((rule) => ({
        ...rule,
        adaptiveWeight: rule.weight,
        confidence: 0.8 + Math.random() * 0.15,
      }))
    );
  }, []);

  // 初始化数据
  useEffect(() => {
    generateMockRules();
  }, [generateMockRules]);

  // 评分规则表格列
  const ruleColumns = [
    {
      title: "规则名称",
      dataIndex: "name",
      key: "name",
      render: (name: string, record: ScoringRule) => (
        <Space>
          <Tag
            color={
              {
                content: "blue",
                structure: "green",
                language: "purple",
                creativity: "orange",
                logic: "red",
                accuracy: "cyan",
              }[record.dimension]
            }
          >
            {record.dimension}
          </Tag>
          <Text strong>{name}</Text>
        </Space>
      ),
    },
    {
      title: "原始权重",
      dataIndex: "weight",
      key: "weight",
      width: 100,
      render: (weight: number) => <Text>{weight.toFixed(3)}</Text>,
    },
    {
      title: "自适应权重",
      dataIndex: "adaptiveWeight",
      key: "adaptiveWeight",
      width: 120,
      render: (adaptiveWeight: number, record: ScoringRule) => (
        <div>
          <Progress
            percent={adaptiveWeight * 50}
            size="small"
            showInfo={false}
            status={
              adaptiveWeight > record.weight
                ? "success"
                : adaptiveWeight < record.weight
                ? "exception"
                : "active"
            }
          />
          <Text>{adaptiveWeight.toFixed(3)}</Text>
          {adaptiveWeight > record.weight && (
            <RiseOutlined style={{ color: "#52c41a", marginLeft: "4px" }} />
          )}
          {adaptiveWeight < record.weight && (
            <FallOutlined style={{ color: "#ff4d4f", marginLeft: "4px" }} />
          )}
        </div>
      ),
    },
    {
      title: "置信度",
      dataIndex: "confidence",
      key: "confidence",
      width: 100,
      render: (confidence: number) => (
        <div>
          <Progress
            percent={confidence * 100}
            size="small"
            showInfo={false}
            status={confidence > 0.8 ? "success" : "active"}
          />
          <Text>{(confidence * 100).toFixed(1)}%</Text>
        </div>
      ),
    },
    {
      title: "样本数量",
      dataIndex: ["learningData", "sampleCount"],
      key: "sampleCount",
      width: 100,
      render: (count: number) => (
        <Badge count={count} style={{ backgroundColor: "#108ee9" }} />
      ),
    },
    {
      title: "改进率",
      dataIndex: ["learningData", "improvementRate"],
      key: "improvementRate",
      width: 100,
      render: (rate: number) => (
        <Tag color={rate > 0 ? "green" : rate < 0 ? "red" : "default"}>
          {rate > 0 ? "+" : ""}
          {(rate * 100).toFixed(1)}%
        </Tag>
      ),
    },
    {
      title: "启用",
      dataIndex: "enabled",
      key: "enabled",
      width: 80,
      render: (enabled: boolean, record: ScoringRule) => (
        <Switch
          checked={enabled}
          onChange={(checked) =>
            updateRuleConfig(record.id, { enabled: checked })
          }
        />
      ),
    },
  ];

  // 学习记录表格列
  const recordColumns = [
    {
      title: "迭代次数",
      dataIndex: "iteration",
      key: "iteration",
      width: 100,
    },
    {
      title: "损失值",
      dataIndex: "loss",
      key: "loss",
      width: 100,
      render: (loss: number) => (
        <Text
          style={{
            color: loss < 0.1 ? "#52c41a" : loss < 0.3 ? "#faad14" : "#ff4d4f",
          }}
        >
          {loss.toFixed(4)}
        </Text>
      ),
    },
    {
      title: "准确率",
      dataIndex: "accuracy",
      key: "accuracy",
      width: 100,
      render: (accuracy: number) => (
        <div>
          <Progress
            percent={accuracy * 100}
            size="small"
            showInfo={false}
            status={accuracy > 0.9 ? "success" : "active"}
          />
          <Text>{(accuracy * 100).toFixed(1)}%</Text>
        </div>
      ),
    },
    {
      title: "收敛度",
      dataIndex: "convergenceScore",
      key: "convergenceScore",
      width: 100,
      render: (score: number) => (
        <Progress
          type="circle"
          percent={score * 100}
          size={40}
          status={score > 0.8 ? "success" : "active"}
        />
      ),
    },
    {
      title: "时间",
      dataIndex: "timestamp",
      key: "timestamp",
      width: 150,
      render: (timestamp: Date) => new Date(timestamp).toLocaleTimeString(),
    },
  ];

  // 评分结果表格列
  const resultColumns = [
    {
      title: "学生ID",
      dataIndex: "studentId",
      key: "studentId",
      width: 100,
    },
    {
      title: "题目ID",
      dataIndex: "questionId",
      key: "questionId",
      width: 100,
    },
    {
      title: "原始得分",
      dataIndex: "originalScore",
      key: "originalScore",
      width: 100,
      render: (score: number) => <Text>{(score * 100).toFixed(1)}</Text>,
    },
    {
      title: "自适应得分",
      dataIndex: "adaptiveScore",
      key: "adaptiveScore",
      width: 120,
      render: (score: number, record: ScoringResult) => (
        <Space>
          <Text
            strong
            style={{
              color:
                score > record.originalScore
                  ? "#52c41a"
                  : score < record.originalScore
                  ? "#ff4d4f"
                  : "#1890ff",
            }}
          >
            {(score * 100).toFixed(1)}
          </Text>
          {score > record.originalScore && (
            <RiseOutlined style={{ color: "#52c41a" }} />
          )}
          {score < record.originalScore && (
            <FallOutlined style={{ color: "#ff4d4f" }} />
          )}
        </Space>
      ),
    },
    {
      title: "置信度",
      dataIndex: "confidence",
      key: "confidence",
      width: 100,
      render: (confidence: number) => (
        <Progress
          percent={confidence * 100}
          size="small"
          status={confidence > 0.8 ? "success" : "active"}
        />
      ),
    },
    {
      title: "公平性",
      dataIndex: ["qualityIndicators", "fairness"],
      key: "fairness",
      width: 100,
      render: (fairness: number) => (
        <Badge
          count={
            fairness > 0.9 ? (
              <HeartOutlined style={{ color: "#eb2f96" }} />
            ) : null
          }
        >
          <Text>{(fairness * 100).toFixed(0)}</Text>
        </Badge>
      ),
    },
    {
      title: "处理时间",
      dataIndex: "processingTime",
      key: "processingTime",
      width: 100,
      render: (time: number) => <Text>{time.toFixed(0)}ms</Text>,
    },
  ];

  // 统计数据
  const stats = {
    totalRules: scoringRules.length,
    enabledRules: scoringRules.filter((r) => r.enabled).length,
    avgConfidence:
      scoringRules.length > 0
        ? scoringRules.reduce((sum, r) => sum + r.confidence, 0) /
          scoringRules.length
        : 0,
    totalIterations: learningRecords.length,
    convergenceRate:
      learningRecords.length > 0
        ? learningRecords[learningRecords.length - 1]?.convergenceScore || 0
        : 0,
    avgImprovement:
      scoringResults.length > 0
        ? scoringResults.reduce(
            (sum, r) => sum + (r.adaptiveScore - r.originalScore),
            0
          ) / scoringResults.length
        : 0,
  };

  return (
    <div style={{ padding: "24px" }}>
      <Card
        title={
          <Space>
            <BankOutlined />
            <Title level={3} style={{ margin: 0 }}>
              自适应评分算法系统
            </Title>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setConfigModalVisible(true)}
            >
              算法配置
            </Button>
            <Button icon={<ReloadOutlined />} onClick={resetLearningState}>
              重置学习
            </Button>
            <Button
              type="primary"
              icon={<BulbOutlined />}
              loading={isOptimizing && learningStatus === "training"}
              onClick={startAdaptiveLearning}
            >
              开始学习
            </Button>
            <Button
              type="primary"
              icon={<RobotOutlined />}
              loading={isOptimizing && learningStatus !== "training"}
              onClick={runAdaptiveScoring}
            >
              自适应评分
            </Button>
          </Space>
        }
      >
        {/* 统计面板 */}
        <Row gutter={16} style={{ marginBottom: "24px" }}>
          <Col span={4}>
            <Statistic
              title="评分规则"
              value={stats.totalRules}
              prefix={<DatabaseOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="启用规则"
              value={stats.enabledRules}
              prefix={<ApiOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="平均置信度"
              value={stats.avgConfidence * 100}
              precision={1}
              suffix="%"
              prefix={<TrophyOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="学习迭代"
              value={stats.totalIterations}
              prefix={<SyncOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="收敛率"
              value={stats.convergenceRate * 100}
              precision={1}
              suffix="%"
              prefix={<ThunderboltOutlined />}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="平均提升"
              value={stats.avgImprovement * 100}
              precision={2}
              suffix="%"
              prefix={
                stats.avgImprovement > 0 ? <RiseOutlined /> : <FallOutlined />
              }
              valueStyle={{
                color: stats.avgImprovement > 0 ? "#3f8600" : "#cf1322",
              }}
            />
          </Col>
        </Row>

        {/* 学习状态 */}
        {learningStatus !== "idle" && (
          <Card size="small" style={{ marginBottom: "16px" }}>
            <Row align="middle" gutter={16}>
              <Col span={6}>
                <Steps
                  size="small"
                  current={
                    {
                      training: 0,
                      optimizing: 1,
                      completed: 2,
                      error: 0,
                    }[learningStatus]
                  }
                >
                  <Step
                    title="训练"
                    icon={
                      learningStatus === "training" ? (
                        <SyncOutlined spin />
                      ) : undefined
                    }
                  />
                  <Step
                    title="优化"
                    icon={
                      learningStatus === "optimizing" ? (
                        <SyncOutlined spin />
                      ) : undefined
                    }
                  />
                  <Step
                    title="完成"
                    icon={
                      learningStatus === "completed" ? (
                        <CheckCircleOutlined />
                      ) : learningStatus === "error" ? (
                        <ExclamationCircleOutlined />
                      ) : undefined
                    }
                  />
                </Steps>
              </Col>
              <Col span={6}>
                <Statistic
                  title="当前迭代"
                  value={currentIteration}
                  prefix={<ClockCircleOutlined />}
                />
              </Col>
              <Col span={12}>
                <Progress
                  percent={
                    learningStatus === "completed"
                      ? 100
                      : (currentIteration / 50) * 100
                  }
                  status={
                    learningStatus === "error"
                      ? "exception"
                      : learningStatus === "completed"
                      ? "success"
                      : "active"
                  }
                  showInfo
                />
              </Col>
            </Row>
          </Card>
        )}

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 评分规则 */}
          <TabPane tab="评分规则" key="rules">
            <Table
              columns={ruleColumns}
              dataSource={scoringRules}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </TabPane>

          {/* 学习记录 */}
          <TabPane tab="学习记录" key="learning">
            {learningRecords.length > 0 ? (
              <Table
                columns={recordColumns}
                dataSource={learningRecords}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                size="small"
              />
            ) : (
              <Empty description="暂无学习记录" />
            )}
          </TabPane>

          {/* 评分结果 */}
          <TabPane tab="评分结果" key="results">
            {scoringResults.length > 0 ? (
              <Table
                columns={resultColumns}
                dataSource={scoringResults}
                rowKey="id"
                pagination={{ pageSize: 10 }}
                size="small"
              />
            ) : (
              <Empty description="暂无评分结果" />
            )}
          </TabPane>

          {/* 性能分析 */}
          <TabPane tab="性能分析" key="performance">
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="规则权重变化">
                  <List
                    size="small"
                    dataSource={scoringRules.slice(0, 6)}
                    renderItem={(rule) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <Tag
                              color={
                                {
                                  content: "blue",
                                  structure: "green",
                                  language: "purple",
                                  creativity: "orange",
                                  logic: "red",
                                  accuracy: "cyan",
                                }[rule.dimension]
                              }
                            >
                              {rule.dimension}
                            </Tag>
                          }
                          title={rule.name}
                          description={
                            <Space>
                              <Text>原始: {rule.weight.toFixed(3)}</Text>
                              <Text>
                                自适应: {rule.adaptiveWeight.toFixed(3)}
                              </Text>
                              {rule.adaptiveWeight > rule.weight && (
                                <RiseOutlined style={{ color: "#52c41a" }} />
                              )}
                              {rule.adaptiveWeight < rule.weight && (
                                <FallOutlined style={{ color: "#ff4d4f" }} />
                              )}
                            </Space>
                          }
                        />
                        <Progress
                          percent={rule.confidence * 100}
                          size="small"
                          style={{ width: "100px" }}
                        />
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="评分质量提升">
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <Statistic
                      title="质量提升率"
                      value={stats.avgImprovement * 100}
                      precision={2}
                      suffix="%"
                      prefix={<FireOutlined style={{ color: "#f5222d" }} />}
                      valueStyle={{
                        color: stats.avgImprovement > 0 ? "#3f8600" : "#cf1322",
                      }}
                    />
                    <Progress
                      type="circle"
                      percent={Math.abs(stats.avgImprovement) * 1000}
                      style={{ marginTop: "16px" }}
                      status={
                        stats.avgImprovement > 0 ? "success" : "exception"
                      }
                    />
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* 算法配置模态框 */}
      <Modal
        title="自适应算法配置"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={configForm}
          layout="vertical"
          initialValues={adaptiveConfig}
          onFinish={(values) => {
            setAdaptiveConfig(values);
            setConfigModalVisible(false);
            notification.success({ message: "配置已保存" });
          }}
        >
          <Form.Item label="学习率" name="learningRate">
            <Slider
              min={0.001}
              max={0.1}
              step={0.001}
              marks={{ 0.001: "0.001", 0.01: "0.01", 0.1: "0.1" }}
            />
          </Form.Item>

          <Form.Item label="适应阈值" name="adaptationThreshold">
            <Slider
              min={0.01}
              max={0.2}
              step={0.01}
              marks={{ 0.01: "1%", 0.05: "5%", 0.1: "10%", 0.2: "20%" }}
            />
          </Form.Item>

          <Form.Item label="最大权重变化" name="maxWeightChange">
            <Slider
              min={0.05}
              max={0.5}
              step={0.05}
              marks={{ 0.05: "5%", 0.2: "20%", 0.5: "50%" }}
            />
          </Form.Item>

          <Form.Item label="最小样本数" name="minSampleSize">
            <Input type="number" min={50} max={1000} />
          </Form.Item>

          <Form.Item label="收敛阈值" name="convergenceThreshold">
            <Slider
              min={0.0001}
              max={0.01}
              step={0.0001}
              marks={{ 0.0001: "0.0001", 0.001: "0.001", 0.01: "0.01" }}
            />
          </Form.Item>

          <Form.Item
            label="实时适应"
            name="enableRealTimeAdaptation"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            label="交叉验证"
            name="enableCrossValidation"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item label="优化策略" name="optimizationStrategy">
            <Radio.Group>
              <Radio value="gradient_descent">梯度下降</Radio>
              <Radio value="genetic_algorithm">遗传算法</Radio>
              <Radio value="reinforcement_learning">强化学习</Radio>
              <Radio value="ensemble">集成方法</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                保存配置
              </Button>
              <Button onClick={() => setConfigModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdaptiveScoringSystem;
