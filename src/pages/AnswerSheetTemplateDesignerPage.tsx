import React from 'react';
import TemplateDesigner from '../components/TemplateDesigner/TemplateDesigner';

const AnswerSheetTemplateDesignerPage: React.FC = () => {
  const handleClose = () => {
    // 可以添加导航逻辑，比如返回上一页
    console.log('关闭模板设计器');
  };

  const handleSave = (template: {
    name: string;
    description?: string;
    subject?: string;
    gradeLevel?: string;
    examType?: string;
    pageWidth: number;
    pageHeight: number;
    dpi: number;
    regions: unknown[];
  }) => {
    console.log('保存模板:', template);
    // 这里可以添加保存逻辑
  };

  return (
    <TemplateDesigner
      visible={true}
      onClose={handleClose}
      onSave={handleSave}
      mode="create"
    />
  );
};

export default AnswerSheetTemplateDesignerPage;