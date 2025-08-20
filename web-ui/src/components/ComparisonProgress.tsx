import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import { ProgressEvent, LogEvent, CompleteEvent, ErrorEvent, ReportProgressEvent } from '../types';
import socketService from '../services/socket';
import { compareApi } from '../services/api';

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
  
  // 新增：API轮询状态
  const [pollingEnabled, setPollingEnabled] = useState(false);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  
  // 新增：报告生成进度状态
  const [reportProgress, setReportProgress] = useState<ReportProgressEvent | null>(null);
  const [showReportProgress, setShowReportProgress] = useState(false);

  // 添加日志条目
  const addLog = (log: LogEvent) => {
    const logEntry: LogEntry = {
      ...log,
      id: `${Date.now()}-${Math.random()}`,
    };
    setLogs(prev => [logEntry, ...prev.slice(0, 99)]); // 保持最新100条日志
  };

  // 新增：API 轮询函数
  const pollTaskStatus = useCallback(async () => {
    if (!taskId || isSocketConnected) return;
    
    try {
      console.log(`🔄 [ComparisonProgress] API轮询获取任务状态: ${taskId}`);
      const response = await compareApi.getTaskStatus(taskId);
      
      if (response.success && response.data?.task) {
        const taskStatus = response.data.task;
        console.log(`📊 [ComparisonProgress] 轮询获取状态: ${taskStatus.status} (${taskStatus.progress}%)`);
        
        // 更新进度状态
        setProgress(taskStatus.progress);
        setCurrentStep(taskStatus.currentStep);
        
        // 添加日志条目
        addLog({
          level: 'info',
          message: `[轮询更新] ${taskStatus.currentStep}`,
          timestamp: new Date().toISOString(),
        });
        
        // 检查任务完成状态
        if (taskStatus.status === 'completed') {
          console.log(`🎉 [ComparisonProgress] 通过轮询检测到任务完成: ${taskId}`);
          setStatus('completed');
          
          // 获取比较结果
          try {
            const resultResponse = await compareApi.getTaskResult(taskId);
            if (resultResponse.success && resultResponse.data?.result) {
              console.log(`📊 [ComparisonProgress] 通过API获取到比较结果`);
              
              // 统一数据格式：API轮询返回ComparisonResult，直接传递给HomePage
              console.log('🔄 [API轮询] 向父组件传递ComparisonResult格式数据');
              onComplete?.(resultResponse.data.result);
              
              // 停止轮询
              setPollingEnabled(false);
            }
          } catch (resultError) {
            console.error('获取比较结果失败:', resultError);
          }
        } else if (taskStatus.status === 'failed') {
          console.log(`❌ [ComparisonProgress] 通过轮询检测到任务错误: ${taskId}`);
          setStatus('failed');
          setError(taskStatus.error || '任务执行失败');
          onError?.(taskStatus.error || '任务执行失败');
          
          // 停止轮询
          setPollingEnabled(false);
        }
      }
    } catch (error: any) {
      console.error('❌ [ComparisonProgress] API轮询失败:', error);
    }
  }, [taskId, isSocketConnected, onComplete, onError]);

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
        
        // 更新完成消息，包含报告信息
        const hasReports = result.reports && result.reports.length > 0;
        const completionMessage = hasReports 
          ? `比较和报告生成完成！共生成 ${result.reports?.length || 0} 个报告文件`
          : '数据库比较完成';
          
        setCurrentStep(completionMessage);
        setStatus('completed');
        
        addLog({
          level: 'info',
          message: completionMessage,
          timestamp: new Date().toISOString(),
        });
        
        // 如果有报告信息，添加报告详情日志
        if (hasReports) {
          result.reports?.forEach((report) => {
            addLog({
              level: 'info',
              message: `✅ 报告已生成: ${report.format.toUpperCase()} 格式 - ${report.fileName}`,
              timestamp: new Date().toISOString(),
            });
          });
          
          // 隐藏报告进度详情
          setShowReportProgress(false);
        }
        
        // 统一数据格式：WebSocket返回CompleteEvent，传递给HomePage
        console.log('📡 [WebSocket] 向父组件传递CompleteEvent格式数据（含报告）');
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

      // 新增：监听报告生成进度
      socketService.onReportProgress((reportData: ReportProgressEvent) => {
        console.log('📊 [前端ComparisonProgress] 收到报告生成进度:', reportData);
        setReportProgress(reportData);
        setShowReportProgress(true);
        
        // 添加报告生成专用日志
        addLog({
          level: reportData.step === 'error' ? 'error' : 'info',
          message: `[报告生成] ${reportData.message}`,
          timestamp: new Date().toISOString(),
        });
        
        // 如果报告生成完成，延迟隐藏报告进度详情
        if (reportData.step === 'completed') {
          setTimeout(() => {
            setShowReportProgress(false);
          }, 3000);
        }
      });

    } catch (error: any) {
      console.error('❌ [前端ComparisonProgress] WebSocket连接失败:', error);
      setConnectionStatus('error');
      setConnectionError(error.message || '连接失败');
      setIsSocketConnected(false);
      
      // 启用API轮询作为后备方案
      console.log('🔄 [ComparisonProgress] WebSocket失败，启用API轮询后备方案');
      setPollingEnabled(true);
      
      addLog({
        level: 'warn',
        message: `WebSocket连接失败，已启用API轮询模式: ${error.message}`,
        timestamp: new Date().toISOString(),
      });
    }
  };

  // 重新连接WebSocket
  const reconnectWebSocket = () => {
    socketService.disconnect();
    setIsSocketConnected(false);
    setPollingEnabled(false); // 停止轮询
    setupWebSocket();
  };

  // 新增：轮询管理 Effect
  useEffect(() => {
    if (pollingEnabled && !isSocketConnected) {
      console.log(`🔄 [ComparisonProgress] 启动API轮询，间隔: 2秒`);
      pollingIntervalRef.current = setInterval(pollTaskStatus, 2000);
      
      // 立即执行一次轮询
      pollTaskStatus();
      
      return () => {
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
          console.log(`🛑 [ComparisonProgress] 停止API轮询`);
        }
      };
    }
  }, [pollingEnabled, isSocketConnected, pollTaskStatus]);

  // 组件挂载时设置WebSocket
  useEffect(() => {
    setupWebSocket();

    return () => {
      // 组件卸载时清理
      socketService.leaveTask(taskId);
      socketService.removeAllListeners();
      
      // 清理轮询定时器
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
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
            description: `已连接到服务器并加入任务房间 ${taskId}，实时接收进度更新`,
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
            status: pollingEnabled ? 'warning' : 'error' as const,
            title: pollingEnabled ? 'WebSocket失败，使用API轮询' : 'WebSocket连接失败',
            description: pollingEnabled 
              ? `WebSocket连接失败，已启用API轮询模式获取进度更新。${connectionError}` 
              : connectionError || '无法连接到服务器',
            icon: pollingEnabled 
              ? <ExclamationCircleOutlined style={{ color: '#faad14' }} />
              : <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
          };
        case 'disconnected':
          return {
            status: 'warning' as const,
            title: 'WebSocket连接断开',
            description: pollingEnabled
              ? '与服务器的连接已断开，正在使用API轮询获取进度更新'
              : '与服务器的连接已断开，可能无法接收实时更新',
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
            {pollingEnabled && (
              <Tag color="processing">
                API轮询模式
              </Tag>
            )}
          </Space>
        }
        description={config.description}
        type={config.status as "success" | "info" | "warning" | "error"}
        showIcon={false}
        action={
          (connectionStatus === 'error' || connectionStatus === 'disconnected') && (
            <Space>
              <Button size="small" onClick={reconnectWebSocket}>
                重新连接
              </Button>
              {!pollingEnabled && (
                <Button size="small" type="primary" onClick={() => setPollingEnabled(true)}>
                  启用轮询
                </Button>
              )}
            </Space>
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

        {/* 报告生成进度详情 */}
        {showReportProgress && reportProgress && (
          <Card size="small" title="报告生成详情" style={{ backgroundColor: '#f8f9fa' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>格式: </Text>
                <Tag color="blue">{reportProgress.format.toUpperCase()}</Tag>
                {reportProgress.currentFile && (
                  <>
                    <Text strong> 文件: </Text>
                    <Text code>{reportProgress.currentFile}</Text>
                  </>
                )}
              </div>
              
              {reportProgress.totalFiles && reportProgress.completedFiles !== undefined && (
                <div>
                  <Text strong>进度: </Text>
                  <Text>{reportProgress.completedFiles + 1} / {reportProgress.totalFiles}</Text>
                  <Progress
                    percent={Math.round(((reportProgress.completedFiles + 1) / reportProgress.totalFiles) * 100)}
                    size="small"
                    status={reportProgress.step === 'error' ? 'exception' : 'active'}
                    style={{ marginTop: 4 }}
                  />
                </div>
              )}
              
              <div>
                <Text type={reportProgress.step === 'error' ? 'danger' : 'secondary'}>
                  {reportProgress.message}
                </Text>
              </div>
            </Space>
          </Card>
        )}

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