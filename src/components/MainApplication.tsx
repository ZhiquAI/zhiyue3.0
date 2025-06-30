import React from 'react';
import { Layout } from 'antd';
import { useAppContext } from '../contexts/AppContext';
import Header from './layout/Header';
import ContentRouter from './layout/ContentRouter';

const MainApplication: React.FC = () => {
  const { currentView, subViewInfo } = useAppContext();

  return (
    <Layout className="min-h-screen bg-gray-50">
      <Header />
      <Layout.Content className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <ContentRouter />
        </div>
      </Layout.Content>
    </Layout>
  );
};

export default MainApplication;