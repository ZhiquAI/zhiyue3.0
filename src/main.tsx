import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Note: findDOMNode warnings in console are from Antd components internally
// This is a known issue with Antd v5.x in StrictMode and will be fixed in future versions
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
