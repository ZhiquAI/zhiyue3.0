import { Exam, Question, Rubric, MarkingData } from '../types/exam';

export const mockExams: Exam[] = [
  {
    id: '4',
    name: '经开区八年级历史期末',
    subject: '历史',
    grade: '八年级',
    status: '已完成',
    createdAt: '2025-06-25',
    tasks: { total: 980, completed: 980, hasError: false },
    avgScore: 85.2
  },
  {
    id: '1',
    name: '初二期中 · 中国古代史',
    subject: '历史',
    grade: '初二',
    status: '待配置',
    createdAt: '2025-06-28',
    tasks: { total: 0, completed: 0, hasError: false },
    avgScore: null
  },
  {
    id: '2',
    name: '高一月考 · 世界近代史',
    subject: '历史',
    grade: '高一',
    status: '待阅卷',
    createdAt: '2025-06-27',
    tasks: { total: 1251, completed: 0, hasError: true, errorCount: 7 },
    avgScore: null
  },
  {
    id: '3',
    name: '初三模拟 · 中国近现代史',
    subject: '历史',
    grade: '初三',
    status: '阅卷中',
    createdAt: '2025-06-26',
    tasks: { total: 850, completed: 320, hasError: false },
    avgScore: null
  }
];

export const mockConfigureData = {
  questions: [
    {
      id: 'q13',
      title: '第13题：中国现代史成就',
      type: '问答题',
      points: 11,
      area: { top: '33%', left: '5%', width: '45%', height: '30%' },
      answer: '（1）1953年，武汉长江大桥；1964年，邓稼先。（2）方式：公私合营；创举：赎买政策...'
    },
    {
      id: 'q14',
      title: '第14题：国防与军队现代化',
      type: '问答题',
      points: 11,
      area: { top: '5%', left: '50%', width: '45%', height: '45%' },
      answer: '（1）"中国梦"蓝图：实现国家富强、民族振兴、人民幸福。（2）军种：火箭军；成就：成立五大战区...'
    },
    {
      id: 'q15',
      title: '第15题：民族政策与外交成就',
      type: '材料分析题',
      points: 14,
      area: { top: '52%', left: '50%', width: '45%', height: '45%' },
      answer: '（1）政策：民族区域自治制度；历史意义：促进了西藏地区的经济发展...'
    }
  ] as Question[],
  rubrics: {
    q13: {
      dimensions: [
        {
          id: 'k1',
          name: '关键成就识别',
          points: 4,
          guide: '识别关键历史事件和成就',
          keywords: ['1953', '武汉长江大桥', '邓稼先']
        },
        {
          id: 'k2',
          name: '改造方式与影响',
          points: 4,
          guide: '理解三大改造的方式与历史影响',
          keywords: ['公私合营', '赎买政策', '社会主义制度']
        },
        {
          id: 'k3',
          name: '农村改革',
          points: 3,
          guide: '理解家庭联产承包责任制',
          keywords: ['家庭联产承包责任制', '生产力解放']
        }
      ]
    },
    q14: {
      dimensions: [
        {
          id: 'k1',
          name: '核心概念理解',
          points: 5,
          guide: '理解"中国梦"与军队建设的关系',
          keywords: ['中国梦', '绝对领导']
        },
        {
          id: 'k2',
          name: '国防现代化成就',
          points: 3,
          guide: '识别新时期的国防成就',
          keywords: ['火箭军', '五大战区']
        },
        {
          id: 'k3',
          name: '军民关系',
          points: 3,
          guide: '阐述军队建设与经济发展的辩证关系',
          keywords: ['经济基础', '安全保障']
        }
      ]
    },
    q15: {
      dimensions: [
        {
          id: 'k1',
          name: '民族政策',
          points: 5,
          guide: '理解民族区域自治制度及其意义',
          keywords: ['民族区域自治', '西藏', '经济发展']
        },
        {
          id: 'k2',
          name: '一国两制',
          points: 5,
          guide: '理解一国两制的构想与实践',
          keywords: ['一国两制', '香港', '澳门', '九二共识']
        },
        {
          id: 'k3',
          name: '外交政策',
          points: 4,
          guide: '理解独立自主的和平外交政策',
          keywords: ['独立自主', '和平共处五项原则']
        }
      ]
    }
  } as Record<string, Rubric>
};

export const mockMarkingData: MarkingData = {
  studentId: '2024001',
  studentName: '王同学',
  objectiveScore: 22,
  subjectiveScores: {
    q13: {
      totalScore: 9,
      dimensionScores: [
        { id: 'k1', score: 4, reason: '关键成就识别准确完整。' },
        { id: 'k2', score: 3, reason: '对改造方式理解正确，但对影响的阐述不够深入。' },
        { id: 'k3', score: 2, reason: '点出了家庭联产承包责任制，但未阐述其影响。' }
      ]
    },
    q14: {
      totalScore: 7,
      dimensionScores: [
        { id: 'k1', score: 3, reason: '对"中国梦"的理解较为到位。' },
        { id: 'k2', score: 2, reason: '准确提及火箭军和五大战区。' },
        { id: 'k3', score: 2, reason: '能简单阐述军民关系，但辩证思考不足。' }
      ]
    },
    q15: {
      totalScore: 10,
      dimensionScores: [
        { id: 'k1', score: 4, reason: '对民族区域自治制度理解到位。' },
        { id: 'k2', score: 3, reason: '一国两制理解基本正确。' },
        { id: 'k3', score: 3, reason: '外交政策表述准确。' }
      ]
    }
  }
};

export const mockAnalysisData = {
  gradeOverview: {
    studentCount: 850,
    avgScore: 85.2,
    passRate: 91.5,
    excellentRate: 65.4,
    classCompare: [
      { name: '初二(1)班', '平均分': 88.2, '优秀率': 72.5 },
      { name: '初二(2)班', '平均分': 86.1, '优秀率': 68.0 },
      { name: '初二(3)班', '平均分': 84.5, '优秀率': 64.3 },
      { name: '初二(4)班', '平均分': 82.0, '优秀率': 56.8 }
    ],
    abilityData: [
      { ability: '历史知识点', '平均得分率': 85 },
      { ability: '论证与分析', '平均得分率': 72 },
      { ability: '史料运用', '平均得分率': 65 },
      { ability: '逻辑结构', '平均得分率': 78 },
      { ability: '语言表达', '平均得分率': 90 }
    ],
    aiSuggestion: '分析显示，年级整体在"史料运用"和"论证与分析"两个高阶能力维度上失分较为严重。建议教研组后续组织专题教研活动，重点探讨如何提升学生的史料实证和逻辑论证能力。'
  },
  classOverview: {
    className: '初二(3)班',
    studentCount: 45,
    avgScore: 84.5,
    passRate: 90.1,
    excellentRate: 64.3,
    students: [
      { key: 's1', name: '张三', score: 95, rank: 1 },
      { key: 's2', name: '李四', score: 92, rank: 2 },
      { key: 's3', name: '王五', score: 76, rank: 15 }
    ],
    abilityData: [
      { ability: '历史知识点', '班级得分率': 88, '年级得分率': 85 },
      { ability: '论证与分析', '班级得分率': 68, '年级得分率': 72 },
      { ability: '史料运用', '班级得分率': 62, '年级得分率': 65 }
    ],
    aiSuggestion: '本班在"历史知识点"掌握上优于年级平均水平，值得肯定。但在"史料运用"能力上略低于年级均分，且班内学生表现分化较大。建议对该能力暂弱的同学进行分组辅导，并可将优秀同学的答案作为范例进行讲解。'
  },
  personalReport: {
    studentName: '王五',
    score: 76,
    classRank: 15,
    gradeRank: 231,
    abilityData: [
      { ability: '历史知识点', '个人得分率': 80, '班级得分率': 88 },
      { ability: '论证与分析', '个人得分率': 60, '班级得分率': 68 },
      { ability: '史料运用', '个人得分率': 55, '班级得分率': 62 }
    ],
    aiSuggestion: '王五同学对基础知识掌握较好，但史料分析和逻辑论证能力是其主要短板。建议加强对材料题的专项训练，引导其学习如何从材料中提取有效信息，并用史实支撑观点。可提供一些优秀答案范例供其模仿学习。'
  }
};

export const mockNotifications = [
  {
    color: 'green',
    text: '"经开区八年级历史期末"已完成阅卷，分析报告已生成。',
    time: '2小时前'
  },
  {
    color: 'blue',
    text: 'AI已完成"初三模拟 · 中国近现代史"的初步阅卷，请您开始复核。',
    time: '5小时前'
  },
  {
    color: 'orange',
    text: '"高一月考 · 世界近代史"的答题卡有7份识别失败，需要您人工处理。',
    time: '1天前'
  }
];

export const mockScoreTrendData = [
  { name: '三月月考', '历史平均分': 82.1 },
  { name: '四月联考', '历史平均分': 85.3 },
  { name: '期中考试', '历史平均分': 83.5 },
  { name: '期末考试', '历史平均分': 85.2 }
];