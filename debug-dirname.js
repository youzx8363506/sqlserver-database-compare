const path = require('path');
const fs = require('fs');

console.log('=== 调试 __dirname 路径 ===');
console.log('当前工作目录 (process.cwd()):', process.cwd());
console.log('当前脚本目录 (__dirname):', __dirname);

// 模拟 findProjectRoot 方法
function findProjectRoot(startDir) {
  console.log('\n=== findProjectRoot 调试 ===');
  console.log('起始目录:', startDir);
  
  let currentDir = startDir;
  let attempts = 0;
  
  while (currentDir !== path.dirname(currentDir) && attempts < 10) {
    attempts++;
    console.log(`第${attempts}次尝试: ${currentDir}`);
    
    const packageJsonPath = path.join(currentDir, 'package.json');
    console.log(`  检查: ${packageJsonPath}`);
    
    if (fs.existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        console.log(`  找到 package.json: ${packageJson.name}`);
        
        if (packageJson.name === 'sqlserver-database-compare') {
          console.log(`  ✅ 找到主项目!`);
          return currentDir;
        }
      } catch (error) {
        console.log(`  ❌ 无效的 package.json`);
      }
    } else {
      console.log(`  package.json 不存在`);
    }
    
    currentDir = path.dirname(currentDir);
  }
  
  console.log(`  回退到工作目录: ${process.cwd()}`);
  return process.cwd();
}

// 测试不同的起始目录
const testDirs = [
  __dirname,
  path.join(__dirname, 'dist', 'connections'),
  path.join(__dirname, 'web-server', 'dist', 'src', 'connections'),
];

testDirs.forEach(testDir => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`测试目录: ${testDir}`);
  if (fs.existsSync(testDir)) {
    const projectRoot = findProjectRoot(testDir);
    const logDir = path.join(projectRoot, 'logs');
    console.log(`项目根目录: ${projectRoot}`);
    console.log(`日志目录: ${logDir}`);
  } else {
    console.log('目录不存在');
  }
});