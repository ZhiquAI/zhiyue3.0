import React from 'react';

const SimpleTest: React.FC = () => {
  return (
    <div style={{ 
      padding: '20px', 
      minHeight: '100vh', 
      backgroundColor: '#f0f0f0',
      fontFamily: 'Arial, sans-serif'
    }}>
      <h1 style={{ color: '#333' }}>智阅AI 简单测试</h1>
      <p style={{ fontSize: '18px', color: '#666' }}>
        如果您能看到这个页面，说明React基础渲染正常
      </p>
      <button 
        onClick={() => alert('按钮点击正常')}
        style={{
          padding: '10px 20px',
          backgroundColor: '#1890ff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        测试按钮
      </button>
      <div style={{ 
        marginTop: '20px', 
        padding: '10px', 
        backgroundColor: '#d4edda', 
        borderRadius: '4px',
        border: '1px solid #c3e6cb'
      }}>
        ✅ React组件正常工作
      </div>
      <div style={{ 
        marginTop: '10px', 
        padding: '10px', 
        backgroundColor: '#d1ecf1', 
        borderRadius: '4px',
        border: '1px solid #bee5eb'
      }}>
        ✅ 基础JavaScript功能正常
      </div>
      <div style={{ 
        marginTop: '10px', 
        padding: '10px', 
        backgroundColor: '#fff3cd', 
        borderRadius: '4px',
        border: '1px solid #ffeaa7'
      }}>
        ✅ 样式渲染正常
      </div>
      <div style={{ marginTop: '20px', fontSize: '14px', color: '#888' }}>
        当前时间: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default SimpleTest; 