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
      icon: <Brain className="w-5 h-5 lg:w-6 lg:h-6" />,
      title: "AI智能识别",
      description: "先进的OCR技术，精准识别手写文字，准确率高达98%",
      color: "text-slate-600",
      bgColor: "bg-slate-50"
    },
    {
      icon: <Target className="w-5 h-5 lg:w-6 lg:h-6" />,
      title: "多维度评分",
      description: "基于历史学科特点，从知识点、论证能力、史料运用等维度智能评分",
      color: "text-emerald-600",
      bgColor: "bg-emerald-50"
    },
    {
      icon: <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6" />,
      title: "深度数据分析",
      description: "生成详细的学情分析报告，为教学决策提供数据支撑",
      color: "text-indigo-600",
      bgColor: "bg-indigo-50"
    }
  ];

  const stats = [
    {
      title: "阅卷效率提升",
      value: "85%",
      suffix: "",
      icon: <TrendingUp className="w-4 h-4 lg:w-5 lg:h-5" />,
      color: "text-slate-700",
      bgGradient: "from-slate-400 to-slate-500"
    },
    {
      title: "准确率",
      value: "98%",
      suffix: "",
      icon: <Target className="w-4 h-4 lg:w-5 lg:h-5" />,
      color: "text-emerald-700",
      bgGradient: "from-emerald-400 to-emerald-500"
    },
    {
      title: "服务学校",
      value: "500+",
      suffix: "",
      icon: <Award className="w-4 h-4 lg:w-5 lg:h-5" />,
      color: "text-indigo-700",
      bgGradient: "from-indigo-400 to-indigo-500"
    },
    {
      title: "累计阅卷",
      value: "100",
      suffix: "万份",
      icon: <FileText className="w-4 h-4 lg:w-5 lg:h-5" />,
      color: "text-amber-700",
      bgGradient: "from-amber-400 to-amber-500"
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
      icon: <FileText className="w-5 h-5 lg:w-6 lg:h-6" />,
      color: "from-slate-400 to-slate-500"
    },
    {
      step: "02",
      title: "AI配置",
      description: "智能识别题目，配置评分标准",
      icon: <Brain className="w-5 h-5 lg:w-6 lg:h-6" />,
      color: "from-emerald-400 to-emerald-500"
    },
    {
      step: "03",
      title: "批量阅卷",
      description: "上传答题卡，AI快速批阅",
      icon: <Zap className="w-5 h-5 lg:w-6 lg:h-6" />,
      color: "from-indigo-400 to-indigo-500"
    },
    {
      step: "04",
      title: "生成报告",
      description: "自动生成详细的分析报告",
      icon: <BarChart3 className="w-5 h-5 lg:w-6 lg:h-6" />,
      color: "from-amber-400 to-amber-500"
    }
  ];

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50">
      {/* Hero Section - 全屏高度，完美居中，优化设计 */}
      <section className="relative min-h-screen w-full flex items-center justify-center overflow-hidden">
        {/* 动态背景装饰 - 宽屏优化 */}
        <div className="absolute inset-0 w-full h-full">
          <div className="absolute top-10 left-[10%] w-32 h-32 lg:w-72 lg:h-72 xl:w-96 xl:h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse"></div>
          <div className="absolute top-20 right-[10%] w-32 h-32 lg:w-72 lg:h-72 xl:w-96 xl:h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-1000"></div>
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 w-32 h-32 lg:w-72 lg:h-72 xl:w-96 xl:h-96 bg-pink-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse delay-2000"></div>
          <div className="absolute top-1/2 left-[15%] w-24 h-24 lg:w-48 lg:h-48 xl:w-64 xl:h-64 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-3000"></div>
          <div className="absolute top-1/3 right-[15%] w-24 h-24 lg:w-48 lg:h-48 xl:w-64 xl:h-64 bg-yellow-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse delay-4000"></div>
        </div>
        
        <div className="relative w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-12 lg:py-20">
          <div className="text-center">
            {/* 主标题 - 优化字号 */}
            <div className="mb-6 lg:mb-8 xl:mb-10">
              <Title
                level={1}
                className="font-bold mb-0 leading-tight tracking-wide"
                style={{
                  margin: 0,
                  fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                  lineHeight: '1.1'
                }}
              >
                <div className="bg-gradient-to-r from-slate-600 via-indigo-600 to-slate-700 bg-clip-text text-transparent">
                  智阅AI
                </div>
              </Title>
            </div>
            
            {/* 副标题 - 优化字号 */}
            <div className="mb-8 lg:mb-10 xl:mb-12">
              <Paragraph
                className="text-slate-600 max-w-4xl mx-auto leading-relaxed font-medium"
                style={{
                  margin: 0,
                  fontSize: 'clamp(1.125rem, 2.5vw, 1.5rem)',
                  lineHeight: '1.4'
                }}
              >
                专为初中历史教师设计的智能阅卷助手
              </Paragraph>
            </div>
            
            {/* CTA按钮 - 优化设计 */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 lg:gap-6 mb-12 lg:mb-16 xl:mb-20">
              <Button
                type="primary"
                size="large"
                className="w-full sm:w-auto h-12 lg:h-14 px-8 lg:px-10 text-base lg:text-lg font-medium bg-gradient-to-r from-slate-600 to-indigo-600 border-0 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 rounded-lg"
                onClick={handleGetStarted}
              >
                立即开始使用
                <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5 ml-2" />
              </Button>
              <Button
                size="large"
                className="w-full sm:w-auto h-12 lg:h-14 px-8 lg:px-10 text-base lg:text-lg font-medium border-2 border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 transition-all duration-300 rounded-lg bg-white/90 backdrop-blur-sm"
              >
                <Play className="w-4 h-4 lg:w-5 lg:h-5 mr-2" />
                观看演示
              </Button>
            </div>

            {/* 统计数据卡片 - 优化布局 */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 max-w-6xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="group">
                  <Card className="text-center border-0 shadow-md hover:shadow-lg transition-all duration-300 bg-white/95 backdrop-blur-sm rounded-xl overflow-hidden transform hover:scale-105 h-full">
                    <div className="p-4 lg:p-6">
                      <div className={`w-12 h-12 lg:w-14 lg:h-14 mx-auto mb-3 lg:mb-4 rounded-xl bg-gradient-to-r ${stat.bgGradient} flex items-center justify-center shadow-sm`}>
                        <div className="text-white">
                          {stat.icon}
                        </div>
                      </div>
                      <div className={`text-2xl lg:text-3xl font-bold mb-1 ${stat.color}`}>
                        {stat.value}
                        <span className="text-base lg:text-lg">{stat.suffix}</span>
                      </div>
                      <Text className="text-slate-600 font-medium text-sm lg:text-base">{stat.title}</Text>
                    </div>
                  </Card>
                </div>
              ))}
            </div>

            {/* 滚动提示 - 仅在大屏显示 */}
            <div className="hidden lg:block absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
              <div className="w-6 h-10 border-2 border-gray-400 rounded-full flex justify-center">
                <div className="w-1 h-3 bg-gray-400 rounded-full mt-2 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section - 宽屏优化 */}
      <section className="w-full py-16 lg:py-24 xl:py-32 2xl:py-40 bg-white relative">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="text-center mb-12 lg:mb-16 xl:mb-20 2xl:mb-24">
            <div className="inline-flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-full font-medium mb-4 lg:mb-6 text-sm lg:text-base">
              <Sparkles className="w-4 h-4 lg:w-5 lg:h-5" />
              核心优势
            </div>
            <Title level={2} className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-gray-900 mb-3 lg:mb-4 xl:mb-6">
              为什么选择智阅AI？
            </Title>
            <Paragraph className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-600 max-w-4xl mx-auto">
              我们深度理解历史学科特点，为您提供专业、高效、可靠的智能阅卷解决方案
            </Paragraph>
          </div>

          <Row gutter={[24, 32]} align="middle" className="lg:gutter-32">
            <Col xs={24} lg={12}>
              <div className="space-y-4 lg:space-y-6">
                {features.map((feature, index) => (
                  <Card
                    key={index}
                    className={`border-0 shadow-md hover:shadow-lg transition-all duration-300 cursor-pointer rounded-xl overflow-hidden ${
                      currentFeature === index ? 'ring-2 ring-indigo-400 ring-opacity-50 transform scale-105' : ''
                    }`}
                    onClick={() => setCurrentFeature(index)}
                  >
                    <div className="flex items-start gap-4 lg:gap-5 p-5 lg:p-6">
                      <div className={`p-3 lg:p-4 rounded-xl ${feature.bgColor} shadow-sm flex-shrink-0`}>
                        <div className={feature.color}>
                          {feature.icon}
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <Title level={4} className="mb-2 text-lg lg:text-xl text-slate-800">{feature.title}</Title>
                        <Paragraph className="text-slate-600 mb-0 text-sm lg:text-base leading-relaxed">
                          {feature.description}
                        </Paragraph>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </Col>
            
            <Col xs={24} lg={12}>
              <div className="relative h-64 sm:h-80 lg:h-[400px] bg-gradient-to-br from-slate-100 via-indigo-100 to-slate-200 rounded-2xl overflow-hidden shadow-lg">
                <div className="absolute inset-0 flex items-center justify-center p-6 lg:p-8">
                  <div className="text-center">
                    <div className={`inline-flex p-5 lg:p-6 rounded-2xl ${features[currentFeature].bgColor} mb-4 lg:mb-6 shadow-lg`}>
                      <div className={`${features[currentFeature].color} transform scale-150 lg:scale-175`}>
                        {features[currentFeature].icon}
                      </div>
                    </div>
                    <Title level={3} className="text-slate-800 mb-3 lg:mb-4 text-xl lg:text-2xl">
                      {features[currentFeature].title}
                    </Title>
                    <Paragraph className="text-slate-600 max-w-md text-base lg:text-lg leading-relaxed">
                      {features[currentFeature].description}
                    </Paragraph>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      </section>

      {/* Workflow Section - 宽屏优化 */}
      <section className="w-full py-16 lg:py-24 xl:py-32 2xl:py-40 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="text-center mb-12 lg:mb-16 xl:mb-20 2xl:mb-24">
            <div className="inline-flex items-center gap-2 bg-green-50 text-green-600 px-4 py-2 rounded-full font-medium mb-4 lg:mb-6 text-sm lg:text-base">
              <Zap className="w-4 h-4 lg:w-5 lg:h-5" />
              使用流程
            </div>
            <Title level={2} className="text-2xl sm:text-3xl lg:text-4xl font-bold text-slate-800 mb-4 lg:mb-6">
              简单四步，轻松阅卷
            </Title>
            <Paragraph className="text-base sm:text-lg lg:text-xl text-slate-600">
              从上传试卷到生成报告，全程AI辅助，让阅卷变得简单高效
            </Paragraph>
          </div>

          <Row gutter={[24, 32]} className="lg:gutter-32">
            {workflowSteps.map((step, index) => (
              <Col xs={24} sm={12} lg={6} key={index}>
                <div className="relative h-full">
                  <Card className="text-center border-0 shadow-md hover:shadow-lg transition-all duration-300 h-full rounded-xl overflow-hidden group hover:transform hover:scale-105">
                    <div className="p-5 lg:p-6">
                      <div className="relative mb-5 lg:mb-6">
                        <div className={`w-14 h-14 lg:w-16 lg:h-16 mx-auto rounded-xl bg-gradient-to-r ${step.color} flex items-center justify-center shadow-md mb-4 lg:mb-5`}>
                          <div className="text-white">
                            {step.icon}
                          </div>
                        </div>
                        <div className={`absolute -top-1 -right-1 w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-gradient-to-r ${step.color} flex items-center justify-center text-white font-bold text-xs lg:text-sm shadow-sm`}>
                          {step.step}
                        </div>
                      </div>
                      <Title level={4} className="mb-3 lg:mb-4 text-base lg:text-lg text-slate-800">{step.title}</Title>
                      <Paragraph className="text-slate-600 text-sm lg:text-base leading-relaxed">
                        {step.description}
                      </Paragraph>
                    </div>
                  </Card>

                  {/* 连接线 - 优化设计 */}
                  {index < workflowSteps.length - 1 && (
                    <div className="hidden lg:block absolute top-1/2 -right-4 w-8 h-0.5 bg-gradient-to-r from-slate-300 to-slate-400 transform -translate-y-1/2 z-10">
                      <ArrowRight className="absolute -right-1 -top-2 w-4 h-4 text-slate-400" />
                    </div>
                  )}
                </div>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* Testimonials Section - 宽屏优化 */}
      <section className="w-full py-16 lg:py-24 xl:py-32 2xl:py-40 bg-white">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <div className="text-center mb-12 lg:mb-16 xl:mb-20 2xl:mb-24">
            <div className="inline-flex items-center gap-2 bg-purple-50 text-purple-600 px-4 py-2 rounded-full font-medium mb-4 lg:mb-6 text-sm lg:text-base">
              <Users className="w-4 h-4 lg:w-5 lg:h-5" />
              用户反馈
            </div>
            <Title level={2} className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-gray-900 mb-3 lg:mb-4 xl:mb-6">
              老师们的真实反馈
            </Title>
            <Paragraph className="text-base sm:text-lg lg:text-xl xl:text-2xl text-gray-600">
              来自全国各地历史教师的使用体验分享
            </Paragraph>
          </div>

          <Row gutter={[24, 32]} className="lg:gutter-32 xl:gutter-48">
            {testimonials.map((testimonial, index) => (
              <Col xs={24} lg={8} key={index}>
                <Card className="border-0 shadow-lg hover:shadow-xl transition-all duration-300 h-full rounded-xl overflow-hidden group hover:transform hover:scale-105">
                  <div className="p-4 lg:p-6 xl:p-8">
                    <div className="flex items-center mb-3 lg:mb-4 xl:mb-6">
                      <Avatar size={40} src={testimonial.avatar} className="mr-3 shadow-md lg:w-12 lg:h-12 xl:w-14 xl:h-14" />
                      <div>
                        <Title level={5} className="mb-1 text-base lg:text-lg xl:text-xl">{testimonial.name}</Title>
                        <Text className="text-gray-500 text-sm lg:text-base">{testimonial.school}</Text>
                      </div>
                    </div>
                    <Paragraph className="text-gray-600 italic leading-relaxed mb-3 lg:mb-4 xl:mb-6 text-sm lg:text-base xl:text-lg">
                      "{testimonial.content}"
                    </Paragraph>
                    <div className="flex text-yellow-400">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 fill-current" />
                      ))}
                    </div>
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </div>
      </section>

      {/* CTA Section - 宽屏优化 */}
      <section className="w-full py-16 lg:py-24 xl:py-32 2xl:py-40 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-800 relative overflow-hidden">
        {/* 背景装饰 - 宽屏优化 */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-[10%] w-16 h-16 lg:w-32 lg:h-32 xl:w-48 xl:h-48 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute bottom-10 right-[10%] w-24 h-24 lg:w-48 lg:h-48 xl:w-64 xl:h-64 bg-white/10 rounded-full blur-xl"></div>
          <div className="absolute top-1/2 left-1/2 w-32 h-32 lg:w-64 lg:h-64 xl:w-96 xl:h-96 bg-white/5 rounded-full blur-2xl transform -translate-x-1/2 -translate-y-1/2"></div>
        </div>
        
        <div className="relative max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 text-center">
          <div className="mb-6 lg:mb-8 xl:mb-12">
            <Title level={2} className="text-2xl sm:text-3xl lg:text-4xl xl:text-5xl 2xl:text-6xl font-bold text-white mb-3 lg:mb-4 xl:mb-6 leading-tight">
              准备好体验智能阅卷了吗？
            </Title>
            <Paragraph className="text-base sm:text-lg lg:text-xl xl:text-2xl text-blue-100 leading-relaxed max-w-4xl mx-auto">
              加入已经在使用智阅AI的500+所学校，让AI成为您的得力助手
            </Paragraph>
          </div>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 lg:gap-4 xl:gap-6">
            <Button 
              type="primary" 
              size="large" 
              className="w-full sm:w-auto h-12 lg:h-14 xl:h-16 px-8 lg:px-10 xl:px-12 text-lg lg:text-xl xl:text-2xl font-semibold bg-white text-blue-600 border-0 shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:scale-105 rounded-full"
              onClick={handleGetStarted}
            >
              立即免费试用
              <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6 ml-2" />
            </Button>
            <Button 
              size="large" 
              className="w-full sm:w-auto h-12 lg:h-14 xl:h-16 px-8 lg:px-10 xl:px-12 text-lg lg:text-xl xl:text-2xl font-medium border-2 border-white text-white hover:bg-white hover:text-blue-600 transition-all duration-300 rounded-full bg-transparent"
            >
              联系我们
            </Button>
          </div>
        </div>
      </section>

      {/* Footer - 宽屏优化 */}
      <footer className="w-full bg-gray-900 text-white py-12 lg:py-16 xl:py-20">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16">
          <Row gutter={[24, 32]} className="lg:gutter-48 xl:gutter-64">
            <Col xs={24} lg={8}>
              <div className="flex items-center gap-3 mb-4 lg:mb-6">
                <div className="w-8 h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <Sparkles className="w-5 h-5 lg:w-6 lg:h-6 xl:w-7 xl:h-7 text-white" />
                </div>
                <Title level={3} className="text-white mb-0 text-xl lg:text-2xl xl:text-3xl">智阅AI</Title>
              </div>
              <Paragraph className="text-gray-400 mb-4 lg:mb-6 leading-relaxed text-sm lg:text-base xl:text-lg">
                专业的智能历史阅卷助手，让教学更高效，让学习更精准。
              </Paragraph>
              <div className="flex gap-3 lg:gap-4">
                {[Users, BookOpen, Lightbulb].map((Icon, index) => (
                  <div key={index} className="w-8 h-8 lg:w-10 lg:h-10 xl:w-12 xl:h-12 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-gray-700 cursor-pointer transition-colors group">
                    <Icon className="w-4 h-4 lg:w-5 lg:h-5 xl:w-6 xl:h-6 group-hover:text-blue-400 transition-colors" />
                  </div>
                ))}
              </div>
            </Col>
            
            <Col xs={24} sm={8} lg={4}>
              <Title level={5} className="text-white mb-4 lg:mb-6 text-lg lg:text-xl">产品</Title>
              <div className="space-y-3 lg:space-y-4">
                {['功能特性', '价格方案', '使用案例', 'API文档'].map((item, index) => (
                  <div key={index} className="text-gray-400 hover:text-white cursor-pointer transition-colors text-sm lg:text-base xl:text-lg">
                    {item}
                  </div>
                ))}
              </div>
            </Col>
            
            <Col xs={24} sm={8} lg={4}>
              <Title level={5} className="text-white mb-4 lg:mb-6 text-lg lg:text-xl">支持</Title>
              <div className="space-y-3 lg:space-y-4">
                {['帮助中心', '用户指南', '技术支持', '联系我们'].map((item, index) => (
                  <div key={index} className="text-gray-400 hover:text-white cursor-pointer transition-colors text-sm lg:text-base xl:text-lg">
                    {item}
                  </div>
                ))}
              </div>
            </Col>
            
            <Col xs={24} sm={8} lg={4}>
              <Title level={5} className="text-white mb-4 lg:mb-6 text-lg lg:text-xl">公司</Title>
              <div className="space-y-3 lg:space-y-4">
                {['关于我们', '新闻动态', '加入我们', '合作伙伴'].map((item, index) => (
                  <div key={index} className="text-gray-400 hover:text-white cursor-pointer transition-colors text-sm lg:text-base xl:text-lg">
                    {item}
                  </div>
                ))}
              </div>
            </Col>
            
            <Col xs={24} lg={4}>
              <Title level={5} className="text-white mb-4 lg:mb-6 text-lg lg:text-xl">法律</Title>
              <div className="space-y-3 lg:space-y-4">
                {['隐私政策', '服务条款', 'Cookie政策'].map((item, index) => (
                  <div key={index} className="text-gray-400 hover:text-white cursor-pointer transition-colors text-sm lg:text-base xl:text-lg">
                    {item}
                  </div>
                ))}
              </div>
            </Col>
          </Row>
          
          <Divider className="border-gray-800 my-6 lg:my-8 xl:my-12" />
          
          <div className="flex flex-col md:flex-row justify-between items-center text-sm lg:text-base xl:text-lg">
            <Text className="text-gray-400 mb-2 md:mb-0">
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