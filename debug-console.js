// 这个脚本用于检测前端控制台错误
const originalConsoleError = console.error;
const originalConsoleLog = console.log;

console.error = (...args) => {
  // 输出错误到文件或服务器
  fetch('/debug-error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      type: 'error', 
      message: args.map(arg => String(arg)).join(' '),
      timestamp: new Date().toISOString()
    })
  }).catch(() => {});
  
  originalConsoleError.apply(console, args);
};

console.log = (...args) => {
  // 捕获重要的日志
  const message = args.map(arg => String(arg)).join(' ');
  if (message.includes('启动') || message.includes('渲染') || message.includes('错误')) {
    fetch('/debug-log', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'log',
        message: message,
        timestamp: new Date().toISOString() 
      })
    }).catch(() => {});
  }
  
  originalConsoleLog.apply(console, args);
};