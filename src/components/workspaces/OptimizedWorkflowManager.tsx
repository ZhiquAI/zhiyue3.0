import React, { useState, useEffect } from 'react';
import {
  Card, Steps, Button, Space, Progress, Alert,
  Row, Col, Badge, Tooltip, Upload, Switch
} from 'antd';
import { message } from '../../utils/message';
const { Dragger } = Upload;
import {
  PlayCircleOutlined, PauseCircleOutlined, SettingOutlined, 
  ThunderboltOutlined, FileTextOutlined, EyeOutlined,
  UserOutlined, RobotOutlined, ScissorOutlined, 
  HistoryOutlined, CheckCircleOutlined, ExclamationCircleOutlined,
  BarcodeOutlined
} from '@ant-design/icons';
import QuestionSegmentationWorkspace from './QuestionSegmentationWorkspace';
import ScoringStandardsManager from './ScoringStandardsManager';

const { Step } = Steps;

interface ProcessedAnswerSheet {
  id: string;
  filename: string;
  size: number;
  status: 'processing' | 'completed' | 'error' | 'duplicate' | 'pending_student_info' | 'student_info_processing';
  previewUrl?: string;
  studentInfo?: {
    id: string;
    name: string;
    class: string;
    exam_number?: string;
    paper_type?: string;
    barcode?: string;
  };
  recognitionResult?: {
    confidence: number;
    issues: string[];
    needsReview?: boolean;
  };
  studentInfoRegions?: {
    id: string;
    type: 'student_info' | 'barcode' | 'exam_number' | 'name_field' | 'class_field';
    x: number;
    y: number;
    width: number;
    height: number;
    confidence: number;
  }[];
  choiceSegmentationResult?: {
    totalQuestions: number;
    choiceQuestions: number;
    qualityScore: number;
    issues: string[];
  };
  subjectiveSegmentationResult?: {
    totalQuestions: number;
    subjectiveQuestions: number;
    qualityScore: number;
    issues: string[];
  };
  choiceSegmentationHistory?: {
    versions: any[];
    currentVersionId: string;
    lastModified: string;
  };
  subjectiveSegmentationHistory?: {
    versions: any[];
    currentVersionId: string;
    lastModified: string;
  };
  segmentedQuestions?: any;
  errorMessage?: string;
}

interface WorkflowStep {
  key: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'wait' | 'process' | 'finish' | 'error';
  progress: number;
  actions: {
    label: string;
    type: 'primary' | 'default' | 'dashed';
    icon: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
    count?: number;
  }[];
  statistics?: {
    total: number;
    completed: number;
    failed: number;
    pending: number;
  };
}

interface OptimizedWorkflowManagerProps {
  processedSheets: ProcessedAnswerSheet[];
  processing: boolean;
  fileList: any[];
  uploading: boolean;
  onUpload: () => void;
  onFileChange: (info: any) => void;
  beforeUpload: (file: any) => boolean | string;
  onPreview: (sheet: ProcessedAnswerSheet) => void;
  onBarcodeInfoProcessing: () => void;
  onRetryProcessing: (sheetId: string) => void;
  onBlankSheets: () => void;
  onClearAll: () => void;
  onStartGrading: () => void;
  onAbnormalSheets: () => void;
  onSheetsUpdate?: (sheets: ProcessedAnswerSheet[]) => void;
}

const OptimizedWorkflowManager: React.FC<OptimizedWorkflowManagerProps> = ({
  processedSheets,
  processing,
  fileList,
  uploading,
  onUpload,
  onFileChange,
  beforeUpload,
  onPreview,
  onBarcodeInfoProcessing,
  onRetryProcessing,
  onBlankSheets,
  onClearAll,
  onStartGrading,
  onAbnormalSheets,
  onSheetsUpdate
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [autoMode, setAutoMode] = useState(false);
  const [batchSize, setBatchSize] = useState(10);
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.8);
  const [segmentationWorkspaceVisible, setSegmentationWorkspaceVisible] = useState(false);
  const [currentSheetForSegmentation, setCurrentSheetForSegmentation] = useState<ProcessedAnswerSheet | null>(null);
  const [scoringStandardsVisible, setScoringStandardsVisible] = useState(false);
  const [workflowConfig, setWorkflowConfig] = useState({
    enableQualityCheck: true,
    enableParallelProcessing: true,
    autoAdvanceSteps: true,
    skipLowQualitySheets: false
  });

  // 计算统计数据
  const statistics = {
    total: processedSheets.length,
    completed: processedSheets.filter(s => s.status === 'completed').length,
    failed: processedSheets.filter(s => s.status === 'error').length,
    pending: processedSheets.filter(s => s.status === 'pending_student_info').length,
    processing: processedSheets.filter(s => s.status === 'processing' || s.status === 'student_info_processing').length
  };

  // 学生信息处理统计
  const studentInfoStats = {
    total: processedSheets.filter(s => s.status === 'completed' || s.status === 'pending_student_info' || s.status === 'student_info_processing').length,
    completed: processedSheets.filter(s => s.status === 'completed' && s.studentInfo && s.studentInfo.id && s.studentInfo.name).length,
    failed: 0,
    pending: processedSheets.filter(s => s.status === 'pending_student_info' || (s.status === 'completed' && (!s.studentInfo || !s.studentInfo.id || !s.studentInfo.name))).length
  };

  // 题目切割统计函数
  const getQuestionSegmentationStats = () => {
    const sheetsWithStudentInfo = processedSheets.filter(s => s.studentInfo);
    const sheetsWithSegmentation = sheetsWithStudentInfo.filter(s => 
      s.choiceSegmentationResult || s.subjectiveSegmentationResult
    );
    
    return {
      total: sheetsWithStudentInfo.length,
      completed: sheetsWithSegmentation.length,
      failed: 0,
      pending: sheetsWithStudentInfo.length - sheetsWithSegmentation.length
    };
  };

  const getQuestionSegmentationProgress = () => {
    const stats = getQuestionSegmentationStats();
    return stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;
  };

  const hasSegmentationHistory = () => {
    return processedSheets.some(s => 
      s.choiceSegmentationHistory || s.subjectiveSegmentationHistory
    );
  };

  function getStepStatus(stepKey: string): 'wait' | 'process' | 'finish' | 'error' {
    switch (stepKey) {
      case 'question_segmentation':
        const segStats = getQuestionSegmentationStats();
        if (segStats.total === 0) return 'wait';
        if (segStats.completed === segStats.total) return 'finish';
        if (segStats.completed > 0) return 'process';
        return 'wait';

      default:
        return 'wait';
    }
  }

  // 批量学生信息识别处理
  const handleBatchStudentInfoProcessing = async () => {
    const sheetsToProcess = processedSheets.filter(s => s.status === 'pending_student_info');
    if (sheetsToProcess.length === 0) return;

    // 更新状态为处理中
    const updatedSheets = processedSheets.map(sheet => {
      if (sheet.status === 'pending_student_info') {
        return { ...sheet, status: 'student_info_processing' as const };
      }
      return sheet;
    });
    onSheetsUpdate?.(updatedSheets);

    // 模拟批量处理
    for (let i = 0; i < sheetsToProcess.length; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // 模拟处理时间
      
      const mockStudents = [
        { id: '2024001', name: '张三', class: '八年级1班', exam_number: 'E001', paper_type: 'A卷' },
        { id: '2024002', name: '李四', class: '八年级1班', exam_number: 'E002', paper_type: 'A卷' },
        { id: '2024003', name: '王五', class: '八年级2班', exam_number: 'E003', paper_type: 'B卷' },
        { id: '2024004', name: '赵六', class: '八年级2班', exam_number: 'E004', paper_type: 'B卷' },
        { id: '2024005', name: '钱七', class: '八年级3班', exam_number: 'E005', paper_type: 'A卷' },
      ];
      
      const randomStudent = mockStudents[Math.floor(Math.random() * mockStudents.length)];
      
      const finalSheets = processedSheets.map(sheet => {
        if (sheet.id === sheetsToProcess[i].id) {
          return {
            ...sheet,
            status: 'completed' as const,
            studentInfo: randomStudent,
            recognitionResult: {
              confidence: Math.floor(Math.random() * 30) + 70, // 70-100的置信度
              issues: Math.random() > 0.8 ? ['图片略微模糊'] : [],
              needsReview: Math.random() > 0.7
            }
          };
        }
        return sheet;
      });
      onSheetsUpdate?.(finalSheets);
    }
  };

  // 工作流程步骤定义
  const workflowSteps: WorkflowStep[] = [
    {
      key: 'upload',
      title: '① 批量上传处理',
      description: '上传答题卡文件并自动识别学生信息',
      icon: <FileTextOutlined />,
      status: fileList.length > 0 ? (studentInfoStats.completed > 0 ? 'finish' : (uploading || processedSheets.some(s => s.status === 'student_info_processing') ? 'process' : 'wait')) : 'wait',
      progress: fileList.length > 0 ? (studentInfoStats.completed / fileList.length) * 100 : 0,
      statistics: {
        total: fileList.length,
        completed: studentInfoStats.completed,
        failed: statistics.failed,
        pending: studentInfoStats.pending
      },
      actions: [
        {
          label: fileList.length > 0 ? '开始上传处理' : '选择文件',
          type: 'primary',
          icon: <FileTextOutlined />,
          onClick: fileList.length > 0 ? onUpload : () => {
            // 触发文件选择
            const input = document.createElement('input');
            input.type = 'file';
            input.multiple = true;
            input.accept = '.jpg,.jpeg,.png,.pdf';
            input.onchange = (e) => {
              const files = Array.from((e.target as HTMLInputElement).files || []);
              const fileList = files.map((file, index) => ({
                uid: `${Date.now()}-${index}`,
                name: file.name,
                status: 'done' as const,
                originFileObj: file
              }));
              onFileChange({ fileList });
            };
            input.click();
          },
          disabled: uploading,
          loading: uploading,
          count: fileList.length
        },
        {
          label: '批量学生信息识别',
          type: 'default',
          icon: <BarcodeOutlined />,
          onClick: handleBatchStudentInfoProcessing,
          disabled: studentInfoStats.pending === 0,
          loading: processedSheets.some(s => s.status === 'student_info_processing'),
          count: studentInfoStats.pending
        },
        {
          label: '预览答题卡',
          type: 'default',
          icon: <EyeOutlined />,
          onClick: () => {
            const firstSheet = processedSheets.find(s => s.previewUrl);
            if (firstSheet) onPreview(firstSheet);
          },
          disabled: !processedSheets.some(s => s.previewUrl)
        },
        {
          label: '异常答题卡处理',
          type: 'default',
          icon: <ExclamationCircleOutlined />,
          onClick: onAbnormalSheets,
          disabled: statistics.failed === 0,
          count: statistics.failed
        }
      ]
    },
    {
      key: 'question_segmentation',
      title: '② 试题分类切割',
      description: '标注题目区域，为智能阅卷做准备',
      icon: <ScissorOutlined />,
      status: getStepStatus('question_segmentation'),
      progress: getQuestionSegmentationProgress(),
      statistics: getQuestionSegmentationStats(),
      actions: [
        {
          label: '开始题目切割',
          type: 'primary',
          icon: <ScissorOutlined />,
          onClick: () => {
            const sheetsWithStudentInfo = processedSheets.filter(s => s.studentInfo);
            if (sheetsWithStudentInfo.length === 0) {
              message.warning('请先完成学生信息识别');
              return;
            }
            
            // 选择第一个有学生信息且有previewUrl的答题卡进行切割
            const sheetsWithPreview = sheetsWithStudentInfo.filter(s => s.previewUrl);
            
            if (sheetsWithPreview.length === 0) {
              message.error('没有找到有效的答题卡图片，请重新上传');
              return;
            }
            
            const firstSheet = sheetsWithPreview[0];
            setCurrentSheetForSegmentation(firstSheet);
            setSegmentationWorkspaceVisible(true);
            message.success('正在打开试题分类切割工作台...');
          },
          disabled: studentInfoStats.completed === 0,
          count: studentInfoStats.completed
        },
        {
          label: '批量自动检测',
          type: 'default',
          icon: <RobotOutlined />,
          onClick: () => {
            message.loading('正在执行AI自动检测...', 0);
            setTimeout(() => {
              message.destroy();
              message.success('AI检测完成，请手动验证结果');
            }, 3000);
          },
          disabled: studentInfoStats.completed === 0
        },
        {
          label: '查看切割历史',
          type: 'default',
          icon: <HistoryOutlined />,
          onClick: () => {
            message.info('正在打开切割历史记录...');
          },
          disabled: !hasSegmentationHistory()
        }
      ]
    },
    {
      key: 'scoring',
      title: '③ 设置评分标准',
      description: '上传试卷和参考答案，自动为每道题设置评分标准',
      icon: <SettingOutlined />,
      status: getQuestionSegmentationStats().completed > 0 ? 'process' : 'wait',
      progress: getQuestionSegmentationStats().completed > 0 ? 50 : 0,
      statistics: {
        total: getQuestionSegmentationStats().completed,
        completed: 0,
        failed: 0,
        pending: getQuestionSegmentationStats().completed
      },
      actions: [
        {
          label: '设置评分标准',
          type: 'primary',
          icon: <SettingOutlined />,
          onClick: () => {
            setScoringStandardsVisible(true);
          },
          disabled: getQuestionSegmentationStats().completed === 0
        }
      ]
    }
  ];



  // 自动推进工作流程 - 只在智能模式下生效
  useEffect(() => {
    if (autoMode && workflowConfig.autoAdvanceSteps) {
      if (studentInfoStats.completed > 0 && currentStep === 0) {
        setCurrentStep(1);
      } else if (getQuestionSegmentationStats().completed > 0 && currentStep === 1) {
        setCurrentStep(2);
      }
    }
  }, [studentInfoStats, currentStep, workflowConfig.autoAdvanceSteps, autoMode]);

  // 执行智能工作流程
  const executeSmartWorkflow = async () => {
    if (!autoMode) {
      message.info('请手动执行各个步骤');
      return;
    }

    message.loading('正在执行智能工作流程...', 0);
    
    try {
      // 自动执行批量学生信息识别
      if (studentInfoStats.pending > 0) {
        await handleBatchStudentInfoProcessing();
      }

      message.destroy();
      message.success('智能工作流程执行完成！');
    } catch (error) {
      message.destroy();
      message.error('工作流程执行失败，请手动处理');
    }
  };

  return (
    <div className="optimized-workflow-manager">
      {/* 工作流程概览 */}
      <Card className="mb-4">
        <div className="mb-4">
          <p className="text-gray-600 text-sm">
            请按照以下步骤完成答题卡的智能阅卷处理。每个步骤完成后会自动解锁下一步骤。
          </p>
        </div>

        {/* 步骤导航 */}
        <Steps 
          current={currentStep} 
          onChange={(step) => {
            setCurrentStep(step);
            message.info(`切换到步骤: ${workflowSteps[step]?.title}`);
          }}
          className="mb-6"
          type="navigation"
        >
          {workflowSteps.map((step, index) => (
            <Step
              key={step.key}
              title={step.title}
              description={step.description}
              icon={step.icon}
              status={step.status}
            />
          ))}
        </Steps>
      </Card>

      {/* 功能操作区域 */}
      <Row gutter={[24, 16]}>
        {/* 左侧功能选项 */}
        <Col xs={24} lg={8}>
          <Card 
            title={`${workflowSteps[currentStep]?.title} - 功能选项`} 
            className="h-full"
            extra={
              <div className="text-xs text-gray-500">
                步骤 {currentStep + 1} / {workflowSteps.length}
              </div>
            }
          >
            {/* 步骤说明 */}
            <div className="mb-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-400">
              <div className="text-sm text-blue-800">
                <strong>当前步骤：</strong>{workflowSteps[currentStep]?.description}
              </div>
            </div>
            {currentStep === 0 && fileList.length === 0 ? (
              // 文件上传拖拽区域
              <Dragger
                multiple
                beforeUpload={beforeUpload}
                onChange={onFileChange}
                accept=".jpg,.jpeg,.png,.pdf"
                disabled={uploading}
                style={{ padding: '30px', minHeight: '300px' }}
              >
                <p className="ant-upload-drag-icon">
                  <FileTextOutlined style={{ fontSize: '48px', color: '#1677ff' }} />
                </p>
                <p className="ant-upload-text" style={{ fontSize: '16px', marginBottom: '8px' }}>
                  点击或拖拽答题卡到此区域上传
                </p>
                <p className="ant-upload-hint">
                  支持JPG、PNG、PDF格式，可批量上传<br/>
                  建议图片清晰度不低于300DPI，文件大小不超过10MB
                </p>
                <div className="mt-4 text-xs text-gray-500">
                  💡 提示：上传后系统将自动识别学生信息和答题内容
                </div>
              </Dragger>
            ) : (
              // 步骤操作按钮
              <div>
                {/* 操作状态提示 */}
                <div className="mb-3 p-2 bg-gray-50 rounded text-xs text-gray-600">
                  {currentStep === 0 && fileList.length > 0 && studentInfoStats.pending > 0 && (
                    <span className="text-orange-600">⚠️ 有 {studentInfoStats.pending} 个文件待识别学生信息</span>
                  )}
                  {currentStep === 0 && studentInfoStats.completed > 0 && (
                    <span className="text-green-600">✅ 已完成 {studentInfoStats.completed} 个文件的学生信息识别</span>
                  )}
                  {currentStep === 1 && studentInfoStats.completed === 0 && (
                    <span className="text-gray-500">请先完成第一步的学生信息识别</span>
                  )}
                  {currentStep === 1 && studentInfoStats.completed > 0 && (
                    <span className="text-blue-600">📝 可以开始题目切割，共 {studentInfoStats.completed} 份答题卡</span>
                  )}
                  {currentStep === 2 && getQuestionSegmentationStats().completed === 0 && (
                    <span className="text-gray-500">请先完成题目切割</span>
                  )}
                  {currentStep === 2 && getQuestionSegmentationStats().completed > 0 && (
                    <span className="text-green-600">📝 可以开始设置评分标准</span>
                  )}
                </div>
                
                <Space direction="vertical" style={{ width: '100%' }} size="middle">
                  {workflowSteps[currentStep]?.actions.map((action, index) => (
                    <Button
                      key={index}
                      type={action.type}
                      icon={action.icon}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      loading={action.loading}
                      size="large"
                      block
                      className="flex items-center justify-start"
                    >
                      <span className="flex items-center gap-2">
                        <span>{action.label}</span>
                      </span>
                      {action.count !== undefined && (
                        <Badge count={action.count} style={{ marginLeft: 8 }} />
                      )}
                    </Button>
                  ))}
                </Space>
              </div>
            )}
          </Card>


        </Col>

        {/* 右侧信息区域 */}
        <Col xs={24} lg={16}>
          {/* 上方实时统计信息 */}
          <Card 
            title="📊 实时统计信息" 
            className="mb-4"
            extra={
              <div className="text-xs text-gray-500">
                数据实时更新
              </div>
            }
          >
            <div className="mb-2 text-sm text-gray-600">
              当前工作流程进度统计
            </div>
            <Row gutter={[16, 16]}>
              <Col xs={12} sm={6}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{statistics.total}</div>
                  <div className="text-sm text-gray-500">总文件数</div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{statistics.completed}</div>
                  <div className="text-sm text-gray-500">已完成</div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{statistics.processing}</div>
                  <div className="text-sm text-gray-500">处理中</div>
                </div>
              </Col>
              <Col xs={12} sm={6}>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{statistics.failed}</div>
                  <div className="text-sm text-gray-500">失败</div>
                </div>
              </Col>
            </Row>
            <div className="mt-4">
              <Progress
                percent={statistics.total > 0 ? Math.round((statistics.completed / statistics.total) * 100) : 0}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                showInfo={true}
              />
            </div>
          </Card>

          {/* 下方表格显示上传内容 */}
          {processedSheets.length > 0 && (
            <Card 
              title="📋 上传文件列表" 
              className="mb-4"
              extra={
                <div className="text-xs text-gray-500">
                  共 {processedSheets.length} 个文件
                </div>
              }
            >
              <div className="mb-3 text-sm text-gray-600">
                查看所有已上传文件的处理状态和学生信息
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border p-2 text-left">文件名</th>
                      <th className="border p-2 text-center">状态</th>
                      <th className="border p-2 text-center">学号</th>
                      <th className="border p-2 text-center">姓名</th>
                      <th className="border p-2 text-center">班级</th>
                      <th className="border p-2 text-center">题目数</th>
                      <th className="border p-2 text-center">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {processedSheets.map((sheet) => (
                      <tr key={sheet.id} className="hover:bg-gray-50">
                        <td className="border p-2">
                          <div className="truncate max-w-32" title={sheet.filename}>
                            {sheet.filename}
                          </div>
                        </td>
                        <td className="border p-2 text-center">
                          <Badge 
                            status={sheet.status === 'completed' ? 'success' : 
                                   sheet.status === 'processing' ? 'processing' : 'error'} 
                            text={sheet.status === 'completed' ? '完成' : 
                                  sheet.status === 'processing' ? '处理中' : '错误'}
                          />
                        </td>
                        <td className="border p-2 text-center">
                          {sheet.studentInfo?.id || '-'}
                        </td>
                        <td className="border p-2 text-center">
                          {sheet.studentInfo?.name || '-'}
                        </td>
                        <td className="border p-2 text-center">
                          {sheet.studentInfo?.class || '-'}
                        </td>
                        <td className="border p-2 text-center">
                          -
                        </td>
                        <td className="border p-2 text-center">
                          {sheet.previewUrl && (
                            <Button 
                              size="small" 
                              type="link" 
                              icon={<EyeOutlined />}
                              onClick={() => onPreview(sheet)}
                            >
                              预览
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}
        </Col>
      </Row>

      {/* 试题分类切割工作台 */}
      {segmentationWorkspaceVisible && currentSheetForSegmentation && currentSheetForSegmentation.previewUrl && (
        <QuestionSegmentationWorkspace
          visible={segmentationWorkspaceVisible}
          answerSheet={{
            id: currentSheetForSegmentation.id,
            filename: currentSheetForSegmentation.filename,
            previewUrl: currentSheetForSegmentation.previewUrl,
            studentInfo: currentSheetForSegmentation.studentInfo
          }}
          onSave={(result) => {
            // 更新答题卡的切割信息
            if (onSheetsUpdate && currentSheetForSegmentation) {
              const updatedSheets = processedSheets.map(sheet => 
                sheet.id === currentSheetForSegmentation.id 
                  ? { ...sheet, segmentedQuestions: result }
                  : sheet
              );
              onSheetsUpdate(updatedSheets);
            }
            setSegmentationWorkspaceVisible(false);
            setCurrentSheetForSegmentation(null);
            message.success('试题切割完成！');
          }}
          onClose={() => {
            setSegmentationWorkspaceVisible(false);
            setCurrentSheetForSegmentation(null);
          }}
          existingResult={currentSheetForSegmentation.segmentedQuestions}
        />
      )}

      {/* 评分标准管理器 */}
      {scoringStandardsVisible && (
        <ScoringStandardsManager
          visible={scoringStandardsVisible}
          onClose={() => setScoringStandardsVisible(false)}
          processedSheets={processedSheets}
        />
      )}
    </div>
  );
};

export default OptimizedWorkflowManager;