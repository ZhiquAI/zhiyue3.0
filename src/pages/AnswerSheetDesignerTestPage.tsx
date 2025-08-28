/**
 * 答题卡设计器测试页面
 * 用于测试重构后的答题卡设计器
 */

import React from 'react';
import { message } from 'antd';
import { AnswerSheetDesignerRefactored } from '../components/AnswerSheetDesigner';
import type { TemplateData } from '../components/AnswerSheetDesigner';

const AnswerSheetDesignerTestPage: React.FC = () => {
  const handleTemplateChange = (template: TemplateData) => {
    console.log('Template changed:', template);
  };
  
  const handleRegionSelect = (regionIds: string[]) => {
    console.log('Regions selected:', regionIds);
  };
  
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <AnswerSheetDesignerRefactored
        onTemplateChange={handleTemplateChange}
        onRegionSelect={handleRegionSelect}
      />
    </div>
  );
};

export default AnswerSheetDesignerTestPage;