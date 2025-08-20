import React, { useState, useEffect } from 'react';
import {
  Card,
  Progress,
  Typography,
  Space,
  List,
  Tag,
  Button,
  Alert,
} from 'antd';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  LoadingOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { ProgressEvent, LogEvent, CompleteEvent, ErrorEvent } from '../types';
import socketService from '../services/socket';

const { Title, Text } = Typography;

interface ComparisonProgressProps {
  taskId: string;
  onComplete?: (result: any) => void;
  onError?: (error: string) => void;
}

interface LogEntry extends LogEvent {
  id: string;
}

const ComparisonProgress: React.FC<ComparisonProgressProps> = ({
  taskId,
  onComplete,
  onError,
}) => {
  const [progress, setProgress] = useState<number>(0);
  const [currentStep, setCurrentStep] = useState<string>('准备开始比较...');
  const [status, setStatus] = useState<'running' | 'completed' | 'failed'>('running');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('connecting');
  const [connectionError, setConnectionError] = useState<string | null>(null);

  // 添加日志条目
  const addLog = (log: LogEvent) => {
    const logEntry: LogEntry = {
      ...log,
      id: `${Date.now()}-${Math.random()}`,
    };
    setLogs(prev => [logEntry, ...prev.slice(0, 99)]); // 保持最新100条日志
  };

  // 连接WebSocket并设置监听器
  const setupWebSocket = async () => {
    try {
      setConnectionStatus('connecting');
      setConnectionError(null);
      console.log('🔗 [前端ComparisonProgress] 开始建立WebSocket连接...');
      
      // 如果已经连接，先断开
      if (socketService.isSocketConnected()) {
        console.log('🔄 [前端ComparisonProgress] 检测到已有连接，先断开...');
        socketService.disconnect();
      }

      // 建立新连接
      await socketService.connect();
      console.log('✅ [前端ComparisonProgress] WebSocket连接建立成功');
      
      setConnectionStatus('connected');
      setIsSocketConnected(true);

      // 加入任务房间
      console.log(`🏠 [前端ComparisonProgress] 加入任务房间: ${taskId}`);
      socketService.joinTask(taskId);

      // 设置监听器
      socketService.onProgress((progressData: ProgressEvent) => {
        console.log('📊 [前端ComparisonProgress] 收到进度更新:', progressData);
        setProgress(progressData.percentage);
        setCurrentStep(progressData.message);
        addLog({
          level: 'info',
          message: `${progressData.step}: ${progressData.message}`,
          timestamp: new Date().toISOString(),
        });
      });

      socketService.onComplete((result: CompleteEvent) => {
        console.log('🎉 [前端ComparisonProgress] 收到完成通知:', result);
        setProgress(100);
        setCurrentStep('比较完成');
        setStatus('completed');
        addLog({
          level: 'info',
          message: '数据库比较已完成！',
          timestamp: new Date().toISOString(),
        });
        onComplete?.(result);
      });

      socketService.onError((errorData: ErrorEvent) => {
        console.log('❌ [前端ComparisonProgress] 收到错误通知:', errorData);
        setStatus('failed');
        setError(errorData.error);
        addLog({
          level: 'error',
          message: `错误: ${errorData.error}`,
          timestamp: new Date().toISOString(),
        });
        onError?.(errorData.error);
      });

      socketService.onLog((logData: LogEvent) => {
        console.log('📝 [前端ComparisonProgress] 收到日志消息:', logData);
        addLog(logData);
      });

    } catch (error: any) {
      console.error('❌ [前端ComparisonProgress] WebSocket连接失败:', error);
      setConnectionStatus('error');
      setConnectionError(error.message || '连接失败');
      setIsSocketConnected(false);
      
      // 添加用户友好的错误提示
      addLog({
        level: 'error',
        message: `WebSocket连接失败: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // 重新连接WebSocket
  const reconnectWebSocket = () => {
    socketService.disconnect();
    setIsSocketConnected(false);
    setupWebSocket();
  };

  // 组件挂载时设置WebSocket
  useEffect(() => {
    setupWebSocket();

    return () => {
      // 组件卸载时清理
      socketService.leaveTask(taskId);
      socketService.removeAllListeners();
    };
  }, [taskId]);

  // 获取状态图标
  const getStatusIcon = () => {
    switch (status) {
      case 'running':
        return <InfoCircleOutlined spin style={{ color: '#1890ff' }} />;
      case 'completed':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />;
      case 'failed':
        return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />;
      default:
        return <InfoCircleOutlined />;
    }
  };

  // 获取状态标签
  const getStatusTag = () => {
    switch (status) {
      case 'running':
        return <Tag icon={<InfoCircleOutlined spin />} color="processing">运行中</Tag>;
      case 'completed':
        return <Tag icon={<CheckCircleOutlined />} color="success">已完成</Tag>;
      case 'failed':
        return <Tag icon={<CloseCircleOutlined />} color="error">失败</Tag>;
      default:
        return <Tag>未知</Tag>;
    }
  };

  // WebSocket连接状态卡片
  const WebSocketStatusCard = () => {
    const getStatusConfig = () => {
      switch (connectionStatus) {
        case 'connected':
          return {
            status: 'success' as const,
            title: 'WebSocket连接正常',
            description: `已连接到服务器并加入任务房间 ${taskId}`,
            icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
          };
        case 'connecting':
          return {
            status: 'info' as const,
            title: 'WebSocket连接中',
            description: '正在建立到服务器的连接...',
            icon: <LoadingOutlined style={{ color: '#1890ff' }} />,
          };
        case 'error':
          return {
            status: 'error' as const,
            title: 'WebSocket连接失败',
            description: connectionError || '无法连接到服务器',
            icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
          };
        case 'disconnected':
          return {
            status: 'warning' as const,
            title: 'WebSocket连接断开',
            description: '与服务器的连接已断开，可能无法接收实时更新',
            icon: <ExclamationCircleOutlined style={{ color: '#faad14' }} />,
          };
      }
    };

    const config = getStatusConfig();
    
    return (
      <Alert
        message={
          <Space>
            {config.icon}
            {config.title}
          </Space>
        }
        description={config.description}
        type={config.status}
        showIcon={false}
        action={
          (connectionStatus === 'error' || connectionStatus === 'disconnected') && (
            <Button size="small" onClick={reconnectWebSocket}>
              重新连接
            </Button>
          )
        }
        style={{ marginBottom: 16 }}
      />
    );
  };

  return (
    <Card
      title={
        <Space>
          {getStatusIcon()}
          <Title level={4} style={{ margin: 0 }}>
            比较进度
          </Title>
          {getStatusTag()}
        </Space>
      }
      extra={
        !isSocketConnected && (
          <Button
            icon={<ReloadOutlined />}
            onClick={reconnectWebSocket}
            size="small"
          >
            重新连接
          </Button>
        )
      }
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* WebSocket连接状态 */}
        <WebSocketStatusCard />
        
        {/* 进度条 */}
        <div>
          <div style={{ marginBottom: 8 }}>
            <Text strong>{currentStep}</Text>
          </div>
          <Progress
            percent={progress}
            status={status === 'failed' ? 'exception' : status === 'completed' ? 'success' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        </div>

        {/* WebSocket连接状态 */}
        {!isSocketConnected && (
          <Alert
            message="WebSocket连接断开"
            description="实时进度更新已停止，请点击重新连接按钮恢复连接"
            type="warning"
            showIcon
            action={
              <Button size="small" onClick={reconnectWebSocket}>
                重新连接
              </Button>
            }
          />
        )}

        {/* 错误信息 */}
        {error && (
          <Alert
            message="比较过程发生错误"
            description={error}
            type="error"
            showIcon
          />
        )}

        {/* 日志列表 */}
        <div>
          <Title level={5}>执行日志</Title>
          <div style={{ maxHeight: 300, overflowY: 'auto' }}>
            <List
              size="small"
              dataSource={logs}
              renderItem={(log) => (
                <List.Item key={log.id}>
                  <Space style={{ width: '100%' }}>
                    {log.level === 'error' && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                    {log.level === 'warn' && <InfoCircleOutlined style={{ color: '#faad14' }} />}
                    {log.level === 'info' && <InfoCircleOutlined style={{ color: '#1890ff' }} />}
                    <Text style={{ flex: 1 }}>{log.message}</Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </Text>
                  </Space>
                </List.Item>
              )}
              locale={{ emptyText: '暂无日志' }}
            />
          </div>
        </div>
      </Space>
    </Card>
  );
};

export default ComparisonProgress;