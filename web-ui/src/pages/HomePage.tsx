import React, { useState, useEffect } from 'react';
import {
  Layout,
  Row,
  Col,
  Steps,
  Button,
  Space,
  Typography,
  Alert,
  message,
  Card,
  Tag,
} from 'antd';
import {
  DatabaseOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
  HistoryOutlined,
} from '@ant-design/icons';
import DatabaseConfigForm from '../components/DatabaseConfigForm';
import ComparisonProgress from '../components/ComparisonProgress';
import ComparisonResults from '../components/ComparisonResults';
import ConfigManager from '../components/ConfigManager';
import { DatabaseConfig, ComparisonResult, DatabaseConfigPair } from '../types';
import { compareApi, configApi } from '../services/api';
import socketService from '../services/socket';
import TaskCacheManager, { TaskSession } from '../services/TaskCacheManager';
import SessionRecoveryPrompt from '../components/SessionRecoveryPrompt';
import { useSessionRecovery } from '../hooks/useSessionRecovery';

const { Header, Content } = Layout;
const { Title, Paragraph } = Typography;

const HomePage: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [sourceConfig, setSourceConfig] = useState<DatabaseConfig | null>(null);
  const [targetConfig, setTargetConfig] = useState<DatabaseConfig | null>(null);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [configManagerVisible, setConfigManagerVisible] = useState(false);
  const [comparisonTaskId, setComparisonTaskId] = useState<string | null>(null);
  const [comparisonResult, setComparisonResult] = useState<ComparisonResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [webSocketStatus, setWebSocketStatus] = useState<'connected' | 'connecting' | 'disconnected'>('disconnected');
  
  // 缓存管理器和会话恢复
  const cacheManager = TaskCacheManager.getInstance();
  const { getRecommendedStep } = useSessionRecovery();

  // 步骤配置
  const steps = [
    {
      title: '配置数据库',
      description: '设置源数据库和目标数据库连接',
      icon: <DatabaseOutlined />,
    },
    {
      title: '执行比较',
      description: '分析数据库结构差异',
      icon: <DatabaseOutlined />,
    },
    {
      title: '查看结果',
      description: '查看比较结果和生成报告',
      icon: <FileTextOutlined />,
    },
  ];

  // WebSocket状态指示器组件
  const WebSocketStatusIndicator = () => {
    const getStatusConfig = () => {
      switch (webSocketStatus) {
        case 'connected':
          return { color: '#52c41a', text: 'WebSocket已连接', icon: CheckCircleOutlined };
        case 'connecting':
          return { color: '#faad14', text: 'WebSocket连接中...', icon: LoadingOutlined };
        case 'disconnected':
          return { color: '#ff4d4f', text: 'WebSocket未连接', icon: CloseCircleOutlined };
      }
    };
    
    const config = getStatusConfig();
    
    return (
      <Space style={{ marginLeft: 'auto' }}>
        <Tag 
          color={config.color} 
          style={{ borderRadius: '12px', padding: '4px 12px' }}
        >
          <Space size={4}>
            {React.createElement(config.icon, { 
              style: { fontSize: '12px' } 
            })}
            {config.text}
          </Space>
        </Tag>
        {webSocketStatus === 'disconnected' && (
          <Button 
            size="small" 
            type="primary" 
            onClick={handleReconnectWebSocket}
          >
            重新连接
          </Button>
        )}
      </Space>
    );
  };

  // 处理WebSocket重连
  const handleReconnectWebSocket = async () => {
    try {
      setWebSocketStatus('connecting');
      console.log('🔄 [前端] 手动重新连接WebSocket...');
      
      await socketService.connect();
      setWebSocketStatus('connected');
      console.log('✅ [前端] WebSocket重新连接成功');
      message.success('WebSocket重新连接成功');
    } catch (error: any) {
      setWebSocketStatus('disconnected');
      console.error('❌ [前端] WebSocket重新连接失败:', error);
      message.error(`WebSocket重新连接失败: ${error.message}`);
    }
  };

  // 加载最近使用的配置
  const loadLastUsedConfig = async () => {
    try {
      console.log('🔍 [配置] 加载最近使用的配置...');
      const response = await configApi.getLastUsedConfig();
      
      if (response.success && response.data) {
        console.log('✅ [配置] 成功加载最近配置:', response.data);
        setSourceConfig(response.data.source);
        setTargetConfig(response.data.target);
        message.success('已自动加载最近使用的数据库配置');
      } else {
        console.log('ℹ️ [配置] 没有找到最近使用的配置');
      }
    } catch (error: any) {
      console.error('❌ [配置] 加载配置失败:', error);
      // 不显示错误消息，因为这是后台操作
    } finally {
      setConfigLoaded(true);
    }
  };

  // 保存当前配置为最近使用的配置
  const saveLastUsedConfig = async () => {
    if (!sourceConfig || !targetConfig) return;
    
    try {
      console.log('💾 [配置] 保存最近使用的配置...');
      const configPair: DatabaseConfigPair = {
        source: sourceConfig,
        target: targetConfig
      };
      
      const response = await configApi.saveLastUsedConfig(configPair);
      if (response.success) {
        console.log('✅ [配置] 最近配置保存成功');
      }
    } catch (error: any) {
      console.error('❌ [配置] 保存配置失败:', error);
      // 不显示错误消息，因为这是后台操作
    }
  };

  // 初始化：加载配置和WebSocket连接
  useEffect(() => {
    const init = async () => {
      // 加载配置
      await loadLastUsedConfig();
      
      // 初始化WebSocket
      try {
        setWebSocketStatus('connecting');
        console.log('🔗 [前端] 页面加载，初始化WebSocket连接...');
        
        await socketService.connect();
        setWebSocketStatus('connected');
        console.log('✅ [前端] WebSocket初始连接成功');
      } catch (error: any) {
        setWebSocketStatus('disconnected');
        console.error('❌ [前端] WebSocket初始连接失败:', error);
      }
    };

    init();

    // 组件卸载时断开连接
    return () => {
      socketService.disconnect();
    };
  }, []);

  // 开始比较
  const startComparison = async () => {
    if (!sourceConfig || !targetConfig) {
      message.error('请先配置源数据库和目标数据库连接');
      return;
    }

    setLoading(true);
    try {
      console.log('🚀 [前端] 开始启动比较任务...');
      
      // 保存当前配置为最近使用
      await saveLastUsedConfig();
      
      const response = await compareApi.startComparison(sourceConfig, targetConfig);
      
      if (response.success) {
        const taskId = response.data?.taskId;
        console.log(`✅ [前端] 比较任务启动成功，任务ID: ${taskId}`);
        
        // 缓存任务配置信息
        if (taskId) {
          cacheManager.cacheTaskSession(taskId, {
            taskId,
            sourceConfig,
            targetConfig,
            status: 'pending',
            progress: 0,
            currentStep: 1,
            createdAt: new Date().toISOString()
          });
        }
        
        setComparisonTaskId(taskId || null);
        setCurrentStep(1); // 立即切换到进度页面
        
        message.success('数据库比较任务已启动');
      } else {
        console.error('❌ [前端] 启动比较任务失败:', response.error);
        message.error(response.error || '启动比较任务失败');
      }
    } catch (error: any) {
      console.error('❌ [前端] 启动比较失败:', error);
      message.error('启动比较任务失败');
    } finally {
      setLoading(false);
    }
  };

  // 比较完成处理
  const handleComparisonComplete = (result: any) => {
    console.log('🎉 [前端HomePage] 收到比较完成通知:', result);
    console.log('🔍 [调试] 比较完成数据结构:', JSON.stringify(result, null, 2));
    
    // 统一数据格式处理：兼容WebSocket和API轮询两种数据结构
    let actualResult: ComparisonResult;
    
    if (result && result.result) {
      // WebSocket格式：CompleteEvent {taskId, result: ComparisonResult, summary}
      console.log('📡 [数据处理] 检测到WebSocket格式数据');
      actualResult = result.result;
    } else if (result && (result.summary || result.differences)) {
      // API轮询格式：直接是ComparisonResult
      console.log('🔄 [数据处理] 检测到API轮询格式数据');
      actualResult = result;
    } else {
      // 数据格式异常
      console.error('❌ [数据处理] 未知的比较结果格式:', result);
      message.error('比较结果数据格式异常，请重新进行比较');
      return;
    }
    
    // 验证比较结果数据完整性
    if (!actualResult || !actualResult.differences) {
      console.error('❌ [数据验证] 比较结果数据不完整:', actualResult);
      message.error('比较结果数据不完整，请重新进行比较');
      return;
    }
    
    console.log('✅ [数据处理] 比较结果数据验证通过:', actualResult);
    
    setComparisonResult(actualResult);
    setCurrentStep(2);
    
    // 缓存完成状态和结果
    if (comparisonTaskId) {
      cacheManager.cacheComparisonResult(comparisonTaskId, actualResult);
      cacheManager.updateTaskStatus(comparisonTaskId, 'completed', 100, 2);
    }
    
    message.success('数据库比较已完成！');
  };

  // 比较错误处理
  const handleComparisonError = (error: string) => {
    // 更新缓存中的错误状态
    if (comparisonTaskId) {
      cacheManager.updateTaskStatus(comparisonTaskId, 'error', 0, currentStep, error);
    }
    
    message.error(`比较过程发生错误: ${error}`);
  };

  // 重新开始
  const restart = () => {
    setCurrentStep(0);
    setSourceConfig(null);
    setTargetConfig(null);
    setComparisonTaskId(null);
    setComparisonResult(null);
    
    // 清理过期缓存（可选）
    cacheManager.cleanupExpiredCache();
  };

  // 应用配置
  const handleApplyConfig = (configPair: DatabaseConfigPair) => {
    console.log('🔄 [配置] 应用配置:', configPair);
    setSourceConfig(configPair.source);
    setTargetConfig(configPair.target);
    message.success('配置应用成功！请测试数据库连接');
  };

  // 获取当前配置对
  const getCurrentConfigPair = (): DatabaseConfigPair | null => {
    if (sourceConfig && targetConfig) {
      return { source: sourceConfig, target: targetConfig };
    }
    return null;
  };

  // 检查是否可以进行下一步
  const canProceedToComparison = () => {
    return sourceConfig && targetConfig;
  };

  // 处理会话恢复
  const handleSessionRecover = (taskId: string, session: TaskSession) => {
    console.log('🔄 恢复会话数据:', session);
    
    // 恢复状态
    setComparisonTaskId(taskId);
    setSourceConfig(session.sourceConfig);
    setTargetConfig(session.targetConfig);
    
    if (session.result) {
      setComparisonResult(session.result);
      setCurrentStep(2); // 跳转到结果页面
      message.success('会话恢复成功！已跳转到比较结果页面');
    } else if (session.status === 'running') {
      setCurrentStep(1); // 跳转到进度页面
      message.success('会话恢复成功！继续监控比较进度');
    } else {
      setCurrentStep(getRecommendedStep(session)); // 根据状态确定步骤
      message.success('会话恢复成功！配置信息已自动填充');
    }
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#f0f2f5' }}>
      <Header style={{ background: '#fff', padding: '0 24px', borderBottom: '1px solid #f0f0f0' }}>
        <Row align="middle" justify="space-between" style={{ height: '100%' }}>
          <Col>
            <Space>
              <DatabaseOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
              <Title level={3} style={{ margin: 0, color: '#1890ff' }}>
                SQL Server 数据库比较工具
              </Title>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button type="primary" size="small">主页</Button>
              <Button size="small">连接测试</Button>
              <WebSocketStatusIndicator />
            </Space>
          </Col>
        </Row>
      </Header>

      <Content style={{ padding: '24px', overflow: 'auto' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', width: '100%' }}>
          {/* 会话恢复提示 */}
          <SessionRecoveryPrompt onRecover={handleSessionRecover} />
          
          {/* 步骤指示器 */}
          <Card style={{ marginBottom: 24 }}>
            <Steps current={currentStep} items={steps} />
          </Card>

          {/* 步骤内容 */}
          {currentStep === 0 && (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Card>
                <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
                  <Col>
                    <Alert
                      message="配置数据库连接"
                      description="请分别配置源数据库和目标数据库的连接信息。系统将比较这两个数据库的结构差异。"
                      type="info"
                      showIcon
                    />
                  </Col>
                  <Col>
                    <Space>
                      <Button
                        icon={<HistoryOutlined />}
                        onClick={() => setConfigManagerVisible(true)}
                      >
                        配置管理
                      </Button>
                    </Space>
                  </Col>
                </Row>
              </Card>

              <Row gutter={[24, 24]}>
                <Col xs={24} lg={12}>
                  <DatabaseConfigForm
                    title="源数据库"
                    formId="source"
                    initialValues={configLoaded && sourceConfig ? sourceConfig : undefined}
                    onConfigChange={setSourceConfig}
                    onTestSuccess={(config) => {
                      setSourceConfig(config);
                      message.success('源数据库连接配置成功');
                    }}
                  />
                </Col>
                <Col xs={24} lg={12}>
                  <DatabaseConfigForm
                    title="目标数据库"
                    formId="target"
                    initialValues={configLoaded && targetConfig ? targetConfig : undefined}
                    onConfigChange={setTargetConfig}
                    onTestSuccess={(config) => {
                      setTargetConfig(config);
                      message.success('目标数据库连接配置成功');
                    }}
                  />
                </Col>
              </Row>

              <Card>
                <Space style={{ width: '100%', justifyContent: 'center' }}>
                  <Button
                    type="primary"
                    size="large"
                    onClick={startComparison}
                    disabled={!canProceedToComparison()}
                    loading={loading}
                  >
                    开始数据库比较
                  </Button>
                </Space>
                {!canProceedToComparison() && (
                  <div style={{ textAlign: 'center', marginTop: 12 }}>
                    <Paragraph type="secondary">
                      请先完成源数据库和目标数据库的连接测试
                    </Paragraph>
                  </div>
                )}
              </Card>
            </Space>
          )}

          {currentStep === 1 && comparisonTaskId && (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              <Alert
                message="正在执行数据库比较"
                description="系统正在分析两个数据库的结构差异，请耐心等待。您可以实时查看比较进度和执行日志。"
                type="info"
                showIcon
              />

              <ComparisonProgress
                taskId={comparisonTaskId}
                onComplete={handleComparisonComplete}
                onError={handleComparisonError}
              />

              <Card>
                <Space style={{ width: '100%', justifyContent: 'center' }}>
                  <Button onClick={restart}>
                    重新开始
                  </Button>
                </Space>
              </Card>
            </Space>
          )}

          {currentStep === 2 && comparisonTaskId && (
            <Space direction="vertical" style={{ width: '100%' }} size="large">
              {comparisonResult ? (
                <>
                  <Alert
                    message="数据库比较完成"
                    description="比较结果已生成，您可以查看详细的差异信息并生成报告文件。"
                    type="success"
                    showIcon
                  />

                  <ComparisonResults
                    taskId={comparisonTaskId}
                    result={comparisonResult}
                  />
                </>
              ) : (
                <>
                  <Alert
                    message="正在加载比较结果..."
                    description="比较已完成，正在获取详细结果数据，请稍候。"
                    type="info"
                    showIcon
                  />
                  
                  <Card>
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                      <Space direction="vertical" size="large">
                        <div style={{ fontSize: '16px', color: '#666' }}>
                          正在处理比较结果数据...
                        </div>
                        <Button 
                          type="primary" 
                          onClick={() => {
                            console.log('🔄 手动重新获取比较结果');
                            // 手动重新获取结果的逻辑可以在这里添加
                            setCurrentStep(1);
                          }}
                        >
                          返回进度页面
                        </Button>
                      </Space>
                    </div>
                  </Card>
                </>
              )}

              <Card>
                <Space style={{ width: '100%', justifyContent: 'center' }}>
                  <Button onClick={restart}>
                    进行新的比较
                  </Button>
                </Space>
              </Card>
            </Space>
          )}
          
          {/* 配置管理器 */}
          <ConfigManager
            visible={configManagerVisible}
            onClose={() => setConfigManagerVisible(false)}
            onApplyConfig={handleApplyConfig}
            currentConfig={getCurrentConfigPair()}
          />
        </div>
      </Content>
    </Layout>
  );
};

export default HomePage;