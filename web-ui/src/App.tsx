import React, { useState } from 'react';
import { ConfigProvider, Button, Space } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import HomePage from './pages/HomePage';
import Test from './Test';
import 'antd/dist/reset.css';
import './index.css';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<'home' | 'test'>('home');

  return (
    <ConfigProvider 
      locale={zhCN}
      theme={{
        token: {
          colorPrimary: '#1890ff',
          borderRadius: 6,
        },
      }}
    >
      <div>
        <div style={{ padding: '10px', borderBottom: '1px solid #d9d9d9', background: '#fafafa' }}>
          <Space>
            <Button 
              type={currentPage === 'home' ? 'primary' : 'default'}
              onClick={() => setCurrentPage('home')}
            >
              主页
            </Button>
            <Button 
              type={currentPage === 'test' ? 'primary' : 'default'}
              onClick={() => setCurrentPage('test')}
            >
              连接测试
            </Button>
          </Space>
        </div>
        
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'test' && <Test />}
      </div>
    </ConfigProvider>
  );
};

export default App;