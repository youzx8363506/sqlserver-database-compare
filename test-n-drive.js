const path = require('path');
const fs = require('fs');

console.log('=== N盘路径测试工具 ===\n');

function testPathAccess(testPath) {
  console.log(`🔍 测试路径: ${testPath}`);
  console.log(`  路径长度: ${testPath.length} 字符`);
  console.log(`  路径是否存在: ${fs.existsSync(testPath) ? '✅' : '❌'}`);
  
  if (fs.existsSync(testPath)) {
    try {
      // 测试读取权限
      const stats = fs.statSync(testPath);
      console.log(`  类型: ${stats.isDirectory() ? '目录' : '文件'}`);
      
      if (stats.isDirectory()) {
        // 测试写入权限
        const testFile = path.join(testPath, 'write-test.txt');
        try {
          fs.writeFileSync(testFile, 'test', 'utf8');
          fs.unlinkSync(testFile);
          console.log(`  写入权限: ✅`);
        } catch (writeError) {
          console.log(`  写入权限: ❌ ${writeError.message}`);
        }
        
        // 测试创建子目录权限
        const testDir = path.join(testPath, 'test-dir');
        try {
          fs.mkdirSync(testDir);
          fs.rmdirSync(testDir);
          console.log(`  创建目录权限: ✅`);
        } catch (dirError) {
          console.log(`  创建目录权限: ❌ ${dirError.message}`);
        }
      }
    } catch (error) {
      console.log(`  访问错误: ❌ ${error.message}`);
    }
  }
  console.log('');
}

// 测试可能的 N 盘路径
const nDrivePaths = [
  'N:',
  'N:\\',
  'N:\\备份',
  'N:\\备份\\sqlserverdatabasecompare',
  'N:\\备份\\sqlserverdatabasecompare\\sqlserverdatabasecompare',
  'N:\\备份\\sqlserverdatabasecompare\\sqlserverdatabasecompare\\web-server',
];

console.log(`当前执行环境:`);
console.log(`  工作目录: ${process.cwd()}`);
console.log(`  脚本目录: ${__dirname}`);
console.log(`  用户: ${process.env.USERNAME || process.env.USER || 'unknown'}`);
console.log('');

nDrivePaths.forEach(testPath => {
  testPathAccess(testPath);
});

// 测试路径解析
console.log('=== 路径解析测试 ===');
const testResolvePaths = [
  'N:\\备份\\sqlserverdatabasecompare\\sqlserverdatabasecompare\\web-server\\dist\\src\\connections',
  'N:\\备份\\sqlserverdatabasecompare\\sqlserverdatabasecompare\\logs'
];

testResolvePaths.forEach(p => {
  console.log(`路径: ${p}`);
  console.log(`  解析后: ${path.resolve(p)}`);
  console.log(`  标准化: ${path.normalize(p)}`);
  console.log('');
});