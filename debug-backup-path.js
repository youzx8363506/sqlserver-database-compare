const path = require('path');
const fs = require('fs');

console.log('=== 备份路径调试工具 ===\n');

function findProjectRoot(startDir) {
  console.log(`🔍 查找项目根目录，起始位置: ${startDir}\n`);
  
  // 第一步：查找包含 sqlserver-database-compare 名称的 package.json
  let currentDir = startDir;
  let step = 1;
  
  console.log('--- 第一轮：查找主项目 package.json ---');
  while (currentDir !== path.dirname(currentDir)) {
    const packageJsonPath = path.join(currentDir, 'package.json');
    console.log(`步骤 ${step}: 检查 ${currentDir}`);
    console.log(`  package.json 路径: ${packageJsonPath}`);
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        console.log(`  ✅ 找到 package.json: "${packageJson.name}"`);
        
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
    
    if (step > 10) {
      console.log('  ⚠️ 查找步数过多，停止');
      break;
    }
  }
  
  console.log(`第一轮查找结束，未找到主项目 package.json\n`);
  
  // 第二步：查找文件结构
  currentDir = startDir;
  step = 1;
  console.log(`--- 第二轮：查找典型文件结构 ---`);
  
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
    
    if (step > 10) {
      console.log('  ⚠️ 查找步数过多，停止');
      break;
    }
  }
  
  console.log(`文件结构查找结束，未找到匹配结构\n`);
  
  // 第三步：回退选项
  const workingDir = process.cwd();
  console.log(`--- 第三轮：回退选项 ---`);
  console.log(`回退到工作目录: ${workingDir}\n`);
  return workingDir;
}

// 模拟从备份目录下的 web-server 启动
const backupWebServerDir = path.join(process.cwd(), 'web-server', 'dist', 'src', 'connections');

console.log(`📊 当前环境信息:`);
console.log(`  当前工作目录: ${process.cwd()}`);
console.log(`  脚本位置: ${__dirname}`);
console.log(`  模拟 web-server __dirname: ${backupWebServerDir}\n`);

const projectRoot = findProjectRoot(backupWebServerDir);
const logDir = path.join(projectRoot, 'logs');

console.log(`📝 最终结果:`);
console.log(`  项目根目录: ${projectRoot}`);
console.log(`  日志目录: ${logDir}`);
console.log(`  日志目录是否存在: ${fs.existsSync(logDir) ? '✅' : '❌'}`);

// 检查项目根目录的内容
console.log(`\n📂 项目根目录内容:`);
try {
  const rootContents = fs.readdirSync(projectRoot);
  rootContents.forEach(item => {
    const itemPath = path.join(projectRoot, item);
    const isDir = fs.statSync(itemPath).isDirectory();
    console.log(`  ${isDir ? '📁' : '📄'} ${item}`);
  });
} catch (error) {
  console.log(`  ❌ 无法读取目录: ${error.message}`);
}

// 尝试创建日志目录和文件
console.log(`\n🔨 测试日志创建:`);
try {
  if (!fs.existsSync(logDir)) {
    console.log(`  正在创建日志目录: ${logDir}`);
    fs.mkdirSync(logDir, { recursive: true });
    console.log(`  ✅ 日志目录创建成功`);
  } else {
    console.log(`  📁 日志目录已存在`);
  }
  
  // 测试写入日志文件
  const testLogFile = path.join(logDir, 'test-backup.log');
  console.log(`  测试写入文件: ${testLogFile}`);
  fs.writeFileSync(testLogFile, `测试日志 - ${new Date().toISOString()}\n工作目录: ${process.cwd()}\n`, 'utf8');
  console.log(`  ✅ 测试日志写入成功`);
  
  // 清理测试文件
  fs.unlinkSync(testLogFile);
  console.log(`  🧹 测试文件已清理`);
  
} catch (error) {
  console.log(`  ❌ 错误: ${error.message}`);
  console.log(`  错误类型: ${error.constructor.name}`);
  console.log(`  错误代码: ${error.code || 'N/A'}`);
}