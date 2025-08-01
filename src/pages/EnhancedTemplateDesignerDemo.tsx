/**
 * 增强版答题卡模板设计器演示页面
 * 
 * 展示增强版设计器的核心功能：
 * 1. 数字蓝图制定者 - 精确的坐标定义和区域划分
 * 2. 物理与数字世界的桥梁 - 纸质答题卡到结构化数据的转换
 * 3. 质量保障的源头 - 内嵌OMR设计规范，确保识别准确性
 */

import React, { useState } from 'react';
import { Button, Card, Space, Typography, Alert, Divider } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import { EnhancedTemplateDesigner } from '../components/TemplateDesigner';

const { Title, Paragraph } = Typography;

const EnhancedTemplateDesignerDemo: React.FC = () => {
  const [designerVisible, setDesignerVisible] = useState(false);
  const [designerMode, setDesignerMode] = useState<'create' | 'edit' | 'preview'>('create');
  const [savedTemplates, setSavedTemplates] = useState<any[]>([]);

  const handleCreateTemplate = () => {
    setDesignerMode('create');
    setDesignerVisible(true);
  };

  const handleEditTemplate = (template: any) => {
    setDesignerMode('edit');
    setDesignerVisible(true);
  };

  const handlePreviewTemplate = (template: any) => {
    setDesignerMode('preview');
    setDesignerVisible(true);
  };

  const handleSaveTemplate = (templateData: any) => {
    setSavedTemplates([...savedTemplates, {
      id: Date.now(),
      ...templateData,
      createdAt: new Date().toISOString()
    }]);
    setDesignerVisible(false);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Title level={2}>增强版答题卡模板设计器</Title>
      
      <Alert
        message="核心价值"
        description={
          <div>
            <p><strong>🎯 数字蓝图制定者：</strong>创建精确的坐标定义和区域划分，为智能阅卷提供准确的数字蓝图</p>
            <p><strong>🌉 物理与数字世界的桥梁：</strong>将纸质答题卡转换为系统可理解的结构化数据</p>
            <p><strong>🛡️ 质量保障的源头：</strong>内嵌OMR设计规范，从源头确保识别准确性和可靠性</p>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 24 }}
      />

      <Card title="功能特性" style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <Card size="small" title="🎨 智能设计工具">
            <Paragraph style={{ fontSize: '14px' }}>
              • 可视化拖拽绘制<br/>
              • 多种题型支持<br/>
              • 实时预览效果<br/>
              • 精确坐标控制
            </Paragraph>
          </Card>
          
          <Card size="small" title="📏 OMR规范引擎">
            <Paragraph style={{ fontSize: '14px' }}>
              • 内置OMR设计标准<br/>
              • 实时质量检测<br/>
              • 智能规范提醒<br/>
              • 兼容性验证
            </Paragraph>
          </Card>
          
          <Card size="small" title="🔍 质量保障系统">
            <Paragraph style={{ fontSize: '14px' }}>
              • 多维度质量评估<br/>
              • 问题自动识别<br/>
              • 优化建议推荐<br/>
              • 识别精度预测
            </Paragraph>
          </Card>
          
          <Card size="small" title="⚡ 高效协作">
            <Paragraph style={{ fontSize: '14px' }}>
              • 模板版本管理<br/>
              • 团队协作支持<br/>
              • 批量操作功能<br/>
              • 导入导出便捷
            </Paragraph>
          </Card>
        </div>
      </Card>

      <Card title="操作面板">
        <Space size="large">
          <Button 
            type="primary" 
            icon={<PlusOutlined />} 
            size="large"
            onClick={handleCreateTemplate}
          >
            创建新模板
          </Button>
          
          <Button 
            icon={<EditOutlined />} 
            size="large"
            onClick={() => handleEditTemplate({})}
            disabled={savedTemplates.length === 0}
          >
            编辑模板
          </Button>
          
          <Button 
            icon={<EyeOutlined />} 
            size="large"
            onClick={() => handlePreviewTemplate({})}
            disabled={savedTemplates.length === 0}
          >
            预览模板
          </Button>
        </Space>
        
        <Divider />
        
        <div>
          <Title level={4}>已保存的模板 ({savedTemplates.length})</Title>
          {savedTemplates.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', padding: '40px 0' }}>
              暂无保存的模板，点击"创建新模板"开始设计
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {savedTemplates.map((template) => (
                <Card 
                  key={template.id}
                  size="small"
                  title={template.name || '未命名模板'}
                  extra={
                    <Space>
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<EditOutlined />}
                        onClick={() => handleEditTemplate(template)}
                      />
                      <Button 
                        type="text" 
                        size="small" 
                        icon={<EyeOutlined />}
                        onClick={() => handlePreviewTemplate(template)}
                      />
                    </Space>
                  }
                >
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    <p>科目: {template.subject || '未设置'}</p>
                    <p>年级: {template.gradeLevel || '未设置'}</p>
                    <p>区域数量: {template.regions?.length || 0}</p>
                    <p>质量评分: {Math.round(template.qualityAnalysis?.overallScore || 0)}%</p>
                    <p>创建时间: {new Date(template.createdAt).toLocaleString()}</p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Card>

      <EnhancedTemplateDesigner
        visible={designerVisible}
        mode={designerMode}
        onCancel={() => setDesignerVisible(false)}
        onSave={handleSaveTemplate}
      />
    </div>
  );
};

export default EnhancedTemplateDesignerDemo;