# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言规则

- 始终使用中文回答用户的问题和提供技术指导
- 代码注释使用中文
- 文档和说明使用中文

## 环境信息

- 开发环境：Windows
- 运行时：Node.js
- 数据库：SQL Server

## 环境变量配置

- `REPORTS_DIR`: 报告文件存储目录路径（可选）
  - 如果未设置，默认使用Web服务目录下的 `reports` 目录
  - 示例：`REPORTS_DIR=D:\custom\reports\path`

## 项目概述

这是一个基于Node.js的SQL Server数据库比较工具，用于比较两个数据库之间的差异，包括：
- 表结构
- 索引
- 视图
- 存储过程
- 函数
- 并生成详细的比较报告

## 开发环境设置

1. 安装依赖：
```bash
npm install
```

2. 构建项目：
```bash
npm run build
```

3. 开发模式运行：
```bash
npm run dev
```

## 常用命令

### 核心模块 (根目录)
- `npm run build` - 编译 TypeScript 到 JavaScript
- `npm run dev` - 开发模式运行（使用 ts-node）
- `npm start` - 运行编译后的应用
- `npm test` - 运行测试套件
- `npm run lint` - 代码检查
- `npm run clean` - 清理构建目录
- `npm run cli` - 运行CLI工具进行测试

### Web应用启动
- **Windows快速启动**: 双击 `start.bat` 或 `启动.bat`
- **手动启动Web后端**: `cd web-server && npm run dev`
- **手动启动Web前端**: `cd web-ui && npm run dev`
- **安装所有依赖**: 双击 `install.bat` 或分别在各目录运行 `npm install`

### Web后端 (web-server/)
- `npm run dev` - 开发模式运行 (ts-node)
- `npm run build` - 编译后端代码
- `npm start` - 运行编译后的后端服务

### Web前端 (web-ui/)
- `npm run dev` - 启动Vite开发服务器
- `npm run build` - 构建生产版本
- `npm run preview` - 预览生产构建
- `npm run lint` - ESLint代码检查

## CLI 使用

```bash
# 初始化配置文件
sqldb-compare init

# 比较两个数据库
sqldb-compare compare --source "server1.db1" --target "server2.db2"

# 使用配置文件比较
sqldb-compare compare --config ./config.json --output ./reports --format html

# 只比较表结构
sqldb-compare compare --tables-only --output ./table-report.json
```

## 项目架构

这是一个多层架构的应用程序，包含核心比较引擎、Web API后端和React前端界面。

### 整体架构
```
├── src/              # 核心比较逻辑
├── web-server/       # Express + Socket.IO 后端API
├── web-ui/           # React + Ant Design 前端界面
├── reports/          # 生成的比较报告存储目录
├── *.bat             # Windows批处理启动脚本
└── *.md              # 项目文档
```

### 核心模块目录结构 (src/)
```
src/
├── cli/              # 命令行接口
│   ├── index.ts      # CLI入口点
│   └── commands/     # CLI命令实现
├── connections/      # 数据库连接管理
├── extractors/       # 数据库对象提取器
│   ├── tables.ts     # 表结构提取
│   ├── views.ts      # 视图提取
│   ├── procedures.ts # 存储过程提取
│   └── functions.ts  # 函数提取
├── comparers/        # 对象比较器
├── reporters/        # 报告生成器 (HTML, Excel, JSON)
├── types/            # TypeScript 类型定义
└── utils/            # 工具函数 (日志等)
```

### Web应用架构
- **后端** (web-server/): Express.js + Socket.IO，提供REST API和实时通信
- **前端** (web-ui/): React + Ant Design + Vite，提供现代化用户界面
- **通信**: HTTP API + WebSocket用于实时进度更新
- **部署**: 支持开发和生产模式，包含自动化批处理脚本

### 核心组件

1. **DatabaseConnection** - 管理 SQL Server 连接，支持Windows认证和SQL认证
2. **ObjectExtractors** - 提取数据库对象元数据，包括表、视图、存储过程、函数
3. **Comparers** - 执行对象比较逻辑，识别结构差异
4. **Reporters** - 生成HTML、Excel、JSON格式的比较报告
5. **CLI** - 命令行接口和参数处理
6. **WebAPI** - Express.js REST API，支持Web界面操作
7. **SocketService** - 实时进度更新和日志传输

### 应用模式

**CLI模式**: 命令行工具，适合脚本化和自动化场景
**Web模式**: 图形化界面，适合交互式操作和报告分享

### 数据流

1. **连接** - 建立到源和目标SQL Server数据库的连接
2. **提取** - 并行提取数据库对象元数据（表、视图、存储过程、函数）
3. **比较** - 执行结构比较，识别新增、删除、修改的对象
4. **报告** - 生成详细的比较报告，支持多种输出格式
5. **分享** - Web模式下生成可分享的报告链接

### 技术栈

- **后端**: Node.js + TypeScript + Express.js + Socket.IO + mssql
- **前端**: React + TypeScript + Ant Design + Vite
- **数据库**: SQL Server (2008+)
- **构建**: TypeScript编译器 + Vite打包
- **部署**: 批处理脚本自动化部署

## 重要文件

### 项目文档
- `项目方案.md` - 完整的项目需求和技术方案
- `技术实现指南.md` - 详细的代码实现指南和示例  
- `SQL查询参考.md` - 数据库对象提取的 SQL 查询
- `部署运行文档.md` - 完整的部署和运行说明
- `启动说明.md` - 快速启动指南

### 配置文件
- `tsconfig.json` - 主项目TypeScript配置
- `web-server/tsconfig.json` - Web后端TypeScript配置
- `web-ui/tsconfig.json` - Web前端TypeScript配置
- `web-ui/vite.config.ts` - Vite构建配置

### 启动脚本
- `start.bat` / `启动.bat` - Windows一键启动脚本
- `install.bat` - Windows依赖安装脚本
- `stop.bat` - 停止所有服务

## 开发注意事项

### 端口配置
- Web前端: http://localhost:3000 (默认)
- Web后端: http://localhost:3001 (API服务)
- 可在 `web-ui/vite.config.ts` 和 `web-server/src/app.ts` 中修改

### 数据库权限
- 需要对比较的数据库具有READ权限
- 支持Windows集成认证和SQL Server认证
- 需要访问系统视图 (INFORMATION_SCHEMA, sys.*)

### 报告输出
- HTML报告: 包含详细的差异对比和样式
- Excel报告: 结构化数据，便于进一步分析  
- JSON报告: 程序化处理和API集成
- 报告文件默认保存在 `reports/` 目录