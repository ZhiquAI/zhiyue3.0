/**
 * 设计系统展示组件
 * 展示新设计系统的各种组件和样式
 */

import React, { useState } from 'react';
import { Card, Button, Input, Badge, Alert, Space, Typography, Divider, Tabs, Row, Col } from 'antd';
import { 
  CheckCircleOutlined, 
  ExclamationCircleOutlined, 
  InfoCircleOutlined,
  WarningOutlined,
  UserOutlined,
  SearchOutlined,
  DownloadOutlined,
  PlusOutlined
} from '@ant-design/icons';
import { cn, variants, layout, animations, buttonStyles, cardStyles, inputStyles, badgeStyles } from '../../design-system';

const { Title, Paragraph, Text } = Typography;
const { TabPane } = Tabs;

export const DesignSystemShowcase: React.FC = () => {
  const [activeTab, setActiveTab] = useState('colors');

  // 颜色展示
  const ColorPalette: React.FC = () => (
    <div className="space-y-8">
      <div>
        <Title level={4}>主色调 - Primary</Title>
        <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
          {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
            <div key={shade} className="text-center">
              <div 
                className={`w-16 h-16 rounded-lg mb-2 bg-primary-${shade}`}
                title={`primary-${shade}`}
              />
              <Text className="text-xs">{shade}</Text>
            </div>
          ))}
        </div>
      </div>

      <div>
        <Title level={4}>功能色调</Title>
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-lg mb-2 bg-success-500 mx-auto" />
              <Text>Success</Text>
            </div>
          </Col>
          <Col span={6}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-lg mb-2 bg-warning-500 mx-auto" />
              <Text>Warning</Text>
            </div>
          </Col>
          <Col span={6}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-lg mb-2 bg-error-500 mx-auto" />
              <Text>Error</Text>
            </div>
          </Col>
          <Col span={6}>
            <div className="text-center">
              <div className="w-16 h-16 rounded-lg mb-2 bg-education-500 mx-auto" />
              <Text>Info</Text>
            </div>
          </Col>
        </Row>
      </div>

      <div>
        <Title level={4}>中性色调 - Neutral</Title>
        <div className="grid grid-cols-5 md:grid-cols-11 gap-2">
          {[0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
            <div key={shade} className="text-center">
              <div 
                className={cn(
                  'w-16 h-16 rounded-lg mb-2',
                  shade === 0 ? 'bg-white border border-neutral-200' : `bg-neutral-${shade}`
                )}
                title={`neutral-${shade}`}
              />
              <Text className="text-xs">{shade}</Text>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  // 按钮展示
  const ButtonShowcase: React.FC = () => (
    <div className="space-y-8">
      <div>
        <Title level={4}>按钮变体</Title>
        <Space wrap>
          <Button type="primary" size="large">Primary</Button>
          <Button size="large">Default</Button>
          <Button type="dashed" size="large">Dashed</Button>
          <Button type="text" size="large">Text</Button>
          <Button type="link" size="large">Link</Button>
          <Button danger size="large">Danger</Button>
        </Space>
      </div>

      <div>
        <Title level={4}>按钮尺寸</Title>
        <Space wrap>
          <Button type="primary" size="small">Small</Button>
          <Button type="primary">Default</Button>
          <Button type="primary" size="large">Large</Button>
        </Space>
      </div>

      <div>
        <Title level={4}>带图标的按钮</Title>
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />}>新建</Button>
          <Button icon={<SearchOutlined />}>搜索</Button>
          <Button icon={<DownloadOutlined />}>下载</Button>
          <Button type="primary" icon={<UserOutlined />} shape="circle" />
        </Space>
      </div>

      <div>
        <Title level={4}>按钮状态</Title>
        <Space wrap>
          <Button type="primary">正常</Button>
          <Button type="primary" loading>加载中</Button>
          <Button type="primary" disabled>禁用</Button>
        </Space>
      </div>

      <div>
        <Title level={4}>使用设计系统工具类的自定义按钮</Title>
        <Space wrap>
          <button className={cn(buttonStyles.base, buttonStyles.variants.primary, buttonStyles.sizes.md)}>
            Primary Button
          </button>
          <button className={cn(buttonStyles.base, buttonStyles.variants.secondary, buttonStyles.sizes.md)}>
            Secondary Button
          </button>
          <button className={cn(buttonStyles.base, buttonStyles.variants.outline, buttonStyles.sizes.md)}>
            Outline Button
          </button>
          <button className={cn(buttonStyles.base, buttonStyles.variants.ghost, buttonStyles.sizes.md)}>
            Ghost Button
          </button>
        </Space>
      </div>
    </div>
  );

  // 卡片展示
  const CardShowcase: React.FC = () => (
    <div className="space-y-8">
      <div>
        <Title level={4}>卡片变体</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card title="默认卡片" size="small">
              <Paragraph>这是一个默认样式的卡片，使用了新的设计系统样式。</Paragraph>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card title="悬浮卡片" hoverable size="small">
              <Paragraph>这是一个可悬浮的卡片，鼠标悬停时会有阴影效果。</Paragraph>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card title="边框卡片" size="small" style={{ border: '2px solid var(--color-primary-200)' }}>
              <Paragraph>这是一个带有彩色边框的卡片。</Paragraph>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card 
              title="渐变卡片" 
              size="small"
              style={{ 
                background: 'linear-gradient(135deg, var(--color-primary-50) 0%, var(--color-education-50) 100%)' 
              }}
            >
              <Paragraph>这是一个带有渐变背景的卡片。</Paragraph>
            </Card>
          </Col>
        </Row>
      </div>

      <div>
        <Title level={4}>使用设计系统工具类的自定义卡片</Title>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={8}>
            <div className={cn(cardStyles.base, cardStyles.variants.default, cardStyles.sizes.md)}>
              <Title level={5}>默认卡片</Title>
              <Paragraph>使用设计系统工具类创建的卡片。</Paragraph>
            </div>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <div className={cn(cardStyles.base, cardStyles.variants.elevated, cardStyles.sizes.md)}>
              <Title level={5}>阴影卡片</Title>
              <Paragraph>具有强阴影效果的卡片。</Paragraph>
            </div>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <div className={cn(cardStyles.base, cardStyles.variants.interactive, cardStyles.sizes.md)}>
              <Title level={5}>交互卡片</Title>
              <Paragraph>具有交互效果的卡片。</Paragraph>
            </div>
          </Col>
        </Row>
      </div>
    </div>
  );

  // 表单组件展示
  const FormShowcase: React.FC = () => (
    <div className="space-y-8">
      <div>
        <Title level={4}>输入框</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input placeholder="默认输入框" />
          <Input placeholder="带前缀图标" prefix={<UserOutlined />} />
          <Input placeholder="带后缀图标" suffix={<SearchOutlined />} />
          <Input.Search placeholder="搜索框" onSearch={(value) => console.log(value)} />
          <Input.Password placeholder="密码框" />
        </Space>
      </div>

      <div>
        <Title level={4}>输入框状态</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Input placeholder="正常状态" />
          <Input placeholder="错误状态" status="error" />
          <Input placeholder="警告状态" status="warning" />
          <Input placeholder="禁用状态" disabled />
        </Space>
      </div>

      <div>
        <Title level={4}>使用设计系统工具类的自定义输入框</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <input 
            className={cn(inputStyles.base, inputStyles.variants.default, inputStyles.sizes.md)}
            placeholder="默认样式输入框"
          />
          <input 
            className={cn(inputStyles.base, inputStyles.variants.error, inputStyles.sizes.md)}
            placeholder="错误状态输入框"
          />
          <input 
            className={cn(inputStyles.base, inputStyles.variants.success, inputStyles.sizes.md)}
            placeholder="成功状态输入框"
          />
        </Space>
      </div>
    </div>
  );

  // 反馈组件展示
  const FeedbackShowcase: React.FC = () => (
    <div className="space-y-8">
      <div>
        <Title level={4}>徽章</Title>
        <Space wrap>
          <Badge count={5}>
            <div className="w-10 h-10 bg-neutral-200 rounded" />
          </Badge>
          <Badge count={0} showZero>
            <div className="w-10 h-10 bg-neutral-200 rounded" />
          </Badge>
          <Badge count={100}>
            <div className="w-10 h-10 bg-neutral-200 rounded" />
          </Badge>
          <Badge count={1000} overflowCount={999}>
            <div className="w-10 h-10 bg-neutral-200 rounded" />
          </Badge>
          <Badge dot>
            <div className="w-10 h-10 bg-neutral-200 rounded" />
          </Badge>
        </Space>
      </div>

      <div>
        <Title level={4}>状态徽章</Title>
        <Space wrap>
          <Badge status="success" text="成功" />
          <Badge status="error" text="错误" />
          <Badge status="warning" text="警告" />
          <Badge status="processing" text="进行中" />
          <Badge status="default" text="默认" />
        </Space>
      </div>

      <div>
        <Title level={4}>使用设计系统工具类的自定义徽章</Title>
        <Space wrap>
          <span className={cn(badgeStyles.base, badgeStyles.variants.primary, badgeStyles.sizes.md)}>
            Primary
          </span>
          <span className={cn(badgeStyles.base, badgeStyles.variants.success, badgeStyles.sizes.md)}>
            Success
          </span>
          <span className={cn(badgeStyles.base, badgeStyles.variants.warning, badgeStyles.sizes.md)}>
            Warning
          </span>
          <span className={cn(badgeStyles.base, badgeStyles.variants.error, badgeStyles.sizes.md)}>
            Error
          </span>
          <span className={cn(badgeStyles.base, badgeStyles.variants.info, badgeStyles.sizes.md)}>
            Info
          </span>
        </Space>
      </div>

      <div>
        <Title level={4}>警告提示</Title>
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            message="信息提示"
            description="这是一条信息提示，用于告知用户一般性信息。"
            type="info"
            icon={<InfoCircleOutlined />}
            showIcon
          />
          <Alert
            message="成功提示"
            description="操作成功完成，用户可以继续下一步操作。"
            type="success"
            icon={<CheckCircleOutlined />}
            showIcon
          />
          <Alert
            message="警告提示"
            description="这是一条警告信息，提醒用户注意某些情况。"
            type="warning"
            icon={<ExclamationCircleOutlined />}
            showIcon
          />
          <Alert
            message="错误提示"
            description="操作失败，请检查输入信息或联系管理员。"
            type="error"
            icon={<WarningOutlined />}
            showIcon
          />
        </Space>
      </div>
    </div>
  );

  // 布局展示
  const LayoutShowcase: React.FC = () => (
    <div className="space-y-8">
      <div>
        <Title level={4}>容器布局</Title>
        <div className={layout.container.default()}>
          <div className="bg-primary-100 p-4 rounded-lg text-center">
            默认容器 (max-width: 80rem, 响应式padding)
          </div>
        </div>
      </div>

      <div>
        <Title level={4}>网格布局</Title>
        <div className={layout.grid.responsive(1, 2, 4)}>
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="bg-primary-50 p-4 rounded-lg text-center">
              Grid Item {item}
            </div>
          ))}
        </div>
      </div>

      <div>
        <Title level={4}>Flex布局</Title>
        <div className="space-y-4">
          <div className={cn(layout.flex.between(), 'bg-neutral-50 p-4 rounded-lg')}>
            <span>左侧内容</span>
            <span>右侧内容</span>
          </div>
          <div className={cn(layout.flex.center(), 'bg-neutral-50 p-4 rounded-lg')}>
            <span>居中内容</span>
          </div>
          <div className={cn(layout.flex.column(), 'bg-neutral-50 p-4 rounded-lg space-y-2')}>
            <div>项目 1</div>
            <div>项目 2</div>
            <div>项目 3</div>
          </div>
        </div>
      </div>
    </div>
  );

  // 动画展示
  const AnimationShowcase: React.FC = () => {
    const [showAnimations, setShowAnimations] = useState(false);

    return (
      <div className="space-y-8">
        <div>
          <Title level={4}>动画效果</Title>
          <Button onClick={() => setShowAnimations(!showAnimations)} type="primary">
            {showAnimations ? '隐藏动画' : '显示动画'}
          </Button>
        </div>

        {showAnimations && (
          <div className="space-y-4">
            <div className={animations.fadeIn()}>
              <Card size="small">
                <Text>淡入动画</Text>
              </Card>
            </div>
            <div className={animations.slideIn('up')}>
              <Card size="small">
                <Text>从下滑入动画</Text>
              </Card>
            </div>
            <div className={animations.scaleIn()}>
              <Card size="small">
                <Text>缩放进入动画</Text>
              </Card>
            </div>
          </div>
        )}

        <div>
          <Title level={4}>过渡效果</Title>
          <div className="space-y-4">
            <div className={cn(
              'bg-primary-100 p-4 rounded-lg cursor-pointer',
              animations.transition(['background-color', 'transform']),
              'hover:bg-primary-200 hover:scale-105'
            )}>
              悬停查看过渡效果
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={cn(layout.container.default(), 'py-8')}>
      <div className="mb-8">
        <Title level={2}>智阅3.0设计系统</Title>
        <Paragraph>
          这是智阅3.0的设计系统展示页面，包含了所有的设计令牌、组件样式和工具类。
          设计系统基于现代化的设计原则，提供了一致、可访问和可扩展的用户界面组件。
        </Paragraph>
      </div>

      <Tabs activeKey={activeTab} onChange={setActiveTab} size="large">
        <TabPane tab="颜色系统" key="colors">
          <ColorPalette />
        </TabPane>
        <TabPane tab="按钮组件" key="buttons">
          <ButtonShowcase />
        </TabPane>
        <TabPane tab="卡片组件" key="cards">
          <CardShowcase />
        </TabPane>
        <TabPane tab="表单组件" key="forms">
          <FormShowcase />
        </TabPane>
        <TabPane tab="反馈组件" key="feedback">
          <FeedbackShowcase />
        </TabPane>
        <TabPane tab="布局工具" key="layout">
          <LayoutShowcase />
        </TabPane>
        <TabPane tab="动画效果" key="animations">
          <AnimationShowcase />
        </TabPane>
      </Tabs>
    </div>
  );
};