import React, { useState, useCallback, useRef } from "react";
import {
  Card,
  Button,
  Upload,
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
  InputNumber,
  Switch,
  Modal,
  Tooltip,
} from "antd";
import {
  UploadOutlined,
  ReloadOutlined,
  EyeOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import type { UploadFile } from "antd";

const { TabPane } = Tabs;
const { Option } = Select;

// 题目区域类型
interface QuestionRegion {
  id: string;
  questionNumber: number;
  type: "objective" | "subjective" | "mixed";
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  confidence: number;
  subRegions?: {
    questionArea: { x: number; y: number; width: number; height: number };
    answerArea: { x: number; y: number; width: number; height: number };
  };
  metadata?: {
    expectedAnswerType: string;
    maxScore: number;
    difficulty: "easy" | "medium" | "hard";
  };
}

// 模板配置
interface TemplateConfig {
  id: string;
  name: string;
  paperSize: "A4" | "A3" | "B4";
  orientation: "portrait" | "landscape";
  questionLayout: {
    columns: number;
    rows: number;
    spacing: { horizontal: number; vertical: number };
  };
  regions: QuestionRegion[];
  calibrationPoints: Array<{ x: number; y: number; type: "corner" | "marker" }>;
}

// 分割任务
interface SegmentationTask {
  id: string;
  fileName: string;
  status: "pending" | "processing" | "completed" | "failed";
  template: TemplateConfig;
  detectedRegions: QuestionRegion[];
  processingTime: number;
  accuracy: number;
  issues: Array<{
    type: "alignment" | "detection" | "quality";
    message: string;
    severity: "low" | "medium" | "high";
  }>;
}

const QuestionSegmentationEngine: React.FC = () => {
  const [tasks, setTasks] = useState<SegmentationTask[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [templateModalVisible, setTemplateModalVisible] = useState(false);
  const [previewModalVisible, setPreviewModalVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<SegmentationTask | null>(
    null
  );
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 预定义模板
  const templates: TemplateConfig[] = [
    {
      id: "standard-a4",
      name: "标准A4试卷模板",
      paperSize: "A4",
      orientation: "portrait",
      questionLayout: {
        columns: 2,
        rows: 10,
        spacing: { horizontal: 20, vertical: 15 },
      },
      regions: [],
      calibrationPoints: [
        { x: 50, y: 50, type: "corner" },
        { x: 545, y: 50, type: "corner" },
        { x: 50, y: 792, type: "corner" },
        { x: 545, y: 792, type: "corner" },
      ],
    },
    {
      id: "math-exam",
      name: "数学考试模板",
      paperSize: "A4",
      orientation: "portrait",
      questionLayout: {
        columns: 1,
        rows: 8,
        spacing: { horizontal: 0, vertical: 25 },
      },
      regions: [],
      calibrationPoints: [
        { x: 50, y: 50, type: "corner" },
        { x: 545, y: 50, type: "corner" },
        { x: 50, y: 792, type: "corner" },
        { x: 545, y: 792, type: "corner" },
      ],
    },
  ];

  // 模拟智能分割处理
  const processSegmentation = useCallback(
    async (file: File, template: TemplateConfig): Promise<SegmentationTask> => {
      return new Promise((resolve) => {
        setTimeout(() => {
          const detectedRegions: QuestionRegion[] = Array.from(
            { length: 8 },
            (_, index) => ({
              id: `region_${index + 1}`,
              questionNumber: index + 1,
              type: Math.random() > 0.6 ? "subjective" : "objective",
              coordinates: {
                x: 50 + (index % 2) * 250,
                y: 100 + Math.floor(index / 2) * 90,
                width: 200,
                height: 80,
              },
              confidence: 0.85 + Math.random() * 0.1,
              subRegions: {
                questionArea: {
                  x: 50 + (index % 2) * 250,
                  y: 100 + Math.floor(index / 2) * 90,
                  width: 200,
                  height: 30,
                },
                answerArea: {
                  x: 50 + (index % 2) * 250,
                  y: 130 + Math.floor(index / 2) * 90,
                  width: 200,
                  height: 50,
                },
              },
              metadata: {
                expectedAnswerType: Math.random() > 0.5 ? "text" : "choice",
                maxScore: Math.floor(Math.random() * 10) + 5,
                difficulty: ["easy", "medium", "hard"][
                  Math.floor(Math.random() * 3)
                ] as "easy" | "medium" | "hard",
              },
            })
          );

          const task: SegmentationTask = {
            id: `task_${Date.now()}`,
            fileName: file.name,
            status: "completed",
            template,
            detectedRegions,
            processingTime: 2.5 + Math.random() * 2,
            accuracy: 0.92 + Math.random() * 0.06,
            issues:
              Math.random() > 0.7
                ? [
                    {
                      type: "alignment",
                      message: "检测到轻微的页面倾斜，建议重新扫描",
                      severity: "low",
                    },
                  ]
                : [],
          };

          resolve(task);
        }, 3000);
      });
    },
    []
  );

  // 处理文件上传
  const handleFileUpload = useCallback(
    async (fileList: UploadFile[]) => {
      if (!selectedTemplate) {
        Modal.warning({
          title: "请选择模板",
          content: "请先选择一个答题卡模板再上传文件",
        });
        return;
      }

      const template = templates.find((t) => t.id === selectedTemplate);
      if (!template) return;

      setIsProcessing(true);

      for (const file of fileList) {
        if (file.originFileObj) {
          // 创建待处理任务
          const pendingTask: SegmentationTask = {
            id: `task_${Date.now()}_${Math.random()}`,
            fileName: file.name,
            status: "processing",
            template,
            detectedRegions: [],
            processingTime: 0,
            accuracy: 0,
            issues: [],
          };

          setTasks((prev) => [...prev, pendingTask]);

          try {
            const completedTask = await processSegmentation(
              file.originFileObj,
              template
            );
            setTasks((prev) =>
              prev.map((task) =>
                task.id === pendingTask.id ? completedTask : task
              )
            );
          } catch {
            setTasks((prev) =>
              prev.map((task) =>
                task.id === pendingTask.id
                  ? { ...task, status: "failed" as const }
                  : task
              )
            );
          }
        }
      }

      setIsProcessing(false);
    },
    [selectedTemplate, templates, processSegmentation]
  );

  // 预览分割结果
  const previewSegmentation = useCallback((task: SegmentationTask) => {
    setSelectedTask(task);
    setPreviewModalVisible(true);
  }, []);

  // 绘制分割预览
  const drawSegmentationPreview = useCallback((task: SegmentationTask) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 绘制背景
    ctx.fillStyle = "#f5f5f5";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制检测到的区域
    task.detectedRegions.forEach((region) => {
      const { x, y, width, height } = region.coordinates;

      // 缩放坐标以适应画布
      const scale = Math.min(canvas.width / 595, canvas.height / 842); // A4比例
      const scaledX = x * scale;
      const scaledY = y * scale;
      const scaledWidth = width * scale;
      const scaledHeight = height * scale;

      // 绘制区域边框
      ctx.strokeStyle = region.type === "objective" ? "#1890ff" : "#52c41a";
      ctx.lineWidth = 2;
      ctx.strokeRect(scaledX, scaledY, scaledWidth, scaledHeight);

      // 绘制区域标签
      ctx.fillStyle = region.type === "objective" ? "#1890ff" : "#52c41a";
      ctx.font = "12px Arial";
      ctx.fillText(
        `Q${region.questionNumber} (${region.confidence.toFixed(2)})`,
        scaledX + 5,
        scaledY + 15
      );

      // 绘制子区域
      if (region.subRegions) {
        ctx.strokeStyle = "#ff7875";
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);

        // 题目区域
        const qArea = region.subRegions.questionArea;
        ctx.strokeRect(
          qArea.x * scale,
          qArea.y * scale,
          qArea.width * scale,
          qArea.height * scale
        );

        // 答案区域
        const aArea = region.subRegions.answerArea;
        ctx.strokeRect(
          aArea.x * scale,
          aArea.y * scale,
          aArea.width * scale,
          aArea.height * scale
        );

        ctx.setLineDash([]);
      }
    });
  }, []);

  // 表格列定义
  const columns = [
    {
      title: "文件名",
      dataIndex: "fileName",
      key: "fileName",
      ellipsis: true,
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
          failed: { color: "error", text: "失败" },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: "检测区域",
      dataIndex: "detectedRegions",
      key: "detectedRegions",
      render: (regions: QuestionRegion[]) => regions.length,
    },
    {
      title: "准确率",
      dataIndex: "accuracy",
      key: "accuracy",
      render: (accuracy: number) =>
        accuracy > 0 ? `${(accuracy * 100).toFixed(1)}%` : "-",
    },
    {
      title: "处理时间",
      dataIndex: "processingTime",
      key: "processingTime",
      render: (time: number) => (time > 0 ? `${time.toFixed(1)}s` : "-"),
    },
    {
      title: "问题",
      dataIndex: "issues",
      key: "issues",
      render: (issues: SegmentationTask["issues"]) => {
        if (issues.length === 0) {
          return (
            <Tag color="success" icon={<CheckCircleOutlined />}>
              无问题
            </Tag>
          );
        }
        return (
          <Tooltip title={issues.map((issue) => issue.message).join("; ")}>
            <Tag color="warning" icon={<ExclamationCircleOutlined />}>
              {issues.length}个问题
            </Tag>
          </Tooltip>
        );
      },
    },
    {
      title: "操作",
      key: "actions",
      render: (_: unknown, record: SegmentationTask) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => previewSegmentation(record)}
            disabled={record.status !== "completed"}
          >
            预览
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
    failed: tasks.filter((t) => t.status === "failed").length,
    avgAccuracy:
      tasks.length > 0
        ? tasks
            .filter((t) => t.accuracy > 0)
            .reduce((sum, t) => sum + t.accuracy, 0) /
          tasks.filter((t) => t.accuracy > 0).length
        : 0,
  };

  return (
    <div style={{ padding: "24px" }}>
      <Card
        title="智能题目分割引擎"
        extra={
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setTemplateModalVisible(true)}
            >
              模板管理
            </Button>
            <Button icon={<ReloadOutlined />} onClick={() => setTasks([])}>
              清空任务
            </Button>
          </Space>
        }
      >
        {/* 统计面板 */}
        <Row gutter={16} style={{ marginBottom: "24px" }}>
          <Col span={6}>
            <Statistic title="总任务数" value={stats.total} />
          </Col>
          <Col span={6}>
            <Statistic
              title="已完成"
              value={stats.completed}
              valueStyle={{ color: "#3f8600" }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="处理中"
              value={stats.processing}
              valueStyle={{ color: "#1890ff" }}
            />
          </Col>
          <Col span={6}>
            <Statistic
              title="平均准确率"
              value={stats.avgAccuracy * 100}
              precision={1}
              suffix="%"
              valueStyle={{
                color: stats.avgAccuracy > 0.9 ? "#3f8600" : "#cf1322",
              }}
            />
          </Col>
        </Row>

        <Divider />

        {/* 控制面板 */}
        <Row gutter={16} style={{ marginBottom: "24px" }}>
          <Col span={12}>
            <Form.Item label="选择模板">
              <Select
                placeholder="请选择答题卡模板"
                value={selectedTemplate}
                onChange={setSelectedTemplate}
                style={{ width: "100%" }}
              >
                {templates.map((template) => (
                  <Option key={template.id} value={template.id}>
                    {template.name} ({template.paperSize})
                  </Option>
                ))}
              </Select>
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="上传文件">
              <Upload
                multiple
                accept="image/*,.pdf"
                beforeUpload={() => false}
                onChange={({ fileList }) => handleFileUpload(fileList)}
                disabled={!selectedTemplate || isProcessing}
              >
                <Button icon={<UploadOutlined />} loading={isProcessing}>
                  {isProcessing ? "处理中..." : "选择文件"}
                </Button>
              </Upload>
            </Form.Item>
          </Col>
        </Row>

        {/* 任务列表 */}
        <Table
          columns={columns}
          dataSource={tasks}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={isProcessing}
        />
      </Card>

      {/* 预览模态框 */}
      <Modal
        title="分割结果预览"
        open={previewModalVisible}
        onCancel={() => setPreviewModalVisible(false)}
        width={800}
        footer={null}
      >
        {selectedTask && (
          <div>
            <Alert
              message={`检测到 ${
                selectedTask.detectedRegions.length
              } 个题目区域，准确率 ${(selectedTask.accuracy * 100).toFixed(
                1
              )}%`}
              type="info"
              style={{ marginBottom: "16px" }}
            />
            <canvas
              ref={canvasRef}
              width={600}
              height={400}
              style={{ border: "1px solid #d9d9d9", width: "100%" }}
              onLoad={() =>
                selectedTask && drawSegmentationPreview(selectedTask)
              }
            />
            {selectedTask.issues.length > 0 && (
              <Alert
                message="检测到问题"
                description={
                  <ul>
                    {selectedTask.issues.map((issue, index) => (
                      <li key={index}>{issue.message}</li>
                    ))}
                  </ul>
                }
                type="warning"
                style={{ marginTop: "16px" }}
              />
            )}
          </div>
        )}
      </Modal>

      {/* 模板管理模态框 */}
      <Modal
        title="模板管理"
        open={templateModalVisible}
        onCancel={() => setTemplateModalVisible(false)}
        width={1000}
        footer={null}
      >
        <Tabs defaultActiveKey="list">
          <TabPane tab="模板列表" key="list">
            <Table
              dataSource={templates}
              rowKey="id"
              columns={[
                { title: "模板名称", dataIndex: "name", key: "name" },
                { title: "纸张大小", dataIndex: "paperSize", key: "paperSize" },
                { title: "方向", dataIndex: "orientation", key: "orientation" },
                {
                  title: "布局",
                  key: "layout",
                  render: (_: unknown, record: TemplateConfig) =>
                    `${record.questionLayout.columns}列 × ${record.questionLayout.rows}行`,
                },
              ]}
            />
          </TabPane>
          <TabPane tab="创建模板" key="create">
            <Form layout="vertical">
              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item label="模板名称">
                    <Input placeholder="输入模板名称" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="纸张大小">
                    <Select placeholder="选择纸张大小">
                      <Option value="A4">A4</Option>
                      <Option value="A3">A3</Option>
                      <Option value="B4">B4</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
              <Row gutter={16}>
                <Col span={8}>
                  <Form.Item label="列数">
                    <InputNumber min={1} max={5} defaultValue={2} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="行数">
                    <InputNumber min={1} max={20} defaultValue={10} />
                  </Form.Item>
                </Col>
                <Col span={8}>
                  <Form.Item label="自动检测">
                    <Switch defaultChecked />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </TabPane>
        </Tabs>
      </Modal>
    </div>
  );
};

export default QuestionSegmentationEngine;
