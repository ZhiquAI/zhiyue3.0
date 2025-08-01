import React, { useState, useRef, useEffect } from 'react';
import {
  Modal,
  Card,
  Button,
  Row,
  Col,
  Space,
  Tag,
  Divider,
  Slider,
  Input,
  InputNumber,
  Select,
  Radio,
  Alert,
  message,
  Tooltip,
  Progress
} from 'antd';
import {
  ScissorOutlined,
  EditOutlined,
  ZoomInOutlined,
  ZoomOutOutlined,
  UndoOutlined,
  RedoOutlined,
  SaveOutlined,
  DeleteOutlined,
  EyeOutlined,
  SettingOutlined
} from '@ant-design/icons';

export interface QuestionRegion {
  id: string;
  questionNumber: number;
  x: number;
  y: number;
  width: number;
  height: number;
  questionType: 'choice' | 'fill' | 'calculation' | 'essay' | 'analysis';
  optionCount?: number; // 选择题选项数量
  optionLayout?: 'horizontal' | 'vertical'; // 选择题选项布局
}

interface QuestionSegmentationProps {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
  sheetInfo: {
    filename: string;
    studentName?: string;
    studentId?: string;
  };
  onSave: (regions: QuestionRegion[]) => void;
  initialRegions?: QuestionRegion[];
}

const QuestionSegmentation: React.FC<QuestionSegmentationProps> = ({
  visible,
  onClose,
  imageUrl,
  sheetInfo,
  onSave,
  initialRegions = []
}) => {
  // 状态管理
  const [regions, setRegions] = useState<QuestionRegion[]>(initialRegions);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{x: number, y: number} | null>(null);
  const [scale, setScale] = useState(1);
  const [currentQuestionType, setCurrentQuestionType] = useState<'choice' | 'fill' | 'calculation' | 'essay' | 'analysis'>('choice');
  const [currentOptionCount, setCurrentOptionCount] = useState(4);
  const [currentOptionLayout, setCurrentOptionLayout] = useState<'horizontal' | 'vertical'>('vertical');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({width: 0, height: 0});
  const [mode, setMode] = useState<'manual' | 'batch'>('manual');
  const [batchConfig, setBatchConfig] = useState({
    rows: 5,
    cols: 1,
    startX: 50,
    startY: 100,
    regionWidth: 400,
    regionHeight: 80,
    horizontalSpacing: 20,
    verticalSpacing: 20
  });
  
  // 历史记录
  const [history, setHistory] = useState<QuestionRegion[][]>([initialRegions]);
  const [historyIndex, setHistoryIndex] = useState(0);
  
  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // 题目类型配置
  const questionTypeConfig = {
    choice: { name: '选择题', color: '#1890ff', icon: '○' },
    fill: { name: '填空题', color: '#52c41a', icon: '□' },
    calculation: { name: '计算题', color: '#fa8c16', icon: '∑' },
    essay: { name: '论述题', color: '#722ed1', icon: '✎' },
    analysis: { name: '分析题', color: '#eb2f96', icon: '◊' }
  };

  // 图片加载处理
  useEffect(() => {
    if (visible && imageUrl) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({width: img.naturalWidth, height: img.naturalHeight});
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
    }
  }, [visible, imageUrl]);

  // 画布绘制
  useEffect(() => {
    if (imageLoaded && canvasRef.current) {
      drawCanvas();
    }
  }, [imageLoaded, scale, regions, selectedRegion]);

  // 绘制画布
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // 设置画布尺寸
      canvas.width = imageDimensions.width * scale;
      canvas.height = imageDimensions.height * scale;
      
      // 清空并绘制图片
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      
      // 绘制所有区域
      regions.forEach(region => {
        drawRegion(ctx, region);
      });
    };
    img.src = imageUrl;
  };

  // 绘制题目区域
  const drawRegion = (ctx: CanvasRenderingContext2D, region: QuestionRegion) => {
    const x = region.x * scale;
    const y = region.y * scale;
    const width = region.width * scale;
    const height = region.height * scale;
    
    const isSelected = selectedRegion === region.id;
    const config = questionTypeConfig[region.questionType];
    
    // 绘制边框
    ctx.strokeStyle = isSelected ? '#ff4d4f' : config.color;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.strokeRect(x, y, width, height);
    
    // 绘制半透明背景
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
    
    // 选择题选项布局指示
    if (region.questionType === 'choice' && region.optionCount && region.optionLayout) {
      ctx.strokeStyle = config.color;
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);
      
      if (region.optionLayout === 'horizontal') {
        const optionWidth = width / region.optionCount;
        for (let i = 1; i < region.optionCount; i++) {
          ctx.beginPath();
          ctx.moveTo(x + optionWidth * i, y);
          ctx.lineTo(x + optionWidth * i, y + height);
          ctx.stroke();
        }
      } else {
        const optionHeight = height / region.optionCount;
        for (let i = 1; i < region.optionCount; i++) {
          ctx.beginPath();
          ctx.moveTo(x, y + optionHeight * i);
          ctx.lineTo(x + width, y + optionHeight * i);
          ctx.stroke();
        }
      }
      
      ctx.setLineDash([]);
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
    if (!isDrawing || !drawStart) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    // 实时绘制预览
    drawCanvas();
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const width = x - drawStart.x;
      const height = y - drawStart.y;
      
      ctx.strokeStyle = questionTypeConfig[currentQuestionType].color;
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(drawStart.x * scale, drawStart.y * scale, width * scale, height * scale);
      ctx.setLineDash([]);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !drawStart) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    const width = Math.abs(x - drawStart.x);
    const height = Math.abs(y - drawStart.y);
    
    // 只有当区域足够大时才创建
    if (width > 20 && height > 20) {
      const newRegion: QuestionRegion = {
        id: `region_${Date.now()}`,
        questionNumber: regions.length + 1,
        x: Math.min(drawStart.x, x),
        y: Math.min(drawStart.y, y),
        width,
        height,
        questionType: currentQuestionType,
        ...(currentQuestionType === 'choice' && {
          optionCount: currentOptionCount,
          optionLayout: currentOptionLayout
        })
      };
      
      const newRegions = [...regions, newRegion];
      setRegions(newRegions);
      addToHistory(newRegions);
      setSelectedRegion(newRegion.id);
    }
    
    setIsDrawing(false);
    setDrawStart(null);
  };

  // 批量切割
  const performBatchSegmentation = () => {
    const newRegions: QuestionRegion[] = [];
    
    for (let row = 0; row < batchConfig.rows; row++) {
      for (let col = 0; col < batchConfig.cols; col++) {
        const questionNumber = row * batchConfig.cols + col + 1;
        const x = batchConfig.startX + col * (batchConfig.regionWidth + batchConfig.horizontalSpacing);
        const y = batchConfig.startY + row * (batchConfig.regionHeight + batchConfig.verticalSpacing);
        
        newRegions.push({
          id: `batch_${questionNumber}`,
          questionNumber,
          x,
          y,
          width: batchConfig.regionWidth,
          height: batchConfig.regionHeight,
          questionType: currentQuestionType,
          ...(currentQuestionType === 'choice' && {
            optionCount: currentOptionCount,
            optionLayout: currentOptionLayout
          })
        });
      }
    }
    
    setRegions(newRegions);
    addToHistory(newRegions);
    message.success(`批量创建了 ${newRegions.length} 个题目区域`);
  };

  // 删除选中区域
  const deleteSelectedRegion = () => {
    if (!selectedRegion) return;
    
    const newRegions = regions.filter(r => r.id !== selectedRegion);
    // 重新编号
    newRegions.forEach((region, index) => {
      region.questionNumber = index + 1;
    });
    
    setRegions(newRegions);
    addToHistory(newRegions);
    setSelectedRegion(null);
  };

  // 历史记录管理
  const addToHistory = (newRegions: QuestionRegion[]) => {
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

  // 保存结果
  const handleSave = () => {
    if (regions.length === 0) {
      message.warning('请先标注题目区域');
      return;
    }
    
    onSave(regions);
    message.success('题目切割结果已保存');
    onClose();
  };

  // 清空所有区域
  const clearAllRegions = () => {
    setRegions([]);
    addToHistory([]);
    setSelectedRegion(null);
  };

  return (
    <Modal
      title={`试题分类切割 - ${sheetInfo.filename}`}
      open={visible}
      onCancel={onClose}
      width="90%"
      style={{ top: 20 }}
      footer={[
        <Button key="clear" onClick={clearAllRegions} disabled={regions.length === 0}>
          清空所有
        </Button>,
        <Button key="cancel" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" onClick={handleSave} disabled={regions.length === 0}>
          保存切割结果
        </Button>
      ]}
    >
      <Row gutter={16} style={{ height: '70vh' }}>
        {/* 左侧工具栏 */}
        <Col span={6}>
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            {/* 切割模式选择 */}
            <Card size="small" title="切割模式">
              <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} style={{ width: '100%' }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Radio value="manual">手动标注</Radio>
                  <Radio value="batch">批量切割</Radio>
                </Space>
              </Radio.Group>
            </Card>

            {/* 题目类型设置 */}
            <Card size="small" title="题目类型">
              <Select
                value={currentQuestionType}
                onChange={setCurrentQuestionType}
                style={{ width: '100%', marginBottom: 8 }}
              >
                {Object.entries(questionTypeConfig).map(([key, config]) => (
                  <Select.Option key={key} value={key}>
                    <Space>
                      <span style={{ color: config.color }}>{config.icon}</span>
                      {config.name}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
              
              {currentQuestionType === 'choice' && (
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <span>选项数量：</span>
                    <InputNumber
                      min={2}
                      max={8}
                      value={currentOptionCount}
                      onChange={(value) => setCurrentOptionCount(value || 4)}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <span>选项布局：</span>
                    <Select
                      value={currentOptionLayout}
                      onChange={setCurrentOptionLayout}
                      style={{ width: '100%' }}
                    >
                      <Select.Option value="vertical">垂直排列</Select.Option>
                      <Select.Option value="horizontal">水平排列</Select.Option>
                    </Select>
                  </div>
                </Space>
              )}
            </Card>

            {/* 批量切割配置 */}
            {mode === 'batch' && (
              <Card size="small" title="批量切割配置">
                <Space direction="vertical" style={{ width: '100%' }} size="small">
                  <div>
                    <span>行数：</span>
                    <InputNumber
                      min={1}
                      max={20}
                      value={batchConfig.rows}
                      onChange={(value) => setBatchConfig(prev => ({ ...prev, rows: value || 1 }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <span>列数：</span>
                    <InputNumber
                      min={1}
                      max={5}
                      value={batchConfig.cols}
                      onChange={(value) => setBatchConfig(prev => ({ ...prev, cols: value || 1 }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <span>起始X：</span>
                    <InputNumber
                      min={0}
                      value={batchConfig.startX}
                      onChange={(value) => setBatchConfig(prev => ({ ...prev, startX: value || 0 }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <span>起始Y：</span>
                    <InputNumber
                      min={0}
                      value={batchConfig.startY}
                      onChange={(value) => setBatchConfig(prev => ({ ...prev, startY: value || 0 }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <span>区域宽度：</span>
                    <InputNumber
                      min={50}
                      value={batchConfig.regionWidth}
                      onChange={(value) => setBatchConfig(prev => ({ ...prev, regionWidth: value || 100 }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <span>区域高度：</span>
                    <InputNumber
                      min={30}
                      value={batchConfig.regionHeight}
                      onChange={(value) => setBatchConfig(prev => ({ ...prev, regionHeight: value || 50 }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <Button type="primary" block onClick={performBatchSegmentation}>
                    执行批量切割
                  </Button>
                </Space>
              </Card>
            )}

            {/* 工具栏 */}
            <Card size="small" title="工具">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <Row gutter={8}>
                  <Col span={12}>
                    <Tooltip title="撤销">
                      <Button 
                        icon={<UndoOutlined />} 
                        onClick={undo}
                        disabled={historyIndex <= 0}
                        block
                      />
                    </Tooltip>
                  </Col>
                  <Col span={12}>
                    <Tooltip title="重做">
                      <Button 
                        icon={<RedoOutlined />} 
                        onClick={redo}
                        disabled={historyIndex >= history.length - 1}
                        block
                      />
                    </Tooltip>
                  </Col>
                </Row>
                
                <Button 
                  icon={<DeleteOutlined />} 
                  onClick={deleteSelectedRegion}
                  disabled={!selectedRegion}
                  block
                  danger
                >
                  删除选中区域
                </Button>
                
                <div>
                  <span>缩放：</span>
                  <Slider
                    min={0.1}
                    max={2}
                    step={0.1}
                    value={scale}
                    onChange={setScale}
                    tooltip={{ formatter: (value) => `${Math.round((value || 0) * 100)}%` }}
                  />
                </div>
              </Space>
            </Card>

            {/* 统计信息 */}
            <Card size="small" title="统计信息">
              <Space direction="vertical" style={{ width: '100%' }} size="small">
                <div>总题目数：<Tag color="blue">{regions.length}</Tag></div>
                {Object.entries(questionTypeConfig).map(([type, config]) => {
                  const count = regions.filter(r => r.questionType === type).length;
                  return count > 0 ? (
                    <div key={type}>
                      {config.name}：<Tag color={config.color}>{count}</Tag>
                    </div>
                  ) : null;
                })}
              </Space>
            </Card>
          </Space>
        </Col>

        {/* 右侧画布区域 */}
        <Col span={18}>
          <Card 
            size="small" 
            title="试卷图片" 
            style={{ height: '100%' }}
            bodyStyle={{ padding: 8, height: 'calc(100% - 40px)', overflow: 'auto' }}
          >
            <div ref={containerRef} style={{ position: 'relative', height: '100%' }}>
              {imageLoaded ? (
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  style={{
                    border: '1px solid #d9d9d9',
                    cursor: mode === 'manual' ? 'crosshair' : 'default',
                    display: 'block',
                    margin: '0 auto'
                  }}
                />
              ) : (
                <div style={{ textAlign: 'center', padding: 50 }}>
                  <Progress type="circle" percent={50} status="active" />
                  <div style={{ marginTop: 16 }}>正在加载图片...</div>
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>

      {/* 使用说明 */}
      <Alert
        message="使用说明"
        description={
          <div>
            <p><strong>手动标注：</strong>在图片上拖拽鼠标框选题目区域</p>
            <p><strong>批量切割：</strong>设置参数后一次性创建多个规则排列的题目区域</p>
            <p><strong>选择题：</strong>可设置选项数量和布局方式</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Modal>
  );
};

export default QuestionSegmentation;