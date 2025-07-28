import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import DashboardView from '../views/DashboardView';
import ExamManagementView from '../views/ExamManagementView';
import MarkingCenterView from '../views/MarkingCenterView';
import DataAnalysisView from '../views/DataAnalysisView';
import LandingPage from '../views/LandingPage';


import NewMarkingWorkspace from '../workspaces/NewMarkingWorkspace';
import AnalysisWorkspace from '../workspaces/AnalysisWorkspace';
import AnswerSheetUploadWorkspace from '../workspaces/AnswerSheetUploadWorkspace';

// 智能返回组件包装器
const SmartReturnWrapper: React.FC<{ children: React.ReactElement; exam: any; source?: string | null }> = ({ children, exam, source }) => {
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
  const { currentView, subViewInfo } = useAppContext();

  // Handle sub-workspaces first
  if (subViewInfo.view && subViewInfo.exam) {
    switch (subViewInfo.view) {

      case 'upload':
        return (
          <SmartReturnWrapper exam={subViewInfo.exam} source={subViewInfo.source}>
            <AnswerSheetUploadWorkspace exam={subViewInfo.exam} />
          </SmartReturnWrapper>
        );
      case 'marking':
        return (
          <SmartReturnWrapper exam={subViewInfo.exam} source={subViewInfo.source}>
            <NewMarkingWorkspace exam={subViewInfo.exam} />
          </SmartReturnWrapper>
        );
      case 'analysis':
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
    case 'markingCenter':
      return <MarkingCenterView />;
    case 'dataAnalysis':
      return <DataAnalysisView />;
 default:
      return <DashboardView />;
  }
};

export default ContentRouter;