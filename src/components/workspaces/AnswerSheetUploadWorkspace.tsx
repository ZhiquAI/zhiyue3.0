import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Breadcrumb, Button, Upload, Alert, Table, Tag, Modal, Space, Switch, Steps } from 'antd';
import { message } from '../../utils/message';
import apiClient from '../../services/api';
import { CheckCircleOutlined, RobotOutlined, LeftOutlined, RightOutlined, SettingOutlined } from '@ant-design/icons';
import { useAppContext } from '../../contexts/AppContext';
import { Exam } from '../../types/exam';
import type { UploadFile, UploadProps } from 'antd/es/upload/interface';
import QuestionSegmentationViewer from './QuestionSegmentationViewer';
import SubjectiveQuestionSegmentation from './SubjectiveQuestionSegmentation';
import ChoiceQuestionSegmentation from './ChoiceQuestionSegmentation';
import StudentInfoProcessor from './StudentInfoProcessor';
import StudentInfoRegionCutter from './StudentInfoRegionCutter';
import BatchStudentInfoProcessor from './BatchStudentInfoProcessor';

import BarcodeInfoProcessor from './BarcodeInfoProcessor';
import OptimizedWorkflowManager from './OptimizedWorkflowManager';

const { Step } = Steps;

interface AnswerSheetUploadWorkspaceProps {
  exam: Exam;
  onSmartReturn?: () => void;
}

interface QuestionRegion {
  id: string;
  questionNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  questionType: 'choice' | 'fill' | 'calculation' | 'essay' | 'analysis';
  confidence: number;
  isManuallyAdjusted: boolean;
}

interface SegmentationVersion {
  id: string;
  timestamp: string;
  regions: QuestionRegion[];
  statistics: {
    totalQuestions: number;
    subjectiveQuestions: number;
    qualityScore: number;
    issues: string[];
  };
  mode: 'ai' | 'manual' | 'hybrid';
  comment?: string;
  isActive: boolean;
}

interface ProcessedAnswerSheet {
  id: string;
  filename: string;
  size: number;
  status: 'processing' | 'completed' | 'error' | 'duplicate' | 'pending_student_info' | 'student_info_processing';
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
  choiceSegmentationResult?: {
    totalQuestions: number;
    choiceQuestions: number;
    qualityScore: number;
    issues: string[];
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
  previewUrl?: string;
  errorMessage?: string;
}

const AnswerSheetUploadWorkspace: React.FC<AnswerSheetUploadWorkspaceProps> = ({ exam, onSmartReturn }) => {
  const { setSubViewInfo, updateExamStatus } = useAppContext();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [processedSheets, setProcessedSheets] = useState<ProcessedAnswerSheet[]>([]);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [previewImage, setPreviewImage] = useState('');
  const [currentPreviewIndex, setCurrentPreviewIndex] = useState(0);
  const [selectedSheet, setSelectedSheet] = useState<ProcessedAnswerSheet | null>(null);
  const [segmentationViewerVisible, setSegmentationViewerVisible] = useState(false);
  const [selectedSegmentationData, setSelectedSegmentationData] = useState<any>(null);
  const [selectedSheetId, setSelectedSheetId] = useState<string | null>(null);



  const [studentInfoProcessorVisible, setStudentInfoProcessorVisible] = useState(false);
  const [selectedSheetForStudentInfo, setSelectedSheetForStudentInfo] = useState<ProcessedAnswerSheet | null>(null);
  const [regionCutterVisible, setRegionCutterVisible] = useState(false);
  const [selectedSheetForRegionCutter, setSelectedSheetForRegionCutter] = useState<ProcessedAnswerSheet | null>(null);

  const [abnormalSheetsVisible, setAbnormalSheetsVisible] = useState(false);
  const [barcodeInfoProcessorVisible, setBarcodeInfoProcessorVisible] = useState(false);
  
  // 新增：工作流管理状态
  const [currentWorkflowStep, setCurrentWorkflowStep] = useState(0);
  const [batchStudentInfoProcessorVisible, setBatchStudentInfoProcessorVisible] = useState(false);
  const [studentInfoProcessingMode, setStudentInfoProcessingMode] = useState<'auto' | 'manual' | 'batch'>('auto');
  const [processingConfig, setProcessingConfig] = useState({
    enableAIDetection: true,
    confidenceThreshold: 0.8,
    autoApproveHighConfidence: true,
    enableBarcodeDetection: true,
    enableOCRRecognition: true,
    enableHandwritingRecognition: true
  });


  // 键盘事件监听
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (previewVisible) {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          handlePreviousPreview();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          handleNextPreview();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [previewVisible, currentPreviewIndex, processedSheets]);

  const handleBack = () => {
    if (onSmartReturn) {
      onSmartReturn();
    } else {
      setSubViewInfo({ view: null, exam: null, source: null });
    }
  };

  // 处理异常答题卡
  const handleAbnormalSheets = () => {
    const abnormalSheets = processedSheets.filter(s => s.status === 'error');
    if (abnormalSheets.length === 0) {
      message.info('没有检测到异常答题卡');
      return;
    }
    setAbnormalSheetsVisible(true);
  };

  // 文件上传前的验证
  const beforeUpload = (file: File) => {
    const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type);
    if (!isValidType) {
      message.error('只支持 JPG、PNG、PDF 格式的文件！');
      return Upload.LIST_IGNORE; // 阻止文件被添加到列表
    }

    const isLt10M = file.size / 1024 / 1024 < 10;
    if (!isLt10M) {
      message.error('文件大小不能超过 10MB！');
      return Upload.LIST_IGNORE; // 阻止文件被添加到列表
    }

    // 检查是否已经上传过相同文件名的文件
    const existingFilenames = processedSheets.map(sheet => sheet.filename);
    if (existingFilenames.includes(file.name)) {
      message.warning(`文件 "${file.name}" 已经上传过，请勿重复上传！`);
      return false;
    }

    // 检查当前文件列表中是否已有相同文件名
    const currentFilenames = fileList.map(f => f.name);
    if (currentFilenames.includes(file.name)) {
      message.warning(`文件 "${file.name}" 已在上传列表中！`);
      return false;
    }

    return false; // 验证通过，阻止自动上传但允许添加到文件列表
  };

  // 处理文件选择
  const handleChange: UploadProps['onChange'] = (info) => {
    // 过滤掉重复的文件
    const existingFilenames = processedSheets.map(sheet => sheet.filename);
    const filteredFileList = info.fileList.filter(file => {
      const filename = file.name;
      if (existingFilenames.includes(filename)) {
        return false; // 过滤掉已上传的文件
      }
      return true;
    });
    
    // 检查文件列表内部是否有重复
    const uniqueFileList = filteredFileList.filter((file, index, arr) => {
      return arr.findIndex(f => f.name === file.name) === index;
    });
    
    setFileList(uniqueFileList);
  };

  // 批量上传答题卡
  const handleBatchUpload = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择要上传的答题卡文件');
      return;
    }

    // 检查重复文件
    const duplicateFiles: string[] = [];
    const existingFilenames = processedSheets.map(sheet => sheet.filename);
    
    fileList.forEach(file => {
      if (existingFilenames.includes(file.name)) {
        duplicateFiles.push(file.name);
      }
    });

    if (duplicateFiles.length > 0) {
      const confirmed = await new Promise<boolean>((resolve) => {
        Modal.confirm({
          title: '检测到重复文件',
          content: (
            <div>
              <p>以下文件已经上传过：</p>
              <ul className="mt-2 text-sm text-gray-600">
                {duplicateFiles.slice(0, 5).map(filename => (
                  <li key={filename}>• {filename}</li>
                ))}
                {duplicateFiles.length > 5 && <li>• 还有 {duplicateFiles.length - 5} 个文件...</li>}
              </ul>
              <p className="mt-3 text-orange-600">是否继续上传？重复文件将被跳过。</p>
            </div>
          ),
          okText: '继续上传',
          cancelText: '取消',
          onOk: () => resolve(true),
          onCancel: () => resolve(false)
        });
      });

      if (!confirmed) {
        return;
      }
    }

    setUploading(true);
    setProcessing(true);
    message.loading('正在上传和处理答题卡...', 0);

    const formData = new FormData();
    formData.append('exam_id', exam.id);
    fileList.forEach(file => {
      formData.append('files', file.originFileObj as Blob);
    });

    try {
      const response = await apiClient.post('/api/files/upload/answer-sheets', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      message.destroy();

      if (response.data.success) {
        const successResults = response.data.data?.success || [];
        const failedResults = response.data.data?.failed || [];
        
        // 过滤掉已存在的文件，避免重复显示
        const existingFileIds = processedSheets.map(sheet => sheet.id);
        const newSuccessResults = successResults.filter((result: any) => 
          !existingFileIds.includes(result.file_id)
        );
        
        // 处理成功的文件
        const newProcessedSheets = newSuccessResults.map((result: any) => ({
          id: result.file_id,
          filename: result.filename,
          size: 0, // 后端没有返回文件大小
          status: 'completed',
          errorMessage: undefined,
          previewUrl: `/api/files/view/${result.file_id}`,
          studentInfo: result.student_info,
        }));
        
        // 处理失败的文件
        const failedSheets = failedResults.map((result: any) => ({
          id: `failed_${Date.now()}_${Math.random()}`,
          filename: result.filename,
          size: 0,
          status: 'error',
          errorMessage: result.error,
          previewUrl: undefined,
          studentInfo: undefined,
        }));

        setProcessedSheets(prevSheets => [...prevSheets, ...newProcessedSheets, ...failedSheets]);
        
        const actualNewCount = newProcessedSheets.length;
        const duplicateCount = successResults.length - actualNewCount;
        const failedCount = response.data.data?.failed_count || 0;

        let messageText = '';
        if (duplicateCount > 0 && failedCount > 0) {
          messageText = `上传完成！新增 ${actualNewCount} 份，跳过重复 ${duplicateCount} 份，失败 ${failedCount} 份。`;
          message.warning(messageText);
        } else if (duplicateCount > 0) {
          messageText = `上传完成！新增 ${actualNewCount} 份，跳过重复 ${duplicateCount} 份。`;
          message.success(messageText);
        } else if (failedCount > 0) {
          messageText = `上传完成！成功 ${actualNewCount} 份，失败 ${failedCount} 份。`;
          message.warning(messageText);
        } else {
          messageText = `答题卡上传成功！共处理 ${actualNewCount} 份。`;
          message.success(messageText);
        }
        
        setFileList([]); // 清空上传列表
      } else {
        message.error(response.data.message || '答题卡上传失败，请重试');
      }
    } catch (error: any) {
      console.error("答题卡上传失败:", error);
      console.error("错误详情:", {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
        config: error.config
      });
      message.destroy();
      let errorMessage = '答题卡上传失败，请检查网络连接或联系管理员。';
      if (error.response && error.response.data && error.response.data.detail) {
        errorMessage = error.response.data.detail;
      }
      message.error(errorMessage);
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  // 重新处理失败的答题卡
  const handleRetryProcessing = async (sheetId: string) => {
    const sheet = processedSheets.find(s => s.id === sheetId);
    if (!sheet) return;

    // 更新状态为处理中
    setProcessedSheets(prev => prev.map(s => 
      s.id === sheetId ? { ...s, status: 'processing' } : s
    ));

    // 模拟重新处理
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 模拟处理结果
    const success = Math.random() > 0.3; // 70%成功率
    
    setProcessedSheets(prev => prev.map(s => {
      if (s.id === sheetId) {
        if (success) {
          const choiceQuestions = Math.floor(Math.random() * 10) + 20;
          const subjectiveQuestions = Math.floor(Math.random() * 3) + 3;
          return {
            ...s,
            status: 'completed',
            studentInfo: {
              id: '2024999',
              name: '重试学生',
              class: '八年级1班'
            },
            recognitionResult: {
              confidence: 85,
              issues: []
            },
            errorMessage: undefined
          };
        } else {
          return {
            ...s,
            status: 'error',
            errorMessage: '重新处理仍然失败，建议手动输入学生信息'
          };
        }
      }
      return s;
    }));

    if (success) {
      message.success('重新处理成功！');
    } else {
      message.error('重新处理失败，请检查文件质量');
    }
  };

  // 删除答题卡
  const handleDeleteSheet = (sheetId: string) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除这份答题卡吗？删除后无法恢复。',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setProcessedSheets(prev => prev.filter(s => s.id !== sheetId));
        message.success('答题卡已删除');
      }
    });
  };

  // 预览答题卡
  const handlePreview = (sheet: ProcessedAnswerSheet) => {
    if (sheet.previewUrl) {
      const sheetsWithPreview = processedSheets.filter(s => s.previewUrl);
      const index = sheetsWithPreview.findIndex(s => s.id === sheet.id);
      if (index !== -1) {
        setCurrentPreviewIndex(index);
        // 后端返回的 URL 可能需要拼接 origin
        const previewUrl = sheet.previewUrl.startsWith('http') ? sheet.previewUrl : `${window.location.origin}${sheet.previewUrl}`;
        setPreviewImage(previewUrl);
        setPreviewVisible(true);
      }
    } else {
      message.warning('该文件没有可用的预览。');
    }
  };

  // 切换到上一张答题卡
  const handlePreviousPreview = () => {
    const sheetsWithPreview = processedSheets.filter(s => s.previewUrl);
    if (sheetsWithPreview.length > 0) {
      const newIndex = currentPreviewIndex > 0 ? currentPreviewIndex - 1 : sheetsWithPreview.length - 1;
      setCurrentPreviewIndex(newIndex);
      setPreviewImage(sheetsWithPreview[newIndex].previewUrl!);
    }
  };

  // 切换到下一张答题卡
  const handleNextPreview = () => {
    const sheetsWithPreview = processedSheets.filter(s => s.previewUrl);
    if (sheetsWithPreview.length > 0) {
      const newIndex = currentPreviewIndex < sheetsWithPreview.length - 1 ? currentPreviewIndex + 1 : 0;
      setCurrentPreviewIndex(newIndex);
      setPreviewImage(sheetsWithPreview[newIndex].previewUrl!);
    }
  };



  // 处理空白答题卡
  const handleBlankSheets = () => {
    const blankSheets = processedSheets.filter(s => s.errorMessage?.includes('空白答题卡'));
    
    if (blankSheets.length === 0) {
      message.info('没有检测到空白答题卡');
      return;
    }

    Modal.confirm({
      title: '处理空白答题卡',
      content: (
        <div>
          <p>检测到 {blankSheets.length} 份空白答题卡：</p>
          <ul className="mt-2 text-sm text-gray-600">
            {blankSheets.slice(0, 5).map(sheet => (
              <li key={sheet.id}>• {sheet.filename}</li>
            ))}
            {blankSheets.length > 5 && <li>• 还有 {blankSheets.length - 5} 份...</li>}
          </ul>
          <p className="mt-3 text-orange-600">建议：删除这些空白答题卡，或检查原始文件是否有问题。</p>
        </div>
      ),
      okText: '删除空白答题卡',
      cancelText: '保留',
      okType: 'danger',
      onOk: () => {
        // 从列表中移除空白答题卡
        setProcessedSheets(prev => prev.filter(s => !s.errorMessage?.includes('空白答题卡')));
        setFileList(prev => prev.filter(file => {
          const fileName = file.originFileObj?.name || file.name;
          return !blankSheets.some(sheet => sheet.filename === fileName);
        }));
        
        message.success(`已删除 ${blankSheets.length} 份空白答题卡`);
      }
    });
  };







  // 完成上传，开始阅卷
  const handleStartGrading = () => {
    const completedSheets = processedSheets.filter(s => s.status === 'completed');
    
    if (completedSheets.length === 0) {
      message.warning('没有成功处理的答题卡，无法开始阅卷');
      return;
    }

    Modal.confirm({
      title: '开始阅卷确认',
      content: `即将开始阅卷，共有 ${completedSheets.length} 份答题卡。确认开始吗？`,
      okText: '开始阅卷',
      cancelText: '取消',
      onOk: () => {
        // 更新考试状态为"阅卷中"
        updateExamStatus(exam.id, '阅卷中');
        message.success('答题卡上传完成，考试已进入阅卷状态！');
        
        // 跳转到阅卷工作台
        setTimeout(() => {
          setSubViewInfo({ view: 'marking', exam: { ...exam, status: '阅卷中' } });
        }, 1500);
      }
    });
  };









  // 处理学生信息
  const handleStudentInfoProcessing = (sheet: ProcessedAnswerSheet) => {
    setSelectedSheetForStudentInfo(sheet);
    setStudentInfoProcessorVisible(true);
  };

  // 保存学生信息
  const handleSaveStudentInfo = (updatedInfo: any) => {
    if (!selectedSheetForStudentInfo) return;
    
    setProcessedSheets(prev => prev.map(sheet => {
      if (sheet.id === selectedSheetForStudentInfo.id) {
        return {
          ...sheet,
          studentInfo: {
            id: updatedInfo.student_id || '',
            name: updatedInfo.name || '',
            class: updatedInfo.class || ''
          }
        };
      }
      return sheet;
    }));
    
    setStudentInfoProcessorVisible(false);
    message.success('学生信息已更新');
  };

  // 重新识别学生信息
  const handleReprocessStudentInfo = async () => {
    if (!selectedSheetForStudentInfo) return;
    
    // 模拟重新识别过程
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 模拟识别结果
    const mockStudents = [
      { id: '2024001', name: '张三', class: '八年级1班' },
      { id: '2024002', name: '李四', class: '八年级1班' },
      { id: '2024003', name: '王五', class: '八年级2班' }
    ];
    
    const randomStudent = mockStudents[Math.floor(Math.random() * mockStudents.length)];
    
    setProcessedSheets(prev => prev.map(sheet => {
      if (sheet.id === selectedSheetForStudentInfo.id) {
        return {
          ...sheet,
          studentInfo: randomStudent,
          recognitionResult: {
            confidence: Math.floor(Math.random() * 20) + 80,
            issues: Math.random() > 0.8 ? ['图片略微模糊'] : []
          }
        };
      }
      return sheet;
    }));
  };

  // 处理学生信息区域切割
  const handleStudentInfoRegionCutting = (sheet: ProcessedAnswerSheet) => {
    setSelectedSheetForRegionCutter(sheet);
    setRegionCutterVisible(true);
  };

  // 保存区域切割结果
  const handleSaveRegionCuttingResult = (regions: any[]) => {
    if (!selectedSheetForRegionCutter) return;
    
    // 更新答题卡的区域信息
    setProcessedSheets(prev => prev.map(sheet => {
      if (sheet.id === selectedSheetForRegionCutter.id) {
        return {
          ...sheet,
          // 可以在这里添加区域信息到答题卡数据中
          recognitionResult: {
            ...sheet.recognitionResult,
            confidence: sheet.recognitionResult?.confidence || 0,
            issues: sheet.recognitionResult?.issues || []
          }
        };
      }
      return sheet;
    }));
    
    setRegionCutterVisible(false);
    message.success('学生信息区域切割结果已保存');
  };











  // 清空所有文件
  const handleClearAll = () => {
    Modal.confirm({
      title: '确认清空',
      content: '确定要清空所有已上传的答题卡吗？此操作无法撤销。',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setFileList([]);
        setProcessedSheets([]);
        message.success('已清空所有文件');
      }
    });
  };



  const completedCount = processedSheets.filter(s => s.status === 'completed').length;
  const errorCount = processedSheets.filter(s => s.status === 'error' && !s.errorMessage?.includes('空白答题卡')).length;
  const blankCount = processedSheets.filter(s => s.errorMessage?.includes('空白答题卡')).length;
  const processingCount = processedSheets.filter(s => s.status === 'processing').length;

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <Breadcrumb
          items={[
            { title: <a onClick={handleBack}>考试管理</a> },
            { title: exam.name },
            { title: '上传答题卡' }
          ]}
        />
        
        <div className="flex items-center gap-2">
          {processedSheets.length > 0 && (
            <Button onClick={handleClearAll} disabled={processing}>
              清空所有
            </Button>
          )}
          
          <Button
            type="primary"
            size="large"
            icon={<CheckCircleOutlined />}
            onClick={handleStartGrading}
            disabled={completedCount === 0}
          >
            完成上传，开始阅卷 ({completedCount})
          </Button>
        </div>
      </div>

      {/* 上传说明 */}
      <Alert
        message="答题卡上传说明"
        description={
          <div className="space-y-2">
            <p><strong>支持格式：</strong>JPG、PNG、PDF（单个文件最大10MB）</p>
            <p><strong>建议规格：</strong>清晰度300DPI以上，确保学生信息和答题内容清晰可见</p>
            <p><strong>批量上传：</strong>可一次选择多个文件，系统将自动识别学生信息</p>
            <p><strong>智能分割：</strong>系统会自动识别题目结构，按题号切分主观题，便于后续阅卷</p>
            <p><strong>质量检查：</strong>系统会自动检查答题卡质量和分割效果，标记需要人工复核的文件</p>
          </div>
        }
        type="info"
        showIcon
        className="mb-6"
      />

      {/* 隐藏原有的批量上传区域，功能已整合到工作流中 */}
      <Row gutter={[24, 24]}>
        {/* 智能处理答题卡区域 - 全宽显示 */}
        <Col xs={24}>
          <Card 
            title={
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <RobotOutlined className="text-blue-600" />
                  <span>智能处理答题卡</span>
                  {processedSheets.length > 0 && (
                    <Tag color="blue">{processedSheets.length} 份</Tag>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">智能模式</span>
                    <Switch
                      defaultChecked
                      size="small"
                      checkedChildren="开"
                      unCheckedChildren="关"
                    />
                  </div>
                  <Button
                    type="text"
                    icon={<SettingOutlined />}
                    size="small"
                    className="text-gray-500 hover:text-blue-600"
                  />
                </div>
              </div>
            }
            className="h-full"
          >
            {/* 优化后的工作流管理器 - 始终显示 */}
            <OptimizedWorkflowManager
              processedSheets={processedSheets}
              processing={processing}
              fileList={fileList}
              uploading={uploading}
              onUpload={handleBatchUpload}
              onFileChange={handleChange}
              beforeUpload={beforeUpload}
              onPreview={(sheet) => handlePreview(sheet)}
              onBarcodeInfoProcessing={() => setBarcodeInfoProcessorVisible(true)}
              onRetryProcessing={handleRetryProcessing}
              onBlankSheets={handleBlankSheets}
              onClearAll={handleClearAll}
              onStartGrading={handleStartGrading}
              onAbnormalSheets={handleAbnormalSheets}
              onSheetsUpdate={setProcessedSheets}
            />


            {/* 操作提示 */}

          </Card>
        </Col>
      </Row>

      {/* 异常答题卡处理弹窗 */}
      <Modal
        title="异常答题卡处理"
        open={abnormalSheetsVisible}
        onCancel={() => setAbnormalSheetsVisible(false)}
        footer={[
          <Button key="back" onClick={() => setAbnormalSheetsVisible(false)}>
            关闭
          </Button>,
        ]}
        width={800}
      >
        <Table
          dataSource={processedSheets.filter(s => s.status === 'error')}
          columns={[
            { title: '文件名', dataIndex: 'filename', key: 'filename' },
            { title: '错误信息', dataIndex: 'errorMessage', key: 'errorMessage' },
            {
              title: '操作',
              key: 'action',
              render: (_, record) => (
                <Space>
                  <Button onClick={() => handleRetryProcessing(record.id)}>重试</Button>
                  <Button danger onClick={() => handleDeleteSheet(record.id)}>删除</Button>
                </Space>
              ),
            },
          ]}
          rowKey="id"
          pagination={false}
        />
      </Modal>

      {/* 答题卡预览模态框 */}
      <Modal
        title={
          <div className="flex items-center justify-between">
            <span>答题卡预览</span>
            {(() => {
              const sheetsWithPreview = processedSheets.filter(s => s.previewUrl);
              const currentSheet = sheetsWithPreview[currentPreviewIndex];
              return (
                <div className="flex items-center gap-4">
                  {currentSheet && (
                    <span className="text-sm text-gray-600">
                      {currentSheet.filename} ({currentSheet.studentInfo?.name || '未识别'})
                    </span>
                  )}
                  <span className="text-sm text-gray-500">
                    {currentPreviewIndex + 1} / {sheetsWithPreview.length}
                  </span>
                </div>
              );
            })()}
          </div>
        }
        open={previewVisible}
        footer={
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-500">
              使用 ← → 键或点击按钮切换答题卡
            </div>
            <Space>
              <Button
                icon={<LeftOutlined />}
                onClick={handlePreviousPreview}
                disabled={processedSheets.filter(s => s.previewUrl).length <= 1}
              >
                上一张
              </Button>
              <Button
                icon={<RightOutlined />}
                onClick={handleNextPreview}
                disabled={processedSheets.filter(s => s.previewUrl).length <= 1}
              >
                下一张
              </Button>
            </Space>
          </div>
        }
        onCancel={() => setPreviewVisible(false)}
        width={900}
        centered
      >
        <div className="text-center relative">
          <img
            alt="答题卡预览"
            style={{ width: '100%', maxHeight: '600px', objectFit: 'contain' }}
            src={previewImage}
          />
          
          {/* 左右切换按钮覆盖层 */}
          {processedSheets.filter(s => s.previewUrl).length > 1 && (
            <>
              <Button
                type="text"
                icon={<LeftOutlined />}
                size="large"
                className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                onClick={handlePreviousPreview}
                style={{ zIndex: 10 }}
              />
              <Button
                type="text"
                icon={<RightOutlined />}
                size="large"
                className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white hover:bg-opacity-70"
                onClick={handleNextPreview}
                style={{ zIndex: 10 }}
              />
            </>
          )}
        </div>
      </Modal>

      {/* 题目分割查看器 */}
      {selectedSegmentationData && selectedSheetId && (
        <QuestionSegmentationViewer
          visible={segmentationViewerVisible}
          onClose={() => {
            setSegmentationViewerVisible(false);
            setSelectedSegmentationData(null);
            setSelectedSheetId(null);
          }}
          data={selectedSegmentationData}
          sheetInfo={{
            filename: processedSheets.find(s => s.id === selectedSheetId)?.filename || '',
            studentName: processedSheets.find(s => s.id === selectedSheetId)?.studentInfo?.name,
            studentId: processedSheets.find(s => s.id === selectedSheetId)?.studentInfo?.id
          }}
        />
      )}







      {/* 学生信息处理组件 */}
      {selectedSheetForStudentInfo && (
        <StudentInfoProcessor
          visible={studentInfoProcessorVisible}
          onClose={() => {
            setStudentInfoProcessorVisible(false);
            setSelectedSheetForStudentInfo(null);
          }}
          imageUrl={selectedSheetForStudentInfo.previewUrl || ''}
          studentInfo={{
            student_id: selectedSheetForStudentInfo.studentInfo?.id || '',
            name: selectedSheetForStudentInfo.studentInfo?.name || '',
            class: selectedSheetForStudentInfo.studentInfo?.class || '',
            exam_number: '',
            paper_type: '',
            barcode_info: {
              detected: false,
              results: [],
              confidence: 0
            }
          }}
          recognitionResult={{
            confidence: selectedSheetForStudentInfo.recognitionResult?.confidence || 0,
            issues: selectedSheetForStudentInfo.recognitionResult?.issues || [],
            regions: {
              student_info_region: {
                x: 5,
                y: 5,
                width: 40,
                height: 15
              },
              barcode_region: {
                x: 55,
                y: 5,
                width: 40,
                height: 15
              }
            }
          }}
          onSave={handleSaveStudentInfo}
          onReprocess={handleReprocessStudentInfo}
        />
      )}
      
      {/* 学生信息区域切割组件 */}
      {selectedSheetForRegionCutter && (
        <StudentInfoRegionCutter
          visible={regionCutterVisible}
          onClose={() => {
            setRegionCutterVisible(false);
            setSelectedSheetForRegionCutter(null);
          }}
          imageUrl={selectedSheetForRegionCutter.previewUrl || ''}
          sheetInfo={{
            filename: selectedSheetForRegionCutter.filename,
            studentName: selectedSheetForRegionCutter.studentInfo?.name,
            studentId: selectedSheetForRegionCutter.studentInfo?.id
          }}
          onSave={handleSaveRegionCuttingResult}
        />
      )}
      

      
      {/* 条形码信息处理组件 */}
      <BarcodeInfoProcessor
        visible={barcodeInfoProcessorVisible}
        onClose={() => setBarcodeInfoProcessorVisible(false)}
        answerSheets={processedSheets
          .filter(sheet => sheet.status === 'completed')
          .map(sheet => ({
            id: sheet.id,
            filename: sheet.filename,
            previewUrl: sheet.previewUrl || '',
            studentInfo: sheet.studentInfo ? {
              id: sheet.studentInfo.id,
              name: sheet.studentInfo.name,
              class: sheet.studentInfo.class
            } : undefined
          }))}
        onUpdateSheet={(sheetId, updates) => {
          console.log('条形码识别结果:', sheetId, updates);
          // 这里可以添加更新答题卡信息的逻辑
        }}
      />
    </div>
  );
};

export default AnswerSheetUploadWorkspace;