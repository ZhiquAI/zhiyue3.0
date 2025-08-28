import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { App as AntdApp, ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import SimpleDashboard from "./components/debug/SimpleDashboard";
import ExamManagement from "./components/modules/ExamManagement";

import Analysis from "./components/modules/Analysis";
import StudentManagement from "./components/modules/StudentManagement";
import ErrorBoundary from "./components/common/ErrorBoundary";

const SimpleApp: React.FC = () => {
  console.log("🚀 SimpleApp component is rendering!");

  return (
    <ErrorBoundary>
      <ConfigProvider locale={zhCN}>
        <AntdApp>
          <Router>
            <Routes>
              {/* <Route path="/auth" element={<SimpleLoginPage />} /> */}
              {/* <Route path="/login" element={<SimpleLoginPage />} /> */}
              <Route path="/dashboard" element={<SimpleDashboard />} />
              <Route path="/workspace" element={<SimpleDashboard />} />
              <Route path="/exam-management" element={<ExamManagement />} />

              <Route path="/analysis" element={<Analysis />} />
              <Route
                path="/student-management"
                element={<StudentManagement />}
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Router>
        </AntdApp>
      </ConfigProvider>
    </ErrorBoundary>
  );
};

export default SimpleApp;
