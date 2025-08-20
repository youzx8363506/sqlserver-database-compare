# SQL Server 数据库比较工具 - Web UI 版本

## 项目架构

### 目录结构
```
sqlserver-database-compare/
├── src/                     # 现有的核心逻辑
│   ├── types/
│   ├── connections/
│   ├── extractors/
│   ├── comparers/
│   └── reporters/
├── web-server/              # Web API 服务
│   ├── routes/              # API 路由
│   ├── controllers/         # 控制器
│   ├── services/            # 业务逻辑服务
│   ├── middleware/          # 中间件
│   └── app.ts              # Express 服务器
├── web-ui/                  # React 前端
│   ├── src/
│   │   ├── components/      # React 组件
│   │   ├── pages/          # 页面组件
│   │   ├── services/       # API 调用
│   │   ├── types/          # TypeScript 类型
│   │   └── utils/          # 工具函数
│   ├── public/
│   └── package.json
├── reports/                 # 生成的报告文件
└── uploads/                 # 临时文件
```

## 技术栈

### 后端 API 服务
- **Express.js** - Web 框架
- **TypeScript** - 类型安全
- **Socket.io** - WebSocket 实时通信
- **Multer** - 文件上传处理
- **现有核心模块** - 重用数据库比较逻辑

### 前端 Web UI
- **React 18** - 用户界面框架
- **TypeScript** - 类型安全
- **Ant Design** - UI 组件库
- **React Router** - 路由管理
- **Axios** - HTTP 客户端
- **Socket.io-client** - WebSocket 客户端
- **Monaco Editor** - 代码编辑器
- **ECharts** - 图表可视化

## 页面设计

### 1. 主页 (`/`)
**功能:** 数据库连接配置和比较启动
**组件:**
- DatabaseConnectionForm - 数据库连接配置表单
- ComparisonOptionsPanel - 比较选项设置
- ConnectionTestResult - 连接测试结果显示

### 2. 比较进度页 (`/compare/:taskId`)
**功能:** 实时显示比较进度
**组件:**
- ProgressIndicator - 进度条和状态
- RealTimeStats - 实时统计信息
- LogPanel - 操作日志显示

### 3. 结果总览页 (`/results/:taskId`)
**功能:** 比较结果摘要和导航
**组件:**
- ResultSummary - 结果摘要卡片
- DifferenceChart - 差异统计图表
- DifferenceList - 差异列表组件
- ExportOptions - 报告导出选项

### 4. 详细比较页 (`/results/:taskId/details/:objectType/:objectName`)
**功能:** 单个对象的详细比较
**组件:**
- SideBySideComparison - 并排比较视图
- DifferenceHighlight - 差异高亮显示
- SQLViewer - SQL 代码查看器

### 5. 报告页面 (`/reports/:taskId`)
**功能:** 在线查看生成的报告
**组件:**
- ReportViewer - 报告查看器
- DownloadLinks - 下载链接

## API 接口设计

### 数据库连接 API
```typescript
// 测试数据库连接
POST /api/database/test-connection
{
  server: string;
  database: string;
  authentication: {
    type: 'windows' | 'sql';
    username?: string;
    password?: string;
  };
}

// 获取数据库对象列表
GET /api/database/objects?server=&database=&type=tables
```

### 比较任务 API
```typescript
// 创建比较任务
POST /api/compare/create
{
  source: DatabaseConfig;
  target: DatabaseConfig;
  options: ComparisonOptions;
}
// 返回: { taskId: string }

// 获取任务状态
GET /api/compare/status/:taskId

// 获取任务结果
GET /api/compare/results/:taskId
```

### 报告 API
```typescript
// 生成报告
POST /api/reports/generate/:taskId
{
  format: 'html' | 'excel' | 'json';
}

// 下载报告
GET /api/reports/download/:reportId

// 在线查看报告
GET /api/reports/view/:reportId
```

### WebSocket 事件
```typescript
// 客户端监听事件
'comparison-progress' - 比较进度更新
'comparison-complete' - 比较完成
'comparison-error' - 比较出错
'log-message' - 日志消息
```

## 用户交互流程

### 1. 配置数据库连接
1. 用户填写源数据库和目标数据库连接信息
2. 点击"测试连接"按钮验证连接
3. 选择比较选项（对象类型、忽略规则等）
4. 点击"开始比较"创建任务

### 2. 查看比较进度
1. 跳转到进度页面，显示任务ID
2. 通过WebSocket实时接收进度更新
3. 显示当前步骤、完成百分比、剩余时间

### 3. 查看比较结果
1. 比较完成后自动跳转到结果页面
2. 展示总体统计和差异分类
3. 提供筛选和搜索功能
4. 支持按对象类型分组查看

### 4. 详细差异分析
1. 点击具体差异项查看详细对比
2. 并排显示源和目标的定义
3. 高亮显示差异部分
4. 支持SQL代码折叠和展开

### 5. 导出和分享
1. 选择报告格式（HTML/Excel/JSON）
2. 生成报告文件
3. 提供下载链接或在线查看
4. 支持报告链接分享

## 开发阶段

### 第一阶段：基础框架 (1-2天)
1. 搭建Express API服务器
2. 创建React前端项目
3. 集成现有的数据库比较核心模块
4. 实现基础路由和页面结构

### 第二阶段：核心功能 (3-4天)
1. 实现数据库连接和测试API
2. 创建比较任务管理系统
3. 集成WebSocket实时通信
4. 开发主要页面组件

### 第三阶段：UI完善 (2-3天)
1. 完善前端界面设计
2. 实现详细比较视图
3. 添加图表和可视化
4. 优化用户体验

### 第四阶段：报告系统 (1-2天)
1. 集成现有报告生成器
2. 实现在线报告查看
3. 添加报告下载功能
4. 优化报告样式

## 部署方案

### 开发环境
```bash
# 启动后端服务
cd web-server && npm run dev

# 启动前端开发服务器
cd web-ui && npm start

# 访问应用
http://localhost:3000
```

### 生产部署
```bash
# 构建前端
cd web-ui && npm run build

# 启动生产服务器
cd web-server && npm run start

# 或使用 Docker
docker-compose up -d
```

### Docker 配置
```yaml
version: '3.8'
services:
  db-compare-api:
    build: ./web-server
    ports:
      - "3001:3001"
    volumes:
      - ./reports:/app/reports
  
  db-compare-ui:
    build: ./web-ui
    ports:
      - "80:80"
    depends_on:
      - db-compare-api
```

## 优势特点

1. **用户友好**: 图形化界面，无需命令行操作
2. **实时反馈**: WebSocket推送进度和状态
3. **可视化**: 图表展示比较结果统计
4. **在线查看**: 支持浏览器直接查看报告
5. **分享便利**: 可生成链接分享比较结果
6. **跨平台**: 基于Web技术，支持各种操作系统
7. **扩展性**: 模块化设计，便于功能扩展

这个Web UI版本将提供比命令行工具更好的用户体验，特别适合团队协作和结果分享。