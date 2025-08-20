const sql = require('mssql');

console.log('开始测试SQL Server连接...');
console.log('目标: localhost:1433, 用户: sa');

// 多种连接配置策略
const strategies = [
  {
    name: '策略1: 完全禁用加密',
    config: {
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
    }
  },
  {
    name: '策略2: TLS 1.0兼容模式',
    config: {
      user: 'sa',
      password: 'wash021',
      server: 'localhost', 
      database: 'master',
      port: 1433,
      options: {
        encrypt: false,
        trustServerCertificate: true,
        enableArithAbort: true,
        cryptoCredentialsDetails: {
          minVersion: 'TLSv1'
        }
      }
    }
  },
  {
    name: '策略3: 最小配置',
    config: {
      user: 'sa',
      password: 'wash021',
      server: 'localhost',
      database: 'master',
      port: 1433,
      options: {
        encrypt: false
      }
    }
  },
  {
    name: '策略4: 使用IP地址',
    config: {
      user: 'sa',
      password: 'wash021',
      server: '127.0.0.1',
      database: 'master',
      port: 1433,
      options: {
        encrypt: false,
        trustServerCertificate: true
      }
    }
  }
];

async function testConnection(strategy) {
  console.log(`\n=== ${strategy.name} ===`);
  console.log('配置:', JSON.stringify(strategy.config, null, 2));
  
  try {
    const pool = new sql.ConnectionPool(strategy.config);
    
    console.log('正在连接...');
    await pool.connect();
    
    console.log('✅ 连接成功！');
    
    // 测试简单查询
    const result = await pool.request().query('SELECT @@VERSION as version, GETDATE() as current_time');
    console.log('查询结果:', result.recordset[0]);
    
    await pool.close();
    console.log('连接已关闭');
    
    return true;
    
  } catch (error) {
    console.log('❌ 连接失败:', error.message);
    console.log('错误类型:', error.constructor.name);
    if (error.code) {
      console.log('错误代码:', error.code);
    }
    return false;
  }
}

async function main() {
  console.log('Node.js版本:', process.version);
  console.log('mssql包版本:', require('mssql/package.json').version);
  
  let successCount = 0;
  
  for (const strategy of strategies) {
    const success = await testConnection(strategy);
    if (success) {
      successCount++;
      console.log(`\n🎉 找到可用的连接策略: ${strategy.name}`);
      break; // 找到第一个成功的就停止
    }
    
    // 等待一秒再尝试下一个策略
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n=== 测试完成 ===`);
  console.log(`成功连接策略数量: ${successCount}/${strategies.length}`);
  
  if (successCount === 0) {
    console.log('\n❌ 所有连接策略都失败了');
    console.log('\n可能的原因:');
    console.log('1. SQL Server服务未启动');
    console.log('2. 端口1433未开放或被防火墙阻止');
    console.log('3. sa账户被禁用或密码错误');
    console.log('4. SQL Server不允许TCP/IP连接');
    console.log('5. SQL Server版本过低，不支持当前Node.js/OpenSSL版本');
  }
}

main().catch(console.error);