import React, { useState } from 'react';
import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import HomePage from './pages/HomePage';
import Test from './Test';
import 'antd/dist/reset.css';
import './index.css';

const App: React.FC = () => {
  const [currentPage] = useState<'home' | 'test'>('home');

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
      <>
        {currentPage === 'home' && <HomePage />}
        {currentPage === 'test' && <Test />}
      </>
    </ConfigProvider>
  );
};

export default App;