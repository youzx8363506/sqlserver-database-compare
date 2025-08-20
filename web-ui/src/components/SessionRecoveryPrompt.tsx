import React, { useState, useEffect } from 'react';
import { Button, Space, Typography, Card, Badge } from 'antd';
import { 
  HistoryOutlined
} from '@ant-design/icons';
import { useSessionRecovery } from '../hooks/useSessionRecovery';
import { TaskSession } from '../services/TaskCacheManager';

const { Text } = Typography;

interface SessionRecoveryPromptProps {
  onRecover: (taskId: string, session: TaskSession) => void;
  onDismiss?: () => void;
}

const SessionRecoveryPrompt: React.FC<SessionRecoveryPromptProps> = ({ 
  onRecover, 
  onDismiss 
}) => {
  const [showPrompt, setShowPrompt] = useState(false);
  const [recoverableSession, setRecoverableSession] = useState<TaskSession | null>(null);
  const { 
    checkRecoverableSession, 
    recoverSession, 
    isRecovering,
    getSessionDescription
  } = useSessionRecovery();

  // 检查是否有可恢复的会话
  useEffect(() => {
    const checkSession = () => {
      try {
        const { hasSession, session } = checkRecoverableSession();
        if (hasSession && session) {
          console.log('📋 发现可恢复的会话:', session.taskId);
          setRecoverableSession(session);
          setShowPrompt(true);
        }
      } catch (error) {
        console.warn('检查可恢复会话失败:', error);
      }
    };

    // 延迟检查，确保页面加载完成
    const timer = setTimeout(checkSession, 500);
    return () => clearTimeout(timer);
  }, [checkRecoverableSession]);

  // 处理恢复操作
  const handleRecover = async () => {
    if (!recoverableSession) return;

    const result = await recoverSession(recoverableSession.taskId, {
      fetchFromServer: true,
      showMessages: false // 由组件自己处理消息
    });

    if (result.success && result.session) {
      onRecover(result.taskId!, result.session);
      setShowPrompt(false);
    }
  };

  // 处理忽略操作
  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss?.();
  };



  // 获取状态颜色
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#52c41a';
      case 'running':
        return '#1890ff';
      case 'error':
        return '#ff4d4f';
      default:
        return '#faad14';
    }
  };

  if (!showPrompt || !recoverableSession) {
    return null;
  }

  const sessionDesc = getSessionDescription(recoverableSession);

  return (
    <Card 
      size="small"
      style={{ 
        marginBottom: 16, 
        border: `1px solid ${getStatusColor(recoverableSession.status)}`,
        borderRadius: 6
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* 左侧状态指示 */}
        <HistoryOutlined style={{ 
          color: getStatusColor(recoverableSession.status), 
          fontSize: 16 
        }} />

        {/* 主要信息 - 紧凑显示 */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Text strong style={{ color: getStatusColor(recoverableSession.status) }}>
              发现未完成的数据库比较会话
            </Text>
            <Badge 
              status={sessionDesc.statusType === 'success' ? 'success' : 
                      sessionDesc.statusType === 'error' ? 'error' : 'processing'} 
              text={sessionDesc.statusText} 
            />
          </div>
          
          <Space split={<span style={{ color: '#d9d9d9' }}>|</span>} size="small">
            <Text type="secondary" style={{ fontSize: 12 }}>
              任务ID: {recoverableSession.taskId.substring(0, 8)}...
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              数据库: {sessionDesc.databaseText}
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              时间: {sessionDesc.timeText}
            </Text>
          </Space>
        </div>

        {/* 右侧操作按钮 - 水平布局 */}
        <Space size="small">
          <Button 
            type="primary" 
            size="small" 
            loading={isRecovering}
            onClick={handleRecover}
          >
            恢复会话
          </Button>
          
          <Button 
            size="small" 
            onClick={handleDismiss}
          >
            忽略
          </Button>
        </Space>
      </div>
    </Card>
  );
};

export default SessionRecoveryPrompt;