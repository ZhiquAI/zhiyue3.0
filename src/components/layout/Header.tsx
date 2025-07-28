import React, { useState } from 'react';
import { Layout, Menu, Avatar, Button, Drawer, Dropdown, Space, Tooltip } from 'antd';
import { 
  DesktopOutlined, 
  ProfileOutlined, 
  EditOutlined, 
  BarChartOutlined,
  UserOutlined,
  HomeOutlined,
  MenuOutlined,
  LogoutOutlined,
  SettingOutlined,
  DownOutlined,
  SwapOutlined,
  BarcodeOutlined
} from '@ant-design/icons';
import { Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { useAppContext } from '../../contexts/AppContext';
import CreateExamModal from '../modals/CreateExamModal';

const Header: React.FC = () => {
  const { currentView, setCurrentView, setSubViewInfo, subViewInfo } = useAppContext();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isCreateModalVisible, setCreateModalVisible] = useState(false);
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false);
  const [currentLogo, setCurrentLogo] = useState('sparkles');

  // Logo选项
  const logoOptions = [
    { key: 'sparkles', name: 'Sparkles图标', component: <Sparkles /> },
    { key: 'zhiyue-core', name: '智阅核心设计', component: <img src="/src/assets/logos/logo-zhiyue-core.svg" alt="智阅Logo" className="w-6 h-6" /> },
    { key: 'zhiyue-modern', name: '智阅现代风格', component: <img src="/src/assets/logos/logo-zhiyue-modern.svg" alt="智阅Logo" className="w-6 h-6" /> },
    { key: 'zhiyue-calligraphy', name: '智阅书法风格', component: <img src="/src/assets/logos/logo-zhiyue-calligraphy.svg" alt="智阅Logo" className="w-6 h-6" /> },
    { key: 'education', name: '教育科技风格', component: <img src="/src/assets/logos/logo-education.svg" alt="Logo" className="w-6 h-6" /> },
    { key: 'modern', name: '现代简约风格', component: <img src="/src/assets/logos/logo-modern.svg" alt="Logo" className="w-6 h-6" /> },
    { key: 'dynamic', name: '动态交互风格', component: <img src="/src/assets/logos/logo-dynamic.svg" alt="Logo" className="w-6 h-6" /> },
    { key: 'brand', name: '专业品牌风格', component: <img src="/src/assets/logos/logo-brand.svg" alt="Logo" className="w-6 h-6" /> }
  ];

  const getCurrentLogoComponent = () => {
    const logo = logoOptions.find(option => option.key === currentLogo);
    return logo ? logo.component : <Sparkles />;
  };

  const handleLogoSwitch = () => {
    const currentIndex = logoOptions.findIndex(option => option.key === currentLogo);
    const nextIndex = (currentIndex + 1) % logoOptions.length;
    setCurrentLogo(logoOptions[nextIndex].key);
  };

  const handleNavigate = (key: string) => {
    if (['landing', 'dashboard', 'examList', 'markingCenter', 'dataAnalysis'].includes(key)) {
      setCurrentView(key);
      setSubViewInfo({ view: null, exam: null, source: null });
      setMobileMenuVisible(false); // 关闭移动端菜单
      
      // 使用路由导航
      switch (key) {
        case 'landing':
          navigate('/');
          break;
        case 'dashboard':
          navigate('/dashboard');
          break;
        case 'examList':
          navigate('/exams');
          break;
        case 'markingCenter':
          navigate('/marking');
          break;
        case 'dataAnalysis':
          navigate('/analysis');
          break;
      }
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/auth');
    } catch (error) {
      console.error('登出失败:', error);
    }
  };

  // 用户菜单
  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => navigate('/profile')
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '账户设置',
      onClick: () => navigate('/profile')
    },
    {
      type: 'divider' as const
    },
    {
      key: 'barcode-generator',
      icon: <BarcodeOutlined />,
      label: '条形码生成器',
      onClick: () => navigate('/barcode-generator')
    },
    {
      type: 'divider' as const
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout
    }
  ];

  // 确定当前应该高亮的菜单项
  const getSelectedKey = () => {
    // 如果在子工作台中，根据子工作台类型决定高亮项
    if (subViewInfo.view) {
      switch (subViewInfo.view) {
        case 'upload':
          return 'examList'; // 上传属于考试管理
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
      <Layout.Header className="bg-white/95 backdrop-blur-sm shadow-sm flex items-center justify-between px-4 sm:px-6 sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center space-x-2">
            <div className="text-blue-600">
              {getCurrentLogoComponent()}
            </div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-800 m-0">智阅AI</h1>
            <Tooltip title={`当前Logo: ${logoOptions.find(option => option.key === currentLogo)?.name || 'Sparkles图标'}`}>
              <Button 
                type="text" 
                size="small" 
                icon={<SwapOutlined />} 
                onClick={handleLogoSwitch}
                className="text-gray-500 hover:text-blue-600"
              />
            </Tooltip>
          </div>
        </div>
        
        {/* 桌面端导航 */}
        <div className="hidden md:flex items-center gap-4">
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
        
        {/* 移动端菜单按钮 */}
        <div className="md:hidden">
          <Button 
            type="text" 
            icon={<MenuOutlined />} 
            onClick={() => setMobileMenuVisible(true)}
            className="p-2"
          />
        </div>
      </Layout.Header>
    );
  }

  return (
    <>
      <Layout.Header className="bg-white shadow-sm flex items-center justify-between px-4 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center space-x-2">
            <div 
              className="text-blue-600 cursor-pointer"
              onClick={() => handleNavigate('landing')}
            >
              {getCurrentLogoComponent()}
            </div>
            <h1
              className="text-lg sm:text-xl font-bold text-slate-800 m-0 cursor-pointer"
              onClick={() => handleNavigate('landing')}
            >
              智阅AI
            </h1>
            <Tooltip title={`当前Logo: ${logoOptions.find(option => option.key === currentLogo)?.name || 'Sparkles图标'}`}>
              <Button 
                type="text" 
                size="small" 
                icon={<SwapOutlined />} 
                onClick={handleLogoSwitch}
                className="text-gray-500 hover:text-blue-600"
              />
            </Tooltip>
          </div>
        </div>
        
        {/* 桌面端菜单 */}
        <Menu
          theme="light"
          mode="horizontal"
          selectedKeys={[getSelectedKey()]}
          onClick={({ key }) => handleNavigate(key)}
          className="border-b-0 flex-1 justify-center hidden lg:flex"
          items={[
            {
              key: 'dashboard',
              icon: <DesktopOutlined />,
              label: '工作台'
            },
            {
              key: 'examList',
              icon: <ProfileOutlined />,
              label: '考试管理'
            },
            {
              key: 'markingCenter',
              icon: <EditOutlined />,
              label: '阅卷中心'
            },
            {
              key: 'dataAnalysis',
              icon: <BarChartOutlined />,
              label: '数据分析'
            }
          ]}
        />
        
        <div className="flex items-center gap-2">
          {/* 用户信息 */}
          <div className="hidden sm:flex items-center">
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Space className="cursor-pointer hover:bg-gray-50 px-2 py-1 rounded">
                <Avatar 
                  src={user?.avatar} 
                  icon={!user?.avatar && <UserOutlined />}
                  size="small"
                />
                <span className="text-gray-700">{user?.name || '用户'}</span>
                <DownOutlined className="text-xs text-gray-400" />
              </Space>
            </Dropdown>
          </div>
          
          {/* 移动端菜单按钮 */}
          <Button 
            type="text" 
            icon={<MenuOutlined />} 
            onClick={() => setMobileMenuVisible(true)}
            className="lg:hidden p-2"
          />
        </div>
      </Layout.Header>
      
      {/* 移动端抽屉菜单 */}
      <Drawer
        title="导航菜单"
        placement="right"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        className="lg:hidden"
      >
        <Menu
          mode="vertical"
          selectedKeys={[getSelectedKey()]}
          onClick={({ key }) => handleNavigate(key)}
          className="border-r-0"
          items={[
            {
              key: 'dashboard',
              icon: <DesktopOutlined />,
              label: '工作台'
            },
            {
              key: 'examList',
              icon: <ProfileOutlined />,
              label: '考试管理'
            },
            {
              key: 'markingCenter',
              icon: <EditOutlined />,
              label: '阅卷中心'
            },
            {
              key: 'dataAnalysis',
              icon: <BarChartOutlined />,
              label: '数据分析'
            }
          ]}
        />
        
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3 mb-4">
            <Avatar 
              src={user?.avatar} 
              icon={!user?.avatar && <UserOutlined />}
            />
            <span>{user?.name || '用户'}</span>
          </div>
          
          <div className="space-y-2">
            <Button 
              type="text" 
              icon={<UserOutlined />}
              onClick={() => {
                navigate('/profile');
                setMobileMenuVisible(false);
              }}
              className="w-full text-left justify-start"
            >
              个人资料
            </Button>
            <Button 
              type="text" 
              icon={<LogoutOutlined />}
              onClick={() => {
                handleLogout();
                setMobileMenuVisible(false);
              }}
              className="w-full text-left justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              退出登录
            </Button>
          </div>
        </div>
      </Drawer>
      
      {/* 首页移动端抽屉菜单 */}
      {currentView === 'landing' && (
        <Drawer
          title="菜单"
          placement="right"
          onClose={() => setMobileMenuVisible(false)}
          open={mobileMenuVisible}
          className="md:hidden"
        >
          <div className="flex flex-col gap-4">
            <Button type="text" onClick={() => handleNavigate('dashboard')} className="text-left">
              产品功能
            </Button>
            <Button type="text" className="text-left">
              价格方案
            </Button>
            <Button type="text" className="text-left">
              帮助中心
            </Button>
            <Button type="primary" onClick={() => handleNavigate('dashboard')} className="mt-4">
              立即使用
            </Button>
          </div>
        </Drawer>
      )}
      
      <CreateExamModal
        visible={isCreateModalVisible}
        onClose={() => setCreateModalVisible(false)}
      />
    </>
  );
};

export default Header;