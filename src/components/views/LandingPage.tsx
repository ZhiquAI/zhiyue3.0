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
  Lightbulb,
  Play,
  ChevronDown
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
    { 
      title: "阅卷效率提升", 
      value: "85%", 
      suffix: "", 
      icon: <TrendingUp className="w-8 h-8 text-blue-600" />,
      color: "text-blue-600",
      bgGradient: "from-blue-500 to-blue-600"
    },
    { 
      title: "准确率", 
      value: "98%", 
      suffix: "", 
      icon: <Target className="w-8 h-8 text-green-600" />,
      color: "text-green-600",
      bgGradient: "from-green-500 to-green-600"
    },
    { 
      title: "服务学校", 
      value: "500+", 
      suffix: "", 
      icon: <Award className="w-8 h-8 text-purple-600" />,
      color: "text-purple-600",
      bgGradient: "from-purple-500 to-purple-600"
    },
    { 
      title: "累计阅卷", 
      value: "100", 
      suffix: "万份", 
      icon: <FileText className="w-8 h-8 text-orange-600" />,
      color: "text-orange-600",
      bgGradient: "from-orange-500 to-orange-600"
    }
  ];

  const testimonials = [
    {
      name: "张老师",
      school: "北京市第一中学",
      content: "智阅AI让我从繁重的阅卷工作中解脱出来，有更多时间专注于教学设计和学生指导。",
      avatar: "https://images.pexels.com/photos/3769021/pexels-photo-3769021.jpeg?auto=compress&cs=tinysrgb&w=150",
      rating: 5
    },
    {
      name: "李老师",
      school: "上海市实验中学",
      content: "AI生成的分析报告非常详细，帮助我更好地了解学生的学习情况，调整教学策略。",
      avatar: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=150",
      rating: 5
    },
    {
      name: "王老师",
      school: "广州市第二中学",
      content: "多维度评分标准让评分更加客观公正，学生和家长都很认可这种评分方式。",
      avatar: "https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=150",
      rating: 5
    }
  ];

  const workflowSteps = [
    {
      step: "01",
      title: "上传试卷",
      description: "上传试卷原件和参考答案",
      icon: <FileText className="w-8 h-8" />,
      color: "from-blue-500 to-blue-600"
    },
    {
      step: "02", 
      title: "AI配置",
      description: "智能识别题目，配置评分标准",
      icon: <Brain className="w-8 h-8" />,
      color: "from-green-500 to-green-600"
    },
    {
      step: "03",
      title: "批量阅卷",
      description: "上传答题卡，AI快速批阅",
      icon: <Zap className="w-8 h-8" />,
      color: "from-purple-500 to-purple-600"
    },
    {
      step: "04",
      title: "生成报告",
      description: "自动生成详细的分析报告",
      icon: <BarChart3 className="w-8 h-8" />,
      color: "from-orange-500 to-orange-600"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Hero Section - 优化标题层级 */}
      <section className="relative overflow-hidden min-h-screen flex items-center">
        {/* 背景装饰 */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-2000"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 py-20">
          <div className="text-center">
            {/* 品牌标识 - 简化设计 */}
            <div className="flex justify-center mb-12">
              <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border border-blue-100">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <Text className="text-base font-medium text-gray-700">智阅AI - 智能历史阅卷助手</Text>
              </div>
            </div>
            
            {/* 主标题 - 简洁有力 */}
            <div className="mb-8">
              <Title 
                level={1} 
                className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-bold mb-0 leading-tight tracking-tight"
                style={{ margin: 0 }}
              >
                <div className="bg-gradient-to-r from-gray-900 via-blue-800 to-gray-900 bg-clip-text text-transparent">
                  让AI成为您的
                </div>
                <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 bg-clip-text text-transparent mt-2">
                  阅卷助手
                </div>
              </Title>
            </div>
            
            {/* 副标题 - 清晰简洁 */}
            <div className="mb-16">
              <Paragraph 
                className="text-lg sm:text-xl lg:text-2xl text-gray-600 max-w-4xl mx-auto leading-relaxed font-normal"
                style={{ margin: 0 }}
              >
                专为初中历史教师设计的智能阅卷系统，结合先进的OCR识别和NLP技术
                <br className="hidden sm:block" />
                <span className="block mt-2 text-blue-700 font-medium">
                  让您从繁重的阅卷工作中解脱，专注于更有价值的教学活动
                </span>
              </Paragraph>
            </div>
            
            {/* CTA按钮 - 突出主要操作 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20">
              <Button 
                type="primary" 
                size="large" 
                className="h-14 px-10 text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 rounded-full"
                onClick={handleGetStarted}
              >
                立即开始使用
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <Button 
                size="large" 
                className="h-14 px-10 text-lg font-medium border-2 border-gray-300 text-gray-700 hover:border-blue-500 hover:text-blue-600 transition-all duration-300 rounded-full bg-white/90 backdrop-blur-sm"
              >
                <Play className="w-5 h-5 mr-2" />
                观看演示
              </Button>
            </div>

            {/* 统计数据卡片 - 简化设计 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-5xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="group">
                  <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm rounded-xl overflow-hidden transform hover:scale-105">
                    <div className="p-4 lg:p-6">
                      <div className={`w-12 h-12 lg:w-14 lg:h-14 mx-auto mb-3 rounded-xl bg-gradient-to-r ${stat.bgGradient} flex items-center justify-center shadow-md`}>
                        <div className="text-white scale-75 lg:scale-100">
                          {stat.icon}
                        </div>
                      </div>
                      <div className={`text-2xl lg:text-3xl xl:text-4xl font-bold mb-1 ${stat.color}`}>
                        {stat.value}
                        <span className="text-lg lg:text-xl">{stat.suffix}</span>
                      </div>
                      <Text className="text-gray-600 font-medium text-sm lg:text-base">{stat.title}</Text>
                    </div>
                  </Card>
                </div>
              ))}
            </div>

            {/* 滚动提示 */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
              <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 lg:py-32 bg-white relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 lg:mb-20">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-medium mb-6 text-sm">
              <Sparkles className="w-4 h-4" />
              核心优势
            </div>
            <Title level={2} className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4 lg:mb-6">
              为什么选择智阅AI？
            </Title>
            <Paragraph className="text-lg lg:text-xl text-gray-600 max-w-3xl mx-auto">
              我们深度理解历史学科特点，为您提供专业、高效、可靠的智能阅卷解决方案
            </Paragraph>
          </div>

          <Row gutter={[32, 32]} align="middle">
            <Col xs={24} lg={12}>
              <div className="space-y-6">
                {features.map((feature, index) => (
                  <Card 
                    key={index}
                    className={`border-0 shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer rounded-xl overflow-hidden ${
                      currentFeature === index ? 'ring-2 ring-blue-500 ring-opacity-50 transform scale-105' : ''
                    }`}
                    onClick={() => setCurrentFeature(index)}
                  >
                    <div className="flex items-start gap-4 p-6">
                      <div className={`p-3 rounded-xl ${feature.bgColor} shadow-md`}>
                        <div className={feature.color}>
                          {feature.icon}
                        </div>
                      </div>
                      <div className="flex-1">
                        <Title level={4} className="mb-2 text-xl">{feature.title}</Title>
                        <Paragraph className="text-gray-600 mb-0 text-base leading-relaxed">
                          {feature.description}
                        </Paragraph>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Col>
            
            <Col xs={24} lg={12}>
              <div className="relative h-[500px] bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 rounded-2xl overflow-hidden shadow-xl">
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <div className="text-center">
                    <div className={`inline-flex p-6 rounded-2xl ${features[currentFeature].bgColor} mb-6 shadow-xl`}>
                      <div className={`${features[currentFeature].color} transform scale-150`}>
                        {features[currentFeature].icon}
                      </div>
                    </div>
                    <Title level={3} className="text-gray-800 mb-3 text-2xl">
                      {features[currentFeature].title}
                    </Title>
                    <Paragraph className="text-gray-600 max-w-md text-lg leading-relaxed">
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
      <section className="py-24 lg:py-32 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 lg:mb-20">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-full font-medium mb-6 text-sm">
              <Zap className="w-4 h-4" />
              使用流程
            </div>
            <Title level={2} className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4 lg:mb-6">
              简单四步，轻松阅卷
            </Title>
            <Paragraph className="text-lg lg:text-xl text-gray-600">
              从上传试卷到生成报告，全程AI辅助，让阅卷变得简单高效
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            {workflowSteps.map((step, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <div className="relative">
                  <Card className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full rounded-xl overflow-hidden group hover:transform hover:scale-105">
                    <div className="p-6">
                      <div className="relative mb-6">
                        <div className={`w-16 h-16 mx-auto rounded-xl bg-gradient-to-r ${step.color} flex items-center justify-center shadow-lg mb-4`}>
                          <div className="text-white">
                            {step.icon}
                          </div>
                        </div>
                        <div className={`absolute -top-1 -right-1 w-8 h-8 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
                          {step.step}
                        </div>
                      </div>
                      <Title level={4} className="mb-3 text-lg">{step.title}</Title>
                      <Paragraph className="text-gray-600 text-base leading-relaxed">
                        {step.description}
                      </Paragraph>
                    </div>
                  </Card>
                  
                  {/* 连接线 */}
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-gray-300 to-gray-400 transform -translate-y-1/2 z-10">
                      <ArrowRight className="absolute -right-1 -top-2 w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-24 lg:py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 lg:mb-20">
            <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-600 px-4 py-2 rounded-full font-medium mb-6 text-sm">
              <Users className="w-4 h-4" />
              用户反馈
            </div>
            <Title level={2} className="text-3xl lg:text-5xl font-bold text-gray-900 mb-4 lg:mb-6">
              老师们的真实反馈
            </Title>
            <Paragraph className="text-lg lg:text-xl text-gray-600">
              来自全国各地历史教师的使用体验分享
            </Paragraph>
          </div>

          <Row gutter={[24, 24]}>
            {testimonials.map((testimonial, index) => (
              <Col xs={24} lg={8} key={index}>
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full rounded-xl overflow-hidden group hover:transform hover:scale-105">
                  <div className="p-6">
                    <div className="flex items-center mb-4">
                      <Avatar size={48} src={testimonial.avatar} className="mr-3 shadow-md" />
                      <div>
                        <Title level={5} className="mb-1 text-lg">{testimonial.name}</Title>
                        <Text className="text-gray-500">{testimonial.school}</Text>
                      </div>
                    </div>
                    <Paragraph className="text-gray-600 italic leading-relaxed mb-4">
                      "{testimonial.content}"
                    </Paragraph>
                    <div className="flex text-yellow-400">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 fill-current" />
                      ))}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 lg:py-32 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 relative overflow-hidden">
        {/* 背景装饰 */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-10 right-10 w-48 h-48 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-white/5 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        <div className="relative max-w-4xl mx-auto px-6 text-center">
          <div className="mb-8">
            <Title level={2} className="text-3xl lg:text-5xl font-bold text-white mb-4 lg:mb-6 leading-tight">
              准备好体验智能阅卷了吗？
            </Title>
            <Paragraph className="text-lg lg:text-xl text-blue-100 leading-relaxed">
              加入已经在使用智阅AI的500+所学校，让AI成为您的得力助手
            </Paragraph>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button 
              type="primary" 
              size="large" 
              className="h-14 px-10 text-lg font-semibold bg-white text-blue-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 rounded-full"
              onClick={handleGetStarted}
            >
              立即免费试用
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button 
              size="large" 
              className="h-14 px-10 text-lg font-medium border-2 border-white text-white hover:bg-white hover:text-blue-600 transition-all duration-300 rounded-full bg-transparent"
            >
              联系我们
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <Row gutter={[32, 32]}>
            <Col xs={24} lg={8}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-white" />
                </div>
                <Title level={3} className="text-white mb-0 text-2xl">智阅AI</Title>
              </div>
              <Paragraph className="text-gray-400 mb-4 leading-relaxed">
                专业的智能历史阅卷助手，让教学更高效，让学习更精准。
              </Paragraph>
              <div className="flex gap-3">
                {[Users, BookOpen, Lightbulb].map((Icon, index) => (
                  <div key={index} className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer transition-colors group">
                    <Icon className="w-5 h-5 group-hover:text-blue-400 transition-colors" />
                  </div>
                ))}
              </div>
            </Col>
            
            <Col xs={24} sm={8} lg={4}>
              <Title level={5} className="text-white mb-4">产品</Title>
              <div className="space-y-3">
                {['功能特性', '价格方案', '使用案例', 'API文档'].map((item, index) => (
                  <div key={index} className="text-gray-400 hover:text-white cursor-pointer transition-colors">
                    {item}
                  </div>
                ))}
              </div>
            </Col>
            
            <Col xs={24} sm={8} lg={4}>
              <Title level={5} className="text-white mb-4">支持</Title>
              <div className="space-y-3">
                {['帮助中心', '用户指南', '技术支持', '联系我们'].map((item, index) => (
                  <div key={index} className="text-gray-400 hover:text-white cursor-pointer transition-colors">
                    {item}
                  </div>
                ))}
              </div>
            </Col>
            
            <Col xs={24} sm={8} lg={4}>
              <Title level={5} className="text-white mb-4">公司</Title>
              <div className="space-y-3">
                {['关于我们', '新闻动态', '加入我们', '合作伙伴'].map((item, index) => (
                  <div key={index} className="text-gray-400 hover:text-white cursor-pointer transition-colors">
                    {item}
                  </div>
                ))}
              </div>
            </Col>
            
            <Col xs={24} lg={4}>
              <Title level={5} className="text-white mb-4">法律</Title>
              <div className="space-y-3">
                {['隐私政策', '服务条款', 'Cookie政策'].map((item, index) => (
                  <div key={index} className="text-gray-400 hover:text-white cursor-pointer transition-colors">
                    {item}
                  </div>
                ))}
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