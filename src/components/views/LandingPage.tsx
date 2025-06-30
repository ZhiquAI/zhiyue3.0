import React, { useState, useEffect } from 'react';
import { Button, Card, Row, Col, Statistic, Avatar, Typography, Space, Divider } from 'antd';
import { 
  ArrowRight, 
  Sparkles, 
  Clock, 
  Target, 
  Users, 
  BookOpen, 
  CheckCircle, 
  Star,
  Zap,
  Shield,
  TrendingUp,
  Award,
  Brain,
  FileText,
  BarChart3,
  Lightbulb
} from 'lucide-react';
import { useAppContext } from '../../contexts/AppContext';

const { Title, Paragraph, Text } = Typography;

const LandingPage: React.FC = () => {
  const { setCurrentView } = useAppContext();
  const [currentFeature, setCurrentFeature] = useState(0);

  // 自动轮播功能特性
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentFeature(prev => (prev + 1) % 3);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleGetStarted = () => {
    setCurrentView('dashboard');
  };

  const features = [
    {
      icon: <Brain className="w-8 h-8" />,
      title: "AI智能识别",
      description: "先进的OCR技术，精准识别手写文字，准确率高达98%",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      icon: <Target className="w-8 h-8" />,
      title: "多维度评分",
      description: "基于历史学科特点，从知识点、论证能力、史料运用等维度智能评分",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      icon: <BarChart3 className="w-8 h-8" />,
      title: "深度数据分析",
      description: "生成详细的学情分析报告，为教学决策提供数据支撑",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    }
  ];

  const stats = [
    { title: "阅卷效率提升", value: "85%", suffix: "", icon: <TrendingUp className="w-6 h-6 text-blue-600" /> },
    { title: "准确率", value: "98%", suffix: "", icon: <Target className="w-6 h-6 text-green-600" /> },
    { title: "服务学校", value: "500+", suffix: "", icon: <Award className="w-6 h-6 text-purple-600" /> },
    { title: "累计阅卷", value: "100", suffix: "万份", icon: <FileText className="w-6 h-6 text-orange-600" /> }
  ];

  const testimonials = [
    {
      name: "张老师",
      school: "北京市第一中学",
      content: "智阅AI让我从繁重的阅卷工作中解脱出来，有更多时间专注于教学设计和学生指导。",
      avatar: "https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=150"
    },
    {
      name: "李老师",
      school: "上海市实验中学",
      content: "AI生成的分析报告非常详细，帮助我更好地了解学生的学习情况，调整教学策略。",
      avatar: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=150"
    },
    {
      name: "王老师",
      school: "广州市第二中学",
      content: "多维度评分标准让评分更加客观公正，学生和家长都很认可这种评分方式。",
      avatar: "https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=150"
    }
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "上传试卷",
      description: "上传试卷原件和参考答案",
      icon: <FileText className="w-6 h-6" />
    },
    {
      step: "02", 
      title: "AI配置",
      description: "智能识别题目，配置评分标准",
      icon: <Brain className="w-6 h-6" />
    },
    {
      step: "03",
      title: "批量阅卷",
      description: "上传答题卡，AI快速批阅",
      icon: <Zap className="w-6 h-6" />
    },
    {
      step: "04",
      title: "生成报告",
      description: "自动生成详细的分析报告",
      icon: <BarChart3 className="w-6 h-6" />
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-6 py-20 lg:py-32">
          <div className="text-center">
            <div className="flex justify-center mb-8">
              <div className="flex items-center gap-3 bg-white/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg">
                <Sparkles className="w-6 h-6 text-blue-600" />
                <Text className="text-lg font-semibold text-gray-800">智阅AI - 智能历史阅卷助手</Text>
              </div>
            </div>
            
            <Title level={1} className="text-5xl lg:text-7xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-6">
              让AI成为您的
              <br />
              阅卷助手
            </Title>
            
            <Paragraph className="text-xl text-gray-600 max-w-3xl mx-auto mb-12 leading-relaxed">
              专为初中历史教师设计的智能阅卷系统，结合先进的OCR识别和NLP技术，
              <br />
              让您从繁重的阅卷工作中解脱，专注于更有价值的教学活动。
            </Paragraph>
            
            <Space size="large" className="mb-16">
              <Button 
                type="primary" 
                size="large" 
                className="h-14 px-8 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
                onClick={handleGetStarted}
              >
                立即开始使用
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="large" 
                className="h-14 px-8 text-lg font-semibold border-2 border-blue-600 text-blue-600 hover:bg-blue-50 transition-all duration-300"
              >
                观看演示
              </Button>
            </Space>

            {/* Stats */}
            <Row gutter={[32, 32]} className="max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <Col xs={12} lg={6} key={index}>
                  <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
                    <div className="flex justify-center mb-3">
                      {stat.icon}
                    </div>
                    <Statistic 
                      value={stat.value} 
                      suffix={stat.suffix}
                      valueStyle={{ fontSize: '2rem', fontWeight: 'bold', color: '#1677ff' }}
                    />
                    <Text className="text-gray-600 font-medium">{stat.title}</Text>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Title level={2} className="text-4xl font-bold text-gray-900 mb-4">
              为什么选择智阅AI？
            </Title>
            <Paragraph className="text-xl text-gray-600 max-w-2xl mx-auto">
              我们深度理解历史学科特点，为您提供专业、高效、可靠的智能阅卷解决方案
            </Paragraph>
          </div>

          <Row gutter={[48, 48]}>
            <Col xs={24} lg={12}>
              <div className="space-y-8">
                {features.map((feature, index) => (
                  <Card 
                    key={index}
                    className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer ${
                      currentFeature === index ? 'ring-2 ring-blue-500 ring-opacity-50' : ''
                    }`}
                    onClick={() => setCurrentFeature(index)}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-lg ${feature.bgColor}`}>
                        <div className={feature.color}>
                          {feature.icon}
                        </div>
                      </div>
                      <div className="flex-1">
                        <Title level={4} className="mb-2">{feature.title}</Title>
                        <Paragraph className="text-gray-600 mb-0">
                          {feature.description}
                        </Paragraph>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Col>
            
            <Col xs={24} lg={12}>
              <div className="relative h-96 bg-gradient-to-br from-blue-100 to-purple-100 rounded-2xl overflow-hidden">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <div className={`inline-flex p-6 rounded-full ${features[currentFeature].bgColor} mb-4`}>
                      <div className={`${features[currentFeature].color} transform scale-150`}>
                        {features[currentFeature].icon}
                      </div>
                    </div>
                    <Title level={3} className="text-gray-800">
                      {features[currentFeature].title}
                    </Title>
                    <Paragraph className="text-gray-600 max-w-sm">
                      {features[currentFeature].description}
                    </Paragraph>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Workflow Section */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Title level={2} className="text-4xl font-bold text-gray-900 mb-4">
              简单四步，轻松阅卷
            </Title>
            <Paragraph className="text-xl text-gray-600">
              从上传试卷到生成报告，全程AI辅助，让阅卷变得简单高效
            </Paragraph>
          </div>

          <Row gutter={[32, 32]}>
            {workflowSteps.map((step, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                  <div className="mb-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                      <div className="text-blue-600">
                        {step.icon}
                      </div>
                    </div>
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {step.step}
                    </div>
                  </div>
                  <Title level={4} className="mb-3">{step.title}</Title>
                  <Paragraph className="text-gray-600">
                    {step.description}
                  </Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <Title level={2} className="text-4xl font-bold text-gray-900 mb-4">
              老师们的真实反馈
            </Title>
            <Paragraph className="text-xl text-gray-600">
              来自全国各地历史教师的使用体验分享
            </Paragraph>
          </div>

          <Row gutter={[32, 32]}>
            {testimonials.map((testimonial, index) => (
              <Col xs={24} lg={8} key={index}>
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full">
                  <div className="flex items-center mb-4">
                    <Avatar size={48} src={testimonial.avatar} className="mr-3" />
                    <div>
                      <Title level={5} className="mb-0">{testimonial.name}</Title>
                      <Text className="text-gray-500">{testimonial.school}</Text>
                    </div>
                  </div>
                  <Paragraph className="text-gray-600 italic">
                    "{testimonial.content}"
                  </Paragraph>
                  <div className="flex text-yellow-400">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-current" />
                    ))}
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Title level={2} className="text-4xl font-bold text-white mb-6">
            准备好体验智能阅卷了吗？
          </Title>
          <Paragraph className="text-xl text-blue-100 mb-8">
            加入已经在使用智阅AI的500+所学校，让AI成为您的得力助手
          </Paragraph>
          <Space size="large">
            <Button 
              type="primary" 
              size="large" 
              className="h-14 px-8 text-lg font-semibold bg-white text-blue-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300"
              onClick={handleGetStarted}
            >
              立即免费试用
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="large" 
              className="h-14 px-8 text-lg font-semibold border-2 border-white text-white hover:bg-white hover:text-blue-600 transition-all duration-300"
            >
              联系我们
            </Button>
          </Space>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-6">
          <Row gutter={[48, 48]}>
            <Col xs={24} lg={8}>
              <div className="flex items-center gap-3 mb-4">
                <Sparkles className="w-8 h-8 text-blue-400" />
                <Title level={3} className="text-white mb-0">智阅AI</Title>
              </div>
              <Paragraph className="text-gray-400 mb-4">
                专业的智能历史阅卷助手，让教学更高效，让学习更精准。
              </Paragraph>
              <div className="flex gap-4">
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer transition-colors">
                  <Users className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer transition-colors">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer transition-colors">
                  <Lightbulb className="w-5 h-5" />
                </div>
              </div>
            </Col>
            
            <Col xs={24} sm={8} lg={4}>
              <Title level={5} className="text-white mb-4">产品</Title>
              <div className="space-y-2">
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">功能特性</div>
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">价格方案</div>
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">使用案例</div>
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">API文档</div>
              </div>
            </Col>
            
            <Col xs={24} sm={8} lg={4}>
              <Title level={5} className="text-white mb-4">支持</Title>
              <div className="space-y-2">
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">帮助中心</div>
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">用户指南</div>
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">技术支持</div>
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">联系我们</div>
              </div>
            </Col>
            
            <Col xs={24} sm={8} lg={4}>
              <Title level={5} className="text-white mb-4">公司</Title>
              <div className="space-y-2">
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">关于我们</div>
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">新闻动态</div>
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">加入我们</div>
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">合作伙伴</div>
              </div>
            </Col>
            
            <Col xs={24} lg={4}>
              <Title level={5} className="text-white mb-4">法律</Title>
              <div className="space-y-2">
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">隐私政策</div>
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">服务条款</div>
                <div className="text-gray-400 hover:text-white cursor-pointer transition-colors">Cookie政策</div>
              </div>
            </Col>
          </Row>
          
          <Divider className="border-gray-800 my-8" />
          
          <div className="flex flex-col md:flex-row justify-between items-center">
            <Text className="text-gray-400">
              © 2025 智阅AI. 保留所有权利.
            </Text>
            <Text className="text-gray-400">
              让AI成为教育的助力，而非替代
            </Text>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;