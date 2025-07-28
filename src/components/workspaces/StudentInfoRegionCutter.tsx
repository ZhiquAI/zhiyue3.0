import React, { useState, useRef, useEffect } from 'react';
import {
  Modal, Card, Row, Col, Button, Space, Tag, Divider,
  Slider, Switch, Tooltip, message, Spin, Progress,
  Select, Input, Form, Radio, Alert
} from 'antd';
import {
  ScissorOutlined, UserOutlined, BarcodeOutlined,
  ZoomInOutlined, ZoomOutOutlined, UndoOutlined,
  RedoOutlined, SaveOutlined, EyeOutlined,
  SettingOutlined, CheckCircleOutlined, IdcardOutlined
} from '@ant-design/icons';

interface StudentInfoRegion {
  id: string;
  type: 'student_info' | 'barcode' | 'exam_number' | 'name_field' | 'class_field';
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  confidence: number;
  isManuallyAdjusted: boolean;
}

interface StudentInfoRegionCutterProps {
  visible: boolean;
  onClose: () => void;
  imageUrl: string;
  sheetInfo: {
    filename: string;
    studentName?: string;
    studentId?: string;
  };
  existingRegions?: StudentInfoRegion[];
  onSave: (regions: StudentInfoRegion[]) => void;
}

const StudentInfoRegionCutter: React.FC<StudentInfoRegionCutterProps> = ({
  visible,
  onClose,
  imageUrl,
  sheetInfo,
  existingRegions = [],
  onSave
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 状态管理
  const [regions, setRegions] = useState<StudentInfoRegion[]>(existingRegions);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{x: number, y: number} | null>(null);
  const [scale, setScale] = useState(1);
  const [currentRegionType, setCurrentRegionType] = useState<StudentInfoRegion['type']>('student_info');
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState<StudentInfoRegion[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageDimensions, setImageDimensions] = useState({width: 0, height: 0});

  // 区域类型配置
  const regionTypeConfig = {
    student_info: { label: '学生信息区', color: '#1890ff', icon: <UserOutlined /> },
    barcode: { label: '条形码区', color: '#52c41a', icon: <BarcodeOutlined /> },
    exam_number: { label: '准考证号', color: '#fa8c16', icon: <IdcardOutlined /> },
    name_field: { label: '姓名栏', color: '#eb2f96', icon: <UserOutlined /> },
    class_field: { label: '班级栏', color: '#722ed1', icon: <UserOutlined /> }
  };

  // 加载图片和自适应缩放
  useEffect(() => {
    if (visible && imageUrl) {
      const img = new Image();
      img.onload = () => {
        setImageDimensions({width: img.width, height: img.height});
        
        // 智能初始缩放
        const container = containerRef.current;
        if (container) {
          const containerWidth = container.clientWidth - 40;
          const containerHeight = container.clientHeight - 40;
          
          const scaleX = containerWidth / img.width;
          const scaleY = containerHeight / img.height;
          const optimalScale = Math.min(scaleX, scaleY, 1);
          
          setScale(Math.max(optimalScale, 0.1));
        }
        
        setImageLoaded(true);
        drawCanvas();
      };
      img.src = imageUrl;
    }
  }, [visible, imageUrl]);

  // 初始化历史记录
  useEffect(() => {
    if (visible && existingRegions.length > 0) {
      setHistory([existingRegions]);
      setHistoryIndex(0);
    }
  }, [visible, existingRegions]);

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
  const drawRegion = (ctx: CanvasRenderingContext2D, region: StudentInfoRegion) => {
    const x = region.x * scale;
    const y = region.y * scale;
    const width = region.width * scale;
    const height = region.height * scale;
    
    const isSelected = selectedRegion === region.id;
    const config = regionTypeConfig[region.type];
    
    // 设置样式
    ctx.strokeStyle = isSelected ? '#ff4d4f' : config.color;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.setLineDash(region.isManuallyAdjusted ? [] : [5, 5]);
    
    // 绘制边框
    ctx.strokeRect(x, y, width, height);
    
    // 绘制半透明背景
    ctx.fillStyle = isSelected ? 'rgba(255, 77, 79, 0.1)' : `${config.color}20`;
    ctx.fillRect(x, y, width, height);
    
    // 绘制标签
    ctx.fillStyle = isSelected ? '#ff4d4f' : config.color;
    ctx.font = `${14 * scale}px Arial`;
    ctx.fillText(region.label, x + 5, y + 20 * scale);
    
    // 绘制置信度（AI识别的区域）
    if (!region.isManuallyAdjusted) {
      ctx.font = `${12 * scale}px Arial`;
      ctx.fillText(`${Math.round(region.confidence * 100)}%`, x + 5, y + height - 5);
    }
    
    ctx.setLineDash([]);
  };



  // 保存到历史记录
  const saveToHistory = (newRegions: StudentInfoRegion[]) => {
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
    
    // 实时绘制选择框
    drawCanvas();
    
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const config = regionTypeConfig[currentRegionType];
      ctx.strokeStyle = config.color;
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
    if (!isDrawing || !drawStart) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;
    
    // 创建新区域
    const width = Math.abs(x - drawStart.x);
    const height = Math.abs(y - drawStart.y);
    
    if (width > 20 && height > 20) {
      const config = regionTypeConfig[currentRegionType];
      const newRegion: StudentInfoRegion = {
        id: `manual-${currentRegionType}-${Date.now()}`,
        type: currentRegionType,
        x: Math.min(drawStart.x, x),
        y: Math.min(drawStart.y, y),
        width,
        height,
        label: config.label,
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
  const updateRegionProperty = (id: string, property: keyof StudentInfoRegion, value: any) => {
    const newRegions = regions.map(region => 
      region.id === id ? { ...region, [property]: value, isManuallyAdjusted: true } : region
    );
    setRegions(newRegions);
  };

  // 保存切割结果
  const handleSave = () => {
    if (regions.length === 0) {
      message.warning('请先切割学生信息区域');
      return;
    }
    
    // 检查必要区域
    const hasStudentInfo = regions.some(r => r.type === 'student_info');
    if (!hasStudentInfo) {
      message.warning('请至少切割一个学生信息区域');
      return;
    }
    
    onSave(regions);
    message.success('学生信息区域切割结果已保存');
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
          <UserOutlined className="text-blue-600" />
          <div>
            <div className="text-lg font-semibold">学生信息区域切割</div>
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
      className="student-info-region-cutter-modal"
    >
      <div className="flex flex-col lg:flex-row gap-4 h-[80vh]">
        {/* 左侧工具栏 */}
        <div className="w-full lg:w-80 flex flex-col gap-4 lg:max-h-full overflow-y-auto">
          {/* 人工切割模式 */}
          <Card title="切割模式" size="small">
            <div className="space-y-3">
              <Alert
                message="人工切割模式"
                description="请手动绘制学生信息区域，确保准确包含所需信息"
                type="info"
                showIcon
              />
            </div>
          </Card>

          {/* 手动切割工具 */}
          <Card title="手动切割" size="small">
            <div className="space-y-3">
              <div>
                <div className="text-sm font-medium mb-2">选择区域类型：</div>
                <Select
                  value={currentRegionType}
                  onChange={setCurrentRegionType}
                  style={{ width: '100%' }}
                  size="small"
                >
                  {Object.entries(regionTypeConfig).map(([key, config]) => (
                    <Select.Option key={key} value={key}>
                      <div className="flex items-center gap-2">
                        {config.icon}
                        <span>{config.label}</span>
                      </div>
                    </Select.Option>
                  ))}
                </Select>
              </div>
              
              <div className="text-xs text-gray-600">
                在答题卡上拖拽鼠标绘制 {regionTypeConfig[currentRegionType].label}
              </div>
            </div>
          </Card>

          {/* 操作工具 */}
          <Card title="操作工具" size="small">
            <div className="space-y-2">
              <div className="flex gap-2">
                <Button 
                  size="small" 
                  icon={<UndoOutlined />}
                  onClick={undo}
                  disabled={historyIndex <= 0}
                >
                  撤销
                </Button>
                <Button 
                  size="small" 
                  icon={<RedoOutlined />}
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                >
                  重做
                </Button>
              </div>
              
              {selectedRegion && (
                <Button 
                  size="small" 
                  danger
                  block
                  onClick={deleteSelectedRegion}
                >
                  删除选中区域
                </Button>
              )}
            </div>
          </Card>

          {/* 缩放控制 */}
          <Card title="视图控制" size="small">
            <div className="space-y-3">
              <div>
                <div className="text-sm mb-2">缩放比例: {Math.round(scale * 100)}%</div>
                <Slider
                  min={0.1}
                  max={3}
                  step={0.1}
                  value={scale}
                  onChange={setScale}
                />
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="small" 
                  icon={<ZoomOutOutlined />}
                  onClick={() => setScale(Math.max(0.1, scale - 0.2))}
                >
                  缩小
                </Button>
                <Button 
                  size="small" 
                  icon={<ZoomInOutlined />}
                  onClick={() => setScale(Math.min(3, scale + 0.2))}
                >
                  放大
                </Button>
              </div>
            </div>
          </Card>

          {/* 区域列表 */}
          <Card title={`已切割区域 (${regions.length})`} size="small">
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {regions.map(region => {
                const config = regionTypeConfig[region.type];
                const isSelected = selectedRegion === region.id;
                
                return (
                  <div 
                    key={region.id}
                    className={`p-2 border rounded cursor-pointer transition-colors ${
                      isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedRegion(region.id)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {config.icon}
                      <span className="text-sm font-medium">{region.label}</span>
                      <Tag color="green">手动</Tag>
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      位置: ({Math.round(region.x)}, {Math.round(region.y)})
                      尺寸: {Math.round(region.width)} × {Math.round(region.height)}
                    </div>
                  </div>
                );
              })}
              
              {regions.length === 0 && (
                <div className="text-center text-gray-400 py-4">
                  暂无切割区域
                </div>
              )}
            </div>
          </Card>

          {/* 选中区域属性 */}
          {selectedRegionData && (
            <Card title="区域属性" size="small">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">区域类型</label>
                  <Select
                    value={selectedRegionData.type}
                    onChange={(value) => updateRegionProperty(selectedRegion!, 'type', value)}
                    style={{ width: '100%' }}
                    size="small"
                  >
                    {Object.entries(regionTypeConfig).map(([key, config]) => (
                      <Select.Option key={key} value={key}>
                        <div className="flex items-center gap-2">
                          {config.icon}
                          <span>{config.label}</span>
                        </div>
                      </Select.Option>
                    ))}
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium">标签名称</label>
                  <Input
                    value={selectedRegionData.label}
                    onChange={(e) => updateRegionProperty(selectedRegion!, 'label', e.target.value)}
                    size="small"
                  />
                </div>
              </div>
            </Card>
          )}
        </div>

        {/* 右侧画布区域 */}
        <div className="flex-1 flex flex-col" ref={containerRef}>
          <div className="flex-1 border rounded-lg overflow-hidden bg-gray-50 relative">
            {!imageLoaded ? (
              <div className="flex items-center justify-center h-full">
                <Spin size="large" tip="加载图片中..." />
              </div>
            ) : (
              <div className="w-full h-full overflow-auto">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="cursor-crosshair"
                  style={{
                    display: 'block',
                    margin: '0 auto',
                    maxWidth: '100%',
                    maxHeight: '100%'
                  }}
                />
              </div>
            )}
          </div>
          
          {/* 底部状态栏 */}
          <div className="mt-2 p-2 bg-gray-50 rounded text-sm text-gray-600">
            <div className="flex justify-between items-center">
              <div>
                已切割区域: {regions.length} 个 | 
                缩放: {Math.round(scale * 100)}% | 
                {selectedRegionData ? `选中: ${selectedRegionData.label}` : '未选中区域'}
              </div>
              <div>
                💡 拖拽鼠标绘制区域，点击区域进行选择和编辑
              </div>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default StudentInfoRegionCutter;