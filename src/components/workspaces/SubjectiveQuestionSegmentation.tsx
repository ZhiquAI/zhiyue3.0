import React, { useState, useRef, useEffect } from 'react';
import { 
  Modal, Card, Row, Col, Button, Space, Tag, Divider, 
  Slider, Switch, Tooltip, message, Spin, Progress,
  Select, Input, Form, Radio
} from 'antd';
import { 
  ScissorOutlined, RobotOutlined, EditOutlined, 
  ZoomInOutlined, ZoomOutOutlined, UndoOutlined,
  RedoOutlined, SaveOutlined, EyeOutlined,
  SettingOutlined, CheckCircleOutlined
} from '@ant-design/icons';

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

interface SegmentationConfig {
  sensitivity: number; // 切割敏感度 1-10
  minQuestionHeight: number; // 最小题目高度
  marginTolerance: number; // 边距容错
  autoDetectType: boolean; // 自动检测题型
  preserveOriginal: boolean; // 保留原始切割
}

interface SubjectiveQuestionSegmentationProps {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
  sheetInfo: {
    filename: string;
    studentName?: string;
    studentId?: string;
  };
  onSave: (regions: QuestionRegion[]) => void;
}

const SubjectiveQuestionSegmentation: React.FC<SubjectiveQuestionSegmentationProps> = ({
  visible,
  onClose,
  imageUrl,
  sheetInfo,
  onSave
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 状态管理
  const [regions, setRegions] = useState<QuestionRegion[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{x: number, y: number} | null>(null);
  const [scale, setScale] = useState(1);
  const [mode, setMode] = useState<'ai' | 'manual'>('ai');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [config, setConfig] = useState<SegmentationConfig>({
    sensitivity: 7,
    minQuestionHeight: 50,
    marginTolerance: 10,
    autoDetectType: true,
    preserveOriginal: false
  });
  const [history, setHistory] = useState<QuestionRegion[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({width: 0, height: 0});

  // 加载图片和自适应缩放
  useEffect(() => {
    if (visible && imageUrl) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({width: img.width, height: img.height});
        
        // 智能初始缩放 - 根据容器大小自动调整
        const container = containerRef.current;
        if (container) {
          const containerWidth = container.clientWidth - 40; // 减去padding
          const containerHeight = container.clientHeight - 40;
          
          const scaleX = containerWidth / img.width;
          const scaleY = containerHeight / img.height;
          const optimalScale = Math.min(scaleX, scaleY, 1); // 不超过原始大小
          
          setScale(Math.max(optimalScale, 0.1)); // 最小缩放0.1
        }
        
        setImageLoaded(true);
        drawCanvas();
      };
      img.src = imageUrl;
    }
  }, [visible, imageUrl]);

  // 响应式布局 - 监听窗口大小变化
  useEffect(() => {
    const handleResize = () => {
      if (imageLoaded && containerRef.current) {
        const container = containerRef.current;
        const containerWidth = container.clientWidth - 40;
        const containerHeight = container.clientHeight - 40;
        
        const scaleX = containerWidth / imageDimensions.width;
        const scaleY = containerHeight / imageDimensions.height;
        const optimalScale = Math.min(scaleX, scaleY, 1);
        
        setScale(Math.max(optimalScale, 0.1));
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [imageLoaded, imageDimensions]);

  // 绘制画布
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // 设置画布尺寸
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      
      // 绘制图片
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // 绘制切割区域
      regions.forEach(region => {
        drawRegion(ctx, region);
      });
    };
    img.src = imageUrl;
  };

  // 绘制切割区域
  const drawRegion = (ctx: CanvasRenderingContext2D, region: QuestionRegion) => {
    const x = region.x * scale;
    const y = region.y * scale;
    const width = region.width * scale;
    const height = region.height * scale;
    
    // 设置样式
    const isSelected = selectedRegion === region.id;
    const isManual = region.isManuallyAdjusted;
    
    ctx.strokeStyle = isSelected ? '#1890ff' : (isManual ? '#52c41a' : '#ff4d4f');
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.setLineDash(isManual ? [] : [5, 5]);
    
    // 绘制边框
    ctx.strokeRect(x, y, width, height);
    
    // 绘制半透明背景
    ctx.fillStyle = isSelected ? 'rgba(24, 144, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(x, y, width, height);
    
    // 绘制题号标签
    ctx.fillStyle = isSelected ? '#1890ff' : (isManual ? '#52c41a' : '#ff4d4f');
    ctx.font = `${14 * scale}px Arial`;
    ctx.fillText(`第${region.questionNumber}题`, x + 5, y + 20 * scale);
    
    // 绘制置信度
    if (!isManual) {
      ctx.font = `${12 * scale}px Arial`;
      ctx.fillText(`${Math.round(region.confidence * 100)}%`, x + 5, y + height - 5);
    }
    
    ctx.setLineDash([]);
  };

  // AI智能切割
  const performAISegmentation = async () => {
    setIsProcessing(true);
    setProgress(0);
    
    try {
      // 调用后端OCR和题目分割API
      message.loading('正在进行OCR识别和智能切题...', 0);
      setProgress(20);
      
      const response = await fetch(`/api/ocr/process?answer_sheet_id=${encodeURIComponent(sheetInfo.filename)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }
      
      setProgress(60);
      const result = await response.json();
      
      if (result.status !== 'completed') {
        throw new Error(result.error_message || 'OCR处理失败');
      }
      
      setProgress(80);
      
      // 从OCR结果中获取分割结果
      const segmentedQuestions = result.recognized_text?.segmented_questions || 
                                result.recognized_text?.questions || 
                                [];
      
      setProgress(90);
      
      // 转换后端分割结果为前端格式
      const aiRegions: QuestionRegion[] = convertBackendSegmentsToRegions(segmentedQuestions);
      
      if (aiRegions.length === 0) {
        message.warning('未检测到主观题，请尝试手动切割');
        // 如果没有检测到题目，生成一个示例区域供用户参考
        const fallbackRegions = generateMockAIRegions();
        saveToHistory(fallbackRegions);
        setRegions(fallbackRegions);
      } else {
        // 保存到历史记录
        saveToHistory(aiRegions);
        setRegions(aiRegions);
        message.success(`AI智能切割完成！检测到 ${aiRegions.length} 道主观题`);
      }
      
      setProgress(100);
      
    } catch (error: any) {
      console.error('AI切割失败:', error);
      message.error(`AI切割失败: ${error?.message || '未知错误'}，请尝试手动切割`);
      
      // 失败时提供模拟数据作为备选
      const fallbackRegions = generateMockAIRegions();
      saveToHistory(fallbackRegions);
      setRegions(fallbackRegions);
    } finally {
      setIsProcessing(false);
      setProgress(0);
      message.destroy();
    }
  };
  
  // 转换后端分割结果为前端格式
  const convertBackendSegmentsToRegions = (segments: any[]): QuestionRegion[] => {
    return segments
      .filter(segment => segment.question_type !== 'choice') // 只保留非选择题
      .map((segment, index) => ({
        id: `ai-region-${segment.question_number || index}`,
        questionNumber: parseInt(segment.question_number) || (index + 1),
        x: segment.region?.x || Math.round(imageDimensions.width * 0.05),
        y: segment.region?.y || Math.round(imageDimensions.height * (0.15 + index * 0.2)),
        width: segment.region?.width || Math.round(imageDimensions.width * 0.90),
        height: segment.region?.height || Math.round(imageDimensions.height * 0.15),
        questionType: mapQuestionType(segment.question_type),
        confidence: segment.confidence || 0.8,
        isManuallyAdjusted: false
      }));
  };
  
  // 映射题目类型
  const mapQuestionType = (backendType: string): QuestionRegion['questionType'] => {
    const typeMap: Record<string, QuestionRegion['questionType']> = {
      'short_answer': 'essay',
      'essay': 'analysis',
      'calculation': 'calculation',
      'fill_blank': 'fill'
    };
    return typeMap[backendType] || 'essay';
  };

  // 生成模拟AI切割结果
  const generateMockAIRegions = (): QuestionRegion[] => {
    const mockRegions: QuestionRegion[] = [];
    const imageWidth = imageDimensions.width;
    const imageHeight = imageDimensions.height;
    
    // 模拟检测到的主观题区域
    const subjectiveQuestions = [
      { number: 14, type: 'calculation' as const, y: 0.15, height: 0.12 },
      { number: 15, type: 'essay' as const, y: 0.35, height: 0.18 },
      { number: 16, type: 'analysis' as const, y: 0.60, height: 0.25 },
      { number: 17, type: 'essay' as const, y: 0.88, height: 0.10 }
    ];
    
    subjectiveQuestions.forEach((q, index) => {
      mockRegions.push({
        id: `ai-region-${index}`,
        questionNumber: q.number,
        x: Math.round(imageWidth * 0.05),
        y: Math.round(imageHeight * q.y),
        width: Math.round(imageWidth * 0.90),
        height: Math.round(imageHeight * q.height),
        questionType: q.type,
        confidence: 0.85 + Math.random() * 0.1,
        isManuallyAdjusted: false
      });
    });
    
    return mockRegions;
  };

  // 保存到历史记录
  const saveToHistory = (newRegions: QuestionRegion[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newRegions]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // 撤销操作
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setRegions([...history[historyIndex - 1]]);
    }
  };

  // 重做操作
  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setRegions([...history[historyIndex + 1]]);
    }
  };

  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (mode !== 'manual') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    // 检查是否点击了现有区域
    const clickedRegion = regions.find(region => 
      x >= region.x && x <= region.x + region.width &&
      y >= region.y && y <= region.y + region.height
    );
    
    if (clickedRegion) {
      setSelectedRegion(clickedRegion.id);
    } else {
      // 开始绘制新区域
      setIsDrawing(true);
      setDrawStart({x, y});
      setSelectedRegion(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart || mode !== 'manual') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    // 实时绘制选择框
    drawCanvas();
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.strokeStyle = '#1890ff';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(
        drawStart.x * scale, 
        drawStart.y * scale, 
        (x - drawStart.x) * scale, 
        (y - drawStart.y) * scale
      );
      ctx.setLineDash([]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart || mode !== 'manual') return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    // 创建新区域
    const width = Math.abs(x - drawStart.x);
    const height = Math.abs(y - drawStart.y);
    
    if (width > 20 && height > 20) {
      const newRegion: QuestionRegion = {
        id: `manual-region-${Date.now()}`,
        questionNumber: regions.length + 1,
        x: Math.min(drawStart.x, x),
        y: Math.min(drawStart.y, y),
        width,
        height,
        questionType: 'essay',
        confidence: 1.0,
        isManuallyAdjusted: true
      };
      
      const newRegions = [...regions, newRegion];
      saveToHistory(newRegions);
      setRegions(newRegions);
      setSelectedRegion(newRegion.id);
    }
    
    setIsDrawing(false);
    setDrawStart(null);
  };

  // 删除选中区域
  const deleteSelectedRegion = () => {
    if (selectedRegion) {
      const newRegions = regions.filter(r => r.id !== selectedRegion);
      saveToHistory(newRegions);
      setRegions(newRegions);
      setSelectedRegion(null);
    }
  };

  // 更新区域属性
  const updateRegionProperty = (id: string, property: keyof QuestionRegion, value: any) => {
    const newRegions = regions.map(region => 
      region.id === id ? { ...region, [property]: value, isManuallyAdjusted: true } : region
    );
    setRegions(newRegions);
  };

  // 保存切割结果
  const handleSave = () => {
    if (regions.length === 0) {
      message.warning('请先进行题目切割');
      return;
    }
    
    onSave(regions);
    message.success('切割结果已保存');
    onClose();
  };

  // 重新绘制画布
  useEffect(() => {
    if (imageLoaded) {
      drawCanvas();
    }
  }, [regions, selectedRegion, scale, imageLoaded]);

  const selectedRegionData = selectedRegion ? regions.find(r => r.id === selectedRegion) : null;

  return (
    <Modal
      title={
        <div className="flex items-center gap-3">
          <ScissorOutlined className="text-blue-600" />
          <div>
            <div className="text-lg font-semibold">主观题智能切割</div>
            <div className="text-sm text-gray-500 font-normal">
              {sheetInfo.filename} {sheetInfo.studentName && `· ${sheetInfo.studentName}`}
            </div>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width="90vw"
      style={{ top: 20, maxWidth: 1400 }}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>
          保存切割结果
        </Button>
      ]}
      className="subjective-segmentation-modal"
    >
      <div className="flex flex-col lg:flex-row gap-4 h-[80vh]">
        {/* 左侧工具栏 */}
        <div className="w-full lg:w-80 flex flex-col gap-4 lg:max-h-full overflow-y-auto">
          {/* 推荐工作流程 */}
          <Card size="small" title="推荐工作流程" className="border-blue-200 bg-blue-50">
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                <span>手动精确切割题目区域</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                <span>AI智能评分与分析</span>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                💡 人工切割确保边界准确，AI专注内容评分
              </div>
            </div>
          </Card>

          {/* 切割模式 */}
          <Card size="small" title="切割工具">
            <Radio.Group 
              value={mode} 
              onChange={(e) => setMode(e.target.value)}
              className="w-full"
            >
              <Space direction="vertical" className="w-full">
                <Radio value="manual">
                  <div className="flex items-center gap-2">
                    <EditOutlined className="text-green-600" />
                    <span className="font-medium">手动精确切割</span>
                    <Tag color="green">推荐</Tag>
                  </div>
                  <div className="text-xs text-gray-500 ml-6">拖拽绘制题目区域，确保边界准确</div>
                </Radio>
                <Radio value="ai">
                  <div className="flex items-center gap-2">
                    <RobotOutlined className="text-blue-600" />
                    <span>AI辅助识别</span>
                    <Tag color="blue">辅助</Tag>
                  </div>
                  <div className="text-xs text-gray-500 ml-6">快速生成初始区域，需人工调整</div>
                </Radio>
              </Space>
            </Radio.Group>
          </Card>

          {/* 手动切割指导 */}
          {mode === 'manual' && (
            <Card size="small" title="手动切割指导" className="border-green-200 bg-green-50">
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <span className="text-green-600">📝</span>
                  <div>
                    <div className="font-medium">操作方法：</div>
                    <div className="text-gray-600">在答题卡上拖拽鼠标绘制题目区域</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">🎯</span>
                  <div>
                    <div className="font-medium">精确切割：</div>
                    <div className="text-gray-600">确保包含完整答题内容，避免遗漏</div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✏️</span>
                  <div>
                    <div className="font-medium">属性设置：</div>
                    <div className="text-gray-600">点击区域可编辑题号和题型</div>
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* AI辅助识别 */}
          {mode === 'ai' && (
            <Card size="small" title="AI辅助识别" className="border-orange-200 bg-orange-50">
              <div className="space-y-4">
                <div className="text-sm text-orange-700 bg-orange-100 p-2 rounded">
                  ⚠️ AI识别结果仅供参考，建议人工检查和调整所有区域边界
                </div>
                
                <div>
                  <label className="text-sm font-medium">识别敏感度</label>
                  <Slider
                    min={1}
                    max={10}
                    value={config.sensitivity}
                    onChange={(value) => setConfig({...config, sensitivity: value})}
                    marks={{ 1: '低', 5: '中', 10: '高' }}
                  />
                </div>
                
                <Button 
                  type="default" 
                  icon={<RobotOutlined />} 
                  onClick={performAISegmentation}
                  loading={isProcessing}
                  className="w-full"
                >
                  生成初始区域
                </Button>
                
                <div className="text-xs text-gray-500">
                  💡 生成后请逐一检查和调整每个区域的边界
                </div>
                
                {isProcessing && (
                  <Progress percent={Math.round(progress)} size="small" />
                )}
              </div>
            </Card>
          )}

          {/* 操作工具 */}
          <Card size="small" title="操作工具">
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button 
                  icon={<UndoOutlined />} 
                  onClick={undo}
                  disabled={historyIndex <= 0}
                  size="small"
                >
                  撤销
                </Button>
                <Button 
                  icon={<RedoOutlined />} 
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  size="small"
                >
                  重做
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  icon={<ZoomOutOutlined />} 
                  onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                  size="small"
                />
                <span className="text-sm">{Math.round(scale * 100)}%</span>
                <Button 
                  icon={<ZoomInOutlined />} 
                  onClick={() => setScale(Math.min(2, scale + 0.1))}
                  size="small"
                />
              </div>
              
              {selectedRegion && (
                <Button 
                  danger 
                  onClick={deleteSelectedRegion}
                  size="small"
                  className="w-full"
                >
                  删除选中区域
                </Button>
              )}
            </div>
          </Card>

          {/* 区域属性编辑 */}
          {selectedRegionData && (
            <Card size="small" title={`第${selectedRegionData.questionNumber}题属性`}>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">题号</label>
                  <Input
                    type="number"
                    value={selectedRegionData.questionNumber}
                    onChange={(e) => updateRegionProperty(selectedRegion!, 'questionNumber', parseInt(e.target.value))}
                    size="small"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">题型</label>
                  <Select
                    value={selectedRegionData.questionType}
                    onChange={(value) => updateRegionProperty(selectedRegion!, 'questionType', value)}
                    size="small"
                    className="w-full"
                  >
                    <Select.Option value="calculation">计算题</Select.Option>
                    <Select.Option value="essay">简答题</Select.Option>
                    <Select.Option value="analysis">分析题</Select.Option>
                  </Select>
                </div>
                
                <div className="text-xs text-gray-500">
                  位置: ({selectedRegionData.x}, {selectedRegionData.y})<br/>
                  尺寸: {selectedRegionData.width} × {selectedRegionData.height}
                </div>
              </div>
            </Card>
          )}

          {/* 切割质量检查 */}
          <Card size="small" title="质量检查">
            <div className="space-y-3">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>总题数:</span>
                  <span className="font-semibold">{regions.length}</span>
                </div>
                <div className="flex justify-between">
                  <span>手动精确:</span>
                  <span className="text-green-600 font-medium">{regions.filter(r => r.isManuallyAdjusted).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>待调整:</span>
                  <span className="text-orange-600">{regions.filter(r => !r.isManuallyAdjusted).length}</span>
                </div>
              </div>
              
              {regions.filter(r => !r.isManuallyAdjusted).length > 0 && (
                <div className="text-xs text-orange-700 bg-orange-100 p-2 rounded">
                  ⚠️ 建议检查所有橙色标记的区域，确保边界准确
                </div>
              )}
              
              {regions.length > 0 && regions.every(r => r.isManuallyAdjusted) && (
                <div className="text-xs text-green-700 bg-green-100 p-2 rounded flex items-center gap-1">
                  <CheckCircleOutlined />
                  所有区域已人工确认，质量优秀
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* 右侧画布区域 */}
        <div className="flex-1 border rounded bg-gray-50 relative min-h-[400px] lg:min-h-0" ref={containerRef}>
          <div className="h-full overflow-auto p-2 lg:p-4">
            {imageLoaded ? (
              <div className="flex items-center justify-center min-h-full">
                <canvas
                   ref={canvasRef}
                   onMouseDown={handleMouseDown}
                   onMouseMove={handleMouseMove}
                   onMouseUp={handleMouseUp}
                   className="cursor-crosshair border border-gray-300 shadow-sm touch-none"
                  style={{ 
                    display: 'block',
                    maxWidth: '100%',
                    maxHeight: '100%',
                    objectFit: 'contain'
                  }}
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <Spin size="large" tip="加载图片中..." />
              </div>
            )}
          </div>
          
          {/* 画布工具栏 */}
          {imageLoaded && (
            <div className="absolute bottom-2 right-2 lg:bottom-4 lg:right-4 bg-white rounded-lg shadow-lg p-1 lg:p-2 flex items-center gap-1 lg:gap-2">
              <Button 
                icon={<ZoomOutOutlined />} 
                onClick={() => setScale(Math.max(0.1, scale - 0.1))}
                size="small"
                type="text"
              />
              <span className="text-xs px-1 lg:px-2">{Math.round(scale * 100)}%</span>
              <Button 
                icon={<ZoomInOutlined />} 
                onClick={() => setScale(Math.min(3, scale + 0.1))}
                size="small"
                type="text"
              />
              <Divider type="vertical" className="hidden lg:block" />
              <Button 
                icon={<EyeOutlined />} 
                onClick={() => {
                  const container = containerRef.current;
                  if (container) {
                    const containerWidth = container.clientWidth - 40;
                    const containerHeight = container.clientHeight - 40;
                    const scaleX = containerWidth / imageDimensions.width;
                    const scaleY = containerHeight / imageDimensions.height;
                    const fitScale = Math.min(scaleX, scaleY, 1);
                    setScale(Math.max(fitScale, 0.1));
                  }
                }}
                size="small"
                type="text"
                title="适应窗口"
                className="hidden lg:inline-flex"
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default SubjectiveQuestionSegmentation;