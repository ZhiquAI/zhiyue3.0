import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Alert,
  Row,
  Col,
  Statistic,
  Tag,
  Space,
  Modal,
  Tabs,
  Image,
  Form,
  Input,
  Select,
  Checkbox,
  Progress,
  Result,
  Timeline,
  Descriptions,
  Tooltip
} from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ReloadOutlined,
  BugOutlined,
  FileImageOutlined,
  UserOutlined,
  BarChartOutlined,
  PrinterOutlined,
  SendOutlined
} from '@ant-design/icons';
import { StandardizedAnswerSheet } from '../../types/preGrading';
import { message } from '../../utils/message';

// 移除废弃的TabPane导入
const { TextArea } = Input;
const { Option } = Select;

interface ValidationStageProps {
  answerSheets: StandardizedAnswerSheet[];
  onValidate: () => Promise<void>;
  onRetry: (sheetId: string) => Promise<void>;
  onComplete?: () => void;
}

interface ValidationIssue {
  id: string;
  sheetId: string;
  type: 'quality' | 'identity' | 'structure' | 'content';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  suggestion: string;
  status: 'pending' | 'resolved' | 'ignored';
  resolvedBy?: string;
  resolvedAt?: string;
  resolvedNote?: string;
}

interface ValidationReport {
  summary: {
    totalSheets: number;
    validSheets: number;
    invalidSheets: number;
    warningSheets: number;
    avgQuality: number;
    avgIdentityConfidence: number;
    totalIssues: number;
    criticalIssues: number;
  };
  qualityDistribution: {
    excellent: number;
    good: number;
    fair: number;
    poor: number;
  };
  issuesByType: {
    quality: number;
    identity: number;
    structure: number;
    content: number;
  };
  processingTime: number;
  recommendations: string[];
}

const ValidationStage: React.FC<ValidationStageProps> = ({
  answerSheets,
  onValidate,
  onRetry,
  onComplete
}) => {
  const [issues, setIssues] = useState<ValidationIssue[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<StandardizedAnswerSheet | null>(null);
  const [selectedIssue, setSelectedIssue] = useState<ValidationIssue | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalType, setModalType] = useState<'sheet' | 'issue' | 'resolve'>('sheet');
  const [activeTab, setActiveTab] = useState('overview');
  const [validating, setValidating] = useState(false);
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [form] = Form.useForm();

  // 初始化验证问题
  useEffect(() => {
    generateValidationIssues();
    generateValidationReport();
  }, [answerSheets]);

  // 生成验证问题
  const generateValidationIssues = () => {
    const mockIssues: ValidationIssue[] = [];
    
    answerSheets.forEach(sheet => {
      // 根据答题卡质量和状态生成问题
      if (sheet.imageData.qualityMetrics.overall_score < 0.8) {
        mockIssues.push({
          id: `issue_${sheet.id}_quality`,
          sheetId: sheet.id,
          type: 'quality',
          severity: sheet.imageData.qualityMetrics.overall_score < 0.6 ? 'high' : 'medium',
          title: '图像质量不达标',
          description: `答题卡图像质量评分为 ${Math.round(sheet.imageData.qualityMetrics.overall_score * 100)} 分，低于系统要求`,
          suggestion: '建议重新拍摄或调整图像处理参数',
          status: 'pending'
        });
      }

      if (sheet.studentIdentity.verificationStatus !== 'verified') {
        mockIssues.push({
          id: `issue_${sheet.id}_identity`,
          sheetId: sheet.id,
          type: 'identity',
          severity: sheet.studentIdentity.verificationStatus === 'failed' ? 'critical' : 'medium',
          title: '学生身份验证失败',
          description: `无法确认学生身份，当前状态：${sheet.studentIdentity.verificationStatus}`,
          suggestion: '请手动确认学生信息或重新进行身份识别',
          status: 'pending'
        });
      }

      if (sheet.questionStructure.detectionConfidence < 0.9) {
        mockIssues.push({
          id: `issue_${sheet.id}_structure`,
          sheetId: sheet.id,
          type: 'structure',
          severity: 'low',
          title: '题目结构检测置信度偏低',
          description: `题目结构检测置信度为 ${Math.round(sheet.questionStructure.detectionConfidence * 100)}%`,
          suggestion: '建议人工复核题目分割结果',
          status: 'pending'
        });
      }

      if (sheet.processingStatus.issues.length > 0) {
        sheet.processingStatus.issues.forEach((issue, index) => {
          mockIssues.push({
            id: `issue_${sheet.id}_content_${index}`,
            sheetId: sheet.id,
            type: 'content',
            severity: 'medium',
            title: '内容处理问题',
            description: issue.message,
            suggestion: issue.suggestedAction || '请检查处理结果',
            status: 'pending'
          });
        });
      }
    });

    setIssues(mockIssues);
  };

  // 生成验证报告
  const generateValidationReport = () => {
    const validSheets = answerSheets.filter(sheet => 
      sheet.studentIdentity.verificationStatus === 'verified' && 
      sheet.imageData.qualityMetrics.overall_score >= 0.7
    );

    const qualityScores = answerSheets.map(sheet => sheet.imageData.qualityMetrics.overall_score);
    const avgQuality = qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length;

    const identityScores = answerSheets.map(sheet => sheet.studentIdentity.confidence);
    const avgIdentityConfidence = identityScores.reduce((sum, score) => sum + score, 0) / identityScores.length;

    const mockReport: ValidationReport = {
      summary: {
        totalSheets: answerSheets.length,
        validSheets: validSheets.length,
        invalidSheets: answerSheets.length - validSheets.length,
        warningSheets: answerSheets.filter(sheet => 
          sheet.imageData.qualityMetrics.overall_score < 0.8 && 
          sheet.imageData.qualityMetrics.overall_score >= 0.7
        ).length,
        avgQuality: Math.round(avgQuality * 100),
        avgIdentityConfidence: Math.round(avgIdentityConfidence * 100),
        totalIssues: issues.length,
        criticalIssues: issues.filter(issue => issue.severity === 'critical').length
      },
      qualityDistribution: {
        excellent: answerSheets.filter(sheet => sheet.imageData.qualityMetrics.overall_score >= 0.9).length,
        good: answerSheets.filter(sheet => sheet.imageData.qualityMetrics.overall_score >= 0.8 && sheet.imageData.qualityMetrics.overall_score < 0.9).length,
        fair: answerSheets.filter(sheet => sheet.imageData.qualityMetrics.overall_score >= 0.7 && sheet.imageData.qualityMetrics.overall_score < 0.8).length,
        poor: answerSheets.filter(sheet => sheet.imageData.qualityMetrics.overall_score < 0.7).length
      },
      issuesByType: {
        quality: issues.filter(issue => issue.type === 'quality').length,
        identity: issues.filter(issue => issue.type === 'identity').length,
        structure: issues.filter(issue => issue.type === 'structure').length,
        content: issues.filter(issue => issue.type === 'content').length
      },
      processingTime: answerSheets.reduce((sum, sheet) => sum + sheet.processingTime, 0),
      recommendations: [
        '建议提高拍摄环境的光照条件',
        '确保答题卡平整，避免折叠和倾斜',
        '检查学生信息录入的准确性',
        '考虑调整图像处理参数以提高质量'
      ]
    };

    setReport(mockReport);
  };

  // 开始验证
  const handleStartValidation = async () => {
    setValidating(true);
    
    try {
      await onValidate();
      message.success('数据验证完成');
    } catch (error) {
      message.error('验证失败');
      console.error(error);
    } finally {
      setValidating(false);
    }
  };

  // 解决问题
  const handleResolveIssue = async (issueId: string, resolution: string, note: string) => {
    setIssues(prev => prev.map(issue => 
      issue.id === issueId 
        ? { 
            ...issue, 
            status: 'resolved',
            resolvedBy: 'current_user',
            resolvedAt: new Date().toISOString(),
            resolvedNote: note
          }
        : issue
    ));
    
    message.success('问题已解决');
    setModalVisible(false);
  };

  // 忽略问题
  const handleIgnoreIssue = (issueId: string) => {
    setIssues(prev => prev.map(issue => 
      issue.id === issueId 
        ? { ...issue, status: 'ignored' }
        : issue
    ));
    
    message.info('问题已忽略');
  };

  // 重新处理答题卡
  const handleRetrySheet = async (sheetId: string) => {
    try {
      await onRetry(sheetId);
      // 移除相关问题
      setIssues(prev => prev.filter(issue => issue.sheetId !== sheetId));
      message.success('重新处理已开始');
    } catch (error) {
      message.error('重新处理失败');
      console.error(error);
    }
  };

  // 查看答题卡详情
  const handleViewSheet = (sheet: StandardizedAnswerSheet) => {
    setSelectedSheet(sheet);
    setModalType('sheet');
    setModalVisible(true);
  };

  // 查看问题详情
  const handleViewIssue = (issue: ValidationIssue) => {
    setSelectedIssue(issue);
    setModalType('issue');
    setModalVisible(true);
  };

  // 解决问题模态框
  const handleResolveModal = (issue: ValidationIssue) => {
    setSelectedIssue(issue);
    setModalType('resolve');
    form.resetFields();
    setModalVisible(true);
  };

  // 完成验证
  const handleCompleteValidation = () => {
    const pendingIssues = issues.filter(issue => issue.status === 'pending');
    
    if (pendingIssues.length > 0) {
      Modal.confirm({
        title: '存在未解决的问题',
        content: `还有 ${pendingIssues.length} 个问题未解决，确定要完成验证吗？`,
        onOk: () => {
          onComplete?.();
          message.success('数据验证阶段已完成');
        }
      });
    } else {
      onComplete?.();
      message.success('数据验证阶段已完成');
    }
  };

  // 问题表格列定义
  const issueColumns = [
    {
      title: '问题类型',
      key: 'type',
      width: 100,
      render: (_: unknown, record: ValidationIssue) => {
        const typeConfig = {
          quality: { color: 'orange', text: '质量' },
          identity: { color: 'red', text: '身份' },
          structure: { color: 'blue', text: '结构' },
          content: { color: 'purple', text: '内容' }
        };
        const config = typeConfig[record.type];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '严重程度',
      key: 'severity',
      width: 100,
      render: (_: unknown, record: ValidationIssue) => {
        const severityConfig = {
          low: { color: 'green', text: '低' },
          medium: { color: 'orange', text: '中' },
          high: { color: 'red', text: '高' },
          critical: { color: 'red', text: '严重' }
        };
        const config = severityConfig[record.severity];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '问题标题',
      dataIndex: 'title',
      key: 'title',
      width: 200
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 300,
      render: (text: string) => (
        <Tooltip title={text}>
          <span className="truncate">{text}</span>
        </Tooltip>
      )
    },
    {
      title: '状态',
      key: 'status',
      width: 100,
      render: (_: unknown, record: ValidationIssue) => {
        const statusConfig = {
          pending: { color: 'processing', text: '待处理' },
          resolved: { color: 'success', text: '已解决' },
          ignored: { color: 'default', text: '已忽略' }
        };
        const config = statusConfig[record.status];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 200,
      render: (_: unknown, record: ValidationIssue) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewIssue(record)}
          >
            详情
          </Button>
          {record.status === 'pending' && (
            <>
              <Button 
                type="link" 
                size="small"
                icon={<CheckCircleOutlined />}
                onClick={() => handleResolveModal(record)}
              >
                解决
              </Button>
              <Button 
                type="link" 
                size="small"
                onClick={() => handleIgnoreIssue(record.id)}
              >
                忽略
              </Button>
            </>
          )}
        </Space>
      )
    }
  ];

  // 答题卡表格列定义
  const sheetColumns = [
    {
      title: '文件名',
      key: 'filename',
      width: 200,
      render: (_: unknown, record: StandardizedAnswerSheet) => (
        <div className="flex items-center gap-2">
          <FileImageOutlined />
          <span className="truncate">{record.metadata.originalFilename}</span>
        </div>
      )
    },
    {
      title: '学生信息',
      key: 'student',
      width: 150,
      render: (_: unknown, record: StandardizedAnswerSheet) => (
        <div>
          <div>{record.studentIdentity.name}</div>
          <div className="text-sm text-gray-500">{record.studentIdentity.class}</div>
        </div>
      )
    },
    {
      title: '身份验证',
      key: 'identity',
      width: 120,
      render: (_: unknown, record: StandardizedAnswerSheet) => {
        const statusConfig = {
          verified: { color: 'success', text: '已验证' },
          pending: { color: 'processing', text: '待验证' },
          failed: { color: 'error', text: '失败' },
          conflict: { color: 'warning', text: '冲突' }
        };
        const config = statusConfig[record.studentIdentity.verificationStatus];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '质量评分',
      key: 'quality',
      width: 100,
      render: (_: unknown, record: StandardizedAnswerSheet) => {
        const score = Math.round(record.imageData.qualityMetrics.overall_score * 100);
        const color = score >= 90 ? 'green' : score >= 70 ? 'orange' : 'red';
        return <Tag color={color}>{score}分</Tag>;
      }
    },
    {
      title: '处理状态',
      key: 'processing',
      width: 100,
      render: (_: unknown, record: StandardizedAnswerSheet) => {
        const statusConfig = {
          uploaded: { color: 'default', text: '已上传' },
          quality_checked: { color: 'processing', text: '质检中' },
          identity_verified: { color: 'processing', text: '验证中' },
          segmented: { color: 'processing', text: '已分割' },
          ready: { color: 'success', text: '就绪' },
          error: { color: 'error', text: '错误' }
        };
        const config = statusConfig[record.processingStatus.stage];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '问题数量',
      key: 'issues',
      width: 100,
      render: (_: unknown, record: StandardizedAnswerSheet) => {
        const sheetIssues = issues.filter(issue => issue.sheetId === record.id);
        const pendingIssues = sheetIssues.filter(issue => issue.status === 'pending');
        
        return pendingIssues.length > 0 ? (
          <Tag color="warning">{pendingIssues.length} 个问题</Tag>
        ) : (
          <Tag color="success">无问题</Tag>
        );
      }
    },
    {
      title: '操作',
      key: 'action',
      width: 150,
      render: (_: unknown, record: StandardizedAnswerSheet) => (
        <Space size="small">
          <Button 
            type="link" 
            size="small"
            icon={<EyeOutlined />}
            onClick={() => handleViewSheet(record)}
          >
            查看
          </Button>
          <Button 
            type="link" 
            size="small"
            icon={<ReloadOutlined />}
            onClick={() => handleRetrySheet(record.id)}
          >
            重试
          </Button>
        </Space>
      )
    }
  ];

  const pendingIssues = issues.filter(issue => issue.status === 'pending');
  const criticalIssues = issues.filter(issue => issue.severity === 'critical');

  return (
    <div className="validation-stage">
      {/* 验证控制面板 */}
      <Card className="mb-6">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={12}>
            <div className="flex items-center gap-4">
              <Button 
                type="primary"
                size="large"
                icon={<CheckCircleOutlined />}
                onClick={handleStartValidation}
                loading={validating}
              >
                {validating ? '验证中...' : '开始数据验证'}
              </Button>
              
              <Button 
                size="large"
                icon={<SendOutlined />}
                onClick={handleCompleteValidation}
                disabled={validating}
              >
                完成验证
              </Button>
            </div>
          </Col>
          
          <Col xs={24} md={12}>
            <div className="text-right">
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-gray-600">待处理问题: </span>
                  <Tag color={pendingIssues.length > 0 ? 'warning' : 'success'}>
                    {pendingIssues.length}
                  </Tag>
                </div>
                <div className="text-sm">
                  <span className="text-gray-600">严重问题: </span>
                  <Tag color={criticalIssues.length > 0 ? 'error' : 'success'}>
                    {criticalIssues.length}
                  </Tag>
                </div>
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 关键警告 */}
      {criticalIssues.length > 0 && (
        <Alert
          message="发现严重问题"
          description={`检测到 ${criticalIssues.length} 个严重问题，建议优先处理`}
          type="error"
          showIcon
          className="mb-6"
          action={
            <Button size="small" danger>
              查看详情
            </Button>
          }
        />
      )}

      {/* 验证报告 */}
      {report && (
        <Row gutter={[16, 16]} className="mb-6">
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="总答题卡数"
                value={report.summary.totalSheets}
                prefix={<FileImageOutlined />}
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="有效答题卡"
                value={report.summary.validSheets}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#52c41a' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="平均质量"
                value={report.summary.avgQuality}
                suffix="分"
                valueStyle={{ color: report.summary.avgQuality >= 80 ? '#52c41a' : '#ff4d4f' }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={6}>
            <Card>
              <Statistic
                title="问题总数"
                value={report.summary.totalIssues}
                prefix={<ExclamationCircleOutlined />}
                valueStyle={{ color: report.summary.totalIssues > 0 ? '#ff4d4f' : '#52c41a' }}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* 主要内容 */}
      <Card>
        <Tabs 
          activeKey={activeTab} 
          onChange={setActiveTab}
          items={[
            {
              key: 'issues',
              label: `问题列表 (${pendingIssues.length})`,
              children: (
                <Table
                  columns={issueColumns}
                  dataSource={issues}
                  rowKey="id"
                  scroll={{ x: 1000 }}
                  pagination={{
                    total: issues.length,
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 个问题`
                  }}
                />
              )
            },
            {
              key: 'sheets',
              label: '答题卡列表',
              children: (
                <Table
                  columns={sheetColumns}
                  dataSource={answerSheets}
                  rowKey="id"
                  scroll={{ x: 1000 }}
                  pagination={{
                    total: answerSheets.length,
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                    showTotal: (total) => `共 ${total} 份答题卡`
                  }}
                />
              )
            },
            {
              key: 'report',
              label: '验证报告',
              children: report && (
                <div className="space-y-6">
                  {/* 质量分布 */}
                  <Card title="质量分布" size="small">
                    <Row gutter={[16, 16]}>
                      <Col span={6}>
                        <Statistic title="优秀" value={report.qualityDistribution.excellent} valueStyle={{ color: '#52c41a' }} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="良好" value={report.qualityDistribution.good} valueStyle={{ color: '#1677ff' }} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="一般" value={report.qualityDistribution.fair} valueStyle={{ color: '#faad14' }} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="较差" value={report.qualityDistribution.poor} valueStyle={{ color: '#ff4d4f' }} />
                      </Col>
                    </Row>
                  </Card>

                  {/* 问题分布 */}
                  <Card title="问题分布" size="small">
                    <Row gutter={[16, 16]}>
                      <Col span={6}>
                        <Statistic title="质量问题" value={report.issuesByType.quality} valueStyle={{ color: '#faad14' }} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="身份问题" value={report.issuesByType.identity} valueStyle={{ color: '#ff4d4f' }} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="结构问题" value={report.issuesByType.structure} valueStyle={{ color: '#1677ff' }} />
                      </Col>
                      <Col span={6}>
                        <Statistic title="内容问题" value={report.issuesByType.content} valueStyle={{ color: '#722ed1' }} />
                      </Col>
                    </Row>
                  </Card>

                  {/* 改进建议 */}
                  <Card title="改进建议" size="small">
                    <ul className="space-y-2">
                      {report.recommendations.map((rec, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircleOutlined className="text-green-500" />
                          <span>{rec}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </div>
              )
            }
          ]}
        />
      </Card>

      {/* 详情模态框 */}
      <Modal
        title={
          modalType === 'sheet' ? '答题卡详情' :
          modalType === 'issue' ? '问题详情' : '解决问题'
        }
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={modalType === 'resolve' ? [
          <Button key="cancel" onClick={() => setModalVisible(false)}>
            取消
          </Button>,
          <Button 
            key="resolve" 
            type="primary" 
            onClick={() => {
              form.validateFields().then(values => {
                if (selectedIssue) {
                  handleResolveIssue(selectedIssue.id, values.resolution, values.note);
                }
              });
            }}
          >
            确认解决
          </Button>
        ] : null}
        width={800}
      >
        {modalType === 'sheet' && selectedSheet && (
          <Descriptions column={2} bordered>
            <Descriptions.Item label="文件名">
              {selectedSheet.metadata.originalFilename}
            </Descriptions.Item>
            <Descriptions.Item label="学生姓名">
              {selectedSheet.studentIdentity.name}
            </Descriptions.Item>
            <Descriptions.Item label="学生班级">
              {selectedSheet.studentIdentity.class}
            </Descriptions.Item>
            <Descriptions.Item label="身份验证">
              <Tag color={selectedSheet.studentIdentity.verificationStatus === 'verified' ? 'success' : 'error'}>
                {selectedSheet.studentIdentity.verificationStatus}
              </Tag>
            </Descriptions.Item>
            <Descriptions.Item label="质量评分">
              {Math.round(selectedSheet.imageData.qualityMetrics.overall_score * 100)}分
            </Descriptions.Item>
            <Descriptions.Item label="文件大小">
              {(selectedSheet.imageData.fileSize / 1024 / 1024).toFixed(2)} MB
            </Descriptions.Item>
            <Descriptions.Item label="图像尺寸">
              {selectedSheet.imageData.dimensions.width} × {selectedSheet.imageData.dimensions.height}
            </Descriptions.Item>
            <Descriptions.Item label="处理状态">
              <Tag color="processing">{selectedSheet.processingStatus.stage}</Tag>
            </Descriptions.Item>
          </Descriptions>
        )}

        {modalType === 'issue' && selectedIssue && (
          <div className="space-y-4">
            <Descriptions column={1} bordered>
              <Descriptions.Item label="问题类型">
                <Tag color="blue">{selectedIssue.type}</Tag>
              </Descriptions.Item>
              <Descriptions.Item label="严重程度">
                <Tag color={selectedIssue.severity === 'critical' ? 'red' : 'orange'}>
                  {selectedIssue.severity}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="问题描述">
                {selectedIssue.description}
              </Descriptions.Item>
              <Descriptions.Item label="建议解决方案">
                {selectedIssue.suggestion}
              </Descriptions.Item>
              {selectedIssue.status === 'resolved' && (
                <>
                  <Descriptions.Item label="解决时间">
                    {selectedIssue.resolvedAt ? new Date(selectedIssue.resolvedAt).toLocaleString() : '-'}
                  </Descriptions.Item>
                  <Descriptions.Item label="解决说明">
                    {selectedIssue.resolvedNote || '-'}
                  </Descriptions.Item>
                </>
              )}
            </Descriptions>
          </div>
        )}

        {modalType === 'resolve' && selectedIssue && (
          <Form form={form} layout="vertical">
            <Form.Item
              name="resolution"
              label="解决方式"
              rules={[{ required: true, message: '请选择解决方式' }]}
            >
              <Select placeholder="请选择解决方式">
                <Option value="manual_fix">手动修复</Option>
                <Option value="auto_retry">自动重试</Option>
                <Option value="parameter_adjust">调整参数</Option>
                <Option value="accept_as_is">接受现状</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="note"
              label="解决说明"
              rules={[{ required: true, message: '请输入解决说明' }]}
            >
              <TextArea rows={4} placeholder="请详细说明解决过程和结果" />
            </Form.Item>
          </Form>
        )}
      </Modal>
    </div>
  );
};

export default ValidationStage;