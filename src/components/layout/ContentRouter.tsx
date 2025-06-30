import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import DashboardView from '../views/DashboardView';
import ExamManagementView from '../views/ExamManagementView';
import MarkingCenterView from '../views/MarkingCenterView';
import DataAnalysisView from '../views/DataAnalysisView';
import LandingPage from '../views/LandingPage';
import ConfigureWorkspace from '../workspaces/ConfigureWorkspace';
import MarkingWorkspace from '../workspaces/MarkingWorkspace';
import AnalysisWorkspace from '../workspaces/AnalysisWorkspace';

const ContentRouter: React.FC = () => {
  const { currentView, subViewInfo } = useAppContext();

  // Handle sub-workspaces first
  if (subViewInfo.view && subViewInfo.exam) {
    switch (subViewInfo.view) {
      case 'configure':
        return <ConfigureWorkspace exam={subViewInfo.exam} />;
      case 'marking':
        return <MarkingWorkspace exam={subViewInfo.exam} />;
      case 'analysis':
        return <AnalysisWorkspace exam={subViewInfo.exam} />;
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