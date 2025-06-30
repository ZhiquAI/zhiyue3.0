import React, { useState } from 'react';
import { Card, Row, Col, Breadcrumb, Button, Segmented, Statistic, Alert, Table, Empty, message, Steps, Tooltip, Badge, Select, Tabs, Dropdown, Space } from 'antd';
import { UploadOutlined, BulbOutlined, ArrowLeftOutlined, TeamOutlined, UserOutlined, TrophyOutlined, DownOutlined, HomeOutlined, PrinterOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { 
  RadarChart, 
  PolarGrid, 
  PolarAngleAxis, 
  PolarRadiusAxis, 
  Radar, 
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';
import { useAppContext } from '../../contexts/AppContext';
import { Exam } from '../../types/exam';
import { mockAnalysisData } from '../../data/mockData';
import { exportReport, printReport, ExportData } from '../../utils/exportUtils';

interface AnalysisWorkspaceProps {
  exam: Exam;
}

const AnalysisWorkspace: React.FC<AnalysisWorkspaceProps> = ({ exam }) => {
  const { setSubViewInfo } = useAppContext();
  const [viewLevel, setViewLevel] = useState('年级报告');
  const [selectedClass, setSelectedClass] = useState<any>(null);
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [activeTabKey, setActiveTabKey] = useState('grade');

  const handleBack = () => {
    setSubViewInfo({ view: null, exam: null });
  };

  const handleClassSelect = (className: string) => {
    const classData = mockAnalysisData.classOverview;
    setSelectedClass(classData);
    setViewLevel('班级报告');
    setActiveTabKey('class');
  };

  const handleStudentSelect = (student: any) => {
    setSelectedStudent(student);
    setViewLevel('个人报告');
    setActiveTabKey('student');
  };

  const handleTabChange = (key: string) => {
    setActiveTabKey(key);
    
    if (key === 'grade') {
      setViewLevel('年级报告');
    } else if (key === 'class') {
      if (!selectedClass) {
        message.warning('请先从年级报告中选择一个班级');
        setActiveTabKey('grade');
        return;
      }
      setViewLevel('班级报告');
    } else if (key === 'student') {
      if (!selectedStudent) {
        message.warning('请先从班级报告中选择一位学生');
        setActiveTabKey(selectedClass ? 'class' : 'grade');
        return;
      }
      setViewLevel('个人报告');
    }
  };

  // 获取可用的班级列表
  const getClassOptions = () => {
    return mockAnalysisData.gradeOverview.classCompare.map(cls => ({
      label: cls.name,
      value: cls.name,
      key: cls.name
    }));
  };

  // 获取可用的学生列表
  const getStudentOptions = () => {
    if (!selectedClass) return [];
    return selectedClass.students.map((student: any) => ({
      label: `${student.name} (${student.score}分)`,
      value: student.key,
      key: student.key,
      student: student
    }));
  };

  // 处理班级选择下拉菜单
  const handleClassDropdownSelect = (className: string) => {
    handleClassSelect(className);
  };

  // 处理学生选择下拉菜单
  const handleStudentDropdownSelect = (studentKey: string) => {
    const student = selectedClass?.students.find((s: any) => s.key === studentKey);
    if (student) {
      handleStudentSelect(student);
    }
  };

  // 快速导航下拉菜单
  const getQuickNavMenu = () => {
    const items = [
      {
        key: 'grade',
        label: (
          <div className="flex items-center gap-2">
            <TeamOutlined />
            <span>年级报告</span>
          </div>
        ),
        onClick: () => handleTabChange('grade')
      }
    ];

    if (selectedClass) {
      items.push({
        key: 'class',
        label: (
          <div className="flex items-center gap-2">
            <UserOutlined />
            <span>{selectedClass.className}</span>
          </div>
        ),
        onClick: () => handleTabChange('class')
      });
    }

    if (selectedStudent) {
      items.push({
        key: 'student',
        label: (
          <div className="flex items-center gap-2">
            <TrophyOutlined />
            <span>{selectedStudent.name}</span>
          </div>
        ),
        onClick: () => handleTabChange('student')
      });
    }

    return { items };
  };

  // 处理导出功能
  const handleExport = async (format: 'html' | 'csv' | 'pdf' = 'html') => {
    const exportData: ExportData = {
      examName: exam.name,
      reportType: viewLevel as '年级报告' | '班级报告' | '个人报告',
      data: mockAnalysisData,
      selectedClass,
      selectedStudent
    };

    await exportReport(exportData, format);
  };

  // 处理打印功能
  const handlePrint = () => {
    const exportData: ExportData = {
      examName: exam.name,
      reportType: viewLevel as '年级报告' | '班级报告' | '个人报告',
      data: mockAnalysisData,
      selectedClass,
      selectedStudent
    };

    printReport(exportData);
  };

  // 导出下拉菜单
  const getExportMenu = () => {
    return {
      items: [
        {
          key: 'html',
          label: (
            <div className="flex items-center gap-2">
              <UploadOutlined />
              <span>导出HTML报告</span>
            </div>
          ),
          onClick: () => handleExport('html')
        },
        {
          key: 'csv',
          label: (
            <div className="flex items-center gap-2">
              <FileExcelOutlined />
              <span>导出CSV数据</span>
            </div>
          ),
          onClick: () => handleExport('csv')
        },
        {
          key: 'pdf',
          label: (
            <div className="flex items-center gap-2">
              <FilePdfOutlined />
              <span>导出PDF报告</span>
            </div>
          ),
          onClick: () => handleExport('pdf')
        },
        {
          type: 'divider'
        },
        {
          key: 'print',
          label: (
            <div className="flex items-center gap-2">
              <PrinterOutlined />
              <span>打印报告</span>
            </div>
          ),
          onClick: handlePrint
        }
      ]
    };
  };

  const renderNavigationHeader = () => {
    return (
      <Card className="mb-4 navigation-header" bodyStyle={{ padding: '16px 24px' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Dropdown menu={getQuickNavMenu()} trigger={['click']}>
              <Button type="text" className="flex items-center gap-1">
                <HomeOutlined />
                快速导航
                <DownOutlined />
              </Button>
            </Dropdown>
            
            <div className="h-6 w-px bg-gray-300" />
            
            <div className="flex items-center gap-3">
              <Select
                placeholder="选择班级"
                style={{ width: 140 }}
                value={selectedClass?.className}
                onChange={handleClassDropdownSelect}
                options={getClassOptions()}
                allowClear
                onClear={() => {
                  setSelectedClass(null);
                  setSelectedStudent(null);
                  setActiveTabKey('grade');
                  setViewLevel('年级报告');
                }}
              />
              
              <Select
                placeholder="选择学生"
                style={{ width: 160 }}
                value={selectedStudent?.key}
                onChange={handleStudentDropdownSelect}
                options={getStudentOptions()}
                disabled={!selectedClass}
                allowClear
                onClear={() => {
                  setSelectedStudent(null);
                  setActiveTabKey('class');
                  setViewLevel('班级报告');
                }}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Dropdown menu={getExportMenu()} trigger={['click']} placement="bottomRight">
              <Button type="primary" ghost className="flex items-center gap-1">
                <UploadOutlined />
                导出报告
                <DownOutlined />
              </Button>
            </Dropdown>
          </div>
        </div>
      </Card>
    );
  };

  const renderGradeView = () => (
    <>
      <Row gutter={[16, 16]} className="mb-6">
        <Col span={6}>
          <Card>
            <Statistic
              title="年级参考人数"
              value={mockAnalysisData.gradeOverview.studentCount}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="年级平均分"
              value={mockAnalysisData.gradeOverview.avgScore}
              precision={2}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="年级及格率"
              value={mockAnalysisData.gradeOverview.passRate}
              suffix="%"
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="年级优秀率"
              value={mockAnalysisData.gradeOverview.excellentRate}
              suffix="%"
              valueStyle={{ color: '#1677ff' }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={12}>
          <Card title="年级能力维度诊断">
            <ResponsiveContainer width="100%" height={350}>
              <RadarChart data={mockAnalysisData.gradeOverview.abilityData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="ability" />
                <PolarRadiusAxis angle={30} domain={[0, 100]} />
                <Radar
                  name="平均得分率"
                  dataKey="平均得分率"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Legend />
                <RechartsTooltip />
              </RadarChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card 
            title="班级横向对比" 
            extra={<span className="text-xs text-gray-500">点击柱状图进入班级详情</span>}
          >
            <ResponsiveContainer width="100%" height={350}>
              <BarChart
                data={mockAnalysisData.gradeOverview.classCompare}
                onClick={(data: any) => {
                  if (data && data.activeLabel) {
                    handleClassSelect(data.activeLabel);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar 
                  dataKey="平均分" 
                  fill="#82ca9d" 
                  style={{ cursor: 'pointer' }}
                />
                <Bar 
                  dataKey="优秀率" 
                  fill="#8884d8" 
                  style={{ cursor: 'pointer' }}
                />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Alert
        message="AI教学建议 (年级层面)"
        description={mockAnalysisData.gradeOverview.aiSuggestion}
        type="info"
        showIcon
        icon={<BulbOutlined />}
        className="mt-6"
      />
    </>
  );

  const renderClassView = () => {
    if (!selectedClass) {
      return (
        <div className="text-center py-20">
          <Empty 
            description="请选择一个班级查看班级报告"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Select
              placeholder="选择班级"
              style={{ width: 200 }}
              onChange={handleClassDropdownSelect}
              options={getClassOptions()}
              size="large"
            />
          </Empty>
        </div>
      );
    }

    return (
      <>
        <Row gutter={[16, 16]} className="mb-6">
          <Col span={6}>
            <Card>
              <Statistic
                title="班级参考人数"
                value={selectedClass.studentCount}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="班级平均分"
                value={selectedClass.avgScore}
                precision={2}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="班级及格率"
                value={selectedClass.passRate}
                suffix="%"
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="班级优秀率"
                value={selectedClass.excellentRate}
                suffix="%"
                valueStyle={{ color: '#1677ff' }}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <Card title="班级能力诊断 (对比年级)">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={selectedClass.abilityData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="ability" />
                  <YAxis />
                  <RechartsTooltip />
                  <Legend />
                  <Bar dataKey="班级得分率" fill="#82ca9d" />
                  <Bar dataKey="年级得分率" fill="#ffc658" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card 
              title="学生表现分布" 
              extra={<span className="text-xs text-gray-500">点击学生姓名查看个人报告</span>}
            >
              <Table
                size="small"
                dataSource={selectedClass.students}
                columns={[
                  {
                    title: '姓名',
                    dataIndex: 'name',
                    key: 'name',
                    render: (text: string, record: any) => (
                      <Button 
                        type="link" 
                        onClick={() => handleStudentSelect(record)}
                        className="p-0 h-auto font-medium"
                      >
                        {text}
                      </Button>
                    )
                  },
                  {
                    title: '分数',
                    dataIndex: 'score',
                    key: 'score',
                    sorter: (a: any, b: any) => a.score - b.score,
                    render: (score: number) => (
                      <span className={score >= 90 ? 'text-green-600 font-semibold' : score >= 80 ? 'text-blue-600' : 'text-gray-600'}>
                        {score}
                      </span>
                    )
                  },
                  {
                    title: '班排',
                    dataIndex: 'rank',
                    key: 'rank',
                    render: (rank: number) => (
                      <Badge 
                        count={rank} 
                        style={{ 
                          backgroundColor: rank <= 3 ? '#f50' : rank <= 10 ? '#2db7f5' : '#87d068' 
                        }} 
                      />
                    )
                  }
                ]}
                pagination={false}
              />
            </Card>
          </Col>
        </Row>

        <Alert
          message="AI教学建议 (班级层面)"
          description={selectedClass.aiSuggestion}
          type="info"
          showIcon
          icon={<BulbOutlined />}
          className="mt-6"
        />
      </>
    );
  };

  const renderStudentView = () => {
    if (!selectedStudent) {
      return (
        <div className="text-center py-20">
          <Empty 
            description="请选择一位学生查看个人报告"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Space direction="vertical" size="middle">
              {!selectedClass && (
                <Select
                  placeholder="先选择班级"
                  style={{ width: 200 }}
                  onChange={handleClassDropdownSelect}
                  options={getClassOptions()}
                  size="large"
                />
              )}
              <Select
                placeholder="选择学生"
                style={{ width: 200 }}
                onChange={handleStudentDropdownSelect}
                options={getStudentOptions()}
                disabled={!selectedClass}
                size="large"
              />
            </Space>
          </Empty>
        </div>
      );
    }

    return (
      <Row gutter={[24, 24]}>
        <Col span={10}>
          <Card title={`个人能力画像 - ${selectedStudent.name}`}>
            <ResponsiveContainer width="100%" height={300}>
              <RadarChart data={mockAnalysisData.personalReport.abilityData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="ability" />
                <PolarRadiusAxis />
                <Radar
                  name="个人得分率"
                  dataKey="个人得分率"
                  stroke="#8884d8"
                  fill="#8884d8"
                  fillOpacity={0.6}
                />
                <Radar
                  name="班级得分率"
                  dataKey="班级得分率"
                  stroke="#82ca9d"
                  fill="#82ca9d"
                  fillOpacity={0.6}
                />
                <Legend />
                <RechartsTooltip />
              </RadarChart>
            </ResponsiveContainer>
            <Alert
              message="AI学习建议"
              description={mockAnalysisData.personalReport.aiSuggestion}
              type="info"
              showIcon
              icon={<BulbOutlined />}
              className="mt-4"
            />
          </Card>
        </Col>

        <Col span={14}>
          <Card title="个人成绩详情">
            <Row gutter={[16, 16]} className="mb-4">
              <Col span={8}>
                <Statistic
                  title="总分"
                  value={selectedStudent.score}
                  valueStyle={{ color: selectedStudent.score >= 90 ? '#3f8600' : '#1677ff' }}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="班级排名"
                  value={selectedStudent.rank}
                  suffix={`/ ${selectedClass?.studentCount || 45}`}
                />
              </Col>
              <Col span={8}>
                <Statistic
                  title="年级排名"
                  value={231}
                  suffix={`/ ${mockAnalysisData.gradeOverview.studentCount}`}
                />
              </Col>
            </Row>
            
            <div className="mt-4">
              <h4>各题得分详情</h4>
              <p className="text-gray-500">详细的题目分析和作答回顾将在此展示...</p>
            </div>
          </Card>
        </Col>
      </Row>
    );
  };

  const tabItems = [
    {
      key: 'grade',
      label: (
        <div className="flex items-center gap-2">
          <TeamOutlined />
          <span>年级报告</span>
        </div>
      ),
      children: renderGradeView()
    },
    {
      key: 'class',
      label: (
        <div className="flex items-center gap-2">
          <UserOutlined />
          <span>{selectedClass ? selectedClass.className : '班级报告'}</span>
        </div>
      ),
      children: renderClassView()
    },
    {
      key: 'student',
      label: (
        <div className="flex items-center gap-2">
          <TrophyOutlined />
          <span>{selectedStudent ? selectedStudent.name : '个人报告'}</span>
        </div>
      ),
      children: renderStudentView()
    }
  ];

  return (
    <div>
      <Breadcrumb className="mb-4" items={[
        { title: <a onClick={handleBack}>数据分析</a> },
        { title: exam.name }
      ]} />

      {renderNavigationHeader()}

      <Card>
        <Tabs
          activeKey={activeTabKey}
          onChange={handleTabChange}
          items={tabItems}
          size="large"
          tabBarStyle={{ marginBottom: 24 }}
          tabBarExtraContent={
            <div className="flex items-center gap-2 text-sm text-gray-500">
              {selectedClass && (
                <Badge color="blue" text={`当前班级: ${selectedClass.className}`} />
              )}
              {selectedStudent && (
                <Badge color="green" text={`当前学生: ${selectedStudent.name}`} />
              )}
            </div>
          }
        />
      </Card>
    </div>
  );
};

export default AnalysisWorkspace;