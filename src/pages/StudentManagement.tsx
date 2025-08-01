import React, { useState, useEffect } from 'react';
import { studentApi, Student, StudentCreate, StudentUpdate, StudentStatistics, BatchImportResult, ExamHall, ArrangementConfig, ArrangementResult } from '../api/studentApi';
import {
  PlusOutlined,
  UploadOutlined,
  DownloadOutlined,
  EditOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  ThunderboltOutlined,
  DownOutlined,
  UserOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  HomeOutlined,
  BankOutlined
} from '@ant-design/icons';

interface StudentManagementProps {
  examId: string;
  onBack?: () => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({ examId, onBack }) => {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedHall, setSelectedHall] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [uploadResults, setUploadResults] = useState<BatchImportResult | null>(null);
  const [statistics, setStatistics] = useState<StudentStatistics | null>(null);
  const [showArrangeModal, setShowArrangeModal] = useState(false);
  const [examHalls, setExamHalls] = useState<ExamHall[]>([]);
  const [arrangementConfig, setArrangementConfig] = useState<ArrangementConfig>({
    halls: [{ name: '第一考场', capacity: 30 }, { name: '第二考场', capacity: 28 }],
    allocation_type: 'by_class',
    seating_type: 'sequential'
  });

  // 获取考场列表
  const fetchExamHalls = async () => {
    try {
      const response = await studentApi.getExamHalls(examId);
      if (response.data) {
        setExamHalls(response.data);
      }
    } catch (error) {
      console.error('获取考场列表失败:', error);
    }
  };
  
  // 新增状态
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [showExportDropdown, setShowExportDropdown] = useState(false);
  const [showGenerateModal, setShowGenerateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
    fetchStatistics();
    fetchExamHalls();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const response = await studentApi.getStudents(examId, {
        search: searchTerm,
        class_name: selectedClass,
      });
      if (response.success && response.data) {
        setStudents(response.data);
      }
    } catch (error) {
      console.error('获取学生列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await studentApi.getStudentStatistics(examId);
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('获取统计信息失败:', error);
    }
  };

  const handleCreateStudent = async (data: StudentCreate) => {
    try {
      const response = await studentApi.createStudent(examId, data);
      if (response.success) {
        setShowCreateModal(false);
        fetchStudents();
        fetchStatistics();
      }
    } catch (error) {
      console.error('创建学生失败:', error);
    }
  };

  const handleUpdateStudent = async (uuid: string, data: StudentUpdate) => {
    try {
      const response = await studentApi.updateStudent(examId, uuid, data);
      if (response.success) {
        setEditingStudent(null);
        fetchStudents();
        fetchStatistics();
      }
    } catch (error) {
      console.error('更新学生失败:', error);
    }
  };

  const handleDeleteStudent = async (uuid: string) => {
    try {
      const response = await studentApi.deleteStudent(examId, uuid);
      if (response.success) {
        fetchStudents();
        fetchStatistics();
      }
    } catch (error) {
      console.error('删除学生失败:', error);
    }
  };

  const handleImportStudents = async (file: File) => {
    try {
      const response = await studentApi.batchImportStudents(examId, file);
      if (response.success) {
        setShowImportModal(false);
        fetchStudents();
        fetchStatistics();
      }
    } catch (error) {
      console.error('导入学生失败:', error);
    }
  };

  const handleExportStudents = async (format: 'excel' | 'csv') => {
    try {
      const blob = await studentApi.exportStudents(examId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `students.${format === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('导出学生失败:', error);
    }
  };

  const handleUploadAnswerSheets = async (files: FileList) => {
    try {
      // 这个功能暂时移除，因为API中没有对应的方法
      console.log('上传答题卡功能暂未实现');
    } catch (error) {
      console.error('上传答题卡失败:', error);
    }
  };

  // 新增功能函数
  const handleSelectAll = () => {
    if (selectedStudents.length === students.length) {
      setSelectedStudents([]);
    } else {
      setSelectedStudents(students.map(s => s.uuid));
    }
  };

  const handleSelectStudent = (uuid: string) => {
    setSelectedStudents(prev => 
      prev.includes(uuid) 
        ? prev.filter(id => id !== uuid)
        : [...prev, uuid]
    );
  };

  const handleGenerateExamNumbers = async () => {
    try {
      const response = await studentApi.generateExamNumbers(examId);
      if (response.success) {
        setShowGenerateModal(false);
        fetchStudents();
      }
    } catch (error) {
      console.error('生成考号失败:', error);
    }
  };

  const downloadTemplate = () => {
    const csvContent = "学号,姓名,性别,班级,座位号,准考证号\n示例001,张三,男,一班,1,2024001";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = '学生信息导入模板.csv';
    link.click();
  };

  const getPaginatedStudents = () => {
    const filtered = students.filter(student => {
      const matchesSearch = student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.student_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = !selectedClass || student.class_name === selectedClass;
      const matchesHall = !selectedHall || student.exam_hall === selectedHall;
      return matchesSearch && matchesClass && matchesHall;
    });
    
    const startIndex = (currentPage - 1) * pageSize;
    return filtered.slice(startIndex, startIndex + pageSize);
  };

  const getTotalPages = () => {
    const filtered = students.filter(student => {
      const matchesSearch = student.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           student.student_id.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesClass = !selectedClass || student.class_name === selectedClass;
      const matchesHall = !selectedHall || student.exam_hall === selectedHall;
      return matchesSearch && matchesClass && matchesHall;
    });
    return Math.ceil(filtered.length / pageSize);
  };

  const confirmDelete = (student: Student) => {
    setStudentToDelete(student);
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (studentToDelete) {
      await handleDeleteStudent(studentToDelete.uuid);
      setShowDeleteModal(false);
      setStudentToDelete(null);
    }
  };

  const getClassList = () => {
    const classes = [...new Set(students.map(s => s.class_name))];
    return classes.sort();
  };

  const getHallList = () => {
    const halls = [...new Set(students.map(s => s.exam_hall).filter(Boolean))];
    return halls.sort();
  };

  const handleArrangeSeats = async (config: ArrangementConfig) => {
     try {
       const response = await studentApi.arrangeExamHalls(examId, config);
       if (response.data && response.data.success) {
         setShowArrangeModal(false);
         fetchStudents();
       }
     } catch (error) {
       console.error('自动编排失败:', error);
     }
   };

  const paginatedStudents = getPaginatedStudents();
  const totalPages = getTotalPages();

  return (
    <div className="w-full min-h-screen bg-gray-50">
      <div className="p-4 sm:p-6 lg:p-8">
        {/* 顶部操作栏 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                返回
              </button>
            )}
            <h1 className="text-2xl font-bold text-gray-800">学生信息管理</h1>
          </div>
          <div className="flex items-center flex-wrap gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-md hover:bg-indigo-700 flex items-center shadow-sm"
            >
              <UploadOutlined className="w-4 h-4 mr-2" />
              批量导入学生
            </button>
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-white text-gray-700 border border-gray-300 text-sm font-semibold rounded-md hover:bg-gray-50 flex items-center shadow-sm"
            >
              <PlusOutlined className="w-4 h-4 mr-2" />
              添加单个学生
            </button>
            <button
              onClick={() => setShowGenerateModal(true)}
              className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-md hover:bg-green-700 flex items-center shadow-sm"
            >
              <ThunderboltOutlined className="w-4 h-4 mr-2" />
              生成考号/座号
            </button>
            <button
              onClick={() => setShowArrangeModal(true)}
              className="px-4 py-2 bg-purple-600 text-white text-sm font-semibold rounded-md hover:bg-purple-700 flex items-center shadow-sm"
            >
              <ThunderboltOutlined className="w-4 h-4 mr-2" />
              自动编排考场
            </button>
            {/* 导出按钮容器 */}
            <div className="relative inline-block text-left">
              <button
                type="button"
                onClick={() => setShowExportDropdown(!showExportDropdown)}
                className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-semibold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                <DownloadOutlined className="w-4 h-4 mr-2" />
                导出学生信息
                <DownOutlined className="ml-2 -mr-1 h-5 w-5" />
              </button>
              {/* 下拉菜单 */}
              {showExportDropdown && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        handleExportStudents('excel');
                        setShowExportDropdown(false);
                      }}
                      className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100 flex items-center w-full text-left"
                    >
                      <FileExcelOutlined className="w-4 h-4 mr-3 text-green-600" />
                      导出为 Excel (.xlsx)
                    </button>
                    <button
                      onClick={() => {
                        handleExportStudents('csv');
                        setShowExportDropdown(false);
                      }}
                      className="text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100 flex items-center w-full text-left"
                    >
                      <FileTextOutlined className="w-4 h-4 mr-3 text-blue-600" />
                      导出为 CSV (.csv)
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 统计信息 */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800">总学生数</h3>
              <p className="text-2xl font-bold text-blue-600">{statistics.total_students}</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-green-800">班级数量</h3>
              <p className="text-2xl font-bold text-green-600">
                {Object.keys(statistics.class_distribution || {}).length}
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-purple-800">性别分布</h3>
              <div className="text-sm text-purple-600">
                {Object.entries(statistics.gender_distribution || {}).map(([gender, count]) => (
                  <div key={gender}>{gender}: {count as number}</div>
                ))}
              </div>
            </div>
            <div className="bg-indigo-50 p-4 rounded-lg">
              <h3 className="text-lg font-semibold text-indigo-800">考场分布</h3>
              <p className="text-2xl font-bold text-indigo-600">
                {Object.keys(statistics.hall_distribution || {}).length}
              </p>
              <div className="text-sm text-indigo-600 mt-2">
                {Object.entries(statistics.hall_distribution || {}).map(([hall, count]) => (
                  <div key={hall}>{hall}: {count as number}人</div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 搜索和筛选 */}
        <div className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            placeholder="搜索学生姓名或学号..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 min-w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">所有班级</option>
            {getClassList().map(className => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
          <select
            value={selectedHall}
            onChange={(e) => setSelectedHall(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">所有考场</option>
            {examHalls.map(hall => (
              <option key={hall.id} value={hall.name}>{hall.name}</option>
            ))}
          </select>
        </div>

        {/* 学生列表 */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === paginatedStudents.length && paginatedStudents.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  准考证号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  姓名
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  性别
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  学号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  班级
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  座位号
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  考场
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-4 text-center text-gray-500">
                    加载中...
                  </td>
                </tr>
              ) : paginatedStudents.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-6 py-4 text-center text-gray-500">
                    暂无学生数据
                  </td>
                </tr>
              ) : (
                paginatedStudents.map((student) => (
                  <tr key={student.uuid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.uuid)}
                        onChange={() => handleSelectStudent(student.uuid)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                       {student.exam_number || '-'}
                     </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.student_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.gender === 'male' ? '男' : student.gender === 'female' ? '女' : '其他'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {student.student_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.class_name || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.seat_number || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {student.exam_hall || '-'}
                      </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setEditingStudent(student)}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <EditOutlined className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => confirmDelete(student)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <DeleteOutlined className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6 mt-4 rounded-lg">
            <div className="flex flex-1 justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                上一页
              </button>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                下一页
              </button>
            </div>
            <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  显示第 <span className="font-medium">{(currentPage - 1) * pageSize + 1}</span> 到{' '}
                  <span className="font-medium">{Math.min(currentPage * pageSize, students.length)}</span> 条，
                  共 <span className="font-medium">{students.length}</span> 条记录
                </p>
              </div>
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">上一页</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        page === currentPage
                          ? 'z-10 bg-indigo-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages}
                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                  >
                    <span className="sr-only">下一页</span>
                    <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                  </button>
                </nav>
              </div>
            </div>
          </div>
        )}

        {/* 模态框 */}
        {showCreateModal && (
          <StudentCreateModal
            onClose={() => setShowCreateModal(false)}
            onSubmit={handleCreateStudent}
          />
        )}

        {editingStudent && (
          <StudentEditModal
            student={editingStudent}
            onClose={() => setEditingStudent(null)}
            onSubmit={(data) => handleUpdateStudent(editingStudent.uuid, data)}
          />
        )}

        {showImportModal && (
          <StudentImportModal
            onClose={() => setShowImportModal(false)}
            onSubmit={handleImportStudents}
            onDownloadTemplate={downloadTemplate}
          />
        )}

        {uploadResults && (
           <UploadResultsModal
             results={uploadResults}
             onClose={() => setUploadResults(null)}
           />
         )}

        {/* 生成考号/座号确认模态框 */}
        {showGenerateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">生成考号/座号</h2>
              <p className="text-gray-600 mb-6">确定要为所有学生生成考号和座号吗？此操作将覆盖现有的考号和座号。</p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowGenerateModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={handleGenerateExamNumbers}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  确认生成
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 删除确认模态框 */}
        {showDeleteModal && studentToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <div className="flex items-center mb-4">
                <ExclamationCircleOutlined className="w-6 h-6 text-red-600 mr-3" />
                <h2 className="text-xl font-bold">确认删除</h2>
              </div>
              <p className="text-gray-600 mb-6">
                确定要删除学生 <span className="font-semibold">{studentToDelete.student_name}</span> 吗？此操作不可撤销。
              </p>
              <div className="flex gap-4">
                <button
                  onClick={() => setShowDeleteModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  取消
                </button>
                <button
                  onClick={executeDelete}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 自动编排考场模态框 */}
        {showArrangeModal && (
          <ArrangeSeatsModal
            config={arrangementConfig}
            onClose={() => setShowArrangeModal(false)}
            onSubmit={handleArrangeSeats}
            onConfigChange={setArrangementConfig}
          />
        )}
      </div>
    </div>
  );
};

// 自动编排考场模态框组件
const ArrangeSeatsModal: React.FC<{
  config: ArrangementConfig;
  onClose: () => void;
  onSubmit: (config: ArrangementConfig) => void;
  onConfigChange: (config: ArrangementConfig) => void;
}> = ({ config, onClose, onSubmit, onConfigChange }) => {
  const [localConfig, setLocalConfig] = useState<ArrangementConfig>(config);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(localConfig);
  };

  const addHall = () => {
    setLocalConfig({
      ...localConfig,
      halls: [...localConfig.halls, { name: '', capacity: 30 }]
    });
  };

  const removeHall = (index: number) => {
    setLocalConfig({
      ...localConfig,
      halls: localConfig.halls.filter((_, i) => i !== index)
    });
  };

  const updateHall = (index: number, field: 'name' | 'capacity', value: string | number) => {
    const newHalls = [...localConfig.halls];
    newHalls[index] = { ...newHalls[index], [field]: value };
    setLocalConfig({ ...localConfig, halls: newHalls });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">自动编排考场</h2>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 考场设置 */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium">考场设置</h3>
              <button
                type="button"
                onClick={addHall}
                className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700"
              >
                添加考场
              </button>
            </div>
            <div className="space-y-3">
              {localConfig.halls.map((hall, index) => (
                <div key={index} className="flex items-center gap-4 p-3 border rounded-lg">
                  <input
                    type="text"
                    placeholder="考场名称"
                    value={hall.name}
                    onChange={(e) => updateHall(index, 'name', e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <input
                    type="number"
                    placeholder="容量"
                    value={hall.capacity}
                    onChange={(e) => updateHall(index, 'capacity', parseInt(e.target.value) || 0)}
                    className="w-24 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  {localConfig.halls.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeHall(index)}
                      className="px-2 py-1 text-red-600 hover:bg-red-50 rounded"
                    >
                      删除
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 分配方式 */}
          <div>
            <h3 className="text-lg font-medium mb-3">分配方式</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                   type="radio"
                   name="allocation_type"
                   value="by_class"
                   checked={localConfig.allocation_type === 'by_class'}
                   onChange={(e) => setLocalConfig({ ...localConfig, allocation_type: e.target.value as 'by_class' | 'random' })}
                   className="mr-2"
                 />
                 按班级分配（同班级学生尽量在同一考场）
               </label>
               <label className="flex items-center">
                 <input
                   type="radio"
                   name="allocation_type"
                   value="random"
                   checked={localConfig.allocation_type === 'random'}
                   onChange={(e) => setLocalConfig({ ...localConfig, allocation_type: e.target.value as 'by_class' | 'random' })}
                   className="mr-2"
                 />
                 混合分配（随机分配到各考场）
              </label>
            </div>
          </div>

          {/* 座位排列 */}
          <div>
            <h3 className="text-lg font-medium mb-3">座位排列</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                   type="radio"
                   name="seating_type"
                   value="sequential"
                   checked={localConfig.seating_type === 'sequential'}
                   onChange={(e) => setLocalConfig({ ...localConfig, seating_type: e.target.value as 'sequential' | 'snake' })}
                   className="mr-2"
                 />
                 顺序排列
               </label>
               <label className="flex items-center">
                 <input
                   type="radio"
                   name="seating_type"
                   value="snake"
                   checked={localConfig.seating_type === 'snake'}
                   onChange={(e) => setLocalConfig({ ...localConfig, seating_type: e.target.value as 'sequential' | 'snake' })}
                   className="mr-2"
                 />
                 蛇形排列（防作弊）
              </label>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              开始编排
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 创建学生模态框组件
const StudentCreateModal: React.FC<{
  onClose: () => void;
  onSubmit: (data: StudentCreate) => void;
}> = ({ onClose, onSubmit }) => {
  const [formData, setFormData] = useState<StudentCreate>({
    student_id: '',
    student_name: '',
    class_name: '',
    grade: '',
    school: '',
    gender: 'male',
    contact_phone: '',
    parent_phone: '',
    address: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">添加学生</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">学号 *</label>
            <input
              type="text"
              required
              value={formData.student_id}
              onChange={(e) => setFormData({ ...formData, student_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
            <input
              type="text"
              required
              value={formData.student_name}
              onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">班级 *</label>
            <input
              type="text"
              required
              value={formData.class_name}
              onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'other' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
            <input
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              创建
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 编辑学生模态框组件
const StudentEditModal: React.FC<{
  student: Student;
  onClose: () => void;
  onSubmit: (data: StudentUpdate) => void;
}> = ({ student, onClose, onSubmit }) => {
  const [formData, setFormData] = useState<StudentUpdate>({
    student_name: student.student_name,
    class_name: student.class_name,
    grade: student.grade || '',
    school: student.school || '',
    gender: student.gender || 'male',
    contact_phone: student.contact_phone || '',
    parent_phone: student.parent_phone || '',
    address: student.address || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">编辑学生信息</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">姓名 *</label>
            <input
              type="text"
              required
              value={formData.student_name}
              onChange={(e) => setFormData({ ...formData, student_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">班级 *</label>
            <input
              type="text"
              required
              value={formData.class_name}
              onChange={(e) => setFormData({ ...formData, class_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
            <select
              value={formData.gender}
              onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | 'other' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="male">男</option>
              <option value="female">女</option>
              <option value="other">其他</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">联系电话</label>
            <input
              type="tel"
              value={formData.contact_phone}
              onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              取消
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// 导入学生模态框组件
const StudentImportModal: React.FC<{
  onClose: () => void;
  onSubmit: (file: File) => void;
  onDownloadTemplate: () => void;
}> = ({ onClose, onSubmit, onDownloadTemplate }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFile) {
      onSubmit(selectedFile);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg">
        <h2 className="text-xl font-bold mb-4">批量导入学生</h2>
        
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium">步骤 1: 下载模板</h3>
            <button
              onClick={onDownloadTemplate}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
            >
              <DownloadOutlined className="w-4 h-4 mr-2" />
              下载模板
            </button>
          </div>
          <p className="text-sm text-gray-600">请先下载模板文件，按照模板格式填写学生信息。</p>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-medium mb-4">步骤 2: 上传文件</h3>
          <form onSubmit={handleSubmit}>
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center ${
                dragActive ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <UploadOutlined className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              {selectedFile ? (
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">文件大小: {(selectedFile.size / 1024).toFixed(2)} KB</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-600 mb-2">拖拽文件到此处或点击选择文件</p>
                  <p className="text-xs text-gray-500">支持 .xlsx, .xls, .csv 格式</p>
                </div>
              )}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="mt-4 inline-block px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 cursor-pointer"
              >
                选择文件
              </label>
            </div>
            
            <div className="flex gap-4 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={!selectedFile}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                开始导入
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

// 上传结果模态框组件
const UploadResultsModal: React.FC<{
  results: BatchImportResult;
  onClose: () => void;
}> = ({ results, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">导入结果</h2>
        
        <div className="mb-4">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-50 p-3 rounded">
              <div className="text-lg font-bold text-green-600">{results.success_count}</div>
              <div className="text-sm text-green-800">成功导入</div>
            </div>
            <div className="bg-red-50 p-3 rounded">
              <div className="text-lg font-bold text-red-600">{results.failed_count}</div>
              <div className="text-sm text-red-800">导入失败</div>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <div className="text-lg font-bold text-blue-600">{results.total}</div>
              <div className="text-sm text-blue-800">总计</div>
            </div>
          </div>
        </div>

        {results.failed_records && results.failed_records.length > 0 && (
          <div className="mb-4">
            <h3 className="font-semibold mb-2">失败记录:</h3>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {results.failed_records.map((record, index) => (
                <div key={index} className="text-sm bg-red-50 p-2 rounded">
                  第{record.row}行: {record.error}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentManagement;