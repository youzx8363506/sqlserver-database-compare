const fs = require('fs');
const path = require('path');

console.log('=== 检查编译版本 ===\n');

// 检查主项目编译版本
const mainConnectionFile = path.join(process.cwd(), 'dist', 'connections', 'connection.js');
const webServerConnectionFile = path.join(process.cwd(), 'web-server', 'dist', 'src', 'connections', 'connection.js');

console.log('文件路径:');
console.log(`主项目: ${mainConnectionFile}`);
console.log(`Web服务器: ${webServerConnectionFile}\n`);

function checkFile(filePath, name) {
  console.log(`=== ${name} ===`);
  console.log(`文件路径: ${filePath}`);
  console.log(`文件存在: ${fs.existsSync(filePath) ? '✅' : '❌'}`);
  
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      
      // 检查是否包含调试信息
      const hasDebugInfo = content.includes('=== 连接日志调试信息 ===');
      console.log(`包含调试信息: ${hasDebugInfo ? '✅' : '❌'}`);
      
      // 检查是否包含 findProjectRoot 方法
      const hasFindProjectRoot = content.includes('findProjectRoot');
      console.log(`包含 findProjectRoot: ${hasFindProjectRoot ? '✅' : '❌'}`);
      
      // 检查是否使用 process.cwd() (旧版本)
      const usesProcessCwd = content.includes('process.cwd(), \'logs\'');
      console.log(`使用旧的 process.cwd(): ${usesProcessCwd ? '❌ (旧版本)' : '✅ (新版本)'}`);
      
      // 获取文件修改时间
      const stats = fs.statSync(filePath);
      console.log(`文件修改时间: ${stats.mtime.toLocaleString()}`);
      
      // 显示构造函数部分的代码片段
      const constructorMatch = content.match(/constructor\(config, logger\) \{[\s\S]{0,500}/);
      if (constructorMatch) {
        console.log('\n构造函数开头片段:');
        console.log('---');
        console.log(constructorMatch[0].substring(0, 300) + '...');
        console.log('---');
      }
      
    } catch (error) {
      console.log(`读取文件失败: ${error.message}`);
    }
  }
  console.log('');
}

checkFile(mainConnectionFile, '主项目编译文件');
checkFile(webServerConnectionFile, 'Web服务器编译文件');

// 检查源文件最后修改时间
const sourceFile = path.join(process.cwd(), 'src', 'connections', 'connection.ts');
console.log(`=== 源文件信息 ===`);
console.log(`源文件: ${sourceFile}`);
console.log(`源文件存在: ${fs.existsSync(sourceFile) ? '✅' : '❌'}`);

if (fs.existsSync(sourceFile)) {
  const stats = fs.statSync(sourceFile);
  console.log(`源文件修改时间: ${stats.mtime.toLocaleString()}`);
}