import React, { useEffect } from 'react';
import { Layout } from 'antd';
import { useLocation } from 'react-router-dom';
import { useAppContext } from '../contexts/AppContext';
import Header from './layout/Header';
import ContentRouter from './layout/ContentRouter';

export const MainApplication: React.FC = () => {
  const { setCurrentView, isHeaderVisible } = useAppContext();
  const location = useLocation();

  // 根据路由路径设置当前视图
  useEffect(() => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) {
      setCurrentView('dashboard');
    } else if (path.startsWith('/exams')) {
      setCurrentView('examList');
    } else if (path.startsWith('/marking')) {
      setCurrentView('markingCenter');
    } else if (path.startsWith('/integrated-marking')) {
      setCurrentView('integratedMarkingCenter');
    } else if (path.startsWith('/choice-grading')) {
      setCurrentView('choiceGrading');
    } else if (path.startsWith('/question-segmentation')) {
      setCurrentView('questionSegmentation');
    } else if (path.startsWith('/image-quality')) {
      setCurrentView('imageQuality');

    } else if (path.startsWith('/analysis')) {
      setCurrentView('dataAnalysis');
    } else if (path.startsWith('/students')) {
      setCurrentView('studentManagement');
    } else {
      setCurrentView('dashboard');
    }
  }, [location.pathname, setCurrentView]);

  return (
    <Layout className="min-h-screen bg-gray-50">
      {isHeaderVisible && <Header />}
      <Layout.Content className={`p-2 sm:p-4 md:p-6 lg:p-8 ${!isHeaderVisible ? 'pt-0' : ''}`}>
        <div className="max-w-7xl mx-auto w-full">
          <ContentRouter />
        </div>
      </Layout.Content>
    </Layout>
  );
};