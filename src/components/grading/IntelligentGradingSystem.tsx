import React, { useState, useCallback, useEffect } from "react";
import {
  Card,
  Button,
  Steps,
  Row,
  Col,
  Tabs,
  Space,
  Alert,
  Progress,
  Statistic,
  Tag,
  Modal,
  Form,
  Input,
  Upload,
  Select,
  Switch,
  Divider,
  List,
  Typography,
  notification,
} from "antd";
import {
  UploadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  StopOutlined,
  SettingOutlined,
  DownloadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClockCircleOutlined,
  RobotOutlined,
  FileImageOutlined,
  ScanOutlined,
  BulbOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";

// 导入新的模块化组件
import AnswerSheetPreprocessor from "./preprocessing/AnswerSheetPreprocessor";
import QuestionSegmentationEngine from "./segmentation/QuestionSegmentationEngine";
import HybridGradingEngine from "./hybrid/HybridGradingEngine";
import QualityControlCenter from "./quality/QualityControlCenter";

const { Step } = Steps;
const { TabPane } = Tabs;
const { Text, Title } = Typography;
const { Option } = Select;
const { Dragger } = Upload;

// 阅卷任务状态
interface GradingTask {
  id: string;
  name: string;
  examId: string;
  totalSheets: number;
  processedSheets: number;
  status:
    | "pending"
    | "preprocessing"
    | "segmenting"
    | "grading"
    | "reviewing"
    | "completed"
    | "error";
  progress: number;
  startTime?: Date;
  endTime?: Date;
  settings: {
    enablePreprocessing: boolean;
    enableSegmentation: boolean;
    enableHybridGrading: boolean;
    enableQualityControl: boolean;
    confidenceThreshold: number;
    reviewThreshold: number;
    autoAssignReviewers: boolean;
  };
  results: {
    totalScore: number;
    averageScore: number;
    passRate: number;
    qualityScore: number;
    reviewRate: number;
  };
  errors: Array<{
    type: string;
    message: string;
    timestamp: Date;
  }>;
}

// 系统配置
interface SystemConfig {
  preprocessing: {
    imageQualityThreshold: number;
    autoCorrection: boolean;
    noiseReduction: boolean;
  };
  segmentation: {
    templateMatching: boolean;
    aiSegmentation: boolean;
    manualAdjustment: boolean;
  };
  grading: {
    omrSensitivity: number;
    aiModelVersion: string;
    multiModelEnsemble: boolean;
  };
  qualityControl: {
    enableAutoReview: boolean;
    confidenceThreshold: number;
    reviewerAssignment: "auto" | "manual";
  };
}

const IntelligentGradingSystem: React.FC = () => {
  const [currentTask, setCurrentTask] = useState<GradingTask | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [activeTab, setActiveTab] = useState("overview");
  const [configModalVisible, setConfigModalVisible] = useState(false);
  const [taskModalVisible, setTaskModalVisible] = useState(false);
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    preprocessing: {
      imageQualityThreshold: 0.8,
      autoCorrection: true,
      noiseReduction: true,
    },
    segmentation: {
      templateMatching: true,
      aiSegmentation: true,
      manualAdjustment: false,
    },
    grading: {
      omrSensitivity: 0.85,
      aiModelVersion: "v2.1",
      multiModelEnsemble: true,
    },
    qualityControl: {
      enableAutoReview: true,
      confidenceThreshold: 0.8,
      reviewerAssignment: "auto",
    },
  });
  const [taskForm] = Form.useForm();
  const [configForm] = Form.useForm();

  // 阅卷流程步骤
  const gradingSteps = [
    {
      title: "答题卡预处理",
      description: "图像质量检测与标准化",
      icon: <FileImageOutlined />,
      component: "preprocessing",
    },
    {
      title: "智能题目分割",
      description: "模板匹配与区域识别",
      icon: <ScanOutlined />,
      component: "segmentation",
    },
    {
      title: "混合智能阅卷",
      description: "OMR + AI评分",
      icon: <BulbOutlined />,
      component: "grading",
    },
    {
      title: "质量控制复核",
      description: "置信度评估与人工复核",
      icon: <SafetyCertificateOutlined />,
      component: "quality",
    },
  ];

  // 创建新的阅卷任务
  const createGradingTask = useCallback(
    async (values: {
      name: string;
      examId: string;
      files: File[];
      settings: GradingTask["settings"];
    }) => {
      const newTask: GradingTask = {
        id: `task_${Date.now()}`,
        name: values.name,
        examId: values.examId,
        totalSheets: values.files.length,
        processedSheets: 0,
        status: "pending",
        progress: 0,
        settings: values.settings,
        results: {
          totalScore: 0,
          averageScore: 0,
          passRate: 0,
          qualityScore: 0,
          reviewRate: 0,
        },
        errors: [],
      };

      setCurrentTask(newTask);
      setTaskModalVisible(false);
      taskForm.resetFields();

      notification.success({
        message: "任务创建成功",
        description: `阅卷任务 "${values.name}" 已创建，包含 ${values.files.length} 份答题卡`,
      });
    },
    [taskForm]
  );

  // 开始阅卷流程
  const startGradingProcess = useCallback(async () => {
    if (!currentTask) return;

    setCurrentTask((prev) =>
      prev
        ? {
            ...prev,
            status: "preprocessing",
            startTime: new Date(),
          }
        : null
    );

    setActiveStep(0);

    // 模拟阅卷流程
    const steps = ["preprocessing", "segmenting", "grading", "reviewing"];

    for (let i = 0; i < steps.length; i++) {
      const stepStatus = steps[i] as GradingTask["status"];

      setCurrentTask((prev) =>
        prev
          ? {
              ...prev,
              status: stepStatus,
              progress: (i / steps.length) * 100,
            }
          : null
      );

      setActiveStep(i);

      // 模拟处理时间
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // 模拟进度更新
      for (let progress = 0; progress <= 100; progress += 20) {
        setCurrentTask((prev) =>
          prev
            ? {
                ...prev,
                processedSheets: Math.floor(
                  (prev.totalSheets * progress) / 100
                ),
                progress: ((i + progress / 100) / steps.length) * 100,
              }
            : null
        );

        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    // 完成阅卷
    setCurrentTask((prev) =>
      prev
        ? {
            ...prev,
            status: "completed",
            progress: 100,
            processedSheets: prev.totalSheets,
            endTime: new Date(),
            results: {
              totalScore: 1850,
              averageScore: 74.2,
              passRate: 0.82,
              qualityScore: 0.94,
              reviewRate: 0.15,
            },
          }
        : null
    );

    setActiveStep(4);

    notification.success({
      message: "阅卷完成",
      description: "智能阅卷流程已完成，请查看结果报告",
    });
  }, [currentTask]);

  // 暂停阅卷
  const pauseGrading = useCallback(() => {
    notification.info({
      message: "阅卷已暂停",
      description: "可以随时恢复阅卷流程",
    });
  }, []);

  // 停止阅卷
  const stopGrading = useCallback(() => {
    setCurrentTask((prev) =>
      prev
        ? {
            ...prev,
            status: "error",
            endTime: new Date(),
          }
        : null
    );

    notification.warning({
      message: "阅卷已停止",
      description: "阅卷流程已被手动停止",
    });
  }, []);

  // 保存系统配置
  const saveSystemConfig = useCallback(async (values: SystemConfig) => {
    setSystemConfig(values);
    setConfigModalVisible(false);

    notification.success({
      message: "配置已保存",
      description: "系统配置已更新并生效",
    });
  }, []);

  // 初始化配置表单
  useEffect(() => {
    configForm.setFieldsValue(systemConfig);
  }, [systemConfig, configForm]);

  // 渲染当前步骤的组件
  const renderStepComponent = () => {
    if (!currentTask) return null;

    const currentStepConfig = gradingSteps[activeStep];
    if (!currentStepConfig) return null;

    switch (currentStepConfig.component) {
      case "preprocessing":
        return <AnswerSheetPreprocessor />;
      case "segmentation":
        return <QuestionSegmentationEngine />;
      case "grading":
        return <HybridGradingEngine />;
      case "quality":
        return <QualityControlCenter />;
      default:
        return null;
    }
  };

  return (
    <div style={{ padding: "24px" }}>
      <Card
        title={
          <Space>
            <RobotOutlined />
            <Title level={3} style={{ margin: 0 }}>
              智能阅卷系统
            </Title>
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setConfigModalVisible(true)}
            >
              系统配置
            </Button>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={() => setTaskModalVisible(true)}
            >
              新建任务
            </Button>
          </Space>
        }
      >
        {/* 系统概览 */}
        {!currentTask && (
          <div style={{ textAlign: "center", padding: "60px 0" }}>
            <RobotOutlined
              style={{
                fontSize: "64px",
                color: "#1890ff",
                marginBottom: "16px",
              }}
            />
            <Title level={4}>智能阅卷系统</Title>
            <Text type="secondary">
              集成答题卡预处理、智能分割、混合阅卷和质量控制的完整解决方案
            </Text>
            <br />
            <Button
              type="primary"
              size="large"
              icon={<UploadOutlined />}
              onClick={() => setTaskModalVisible(true)}
              style={{ marginTop: "24px" }}
            >
              开始阅卷
            </Button>
          </div>
        )}

        {/* 任务执行界面 */}
        {currentTask && (
          <div>
            {/* 任务信息 */}
            <Row gutter={16} style={{ marginBottom: "24px" }}>
              <Col span={6}>
                <Statistic title="任务名称" value={currentTask.name} />
              </Col>
              <Col span={6}>
                <Statistic title="答题卡总数" value={currentTask.totalSheets} />
              </Col>
              <Col span={6}>
                <Statistic title="已处理" value={currentTask.processedSheets} />
              </Col>
              <Col span={6}>
                <Statistic
                  title="完成进度"
                  value={currentTask.progress}
                  precision={1}
                  suffix="%"
                />
              </Col>
            </Row>

            {/* 状态和控制 */}
            <Row gutter={16} style={{ marginBottom: "24px" }}>
              <Col span={12}>
                <Card size="small" title="任务状态">
                  <Space>
                    <Tag
                      color={
                        currentTask.status === "completed"
                          ? "success"
                          : currentTask.status === "error"
                          ? "error"
                          : "processing"
                      }
                      icon={
                        currentTask.status === "completed" ? (
                          <CheckCircleOutlined />
                        ) : currentTask.status === "error" ? (
                          <ExclamationCircleOutlined />
                        ) : (
                          <ClockCircleOutlined />
                        )
                      }
                    >
                      {
                        {
                          pending: "等待开始",
                          preprocessing: "预处理中",
                          segmenting: "分割中",
                          grading: "阅卷中",
                          reviewing: "复核中",
                          completed: "已完成",
                          error: "已停止",
                        }[currentTask.status]
                      }
                    </Tag>
                    {currentTask.startTime && (
                      <Text type="secondary">
                        开始时间: {currentTask.startTime.toLocaleString()}
                      </Text>
                    )}
                  </Space>
                  <Progress
                    percent={currentTask.progress}
                    status={
                      currentTask.status === "completed"
                        ? "success"
                        : currentTask.status === "error"
                        ? "exception"
                        : "active"
                    }
                    style={{ marginTop: "8px" }}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="操作控制">
                  <Space>
                    {currentTask.status === "pending" && (
                      <Button
                        type="primary"
                        icon={<PlayCircleOutlined />}
                        onClick={startGradingProcess}
                      >
                        开始阅卷
                      </Button>
                    )}
                    {[
                      "preprocessing",
                      "segmenting",
                      "grading",
                      "reviewing",
                    ].includes(currentTask.status) && (
                      <>
                        <Button
                          icon={<PauseCircleOutlined />}
                          onClick={pauseGrading}
                        >
                          暂停
                        </Button>
                        <Button
                          danger
                          icon={<StopOutlined />}
                          onClick={stopGrading}
                        >
                          停止
                        </Button>
                      </>
                    )}
                    {currentTask.status === "completed" && (
                      <Button type="primary" icon={<DownloadOutlined />}>
                        导出结果
                      </Button>
                    )}
                  </Space>
                </Card>
              </Col>
            </Row>

            {/* 阅卷流程步骤 */}
            <Card
              size="small"
              title="阅卷流程"
              style={{ marginBottom: "24px" }}
            >
              <Steps current={activeStep} size="small">
                {gradingSteps.map((step, index) => (
                  <Step
                    key={index}
                    title={step.title}
                    description={step.description}
                    icon={step.icon}
                    status={
                      index < activeStep
                        ? "finish"
                        : index === activeStep
                        ? "process"
                        : "wait"
                    }
                  />
                ))}
              </Steps>
            </Card>

            {/* 详细信息标签页 */}
            <Tabs activeKey={activeTab} onChange={setActiveTab}>
              <TabPane tab="实时监控" key="monitor">
                {renderStepComponent()}
              </TabPane>

              <TabPane tab="结果统计" key="results">
                {currentTask.status === "completed" && (
                  <Row gutter={16}>
                    <Col span={6}>
                      <Statistic
                        title="总分"
                        value={currentTask.results.totalScore}
                        valueStyle={{ color: "#3f8600" }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="平均分"
                        value={currentTask.results.averageScore}
                        precision={1}
                        valueStyle={{ color: "#1890ff" }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="及格率"
                        value={currentTask.results.passRate * 100}
                        precision={1}
                        suffix="%"
                        valueStyle={{ color: "#722ed1" }}
                      />
                    </Col>
                    <Col span={6}>
                      <Statistic
                        title="质量评分"
                        value={currentTask.results.qualityScore * 100}
                        precision={1}
                        suffix="%"
                        valueStyle={{ color: "#eb2f96" }}
                      />
                    </Col>
                  </Row>
                )}
                {currentTask.status !== "completed" && (
                  <Alert
                    message="阅卷进行中"
                    description="结果统计将在阅卷完成后显示"
                    type="info"
                    showIcon
                  />
                )}
              </TabPane>

              <TabPane tab="错误日志" key="errors">
                {currentTask.errors.length > 0 ? (
                  <List
                    dataSource={currentTask.errors}
                    renderItem={(error) => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={
                            <ExclamationCircleOutlined
                              style={{ color: "#ff4d4f" }}
                            />
                          }
                          title={error.type}
                          description={
                            <>
                              <Text>{error.message}</Text>
                              <br />
                              <Text type="secondary">
                                {error.timestamp.toLocaleString()}
                              </Text>
                            </>
                          }
                        />
                      </List.Item>
                    )}
                  />
                ) : (
                  <Alert
                    message="无错误记录"
                    description="系统运行正常，未发现错误"
                    type="success"
                    showIcon
                  />
                )}
              </TabPane>
            </Tabs>
          </div>
        )}
      </Card>

      {/* 新建任务模态框 */}
      <Modal
        title="创建阅卷任务"
        open={taskModalVisible}
        onCancel={() => setTaskModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={taskForm} layout="vertical" onFinish={createGradingTask}>
          <Form.Item
            label="任务名称"
            name="name"
            rules={[{ required: true, message: "请输入任务名称" }]}
          >
            <Input placeholder="例如：期末考试阅卷" />
          </Form.Item>

          <Form.Item
            label="考试ID"
            name="examId"
            rules={[{ required: true, message: "请输入考试ID" }]}
          >
            <Input placeholder="例如：EXAM_2024_001" />
          </Form.Item>

          <Form.Item
            label="答题卡文件"
            name="files"
            rules={[{ required: true, message: "请上传答题卡文件" }]}
          >
            <Dragger
              multiple
              accept=".jpg,.jpeg,.png,.pdf"
              beforeUpload={() => false}
            >
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个或批量上传，支持 JPG、PNG、PDF 格式
              </p>
            </Dragger>
          </Form.Item>

          <Divider>阅卷设置</Divider>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="启用预处理"
                name={["settings", "enablePreprocessing"]}
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="启用智能分割"
                name={["settings", "enableSegmentation"]}
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                label="启用混合阅卷"
                name={["settings", "enableHybridGrading"]}
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="启用质量控制"
                name={["settings", "enableQualityControl"]}
                valuePropName="checked"
                initialValue={true}
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                创建任务
              </Button>
              <Button onClick={() => setTaskModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* 系统配置模态框 */}
      <Modal
        title="系统配置"
        open={configModalVisible}
        onCancel={() => setConfigModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form form={configForm} layout="vertical" onFinish={saveSystemConfig}>
          <Tabs>
            <TabPane tab="预处理配置" key="preprocessing">
              <Form.Item
                label="图像质量阈值"
                name={["preprocessing", "imageQualityThreshold"]}
              >
                <Input type="number" min={0} max={1} step={0.1} />
              </Form.Item>
              <Form.Item
                label="自动校正"
                name={["preprocessing", "autoCorrection"]}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label="噪声降低"
                name={["preprocessing", "noiseReduction"]}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </TabPane>

            <TabPane tab="分割配置" key="segmentation">
              <Form.Item
                label="模板匹配"
                name={["segmentation", "templateMatching"]}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label="AI分割"
                name={["segmentation", "aiSegmentation"]}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label="手动调整"
                name={["segmentation", "manualAdjustment"]}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </TabPane>

            <TabPane tab="阅卷配置" key="grading">
              <Form.Item label="OMR敏感度" name={["grading", "omrSensitivity"]}>
                <Input type="number" min={0} max={1} step={0.05} />
              </Form.Item>
              <Form.Item
                label="AI模型版本"
                name={["grading", "aiModelVersion"]}
              >
                <Select>
                  <Option value="v2.1">v2.1 (推荐)</Option>
                  <Option value="v2.0">v2.0</Option>
                  <Option value="v1.9">v1.9</Option>
                </Select>
              </Form.Item>
              <Form.Item
                label="多模型集成"
                name={["grading", "multiModelEnsemble"]}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </TabPane>

            <TabPane tab="质量控制" key="quality">
              <Form.Item
                label="自动复核"
                name={["qualityControl", "enableAutoReview"]}
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
              <Form.Item
                label="置信度阈值"
                name={["qualityControl", "confidenceThreshold"]}
              >
                <Input type="number" min={0} max={1} step={0.1} />
              </Form.Item>
              <Form.Item
                label="复核员分配"
                name={["qualityControl", "reviewerAssignment"]}
              >
                <Select>
                  <Option value="auto">自动分配</Option>
                  <Option value="manual">手动分配</Option>
                </Select>
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

export default IntelligentGradingSystem;
