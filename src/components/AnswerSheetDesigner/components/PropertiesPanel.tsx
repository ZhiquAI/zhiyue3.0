/**
 * 属性面板组件 - 区域属性编辑
 */

import React from 'react';
import { 
  Card, 
  Form, 
  Input, 
  InputNumber, 
  Select, 
  Switch, 
  Row, 
  Col, 
  Space, 
  Button, 
  Divider,
  Typography,
  Collapse,
  Badge
} from 'antd';
import {
  DeleteOutlined,
  CopyOutlined,
  LockOutlined,
  UnlockOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import { 
  TemplateRegion, 
  RegionType, 
  AnchorRegion, 
  BarcodeRegion, 
  ObjectiveRegion, 
  SubjectiveRegion 
} from '../types/schema';
import { useTemplate, useTemplateActions } from '../stores/templateStore';
import { useCanvasSelection } from '../stores/canvasStore';
import { getRegionTypeName, getRegionColor } from '../utils/helpers';

const { Text } = Typography;
const { Option } = Select;
const { Panel } = Collapse;

interface PropertiesPanelProps {
  className?: string;
  style?: React.CSSProperties;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ 
  className, 
  style 
}) => {
  const template = useTemplate();
  const templateActions = useTemplateActions();
  const selectedRegionIds = useCanvasSelection();
  
  const selectedRegions = template.regions.filter(
    region => selectedRegionIds.includes(region.id)
  );
  
  if (selectedRegions.length === 0) {
    return (
      <Card 
        title="属性设置" 
        size="small" 
        className={className}
        style={style}
      >
        <div style={{ 
          textAlign: 'center', 
          padding: 20, 
          color: '#999' 
        }}>
          <Text type="secondary">请选择一个或多个区域来编辑属性</Text>
        </div>
      </Card>
    );
  }
  
  if (selectedRegions.length === 1) {
    return (
      <SingleRegionProperties 
        region={selectedRegions[0]}
        className={className}
        style={style}
      />
    );
  }
  
  return (
    <MultipleRegionsProperties 
      regions={selectedRegions}
      className={className}
      style={style}
    />
  );
};

// 单个区域属性面板
const SingleRegionProperties: React.FC<{
  region: TemplateRegion;
  className?: string;
  style?: React.CSSProperties;
}> = ({ region, className, style }) => {
  const templateActions = useTemplateActions();
  
  const updateRegion = (updates: Partial<TemplateRegion>) => {
    templateActions.updateRegion(region.id, updates);
  };
  
  const updateProperties = (properties: Partial<any>) => {
    templateActions.updateRegion(region.id, {
      properties: { ...region.properties, ...properties }
    });
  };
  
  const handleDelete = () => {
    templateActions.deleteRegion(region.id);
  };
  
  const handleDuplicate = () => {
    templateActions.duplicateRegion(region.id);
  };
  
  const handleToggleVisible = () => {
    updateRegion({ visible: !region.visible });
  };
  
  const handleToggleLocked = () => {
    updateRegion({ locked: !region.locked });
  };
  
  return (
    <Card
      title={
        <Space>
          <Badge 
            color={getRegionColor(region.type)} 
            text={getRegionTypeName(region.type)}
          />
          {region.locked && <LockOutlined style={{ color: '#faad14' }} />}
          {!region.visible && <EyeInvisibleOutlined style={{ color: '#ff4d4f' }} />}
        </Space>
      }
      size="small"
      className={className}
      style={style}
      extra={
        <Space>
          <Button 
            size="small" 
            type="text" 
            icon={region.visible ? <EyeOutlined /> : <EyeInvisibleOutlined />}
            onClick={handleToggleVisible}
          />
          <Button 
            size="small" 
            type="text" 
            icon={region.locked ? <LockOutlined /> : <UnlockOutlined />}
            onClick={handleToggleLocked}
          />
        </Space>
      }
    >
      <Collapse defaultActiveKey={['basic', 'properties']} ghost>
        {/* 基本属性 */}
        <Panel header="基本属性" key="basic">
          <Form layout="vertical" size="small">
            <Form.Item label="名称">
              <Input
                value={region.name}
                onChange={(e) => updateRegion({ name: e.target.value })}
                placeholder="区域名称"
              />
            </Form.Item>
            
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item label="X坐标">
                  <InputNumber
                    value={Math.round(region.x)}
                    onChange={(value) => updateRegion({ x: value || 0 })}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Y坐标">
                  <InputNumber
                    value={Math.round(region.y)}
                    onChange={(value) => updateRegion({ y: value || 0 })}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
            
            <Row gutter={8}>
              <Col span={12}>
                <Form.Item label="宽度">
                  <InputNumber
                    value={Math.round(region.width)}
                    onChange={(value) => updateRegion({ width: value || 1 })}
                    min={1}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="高度">
                  <InputNumber
                    value={Math.round(region.height)}
                    onChange={(value) => updateRegion({ height: value || 1 })}
                    min={1}
                    style={{ width: '100%' }}
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Panel>
        
        {/* 特殊属性 */}
        <Panel header="特殊属性" key="properties">
          {renderSpecificProperties(region, updateProperties)}
        </Panel>
        
        {/* 操作按钮 */}
        <Panel header="操作" key="actions">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Row gutter={8}>
              <Col span={12}>
                <Button
                  block
                  icon={<CopyOutlined />}
                  onClick={handleDuplicate}
                  size="small"
                >
                  复制
                </Button>
              </Col>
              <Col span={12}>
                <Button
                  block
                  type="primary"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDelete}
                  size="small"
                >
                  删除
                </Button>
              </Col>
            </Row>
          </Space>
        </Panel>
      </Collapse>
    </Card>
  );
};

// 多个区域属性面板
const MultipleRegionsProperties: React.FC<{
  regions: TemplateRegion[];
  className?: string;
  style?: React.CSSProperties;
}> = ({ regions, className, style }) => {
  const templateActions = useTemplateActions();
  
  const handleBatchDelete = () => {
    templateActions.deleteRegions(regions.map(r => r.id));
  };
  
  const handleAlign = (alignment: string) => {
    templateActions.alignRegions(regions.map(r => r.id), alignment as any);
  };
  
  const handleDistribute = (distribution: 'horizontal' | 'vertical') => {
    templateActions.distributeRegions(regions.map(r => r.id), distribution);
  };
  
  return (
    <Card
      title={`已选择 ${regions.length} 个区域`}
      size="small"
      className={className}
      style={style}
    >
      <Collapse defaultActiveKey={['align']} ghost>
        <Panel header="对齐分布" key="align">
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>对齐</Text>
            <Row gutter={[4, 4]}>
              <Col span={8}>
                <Button size="small" block onClick={() => handleAlign('left')}>
                  左对齐
                </Button>
              </Col>
              <Col span={8}>
                <Button size="small" block onClick={() => handleAlign('center-horizontal')}>
                  水平居中
                </Button>
              </Col>
              <Col span={8}>
                <Button size="small" block onClick={() => handleAlign('right')}>
                  右对齐
                </Button>
              </Col>
              <Col span={8}>
                <Button size="small" block onClick={() => handleAlign('top')}>
                  顶部对齐
                </Button>
              </Col>
              <Col span={8}>
                <Button size="small" block onClick={() => handleAlign('center-vertical')}>
                  垂直居中
                </Button>
              </Col>
              <Col span={8}>
                <Button size="small" block onClick={() => handleAlign('bottom')}>
                  底部对齐
                </Button>
              </Col>
            </Row>
            
            {regions.length >= 3 && (
              <>
                <Divider style={{ margin: '12px 0' }} />
                <Text strong>分布</Text>
                <Row gutter={8}>
                  <Col span={12}>
                    <Button size="small" block onClick={() => handleDistribute('horizontal')}>
                      水平分布
                    </Button>
                  </Col>
                  <Col span={12}>
                    <Button size="small" block onClick={() => handleDistribute('vertical')}>
                      垂直分布
                    </Button>
                  </Col>
                </Row>
              </>
            )}
          </Space>
        </Panel>
        
        <Panel header="批量操作" key="batch">
          <Button
            type="primary"
            danger
            icon={<DeleteOutlined />}
            onClick={handleBatchDelete}
            block
          >
            删除所有选中区域
          </Button>
        </Panel>
      </Collapse>
    </Card>
  );
};

// 渲染特定类型的属性
function renderSpecificProperties(
  region: TemplateRegion, 
  updateProperties: (properties: Partial<any>) => void
) {
  switch (region.type) {
    case RegionType.ANCHOR:
      return <AnchorProperties region={region} updateProperties={updateProperties} />;
    case RegionType.BARCODE:
      return <BarcodeProperties region={region} updateProperties={updateProperties} />;
    case RegionType.OBJECTIVE:
      return <ObjectiveProperties region={region} updateProperties={updateProperties} />;
    case RegionType.SUBJECTIVE:
      return <SubjectiveProperties region={region} updateProperties={updateProperties} />;
    default:
      return null;
  }
}

// 定位点属性
const AnchorProperties: React.FC<{
  region: AnchorRegion;
  updateProperties: (properties: Partial<AnchorRegion['properties']>) => void;
}> = ({ region, updateProperties }) => (
  <Form layout="vertical" size="small">
    <Form.Item label="定位点标识">
      <Input
        value={region.properties.anchorId}
        onChange={(e) => updateProperties({ anchorId: e.target.value })}
        placeholder="如：A1, B2"
      />
    </Form.Item>
    
    <Form.Item label="定位精度">
      <Select
        value={region.properties.precision}
        onChange={(value) => updateProperties({ precision: value })}
      >
        <Option value="high">高精度</Option>
        <Option value="medium">中等精度</Option>
        <Option value="low">低精度</Option>
      </Select>
    </Form.Item>
    
    <Form.Item label="形状">
      <Select
        value={region.properties.shape}
        onChange={(value) => updateProperties({ shape: value })}
      >
        <Option value="circle">圆形</Option>
        <Option value="square">正方形</Option>
        <Option value="cross">十字形</Option>
      </Select>
    </Form.Item>
  </Form>
);

// 条码属性
const BarcodeProperties: React.FC<{
  region: BarcodeRegion;
  updateProperties: (properties: Partial<BarcodeRegion['properties']>) => void;
}> = ({ region, updateProperties }) => (
  <Form layout="vertical" size="small">
    <Form.Item label="条码类型">
      <Select
        value={region.properties.barcodeType}
        onChange={(value) => updateProperties({ barcodeType: value })}
      >
        <Option value="code128">Code128</Option>
        <Option value="qr">二维码</Option>
        <Option value="datamatrix">DataMatrix</Option>
      </Select>
    </Form.Item>
    
    <Form.Item label="方向">
      <Select
        value={region.properties.orientation}
        onChange={(value) => updateProperties({ orientation: value })}
      >
        <Option value="horizontal">水平</Option>
        <Option value="vertical">垂直</Option>
      </Select>
    </Form.Item>
  </Form>
);

// 客观题属性
const ObjectiveProperties: React.FC<{
  region: ObjectiveRegion;
  updateProperties: (properties: Partial<ObjectiveRegion['properties']>) => void;
}> = ({ region, updateProperties }) => (
  <Form layout="vertical" size="small">
    <Row gutter={8}>
      <Col span={12}>
        <Form.Item label="起始题号">
          <InputNumber
            value={region.properties.startQuestionNumber}
            onChange={(value) => updateProperties({ startQuestionNumber: value || 1 })}
            min={1}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="题目数量">
          <InputNumber
            value={region.properties.questionCount}
            onChange={(value) => updateProperties({ questionCount: value || 1 })}
            min={1}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Col>
    </Row>
    
    <Row gutter={8}>
      <Col span={12}>
        <Form.Item label="选项数">
          <InputNumber
            value={region.properties.optionsPerQuestion}
            onChange={(value) => updateProperties({ optionsPerQuestion: value || 4 })}
            min={2}
            max={8}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="每行题数">
          <InputNumber
            value={region.properties.questionsPerRow}
            onChange={(value) => updateProperties({ questionsPerRow: value || 5 })}
            min={1}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Col>
    </Row>
    
    <Form.Item label="每题分值">
      <InputNumber
        value={region.properties.scorePerQuestion}
        onChange={(value) => updateProperties({ scorePerQuestion: value || 2 })}
        min={0.5}
        step={0.5}
        style={{ width: '100%' }}
      />
    </Form.Item>
    
    <Form.Item label="布局方式">
      <Select
        value={region.properties.layout}
        onChange={(value) => updateProperties({ layout: value })}
      >
        <Option value="horizontal">水平排列</Option>
        <Option value="vertical">垂直排列</Option>
        <Option value="matrix">矩阵排列</Option>
      </Select>
    </Form.Item>
    
    <Form.Item label="气泡样式">
      <Select
        value={region.properties.bubbleStyle}
        onChange={(value) => updateProperties({ bubbleStyle: value })}
      >
        <Option value="circle">圆形</Option>
        <Option value="square">方形</Option>
        <Option value="oval">椭圆</Option>
      </Select>
    </Form.Item>
  </Form>
);

// 主观题属性
const SubjectiveProperties: React.FC<{
  region: SubjectiveRegion;
  updateProperties: (properties: Partial<SubjectiveRegion['properties']>) => void;
}> = ({ region, updateProperties }) => (
  <Form layout="vertical" size="small">
    <Row gutter={8}>
      <Col span={12}>
        <Form.Item label="题号">
          <InputNumber
            value={region.properties.questionNumber}
            onChange={(value) => updateProperties({ questionNumber: value || 1 })}
            min={1}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="总分值">
          <InputNumber
            value={region.properties.totalScore}
            onChange={(value) => updateProperties({ totalScore: value || 10 })}
            min={1}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Col>
    </Row>
    
    <Form.Item label="题目类型">
      <Select
        value={region.properties.questionType}
        onChange={(value) => updateProperties({ questionType: value })}
      >
        <Option value="essay">论述题</Option>
        <Option value="calculation">计算题</Option>
        <Option value="analysis">分析题</Option>
        <Option value="design">设计题</Option>
        <Option value="other">其他</Option>
      </Select>
    </Form.Item>
    
    <Form.Item>
      <Switch
        checked={region.properties.hasLines}
        onChange={(checked) => updateProperties({ hasLines: checked })}
        checkedChildren="显示线条"
        unCheckedChildren="无线条"
      />
    </Form.Item>
    
    {region.properties.hasLines && (
      <Form.Item label="行间距">
        <InputNumber
          value={region.properties.lineSpacing}
          onChange={(value) => updateProperties({ lineSpacing: value || 24 })}
          min={12}
          max={48}
          style={{ width: '100%' }}
        />
      </Form.Item>
    )}
  </Form>
);

export default PropertiesPanel;