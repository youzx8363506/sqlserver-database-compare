# SQL Server 数据库比较工具

一个基于 Node.js + React 的 SQL Server 数据库结构比较工具，支持生成多种格式的比较报告并提供链接分享功能。

## 🚀 快速开始

### Windows 用户 (推荐)

1. **安装依赖**
   ```bash
   双击运行 install.bat
   ```

2. **启动服务**
   ```bash
   双击运行 start.bat
   ```

3. **访问应用**
   ```
   打开浏览器访问: http://localhost:3000
   ```

### 手动启动

1. **安装依赖**
   ```bash
   # 后端依赖
   cd web-server
   npm install
   
   # 前端依赖
   cd ../web-ui
   npm install
   ```

2. **启动后端服务**
   ```bash
   cd web-server
   npm run dev
   ```

3. **启动前端服务** (新开终端)
   ```bash
   cd web-ui
   npm run dev
   ```

4. **访问应用**
   ```
   前端界面: http://localhost:3000
   后端API:  http://localhost:3001
   ```

## ✨ 功能特性

- 🔗 **报告链接输出** - 生成可分享的比较报告链接
- 📱 **Web界面操作** - 友好的图形化界面，无需命令行
- ⚡ **实时进度** - WebSocket实时显示比较进度和日志
- 📊 **多格式报告** - 支持HTML、Excel、JSON格式
- 🔍 **全面比较** - 比较表、索引、视图、存储过程、函数
- 🔐 **多种认证** - 支持Windows认证和SQL Server认证

## 📋 环境要求

- **Node.js** >= 18.12.1
- **SQL Server** 任何版本 (2008+)
- **浏览器** Chrome、Firefox、Edge、Safari

## 🎯 使用流程

1. **配置数据库** - 设置源数据库和目标数据库连接
2. **执行比较** - 一键开始比较，实时查看进度
3. **查看结果** - 浏览差异详情，生成报告链接

## 📖 详细文档

- [完整部署运行文档](./部署运行文档.md)
- [详细启动说明](./启动说明.md)

## 🛠 项目结构

```
├── web-server/     # 后端API服务 (Express + Socket.IO)
├── web-ui/         # 前端界面 (React + Ant Design)
├── src/            # 核心比较逻辑
├── reports/        # 生成的报告文件
├── install.bat     # Windows安装脚本
└── start.bat       # Windows启动脚本
```

## 🔧 故障排除

**页面空白?**
- 按F12查看浏览器控制台错误
- 确认两个服务都正常启动

**连接数据库失败?**
- 检查SQL Server服务状态
- 验证连接信息和用户权限

**端口占用?**
- 后端默认3001端口，前端默认3000端口
- 可修改vite.config.ts和app.ts中的端口配置

---

**版本**: v1.0.0 | **作者**: Claude Code | **许可**: MIT