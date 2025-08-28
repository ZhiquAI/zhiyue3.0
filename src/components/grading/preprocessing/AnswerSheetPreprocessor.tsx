// 答题卡预处理模块
import React, { useState, useCallback } from "react";
import {
  Card,
  Upload,
  Button,
  Alert,
  Table,
  Tag,
  Space,
  Row,
  Col,
  Statistic,
  Modal,
  Image,
  Tooltip,
} from "antd";
import {
  CloudUploadOutlined,
  EyeOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  DeleteOutlined,
  SettingOutlined,
} from "@ant-design/icons";

interface ImageQualityMetrics {
  clarity: number; // 清晰度 0-100
  brightness: number; // 亮度 0-100
  contrast: number; // 对比度 0-100
  skewAngle: number; // 倾斜角度
  noiseLevel: number; // 噪声水平 0-100
  completeness: number; // 完整性 0-100
  overallScore: number; // 综合评分 0-100
}

interface PreprocessedFile {
  id: string;
  originalFile: File;
  fileName: string;
  status: "pending" | "processing" | "completed" | "failed" | "warning";
  qualityMetrics?: ImageQualityMetrics;
  preprocessedUrl?: string;
  issues: string[];
  recommendations: string[];
  processingTime?: number;
}

interface PreprocessingSettings {
  autoCorrectSkew: boolean;
  enhanceContrast: boolean;
  removeNoise: boolean;
  standardizeSize: boolean;
  qualityThreshold: number;
}

const AnswerSheetPreprocessor: React.FC = () => {
  const [files, setFiles] = useState<PreprocessedFile[]>([]);

  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState("");
  const [selectedFile, setSelectedFile] = useState<PreprocessedFile | null>(
    null
  );
  const [settings] = useState<PreprocessingSettings>({
    autoCorrectSkew: true,
    enhanceContrast: true,
    removeNoise: true,
    standardizeSize: true,
    qualityThreshold: 70,
  });

  // 模拟图像质量检测
  const assessImageQuality = useCallback((): Promise<ImageQualityMetrics> => {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟质量检测结果
        const metrics: ImageQualityMetrics = {
          clarity: 75 + Math.random() * 20,
          brightness: 60 + Math.random() * 30,
          contrast: 70 + Math.random() * 25,
          skewAngle: (Math.random() - 0.5) * 10,
          noiseLevel: Math.random() * 30,
          completeness: 85 + Math.random() * 15,
          overallScore: 0,
        };

        // 计算综合评分
        metrics.overallScore =
          metrics.clarity * 0.3 +
          metrics.brightness * 0.15 +
          metrics.contrast * 0.2 +
          (100 - Math.abs(metrics.skewAngle) * 5) * 0.15 +
          (100 - metrics.noiseLevel) * 0.1 +
          metrics.completeness * 0.1;

        resolve(metrics);
      }, 1000 + Math.random() * 2000);
    });
  }, []);

  // 生成问题和建议
  const generateIssuesAndRecommendations = useCallback(
    (metrics: ImageQualityMetrics) => {
      const issues: string[] = [];
      const recommendations: string[] = [];

      if (metrics.clarity < 60) {
        issues.push("图像模糊");
        recommendations.push("建议重新扫描或拍摄，确保焦点清晰");
      }

      if (metrics.brightness < 40 || metrics.brightness > 90) {
        issues.push("亮度异常");
        recommendations.push("调整扫描设备亮度设置");
      }

      if (metrics.contrast < 50) {
        issues.push("对比度不足");
        recommendations.push("启用对比度增强处理");
      }

      if (Math.abs(metrics.skewAngle) > 3) {
        issues.push("图像倾斜");
        recommendations.push("启用自动倾斜校正");
      }

      if (metrics.noiseLevel > 40) {
        issues.push("噪声过多");
        recommendations.push("启用噪声去除处理");
      }

      if (metrics.completeness < 90) {
        issues.push("图像不完整");
        recommendations.push("检查扫描区域，确保答题卡完整");
      }

      return { issues, recommendations };
    },
    []
  );

  // 处理文件上传
  const handleFileUpload = useCallback(
    async (fileList: Array<{ originFileObj?: File; name: string }>) => {
      const newFiles: PreprocessedFile[] = fileList
        .filter((file) => file.originFileObj)
        .map((file) => ({
          id: `${Date.now()}_${Math.random()}`,
          originalFile: file.originFileObj!,
          fileName: file.name,
          status: "pending",
          issues: [],
          recommendations: [],
        }));

      setFiles((prev) => [...prev, ...newFiles]);

      // 开始处理每个文件
      for (const file of newFiles) {
        await processFile(file);
      }
    },
    []
  );

  // 处理单个文件
  const processFile = useCallback(
    async (file: PreprocessedFile) => {
      setFiles((prev) =>
        prev.map((f) => (f.id === file.id ? { ...f, status: "processing" } : f))
      );

      try {
        const startTime = Date.now();

        // 质量检测
        const qualityMetrics = await assessImageQuality();
        const { issues, recommendations } =
          generateIssuesAndRecommendations(qualityMetrics);

        // 模拟预处理
        await new Promise((resolve) => setTimeout(resolve, 2000));

        const processingTime = Date.now() - startTime;
        const status =
          qualityMetrics.overallScore >= settings.qualityThreshold
            ? "completed"
            : "warning";

        // 生成预处理后的图像URL（模拟）
        const preprocessedUrl = URL.createObjectURL(file.originalFile);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status,
                  qualityMetrics,
                  preprocessedUrl,
                  issues,
                  recommendations,
                  processingTime,
                }
              : f
          )
        );
      } catch {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id
              ? {
                  ...f,
                  status: "failed",
                  issues: ["处理失败"],
                  recommendations: ["请重新上传文件"],
                }
              : f
          )
        );
      }
    },
    [
      assessImageQuality,
      generateIssuesAndRecommendations,
      settings.qualityThreshold,
    ]
  );

  // 重新处理文件
  const handleRetryFile = useCallback(
    async (file: PreprocessedFile) => {
      await processFile(file);
    },
    [processFile]
  );

  // 删除文件
  const handleDeleteFile = useCallback((fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  }, []);

  // 预览图像
  const handlePreview = useCallback((file: PreprocessedFile) => {
    const url = file.preprocessedUrl || URL.createObjectURL(file.originalFile);
    setPreviewImage(url);
    setPreviewVisible(true);
  }, []);

  // 查看详情
  const handleViewDetails = useCallback((file: PreprocessedFile) => {
    setSelectedFile(file);
  }, []);

  // 获取状态颜色
  const getStatusColor = (status: string) => {
    const colorMap = {
      pending: "default",
      processing: "blue",
      completed: "success",
      warning: "warning",
      failed: "error",
    };
    return colorMap[status as keyof typeof colorMap] || "default";
  };

  // 获取状态文本
  const getStatusText = (status: string) => {
    const textMap = {
      pending: "等待处理",
      processing: "处理中",
      completed: "处理完成",
      warning: "质量警告",
      failed: "处理失败",
    };
    return textMap[status as keyof typeof textMap] || status;
  };

  // 获取质量等级
  const getQualityLevel = (score: number) => {
    if (score >= 90) return { text: "优秀", color: "success" };
    if (score >= 80) return { text: "良好", color: "success" };
    if (score >= 70) return { text: "一般", color: "warning" };
    if (score >= 60) return { text: "较差", color: "warning" };
    return { text: "很差", color: "error" };
  };

  const uploadProps = {
    name: "file",
    multiple: true,
    accept: ".jpg,.jpeg,.png,.pdf",
    beforeUpload: () => false,
    onChange: (info: {
      fileList: Array<{ originFileObj?: File; name: string }>;
    }) => {
      handleFileUpload(info.fileList);
    },
  };

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
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: "质量评分",
      key: "quality",
      render: (_: unknown, record: PreprocessedFile) => {
        if (!record.qualityMetrics) return "-";
        const level = getQualityLevel(record.qualityMetrics.overallScore);
        return (
          <Space>
            <span>{record.qualityMetrics.overallScore.toFixed(1)}</span>
            <Tag color={level.color}>{level.text}</Tag>
          </Space>
        );
      },
    },
    {
      title: "问题数量",
      key: "issues",
      render: (_: unknown, record: PreprocessedFile) => (
        <Tag color={record.issues.length > 0 ? "warning" : "success"}>
          {record.issues.length} 个问题
        </Tag>
      ),
    },
    {
      title: "处理时间",
      key: "processingTime",
      render: (_: unknown, record: PreprocessedFile) => {
        if (!record.processingTime) return "-";
        return `${(record.processingTime / 1000).toFixed(1)}s`;
      },
    },
    {
      title: "操作",
      key: "actions",
      render: (_: unknown, record: PreprocessedFile) => (
        <Space>
          <Tooltip title="预览图像">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handlePreview(record)}
            />
          </Tooltip>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<CheckCircleOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          {(record.status === "failed" || record.status === "warning") && (
            <Tooltip title="重新处理">
              <Button
                type="text"
                icon={<ReloadOutlined />}
                onClick={() => handleRetryFile(record)}
              />
            </Tooltip>
          )}
          <Tooltip title="删除">
            <Button
              type="text"
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDeleteFile(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const completedFiles = files.filter((f) => f.status === "completed").length;
  const warningFiles = files.filter((f) => f.status === "warning").length;
  const failedFiles = files.filter((f) => f.status === "failed").length;
  const processingFiles = files.filter((f) => f.status === "processing").length;

  return (
    <div className="answer-sheet-preprocessor">
      {/* 统计信息 */}
      <Row gutter={16} className="mb-6">
        <Col span={6}>
          <Statistic
            title="总文件数"
            value={files.length}
            prefix={<CloudUploadOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="处理完成"
            value={completedFiles}
            valueStyle={{ color: "#3f8600" }}
            prefix={<CheckCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="质量警告"
            value={warningFiles}
            valueStyle={{ color: "#faad14" }}
            prefix={<ExclamationCircleOutlined />}
          />
        </Col>
        <Col span={6}>
          <Statistic
            title="处理失败"
            value={failedFiles}
            valueStyle={{ color: "#cf1322" }}
            prefix={<ExclamationCircleOutlined />}
          />
        </Col>
      </Row>

      {/* 上传区域 */}
      <Card title="答题卡上传" className="mb-6">
        <Upload.Dragger {...uploadProps}>
          <p className="ant-upload-drag-icon">
            <CloudUploadOutlined />
          </p>
          <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
          <p className="ant-upload-hint">
            支持批量上传，支持 JPG、PNG、PDF
            格式。系统将自动进行质量检测和预处理。
          </p>
        </Upload.Dragger>
      </Card>

      {/* 处理进度 */}
      {processingFiles > 0 && (
        <Alert
          message={`正在处理 ${processingFiles} 个文件...`}
          type="info"
          showIcon
          className="mb-6"
        />
      )}

      {/* 文件列表 */}
      <Card
        title="预处理结果"
        extra={<Button icon={<SettingOutlined />}>处理设置</Button>}
      >
        <Table
          columns={columns}
          dataSource={files}
          rowKey="id"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total) => `共 ${total} 个文件`,
          }}
        />
      </Card>

      {/* 图像预览 */}
      <Modal
        open={previewVisible}
        title="图像预览"
        footer={null}
        onCancel={() => setPreviewVisible(false)}
        width={800}
      >
        <Image src={previewImage} style={{ width: "100%" }} preview={false} />
      </Modal>

      {/* 详情模态框 */}
      <Modal
        open={!!selectedFile}
        title="文件详情"
        onCancel={() => setSelectedFile(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedFile(null)}>
            关闭
          </Button>,
          selectedFile?.status === "warning" && (
            <Button
              key="retry"
              type="primary"
              onClick={() => {
                if (selectedFile) {
                  handleRetryFile(selectedFile);
                  setSelectedFile(null);
                }
              }}
            >
              重新处理
            </Button>
          ),
        ]}
        width={600}
      >
        {selectedFile && (
          <div>
            <Row gutter={16} className="mb-4">
              <Col span={12}>
                <Card size="small" title="质量指标">
                  {selectedFile.qualityMetrics && (
                    <div>
                      <p>
                        清晰度: {selectedFile.qualityMetrics.clarity.toFixed(1)}
                      </p>
                      <p>
                        亮度:{" "}
                        {selectedFile.qualityMetrics.brightness.toFixed(1)}
                      </p>
                      <p>
                        对比度:{" "}
                        {selectedFile.qualityMetrics.contrast.toFixed(1)}
                      </p>
                      <p>
                        倾斜角度:{" "}
                        {selectedFile.qualityMetrics.skewAngle.toFixed(2)}°
                      </p>
                      <p>
                        噪声水平:{" "}
                        {selectedFile.qualityMetrics.noiseLevel.toFixed(1)}
                      </p>
                      <p>
                        完整性:{" "}
                        {selectedFile.qualityMetrics.completeness.toFixed(1)}
                      </p>
                    </div>
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small" title="处理信息">
                  <p>
                    状态:{" "}
                    <Tag color={getStatusColor(selectedFile.status)}>
                      {getStatusText(selectedFile.status)}
                    </Tag>
                  </p>
                  <p>
                    处理时间:{" "}
                    {selectedFile.processingTime
                      ? `${(selectedFile.processingTime / 1000).toFixed(1)}s`
                      : "-"}
                  </p>
                  <p>
                    文件大小:{" "}
                    {(selectedFile.originalFile.size / 1024 / 1024).toFixed(2)}{" "}
                    MB
                  </p>
                </Card>
              </Col>
            </Row>

            {selectedFile.issues.length > 0 && (
              <Card size="small" title="发现的问题" className="mb-4">
                <ul>
                  {selectedFile.issues.map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </Card>
            )}

            {selectedFile.recommendations.length > 0 && (
              <Card size="small" title="处理建议">
                <ul>
                  {selectedFile.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </Card>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AnswerSheetPreprocessor;
