import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Exam, ExamStatus } from '../types/exam';
import { mockExams } from '../data/mockData';
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import { message } from '../utils/message';

interface SubViewInfo {
  view: string | null;
  exam: Exam | null;
  source?: 'examManagement' | 'markingCenter' | null; // 来源标识
}

interface AppContextType {
  currentView: string;
  subViewInfo: SubViewInfo;
  exams: Exam[];
  loading: boolean;
  error: Error | null;
  isHeaderVisible: boolean; // 新增：控制菜单栏显示状态
  setCurrentView: (view: string) => void;
  setSubViewInfo: (info: SubViewInfo) => void;
  setHeaderVisible: (visible: boolean) => void; // 新增：设置菜单栏显示状态
  addExam: (exam: Exam) => void;
  updateExamStatus: (examId: string, status: ExamStatus) => void;
  refreshExams: () => Promise<void>;
  deleteExam: (examId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState('landing'); // 默认显示首页
  const [subViewInfo, setSubViewInfo] = useState<SubViewInfo>({
    view: null,
    exam: null,
    source: null,
  });
  const [exams, setExams] = useState<Exam[]>(mockExams);
  const [isHeaderVisible, setHeaderVisible] = useState(true); // 新增：默认显示菜单栏
  
  const { state: examState } = useAsyncOperation();

  // 初始化时加载考试数据
  useEffect(() => {
    refreshExams();
  }, []);

  const refreshExams = async () => {
    try {
      // 在实际环境中，这里会调用API
      // const response = await execute(() => examApi.getExams());
      // setExams(response.data);
      
      // 目前使用mock数据
      setExams(mockExams);
    } catch (error) {
      console.error('Failed to load exams:', error);
      // 保持使用mock数据作为fallback
      setExams(mockExams);
    }
  };

  const addExam = (exam: Exam) => {
    setExams(prev => [exam, ...prev]);
    message.success('考试创建成功！');
  };

  const updateExamStatus = (examId: string, status: ExamStatus) => {
    setExams(prev => prev.map(exam => 
      exam.id === examId ? { ...exam, status } : exam
    ));
  };

  const deleteExam = async (examId: string) => {
    try {
      // 在实际环境中调用API
      // await execute(() => examApi.deleteExam(examId));
      
      setExams(prev => prev.filter(exam => exam.id !== examId));
      message.success('考试删除成功！');
    } catch (error) {
      message.error('删除考试失败，请重试');
      throw error;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentView,
        subViewInfo,
        exams,
        loading: examState.loading,
        error: examState.error,
        isHeaderVisible, // 新增
        setCurrentView,
        setSubViewInfo,
        setHeaderVisible, // 新增
        addExam,
        updateExamStatus,
        refreshExams,
        deleteExam,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};