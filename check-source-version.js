const fs = require('fs');
const path = require('path');

console.log('=== 检查源文件版本 ===\n');

const sourceFile = path.join(process.cwd(), 'src', 'connections', 'connection.ts');

console.log(`源文件路径: ${sourceFile}`);
console.log(`源文件存在: ${fs.existsSync(sourceFile) ? '✅' : '❌'}\n`);

if (fs.existsSync(sourceFile)) {
  try {
    const content = fs.readFileSync(sourceFile, 'utf8');
    
    // 检查关键特征
    const hasDebugLog = content.includes('console.log(\'=== 连接日志调试信息 ===\')');
    const hasFindProjectRoot = content.includes('findProjectRoot()');
    const hasOldProcessCwd = content.includes('const logDir = path.join(process.cwd(), \'logs\');');
    
    console.log('源文件特征检查:');
    console.log(`包含调试日志: ${hasDebugLog ? '✅' : '❌'}`);
    console.log(`包含 findProjectRoot 调用: ${hasFindProjectRoot ? '✅' : '❌'}`);
    console.log(`包含旧的 process.cwd(): ${hasOldProcessCwd ? '❌ 旧版本' : '✅ 新版本'}`);
    
    // 获取文件修改时间
    const stats = fs.statSync(sourceFile);
    console.log(`文件修改时间: ${stats.mtime.toLocaleString()}`);
    
    // 显示构造函数的关键部分
    const constructorMatch = content.match(/\/\/ 创建连接日志文件[\s\S]{0,800}/);
    if (constructorMatch) {
      console.log('\n构造函数中的日志创建部分:');
      console.log('---');
      console.log(constructorMatch[0]);
      console.log('---');
    } else {
      console.log('\n❌ 未找到日志创建部分的代码');
    }
    
  } catch (error) {
    console.log(`❌ 读取源文件失败: ${error.message}`);
  }
} else {
  console.log('❌ 源文件不存在');
}

// 检查 TypeScript 配置
const tsconfigFile = path.join(process.cwd(), 'tsconfig.json');
console.log(`\n=== TypeScript 配置 ===`);
console.log(`tsconfig.json 存在: ${fs.existsSync(tsconfigFile) ? '✅' : '❌'}`);

if (fs.existsSync(tsconfigFile)) {
  try {
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigFile, 'utf8'));
    console.log(`输出目录: ${tsconfig.compilerOptions?.outDir || 'N/A'}`);
    console.log(`根目录: ${tsconfig.compilerOptions?.rootDir || 'N/A'}`);
    console.log(`包含文件: ${JSON.stringify(tsconfig.include || [])}`);
  } catch (error) {
    console.log(`❌ 读取 tsconfig.json 失败: ${error.message}`);
  }
}

// 检查 package.json
const packageFile = path.join(process.cwd(), 'package.json');
console.log(`\n=== Package.json 检查 ===`);
console.log(`package.json 存在: ${fs.existsSync(packageFile) ? '✅' : '❌'}`);

if (fs.existsSync(packageFile)) {
  try {
    const pkg = JSON.parse(fs.readFileSync(packageFile, 'utf8'));
    console.log(`项目名称: ${pkg.name}`);
    console.log(`构建脚本: ${pkg.scripts?.build || 'N/A'}`);
  } catch (error) {
    console.log(`❌ 读取 package.json 失败: ${error.message}`);
  }
}