import React, { useState, useEffect } from 'react';
import {
  Modal,
  Table,
  Button,
  Space,
  Form,
  Input,
  message,
  Popconfirm,
  Typography,
  Alert,
  Card,
  Row,
  Col,
  Tag,
} from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  HistoryOutlined,
  DatabaseOutlined,
  PlusOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import { SavedConfig, SavedConfigInput, DatabaseConfig, DatabaseConfigPair } from '../types';
import { configApi } from '../services/api';

const { Title, Text } = Typography;

interface ConfigManagerProps {
  visible: boolean;
  onClose: () => void;
  onApplyConfig?: (config: DatabaseConfigPair) => void;
  currentConfig?: DatabaseConfigPair | null;
}

const ConfigManager: React.FC<ConfigManagerProps> = ({
  visible,
  onClose,
  onApplyConfig,
  currentConfig,
}) => {
  const [configs, setConfigs] = useState<SavedConfig[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveModalVisible, setSaveModalVisible] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SavedConfig | null>(null);
  const [form] = Form.useForm();

  // 获取配置列表
  const fetchConfigs = async () => {
    setLoading(true);
    try {
      console.log(`📋 [配置管理] 获取配置列表`);
      const response = await configApi.getSavedConfigs();
      if (response.success) {
        setConfigs(response.data || []);
        console.log(`✅ [配置管理] 获取到 ${response.data?.length || 0} 个配置`);
      }
    } catch (error: any) {
      console.error('❌ [配置管理] 获取配置列表失败:', error);
      message.error('获取配置列表失败');
    } finally {
      setLoading(false);
    }
  };

  // 保存配置
  const handleSaveConfig = async (values: any) => {
    if (!currentConfig) {
      message.error('当前没有可保存的配置');
      return;
    }

    try {
      const configInput: SavedConfigInput = {
        name: values.name,
        source: currentConfig.source,
        target: currentConfig.target,
      };

      let response;
      if (editingConfig) {
        // 更新现有配置
        response = await configApi.updateConfig(editingConfig.id, configInput);
        message.success('配置更新成功');
      } else {
        // 保存新配置
        response = await configApi.saveConfig(configInput);
        message.success('配置保存成功');
      }

      if (response.success) {
        await fetchConfigs();
        setSaveModalVisible(false);
        setEditingConfig(null);
        form.resetFields();
      }
    } catch (error: any) {
      console.error('❌ [配置管理] 保存配置失败:', error);
      if (error.response?.status === 400) {
        message.error(error.response.data.error || '保存失败：配置名称已存在');
      } else {
        message.error('保存配置失败');
      }
    }
  };

  // 删除配置
  const handleDeleteConfig = async (id: string) => {
    try {
      const response = await configApi.deleteConfig(id);
      if (response.success) {
        message.success('配置删除成功');
        await fetchConfigs();
      }
    } catch (error: any) {
      console.error('❌ [配置管理] 删除配置失败:', error);
      message.error('删除配置失败');
    }
  };

  // 应用配置
  const handleApplyConfig = async (config: SavedConfig) => {
    try {
      const response = await configApi.useConfig(config.id);
      if (response.success && response.data) {
        message.success(`已应用配置 "${config.name}"`);
        onApplyConfig?.(response.data);
        onClose();
      }
    } catch (error: any) {
      console.error('❌ [配置管理] 应用配置失败:', error);
      message.error('应用配置失败');
    }
  };

  // 打开保存配置对话框
  const handleOpenSaveDialog = (config?: SavedConfig) => {
    if (config) {
      setEditingConfig(config);
      form.setFieldsValue({ name: config.name });
    } else {
      setEditingConfig(null);
      form.resetFields();
    }
    setSaveModalVisible(true);
  };

  // 组件挂载时获取配置
  useEffect(() => {
    if (visible) {
      fetchConfigs();
    }
  }, [visible]);

  // 渲染数据库配置信息
  const renderConfigInfo = (config: DatabaseConfig, title: string) => (
    <Card size="small" title={title} style={{ marginBottom: 8 }}>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        <Text><DatabaseOutlined /> 服务器: <Text code>{config.server}</Text></Text>
        <Text><DatabaseOutlined /> 数据库: <Text code>{config.database}</Text></Text>
        <Text>认证: <Tag color={config.authentication.type === 'windows' ? 'blue' : 'green'}>
          {config.authentication.type === 'windows' ? 'Windows认证' : 'SQL Server认证'}
        </Tag></Text>
        {config.authentication.type === 'sql' && (
          <Text>用户: <Text code>{config.authentication.username || 'N/A'}</Text></Text>
        )}
      </Space>
    </Card>
  );

  const columns = [
    {
      title: '配置名称',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: '源数据库',
      key: 'source',
      render: (_: any, record: SavedConfig) => (
        <Space direction="vertical" size="small">
          <Text><DatabaseOutlined /> {record.source.server}.{record.source.database}</Text>
          <Tag color={record.source.authentication.type === 'windows' ? 'blue' : 'green'}>
            {record.source.authentication.type === 'windows' ? 'Windows' : 'SQL'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '目标数据库',
      key: 'target',
      render: (_: any, record: SavedConfig) => (
        <Space direction="vertical" size="small">
          <Text><DatabaseOutlined /> {record.target.server}.{record.target.database}</Text>
          <Tag color={record.target.authentication.type === 'windows' ? 'blue' : 'green'}>
            {record.target.authentication.type === 'windows' ? 'Windows' : 'SQL'}
          </Tag>
        </Space>
      ),
    },
    {
      title: '最近使用',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      render: (time: string) => new Date(time).toLocaleString(),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: SavedConfig) => (
        <Space size="small">
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            onClick={() => handleApplyConfig(record)}
          >
            应用
          </Button>
          <Button
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleOpenSaveDialog(record)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定删除这个配置吗？"
            onConfirm={() => handleDeleteConfig(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Modal
        title={
          <Space>
            <HistoryOutlined />
            <Title level={4} style={{ margin: 0 }}>配置管理</Title>
          </Space>
        }
        open={visible}
        onCancel={onClose}
        width={1000}
        footer={
          <Space>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => handleOpenSaveDialog()}
              disabled={!currentConfig}
            >
              保存当前配置
            </Button>
            <Button onClick={onClose}>关闭</Button>
          </Space>
        }
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="配置管理说明"
            description="您可以保存常用的数据库配置组合，下次使用时直接选择应用。配置将保存服务器地址、数据库名称和认证方式等信息。"
            type="info"
            showIcon
          />

          {currentConfig && (
            <Card title="当前配置预览" size="small">
              <Row gutter={16}>
                <Col span={12}>
                  {renderConfigInfo(currentConfig.source, '源数据库')}
                </Col>
                <Col span={12}>
                  {renderConfigInfo(currentConfig.target, '目标数据库')}
                </Col>
              </Row>
            </Card>
          )}

          <Table
            columns={columns}
            dataSource={configs}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 5,
              showSizeChanger: false,
              showQuickJumper: false,
            }}
            scroll={{ x: true }}
            locale={{ emptyText: '暂无保存的配置' }}
          />
        </Space>
      </Modal>

      {/* 保存配置对话框 */}
      <Modal
        title={editingConfig ? '编辑配置' : '保存配置'}
        open={saveModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setSaveModalVisible(false);
          setEditingConfig(null);
          form.resetFields();
        }}
        okText="保存"
        cancelText="取消"
      >
        <Form form={form} onFinish={handleSaveConfig} layout="vertical">
          <Alert
            message="保存提示"
            description={editingConfig ? '修改配置名称后点击保存' : '为当前的数据库配置组合起一个便于记忆的名称'}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
          <Form.Item
            name="name"
            label="配置名称"
            rules={[
              { required: true, message: '请输入配置名称' },
              { min: 2, max: 50, message: '配置名称长度应为2-50个字符' },
            ]}
          >
            <Input
              placeholder="例如：生产环境数据库对比、开发测试对比"
              maxLength={50}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
};

export default ConfigManager;