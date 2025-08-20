const sql = require('mssql');

console.log('快速连接测试 - Node.js', process.version);

async function testConnection() {
  const config = {
    user: 'sa',
    password: 'wash021',
    server: 'localhost',
    database: 'master',
    port: 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
      useUTC: false
    },
    connectionTimeout: 10000,
    requestTimeout: 10000
  };

  try {
    console.log('尝试连接...');
    const pool = new sql.ConnectionPool(config);
    await pool.connect();
    
    console.log('✅ 连接成功!');
    const result = await pool.request().query('SELECT @@VERSION as version');
    console.log('数据库版本:', result.recordset[0].version.substring(0, 50) + '...');
    
    await pool.close();
    return true;
    
  } catch (error) {
    console.log('❌ 连接失败:', error.message);
    return false;
  }
}

testConnection().then(success => {
  console.log('\n测试结果:', success ? '成功' : '失败');
});