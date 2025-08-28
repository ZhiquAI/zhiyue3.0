import React from "react";
import { Card, Tabs } from "antd";
import {
  RobotOutlined,
  ScanOutlined,
  BranchesOutlined,
  ThunderboltOutlined,
  EyeOutlined,
  SafetyOutlined,
  DesktopOutlined,
  BankOutlined,
} from "@ant-design/icons";

// 导入智能阅卷模块
import AnswerSheetPreprocessor from "./grading/preprocessing/AnswerSheetPreprocessor";
import QuestionSegmentationEngine from "./grading/segmentation/QuestionSegmentationEngine";
import HybridGradingEngine from "./grading/hybrid/HybridGradingEngine";
import QualityControlCenter from "./grading/quality/QualityControlCenter";
import BiasDetectionSystem from "./grading/fairness/BiasDetectionSystem";
import TemplateDesigner from "./grading/template/TemplateDesigner";
import MultiModelRecognitionEngine from "./grading/recognition/MultiModelRecognitionEngine";
import AdaptiveScoringSystem from "./grading/adaptive/AdaptiveScoringSystem";

const TestGradingModules: React.FC = () => {
  const testTabs = [
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

  return (
    <div style={{ padding: "24px" }}>
      <Card title="智能阅卷模块测试">
        <Tabs
          defaultActiveKey="preprocessing"
          items={testTabs}
          size="large"
          tabPosition="top"
        />
      </Card>
    </div>
  );
};

export default TestGradingModules;
