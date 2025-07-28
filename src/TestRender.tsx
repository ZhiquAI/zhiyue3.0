import React from 'react';
import { Card, Button, Typography } from 'antd';

const { Title, Paragraph } = Typography;

const TestRender: React.FC = () => {
  return (
    <div style={{ padding: '20px', minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Card style={{ maxWidth: 600, margin: '0 auto' }}>
        <Title level={2}>测试页面</Title>
        <Paragraph>
          如果您能看到这个页面，说明React基础渲染正常
        </Paragraph>
        <Button type="primary" onClick={() => alert('按钮点击正常')}>
          测试按钮
        </Button>
        <div style={{ marginTop: 20, padding: 10, backgroundColor: '#e6f7ff', borderRadius: 4 }}>
          ✅ React组件正常工作
        </div>
        <div style={{ marginTop: 10, padding: 10, backgroundColor: '#f6ffed', borderRadius: 4 }}>
          ✅ Antd组件正常加载
        </div>
        <div style={{ marginTop: 10, padding: 10, backgroundColor: '#fff7e6', borderRadius: 4 }}>
          ✅ 样式渲染正常
        </div>
      </Card>
    </div>
  );
};

export default TestRender;