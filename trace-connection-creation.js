const fs = require('fs');
const path = require('path');

console.log('=== 追踪 DatabaseConnection 创建时机 ===\n');

// 检查 web-server 中使用 DatabaseConnection 的地方
const webServerSrcDir = path.join(process.cwd(), 'web-server', 'src');

function searchForDatabaseConnection(dir, depth = 0) {
  if (depth > 3) return; // 限制搜索深度
  
  try {
    const files = fs.readdirSync(dir);
    
    files.forEach(file => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      
      if (stat.isDirectory()) {
        searchForDatabaseConnection(filePath, depth + 1);
      } else if (file.endsWith('.ts') || file.endsWith('.js')) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          
          // 查找 DatabaseConnection 的使用
          if (content.includes('DatabaseConnection')) {
            console.log(`📄 文件: ${filePath}`);
            
            // 查找 import 语句
            const importMatches = content.match(/import.*DatabaseConnection.*from.*$/gm);
            if (importMatches) {
              console.log('  📥 导入语句:');
              importMatches.forEach(match => {
                console.log(`    ${match.trim()}`);
              });
            }
            
            // 查找 new DatabaseConnection 的使用
            const newMatches = content.match(/new\s+DatabaseConnection\s*\([^)]*\)/g);
            if (newMatches) {
              console.log('  🔨 实例化调用:');
              newMatches.forEach(match => {
                console.log(`    ${match.trim()}`);
              });
              
              // 查找周围的上下文
              const lines = content.split('\n');
              lines.forEach((line, index) => {
                if (line.includes('new DatabaseConnection')) {
                  console.log(`  📍 第 ${index + 1} 行上下文:`);
                  const start = Math.max(0, index - 2);
                  const end = Math.min(lines.length, index + 3);
                  for (let i = start; i < end; i++) {
                    const marker = i === index ? '➤' : ' ';
                    console.log(`    ${marker} ${i + 1}: ${lines[i].trim()}`);
                  }
                  console.log('');
                }
              });
            }
            
            console.log('');
          }
        } catch (readError) {
          // 忽略读取错误
        }
      }
    });
  } catch (dirError) {
    console.log(`❌ 无法读取目录 ${dir}: ${dirError.message}`);
  }
}

console.log('🔍 搜索 web-server 中 DatabaseConnection 的使用...\n');
searchForDatabaseConnection(webServerSrcDir);

// 检查 web-server 的启动文件
console.log('=== Web-server 启动流程 ===');
const appFile = path.join(webServerSrcDir, 'app.ts');
console.log(`检查启动文件: ${appFile}`);
console.log(`文件存在: ${fs.existsSync(appFile) ? '✅' : '❌'}\n`);

if (fs.existsSync(appFile)) {
  try {
    const content = fs.readFileSync(appFile, 'utf8');
    console.log('app.ts 文件内容预览:');
    console.log('---');
    console.log(content.substring(0, 1000) + '...');
    console.log('---\n');
  } catch (error) {
    console.log(`❌ 读取 app.ts 失败: ${error.message}`);
  }
}

// 检查路由文件
const routesDir = path.join(webServerSrcDir, 'routes');
console.log(`=== 检查路由目录 ===`);
console.log(`路由目录: ${routesDir}`);
console.log(`目录存在: ${fs.existsSync(routesDir) ? '✅' : '❌'}\n`);

if (fs.existsSync(routesDir)) {
  console.log('路由文件列表:');
  try {
    const routeFiles = fs.readdirSync(routesDir);
    routeFiles.forEach(file => {
      console.log(`  📄 ${file}`);
    });
    console.log('');
  } catch (error) {
    console.log(`❌ 读取路由目录失败: ${error.message}`);
  }
}

// 总结 DatabaseConnection 创建时机
console.log('=== DatabaseConnection 创建时机总结 ===');
console.log('根据常见的 web 服务器架构，DatabaseConnection 通常在以下时机创建:');
console.log('1. 🚀 服务器启动时 - 创建全局连接池');
console.log('2. 📡 API 请求时 - 为特定请求创建连接');
console.log('3. 🔌 按需连接时 - 当需要访问数据库时');
console.log('');
console.log('💡 提示: 如果没有进行数据库操作，DatabaseConnection 可能不会被实例化');
console.log('💡 建议: 检查是否有 API 请求触发了数据库连接的创建');