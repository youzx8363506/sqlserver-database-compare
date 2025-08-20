import React, { useState } from 'react';
import { Button, Card, Form, Input, Select, message, Space, Typography } from 'antd';
import { databaseApi } from './services/api';

const { Title } = Typography;
const { Option } = Select;

const Test: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [form] = Form.useForm();

  const handleTestQuickConnection = async (values: any) => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('发送test-quick连接请求:', values);
      
      const response = await databaseApi.testQuickConnection({
        server: values.server,
        database: values.database,
        authType: values.authType,
        username: values.username,
        password: values.password,
      });
      
      console.log('test-quick连接响应:', response);
      
      if (response.success) {
        message.success('数据库连接成功 (test-quick风格)');
        setResult(response);
      } else {
        message.error('数据库连接失败: ' + response.error);
        setResult(response);
      }
    } catch (error: any) {
      console.error('test-quick连接错误:', error);
      message.error('连接测试失败: ' + (error.response?.data?.details || error.message));
      setResult(error.response?.data || { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTestNormalConnection = async (values: any) => {
    setLoading(true);
    setResult(null);
    
    try {
      console.log('发送普通连接请求:', values);
      
      const response = await databaseApi.testConnection({
        server: values.server,
        database: values.database,
        authentication: {
          type: values.authType,
          username: values.username,
          password: values.password,
        },
      });
      
      console.log('普通连接响应:', response);
      
      if (response.success) {
        message.success('数据库连接成功 (普通方式)');
        setResult(response);
      } else {
        message.error('数据库连接失败: ' + response.error);
        setResult(response);
      }
    } catch (error: any) {
      console.error('普通连接错误:', error);
      message.error('连接测试失败: ' + (error.response?.data?.details || error.message));
      setResult(error.response?.data || { error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <Title level={2}>数据库连接测试</Title>
      
      <Card title="连接配置" style={{ marginBottom: '20px' }}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            server: 'localhost',
            database: 'master',
            authType: 'sql',
            username: 'sa',
            password: 'wash021',
          }}
        >
          <Form.Item
            label="服务器地址"
            name="server"
            rules={[{ required: true, message: '请输入服务器地址' }]}
          >
            <Input placeholder="localhost" />
          </Form.Item>

          <Form.Item
            label="数据库名称"
            name="database"
            rules={[{ required: true, message: '请输入数据库名称' }]}
          >
            <Input placeholder="master" />
          </Form.Item>

          <Form.Item
            label="认证方式"
            name="authType"
            rules={[{ required: true, message: '请选择认证方式' }]}
          >
            <Select>
              <Option value="sql">SQL Server 认证</Option>
              <Option value="windows">Windows 认证</Option>
            </Select>
          </Form.Item>

          <Form.Item
            label="用户名"
            name="username"
            dependencies={['authType']}
            rules={[
              ({ getFieldValue }) => ({
                required: getFieldValue('authType') === 'sql',
                message: 'SQL认证需要用户名',
              }),
            ]}
          >
            <Input placeholder="sa" />
          </Form.Item>

          <Form.Item
            label="密码"
            name="password"
            dependencies={['authType']}
            rules={[
              ({ getFieldValue }) => ({
                required: getFieldValue('authType') === 'sql',
                message: 'SQL认证需要密码',
              }),
            ]}
          >
            <Input.Password placeholder="密码" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button
                type="primary"
                loading={loading}
                onClick={() => {
                  form.validateFields().then(handleTestQuickConnection);
                }}
              >
                Test-Quick风格连接测试
              </Button>
              <Button
                type="default"
                loading={loading}
                onClick={() => {
                  form.validateFields().then(handleTestNormalConnection);
                }}
              >
                普通连接测试
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      {result && (
        <Card title="测试结果">
          <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
};

export default Test;