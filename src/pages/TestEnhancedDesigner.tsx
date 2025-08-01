import React, { useState } from 'react';
import { Button, Space, Card } from 'antd';
import { PlusOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import EnhancedTemplateDesigner from '../components/TemplateDesigner/EnhancedTemplateDesigner';

const TestEnhancedDesigner: React.FC = () => {
  const [designerVisible, setDesignerVisible] = useState(false);
  const [designerMode, setDesignerMode] = useState<'create' | 'edit' | 'preview'>('create');
  const [templates, setTemplates] = useState<any[]>([]);

  const handleSaveTemplate = (template: any) => {
    console.log('保存模板:', template);
    setTemplates([...templates, { ...template, id: Date.now() }]);
    setDesignerVisible(false);
  };

  const openDesigner = (mode: 'create' | 'edit' | 'preview', template?: any) => {
    setDesignerMode(mode);
    setDesignerVisible(true);
  };

  return (
    <div style={{ padding: 24 }}>
      <Card title="增强版答题卡设计器测试" style={{ marginBottom: 24 }}>
        <Space>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => openDesigner('create')}
          >
            创建新模板
          </Button>
          <Button 
            icon={<EditOutlined />}
            onClick={() => openDesigner('edit')}
          >
            编辑模板
          </Button>
          <Button 
            icon={<EyeOutlined />}
            onClick={() => openDesigner('preview')}
          >
            预览模板
          </Button>
        </Space>
      </Card>

      <Card title="已保存的模板" size="small">
        {templates.length === 0 ? (
          <p style={{ color: '#999', textAlign: 'center', padding: 20 }}>
            暂无模板，请创建新模板
          </p>
        ) : (
          <div>
            {templates.map((template, index) => (
              <div key={template.id} style={{ 
                padding: 12, 
                border: '1px solid #f0f0f0', 
                borderRadius: 6,
                marginBottom: 8
              }}>
                <h4>{template.name || `模板 ${index + 1}`}</h4>
                <p style={{ color: '#666', margin: 0 }}>
                  {template.description || '无描述'}
                </p>
              </div>
            ))}
          </div>
        )}
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

export default TestEnhancedDesigner;