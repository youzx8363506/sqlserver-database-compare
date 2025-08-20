const sql = require('mssql');

console.log('=== 详细诊断信息 ===');
console.log('Node.js版本:', process.version);
console.log('平台:', process.platform);
console.log('架构:', process.arch);
console.log('mssql包版本:', require('mssql/package.json').version);

// 检查tedious驱动版本
try {
  const tediousVersion = require('tedious/package.json').version;
  console.log('tedious驱动版本:', tediousVersion);
} catch (e) {
  console.log('tedious驱动:', '未找到');
}

console.log('\n=== 开始连接测试 ===');

async function testWithDebug() {
  const config = {
    user: 'sa',
    password: 'wash021',
    server: 'localhost',
    database: 'master',
    port: 1433,
    connectionTimeout: 10000,
    requestTimeout: 10000,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      useUTC: false
    },
    debug: {
      data: true,
      packet: false,
      payload: false,
      token: false
    }
  };

  console.log('连接配置:', JSON.stringify(config, null, 2));
  
  const pool = new sql.ConnectionPool(config);
  
  // 监听所有事件
  pool.on('connect', () => {
    console.log('✅ 连接池 connect 事件触发');
  });
  
  pool.on('close', () => {
    console.log('⚠️ 连接池 close 事件触发');
  });
  
  pool.on('error', (err) => {
    console.log('❌ 连接池 error 事件:', err.message);
    console.log('错误详情:', {
      name: err.name,
      code: err.code,
      state: err.state,
      class: err.class,
      number: err.number,
      severity: err.severity,
      lineNumber: err.lineNumber,
      fileName: err.fileName,
      procName: err.procName
    });
  });

  try {
    console.log('正在建立连接...');
    await pool.connect();
    
    console.log('✅ 连接成功！连接池状态:', {
      connected: pool.connected,
      connecting: pool.connecting,
      healthy: pool.healthy,
      size: pool.size
    });
    
    // 测试查询
    console.log('执行测试查询...');
    const request = pool.request();
    const result = await request.query('SELECT @@VERSION as version, @@SERVERNAME as server_name, DB_NAME() as database_name');
    
    console.log('✅ 查询成功！结果:');
    console.log('- 版本:', result.recordset[0].version.substring(0, 100) + '...');
    console.log('- 服务器:', result.recordset[0].server_name);
    console.log('- 数据库:', result.recordset[0].database_name);
    
    await pool.close();
    console.log('✅ 连接已关闭');
    
    return true;
    
  } catch (error) {
    console.log('❌ 连接失败！');
    console.log('错误信息:', error.message);
    console.log('错误类型:', error.constructor.name);
    console.log('错误代码:', error.code || 'N/A');
    
    // 详细错误信息
    if (error.originalError) {
      console.log('原始错误:', error.originalError.message);
      console.log('原始错误代码:', error.originalError.code);
    }
    
    // 如果是SSL错误，提供更多信息
    if (error.message.includes('SSL') || error.message.includes('TLS')) {
      console.log('\n🔍 SSL/TLS 错误详情:');
      console.log('这通常是OpenSSL和SQL Server TLS版本不兼容导致的');
      console.log('建议尝试以下解决方案:');
      console.log('1. 启动Node.js时使用: node --tls-min-v1.0 script.js');
      console.log('2. 或者设置环境变量: set NODE_OPTIONS=--tls-min-v1.0');
    }
    
    // 如果是socket错误，提供网络诊断信息
    if (error.code === 'ESOCKET' || error.message.includes('Could not connect')) {
      console.log('\n🔍 网络连接错误详情:');
      console.log('虽然telnet能连接，但Node.js连接失败可能的原因:');
      console.log('1. SQL Server不允许sa用户远程登录');
      console.log('2. SQL Server的身份验证模式设置为仅Windows身份验证');
      console.log('3. sa账户被禁用');
      console.log('4. SQL Server Browser服务未启动');
      console.log('5. 命名实例配置问题');
    }
    
    return false;
  }
}

// 运行测试
testWithDebug().then(success => {
  console.log('\n=== 测试结果 ===');
  console.log(success ? '✅ 连接成功' : '❌ 连接失败');
  
  if (!success) {
    console.log('\n建议的调试步骤:');
    console.log('1. 检查SQL Server身份验证模式 (混合模式)');
    console.log('2. 确认sa账户已启用');
    console.log('3. 验证sa密码是否正确');
    console.log('4. 检查SQL Server错误日志');
    console.log('5. 尝试使用SSMS连接测试相同凭据');
  }
}).catch(console.error);