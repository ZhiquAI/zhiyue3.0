/**
 * 答题卡模板设计器 V2.0 测试页面
 */

import React, { useState } from 'react';
import { Button, Card, Space, message } from 'antd';
import { PlusOutlined, EditOutlined } from '@ant-design/icons';
import AnswerSheetTemplateDesignerV2 from '../components/TemplateDesigner/AnswerSheetTemplateDesignerV2';

const TemplateDesignerV2Page: React.FC = () => {
  const [designerVisible, setDesignerVisible] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<any>(null);

  // 创建新模板
  const handleCreateTemplate = () => {
    setEditingTemplate(null);
    setDesignerVisible(true);
  };

  // 编辑模板
  const handleEditTemplate = (template: any) => {
    setEditingTemplate(template);
    setDesignerVisible(true);
  };

  // 保存模板
  const handleSaveTemplate = (templateData: any) => {
    if (editingTemplate) {
      // 更新现有模板
      setTemplates(prev => prev.map(t => 
        t.id === editingTemplate.id 
          ? { ...templateData, id: editingTemplate.id, name: editingTemplate.name }
          : t
      ));
      message.success('模板更新成功！');
    } else {
      // 创建新模板
      const newTemplate = {
        ...templateData,
        id: Date.now().toString(),
        name: `模板_${templates.length + 1}`,
        createdAt: new Date().toISOString()
      };
      setTemplates(prev => [...prev, newTemplate]);
      message.success('模板创建成功！');
    }
    setDesignerVisible(false);
    setEditingTemplate(null);
  };

  // 删除模板
  const handleDeleteTemplate = (templateId: string) => {
    setTemplates(prev => prev.filter(t => t.id !== templateId));
    message.success('模板删除成功！');
  };

  // 导出模板
  const handleExportTemplate = (template: any) => {
    const dataStr = JSON.stringify(template, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${template.name}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2">答题卡模板设计器 V2.0</h1>
        <p className="text-gray-600">
          基于HTML原型的React实现版本，支持可视化设计、多种区域类型、交互操作等功能。
        </p>
      </div>

      {/* 操作按钮 */}
      <div className="mb-6">
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreateTemplate}
          size="large"
        >
          创建新模板
        </Button>
      </div>

      {/* 模板列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <Card
            key={template.id}
            title={template.name}
            extra={
              <Space>
                <Button
                  type="text"
                  icon={<EditOutlined />}
                  onClick={() => handleEditTemplate(template)}
                >
                  编辑
                </Button>
              </Space>
            }
            actions={[
              <Button
                key="export"
                type="link"
                onClick={() => handleExportTemplate(template)}
              >
                导出
              </Button>,
              <Button
                key="delete"
                type="link"
                danger
                onClick={() => handleDeleteTemplate(template.id)}
              >
                删除
              </Button>
            ]}
          >
            <div className="space-y-2">
              <p className="text-sm text-gray-600">
                区域数量: {template.regions?.length || 0}
              </p>
              <p className="text-sm text-gray-600">
                创建时间: {new Date(template.createdAt).toLocaleString()}
              </p>
              {template.backgroundImage && (
                <p className="text-sm text-green-600">
                  ✓ 已设置背景图
                </p>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* 空状态 */}
      {templates.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <PlusOutlined className="text-6xl" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            还没有任何模板
          </h3>
          <p className="text-gray-600 mb-4">
            点击上方按钮创建您的第一个答题卡模板
          </p>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateTemplate}
          >
            创建新模板
          </Button>
        </div>
      )}

      {/* 模板设计器 */}
      <AnswerSheetTemplateDesignerV2
        visible={designerVisible}
        onCancel={() => {
          setDesignerVisible(false);
          setEditingTemplate(null);
        }}
        onSave={handleSaveTemplate}
        initialTemplate={editingTemplate}
      />
    </div>
  );
};

export default TemplateDesignerV2Page;