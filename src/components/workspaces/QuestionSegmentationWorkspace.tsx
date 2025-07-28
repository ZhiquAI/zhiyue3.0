import React, { useState, useEffect, useRef } from 'react';
import {
  Card, Button, Space, Row, Col, Modal, Slider, Select, Input,
  Badge, Tooltip, Alert, Progress, Divider, Typography, Tag,
  Tabs, Switch, InputNumber
} from 'antd';
import { message } from '../../utils/message';
import {
  ScissorOutlined, EyeOutlined, SaveOutlined, UndoOutlined,
  RedoOutlined, ZoomInOutlined, ZoomOutOutlined, DeleteOutlined, 
  CopyOutlined, SettingOutlined, CheckCircleOutlined, 
  ExclamationCircleOutlined, InfoCircleOutlined, FileTextOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

interface QuestionRegion {
  id: string;
  type: 'choice' | 'subjective' | 'fill_blank' | 'calculation';
  x: number;
  y: number;
  width: number;
  height: number;
  questionNumber: number;
  points: number;
  label: string;
  confidence?: number;
}

interface SegmentationResult {
  id: string;
  filename: string;
  regions: QuestionRegion[];
  totalQuestions: number;
  choiceQuestions: number;
  subjectiveQuestions: number;
  qualityScore: number;
  lastModified: string;
  status: 'draft' | 'completed' | 'verified';
}

interface QuestionSegmentationWorkspaceProps {
  answerSheet: {
    id: string;
    filename: string;
    previewUrl: string;
    studentInfo?: {
      id: string;
      name: string;
      class: string;
    };
  };
  visible: boolean;
  onSave: (result: SegmentationResult) => void;
  onClose: () => void;
  existingResult?: SegmentationResult;
}

const QuestionSegmentationWorkspace: React.FC<QuestionSegmentationWorkspaceProps> = ({
  answerSheet,
  visible,
  onSave,
  onClose,
  existingResult
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const [scale, setScale] = useState(1);
  const [regions, setRegions] = useState<QuestionRegion[]>(existingResult?.regions || []);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<{ x: number; y: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null);
  const [currentQuestionType, setCurrentQuestionType] = useState<QuestionRegion['type']>('choice');
  const [showSettings, setShowSettings] = useState(false);

  const [gridEnabled, setGridEnabled] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [history, setHistory] = useState<QuestionRegion[][]>([regions]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // 题型配置
  const questionTypeConfig = {
    choice: { label: '选择题', color: '#52c41a', defaultPoints: 3 },
    subjective: { label: '主观题', color: '#1890ff', defaultPoints: 10 },
    fill_blank: { label: '填空题', color: '#faad14', defaultPoints: 5 },
    calculation: { label: '计算题', color: '#f5222d', defaultPoints: 15 }
  };

  // 存储加载的图片
  const [loadedImage, setLoadedImage] = useState<HTMLImageElement | null>(null);

  // 加载图片
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !answerSheet.previewUrl) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setImageLoaded(false);
    setImageLoading(true);
    setLoadedImage(null);

    const img = new Image();
    // 检查是否为blob URL，如果是则不设置crossOrigin
    if (!answerSheet.previewUrl.startsWith('blob:')) {
      img.crossOrigin = 'anonymous';
    }
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      setLoadedImage(img);
      setImageLoaded(true);
      setImageLoading(false);
      drawCanvas(ctx, img);
    };
    
    img.onerror = (error) => {
      console.error('图片加载失败:', error);
      console.error('图片URL:', answerSheet.previewUrl);
      message.error(`答题卡图片加载失败: ${answerSheet.filename}`);
      setImageLoaded(false);
      setImageLoading(false);
      setLoadedImage(null);
      
      // 在画布上显示错误信息
      const ctx = canvas.getContext('2d');
      if (ctx) {
        canvas.width = 800;
        canvas.height = 600;
        ctx.fillStyle = '#f5f5f5';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        ctx.fillStyle = '#999';
        ctx.font = '16px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('图片加载失败', canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillText('请上传有效的答题卡图片', canvas.width / 2, canvas.height / 2 + 20);
      }
    };
    
    img.src = answerSheet.previewUrl;
  }, [answerSheet.previewUrl]);

  // 当scale、rotation或regions变化时重绘画布
  useEffect(() => {
    if (loadedImage && imageLoaded) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      drawCanvas(ctx, loadedImage);
    }
  }, [scale, regions, selectedRegion, gridEnabled, loadedImage, imageLoaded]);

  // 绘制画布
  const drawCanvas = (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    
    // 绘制图片（不应用旋转，保持简单的缩放）
    ctx.save();
    ctx.scale(scale, scale);
    ctx.drawImage(img, 0, 0);
    
    // 绘制网格
    if (gridEnabled) {
      drawGrid(ctx);
    }
    
    // 绘制区域
    regions.forEach(region => {
      drawRegion(ctx, region, region.id === selectedRegion);
    });
    
    ctx.restore();
  };

  // 绘制网格
  const drawGrid = (ctx: CanvasRenderingContext2D) => {
    const gridSize = 20;
    ctx.strokeStyle = '#e8e8e8';
    ctx.lineWidth = 0.5;
    
    for (let x = 0; x < ctx.canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, ctx.canvas.height);
      ctx.stroke();
    }
    
    for (let y = 0; y < ctx.canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(ctx.canvas.width, y);
      ctx.stroke();
    }
  };

  // 绘制区域
  const drawRegion = (ctx: CanvasRenderingContext2D, region: QuestionRegion, isSelected: boolean) => {
    const config = questionTypeConfig[region.type];
    
    ctx.strokeStyle = isSelected ? '#ff4d4f' : config.color;
    ctx.lineWidth = isSelected ? 3 : 2;
    ctx.fillStyle = config.color + '20';
    
    ctx.fillRect(region.x, region.y, region.width, region.height);
    ctx.strokeRect(region.x, region.y, region.width, region.height);
    
    // 绘制标签
    ctx.fillStyle = config.color;
    ctx.font = '12px Arial';
    ctx.fillText(
      `${region.questionNumber}. ${config.label} (${region.points}分)`,
      region.x + 5,
      region.y - 5
    );

    if (isSelected) {
      drawResizeHandles(ctx, region);
    }
  };



  const getResizeHandle = (x: number, y: number, region: QuestionRegion): string | null => {
    const handleSize = 10;
    const handles = {
      topLeft: { x: region.x, y: region.y },
      topRight: { x: region.x + region.width, y: region.y },
      bottomLeft: { x: region.x, y: region.y + region.height },
      bottomRight: { x: region.x + region.width, y: region.y + region.height },
    };

    for (const [name, pos] of Object.entries(handles)) {
      if (
        x >= pos.x - handleSize / 2 &&
        x <= pos.x + handleSize / 2 &&
        y >= pos.y - handleSize / 2 &&
        y <= pos.y + handleSize / 2
      ) {
        return name;
      }
    }
    return null;
  };

  const drawResizeHandles = (ctx: CanvasRenderingContext2D, region: QuestionRegion) => {
    const handleSize = 8;
    const handles = {
      topLeft: { x: region.x, y: region.y },
      topRight: { x: region.x + region.width, y: region.y },
      bottomLeft: { x: region.x, y: region.y + region.height },
      bottomRight: { x: region.x + region.width, y: region.y + region.height },
    };

    ctx.fillStyle = '#ff4d4f';
    for (const pos of Object.values(handles)) {
      ctx.fillRect(pos.x - handleSize / 2, pos.y - handleSize / 2, handleSize, handleSize);
    }
  };

  // 鼠标事件处理
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !imageLoaded) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    const clickedRegion = regions.find(region => 
      x >= region.x && x <= region.x + region.width &&
      y >= region.y && y <= region.y + region.height
    );

    if (clickedRegion) {
      setSelectedRegion(clickedRegion.id);
      const resizeHandleName = getResizeHandle(x, y, clickedRegion);
      if (resizeHandleName) {
        setIsResizing(true);
        setResizeHandle(resizeHandleName);
        setDragStart({ x, y });
      } else {
        setIsDragging(true);
        setDragStart({ x, y });
      }
    } else {
      setSelectedRegion(null);
      setIsDrawing(true);
      setDrawStart({ x, y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!loadedImage || !imageLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) / scale;
    const y = (e.clientY - rect.top) / scale;

    if (isDragging && selectedRegion && dragStart) {
      const dx = x - dragStart.x;
      const dy = y - dragStart.y;
      const newRegions = regions.map(r => 
        r.id === selectedRegion ? { ...r, x: r.x + dx, y: r.y + dy } : r
      );
      setRegions(newRegions);
      setDragStart({ x, y });
    } else if (isResizing && selectedRegion && resizeHandle && dragStart) {
      const newRegions = regions.map(r => {
        if (r.id === selectedRegion) {
          const newRegion = { ...r };
          const dx = x - dragStart.x;
          const dy = y - dragStart.y;

          if (resizeHandle.includes('Left')) {
            newRegion.x += dx;
            newRegion.width -= dx;
          }
          if (resizeHandle.includes('Right')) {
            newRegion.width += dx;
          }
          if (resizeHandle.includes('Top')) {
            newRegion.y += dy;
            newRegion.height -= dy;
          }
          if (resizeHandle.includes('Bottom')) {
            newRegion.height += dy;
          }
          return newRegion;
        }
        return r;
      });
      setRegions(newRegions);
      setDragStart({ x, y });
    } else if (isDrawing && drawStart) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        drawCanvas(ctx, loadedImage);
        ctx.save();
        ctx.scale(scale, scale);
        ctx.strokeStyle = questionTypeConfig[currentQuestionType].color;
        ctx.lineWidth = 2;
        ctx.strokeRect(
          drawStart.x,
          drawStart.y,
          x - drawStart.x,
          y - drawStart.y
        );
        ctx.restore();
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDrawing && drawStart) {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;

      const width = Math.abs(x - drawStart.x);
      const height = Math.abs(y - drawStart.y);

      if (width > 10 && height > 10) {
        const newRegion: QuestionRegion = {
          id: `region_${Date.now()}`,
          type: currentQuestionType,
          x: Math.min(drawStart.x, x),
          y: Math.min(drawStart.y, y),
          width,
          height,
          questionNumber: regions.length + 1,
          points: questionTypeConfig[currentQuestionType].defaultPoints,
          label: `题目 ${regions.length + 1}`
        };

        const newRegions = [...regions, newRegion];
        setRegions(newRegions);
        addToHistory(newRegions);
        setSelectedRegion(newRegion.id);
      }
    } else if (isDragging || isResizing) {
      addToHistory(regions);
    }

    setIsDrawing(false);
    setDrawStart(null);
    setIsDragging(false);
    setIsResizing(false);
    setResizeHandle(null);
    setDragStart(null);
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
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setRegions([...history[historyIndex + 1]]);
    }
  };

  // 删除选中区域
  const deleteSelectedRegion = () => {
    if (selectedRegion) {
      const newRegions = regions.filter(r => r.id !== selectedRegion);
      setRegions(newRegions);
      addToHistory(newRegions);
      setSelectedRegion(null);
    }
  };



  // 保存分割结果
  const handleSave = () => {
    if (regions.length === 0) {
      message.warning('请至少标注一个题目区域');
      return;
    }

    const result: SegmentationResult = {
      id: answerSheet.id,
      filename: answerSheet.filename,
      regions,
      totalQuestions: regions.length,
      choiceQuestions: regions.filter(r => r.type === 'choice').length,
      subjectiveQuestions: regions.filter(r => r.type === 'subjective').length,
      qualityScore: calculateQualityScore(),
      lastModified: new Date().toISOString(),
      status: 'completed'
    };

    onSave(result);
    message.success('题目分割结果已保存');
  };

  // 计算质量分数
  const calculateQualityScore = (): number => {
    if (regions.length === 0) return 0;
    
    let score = 80; // 基础分
    
    // 根据区域数量调整
    if (regions.length >= 5) score += 10;
    
    // 根据区域类型多样性调整
    const types = new Set(regions.map(r => r.type));
    if (types.size >= 2) score += 10;
    
    return Math.min(100, score);
  };

  // 统计信息
  const stats = {
    total: regions.length,
    choice: regions.filter(r => r.type === 'choice').length,
    subjective: regions.filter(r => r.type === 'subjective').length,
    fillBlank: regions.filter(r => r.type === 'fill_blank').length,
    calculation: regions.filter(r => r.type === 'calculation').length,
    totalPoints: regions.reduce((sum, r) => sum + r.points, 0)
  };

  return (
    <Modal
      title={
        <Space>
          <ScissorOutlined />
          <span>试题分类切割 - {answerSheet.filename}</span>
          {answerSheet.studentInfo && (
            <Tag color="blue">
              {answerSheet.studentInfo.name} ({answerSheet.studentInfo.class})
            </Tag>
          )}
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width="95vw"
      style={{ top: 20 }}
      styles={{ body: { padding: '16px', height: '80vh', overflow: 'hidden' } }}
      footer={[
        <Button key="close" onClick={onClose}>
          取消
        </Button>,
        <Button key="save" type="primary" icon={<SaveOutlined />} onClick={handleSave}>
          保存分割结果
        </Button>
      ]}
    >
      <Row gutter={16} style={{ height: '100%' }}>
        {/* 左侧工具栏 */}
        <Col span={4}>
          <Card title="工具栏" size="small" style={{ height: '100%' }} styles={{ body: { height: 'calc(100% - 40px)', overflow: 'auto' } }}>
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {/* 题型选择 */}
              <div>
                <Text strong>当前题型：</Text>
                <Select
                  value={currentQuestionType}
                  onChange={setCurrentQuestionType}
                  style={{ width: '100%', marginTop: 8 }}
                >
                  {Object.entries(questionTypeConfig).map(([type, config]) => (
                    <Option key={type} value={type}>
                      <Badge color={config.color} text={config.label} />
                    </Option>
                  ))}
                </Select>
              </div>

              <Divider />

              {/* 操作按钮 */}
              <Space direction="vertical" style={{ width: '100%' }}>

                
                <Space style={{ width: '100%' }}>
                  <Button
                    icon={<UndoOutlined />}
                    onClick={undo}
                    disabled={historyIndex <= 0}
                    title="撤销"
                  />
                  <Button
                    icon={<RedoOutlined />}
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    title="重做"
                  />
                  <Button
                    icon={<DeleteOutlined />}
                    onClick={deleteSelectedRegion}
                    disabled={!selectedRegion}
                    danger
                    title="删除选中区域"
                  />
                </Space>
              </Space>

              <Divider />

              {/* 视图控制 */}
              <div>
                <Text strong>缩放：</Text>
                <Slider
                  min={0.1}
                  max={3}
                  step={0.1}
                  value={scale}
                  onChange={setScale}
                  style={{ marginTop: 8 }}
                />
                <Space style={{ width: '100%', marginTop: 8 }}>
                  <Button
                    icon={<ZoomInOutlined />}
                    onClick={() => setScale(Math.min(3, scale + 0.2))}
                    size="small"
                  />
                  <Button
                    icon={<ZoomOutOutlined />}
                    onClick={() => setScale(Math.max(0.1, scale - 0.2))}
                    size="small"
                  />
                  <Button
                    onClick={() => setScale(1)}
                    size="small"
                    title="重置缩放"
                  >
                    1:1
                  </Button>
                </Space>
              </div>

              <Divider />

              {/* 设置选项 */}
              <div>
                <Text strong>设置：</Text>
                <div style={{ marginTop: 8 }}>
                  <div style={{ marginBottom: 8 }}>
                    <Switch
                      checked={gridEnabled}
                      onChange={setGridEnabled}
                      size="small"
                    />
                    <Text style={{ marginLeft: 8 }}>显示网格</Text>
                  </div>
                  <div style={{ marginBottom: 8 }}>
                    <Switch
                      checked={snapToGrid}
                      onChange={setSnapToGrid}
                      size="small"
                    />
                    <Text style={{ marginLeft: 8 }}>网格对齐</Text>
                  </div>

                </div>
              </div>

              <Divider />

              {/* 统计信息 */}
              <div>
                <Text strong>统计信息：</Text>
                <div style={{ marginTop: 8 }}>
                  <div>总题目数：{stats.total}</div>
                  <div>选择题：{stats.choice}</div>
                  <div>主观题：{stats.subjective}</div>
                  <div>填空题：{stats.fillBlank}</div>
                  <div>计算题：{stats.calculation}</div>
                  <div>总分值：{stats.totalPoints}分</div>
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* 中间画布区域 */}
        <Col span={16}>
          <Card title="答题卡预览" size="small" style={{ height: '100%' }} styles={{ body: { height: 'calc(100% - 40px)', overflow: 'auto', display: 'flex', flexDirection: 'column' } }}>
              {!answerSheet.previewUrl ? (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '50px',
                  height: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#fafafa',
                  border: '2px dashed #d9d9d9',
                  borderRadius: '8px'
                }}>
                  <FileTextOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px' }} />
                  <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>暂无答题卡图片</div>
                  <div style={{ fontSize: '14px', color: '#999' }}>请先上传答题卡文件</div>
                </div>
              ) : imageLoaded ? (
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  style={{
                    border: '1px solid #d9d9d9',
                    cursor: isDrawing ? 'crosshair' : 'default'
                  }}
                />
              ) : imageLoading ? (
                <div style={{ textAlign: 'center', padding: '50px' }}>
                  <Progress type="circle" percent={100} status="active" />
                  <div style={{ marginTop: 16 }}>正在加载答题卡...</div>
                </div>
              ) : (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '50px',
                  height: '400px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  backgroundColor: '#fafafa',
                  border: '2px dashed #d9d9d9',
                  borderRadius: '8px'
                }}>
                  <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#ff7875', marginBottom: '16px' }} />
                  <div style={{ fontSize: '16px', color: '#666', marginBottom: '8px' }}>图片加载失败</div>
                  <div style={{ fontSize: '14px', color: '#999' }}>请检查图片是否有效或重新上传</div>
                </div>
              )}
          </Card>
        </Col>

        {/* 右侧区域列表 */}
        <Col span={4}>
          <Card title="题目区域列表" size="small" style={{ height: '100%' }} styles={{ body: { height: 'calc(100% - 40px)', overflow: 'auto' } }}>
            <Space direction="vertical" style={{ width: '100%' }} size="small">
              {regions.length === 0 ? (
                <Alert
                  message="暂无题目区域"
                  description="请在左侧画布上拖拽创建题目区域，或使用自动检测功能"
                  type="info"
                  showIcon
                />
              ) : (
                regions.map((region, index) => (
                  <Card
                    key={region.id}
                    size="small"
                    className={selectedRegion === region.id ? 'selected-region' : ''}
                    style={{
                      border: selectedRegion === region.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                      cursor: 'pointer'
                    }}
                    onClick={() => setSelectedRegion(region.id)}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Badge
                          color={questionTypeConfig[region.type].color}
                          text={`题目 ${region.questionNumber}`}
                        />
                        <Button
                          type="text"
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            const newRegions = regions.filter(r => r.id !== region.id);
                            setRegions(newRegions);
                            addToHistory(newRegions);
                            if (selectedRegion === region.id) {
                              setSelectedRegion(null);
                            }
                          }}
                          danger
                        />
                      </div>
                      <div style={{ fontSize: '12px', color: '#666', marginTop: 4 }}>
                        <div>类型：{questionTypeConfig[region.type].label}</div>
                        <div>分值：{region.points}分</div>
                        <div>位置：({Math.round(region.x)}, {Math.round(region.y)})</div>
                        <div>大小：{Math.round(region.width)} × {Math.round(region.height)}</div>
                        {region.confidence && (
                          <div>置信度：{(region.confidence * 100).toFixed(1)}%</div>
                        )}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <style>{`
        .selected-region {
          box-shadow: 0 0 10px rgba(24, 144, 255, 0.3);
        }
      `}</style>
    </Modal>
  );
};

export default QuestionSegmentationWorkspace;