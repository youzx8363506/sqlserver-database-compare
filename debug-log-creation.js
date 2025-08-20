const path = require('path');
const fs = require('fs');

console.log('=== 日志创建调试工具 ===\n');

// 模拟 findProjectRoot 方法（修复后的版本）
function findProjectRoot(startDir) {
  console.log(`🔍 开始查找项目根目录，起始位置: ${startDir}\n`);
  
  // 第一步：查找包含 sqlserver-database-compare 名称的 package.json
  let currentDir = startDir;
  let step = 1;
  
  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    console.log(`步骤 ${step}: 检查 ${currentDir}`);
    console.log(`  package.json 路径: ${packageJsonPath}`);
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        console.log(`  ✅ 找到 package.json: ${packageJson.name}`);
        
        if (packageJson.name === 'sqlserver-database-compare') {
          console.log(`  🎯 找到主项目！返回: ${currentDir}\n`);
          return currentDir;
        }
      } catch (error) {
        console.log(`  ❌ 无效的 package.json: ${error.message}`);
      }
    } else {
      console.log(`  📁 package.json 不存在`);
    }
    
    currentDir = path.dirname(currentDir);
    step++;
  }
  
  console.log(`第一轮查找结束，未找到主项目 package.json\n`);
  
  // 第二步：查找文件结构
  currentDir = startDir;
  step = 1;
  console.log(`🔍 开始查找典型文件结构...\n`);
  
  while (currentDir !== path.dirname(currentDir)) {
    const srcDir = path.join(currentDir, 'src');
    const connectionsDir = path.join(srcDir, 'connections');
    const packageJsonPath = path.join(currentDir, 'package.json');
    
    console.log(`结构检查 ${step}: ${currentDir}`);
    console.log(`  src 目录: ${fs.existsSync(srcDir) ? '✅' : '❌'} ${srcDir}`);
    console.log(`  connections 目录: ${fs.existsSync(connectionsDir) ? '✅' : '❌'} ${connectionsDir}`);
    console.log(`  package.json: ${fs.existsSync(packageJsonPath) ? '✅' : '❌'} ${packageJsonPath}`);
    
    if (fs.existsSync(srcDir) && fs.existsSync(connectionsDir) && fs.existsSync(packageJsonPath)) {
      console.log(`  🎯 找到匹配的文件结构！返回: ${currentDir}\n`);
      return currentDir;
    }
    
    currentDir = path.dirname(currentDir);
    step++;
  }
  
  console.log(`文件结构查找结束，未找到匹配结构\n`);
  
  // 第三步：回退选项
  const workingDir = process.cwd();
  console.log(`🔍 回退到工作目录: ${workingDir}\n`);
  return workingDir;
}

function testLogCreation() {
  console.log(`📊 当前环境信息:`);
  console.log(`  当前工作目录: ${process.cwd()}`);
  console.log(`  脚本位置: ${__dirname}`);
  console.log(`  Node.js 版本: ${process.version}`);
  console.log(`  平台: ${process.platform}\n`);
  
  // 模拟从编译后的 web-server 目录启动
  const simulatedDirname = path.join(__dirname, 'web-server', 'dist', 'src', 'connections');
  
  console.log(`🎭 模拟从 web-server 编译目录启动:`);
  console.log(`  模拟 __dirname: ${simulatedDirname}\n`);
  
  const projectRoot = findProjectRoot(simulatedDirname);
  const logDir = path.join(projectRoot, 'logs');
  
  console.log(`📝 最终结果:`);
  console.log(`  项目根目录: ${projectRoot}`);
  console.log(`  日志目录: ${logDir}`);
  console.log(`  日志目录是否存在: ${fs.existsSync(logDir) ? '✅' : '❌'}`);
  
  // 尝试创建日志目录
  try {
    if (!fs.existsSync(logDir)) {
      console.log(`\n🔨 尝试创建日志目录...`);
      fs.mkdirSync(logDir, { recursive: true });
      console.log(`  ✅ 日志目录创建成功`);
    } else {
      console.log(`  📁 日志目录已存在`);
    }
    
    // 尝试写入测试日志文件
    const testLogFile = path.join(logDir, 'test-log.txt');
    console.log(`\n📝 尝试写入测试日志文件: ${testLogFile}`);
    
    fs.writeFileSync(testLogFile, `测试日志 - ${new Date().toISOString()}\n`, 'utf8');
    console.log(`  ✅ 测试日志写入成功`);
    
    // 清理测试文件
    fs.unlinkSync(testLogFile);
    console.log(`  🧹 测试文件已清理`);
    
  } catch (error) {
    console.log(`  ❌ 错误: ${error.message}`);
    console.log(`  错误类型: ${error.constructor.name}`);
    console.log(`  错误代码: ${error.code || 'N/A'}`);
  }
}

testLogCreation();