import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Exam, ExamStatus } from '../types/exam';
import { mockExams } from '../data/mockData';
import { examApi } from '../services/api';
import { useAsyncOperation } from '../hooks/useAsyncOperation';
import { message } from 'antd';

interface AppContextType {
  currentView: string;
  subViewInfo: { view: string | null; exam: Exam | null };
  exams: Exam[];
  loading: boolean;
  error: Error | null;
  setCurrentView: (view: string) => void;
  setSubViewInfo: (info: { view: string | null; exam: Exam | null }) => void;
  addExam: (exam: Exam) => void;
  updateExamStatus: (examId: string, status: ExamStatus) => void;
  refreshExams: () => Promise<void>;
  deleteExam: (examId: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentView, setCurrentView] = useState('landing'); // 默认显示首页
  const [subViewInfo, setSubViewInfo] = useState<{ view: string | null; exam: Exam | null }>({
    view: null,
    exam: null,
  });
  const [exams, setExams] = useState<Exam[]>(mockExams);
  
  const { state: examState, execute } = useAsyncOperation();

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
        setCurrentView,
        setSubViewInfo,
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