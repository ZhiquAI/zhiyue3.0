import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Modal,
  Button,
  Card,
  Select,
  Input,
  InputNumber,
  Alert,
  Tag,
  Space,
  Divider,
  Slider,
  message,
  Progress,
  Tooltip,
  Radio
} from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  UndoOutlined,
  RedoOutlined,
  DeleteOutlined,
  SaveOutlined,
  EyeOutlined,
  SettingOutlined,
  RobotOutlined,
  EditOutlined
} from '@ant-design/icons';

interface ChoiceQuestionRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  questionNumber: number;
  questionType: 'single_choice' | 'multiple_choice';
  optionCount: number;
  optionLayout: 'horizontal' | 'vertical';
  confidence?: number;
  isAIGenerated?: boolean;
}

interface ChoiceQuestionSegmentationProps {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
  onSave: (regions: ChoiceQuestionRegion[]) => void;
  initialRegions?: ChoiceQuestionRegion[];
  sheetInfo?: {
    filename: string;
    studentInfo?: any;
  };
}

const ChoiceQuestionSegmentation: React.FC<ChoiceQuestionSegmentationProps> = ({
  visible,
  onClose,
  imageUrl,
  onSave,
  initialRegions = [],
  sheetInfo
}) => {
  // 状态管理
  const [regions, setRegions] = useState<ChoiceQuestionRegion[]>(initialRegions);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const [mode, setMode] = useState<'manual' | 'ai'>('manual');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [currentRegionType, setCurrentRegionType] = useState<'single_choice' | 'multiple_choice'>('single_choice');
  const [currentOptionCount, setCurrentOptionCount] = useState(4);
  const [currentOptionLayout, setCurrentOptionLayout] = useState<'horizontal' | 'vertical'>('vertical');
  const [aiSensitivity, setAiSensitivity] = useState(0.7);
  const [isAIProcessing, setIsAIProcessing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 });
  
  // 历史记录
  const [history, setHistory] = useState<ChoiceQuestionRegion[][]>([initialRegions]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 选择题类型配置
  const questionTypeConfig = {
    single_choice: {
      name: '单选题',
      color: '#1890ff',
      icon: '○',
      description: '只能选择一个答案'
    },
    multiple_choice: {
      name: '多选题', 
      color: '#52c41a',
      icon: '☐',
      description: '可以选择多个答案'
    }
  };

  // 图片加载处理
  useEffect(() => {
    if (visible && imageUrl) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({ width: img.naturalWidth, height: img.naturalHeight });
        setImageLoaded(true);
        // 自适应缩放
        if (containerRef.current) {
          const containerWidth = containerRef.current.clientWidth - 40;
          const containerHeight = containerRef.current.clientHeight - 40;
          const scaleX = containerWidth / img.naturalWidth;
          const scaleY = containerHeight / img.naturalHeight;
          setScale(Math.min(scaleX, scaleY, 1));
        }
      };
      img.src = imageUrl;
      imageRef.current = img;
    }
  }, [visible, imageUrl]);

  // 画布绘制
  useEffect(() => {
    if (imageLoaded && canvasRef.current && imageRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // 设置画布尺寸
      const scaledWidth = imageDimensions.width * scale;
      const scaledHeight = imageDimensions.height * scale;
      canvas.width = scaledWidth;
      canvas.height = scaledHeight;

      // 清空画布
      ctx.clearRect(0, 0, scaledWidth, scaledHeight);

      // 绘制图片
      ctx.drawImage(imageRef.current, 0, 0, scaledWidth, scaledHeight);

      // 绘制所有区域
      regions.forEach(region => {
        drawRegion(ctx, region);
      });
    }
  }, [imageLoaded, scale, regions, selectedRegion, imageDimensions]);

  // 绘制选择题区域
  const drawRegion = (ctx: CanvasRenderingContext2D, region: ChoiceQuestionRegion) => {
    const x = region.x * scale;
    const y = region.y * scale;
    const width = region.width * scale;
    const height = region.height * scale;

    const isSelected = selectedRegion === region.id;
    const config = questionTypeConfig[region.questionType];

    // 绘制区域边框
    ctx.strokeStyle = isSelected ? '#ff4d4f' : config.color;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.setLineDash(region.isAIGenerated ? [5, 5] : []);
    ctx.strokeRect(x, y, width, height);

    // 绘制区域背景
    ctx.fillStyle = isSelected ? 'rgba(255, 77, 79, 0.1)' : `${config.color}20`;
    ctx.fillRect(x, y, width, height);

    // 绘制题号标签
    const labelText = `${region.questionNumber}. ${config.name}`;
    const labelWidth = ctx.measureText(labelText).width + 16;
    const labelHeight = 24;
    
    ctx.fillStyle = config.color;
    ctx.fillRect(x, y - labelHeight, labelWidth, labelHeight);
    
    ctx.fillStyle = 'white';
    ctx.font = '12px Arial';
    ctx.fillText(labelText, x + 8, y - 8);

    // 绘制选项布局指示
    if (region.optionLayout === 'horizontal') {
      // 水平布局 - 绘制水平分割线
      const optionWidth = width / region.optionCount;
      for (let i = 1; i < region.optionCount; i++) {
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x + optionWidth * i, y);
        ctx.lineTo(x + optionWidth * i, y + height);
        ctx.stroke();
      }
    } else {
      // 垂直布局 - 绘制垂直分割线
      const optionHeight = height / region.optionCount;
      for (let i = 1; i < region.optionCount; i++) {
        ctx.strokeStyle = config.color;
        ctx.lineWidth = 1;
        ctx.setLineDash([2, 2]);
        ctx.beginPath();
        ctx.moveTo(x, y + optionHeight * i);
        ctx.lineTo(x + width, y + optionHeight * i);
        ctx.stroke();
      }
    }

    // 重置线条样式
    ctx.setLineDash([]);

    // 绘制置信度指示器（AI生成的区域）
    if (region.isAIGenerated && region.confidence !== undefined) {
      const confidenceColor = region.confidence > 0.8 ? '#52c41a' : region.confidence > 0.6 ? '#faad14' : '#ff4d4f';
      ctx.fillStyle = confidenceColor;
      ctx.fillRect(x + width - 20, y, 20, 6);
      
      ctx.fillStyle = 'white';
      ctx.font = '10px Arial';
      ctx.fillText(`${Math.round(region.confidence * 100)}%`, x + width - 18, y + 4);
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
      setDrawStart({ x, y });
      setSelectedRegion(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart || mode !== 'manual') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const currentX = (e.clientX - rect.left) / scale;
    const currentY = (e.clientY - rect.top) / scale;

    // 创建临时区域用于预览
    const tempRegion: ChoiceQuestionRegion = {
      id: 'temp',
      x: Math.min(drawStart.x, currentX),
      y: Math.min(drawStart.y, currentY),
      width: Math.abs(currentX - drawStart.x),
      height: Math.abs(currentY - drawStart.y),
      questionNumber: regions.length + 1,
      questionType: currentRegionType,
      optionCount: currentOptionCount,
      optionLayout: currentOptionLayout
    };

    // 重新绘制画布包含临时区域
    if (canvasRef.current && imageRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        const scaledWidth = imageDimensions.width * scale;
        const scaledHeight = imageDimensions.height * scale;
        ctx.clearRect(0, 0, scaledWidth, scaledHeight);
        ctx.drawImage(imageRef.current, 0, 0, scaledWidth, scaledHeight);
        
        regions.forEach(region => drawRegion(ctx, region));
        drawRegion(ctx, tempRegion);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart || mode !== 'manual') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const endX = (e.clientX - rect.left) / scale;
    const endY = (e.clientY - rect.top) / scale;

    const width = Math.abs(endX - drawStart.x);
    const height = Math.abs(endY - drawStart.y);

    // 检查区域大小是否合理
    if (width < 20 || height < 20) {
      message.warning('区域太小，请重新绘制');
      setIsDrawing(false);
      setDrawStart(null);
      return;
    }

    // 创建新区域
    const newRegion: ChoiceQuestionRegion = {
      id: `region_${Date.now()}`,
      x: Math.min(drawStart.x, endX),
      y: Math.min(drawStart.y, endY),
      width,
      height,
      questionNumber: regions.length + 1,
      questionType: currentRegionType,
      optionCount: currentOptionCount,
      optionLayout: currentOptionLayout
    };

    const newRegions = [...regions, newRegion];
    setRegions(newRegions);
    setSelectedRegion(newRegion.id);
    
    // 添加到历史记录
    addToHistory(newRegions);

    setIsDrawing(false);
    setDrawStart(null);
  };

  // AI智能识别选择题
  const handleAISegmentation = async () => {
    setIsAIProcessing(true);
    try {
      // 模拟AI识别过程
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 模拟AI识别结果
      const aiRegions: ChoiceQuestionRegion[] = [
        {
          id: 'ai_1',
          x: 50,
          y: 100,
          width: 400,
          height: 120,
          questionNumber: 1,
          questionType: 'single_choice',
          optionCount: 4,
          optionLayout: 'vertical',
          confidence: 0.92,
          isAIGenerated: true
        },
        {
          id: 'ai_2',
          x: 50,
          y: 250,
          width: 400,
          height: 100,
          questionNumber: 2,
          questionType: 'single_choice',
          optionCount: 4,
          optionLayout: 'vertical',
          confidence: 0.88,
          isAIGenerated: true
        },
        {
          id: 'ai_3',
          x: 50,
          y: 380,
          width: 500,
          height: 80,
          questionNumber: 3,
          questionType: 'multiple_choice',
          optionCount: 5,
          optionLayout: 'horizontal',
          confidence: 0.75,
          isAIGenerated: true
        }
      ];
      
      setRegions(aiRegions);
      addToHistory(aiRegions);
      message.success(`AI识别完成，检测到 ${aiRegions.length} 道选择题`);
    } catch (error) {
      message.error('AI识别失败，请尝试手动切割');
    } finally {
      setIsAIProcessing(false);
    }
  };

  // 历史记录管理
  const addToHistory = (newRegions: ChoiceQuestionRegion[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push([...newRegions]);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setRegions([...history[historyIndex - 1]]);
      setSelectedRegion(null);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setRegions([...history[historyIndex + 1]]);
      setSelectedRegion(null);
    }
  };

  // 删除选中区域
  const deleteSelectedRegion = () => {
    if (!selectedRegion) return;
    
    const newRegions = regions.filter(r => r.id !== selectedRegion);
    setRegions(newRegions);
    setSelectedRegion(null);
    addToHistory(newRegions);
  };

  // 更新区域属性
  const updateRegionProperty = (regionId: string, property: keyof ChoiceQuestionRegion, value: any) => {
    const newRegions = regions.map(region => 
      region.id === regionId ? { ...region, [property]: value } : region
    );
    setRegions(newRegions);
    addToHistory(newRegions);
  };

  // 保存切割结果
  const handleSave = () => {
    if (regions.length === 0) {
      message.warning('请至少切割一个选择题区域');
      return;
    }

    // 验证题号连续性
    const questionNumbers = regions.map(r => r.questionNumber).sort((a, b) => a - b);
    for (let i = 0; i < questionNumbers.length - 1; i++) {
      if (questionNumbers[i + 1] - questionNumbers[i] !== 1) {
        message.warning('题号不连续，请检查并调整');
        return;
      }
    }

    onSave(regions);
    message.success('选择题切割结果已保存');
  };

  // 获取选中区域数据
  const selectedRegionData = selectedRegion ? regions.find(r => r.id === selectedRegion) : null;

  // 质量检查统计
  const qualityStats = {
    total: regions.length,
    manual: regions.filter(r => !r.isAIGenerated).length,
    ai: regions.filter(r => r.isAIGenerated).length,
    highConfidence: regions.filter(r => r.confidence && r.confidence > 0.8).length,
    lowConfidence: regions.filter(r => r.confidence && r.confidence < 0.6).length
  };

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <EditOutlined className="text-blue-600" />
          <span>选择题手动切割</span>
          {sheetInfo && (
            <Tag color="blue">{sheetInfo.filename}</Tag>
          )}
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={1400}
      height={800}
      footer={[
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>
          保存切割结果
        </Button>
      ]}
      className="choice-segmentation-modal"
    >
      <div className="flex h-[700px] gap-4">
        {/* 左侧工具栏 */}
        <div className="w-80 space-y-4 overflow-y-auto">
          {/* 推荐工作流程 */}
          <Card title="推荐工作流程" size="small">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                <span>选择切割模式（手动/AI）</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                <span>绘制选择题区域</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
                <span>设置题型和选项布局</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">4</span>
                <span>检查并保存结果</span>
              </div>
              <div className="text-xs text-gray-600 mt-2">
                💡 选择题切割专注于答案区域的准确识别
              </div>
            </div>
          </Card>

          {/* 切割模式 */}
          <Card title="切割模式" size="small">
            <Radio.Group 
              value={mode} 
              onChange={(e) => setMode(e.target.value)}
              className="w-full"
            >
              <div className="space-y-3">
                <Radio value="manual" className="w-full">
                  <div>
                    <div className="font-medium">手动精确切割</div>
                    <div className="text-xs text-gray-600">人工绘制选择题区域</div>
                  </div>
                </Radio>
                <Radio value="ai" className="w-full">
                  <div>
                    <div className="font-medium">AI智能识别</div>
                    <div className="text-xs text-gray-600">自动检测选择题区域</div>
                  </div>
                </Radio>
              </div>
            </Radio.Group>
          </Card>

          {/* 手动切割设置 */}
          {mode === 'manual' && (
            <Card title="手动切割设置" size="small">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">题型</label>
                  <Select
                    value={currentRegionType}
                    onChange={setCurrentRegionType}
                    className="w-full"
                    size="small"
                  >
                    <Select.Option value="single_choice">
                      <span className="flex items-center gap-2">
                        <span style={{ color: questionTypeConfig.single_choice.color }}>
                          {questionTypeConfig.single_choice.icon}
                        </span>
                        {questionTypeConfig.single_choice.name}
                      </span>
                    </Select.Option>
                    <Select.Option value="multiple_choice">
                      <span className="flex items-center gap-2">
                        <span style={{ color: questionTypeConfig.multiple_choice.color }}>
                          {questionTypeConfig.multiple_choice.icon}
                        </span>
                        {questionTypeConfig.multiple_choice.name}
                      </span>
                    </Select.Option>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">选项数量</label>
                  <InputNumber
                    value={currentOptionCount}
                    onChange={(value) => setCurrentOptionCount(value || 4)}
                    min={2}
                    max={8}
                    className="w-full"
                    size="small"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">选项布局</label>
                  <Select
                    value={currentOptionLayout}
                    onChange={setCurrentOptionLayout}
                    className="w-full"
                    size="small"
                  >
                    <Select.Option value="vertical">垂直排列</Select.Option>
                    <Select.Option value="horizontal">水平排列</Select.Option>
                  </Select>
                </div>

                <Alert
                  message="操作提示"
                  description="在答题卡上拖拽鼠标绘制选择题区域，确保包含完整的题目和选项"
                  type="info"
                  showIcon
                />
              </div>
            </Card>
          )}

          {/* AI识别设置 */}
          {mode === 'ai' && (
            <Card title="AI识别设置" size="small">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">识别敏感度</label>
                  <Slider
                    value={aiSensitivity}
                    onChange={setAiSensitivity}
                    min={0.3}
                    max={0.9}
                    step={0.1}
                    marks={{
                      0.3: '低',
                      0.6: '中',
                      0.9: '高'
                    }}
                  />
                  <div className="text-xs text-gray-600">
                    敏感度越高，识别越精确但可能遗漏部分题目
                  </div>
                </div>
                
                <Button 
                  type="primary" 
                  icon={<RobotOutlined />}
                  onClick={handleAISegmentation}
                  loading={isAIProcessing}
                  block
                >
                  {isAIProcessing ? 'AI识别中...' : '执行AI识别'}
                </Button>
                
                <Alert
                  message="AI识别说明"
                  description="AI会自动检测选择题区域，识别后可手动调整"
                  type="info"
                  showIcon
                />
              </div>
            </Card>
          )}

          {/* 操作工具 */}
          <Card title="操作工具" size="small">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Tooltip title="撤销">
                  <Button 
                    icon={<UndoOutlined />} 
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title="重做">
                  <Button 
                    icon={<RedoOutlined />} 
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title="放大">
                  <Button 
                    icon={<ZoomInOutlined />} 
                    onClick={() => setScale(Math.min(3, scale + 0.2))}
                    size="small"
                  />
                </Tooltip>
                <Tooltip title="缩小">
                  <Button 
                    icon={<ZoomOutOutlined />} 
                    onClick={() => setScale(Math.max(0.2, scale - 0.2))}
                    size="small"
                  />
                </Tooltip>
              </div>
              
              {selectedRegion && (
                <Button 
                  danger
                  icon={<DeleteOutlined />}
                  onClick={deleteSelectedRegion}
                  size="small"
                  block
                >
                  删除选中区域
                </Button>
              )}
            </div>
          </Card>

          {/* 区域属性编辑 */}
          {selectedRegionData && (
            <Card title="区域属性" size="small">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">题号</label>
                  <InputNumber
                    value={selectedRegionData.questionNumber}
                    onChange={(value) => updateRegionProperty(selectedRegion!, 'questionNumber', value || 1)}
                    min={1}
                    className="w-full"
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
                    <Select.Option value="single_choice">
                      <span className="flex items-center gap-2">
                        <span style={{ color: questionTypeConfig.single_choice.color }}>
                          {questionTypeConfig.single_choice.icon}
                        </span>
                        {questionTypeConfig.single_choice.name}
                      </span>
                    </Select.Option>
                    <Select.Option value="multiple_choice">
                      <span className="flex items-center gap-2">
                        <span style={{ color: questionTypeConfig.multiple_choice.color }}>
                          {questionTypeConfig.multiple_choice.icon}
                        </span>
                        {questionTypeConfig.multiple_choice.name}
                      </span>
                    </Select.Option>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">选项数量</label>
                  <InputNumber
                    value={selectedRegionData.optionCount}
                    onChange={(value) => updateRegionProperty(selectedRegion!, 'optionCount', value || 4)}
                    min={2}
                    max={8}
                    className="w-full"
                    size="small"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium">选项布局</label>
                  <Select
                    value={selectedRegionData.optionLayout}
                    onChange={(value) => updateRegionProperty(selectedRegion!, 'optionLayout', value)}
                    className="w-full"
                    size="small"
                  >
                    <Select.Option value="vertical">垂直排列</Select.Option>
                    <Select.Option value="horizontal">水平排列</Select.Option>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">位置</label>
                  <div className="grid grid-cols-2 gap-2">
                    <InputNumber
                      value={Math.round(selectedRegionData.x)}
                      onChange={(value) => updateRegionProperty(selectedRegion!, 'x', value || 0)}
                      placeholder="X"
                      size="small"
                    />
                    <InputNumber
                      value={Math.round(selectedRegionData.y)}
                      onChange={(value) => updateRegionProperty(selectedRegion!, 'y', value || 0)}
                      placeholder="Y"
                      size="small"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium">尺寸</label>
                  <div className="grid grid-cols-2 gap-2">
                    <InputNumber
                      value={Math.round(selectedRegionData.width)}
                      onChange={(value) => updateRegionProperty(selectedRegion!, 'width', value || 100)}
                      placeholder="宽度"
                      size="small"
                    />
                    <InputNumber
                      value={Math.round(selectedRegionData.height)}
                      onChange={(value) => updateRegionProperty(selectedRegion!, 'height', value || 100)}
                      placeholder="高度"
                      size="small"
                    />
                  </div>
                </div>
              </div>
            </Card>
          )}

          {/* 切割质量检查 */}
          <Card title="切割质量检查" size="small">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">总题数：</span>
                <span className="font-medium">{qualityStats.total}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">手动切割：</span>
                <span className="font-medium text-blue-600">{qualityStats.manual}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">AI识别：</span>
                <span className="font-medium text-green-600">{qualityStats.ai}</span>
              </div>
              {qualityStats.ai > 0 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">高置信度：</span>
                    <span className="font-medium text-green-600">{qualityStats.highConfidence}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">低置信度：</span>
                    <span className="font-medium text-orange-600">{qualityStats.lowConfidence}</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* 右侧画布区域 */}
        <div className="flex-1 border rounded-lg overflow-hidden" ref={containerRef}>
          <div className="h-full flex items-center justify-center bg-gray-50">
            {imageLoaded ? (
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                className="cursor-crosshair border"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <div className="text-center">
                <div className="text-gray-400 mb-2">加载图片中...</div>
                <Progress percent={50} showInfo={false} />
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default ChoiceQuestionSegmentation;