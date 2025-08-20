const http = require('http');

console.log('=== 测试数据库连接 API ===\n');

// 测试连接 API
function testConnection() {
  console.log('📡 发送数据库连接测试请求...');
  
  const testData = JSON.stringify({
    server: 'localhost',
    database: 'test',
    port: 1433,
    authentication: {
      type: 'sql',
      username: 'test',
      password: 'test'
    }
  });

  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/database/test-connection',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(testData)
    }
  };

  const req = http.request(options, (res) => {
    console.log(`📊 响应状态: ${res.statusCode}`);
    console.log(`📋 响应头:`, res.headers);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📝 响应内容:');
      try {
        const response = JSON.parse(data);
        console.log(JSON.stringify(response, null, 2));
      } catch (error) {
        console.log(data);
      }
      
      console.log('\n💡 现在检查是否生成了日志文件...');
      console.log('📁 请查看项目根目录下的 logs 文件夹');
    });
  });

  req.on('error', (error) => {
    console.error(`❌ 请求失败: ${error.message}`);
    console.log('💡 请确保 web-server 已经启动 (npm run dev)');
  });

  req.write(testData);
  req.end();
}

// 检查服务是否启动
function checkServer() {
  console.log('🔍 检查 web-server 是否启动...');
  
  const options = {
    hostname: 'localhost',
    port: 3001,
    path: '/api/health',
    method: 'GET'
  };

  const req = http.request(options, (res) => {
    console.log(`✅ 服务已启动，状态码: ${res.statusCode}`);
    
    let data = '';
    res.on('data', (chunk) => {
      data += chunk;
    });
    
    res.on('end', () => {
      console.log('📊 健康检查响应:', data);
      console.log('');
      
      // 服务启动了，开始测试数据库连接
      testConnection();
    });
  });

  req.on('error', (error) => {
    console.error(`❌ 服务未启动: ${error.message}`);
    console.log('💡 请先启动 web-server:');
    console.log('   cd web-server');
    console.log('   npm run dev');
  });

  req.end();
}

console.log('🎯 这个脚本会触发数据库连接，从而创建日志文件');
console.log('📝 即使连接失败，也会创建日志文件记录尝试过程\n');

checkServer();