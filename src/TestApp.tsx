import React from 'react';

const TestApp: React.FC = () => {
  console.log('TestApp is rendering!');
  
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🎉 智阅AI 测试页面</h1>
      <p>如果你能看到这个页面，说明React正在正常工作！</p>
      <div style={{ marginTop: '20px' }}>
        <button onClick={() => alert('按钮点击成功！')}>
          测试按钮
        </button>
      </div>
    </div>
  );
};

export default TestApp;