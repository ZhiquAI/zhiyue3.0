import React, { useState } from 'react';
import { Card, Form, Input, Button, Avatar, Upload, Select, Divider, Typography, Alert, Space, Tabs } from 'antd';
import { UserOutlined, MailOutlined, BankOutlined, BookOutlined, CameraOutlined, LockOutlined, EyeInvisibleOutlined, EyeTwoTone } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../services/api';
import { cn } from '../../utils/cn';

const { Title, Text } = Typography;
const { Option } = Select;
// 移除废弃的TabPane导入

interface ProfileFormData {
  name: string;
  email: string;
  school?: string;
  subject?: string;
  grades?: string[];
}

interface PasswordFormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const ProfilePage: React.FC = () => {
  const { user, refreshAuth } = useAuth();
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatar || '');

  // 学科选项
  const subjects = [
    { value: 'history', label: '历史' },
    { value: 'chinese', label: '语文' },
    { value: 'math', label: '数学' },
    { value: 'english', label: '英语' },
    { value: 'physics', label: '物理' },
    { value: 'chemistry', label: '化学' },
    { value: 'biology', label: '生物' },
    { value: 'geography', label: '地理' },
    { value: 'politics', label: '政治' }
  ];

  // 年级选项
  const grades = [
    { value: 'grade7', label: '七年级' },
    { value: 'grade8', label: '八年级' },
    { value: 'grade9', label: '九年级' },
    { value: 'high1', label: '高一' },
    { value: 'high2', label: '高二' },
    { value: 'high3', label: '高三' }
  ];

  // 头像上传配置
  const uploadProps: UploadProps = {
    name: 'avatar',
    listType: 'picture-card',
    className: 'avatar-uploader',
    showUploadList: false,
    beforeUpload: (file) => {
      const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
      if (!isJpgOrPng) {
        setError('只能上传 JPG/PNG 格式的图片');
        return false;
      }
      const isLt2M = file.size / 1024 / 1024 < 2;
      if (!isLt2M) {
        setError('图片大小不能超过 2MB');
        return false;
      }
      return true;
    },
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const formData = new FormData();
        formData.append('avatar', file as File);
        
        // 这里应该调用上传头像的API
        // const response = await authApi.uploadAvatar(formData);
        // setAvatarUrl(response.data.url);
        
        // 临时处理：使用本地预览
        const reader = new FileReader();
        reader.onload = (e) => {
          setAvatarUrl(e.target?.result as string);
          onSuccess?.(e.target?.result);
        };
        reader.readAsDataURL(file as File);
      } catch (err: any) {
        setError(err.message || '头像上传失败');
        onError?.(err);
      }
    }
  };

  const handleProfileSubmit = async (values: ProfileFormData) => {
    try {
      setLoading(true);
      setError('');
      setSuccess('');
      
      const response = await authApi.updateProfile(values);
      
      if (response.success) {
        setSuccess('个人信息更新成功');
        await refreshAuth(); // 刷新用户信息
      } else {
        setError(response.message || '更新失败，请重试');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '更新失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (values: PasswordFormData) => {
    try {
      setPasswordLoading(true);
      setError('');
      setSuccess('');
      
      const { confirmPassword, ...passwordData } = values;
      
      const response = await authApi.updatePassword(passwordData);
      
      if (response.success) {
        setSuccess('密码修改成功');
        passwordForm.resetFields();
      } else {
        setError(response.message || '密码修改失败，请重试');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || '密码修改失败，请重试');
    } finally {
      setPasswordLoading(false);
    }
  };

  const validatePassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('请输入新密码'));
    }
    if (value.length < 6) {
      return Promise.reject(new Error('密码至少6个字符'));
    }
    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(value)) {
      return Promise.reject(new Error('密码必须包含大小写字母和数字'));
    }
    return Promise.resolve();
  };

  const validateConfirmPassword = (_: any, value: string) => {
    if (!value) {
      return Promise.reject(new Error('请确认新密码'));
    }
    if (value !== passwordForm.getFieldValue('newPassword')) {
      return Promise.reject(new Error('两次输入的密码不一致'));
    }
    return Promise.resolve();
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <Title level={2} className="!mb-2">
          个人资料
        </Title>
        <Text type="secondary">
          管理您的个人信息和账户设置
        </Text>
      </div>

      {(error || success) && (
        <Alert
          message={error || success}
          type={error ? 'error' : 'success'}
          showIcon
          className="mb-6"
          closable
          onClose={() => {
            setError('');
            setSuccess('');
          }}
        />
      )}

      <Tabs 
        defaultActiveKey="profile" 
        size="large"
        items={[
          {
            key: 'profile',
            label: (
              <span className="flex items-center gap-2">
                <UserOutlined />
                基本信息
              </span>
            ),
            children: (
              <Card className="shadow-sm">
                <div className="flex flex-col lg:flex-row gap-8">
                  {/* 头像部分 */}
                  <div className="flex flex-col items-center">
                    <Upload {...uploadProps}>
                      <div className="relative">
                        <Avatar
                          size={120}
                          src={avatarUrl}
                          icon={!avatarUrl && <UserOutlined />}
                          className="border-4 border-white shadow-lg"
                        />
                        <div className={cn(
                          'absolute inset-0 bg-black/50 rounded-full',
                          'flex items-center justify-center opacity-0 hover:opacity-100',
                          'transition-opacity duration-200 cursor-pointer'
                        )}>
                          <CameraOutlined className="text-white text-xl" />
                        </div>
                      </div>
                    </Upload>
                    <Text type="secondary" className="mt-2 text-center text-sm">
                      点击更换头像
                      <br />
                      支持 JPG、PNG 格式
                      <br />
                      文件大小不超过 2MB
                    </Text>
                  </div>

                  {/* 表单部分 */}
                  <div className="flex-1">
                    <Form
                      form={profileForm}
                      layout="vertical"
                      onFinish={handleProfileSubmit}
                      initialValues={{
                        name: user?.name,
                        email: user?.email,
                        school: user?.school,
                        subject: user?.subject,
                        grades: user?.grades
                      }}
                      size="large"
                    >
                      <div className="grid md:grid-cols-2 gap-4">
                        <Form.Item
                          name="name"
                          label="真实姓名"
                          rules={[
                            { required: true, message: '请输入真实姓名' },
                            { min: 2, message: '姓名至少2个字符' }
                          ]}
                        >
                          <Input
                            prefix={<UserOutlined className="text-gray-400" />}
                            placeholder="请输入真实姓名"
                          />
                        </Form.Item>

                        <Form.Item
                          name="email"
                          label="邮箱地址"
                          rules={[
                            { required: true, message: '请输入邮箱地址' },
                            { type: 'email', message: '请输入有效的邮箱地址' }
                          ]}
                        >
                          <Input
                            prefix={<MailOutlined className="text-gray-400" />}
                            placeholder="请输入邮箱地址"
                          />
                        </Form.Item>
                      </div>

                      <Form.Item
                        name="school"
                        label="学校名称"
                      >
                        <Input
                          prefix={<BankOutlined className="text-gray-400" />}
                          placeholder="请输入学校名称（可选）"
                        />
                      </Form.Item>

                      <div className="grid md:grid-cols-2 gap-4">
                        <Form.Item
                          name="subject"
                          label="任教学科"
                        >
                          <Select
                            placeholder="请选择任教学科（可选）"
                            suffixIcon={<BookOutlined className="text-gray-400" />}
                          >
                            {subjects.map(subject => (
                              <Option key={subject.value} value={subject.value}>
                                {subject.label}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>

                        <Form.Item
                          name="grades"
                          label="任教年级"
                        >
                          <Select
                            mode="multiple"
                            placeholder="请选择任教年级（可选）"
                          >
                            {grades.map(grade => (
                              <Option key={grade.value} value={grade.value}>
                                {grade.label}
                              </Option>
                            ))}
                          </Select>
                        </Form.Item>
                      </div>

                      <Form.Item className="!mb-0">
                        <Space>
                          <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            className="px-8"
                          >
                            保存更改
                          </Button>
                          <Button
                            onClick={() => profileForm.resetFields()}
                          >
                            重置
                          </Button>
                        </Space>
                      </Form.Item>
                    </Form>
                  </div>
                </div>
              </Card>
            )
          },
          {
            key: 'password',
            label: (
              <span className="flex items-center gap-2">
                <LockOutlined />
                修改密码
              </span>
            ),
            children: (
              <Card className="shadow-sm">
                <div className="max-w-md">
                  <div className="mb-6">
                    <Title level={4} className="!mb-2">
                      修改密码
                    </Title>
                    <Text type="secondary">
                      为了账户安全，请定期更换密码
                    </Text>
                  </div>

                  <Form
                    form={passwordForm}
                    layout="vertical"
                    onFinish={handlePasswordSubmit}
                    size="large"
                  >
                    <Form.Item
                      name="currentPassword"
                      label="当前密码"
                      rules={[
                        { required: true, message: '请输入当前密码' }
                      ]}
                    >
                      <Input.Password
                        prefix={<LockOutlined className="text-gray-400" />}
                        placeholder="请输入当前密码"
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                      />
                    </Form.Item>

                    <Form.Item
                      name="newPassword"
                      label="新密码"
                      rules={[{ validator: validatePassword }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined className="text-gray-400" />}
                        placeholder="请输入新密码"
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                      />
                    </Form.Item>

                    <Form.Item
                      name="confirmPassword"
                      label="确认新密码"
                      rules={[{ validator: validateConfirmPassword }]}
                    >
                      <Input.Password
                        prefix={<LockOutlined className="text-gray-400" />}
                        placeholder="请再次输入新密码"
                        iconRender={(visible) => (visible ? <EyeTwoTone /> : <EyeInvisibleOutlined />)}
                      />
                    </Form.Item>

                    <Form.Item className="!mb-0">
                      <Space>
                        <Button
                          type="primary"
                          htmlType="submit"
                          loading={passwordLoading}
                          className="px-8"
                        >
                          修改密码
                        </Button>
                        <Button
                          onClick={() => passwordForm.resetFields()}
                        >
                          重置
                        </Button>
                      </Space>
                    </Form.Item>
                  </Form>
                </div>
              </Card>
            )
          }
        ]}
      />
    </div>
  );
};