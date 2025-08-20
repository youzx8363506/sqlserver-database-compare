import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Form,
  Input,
  Select,
  Button,
  Card,
  Space,
  Typography,
  Alert,
  message,
} from 'antd';
import {
  DatabaseOutlined,
  UserOutlined,
  LockOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { DatabaseConfig } from '../types';
import { databaseApi } from '../services/api';

const { Title, Text } = Typography;
const { Option } = Select;

interface DatabaseConfigFormProps {
  title: string;
  initialValues?: Partial<DatabaseConfig>;
  onConfigChange?: (config: DatabaseConfig) => void;
  onTestSuccess?: (config: DatabaseConfig) => void;
  disabled?: boolean;
  formId?: string; // 添加formId属性用于生成唯一ID
}

const DatabaseConfigForm: React.FC<DatabaseConfigFormProps> = ({
  title,
  initialValues,
  onConfigChange,
  onTestSuccess,
  disabled = false,
  formId = 'default', // 默认formId
}) => {
  const [form] = Form.useForm();
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [authType, setAuthType] = useState<'windows' | 'sql'>(
    initialValues?.authentication?.type || 'windows'
  );
  const [isInitialized, setIsInitialized] = useState(false);
  const lastConfigRef = useRef<string>(''); // 用于防止重复更新

  // 当initialValues变化时更新表单 - 只在首次初始化时应用
  useEffect(() => {
    if (initialValues && !isInitialized) {
      console.log(`🔄 [配置表单] ${title} 首次初始化:`, initialValues);
      const authType = initialValues.authentication?.type || 'windows';
      
      // 设置表单值
      form.setFieldsValue({
        server: initialValues.server || '',
        database: initialValues.database || '',
        authType: authType,
        username: initialValues.authentication?.username || '',
        password: initialValues.authentication?.password || '',
      });
      
      // 更新认证类型状态
      setAuthType(authType);
      console.log(`🔄 [配置表单] ${title} 认证类型首次设置为: ${authType}`);
      
      // 标记为已初始化
      setIsInitialized(true);
    }
  }, [initialValues, isInitialized, form, title]);

  // 使用useCallback优化handleFormChange，避免不必要的重新渲染
  const handleFormChange = useCallback(() => {
    const values = form.getFieldsValue();
    if (values.server && values.database) {
      const config: DatabaseConfig = {
        server: values.server,
        database: values.database,
        authentication: {
          type: authType,
          username: authType === 'sql' ? values.username : undefined,
          password: authType === 'sql' ? values.password : undefined,
        },
      };
      
      // 生成配置的唯一标识，避免重复更新
      const configKey = JSON.stringify(config);
      if (configKey !== lastConfigRef.current) {
        lastConfigRef.current = configKey;
        onConfigChange?.(config);
      }
    }
  }, [form, authType, onConfigChange]);

  // 监听 authType 变化，触发表单更新 - 使用防重复机制避免死循环
  useEffect(() => {
    // 只在初始化完成后触发
    if (isInitialized) {
      console.log(`🔄 [配置表单] ${title} authType变化为: ${authType}, 触发表单更新`);
      handleFormChange();
    }
  }, [authType, isInitialized, handleFormChange]);

  // 组件加载完成后设置初始化标志
  useEffect(() => {
    if (!initialValues) {
      setIsInitialized(true);
    }
  }, []);

  // 处理认证类型变化
  const handleAuthTypeChange = (value: 'windows' | 'sql') => {
    console.log(`🔄 [配置表单] ${title} 认证类型变为: ${value}`);
    setAuthType(value);
    // 清除测试结果
    setTestResult(null);
    // 由于useEffect会监听authType变化，这里不需要手动调用handleFormChange
  };

  // handleFormChange 已移至上方useCallback定义

  // 测试数据库连接
  const handleTestConnection = async () => {
    try {
      const values = await form.validateFields();
      setTesting(true);
      setTestResult(null);

      const config: DatabaseConfig = {
        server: values.server,
        database: values.database,
        authentication: {
          type: authType,
          username: authType === 'sql' ? values.username : undefined,
          password: authType === 'sql' ? values.password : undefined,
        },
      };

      const response = await databaseApi.testConnection(config);
      
      if (response.success) {
        setTestResult({
          success: true,
          message: response.message || '数据库连接成功！',
        });
        message.success('数据库连接测试成功！');
        onTestSuccess?.(config);
      } else {
        setTestResult({
          success: false,
          message: response.error || '数据库连接失败',
        });
        message.error('数据库连接测试失败！');
      }
    } catch (error: any) {
      console.error('测试连接失败:', error);
      setTestResult({
        success: false,
        message: error.response?.data?.error || error.message || '连接测试失败',
      });
      message.error('数据库连接测试失败！');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card 
      title={
        <Space>
          <DatabaseOutlined />
          <Title level={4} style={{ margin: 0 }}>
            {title}
          </Title>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          server: initialValues?.server || '',
          database: initialValues?.database || '',
          authType: initialValues?.authentication?.type || 'windows',
          username: initialValues?.authentication?.username || '',
          password: initialValues?.authentication?.password || '',
        }}
        onValuesChange={handleFormChange}
        disabled={disabled}
      >
        <Form.Item
          name="server"
          label={
            <Space>
              <DatabaseOutlined />
              <Text>服务器地址</Text>
            </Space>
          }
          rules={[
            { required: true, message: '请输入服务器地址' },
            { min: 1, message: '服务器地址不能为空' },
          ]}
        >
          <Input
            id={`${formId}-server`}
            placeholder="例如：localhost 或 192.168.1.100 或 SERVER\\INSTANCE"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="database"
          label={
            <Space>
              <DatabaseOutlined />
              <Text>数据库名称</Text>
            </Space>
          }
          rules={[
            { required: true, message: '请输入数据库名称' },
            { min: 1, message: '数据库名称不能为空' },
          ]}
        >
          <Input
            id={`${formId}-database`}
            placeholder="例如：MyDatabase"
            size="large"
          />
        </Form.Item>

        <Form.Item
          name="authType"
          label="认证方式"
          rules={[{ required: true, message: '请选择认证方式' }]}
        >
          <Select
            id={`${formId}-authType`}
            onChange={handleAuthTypeChange}
            size="large"
            placeholder="选择认证方式"
          >
            <Option value="windows">Windows 认证</Option>
            <Option value="sql">SQL Server 认证</Option>
          </Select>
        </Form.Item>

        {/* SQL Server认证字段 - 当authType为'sql'时显示 */}
        {authType === 'sql' && (
          <>
            <Form.Item
              name="username"
              label={
                <Space>
                  <UserOutlined />
                  <Text>用户名</Text>
                </Space>
              }
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 1, message: '用户名不能为空' },
              ]}
            >
              <Input
                id={`${formId}-username`}
                placeholder="SQL Server 用户名"
                size="large"
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={
                <Space>
                  <LockOutlined />
                  <Text>密码</Text>
                </Space>
              }
              rules={[
                { required: true, message: '请输入密码' },
                { min: 1, message: '密码不能为空' },
              ]}
            >
              <Input.Password
                id={`${formId}-password`}
                placeholder="SQL Server 密码"
                size="large"
              />
            </Form.Item>
          </>
        )}

        <Form.Item>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={handleTestConnection}
            loading={testing}
            disabled={disabled}
            size="large"
            block
          >
            {testing ? '测试连接中...' : '测试数据库连接'}
          </Button>
        </Form.Item>

        {testResult && (
          <Alert
            message={testResult.success ? '连接成功' : '连接失败'}
            description={testResult.message}
            type={testResult.success ? 'success' : 'error'}
            showIcon
            style={{ marginTop: 16 }}
          />
        )}
      </Form>
    </Card>
  );
};

export default DatabaseConfigForm;