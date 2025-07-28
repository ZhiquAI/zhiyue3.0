import React, { useState } from 'react';
import { Card, Button, Space, Typography, Row, Col, Tooltip } from 'antd';
import { CopyOutlined, DownloadOutlined, CheckOutlined } from '@ant-design/icons';
import { message } from '../../utils/message';

const { Title, Text } = Typography;

interface LogoOption {
  id: string;
  name: string;
  description: string;
  path: string;
  style: string;
  features: string[];
}

const logoOptions: LogoOption[] = [
  {
    id: 'education',
    name: '教育科技风格',
    description: '融合书本和AI芯片元素，体现教育与科技的完美结合',
    path: '/src/assets/logos/logo-education.svg',
    style: '专业稳重',
    features: ['书本图标', 'AI芯片', '智能光效', '渐变背景']
  },
  {
    id: 'modern',
    name: '现代简约风格',
    description: '简化的"智"字元素配合神经网络设计，现代感十足',
    path: '/src/assets/logos/logo-modern.svg',
    style: '简约现代',
    features: ['智字元素', '神经网络', '几何设计', '蓝紫渐变']
  },
  {
    id: 'dynamic',
    name: '动态交互风格',
    description: '大脑图标配合动画效果，展现AI的智能和活力',
    path: '/src/assets/logos/logo-dynamic.svg',
    style: '动感活力',
    features: ['大脑图标', '动画效果', '粒子系统', '交互反馈']
  },
  {
    id: 'brand',
    name: '专业品牌风格',
    description: '精致的书本设计配合AI标识，突出品牌专业性',
    path: '/src/assets/logos/logo-brand.svg',
    style: '品牌专业',
    features: ['精致书本', 'AI标识', '专业配色', '品牌感强']
  }
];

const LogoShowcase: React.FC = () => {
  const [selectedLogo, setSelectedLogo] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string>('');

  const handleCopyPath = async (path: string, id: string) => {
    try {
      await navigator.clipboard.writeText(path);
      setCopiedId(id);
      message.success('路径已复制到剪贴板');
      setTimeout(() => setCopiedId(''), 2000);
    } catch (error) {
      message.error('复制失败');
    }
  };

  const handleDownload = (path: string, name: string) => {
    // 创建下载链接
    const link = document.createElement('a');
    link.href = path;
    link.download = `zhiyue-ai-${name}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    message.success('Logo已下载');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <Title level={2} className="mb-4">
            智阅AI Logo设计方案
          </Title>
          <Text className="text-lg text-gray-600">
            为您精心设计的四种Logo方案，每种都体现了不同的设计理念和品牌特色
          </Text>
        </div>

        <Row gutter={[24, 24]}>
          {logoOptions.map((logo) => (
            <Col xs={24} lg={12} xl={6} key={logo.id}>
              <Card
                className={`h-full transition-all duration-300 hover:shadow-lg ${
                  selectedLogo === logo.id ? 'ring-2 ring-blue-500 shadow-lg' : ''
                }`}
                onClick={() => setSelectedLogo(logo.id)}
                style={{ cursor: 'pointer' }}
              >
                {/* Logo预览区域 */}
                <div className="flex justify-center mb-4 p-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg">
                  <div className="relative">
                    <img
                      src={logo.path}
                      alt={logo.name}
                      className="w-16 h-16 lg:w-20 lg:h-20"
                      style={{ filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.1))' }}
                    />
                    {selectedLogo === logo.id && (
                      <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                        <CheckOutlined className="text-white text-xs" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Logo信息 */}
                <div className="space-y-3">
                  <div>
                    <Title level={4} className="mb-1">
                      {logo.name}
                    </Title>
                    <Text className="text-blue-600 font-medium">
                      {logo.style}
                    </Text>
                  </div>

                  <Text className="text-gray-600 text-sm leading-relaxed">
                    {logo.description}
                  </Text>

                  {/* 特性标签 */}
                  <div className="flex flex-wrap gap-1">
                    {logo.features.map((feature, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-blue-50 text-blue-600 text-xs rounded-full"
                      >
                        {feature}
                      </span>
                    ))}
                  </div>

                  {/* 操作按钮 */}
                  <Space className="w-full" direction="vertical">
                    <Button
                      type="primary"
                      icon={copiedId === logo.id ? <CheckOutlined /> : <CopyOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCopyPath(logo.path, logo.id);
                      }}
                      className="w-full"
                      disabled={copiedId === logo.id}
                    >
                      {copiedId === logo.id ? '已复制' : '复制路径'}
                    </Button>
                    <Button
                      icon={<DownloadOutlined />}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownload(logo.path, logo.id);
                      }}
                      className="w-full"
                    >
                      下载SVG
                    </Button>
                  </Space>
                </div>
              </Card>
            </Col>
          ))}
        </Row>

        {/* 使用说明 */}
        <Card className="mt-8">
          <Title level={3} className="mb-4">
            使用说明
          </Title>
          <div className="space-y-4 text-gray-600">
            <div>
              <Text strong>1. 选择Logo方案：</Text>
              <Text className="ml-2">点击任意Logo卡片进行选择，查看详细信息</Text>
            </div>
            <div>
              <Text strong>2. 复制路径：</Text>
              <Text className="ml-2">点击"复制路径"按钮，获取SVG文件的引用路径</Text>
            </div>
            <div>
              <Text strong>3. 下载文件：</Text>
              <Text className="ml-2">点击"下载SVG"按钮，将Logo文件保存到本地</Text>
            </div>
            <div>
              <Text strong>4. 应用到项目：</Text>
              <Text className="ml-2">将选中的Logo路径替换到Header组件中的Sparkles图标</Text>
            </div>
          </div>
        </Card>

        {/* 技术特性 */}
        <Card className="mt-6">
          <Title level={3} className="mb-4">
            技术特性
          </Title>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} lg={6}>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-blue-600 font-bold">SVG</span>
                </div>
                <Text strong>矢量格式</Text>
                <br />
                <Text className="text-sm text-gray-600">无损缩放，适配所有尺寸</Text>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-green-600 font-bold">CSS</span>
                </div>
                <Text strong>样式可控</Text>
                <br />
                <Text className="text-sm text-gray-600">支持CSS样式和动画效果</Text>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-purple-600 font-bold">响应</span>
                </div>
                <Text strong>响应式设计</Text>
                <br />
                <Text className="text-sm text-gray-600">完美适配移动端和桌面端</Text>
              </div>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <div className="text-center p-4">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="text-orange-600 font-bold">轻量</span>
                </div>
                <Text strong>文件轻量</Text>
                <br />
                <Text className="text-sm text-gray-600">文件小，加载速度快</Text>
              </div>
            </Col>
          </Row>
        </Card>
      </div>
    </div>
  );
};

export default LogoShowcase;