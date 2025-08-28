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
  Select,
  Switch,
  Modal,
  Progress,
  List,
  Typography,
  Badge,
  Descriptions,
  Radio,
  Slider,
  notification,
} from "antd";
import {
  WarningOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  BarChartOutlined,
  ReloadOutlined,
  SettingOutlined,
  EyeOutlined,
  CaretUpOutlined,
  CaretDownOutlined,
} from "@ant-design/icons";

const { TabPane } = Tabs;
const { Text, Title } = Typography;

// 偏差检测结果
interface BiasDetectionResult {
  id: string;
  type: "gender" | "region" | "school" | "subject" | "time" | "reviewer";
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  affectedCount: number;
  totalCount: number;
  biasScore: number;
  confidence: number;
  detectedAt: Date;
  status: "active" | "investigating" | "resolved" | "false_positive";
  evidence: Array<{
    metric: string;
    expectedValue: number;
    actualValue: number;
    deviation: number;
  }>;
  recommendations: string[];
  assignedTo?: string;
}

// 一致性监控指标
interface ConsistencyMetric {
  id: string;
  name: string;
  category: "inter_reviewer" | "intra_reviewer" | "ai_human" | "temporal";
  value: number;
  threshold: number;
  trend: "improving" | "stable" | "declining";
  lastUpdated: Date;
  history: Array<{
    timestamp: Date;
    value: number;
  }>;
}

// 监控配置
interface MonitoringConfig {
  biasDetection: {
    enabled: boolean;
    sensitivity: number;
    autoAlert: boolean;
    checkInterval: number;
  };
  consistencyMonitoring: {
    enabled: boolean;
    thresholds: {
      interReviewer: number;
      intraReviewer: number;
      aiHuman: number;
      temporal: number;
    };
    alertOnDecline: boolean;
  };
  reporting: {
    autoGenerate: boolean;
    frequency: "daily" | "weekly" | "monthly";
    recipients: string[];
  };
}

const BiasDetectionSystem: React.FC = () => {
  const [biasResults, setBiasResults] = useState<BiasDetectionResult[]>([]);
  const [consistencyMetrics, setConsistencyMetrics] = useState<
    ConsistencyMetric[]
  >([]);
  const [activeTab, setActiveTab] = useState("bias-detection");
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedResult, setSelectedResult] =
    useState<BiasDetectionResult | null>(null);
  const [monitoringConfig, setMonitoringConfig] = useState<MonitoringConfig>({
    biasDetection: {
      enabled: true,
      sensitivity: 0.7,
      autoAlert: true,
      checkInterval: 24,
    },
    consistencyMonitoring: {
      enabled: true,
      thresholds: {
        interReviewer: 0.8,
        intraReviewer: 0.85,
        aiHuman: 0.75,
        temporal: 0.8,
      },
      alertOnDecline: true,
    },
    reporting: {
      autoGenerate: true,
      frequency: "weekly",
      recipients: ["admin@example.com"],
    },
  });
  const [configForm] = Form.useForm();

  // 生成模拟偏差检测结果
  const generateMockBiasResults = useCallback(() => {
    const types: BiasDetectionResult["type"][] = [
      "gender",
      "region",
      "school",
      "subject",
      "time",
      "reviewer",
    ];
    const severities: BiasDetectionResult["severity"][] = [
      "low",
      "medium",
      "high",
      "critical",
    ];

    const mockResults: BiasDetectionResult[] = Array.from(
      { length: 12 },
      (_, index) => {
        const type = types[Math.floor(Math.random() * types.length)];
        const severity =
          severities[Math.floor(Math.random() * severities.length)];
        const biasScore = 0.3 + Math.random() * 0.6;
        const affectedCount = Math.floor(Math.random() * 200) + 10;
        const totalCount =
          affectedCount + Math.floor(Math.random() * 500) + 100;

        return {
          id: `bias_${index + 1}`,
          type,
          severity,
          description: {
            gender: "检测到性别相关的评分偏差",
            region: "不同地区学生评分存在系统性差异",
            school: "学校间评分标准不一致",
            subject: "科目评分存在偏向性",
            time: "时间段评分存在波动",
            reviewer: "复核员评分存在个人偏好",
          }[type],
          affectedCount,
          totalCount,
          biasScore,
          confidence: 0.7 + Math.random() * 0.25,
          detectedAt: new Date(Date.now() - Math.random() * 604800000),
          status: ["active", "investigating", "resolved", "false_positive"][
            Math.floor(Math.random() * 4)
          ] as BiasDetectionResult["status"],
          evidence: [
            {
              metric: "平均分差异",
              expectedValue: 75.0,
              actualValue: 75.0 + (Math.random() - 0.5) * 10,
              deviation: (Math.random() - 0.5) * 10,
            },
            {
              metric: "标准差比率",
              expectedValue: 1.0,
              actualValue: 1.0 + (Math.random() - 0.5) * 0.4,
              deviation: (Math.random() - 0.5) * 0.4,
            },
          ],
          recommendations: [
            "调整评分标准以减少偏差",
            "增加复核员培训",
            "实施盲评机制",
            "定期校准评分系统",
          ].slice(0, Math.floor(Math.random() * 3) + 1),
          assignedTo: Math.random() > 0.5 ? "质量管理员" : undefined,
        };
      }
    );

    setBiasResults(mockResults);
  }, []);

  // 生成模拟一致性指标
  const generateMockConsistencyMetrics = useCallback(() => {
    const categories: ConsistencyMetric["category"][] = [
      "inter_reviewer",
      "intra_reviewer",
      "ai_human",
      "temporal",
    ];
    const names = {
      inter_reviewer: "复核员间一致性",
      intra_reviewer: "复核员内一致性",
      ai_human: "AI-人工一致性",
      temporal: "时间一致性",
    };

    const mockMetrics: ConsistencyMetric[] = categories.map(
      (category, index) => {
        const value = 0.6 + Math.random() * 0.35;
        const thresholds = monitoringConfig.consistencyMonitoring.thresholds;
        const threshold =
          category === "inter_reviewer"
            ? thresholds.interReviewer
            : category === "intra_reviewer"
            ? thresholds.intraReviewer
            : category === "ai_human"
            ? thresholds.aiHuman
            : thresholds.temporal;
        const trend =
          value > threshold
            ? "improving"
            : value > threshold - 0.1
            ? "stable"
            : "declining";

        return {
          id: `metric_${index + 1}`,
          name: names[category],
          category,
          value,
          threshold,
          trend,
          lastUpdated: new Date(),
          history: Array.from({ length: 30 }, (_, i) => ({
            timestamp: new Date(Date.now() - (29 - i) * 86400000),
            value: Math.max(
              0.4,
              Math.min(0.95, value + (Math.random() - 0.5) * 0.2)
            ),
          })),
        };
      }
    );

    setConsistencyMetrics(mockMetrics);
  }, [monitoringConfig.consistencyMonitoring.thresholds]);

  // 运行偏差检测
  const runBiasDetection = useCallback(async () => {
    notification.info({
      message: "开始偏差检测",
      description: "正在分析评分数据中的潜在偏差...",
    });

    // 模拟检测过程
    await new Promise((resolve) => setTimeout(resolve, 2000));

    generateMockBiasResults();

    notification.success({
      message: "偏差检测完成",
      description: "已完成最新一轮偏差检测分析",
    });
  }, [generateMockBiasResults]);

  // 更新结果状态
  const updateResultStatus = useCallback(
    (resultId: string, status: BiasDetectionResult["status"]) => {
      setBiasResults((prev) =>
        prev.map((result) =>
          result.id === resultId ? { ...result, status } : result
        )
      );

      notification.success({
        message: "状态已更新",
        description: `偏差检测结果状态已更新为: ${
          {
            active: "活跃",
            investigating: "调查中",
            resolved: "已解决",
            false_positive: "误报",
          }[status]
        }`,
      });
    },
    []
  );

  // 保存配置
  const saveConfig = useCallback(async (values: MonitoringConfig) => {
    setMonitoringConfig(values);
    setConfigModalVisible(false);

    notification.success({
      message: "配置已保存",
      description: "监控配置已更新并生效",
    });
  }, []);

  // 初始化数据
  useEffect(() => {
    generateMockBiasResults();
    generateMockConsistencyMetrics();
  }, [generateMockBiasResults, generateMockConsistencyMetrics]);

  // 初始化配置表单
  useEffect(() => {
    configForm.setFieldsValue(monitoringConfig);
  }, [monitoringConfig, configForm]);

  // 偏差检测表格列
  const biasColumns = [
    {
      title: "类型",
      dataIndex: "type",
      key: "type",
      width: 100,
      render: (type: string) => {
        const config = {
          gender: { color: "purple", text: "性别" },
          region: { color: "blue", text: "地区" },
          school: { color: "green", text: "学校" },
          subject: { color: "orange", text: "科目" },
          time: { color: "cyan", text: "时间" },
          reviewer: { color: "red", text: "复核员" },
        };
        const { color, text } = config[type as keyof typeof config];
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "严重程度",
      dataIndex: "severity",
      key: "severity",
      width: 100,
      render: (severity: string) => {
        const config = {
          low: { color: "default", text: "低" },
          medium: { color: "warning", text: "中" },
          high: { color: "error", text: "高" },
          critical: { color: "error", text: "严重" },
        };
        const { color, text } = config[severity as keyof typeof config];
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "影响范围",
      key: "impact",
      width: 120,
      render: (_: unknown, record: BiasDetectionResult) => (
        <div>
          <Text>
            {record.affectedCount}/{record.totalCount}
          </Text>
          <br />
          <Text type="secondary">
            {((record.affectedCount / record.totalCount) * 100).toFixed(1)}%
          </Text>
        </div>
      ),
    },
    {
      title: "偏差评分",
      dataIndex: "biasScore",
      key: "biasScore",
      width: 100,
      render: (score: number) => (
        <div>
          <Progress
            percent={score * 100}
            size="small"
            status={
              score > 0.7 ? "exception" : score > 0.5 ? "active" : "success"
            }
            showInfo={false}
          />
          <Text type="secondary">{(score * 100).toFixed(1)}%</Text>
        </div>
      ),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      width: 100,
      render: (status: string) => {
        const config = {
          active: { color: "error", text: "活跃", icon: <WarningOutlined /> },
          investigating: {
            color: "processing",
            text: "调查中",
            icon: <EyeOutlined />,
          },
          resolved: {
            color: "success",
            text: "已解决",
            icon: <CheckCircleOutlined />,
          },
          false_positive: {
            color: "default",
            text: "误报",
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
      title: "检测时间",
      dataIndex: "detectedAt",
      key: "detectedAt",
      width: 120,
      render: (date: Date) => date.toLocaleDateString(),
    },
    {
      title: "操作",
      key: "actions",
      width: 150,
      render: (_: unknown, record: BiasDetectionResult) => (
        <Space>
          <Button
            type="link"
            size="small"
            icon={<EyeOutlined />}
            onClick={() => {
              setSelectedResult(record);
              setDetailModalVisible(true);
            }}
          >
            详情
          </Button>
          {record.status === "active" && (
            <Button
              type="link"
              size="small"
              onClick={() => updateResultStatus(record.id, "investigating")}
            >
              调查
            </Button>
          )}
        </Space>
      ),
    },
  ];

  // 统计数据
  const biasStats = {
    total: biasResults.length,
    active: biasResults.filter((r) => r.status === "active").length,
    investigating: biasResults.filter((r) => r.status === "investigating")
      .length,
    resolved: biasResults.filter((r) => r.status === "resolved").length,
    critical: biasResults.filter((r) => r.severity === "critical").length,
    avgBiasScore:
      biasResults.length > 0
        ? biasResults.reduce((sum, r) => sum + r.biasScore, 0) /
          biasResults.length
        : 0,
  };

  return (
    <div style={{ padding: "24px" }}>
      <Card
        title={
          <Space>
            <SafetyCertificateOutlined />
            <Title level={3} style={{ margin: 0 }}>
              公平性保障系统
            </Title>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setConfigModalVisible(true)}
            >
              监控配置
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={runBiasDetection}
            >
              运行检测
            </Button>
          </Space>
        }
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          {/* 偏差检测 */}
          <TabPane tab="偏差检测" key="bias-detection">
            {/* 统计面板 */}
            <Row gutter={16} style={{ marginBottom: "24px" }}>
              <Col span={4}>
                <Statistic title="检测总数" value={biasStats.total} />
              </Col>
              <Col span={4}>
                <Statistic
                  title="活跃偏差"
                  value={biasStats.active}
                  valueStyle={{ color: "#cf1322" }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="调查中"
                  value={biasStats.investigating}
                  valueStyle={{ color: "#fa8c16" }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="已解决"
                  value={biasStats.resolved}
                  valueStyle={{ color: "#3f8600" }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="严重偏差"
                  value={biasStats.critical}
                  valueStyle={{ color: "#722ed1" }}
                />
              </Col>
              <Col span={4}>
                <Statistic
                  title="平均偏差"
                  value={biasStats.avgBiasScore * 100}
                  precision={1}
                  suffix="%"
                  valueStyle={{
                    color: biasStats.avgBiasScore > 0.6 ? "#cf1322" : "#3f8600",
                  }}
                />
              </Col>
            </Row>

            {/* 偏差检测结果表格 */}
            <Table
              columns={biasColumns}
              dataSource={biasResults}
              rowKey="id"
              pagination={{ pageSize: 10 }}
              size="small"
            />
          </TabPane>

          {/* 一致性监控 */}
          <TabPane tab="一致性监控" key="consistency-monitoring">
            <Row gutter={16}>
              {consistencyMetrics.map((metric) => (
                <Col span={6} key={metric.id}>
                  <Card size="small">
                    <Statistic
                      title={metric.name}
                      value={metric.value * 100}
                      precision={1}
                      suffix="%"
                      valueStyle={{
                        color:
                          metric.value >= metric.threshold
                            ? "#3f8600"
                            : "#cf1322",
                      }}
                      prefix={
                        metric.trend === "improving" ? (
                          <CaretUpOutlined style={{ color: "#3f8600" }} />
                        ) : metric.trend === "declining" ? (
                          <CaretDownOutlined style={{ color: "#cf1322" }} />
                        ) : (
                          <BarChartOutlined style={{ color: "#1890ff" }} />
                        )
                      }
                    />
                    <Progress
                      percent={(metric.value / metric.threshold) * 100}
                      size="small"
                      status={
                        metric.value >= metric.threshold
                          ? "success"
                          : "exception"
                      }
                      showInfo={false}
                      style={{ marginTop: "8px" }}
                    />
                    <Text type="secondary" style={{ fontSize: "12px" }}>
                      阈值: {(metric.threshold * 100).toFixed(0)}%
                    </Text>
                  </Card>
                </Col>
              ))}
            </Row>

            <Divider />

            {/* 趋势分析 */}
            <Card
              size="small"
              title="一致性趋势分析"
              style={{ marginTop: "16px" }}
            >
              <Alert
                message="监控状态"
                description={
                  <div>
                    <Text>
                      系统正在持续监控评分一致性，当前所有指标均在正常范围内。
                    </Text>
                    <br />
                    <Text type="secondary">
                      最后更新: {new Date().toLocaleString()}
                    </Text>
                  </div>
                }
                type="info"
                showIcon
              />
            </Card>
          </TabPane>

          {/* 报告分析 */}
          <TabPane tab="报告分析" key="reports">
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small" title="偏差类型分布">
                  <List
                    size="small"
                    dataSource={[
                      {
                        type: "性别偏差",
                        count: biasResults.filter((r) => r.type === "gender")
                          .length,
                        color: "purple",
                      },
                      {
                        type: "地区偏差",
                        count: biasResults.filter((r) => r.type === "region")
                          .length,
                        color: "blue",
                      },
                      {
                        type: "学校偏差",
                        count: biasResults.filter((r) => r.type === "school")
                          .length,
                        color: "green",
                      },
                      {
                        type: "科目偏差",
                        count: biasResults.filter((r) => r.type === "subject")
                          .length,
                        color: "orange",
                      },
                      {
                        type: "时间偏差",
                        count: biasResults.filter((r) => r.type === "time")
                          .length,
                        color: "cyan",
                      },
                      {
                        type: "复核员偏差",
                        count: biasResults.filter((r) => r.type === "reviewer")
                          .length,
                        color: "red",
                      },
                    ]}
                    renderItem={(item) => (
                      <List.Item>
                        <Space>
                          <Tag color={item.color}>{item.type}</Tag>
                          <Badge
                            count={item.count}
                            style={{ backgroundColor: "#52c41a" }}
                          />
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="处理状态统计">
                  <List
                    size="small"
                    dataSource={[
                      {
                        status: "活跃",
                        count: biasStats.active,
                        color: "error",
                      },
                      {
                        status: "调查中",
                        count: biasStats.investigating,
                        color: "processing",
                      },
                      {
                        status: "已解决",
                        count: biasStats.resolved,
                        color: "success",
                      },
                      {
                        status: "误报",
                        count: biasResults.filter(
                          (r) => r.status === "false_positive"
                        ).length,
                        color: "default",
                      },
                    ]}
                    renderItem={(item) => (
                      <List.Item>
                        <Space>
                          <Tag color={item.color}>{item.status}</Tag>
                          <Badge
                            count={item.count}
                            style={{ backgroundColor: "#1890ff" }}
                          />
                        </Space>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Card>

      {/* 详情模态框 */}
      <Modal
        title={`偏差检测详情 - ${selectedResult?.type}`}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={800}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
          selectedResult?.status === "active" && (
            <Button
              key="investigate"
              type="primary"
              onClick={() => {
                if (selectedResult) {
                  updateResultStatus(selectedResult.id, "investigating");
                  setDetailModalVisible(false);
                }
              }}
            >
              开始调查
            </Button>
          ),
        ]}
      >
        {selectedResult && (
          <div>
            <Descriptions
              bordered
              size="small"
              style={{ marginBottom: "16px" }}
            >
              <Descriptions.Item label="检测类型">
                <Tag color="blue">{selectedResult.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="严重程度">
                <Tag
                  color={
                    selectedResult.severity === "critical" ? "error" : "warning"
                  }
                >
                  {selectedResult.severity}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="置信度">
                {(selectedResult.confidence * 100).toFixed(1)}%
              </Descriptions.Item>
              <Descriptions.Item label="影响范围" span={2}>
                {selectedResult.affectedCount} / {selectedResult.totalCount}(
                {(
                  (selectedResult.affectedCount / selectedResult.totalCount) *
                  100
                ).toFixed(1)}
                %)
              </Descriptions.Item>
              <Descriptions.Item label="检测时间">
                {selectedResult.detectedAt.toLocaleString()}
              </Descriptions.Item>
            </Descriptions>

            <Card
              size="small"
              title="证据数据"
              style={{ marginBottom: "16px" }}
            >
              <List
                size="small"
                dataSource={selectedResult.evidence}
                renderItem={(evidence) => (
                  <List.Item>
                    <List.Item.Meta
                      title={evidence.metric}
                      description={
                        <Space>
                          <Text>
                            期望值: {evidence.expectedValue.toFixed(2)}
                          </Text>
                          <Text>实际值: {evidence.actualValue.toFixed(2)}</Text>
                          <Text
                            type={evidence.deviation > 0 ? "danger" : "success"}
                          >
                            偏差: {evidence.deviation > 0 ? "+" : ""}
                            {evidence.deviation.toFixed(2)}
                          </Text>
                        </Space>
                      }
                    />
                  </List.Item>
                )}
              />
            </Card>

            <Card size="small" title="改进建议">
              <List
                size="small"
                dataSource={selectedResult.recommendations}
                renderItem={(recommendation) => (
                  <List.Item>
                    <Text>• {recommendation}</Text>
                  </List.Item>
                )}
              />
            </Card>
          </div>
        )}
      </Modal>

      {/* 配置模态框 */}
      <Modal
        title="监控配置"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={configForm} layout="vertical" onFinish={saveConfig}>
          <Tabs>
            <TabPane tab="偏差检测" key="bias">
              <Form.Item
                label="启用偏差检测"
                name={["biasDetection", "enabled"]}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label="检测敏感度"
                name={["biasDetection", "sensitivity"]}
              >
                <Slider
                  min={0.1}
                  max={1.0}
                  step={0.1}
                  marks={{ 0.1: "低", 0.5: "中", 1.0: "高" }}
                />
              </Form.Item>
              <Form.Item
                label="自动告警"
                name={["biasDetection", "autoAlert"]}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label="检查间隔(小时)"
                name={["biasDetection", "checkInterval"]}
              >
                <Input type="number" min={1} max={168} />
              </Form.Item>
            </TabPane>

            <TabPane tab="一致性监控" key="consistency">
              <Form.Item
                label="启用一致性监控"
                name={["consistencyMonitoring", "enabled"]}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label="复核员间一致性阈值"
                name={["consistencyMonitoring", "thresholds", "interReviewer"]}
              >
                <Input type="number" min={0} max={1} step={0.05} />
              </Form.Item>
              <Form.Item
                label="复核员内一致性阈值"
                name={["consistencyMonitoring", "thresholds", "intraReviewer"]}
              >
                <Input type="number" min={0} max={1} step={0.05} />
              </Form.Item>
              <Form.Item
                label="AI-人工一致性阈值"
                name={["consistencyMonitoring", "thresholds", "aiHuman"]}
              >
                <Input type="number" min={0} max={1} step={0.05} />
              </Form.Item>
              <Form.Item
                label="时间一致性阈值"
                name={["consistencyMonitoring", "thresholds", "temporal"]}
              >
                <Input type="number" min={0} max={1} step={0.05} />
              </Form.Item>
              <Form.Item
                label="下降时告警"
                name={["consistencyMonitoring", "alertOnDecline"]}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </TabPane>

            <TabPane tab="报告设置" key="reporting">
              <Form.Item
                label="自动生成报告"
                name={["reporting", "autoGenerate"]}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item label="报告频率" name={["reporting", "frequency"]}>
                <Radio.Group>
                  <Radio value="daily">每日</Radio>
                  <Radio value="weekly">每周</Radio>
                  <Radio value="monthly">每月</Radio>
                </Radio.Group>
              </Form.Item>
              <Form.Item label="接收人邮箱" name={["reporting", "recipients"]}>
                <Select mode="tags" placeholder="输入邮箱地址" />
              </Form.Item>
            </TabPane>
          </Tabs>

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

export default BiasDetectionSystem;
