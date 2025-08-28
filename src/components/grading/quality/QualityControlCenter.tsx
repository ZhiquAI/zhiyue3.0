import React, { useState, useCallback, useEffect } from "react";
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
  Input,
  Switch,
  Modal,
  Tooltip,
  Progress,
  List,
  Typography,
  Rate,
  Badge,
  Timeline,
  Avatar,
  Descriptions,
  Popconfirm,
} from "antd";
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  UserOutlined,
  RobotOutlined,
  HistoryOutlined,
  FlagOutlined,
  ReloadOutlined,
} from "@ant-design/icons";

const { TabPane } = Tabs;
const { Text } = Typography;
const { TextArea } = Input;

// 复核任务类型
interface ReviewTask {
  id: string;
  studentId: string;
  studentName: string;
  examId: string;
  questionId: string;
  questionNumber: number;
  questionType: "objective" | "subjective";
  originalScore: number;
  maxScore: number;
  aiConfidence: number;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_review" | "completed" | "disputed";
  assignedReviewer?: string;
  reviewerLevel: "junior" | "senior" | "expert";
  flags: Array<{
    type: "low_confidence" | "inconsistent" | "anomaly" | "bias_detected";
    message: string;
    severity: "low" | "medium" | "high";
    autoDetected: boolean;
  }>;
  reviewHistory: Array<{
    reviewerId: string;
    reviewerName: string;
    timestamp: Date;
    action: "assigned" | "reviewed" | "approved" | "rejected" | "escalated";
    score?: number;
    comments?: string;
    confidence: number;
  }>;
  qualityMetrics: {
    imageQuality: number;
    textClarity: number;
    answerCompleteness: number;
    consistencyScore: number;
  };
  createdAt: Date;
  deadline: Date;
}

// 复核员信息
interface Reviewer {
  id: string;
  name: string;
  level: "junior" | "senior" | "expert";
  specialties: string[];
  workload: number;
  maxWorkload: number;
  accuracy: number;
  avgReviewTime: number;
  status: "available" | "busy" | "offline";
}

const QualityControlCenter: React.FC = () => {
  const [reviewTasks, setReviewTasks] = useState<ReviewTask[]>([]);
  const [selectedTask, setSelectedTask] = useState<ReviewTask | null>(null);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);

  const [reviewForm] = Form.useForm();
  const [activeTab, setActiveTab] = useState("pending");
  const [autoAssignment, setAutoAssignment] = useState(true);

  // 模拟复核员数据
  const reviewers: Reviewer[] = [
    {
      id: "reviewer_1",
      name: "张老师",
      level: "expert",
      specialties: ["数学", "物理"],
      workload: 5,
      maxWorkload: 15,
      accuracy: 0.96,
      avgReviewTime: 3.2,
      status: "available",
    },
    {
      id: "reviewer_2",
      name: "李老师",
      level: "senior",
      specialties: ["语文", "英语"],
      workload: 8,
      maxWorkload: 12,
      accuracy: 0.94,
      avgReviewTime: 4.1,
      status: "available",
    },
    {
      id: "reviewer_3",
      name: "王老师",
      level: "junior",
      specialties: ["化学", "生物"],
      workload: 3,
      maxWorkload: 10,
      accuracy: 0.89,
      avgReviewTime: 5.5,
      status: "busy",
    },
  ];

  // 生成模拟复核任务
  const generateMockTasks = useCallback(() => {
    const mockTasks: ReviewTask[] = Array.from({ length: 20 }, (_, index) => {
      const priority = ["low", "medium", "high", "urgent"][
        Math.floor(Math.random() * 4)
      ] as ReviewTask["priority"];
      const status = ["pending", "in_review", "completed"][
        Math.floor(Math.random() * 3)
      ] as ReviewTask["status"];
      const questionType = Math.random() > 0.6 ? "subjective" : "objective";
      const aiConfidence = 0.5 + Math.random() * 0.4;

      const flags = [];
      if (aiConfidence < 0.8) {
        flags.push({
          type: "low_confidence" as const,
          message: "AI评分置信度较低",
          severity: "medium" as const,
          autoDetected: true,
        });
      }

      if (Math.random() > 0.8) {
        flags.push({
          type: "inconsistent" as const,
          message: "评分结果与预期存在较大差异",
          severity: "high" as const,
          autoDetected: true,
        });
      }

      return {
        id: `task_${index + 1}`,
        studentId: `student_${index + 1}`,
        studentName: `学生${index + 1}`,
        examId: "exam_001",
        questionId: `q_${(index % 5) + 1}`,
        questionNumber: (index % 5) + 1,
        questionType,
        originalScore: Math.floor(Math.random() * 15) + 5,
        maxScore: 20,
        aiConfidence,
        priority,
        status,
        assignedReviewer:
          status !== "pending"
            ? reviewers[Math.floor(Math.random() * reviewers.length)].id
            : undefined,
        reviewerLevel:
          priority === "urgent"
            ? "expert"
            : priority === "high"
            ? "senior"
            : "junior",
        flags,
        reviewHistory:
          status !== "pending"
            ? [
                {
                  reviewerId: "system",
                  reviewerName: "系统",
                  timestamp: new Date(Date.now() - Math.random() * 86400000),
                  action: "assigned",
                  confidence: 1.0,
                },
              ]
            : [],
        qualityMetrics: {
          imageQuality: 0.7 + Math.random() * 0.25,
          textClarity: 0.75 + Math.random() * 0.2,
          answerCompleteness: 0.8 + Math.random() * 0.15,
          consistencyScore: 0.85 + Math.random() * 0.1,
        },
        createdAt: new Date(Date.now() - Math.random() * 172800000),
        deadline: new Date(Date.now() + Math.random() * 86400000),
      };
    });

    setReviewTasks(mockTasks);
  }, [reviewers]);

  // 自动分配复核任务
  const autoAssignTask = useCallback(
    (task: ReviewTask): string | null => {
      const availableReviewers = reviewers.filter(
        (r) =>
          r.status === "available" &&
          r.workload < r.maxWorkload &&
          (task.reviewerLevel === "junior" || r.level !== "junior")
      );

      if (availableReviewers.length === 0) return null;

      // 根据工作负载和专业匹配度选择复核员
      const bestReviewer = availableReviewers.reduce((best, current) => {
        const currentScore =
          (1 - current.workload / current.maxWorkload) * 0.7 +
          current.accuracy * 0.3;
        const bestScore =
          (1 - best.workload / best.maxWorkload) * 0.7 + best.accuracy * 0.3;
        return currentScore > bestScore ? current : best;
      });

      return bestReviewer.id;
    },
    [reviewers]
  );

  // 开始复核
  const startReview = useCallback(
    (task: ReviewTask) => {
      setSelectedTask(task);
      reviewForm.setFieldsValue({
        score: task.originalScore,
        confidence: 0.9,
        comments: "",
      });
      setReviewModalVisible(true);
    },
    [reviewForm]
  );

  // 提交复核结果
  const submitReview = useCallback(
    async (values: {
      score: number;
      confidence: number;
      comments: string;
      action: "approve" | "reject" | "escalate";
    }) => {
      if (!selectedTask) return;

      const reviewEntry = {
        reviewerId: "current_user",
        reviewerName: "当前用户",
        timestamp: new Date(),
        action:
          values.action === "approve"
            ? ("approved" as const)
            : values.action === "reject"
            ? ("rejected" as const)
            : ("escalated" as const),
        score: values.score,
        comments: values.comments,
        confidence: values.confidence,
      };

      setReviewTasks((prev) =>
        prev.map((task) =>
          task.id === selectedTask.id
            ? {
                ...task,
                status: values.action === "escalate" ? "pending" : "completed",
                reviewerLevel:
                  values.action === "escalate" ? "expert" : task.reviewerLevel,
                reviewHistory: [...task.reviewHistory, reviewEntry],
              }
            : task
        )
      );

      setReviewModalVisible(false);
      setSelectedTask(null);
      reviewForm.resetFields();
    },
    [selectedTask, reviewForm]
  );

  // 批量分配任务
  const batchAssignTasks = useCallback(() => {
    setReviewTasks((prev) =>
      prev.map((task) => {
        if (task.status === "pending" && !task.assignedReviewer) {
          const assignedReviewer = autoAssignTask(task);
          if (assignedReviewer) {
            return {
              ...task,
              status: "in_review" as const,
              assignedReviewer,
              reviewHistory: [
                ...task.reviewHistory,
                {
                  reviewerId: "system",
                  reviewerName: "系统",
                  timestamp: new Date(),
                  action: "assigned" as const,
                  confidence: 1.0,
                },
              ],
            };
          }
        }
        return task;
      })
    );
  }, [autoAssignTask]);

  // 初始化数据
  useEffect(() => {
    generateMockTasks();
  }, [generateMockTasks]);

  // 过滤任务
  const filteredTasks = reviewTasks.filter((task) => {
    switch (activeTab) {
      case "pending":
        return task.status === "pending";
      case "in_review":
        return task.status === "in_review";
      case "completed":
        return task.status === "completed";
      case "high_priority":
        return task.priority === "high" || task.priority === "urgent";
      default:
        return true;
    }
  });

  // 表格列定义
  const columns = [
    {
      title: "学生",
      dataIndex: "studentName",
      key: "studentName",
      width: 100,
    },
    {
      title: "题目",
      key: "question",
      width: 80,
      render: (_: unknown, record: ReviewTask) =>
        `第${record.questionNumber}题`,
    },
    {
      title: "类型",
      dataIndex: "questionType",
      key: "questionType",
      width: 80,
      render: (type: string) => (
        <Tag color={type === "objective" ? "blue" : "green"}>
          {type === "objective" ? "客观题" : "主观题"}
        </Tag>
      ),
    },
    {
      title: "分数",
      key: "score",
      width: 100,
      render: (_: unknown, record: ReviewTask) =>
        `${record.originalScore}/${record.maxScore}`,
    },
    {
      title: "置信度",
      dataIndex: "aiConfidence",
      key: "aiConfidence",
      width: 100,
      render: (confidence: number) => {
        const color =
          confidence > 0.9 ? "success" : confidence > 0.7 ? "warning" : "error";
        return <Tag color={color}>{(confidence * 100).toFixed(1)}%</Tag>;
      },
    },
    {
      title: "优先级",
      dataIndex: "priority",
      key: "priority",
      width: 80,
      render: (priority: string) => {
        const config = {
          low: { color: "default", text: "低" },
          medium: { color: "processing", text: "中" },
          high: { color: "warning", text: "高" },
          urgent: { color: "error", text: "紧急" },
        };
        const { color, text } = config[priority as keyof typeof config];
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => {
        const config = {
          pending: {
            color: "default",
            text: "待分配",
            icon: <HistoryOutlined />,
          },
          in_review: {
            color: "processing",
            text: "复核中",
            icon: <EyeOutlined />,
          },
          completed: {
            color: "success",
            text: "已完成",
            icon: <CheckCircleOutlined />,
          },
          disputed: {
            color: "error",
            text: "有争议",
            icon: <ExclamationCircleOutlined />,
          },
        };
        const { color, text, icon } = config[status as keyof typeof config];
        return (
          <Tag color={color} icon={icon}>
            {text}
          </Tag>
        );
      },
    },
    {
      title: "复核员",
      dataIndex: "assignedReviewer",
      key: "assignedReviewer",
      width: 100,
      render: (reviewerId: string) => {
        if (!reviewerId) return <Text type="secondary">未分配</Text>;
        const reviewer = reviewers.find((r) => r.id === reviewerId);
        return reviewer ? reviewer.name : "未知";
      },
    },
    {
      title: "标记",
      dataIndex: "flags",
      key: "flags",
      width: 120,
      render: (flags: ReviewTask["flags"]) => {
        if (flags.length === 0) {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              正常
            </Tag>
          );
        }
        return (
          <Tooltip title={flags.map((flag) => flag.message).join("; ")}>
            <Badge count={flags.length}>
              <Tag color="warning" icon={<FlagOutlined />}>
                有问题
              </Tag>
            </Badge>
          </Tooltip>
        );
      },
    },
    {
      title: "操作",
      key: "actions",
      width: 120,
      render: (_: unknown, record: ReviewTask) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => startReview(record)}
            size="small"
          >
            复核
          </Button>
        </Space>
      ),
    },
  ];

  // 统计数据
  const stats = {
    total: reviewTasks.length,
    pending: reviewTasks.filter((t) => t.status === "pending").length,
    inReview: reviewTasks.filter((t) => t.status === "in_review").length,
    completed: reviewTasks.filter((t) => t.status === "completed").length,
    highPriority: reviewTasks.filter(
      (t) => t.priority === "high" || t.priority === "urgent"
    ).length,
    avgConfidence:
      reviewTasks.length > 0
        ? reviewTasks.reduce((sum, t) => sum + t.aiConfidence, 0) /
          reviewTasks.length
        : 0,
  };

  return (
    <div style={{ padding: "24px" }}>
      <Card
        title="质量控制中心"
        extra={
          <Space>
            <Switch
              checkedChildren="自动分配"
              unCheckedChildren="手动分配"
              checked={autoAssignment}
              onChange={setAutoAssignment}
            />
            <Button
              type="primary"
              onClick={batchAssignTasks}
              disabled={!autoAssignment}
            >
              批量分配
            </Button>
            <Button icon={<ReloadOutlined />} onClick={generateMockTasks}>
              刷新数据
            </Button>
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
              title="待分配"
              value={stats.pending}
              valueStyle={{ color: "#1890ff" }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="复核中"
              value={stats.inReview}
              valueStyle={{ color: "#fa8c16" }}
            />
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
              title="高优先级"
              value={stats.highPriority}
              valueStyle={{ color: "#cf1322" }}
            />
          </Col>
          <Col span={4}>
            <Statistic
              title="平均置信度"
              value={stats.avgConfidence * 100}
              precision={1}
              suffix="%"
              valueStyle={{
                color: stats.avgConfidence > 0.8 ? "#3f8600" : "#cf1322",
              }}
            />
          </Col>
        </Row>

        <Divider />

        {/* 复核员状态 */}
        <Card size="small" title="复核员状态" style={{ marginBottom: "16px" }}>
          <Row gutter={16}>
            {reviewers.map((reviewer) => (
              <Col span={8} key={reviewer.id}>
                <Card size="small">
                  <Space>
                    <Avatar icon={<UserOutlined />} />
                    <div>
                      <Text strong>{reviewer.name}</Text>
                      <br />
                      <Text type="secondary">{reviewer.level}</Text>
                      <br />
                      <Progress
                        percent={
                          (reviewer.workload / reviewer.maxWorkload) * 100
                        }
                        size="small"
                        status={
                          reviewer.status === "available"
                            ? "normal"
                            : "exception"
                        }
                      />
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>

        {/* 任务列表 */}
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab={`待分配 (${stats.pending})`} key="pending" />
          <TabPane tab={`复核中 (${stats.inReview})`} key="in_review" />
          <TabPane tab={`已完成 (${stats.completed})`} key="completed" />
          <TabPane
            tab={`高优先级 (${stats.highPriority})`}
            key="high_priority"
          />
        </Tabs>

        <Table
          columns={columns}
          dataSource={filteredTasks}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          size="small"
        />
      </Card>

      {/* 复核模态框 */}
      <Modal
        title={`复核任务 - ${selectedTask?.studentName} 第${selectedTask?.questionNumber}题`}
        open={reviewModalVisible}
        onCancel={() => setReviewModalVisible(false)}
        width={800}
        footer={null}
      >
        {selectedTask && (
          <div>
            {/* 任务信息 */}
            <Descriptions
              bordered
              size="small"
              style={{ marginBottom: "16px" }}
            >
              <Descriptions.Item label="学生">
                {selectedTask.studentName}
              </Descriptions.Item>
              <Descriptions.Item label="题目类型">
                <Tag
                  color={
                    selectedTask.questionType === "objective" ? "blue" : "green"
                  }
                >
                  {selectedTask.questionType === "objective"
                    ? "客观题"
                    : "主观题"}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="原始分数">
                {selectedTask.originalScore}/{selectedTask.maxScore}
              </Descriptions.Item>
              <Descriptions.Item label="AI置信度">
                <Tag
                  color={
                    selectedTask.aiConfidence > 0.8 ? "success" : "warning"
                  }
                >
                  {(selectedTask.aiConfidence * 100).toFixed(1)}%
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="优先级">
                <Tag
                  color={
                    selectedTask.priority === "urgent" ? "error" : "warning"
                  }
                >
                  {selectedTask.priority}
                </Tag>
              </Descriptions.Item>
            </Descriptions>

            {/* 质量指标 */}
            <Card
              size="small"
              title="质量指标"
              style={{ marginBottom: "16px" }}
            >
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic
                    title="图像质量"
                    value={(
                      selectedTask.qualityMetrics.imageQuality * 100
                    ).toFixed(1)}
                    suffix="%"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="文字清晰度"
                    value={(
                      selectedTask.qualityMetrics.textClarity * 100
                    ).toFixed(1)}
                    suffix="%"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="答案完整性"
                    value={(
                      selectedTask.qualityMetrics.answerCompleteness * 100
                    ).toFixed(1)}
                    suffix="%"
                  />
                </Col>
                <Col span={6}>
                  <Statistic
                    title="一致性评分"
                    value={(
                      selectedTask.qualityMetrics.consistencyScore * 100
                    ).toFixed(1)}
                    suffix="%"
                  />
                </Col>
              </Row>
            </Card>

            {/* 标记问题 */}
            {selectedTask.flags.length > 0 && (
              <Alert
                message="检测到问题"
                description={
                  <List
                    size="small"
                    dataSource={selectedTask.flags}
                    renderItem={(flag) => (
                      <List.Item>
                        <Space>
                          <Tag
                            color={
                              flag.severity === "high" ? "error" : "warning"
                            }
                          >
                            {flag.type}
                          </Tag>
                          <Text>{flag.message}</Text>
                          {flag.autoDetected && (
                            <Tag color="blue">自动检测</Tag>
                          )}
                        </Space>
                      </List.Item>
                    )}
                  />
                }
                type="warning"
                style={{ marginBottom: "16px" }}
              />
            )}

            {/* 复核历史 */}
            {selectedTask.reviewHistory.length > 0 && (
              <Card
                size="small"
                title="复核历史"
                style={{ marginBottom: "16px" }}
              >
                <Timeline>
                  {selectedTask.reviewHistory.map((entry, index) => (
                    <Timeline.Item
                      key={index}
                      dot={
                        entry.reviewerId === "system" ? (
                          <RobotOutlined />
                        ) : (
                          <UserOutlined />
                        )
                      }
                    >
                      <Text strong>{entry.reviewerName}</Text> {entry.action}
                      <br />
                      <Text type="secondary">
                        {entry.timestamp.toLocaleString()}
                      </Text>
                      {entry.comments && (
                        <>
                          <br />
                          <Text>{entry.comments}</Text>
                        </>
                      )}
                    </Timeline.Item>
                  ))}
                </Timeline>
              </Card>
            )}

            {/* 复核表单 */}
            <Form form={reviewForm} layout="vertical" onFinish={submitReview}>
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item
                    label="调整分数"
                    name="score"
                    rules={[{ required: true, message: "请输入分数" }]}
                  >
                    <Input type="number" min={0} max={selectedTask.maxScore} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="复核置信度"
                    name="confidence"
                    rules={[{ required: true, message: "请选择置信度" }]}
                  >
                    <Rate count={5} allowHalf />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="复核意见" name="comments">
                <TextArea rows={3} placeholder="请输入复核意见..." />
              </Form.Item>

              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    onClick={() =>
                      reviewForm.setFieldsValue({ action: "approve" })
                    }
                  >
                    通过
                  </Button>
                  <Button
                    danger
                    onClick={() => {
                      reviewForm.setFieldsValue({ action: "reject" });
                      reviewForm.submit();
                    }}
                  >
                    拒绝
                  </Button>
                  <Popconfirm
                    title="确定要升级到专家复核吗？"
                    onConfirm={() => {
                      reviewForm.setFieldsValue({ action: "escalate" });
                      reviewForm.submit();
                    }}
                  >
                    <Button type="dashed">升级复核</Button>
                  </Popconfirm>
                </Space>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default QualityControlCenter;
