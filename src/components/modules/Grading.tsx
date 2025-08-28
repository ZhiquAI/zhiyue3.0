import React, { useState } from "react";
import {
  Card,
  Typography,
  Button,
  Space,
  Steps,
  Upload,
  Progress,
  Alert,
  List,
  Avatar,
  Tag,
  Tabs,
  Row,
  Col,
  message,
} from "antd";
import type { UploadFile } from "antd";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeftOutlined,
  UploadOutlined,
  RobotOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  ThunderboltOutlined,
  SafetyOutlined,
  BranchesOutlined,
  ScanOutlined,
  DesktopOutlined,
  BankOutlined,
} from "@ant-design/icons";

// 导入新的智能阅卷模块
import AnswerSheetPreprocessor from "../grading/preprocessing/AnswerSheetPreprocessor";
import QuestionSegmentationEngine from "../grading/segmentation/QuestionSegmentationEngine";
import HybridGradingEngine from "../grading/hybrid/HybridGradingEngine";
import QualityControlCenter from "../grading/quality/QualityControlCenter";
import BiasDetectionSystem from "../grading/fairness/BiasDetectionSystem";
import TemplateDesigner from "../grading/template/TemplateDesigner";
import MultiModelRecognitionEngine from "../grading/recognition/MultiModelRecognitionEngine";
import AdaptiveScoringSystem from "../grading/adaptive/AdaptiveScoringSystem";

const { Title, Text } = Typography;
const { Step } = Steps;

interface GradingTask {
  id: string;
  examName: string;
  totalPapers: number;
  gradedPapers: number;
  status: "waiting" | "processing" | "completed" | "error";
  progress: number;
  accuracy: number;
  startTime: string;
}

const mockTasks: GradingTask[] = [
  {
    id: "1",
    examName: "高一数学期中考试",
    totalPapers: 45,
    gradedPapers: 45,
    status: "completed",
    progress: 100,
    accuracy: 96.8,
    startTime: "2025-09-16 14:30:00",
  },
  {
    id: "2",
    examName: "高二物理月考",
    totalPapers: 38,
    gradedPapers: 28,
    status: "processing",
    progress: 74,
    accuracy: 95.2,
    startTime: "2025-09-21 09:15:00",
  },
];

export const Grading: React.FC = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [tasks, setTasks] = useState<GradingTask[]>(mockTasks);
  const [uploadedFiles, setUploadedFiles] = useState<UploadFile[]>([]);

  const steps = [
    {
      title: "上传答题卡",
      description: "批量上传待阅卷的答题卡图片",
    },
    {
      title: "选择评分标准",
      description: "设置阅卷规则和评分标准",
    },
    {
      title: "AI智能阅卷",
      description: "启动AI引擎进行自动阅卷",
    },
    {
      title: "结果审核",
      description: "人工审核AI阅卷结果",
    },
  ];

  const statusColors = {
    waiting: "orange",
    processing: "blue",
    completed: "green",
    error: "red",
  };

  const statusTexts = {
    waiting: "等待处理",
    processing: "正在处理",
    completed: "已完成",
    error: "处理失败",
  };

  const uploadProps = {
    name: "file",
    multiple: true,
    accept: ".jpg,.jpeg,.png,.pdf",
    beforeUpload: () => false, // 阻止自动上传
    onChange: (info: { fileList: UploadFile[] }) => {
      setUploadedFiles(info.fileList);
    },
  };

  const handleStartGrading = () => {
    if (uploadedFiles.length === 0) {
      message.error("请先上传答题卡");
      return;
    }

    const newTask: GradingTask = {
      id: Date.now().toString(),
      examName: `新建阅卷任务`,
      totalPapers: uploadedFiles.length,
      gradedPapers: 0,
      status: "processing",
      progress: 0,
      accuracy: 0,
      startTime: new Date().toLocaleString(),
    };

    setTasks([newTask, ...tasks]);
    setCurrentStep(2);

    // 模拟阅卷进度
    simulateGrading(newTask.id);
  };

  // 智能阅卷模块标签页配置
  const intelligentGradingTabs = [
    {
      key: "overview",
      label: (
        <span>
          <RobotOutlined />
          智能阅卷概览
        </span>
      ),
      children: null, // 将在下面定义
    },
    {
      key: "preprocessing",
      label: (
        <span>
          <ScanOutlined />
          答题卡预处理
        </span>
      ),
      children: <AnswerSheetPreprocessor />,
    },
    {
      key: "segmentation",
      label: (
        <span>
          <BranchesOutlined />
          智能题目分割
        </span>
      ),
      children: <QuestionSegmentationEngine />,
    },
    {
      key: "hybrid",
      label: (
        <span>
          <ThunderboltOutlined />
          混合智能阅卷
        </span>
      ),
      children: <HybridGradingEngine />,
    },
    {
      key: "quality",
      label: (
        <span>
          <EyeOutlined />
          质量控制复核
        </span>
      ),
      children: <QualityControlCenter />,
    },
    {
      key: "fairness",
      label: (
        <span>
          <SafetyOutlined />
          公平性保障
        </span>
      ),
      children: <BiasDetectionSystem />,
    },
    {
      key: "template",
      label: (
        <span>
          <DesktopOutlined />
          模板设计工具
        </span>
      ),
      children: <TemplateDesigner />,
    },
    {
      key: "recognition",
      label: (
        <span>
          <RobotOutlined />
          多模型识别
        </span>
      ),
      children: <MultiModelRecognitionEngine />,
    },
    {
      key: "adaptive",
      label: (
        <span>
          <BankOutlined />
          自适应评分
        </span>
      ),
      children: <AdaptiveScoringSystem />,
    },
  ];

  const simulateGrading = (taskId: string) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress >= 100) {
        progress = 100;
        clearInterval(interval);

        // 更新任务状态为已完成
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  progress: 100,
                  status: "completed" as const,
                  gradedPapers: task.totalPapers,
                  accuracy: 95 + Math.random() * 4,
                }
              : task
          )
        );
        setCurrentStep(3);
      } else {
        // 更新进度
        setTasks((prevTasks) =>
          prevTasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  progress: Math.round(progress),
                  gradedPapers: Math.round((progress / 100) * task.totalPapers),
                }
              : task
          )
        );
      }
    }, 1000);
  };

  // 概览页面内容
  const overviewContent = (
    <div>
      {/* 阅卷流程 */}
      <Card title="阅卷流程" style={{ marginBottom: "24px" }}>
        <Steps current={currentStep}>
          {steps.map((item) => (
            <Step
              key={item.title}
              title={item.title}
              description={item.description}
            />
          ))}
        </Steps>
      </Card>

      <Row gutter={[24, 24]} style={{ marginBottom: "24px" }}>
        {/* 上传答题卡 */}
        <Col span={12}>
          <Card
            title="上传答题卡"
            extra={<Tag color="blue">{uploadedFiles.length} 个文件</Tag>}
          >
            <Upload.Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <UploadOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持批量上传，支持 JPG、PNG、PDF 格式
              </p>
            </Upload.Dragger>
            <div style={{ marginTop: "16px" }}>
              <Button
                type="primary"
                block
                disabled={uploadedFiles.length === 0}
                onClick={handleStartGrading}
                icon={<RobotOutlined />}
              >
                开始AI阅卷 ({uploadedFiles.length} 份)
              </Button>
            </div>
          </Card>
        </Col>

        {/* AI状态监控 */}
        <Col span={12}>
          <Card
            title="AI阅卷状态"
            extra={<Tag color="green">AI引擎运行中</Tag>}
          >
            <div style={{ textAlign: "center", padding: "20px 0" }}>
              <Avatar
                size={64}
                icon={<RobotOutlined />}
                style={{ backgroundColor: "#1890ff" }}
              />
              <div style={{ marginTop: "16px" }}>
                <Text strong>智阅AI v3.0</Text>
                <br />
                <Text type="secondary">准确率: 96.8% | 速度: 30秒/份</Text>
              </div>
            </div>

            <Alert
              message="AI阅卷特性"
              description="• 支持主观题智能识别  • 多模态理解能力  • 自适应评分标准"
              type="info"
              showIcon
              style={{ marginTop: "16px" }}
            />
          </Card>
        </Col>
      </Row>

      {/* 阅卷任务列表 */}
      <Card title={`阅卷任务历史 (共${tasks.length}个任务)`}>
        <List
          dataSource={tasks}
          renderItem={(task) => (
            <List.Item
              actions={[
                <Button key="view">查看详情</Button>,
                <Button key="download" type="primary">
                  下载结果
                </Button>,
              ]}
            >
              <List.Item.Meta
                avatar={
                  <Avatar
                    icon={
                      task.status === "completed" ? (
                        <CheckCircleOutlined />
                      ) : (
                        <ClockCircleOutlined />
                      )
                    }
                  />
                }
                title={
                  <Space>
                    {task.examName}
                    <Tag color={statusColors[task.status]}>
                      {statusTexts[task.status]}
                    </Tag>
                  </Space>
                }
                description={
                  <div>
                    <p>
                      总数: {task.totalPapers}份 | 已阅: {task.gradedPapers}份 |
                      准确率: {task.accuracy.toFixed(1)}%
                    </p>
                    <p>开始时间: {task.startTime}</p>
                    <Progress
                      percent={task.progress}
                      size="small"
                      status={
                        task.status === "error"
                          ? "exception"
                          : task.status === "completed"
                          ? "success"
                          : "active"
                      }
                    />
                  </div>
                }
              />
            </List.Item>
          )}
        />
      </Card>

      {/* 提示信息 */}
      <Alert
        message="智能阅卷功能"
        description="使用最新的AI技术进行自动阅卷，支持客观题和主观题的智能识别与评分。系统会自动学习评分标准，提供高精度的批改结果。"
        type="success"
        showIcon
        style={{ marginTop: "24px" }}
      />
    </div>
  );

  // 更新标签页配置，添加概览内容
  const finalTabs = [...intelligentGradingTabs];
  finalTabs[0] = { ...finalTabs[0], children: overviewContent };

  return (
    <div
      style={{
        padding: "24px",
        backgroundColor: "#f5f5f5",
        minHeight: "100vh",
      }}
    >
      {/* 顶部导航 */}
      <Card style={{ marginBottom: "24px" }}>
        <Space align="center">
          <Button
            icon={<ArrowLeftOutlined />}
            onClick={() => navigate("/dashboard")}
          >
            返回工作台
          </Button>
          <Title level={2} style={{ margin: 0 }}>
            智能阅卷系统 v3.0
          </Title>
          <Text type="secondary">AI辅助阅卷、模块化处理、智能分析</Text>
        </Space>
      </Card>

      {/* 功能提示 */}
      <Alert
        message="新功能上线"
        description="智能阅卷系统已升级，新增8个专业模块，请点击下方标签页体验各项功能。"
        type="success"
        showIcon
        style={{ marginBottom: "24px" }}
      />

      {/* 智能阅卷模块标签页 */}
      <Card title="智能阅卷功能模块">
        <Tabs
          defaultActiveKey="overview"
          items={finalTabs}
          size="large"
          tabPosition="top"
          style={{ minHeight: "600px" }}
        />
      </Card>
    </div>
  );
};

export default Grading;
