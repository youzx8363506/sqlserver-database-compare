const fs = require('fs');
const path = require('path');

console.log('=== 检查 N 盘源文件版本 ===\n');

// 假设你在 N: 盘上的路径
const nDriveSourceFile = 'N:\\备份\\sqlserverdatabasecompare\\sqlserverdatabasecompare\\src\\connections\\connection.ts';

console.log(`检查源文件: ${nDriveSourceFile}`);
console.log(`文件存在: ${fs.existsSync(nDriveSourceFile) ? '✅' : '❌'}\n`);

if (fs.existsSync(nDriveSourceFile)) {
  try {
    const content = fs.readFileSync(nDriveSourceFile, 'utf8');
    
    // 检查关键特征
    const hasDetailedDebugLog = content.includes('🔍 开始创建连接日志文件...');
    const hasFindProjectRoot = content.includes('findProjectRoot()');
    const hasStepByStepLog = content.includes('📍 步骤1: 查找项目根目录');
    const hasOldProcessCwd = content.includes('const logDir = path.join(process.cwd(), \'logs\');');
    
    console.log('N 盘源文件特征检查:');
    console.log(`包含详细调试日志: ${hasDetailedDebugLog ? '✅ 最新版本' : '❌ 旧版本'}`);
    console.log(`包含 findProjectRoot 调用: ${hasFindProjectRoot ? '✅ 最新版本' : '❌ 旧版本'}`);
    console.log(`包含分步日志: ${hasStepByStepLog ? '✅ 最新版本' : '❌ 旧版本'}`);
    console.log(`包含旧的 process.cwd(): ${hasOldProcessCwd ? '❌ 旧版本' : '✅ 新版本'}`);
    
    // 获取文件修改时间
    const stats = fs.statSync(nDriveSourceFile);
    console.log(`\n文件修改时间: ${stats.mtime.toLocaleString()}`);
    
    // 显示构造函数的关键部分
    const constructorMatch = content.match(/constructor\(config: DatabaseConfig, logger: Logger\) \{[\s\S]{0,1000}/);
    if (constructorMatch) {
      console.log('\n构造函数开头 (前500字符):');
      console.log('---');
      console.log(constructorMatch[0].substring(0, 500) + '...');
      console.log('---');
    } else {
      console.log('\n❌ 未找到构造函数');
    }
    
    // 检查版本判断
    if (hasDetailedDebugLog && hasFindProjectRoot && hasStepByStepLog && !hasOldProcessCwd) {
      console.log('\n🎉 源文件是最新版本！');
      console.log('💡 如果没有看到详细日志输出，可能的原因:');
      console.log('   1. DatabaseConnection 构造函数没有被调用');
      console.log('   2. 输出被重定向或隐藏了');
      console.log('   3. ts-node 缓存了旧版本');
    } else {
      console.log('\n⚠️ 源文件是旧版本，需要更新！');
      console.log('📋 解决方案:');
      console.log('   1. 从 D:\\code\\sqlserverdatabasecompare 复制最新的源文件');
      console.log('   2. 重启 web-server');
    }
    
  } catch (error) {
    console.log(`❌ 读取 N 盘源文件失败: ${error.message}`);
  }
} else {
  console.log('❌ N 盘源文件不存在');
}

// 同时检查对照的 D 盘文件
const dDriveSourceFile = 'D:\\code\\sqlserverdatabasecompare\\src\\connections\\connection.ts';
console.log(`\n=== 对照检查 D 盘源文件 ===`);
console.log(`D 盘源文件: ${dDriveSourceFile}`);
console.log(`文件存在: ${fs.existsSync(dDriveSourceFile) ? '✅' : '❌'}`);

if (fs.existsSync(dDriveSourceFile)) {
  const dStats = fs.statSync(dDriveSourceFile);
  console.log(`D 盘文件修改时间: ${dStats.mtime.toLocaleString()}`);
  
  if (fs.existsSync(nDriveSourceFile)) {
    const nStats = fs.statSync(nDriveSourceFile);
    const timeDiff = Math.abs(dStats.mtime.getTime() - nStats.mtime.getTime());
    console.log(`时间差: ${Math.round(timeDiff / 1000)} 秒`);
    
    if (timeDiff < 60000) {
      console.log('✅ 文件时间接近，可能是相同版本');
    } else {
      console.log('⚠️ 文件时间差异较大，可能版本不同');
    }
  }
}