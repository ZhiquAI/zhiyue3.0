import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Divider,
  Row,
  Col,
  Statistic,
  Alert,
  Tabs,
  Form,
  Switch,
  Modal,
  Tooltip,
  Progress,
  List,
  Typography,
  Slider,
  Radio,
} from "antd";
import {
  PlayCircleOutlined,
  StopOutlined,
  EyeOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  RobotOutlined,
  ScanOutlined,
  EditOutlined,
} from "@ant-design/icons";

const { TabPane } = Tabs;

const { Text, Title } = Typography;

// 题目类型定义
interface Question {
  id: string;
  number: number;
  type: "objective" | "subjective";
  content: string;
  options?: string[];
  correctAnswer?: string | number;
  maxScore: number;
  difficulty: "easy" | "medium" | "hard";
  keywords?: string[];
  rubric?: {
    criteria: Array<{
      name: string;
      description: string;
      maxPoints: number;
    }>;
  };
}

// OMR识别结果
interface OMRResult {
  questionId: string;
  detectedAnswer: string;
  confidence: number;
  alternatives: Array<{
    answer: string;
    confidence: number;
  }>;
  imageQuality: number;
  issues: string[];
}

// AI评分结果
interface AIGradingResult {
  questionId: string;
  score: number;
  maxScore: number;
  confidence: number;
  feedback: string;
  criteriaScores: Array<{
    criterion: string;
    score: number;
    maxScore: number;
    reasoning: string;
  }>;
  suggestedImprovements: string[];
  flaggedForReview: boolean;
}

// 阅卷任务
interface GradingTask {
  id: string;
  studentId: string;
  studentName: string;
  examId: string;
  status: "pending" | "processing" | "completed" | "review_required" | "failed";
  questions: Question[];
  omrResults: OMRResult[];
  aiResults: AIGradingResult[];
  totalScore: number;
  maxTotalScore: number;
  processingTime: number;
  qualityMetrics: {
    overallConfidence: number;
    imageQuality: number;
    consistencyScore: number;
  };
  flags: Array<{
    type: "low_confidence" | "inconsistent" | "quality_issue" | "anomaly";
    message: string;
    severity: "low" | "medium" | "high";
  }>;
}

// 评分配置
interface GradingConfig {
  omrSettings: {
    confidenceThreshold: number;
    qualityThreshold: number;
    enableMultipleDetection: boolean;
  };
  aiSettings: {
    model: "gpt-4" | "claude-3" | "gemini-pro";
    temperature: number;
    enableContextualScoring: boolean;
    strictnessLevel: "lenient" | "standard" | "strict";
  };
  qualityControl: {
    requireHumanReview: boolean;
    confidenceThreshold: number;
    flagAnomalies: boolean;
  };
}

const HybridGradingEngine: React.FC = () => {
  const [tasks, setTasks] = useState<GradingTask[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedTask, setSelectedTask] = useState<GradingTask | null>(null);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [config, setConfig] = useState<GradingConfig>({
    omrSettings: {
      confidenceThreshold: 0.85,
      qualityThreshold: 0.8,
      enableMultipleDetection: true,
    },
    aiSettings: {
      model: "gpt-4",
      temperature: 0.3,
      enableContextualScoring: true,
      strictnessLevel: "standard",
    },
    qualityControl: {
      requireHumanReview: true,
      confidenceThreshold: 0.9,
      flagAnomalies: true,
    },
  });
  const [processingProgress, setProcessingProgress] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // 模拟题目数据
  const sampleQuestions: Question[] = [
    {
      id: "q1",
      number: 1,
      type: "objective",
      content: "下列哪个选项是正确的？",
      options: ["A. 选项A", "B. 选项B", "C. 选项C", "D. 选项D"],
      correctAnswer: "C",
      maxScore: 5,
      difficulty: "easy",
    },
    {
      id: "q2",
      number: 2,
      type: "subjective",
      content: "请简述人工智能在教育领域的应用前景。",
      maxScore: 15,
      difficulty: "medium",
      keywords: ["人工智能", "教育", "应用", "前景"],
      rubric: {
        criteria: [
          {
            name: "内容完整性",
            description: "回答是否涵盖主要方面",
            maxPoints: 5,
          },
          { name: "逻辑清晰度", description: "论述是否条理清楚", maxPoints: 5 },
          { name: "创新性", description: "是否有独特见解", maxPoints: 5 },
        ],
      },
    },
    {
      id: "q3",
      number: 3,
      type: "objective",
      content: "机器学习的主要类型包括：",
      options: ["A. 监督学习", "B. 无监督学习", "C. 强化学习", "D. 以上都是"],
      correctAnswer: "D",
      maxScore: 5,
      difficulty: "medium",
    },
  ];

  // 模拟OMR识别
  const processOMR = useCallback(
    async (questions: Question[]): Promise<OMRResult[]> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const results: OMRResult[] = questions
            .filter((q) => q.type === "objective")
            .map((question) => {
              const confidence = 0.7 + Math.random() * 0.25;
              const detectedAnswer = ["A", "B", "C", "D"][
                Math.floor(Math.random() * 4)
              ];

              return {
                questionId: question.id,
                detectedAnswer,
                confidence,
                alternatives: [
                  { answer: detectedAnswer, confidence },
                  { answer: "B", confidence: confidence - 0.1 },
                  { answer: "C", confidence: confidence - 0.2 },
                ],
                imageQuality: 0.8 + Math.random() * 0.15,
                issues: confidence < 0.8 ? ["图像模糊", "标记不清"] : [],
              };
            });
          resolve(results);
        }, 1500);
      });
    },
    []
  );

  // 模拟AI评分
  const processAIGrading = useCallback(
    async (questions: Question[]): Promise<AIGradingResult[]> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const results: AIGradingResult[] = questions
            .filter((q) => q.type === "subjective")
            .map((question) => {
              const score =
                Math.floor(Math.random() * question.maxScore * 0.8) +
                question.maxScore * 0.2;
              const confidence = 0.75 + Math.random() * 0.2;

              return {
                questionId: question.id,
                score,
                maxScore: question.maxScore,
                confidence,
                feedback: "回答较为完整，逻辑清晰，但可以进一步深入分析。",
                criteriaScores:
                  question.rubric?.criteria.map((criterion) => ({
                    criterion: criterion.name,
                    score:
                      Math.floor(Math.random() * criterion.maxPoints * 0.8) +
                      criterion.maxPoints * 0.2,
                    maxScore: criterion.maxPoints,
                    reasoning: `在${criterion.name}方面表现良好`,
                  })) || [],
                suggestedImprovements: [
                  "可以增加更多具体例子",
                  "论述可以更加深入",
                ],
                flaggedForReview: confidence < 0.8,
              };
            });
          resolve(results);
        }, 2500);
      });
    },
    []
  );

  // 开始批量阅卷
  const startBatchGrading = useCallback(async () => {
    setIsProcessing(true);
    setProcessingProgress(0);

    // 模拟创建多个阅卷任务
    const newTasks: GradingTask[] = Array.from({ length: 5 }, (_, index) => ({
      id: `task_${Date.now()}_${index}`,
      studentId: `student_${index + 1}`,
      studentName: `学生${index + 1}`,
      examId: "exam_001",
      status: "pending",
      questions: sampleQuestions,
      omrResults: [],
      aiResults: [],
      totalScore: 0,
      maxTotalScore: sampleQuestions.reduce((sum, q) => sum + q.maxScore, 0),
      processingTime: 0,
      qualityMetrics: {
        overallConfidence: 0,
        imageQuality: 0,
        consistencyScore: 0,
      },
      flags: [],
    }));

    setTasks((prev) => [...prev, ...newTasks]);

    // 模拟进度更新
    intervalRef.current = setInterval(() => {
      setProcessingProgress((prev) => {
        if (prev >= 100) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
          }
          return 100;
        }
        return prev + 2;
      });
    }, 100);

    // 逐个处理任务
    for (let i = 0; i < newTasks.length; i++) {
      const task = newTasks[i];

      // 更新任务状态为处理中
      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id ? { ...t, status: "processing" as const } : t
        )
      );

      try {
        const startTime = Date.now();

        // 并行处理OMR和AI评分
        const [omrResults, aiResults] = await Promise.all([
          processOMR(task.questions),
          processAIGrading(task.questions),
        ]);

        const processingTime = (Date.now() - startTime) / 1000;

        // 计算总分
        const omrScore = omrResults.reduce((sum, result) => {
          const question = task.questions.find(
            (q) => q.id === result.questionId
          );
          return (
            sum +
            (result.detectedAnswer === question?.correctAnswer
              ? question.maxScore
              : 0)
          );
        }, 0);

        const aiScore = aiResults.reduce(
          (sum, result) => sum + result.score,
          0
        );
        const totalScore = omrScore + aiScore;

        // 计算质量指标
        const overallConfidence =
          [...omrResults, ...aiResults].reduce(
            (sum, r) => sum + r.confidence,
            0
          ) /
          (omrResults.length + aiResults.length);
        const imageQuality =
          omrResults.reduce((sum, r) => sum + r.imageQuality, 0) /
          omrResults.length;

        // 生成标记
        const flags: Array<{
          type: "low_confidence" | "inconsistent" | "quality_issue" | "anomaly";
          message: string;
          severity: "low" | "medium" | "high";
        }> = [];
        if (overallConfidence < config.qualityControl.confidenceThreshold) {
          flags.push({
            type: "low_confidence" as const,
            message: "整体置信度较低，建议人工复核",
            severity: "medium" as const,
          });
        }

        if (aiResults.some((r) => r.flaggedForReview)) {
          flags.push({
            type: "inconsistent" as const,
            message: "主观题评分存在争议，需要人工审核",
            severity: "high" as const,
          });
        }

        // 更新任务结果
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id
              ? {
                  ...t,
                  status:
                    flags.length > 0 && config.qualityControl.requireHumanReview
                      ? ("review_required" as const)
                      : ("completed" as const),
                  omrResults,
                  aiResults,
                  totalScore,
                  processingTime,
                  qualityMetrics: {
                    overallConfidence,
                    imageQuality,
                    consistencyScore: 0.85 + Math.random() * 0.1,
                  },
                  flags,
                }
              : t
          )
        );
      } catch {
        setTasks((prev) =>
          prev.map((t) =>
            t.id === task.id ? { ...t, status: "failed" as const } : t
          )
        );
      }
    }

    setIsProcessing(false);
  }, [sampleQuestions, processOMR, processAIGrading, config]);

  // 停止处理
  const stopProcessing = useCallback(() => {
    setIsProcessing(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setProcessingProgress(0);
  }, []);

  // 查看详情
  const viewTaskDetail = useCallback((task: GradingTask) => {
    setSelectedTask(task);
    setDetailModalVisible(true);
  }, []);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // 表格列定义
  const columns = [
    {
      title: "学生",
      dataIndex: "studentName",
      key: "studentName",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => {
        const statusConfig = {
          pending: { color: "default", text: "待处理" },
          processing: { color: "processing", text: "处理中" },
          completed: { color: "success", text: "已完成" },
          review_required: { color: "warning", text: "需复核" },
          failed: { color: "error", text: "失败" },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "总分",
      key: "score",
      render: (_: unknown, record: GradingTask) =>
        `${record.totalScore}/${record.maxTotalScore}`,
    },
    {
      title: "置信度",
      dataIndex: ["qualityMetrics", "overallConfidence"],
      key: "confidence",
      render: (confidence: number) => {
        if (confidence === 0) return "-";
        const color =
          confidence > 0.9 ? "success" : confidence > 0.7 ? "warning" : "error";
        return <Tag color={color}>{(confidence * 100).toFixed(1)}%</Tag>;
      },
    },
    {
      title: "处理时间",
      dataIndex: "processingTime",
      key: "processingTime",
      render: (time: number) => (time > 0 ? `${time.toFixed(1)}s` : "-"),
    },
    {
      title: "标记",
      dataIndex: "flags",
      key: "flags",
      render: (flags: GradingTask["flags"]) => {
        if (flags.length === 0) {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              无问题
            </Tag>
          );
        }
        return (
          <Tooltip title={flags.map((flag) => flag.message).join("; ")}>
            <Tag color="warning" icon={<ExclamationCircleOutlined />}>
              {flags.length}个问题
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "操作",
      key: "actions",
      render: (_: unknown, record: GradingTask) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => viewTaskDetail(record)}
            disabled={record.status === "pending"}
          >
            详情
          </Button>
        </Space>
      ),
    },
  ];

  // 统计数据
  const stats = {
    total: tasks.length,
    completed: tasks.filter((t) => t.status === "completed").length,
    processing: tasks.filter((t) => t.status === "processing").length,
    reviewRequired: tasks.filter((t) => t.status === "review_required").length,
    failed: tasks.filter((t) => t.status === "failed").length,
    avgScore:
      tasks.length > 0
        ? (tasks
            .filter((t) => t.totalScore > 0)
            .reduce((sum, t) => sum + t.totalScore / t.maxTotalScore, 0) /
            tasks.filter((t) => t.totalScore > 0).length) *
          100
        : 0,
  };

  return (
    <div style={{ padding: "24px" }}>
      <Card
        title="混合智能阅卷引擎"
        extra={
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setConfigModalVisible(true)}
            >
              配置
            </Button>
            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              onClick={startBatchGrading}
              disabled={isProcessing}
              loading={isProcessing}
            >
              开始阅卷
            </Button>
            {isProcessing && (
              <Button icon={<StopOutlined />} onClick={stopProcessing} danger>
                停止
              </Button>
            )}
          </Space>
        }
      >
        {/* 统计面板 */}
        <Row gutter={16} style={{ marginBottom: "24px" }}>
          <Col span={4}>
            <Statistic title="总任务数" value={stats.total} />
          </Col>
          <Col span={4}>
            <Statistic
              title="已完成"
              value={stats.completed}
              valueStyle={{ color: "#3f8600" }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="处理中"
              value={stats.processing}
              valueStyle={{ color: "#1890ff" }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="需复核"
              value={stats.reviewRequired}
              valueStyle={{ color: "#fa8c16" }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="失败"
              value={stats.failed}
              valueStyle={{ color: "#cf1322" }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="平均得分率"
              value={stats.avgScore}
              precision={1}
              suffix="%"
              valueStyle={{
                color: stats.avgScore > 80 ? "#3f8600" : "#cf1322",
              }}
            />
          </Col>
        </Row>

        {/* 进度条 */}
        {isProcessing && (
          <div style={{ marginBottom: "24px" }}>
            <Progress
              percent={processingProgress}
              status={processingProgress === 100 ? "success" : "active"}
              format={(percent) => `处理进度 ${percent}%`}
            />
          </div>
        )}

        <Divider />

        {/* 任务列表 */}
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={isProcessing}
        />
      </Card>

      {/* 详情模态框 */}
      <Modal
        title={`阅卷详情 - ${selectedTask?.studentName}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={1000}
        footer={null}
      >
        {selectedTask && (
          <Tabs defaultActiveKey="results">
            <TabPane tab="评分结果" key="results">
              <Row gutter={16} style={{ marginBottom: "16px" }}>
                <Col span={8}>
                  <Statistic
                    title="总分"
                    value={selectedTask.totalScore}
                    suffix={`/ ${selectedTask.maxTotalScore}`}
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="得分率"
                    value={(
                      (selectedTask.totalScore / selectedTask.maxTotalScore) *
                      100
                    ).toFixed(1)}
                    suffix="%"
                  />
                </Col>
                <Col span={8}>
                  <Statistic
                    title="置信度"
                    value={(
                      selectedTask.qualityMetrics.overallConfidence * 100
                    ).toFixed(1)}
                    suffix="%"
                  />
                </Col>
              </Row>

              <Title level={5}>客观题 (OMR识别)</Title>
              <List
                dataSource={selectedTask.omrResults}
                renderItem={(result) => {
                  const question = selectedTask.questions.find(
                    (q) => q.id === result.questionId
                  );
                  const isCorrect =
                    result.detectedAnswer === question?.correctAnswer;
                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={
                          <ScanOutlined
                            style={{ color: isCorrect ? "#52c41a" : "#ff4d4f" }}
                          />
                        }
                        title={`第${question?.number}题`}
                        description={
                          <Space direction="vertical" size="small">
                            <Text>
                              检测答案:{" "}
                              <Tag color={isCorrect ? "success" : "error"}>
                                {result.detectedAnswer}
                              </Tag>
                            </Text>
                            <Text>
                              置信度: {(result.confidence * 100).toFixed(1)}%
                            </Text>
                            {result.issues.length > 0 && (
                              <Text type="warning">
                                问题: {result.issues.join(", ")}
                              </Text>
                            )}
                          </Space>
                        }
                      />
                      <div>
                        {isCorrect ? question?.maxScore : 0} /{" "}
                        {question?.maxScore} 分
                      </div>
                    </List.Item>
                  );
                }}
              />

              <Title level={5} style={{ marginTop: "24px" }}>
                主观题 (AI评分)
              </Title>
              <List
                dataSource={selectedTask.aiResults}
                renderItem={(result) => {
                  const question = selectedTask.questions.find(
                    (q) => q.id === result.questionId
                  );
                  return (
                    <List.Item>
                      <List.Item.Meta
                        avatar={<RobotOutlined style={{ color: "#1890ff" }} />}
                        title={`第${question?.number}题`}
                        description={
                          <Space direction="vertical" size="small">
                            <Text>{result.feedback}</Text>
                            <Text>
                              置信度: {(result.confidence * 100).toFixed(1)}%
                            </Text>
                            {result.flaggedForReview && (
                              <Tag color="warning" icon={<EditOutlined />}>
                                需人工复核
                              </Tag>
                            )}
                          </Space>
                        }
                      />
                      <div>
                        {result.score} / {result.maxScore} 分
                      </div>
                    </List.Item>
                  );
                }}
              />
            </TabPane>

            <TabPane tab="质量指标" key="quality">
              <Row gutter={16}>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="整体置信度"
                      value={(
                        selectedTask.qualityMetrics.overallConfidence * 100
                      ).toFixed(1)}
                      suffix="%"
                      valueStyle={{
                        color:
                          selectedTask.qualityMetrics.overallConfidence > 0.9
                            ? "#3f8600"
                            : "#cf1322",
                      }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="图像质量"
                      value={(
                        selectedTask.qualityMetrics.imageQuality * 100
                      ).toFixed(1)}
                      suffix="%"
                      valueStyle={{
                        color:
                          selectedTask.qualityMetrics.imageQuality > 0.8
                            ? "#3f8600"
                            : "#cf1322",
                      }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="一致性评分"
                      value={(
                        selectedTask.qualityMetrics.consistencyScore * 100
                      ).toFixed(1)}
                      suffix="%"
                      valueStyle={{
                        color:
                          selectedTask.qualityMetrics.consistencyScore > 0.85
                            ? "#3f8600"
                            : "#cf1322",
                      }}
                    />
                  </Card>
                </Col>
              </Row>

              {selectedTask.flags.length > 0 && (
                <div style={{ marginTop: "24px" }}>
                  <Title level={5}>质量问题</Title>
                  <List
                    dataSource={selectedTask.flags}
                    renderItem={(flag) => (
                      <List.Item>
                        <Alert
                          message={flag.message}
                          type={
                            flag.severity === "high"
                              ? "error"
                              : flag.severity === "medium"
                              ? "warning"
                              : "info"
                          }
                          showIcon
                        />
                      </List.Item>
                    )}
                  />
                </div>
              )}
            </TabPane>
          </Tabs>
        )}
      </Modal>

      {/* 配置模态框 */}
      <Modal
        title="阅卷配置"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        onOk={() => setConfigModalVisible(false)}
        width={800}
      >
        <Tabs defaultActiveKey="omr">
          <TabPane tab="OMR设置" key="omr">
            <Form layout="vertical">
              <Form.Item label="置信度阈值">
                <Slider
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={config.omrSettings.confidenceThreshold}
                  onChange={(value) =>
                    setConfig((prev) => ({
                      ...prev,
                      omrSettings: {
                        ...prev.omrSettings,
                        confidenceThreshold: value,
                      },
                    }))
                  }
                  marks={{
                    0.5: "50%",
                    0.75: "75%",
                    1: "100%",
                  }}
                />
              </Form.Item>
              <Form.Item label="图像质量阈值">
                <Slider
                  min={0.5}
                  max={1}
                  step={0.05}
                  value={config.omrSettings.qualityThreshold}
                  onChange={(value) =>
                    setConfig((prev) => ({
                      ...prev,
                      omrSettings: {
                        ...prev.omrSettings,
                        qualityThreshold: value,
                      },
                    }))
                  }
                  marks={{
                    0.5: "50%",
                    0.75: "75%",
                    1: "100%",
                  }}
                />
              </Form.Item>
              <Form.Item label="启用多重检测">
                <Switch
                  checked={config.omrSettings.enableMultipleDetection}
                  onChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      omrSettings: {
                        ...prev.omrSettings,
                        enableMultipleDetection: checked,
                      },
                    }))
                  }
                />
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="AI设置" key="ai">
            <Form layout="vertical">
              <Form.Item label="AI模型">
                <Radio.Group
                  value={config.aiSettings.model}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      aiSettings: { ...prev.aiSettings, model: e.target.value },
                    }))
                  }
                >
                  <Radio value="gpt-4">GPT-4</Radio>
                  <Radio value="claude-3">Claude-3</Radio>
                  <Radio value="gemini-pro">Gemini Pro</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item label="创造性参数">
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={config.aiSettings.temperature}
                  onChange={(value) =>
                    setConfig((prev) => ({
                      ...prev,
                      aiSettings: { ...prev.aiSettings, temperature: value },
                    }))
                  }
                  marks={{
                    0: "保守",
                    0.5: "平衡",
                    1: "创新",
                  }}
                />
              </Form.Item>
              <Form.Item label="严格程度">
                <Radio.Group
                  value={config.aiSettings.strictnessLevel}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      aiSettings: {
                        ...prev.aiSettings,
                        strictnessLevel: e.target.value,
                      },
                    }))
                  }
                >
                  <Radio value="lenient">宽松</Radio>
                  <Radio value="standard">标准</Radio>
                  <Radio value="strict">严格</Radio>
                </Radio.Group>
              </Form.Item>
            </Form>
          </TabPane>

          <TabPane tab="质量控制" key="quality">
            <Form layout="vertical">
              <Form.Item label="需要人工复核">
                <Switch
                  checked={config.qualityControl.requireHumanReview}
                  onChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      qualityControl: {
                        ...prev.qualityControl,
                        requireHumanReview: checked,
                      },
                    }))
                  }
                />
              </Form.Item>
              <Form.Item label="复核置信度阈值">
                <Slider
                  min={0.7}
                  max={1}
                  step={0.05}
                  value={config.qualityControl.confidenceThreshold}
                  onChange={(value) =>
                    setConfig((prev) => ({
                      ...prev,
                      qualityControl: {
                        ...prev.qualityControl,
                        confidenceThreshold: value,
                      },
                    }))
                  }
                  marks={{
                    0.7: "70%",
                    0.85: "85%",
                    1: "100%",
                  }}
                />
              </Form.Item>
              <Form.Item label="标记异常">
                <Switch
                  checked={config.qualityControl.flagAnomalies}
                  onChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      qualityControl: {
                        ...prev.qualityControl,
                        flagAnomalies: checked,
                      },
                    }))
                  }
                />
              </Form.Item>
            </Form>
          </TabPane>
        </Tabs>
      </Modal>
    </div>
  );
};

export default HybridGradingEngine;
