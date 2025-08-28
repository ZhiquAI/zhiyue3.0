import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import DashboardView from '../views/DashboardView';
import ExamManagementView from '../views/ExamManagementView';
import ExamDetailView from '../views/ExamDetailView';
import BarcodeGenerator from '../tools/BarcodeGenerator';

import LandingPage from '../views/LandingPage';
import StudentManagement from '../../pages/StudentManagement';
import ChoiceGrading from '../../pages/ChoiceGrading';
import QuestionSegmentationPage from '../../pages/QuestionSegmentationPage';
import DatabaseOptimizationDashboard from '../database/DatabaseOptimizationDashboard';
import { Grading } from '../modules/Grading';

import AnalysisWorkspace from '../workspaces/AnalysisWorkspace';
import AnswerSheetUploadWorkspace from '../workspaces/AnswerSheetUploadWorkspace';
import AnalyticsWorkspace from '../workspaces/AnalyticsWorkspace';
import PerformanceWorkspace from '../workspaces/PerformanceWorkspace';

// 智能返回组件包装器
const SmartReturnWrapper: React.FC<{ children: React.ReactElement; exam: unknown; source?: string | null }> = ({ children, source }) => {
  const { setCurrentView, setSubViewInfo } = useAppContext();
  
  // 克隆子组件并注入智能返回逻辑
  return React.cloneElement(children, {
    ...children.props,
    onSmartReturn: () => {
      // 根据来源决定返回逻辑
      if (source === 'examManagement') {
        setCurrentView('examList');
        setSubViewInfo({ view: null, exam: null, source: null });
      } else if (source === 'markingCenter') {
        setCurrentView('markingCenter');
        setSubViewInfo({ view: null, exam: null, source: null });
      } else {
        // 默认返回考试管理
        setCurrentView('examList');
        setSubViewInfo({ view: null, exam: null, source: null });
      }
    }
  });
};

const ContentRouter: React.FC = () => {
  const { currentView, subViewInfo, setCurrentView, setSubViewInfo } = useAppContext();

  // Handle sub-workspaces first
  if (subViewInfo.view) {
    switch (subViewInfo.view) {
      case 'detail':
        if (!subViewInfo.exam) return <ExamManagementView />;
        return (
          <ExamDetailView 
            exam={subViewInfo.exam} 
            onBack={() => {
              setCurrentView('examList');
              setSubViewInfo({ view: null, exam: null, source: null });
            }}
          />
        );
      case 'studentManagement':
        return (
          <StudentManagement 
            examId={subViewInfo.exam?.id || ''}
            onBack={() => {
              setCurrentView('examList');
              setSubViewInfo({ view: null, exam: null, source: null });
            }}
          />
        );
      case 'upload':
        if (!subViewInfo.exam) return <ExamManagementView />;
        return (
          <SmartReturnWrapper exam={subViewInfo.exam} source={subViewInfo.source}>
            <AnswerSheetUploadWorkspace exam={subViewInfo.exam} />
          </SmartReturnWrapper>
        );
      case 'marking':
        if (!subViewInfo.exam) return <ExamManagementView />;
        // Marking functionality has been removed - redirect to exam management
        return <ExamManagementView />;
      case 'analysis':
        if (!subViewInfo.exam) return <ExamManagementView />;
        return (
          <SmartReturnWrapper exam={subViewInfo.exam} source={subViewInfo.source}>
            <AnalysisWorkspace exam={subViewInfo.exam} />
          </SmartReturnWrapper>
        );
      default:
        break;
    }
  }

  // Handle main views
  switch (currentView) {
    case 'landing':
      return <LandingPage />;
    case 'dashboard':
      return <DashboardView />;
    case 'examList':
      return <ExamManagementView />;
    case 'studentManagement':
      return <StudentManagement examId="" />;
    case 'markingCenter':
      // Marking center has been removed - redirect to exam management
      return <ExamManagementView />;

    case 'barcodeGenerator':
      return (
        <div className="p-6">
          <div className="max-w-6xl mx-auto">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">条形码生成器</h1>
              <p className="text-gray-600">生成学生条形码和试卷条形码</p>
            </div>
            <BarcodeGenerator 
              visible={true}
              onClose={() => {
                setCurrentView('examList');
                setSubViewInfo({ view: null, exam: null, source: null });
              }}
            />
          </div>
        </div>
      );

    case 'choiceGrading':
      return <ChoiceGrading />;
    case 'questionSegmentation':
      return <QuestionSegmentationPage />;



    case 'preGrading':
      // 智能预处理需要选择考试，如果没有选中考试则显示提示
      return (
        <div className="p-6">
          <div className="text-center">
            <h2 className="text-xl font-bold mb-4">智能预处理</h2>
            <p className="text-gray-600 mb-4">请先从考试管理中选择一个考试，然后进入智能预处理工作流。</p>
            <button 
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              onClick={() => {
                setCurrentView('examList');
                setSubViewInfo({ view: null, exam: null, source: null });
              }}
            >
              前往考试管理
            </button>
          </div>
        </div>
      );
    case 'dataAnalysis':
      return <AnalyticsWorkspace />;
    case 'performance':
      return (
        <PerformanceWorkspace 
          onBack={() => {
            setCurrentView('dashboard');
            setSubViewInfo({ view: null, exam: null, source: null });
          }}
        />
      );
    case 'databaseOptimization':
      return <DatabaseOptimizationDashboard />;
    case 'grading':
      return <Grading />;

 default:
      return <DashboardView />;
  }
};

export default ContentRouter;