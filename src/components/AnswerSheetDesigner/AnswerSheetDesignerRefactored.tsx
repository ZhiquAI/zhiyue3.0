/**
 * 答题卡设计器 - 重构版本
 * 基于模块化架构，使用 Zustand + Canvas Provider
 */

import React, { useRef, useCallback, useEffect } from 'react';
import { Layout, Typography, Row, Col, Tabs, Card, Space, message } from 'antd';
import { Image as KonvaImage, Rect } from 'react-konva';
import useImage from 'use-image';

// 导入重构后的组件和存储
import CanvasProvider from './providers/CanvasProvider';
import ToolbarComponent from './components/ToolbarComponent';
import PropertiesPanel from './components/PropertiesPanel';
import RegionRenderer from './components/RegionRenderer';
import { useTemplate, useTemplateActions } from './stores/templateStore';
import { useCanvasActions, useCanvasSelection } from './stores/canvasStore';
import { TemplateRegion, ToolMode } from './types/schema';
import { downloadFile } from './utils/helpers';

const { Title } = Typography;
const { Sider, Content } = Layout;
const { TabPane } = Tabs;

interface AnswerSheetDesignerRefactoredProps {
  initialTemplate?: any;
  onTemplateChange?: (template: any) => void;
  onRegionSelect?: (regionIds: string[]) => void;
  width?: number;
  height?: number;
}

export const AnswerSheetDesignerRefactored: React.FC<AnswerSheetDesignerRefactoredProps> = ({
  initialTemplate,
  onTemplateChange,
  onRegionSelect,
  width = 800,
  height = 600
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = React.useState({ width, height });
  
  // 状态和动作
  const template = useTemplate();
  const templateActions = useTemplateActions();
  const canvasActions = useCanvasActions();
  const selectedRegionIds = useCanvasSelection();
  
  // 背景图片
  const [backgroundImageUrl, setBackgroundImageUrl] = React.useState<string>('');
  const [backgroundImage] = useImage(backgroundImageUrl);
  
  // 初始化模板
  useEffect(() => {
    if (initialTemplate) {
      templateActions.setTemplate(initialTemplate);
      if (initialTemplate.backgroundImage?.url) {
        setBackgroundImageUrl(initialTemplate.backgroundImage.url);
      }
    }
  }, [initialTemplate, templateActions]);
  
  // 模板变化回调
  useEffect(() => {
    if (onTemplateChange) {
      onTemplateChange(template);
    }
  }, [template, onTemplateChange]);
  
  // 选择变化回调
  useEffect(() => {
    if (onRegionSelect) {
      onRegionSelect(selectedRegionIds);
    }
  }, [selectedRegionIds, onRegionSelect]);
  
  // 容器尺寸更新
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerSize({
          width: rect.width,
          height: rect.height - 60 // 减去工具栏高度
        });
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);
  
  // 文件处理函数
  const handleSaveTemplate = useCallback(() => {
    const validation = templateActions.validateTemplate();
    if (!validation.success) {
      message.error(validation.error);
      return;
    }
    
    if (validation.warnings && validation.warnings.length > 0) {
      validation.warnings.forEach(warning => message.warning(warning));
    }
    
    const jsonData = templateActions.exportTemplate();
    downloadFile(jsonData, `${template.name || '答题卡模板'}.json`);
    message.success('模板保存成功');
  }, [templateActions, template.name]);
  
  const handleLoadTemplate = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const jsonData = e.target?.result as string;
      const result = templateActions.importTemplate(jsonData);
      
      if (result.success && result.data) {
        if (result.data.backgroundImage?.url) {
          setBackgroundImageUrl(result.data.backgroundImage.url);
        }
        message.success('模板加载成功');
      } else {
        message.error(result.error || '模板加载失败');
      }
    };
    reader.readAsText(file);
  }, [templateActions]);
  
  const handleUploadBackground = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setBackgroundImageUrl(imageUrl);
      
      // 创建临时图片元素获取尺寸
      const img = new Image();
      img.onload = () => {
        templateActions.updateTemplate({
          canvas: {
            ...template.canvas,
            width: img.width,
            height: img.height
          },
          backgroundImage: {
            url: imageUrl,
            width: img.width,
            height: img.height,
            opacity: 0.7,
            x: 0,
            y: 0
          }
        });
        message.success('背景图片上传成功');
      };
      img.src = imageUrl;
    };
    reader.readAsDataURL(file);
  }, [templateActions, template.canvas]);
  
  const handleExportPreview = useCallback(() => {
    message.info('导出功能开发中...');
  }, []);
  
  // 区域事件处理
  const handleRegionClick = useCallback((regionId: string) => {
    canvasActions.setSelectedRegions([regionId]);
  }, [canvasActions]);
  
  const handleRegionDoubleClick = useCallback((regionId: string) => {
    // 双击可以进入编辑模式或其他操作
    console.log('Double clicked region:', regionId);
  }, []);
  
  const handleRegionDragEnd = useCallback((regionId: string, x: number, y: number) => {
    templateActions.updateRegion(regionId, { x, y });
  }, [templateActions]);
  
  const handleRegionCreate = useCallback((region: TemplateRegion) => {
    // 区域创建完成后的处理
    console.log('Region created:', region);
  }, []);
  
  return (
    <Layout style={{ height: '100vh', backgroundColor: '#f5f5f5' }}>
      {/* 顶部标题和工具栏 */}
      <div style={{ 
        padding: '16px 24px', 
        backgroundColor: '#fff', 
        borderBottom: '1px solid #f0f0f0' 
      }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
          <Col>
            <Title level={4} style={{ margin: 0 }}>
              答题卡模板设计器 - 重构版
            </Title>
          </Col>
          <Col>
            <Space>
              <span style={{ fontSize: 12, color: '#666' }}>
                v{template.version} | Schema v{template.schemaVersion}
              </span>
            </Space>
          </Col>
        </Row>
        
        <ToolbarComponent
          onSave={handleSaveTemplate}
          onLoad={handleLoadTemplate}
          onUploadBackground={handleUploadBackground}
          onExport={handleExportPreview}
        />
      </div>
      
      <Layout>
        {/* 左侧属性面板 */}
        <Sider 
          width={350} 
          style={{ 
            backgroundColor: '#fff', 
            borderRight: '1px solid #f0f0f0',
            overflow: 'auto'
          }}
        >
          <div style={{ padding: 16 }}>
            <Tabs defaultActiveKey="properties" size="small">
              <TabPane tab="属性" key="properties">
                <PropertiesPanel />
                <RegionListPanel />
              </TabPane>
              
              <TabPane tab="模板信息" key="template">
                <TemplateInfoPanel />
                <TemplateStatsPanel />
              </TabPane>
            </Tabs>
          </div>
        </Sider>
        
        {/* 主画布区域 */}
        <Content style={{ position: 'relative', overflow: 'hidden' }}>
          <div 
            ref={containerRef}
            style={{ 
              width: '100%', 
              height: '100%',
              backgroundColor: '#f0f0f0'
            }}
          >
            <CanvasProvider
              width={containerSize.width}
              height={containerSize.height}
              onRegionCreate={handleRegionCreate}
              onRegionSelect={onRegionSelect}
            >
              {/* 背景图片 */}
              {backgroundImage && (
                <KonvaImage
                  image={backgroundImage}
                  width={template.canvas.width}
                  height={template.canvas.height}
                  opacity={template.backgroundImage?.opacity || 0.7}
                  x={template.backgroundImage?.x || 0}
                  y={template.backgroundImage?.y || 0}
                />
              )}
              
              {/* 画布边框 */}
              <Rect
                x={0}
                y={0}
                width={template.canvas.width}
                height={template.canvas.height}
                stroke="#ccc"
                strokeWidth={1}
                fill="transparent"
              />
              
              {/* 网格背景 */}
              <CanvasGrid />
              
              {/* 渲染所有区域 */}
              {template.regions.map(region => (
                <RegionRenderer
                  key={region.id}
                  region={region}
                  isSelected={selectedRegionIds.includes(region.id)}
                  isPreview={false}
                  onClick={handleRegionClick}
                  onDoubleClick={handleRegionDoubleClick}
                  onDragEnd={handleRegionDragEnd}
                />
              ))}
              
              {/* 选择框 */}
              <SelectionBox />
            </CanvasProvider>
          </div>
          
          {/* 状态栏 */}
          <StatusBar />
        </Content>
      </Layout>
    </Layout>
  );
};

// 网格组件
const CanvasGrid: React.FC = () => {
  const template = useTemplate();
  // 这里可以实现网格渲染逻辑
  return null;
};

// 选择框组件
const SelectionBox: React.FC = () => {
  // 这里可以实现选择框渲染逻辑
  return null;
};

// 区域列表面板
const RegionListPanel: React.FC = () => {
  const template = useTemplate();
  const templateActions = useTemplateActions();
  const canvasActions = useCanvasActions();
  const selectedRegionIds = useCanvasSelection();
  
  if (template.regions.length === 0) {
    return (
      <Card title="区域列表" size="small" style={{ marginTop: 16 }}>
        <div style={{ textAlign: 'center', padding: 20, color: '#999' }}>
          暂无区域，请在画布上绘制区域
        </div>
      </Card>
    );
  }
  
  return (
    <Card title="区域列表" size="small" style={{ marginTop: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        {template.regions.map(region => (
          <RegionListItem
            key={region.id}
            region={region}
            isSelected={selectedRegionIds.includes(region.id)}
            onSelect={() => canvasActions.setSelectedRegions([region.id])}
            onDelete={() => templateActions.deleteRegion(region.id)}
          />
        ))}
      </Space>
    </Card>
  );
};

// 区域列表项
const RegionListItem: React.FC<{
  region: TemplateRegion;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}> = ({ region, isSelected, onSelect, onDelete }) => {
  return (
    <div
      style={{
        padding: 8,
        border: `1px solid ${isSelected ? '#1890ff' : '#d9d9d9'}`,
        borderRadius: 4,
        cursor: 'pointer',
        backgroundColor: isSelected ? '#f0f8ff' : 'transparent'
      }}
      onClick={onSelect}
    >
      {/* 区域信息显示 */}
      <div>Region: {region.name}</div>
    </div>
  );
};

// 模板信息面板
const TemplateInfoPanel: React.FC = () => {
  const template = useTemplate();
  const templateActions = useTemplateActions();
  
  return (
    <Card title="模板信息" size="small">
      {/* 模板信息表单 */}
      <div>Template info form here</div>
    </Card>
  );
};

// 模板统计面板
const TemplateStatsPanel: React.FC = () => {
  const template = useTemplate();
  
  return (
    <Card title="统计信息" size="small" style={{ marginTop: 16 }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <div>总区域数：{template.regions.length}</div>
        {/* 更多统计信息 */}
      </Space>
    </Card>
  );
};

// 状态栏
const StatusBar: React.FC = () => {
  const template = useTemplate();
  const canvasState = { scale: 1, toolMode: ToolMode.SELECT }; // 临时数据
  
  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 32,
        backgroundColor: '#fff',
        borderTop: '1px solid #f0f0f0',
        display: 'flex',
        alignItems: 'center',
        paddingLeft: 16,
        fontSize: 12,
        color: '#666'
      }}
    >
      <Space split={<span style={{ color: '#d9d9d9' }}>|</span>}>
        <span>画布: {template.canvas.width} × {template.canvas.height}</span>
        <span>缩放: {Math.round(canvasState.scale * 100)}%</span>
        <span>区域: {template.regions.length}</span>
        <span>工具: {canvasState.toolMode}</span>
      </Space>
    </div>
  );
};

export default AnswerSheetDesignerRefactored;