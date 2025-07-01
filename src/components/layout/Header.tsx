import React, { useState } from 'react';
import { Layout, Menu, Avatar, Button } from 'antd';
import { 
  DesktopOutlined, 
  ProfileOutlined, 
  EditOutlined, 
  BarChartOutlined,
  UserOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { Sparkles } from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';
import CreateExamModal from '../modals/CreateExamModal';

const Header: React.FC = () => {
  const { currentView, setCurrentView, setSubViewInfo, subViewInfo } = useAppContext();
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);

  const handleNavigate = (key: string) => {
    if (['landing', 'dashboard', 'examList', 'markingCenter', 'dataAnalysis'].includes(key)) {
      setCurrentView(key);
      setSubViewInfo({ view: null, exam: null });
    }
  };

  // 确定当前应该高亮的菜单项
  const getSelectedKey = () => {
    // 如果在子工作台中，根据子工作台类型决定高亮项
    if (subViewInfo.view) {
      switch (subViewInfo.view) {
        case 'configure':
        case 'upload':
          return 'examList'; // 配置和上传属于考试管理
        case 'marking':
          return 'markingCenter'; // 阅卷属于阅卷中心
        case 'analysis':
          return 'dataAnalysis'; // 分析属于数据分析
        default:
          return currentView;
      }
    }
    return currentView;
  };

  // 如果在首页，显示简化的导航
  if (currentView === 'landing') {
    return (
      <Layout.Header className="bg-white/95 backdrop-blur-sm shadow-sm flex items-center justify-between px-6 sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <Avatar size="large" icon={<Sparkles />} className="bg-blue-600" />
          <h1 className="text-xl font-bold text-gray-800 m-0">智阅AI</h1>
        </div>
        <div className="flex items-center gap-4">
          <Button type="text" onClick={() => handleNavigate('dashboard')}>
            产品功能
          </Button>
          <Button type="text">
            价格方案
          </Button>
          <Button type="text">
            帮助中心
          </Button>
          <Button type="primary" onClick={() => handleNavigate('dashboard')}>
            立即使用
          </Button>
        </div>
      </Layout.Header>
    );
  }

  return (
    <>
      <Layout.Header className="bg-white shadow-sm flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <Avatar 
            size="large" 
            icon={<Sparkles />} 
            className="bg-blue-600 cursor-pointer" 
            onClick={() => handleNavigate('landing')}
          />
          <h1 
            className="text-xl font-bold text-gray-800 m-0 cursor-pointer" 
            onClick={() => handleNavigate('landing')}
          >
            智阅AI
          </h1>
        </div>
        <Menu
          theme="light"
          mode="horizontal"
          selectedKeys={[getSelectedKey()]}
          onClick={({ key }) => handleNavigate(key)}
          className="border-b-0 flex-1 justify-center"
        >
          <Menu.Item key="dashboard" icon={<DesktopOutlined />}>
            工作台
          </Menu.Item>
          <Menu.Item key="examList" icon={<ProfileOutlined />}>
            考试管理
          </Menu.Item>
          <Menu.Item key="markingCenter" icon={<EditOutlined />}>
            阅卷中心
          </Menu.Item>
          <Menu.Item key="dataAnalysis" icon={<BarChartOutlined />}>
            数据分析
          </Menu.Item>
        </Menu>
        <div className="flex items-center">
          <Avatar icon={<UserOutlined />} />
          <span className="ml-2">李老师</span>
        </div>
      </Layout.Header>
      <CreateExamModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
    </>
  );
};

export default Header;