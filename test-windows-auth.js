const sql = require('mssql');

console.log('=== Windows身份验证测试 ===');

async function testWindowsAuth() {
  const config = {
    server: 'localhost',
    database: 'master',
    port: 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      useUTC: false,
      trustedConnection: true  // Windows身份验证
    },
    authentication: {
      type: 'ntlm',
      options: {
        domain: '',
        userName: '',
        password: ''
      }
    }
  };

  console.log('使用Windows身份验证连接...');
  console.log('配置:', JSON.stringify(config, null, 2));

  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log('✅ Windows身份验证连接成功！');
    
    const result = await pool.request().query('SELECT SYSTEM_USER as current_user, @@VERSION as version');
    console.log('当前用户:', result.recordset[0].current_user);
    
    await pool.close();
    return true;
    
  } catch (error) {
    console.log('❌ Windows身份验证连接失败:', error.message);
    return false;
  }
}

async function testSqlAuth() {
  console.log('\n=== SQL Server身份验证测试 ===');
  
  const config = {
    user: 'sa',
    password: 'wash021',
    server: 'localhost',
    database: 'master',
    port: 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true
    }
  };

  try {
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log('✅ SQL身份验证连接成功！');
    
    const result = await pool.request().query('SELECT SYSTEM_USER as current_user');
    console.log('当前用户:', result.recordset[0].current_user);
    
    await pool.close();
    return true;
    
  } catch (error) {
    console.log('❌ SQL身份验证连接失败:', error.message);
    return false;
  }
}

async function main() {
  const windowsSuccess = await testWindowsAuth();
  const sqlSuccess = await testSqlAuth();
  
  console.log('\n=== 测试总结 ===');
  console.log('Windows身份验证:', windowsSuccess ? '✅ 成功' : '❌ 失败');
  console.log('SQL Server身份验证:', sqlSuccess ? '✅ 成功' : '❌ 失败');
  
  if (!windowsSuccess && !sqlSuccess) {
    console.log('\n💡 两种身份验证都失败，可能的问题:');
    console.log('1. SQL Server实例不是默认实例');
    console.log('2. SQL Server使用动态端口');
    console.log('3. 防火墙阻止了连接');
    console.log('4. SQL Server版本过旧，不兼容当前Node.js');
    
    console.log('\n🔧 建议的排查方法:');
    console.log('1. 运行: sqlcmd -S localhost -U sa -P wash021');
    console.log('2. 检查SQL Server Configuration Manager中的TCP/IP设置');
    console.log('3. 查看SQL Server错误日志');
  }
}

main().catch(console.error);