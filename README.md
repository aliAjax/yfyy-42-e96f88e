# 投诉建议登记系统

面向政务/社区工作人员的诉求管理工具，用于快速录入群众投诉建议、跟踪处理进度、记录回复结果。系统通过清晰的分类视图和简洁的录入界面，提升工作人员的办事效率。

## 功能模块

### 诉求管理
- **诉求登记**：快速录入群众信息（姓名、电话）、诉求类型、内容、来源渠道、受理时间
- **诉求列表**：卡片式列表展示，支持多维度筛选、搜索、排序
- **详情查看**：完整的诉求信息展示，包含处理记录、回访记录、升级记录等
- **状态流转**：待处理 → 处理中 → 已回复，完整的处理轨迹记录

### 处理与回访
- **处理意见**：填写处理意见，更新诉求状态，记录回复时间
- **分配办理**：将诉求分配给具体处理人员，记录分配历史
- **回访管理**：记录回访结果、满意度评价，支持不满意二次处理
- **升级督办**：对复杂诉求进行升级，记录升级原因和时间

### 数据分析
- **数据概览**：总量统计、状态分布、超期预警、类型占比、来源分布
- **趋势分析**：每日诉求量趋势图
- **多维度分析**：按类型、来源、状态、超期等级、升级次数、响应时间、状态流转等维度分析
- **满意度统计**：回访率、平均得分、满意率等指标

### 系统配置
- **时限规则**：按诉求类型 + 来源渠道配置处理时限和预警时间
- **工作时间**：配置工作日和工作时段，超期计算支持排除非工作时间
- **回复模板**：管理常用回复模板，支持快速填充
- **处理人员**：维护处理人员信息，支持分配选择
- **视图管理**：保存自定义筛选视图，按角色隔离

### 工具与运维
- **批量操作**：批量修改状态、批量升级、批量删除、批量导出
- **重复检测**：基于内容相似度检测重复诉求，支持合并
- **数据导入**：CSV/表格数据导入，支持字段映射、预览、错误提示
- **数据导出**：导出当前筛选结果为 CSV
- **备份恢复**：完整数据备份与恢复，支持差异预览和冲突处理
- **操作日志**：全量操作记录，可追溯

## 技术栈

- **框架**：React 18 + TypeScript
- **构建工具**：Vite 6
- **状态管理**：Zustand
- **样式**：Tailwind CSS 3
- **图标**：Lucide React
- **路由**：React Router 7
- **测试**：Vitest
- **代码规范**：ESLint + TypeScript ESLint

## 快速开始

### 环境要求

- Node.js >= 18
- npm 或 pnpm

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
```

启动后访问 `http://localhost:5173`

### 生产构建

```bash
npm run build
```

构建产物输出到 `dist/` 目录。

### 预览生产构建

```bash
npm run preview
```

## 代码检查与测试

### 类型检查

```bash
npm run check
```

运行 TypeScript 类型检查，不生成输出文件。

### 代码规范检查

```bash
npm run lint
```

运行 ESLint 检查代码规范。

### 运行单元测试

```bash
npm run test
```

运行所有单元测试。

```bash
npm run test:watch
```

以监听模式运行测试。

### 一键本地自检

```bash
npm run verify
```

依次执行：类型检查 → Lint 检查 → 单元测试 → 生产构建。**新同事拉取代码后，建议先运行此命令确认环境正常。**

详见 [脚本说明](#脚本说明)。

## 脚本说明

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动 Vite 开发服务器 |
| `npm run build` | 类型检查 + 生产构建 |
| `npm run lint` | ESLint 代码检查 |
| `npm run preview` | 预览生产构建结果 |
| `npm run check` | TypeScript 类型检查（noEmit） |
| `npm run test` | 运行单元测试 |
| `npm run test:watch` | 监听模式运行测试 |
| `npm run test:ui` | 可视化测试界面 |
| `npm run verify` | **一键本地自检**：类型检查 → Lint → 测试 → 构建 |

## 本地数据说明

本系统为**纯前端单机版**，所有数据存储在浏览器 `localStorage` 中，不依赖后端服务。

### 关键存储项

| Key | 说明 | 类型 | 默认初始化 |
|-----|------|------|------------|
| `complaint_records` | 诉求记录列表 | `Complaint[]` | 首次访问加载 mock 数据 |
| `reply_templates` | 回复模板列表 | `ReplyTemplate[]` | 首次访问加载默认模板 |
| `time_limit_rules` | 时限规则配置 | `TimeLimitRule[]` | 首次访问加载默认规则 |
| `work_time_rule` | 工作时间规则 | `WorkTimeRule` | 首次访问加载默认配置 |
| `operation_logs` | 操作日志 | `OperationLog[]` | 空数组 |
| `handler_users` | 处理人员列表 | `HandlerUser[]` | 首次访问加载 mock 数据 |
| `current_role` | 当前用户角色 | `'admin' \| 'operator' \| 'viewer'` | `'admin'` |
| `complaint_saved_views` | 保存的筛选视图 | `SavedView[]` | 空数组 |
| `complaint_active_view_{role}` | 当前激活的视图 ID | `string` | 无 |
| `theme` | 主题设置 | `'light' \| 'dark'` | 跟随系统 |

### 数据注意事项

1. **数据持久化**：数据仅保存在当前浏览器的 localStorage 中，清除浏览器数据会导致数据丢失
2. **数据备份**：定期使用系统内的「备份恢复」功能导出备份文件（JSON 格式）
3. **跨浏览器/设备**：不同浏览器、不同设备之间数据不互通，需通过备份文件迁移
4. **容量限制**：localStorage 通常有约 5MB 容量限制，大量数据建议定期归档
5. **首次访问**：首次打开系统会自动加载 mock 演示数据，可通过备份恢复功能清空
6. **角色切换**：右上角可切换角色（管理员/操作员/查看员），不同角色权限不同

### 重置数据

如需完全重置数据，在浏览器控制台执行：

```javascript
localStorage.clear();
location.reload();
```

或使用系统内的「备份恢复」→「恢复出厂数据」功能。

## 目录结构

```
src/
├── components/       # 组件
│   ├── AnalysisDashboard.tsx     # 分析仪表盘
│   ├── BackupRestoreModal.tsx    # 备份恢复弹窗
│   ├── BatchActionBar.tsx        # 批量操作栏
│   ├── ComplaintCard.tsx         # 诉求卡片
│   ├── ComplaintForm.tsx         # 诉求表单
│   ├── ComplaintList.tsx         # 诉求列表
│   ├── Dashboard.tsx             # 数据概览
│   ├── DetailModal.tsx           # 详情弹窗
│   ├── HandleTimeline.tsx        # 处理时间线
│   ├── Header.tsx                # 顶部导航
│   └── ...
├── pages/            # 页面
│   └── Home.tsx                  # 主页面
├── types/            # 类型定义
│   ├── complaint.ts              # 诉求相关类型
│   ├── backup.ts                 # 备份相关类型
│   ├── operationLog.ts           # 操作日志类型
│   └── replyTemplate.ts          # 回复模板类型
├── utils/            # 工具函数
│   ├── backup.ts                 # 备份恢复逻辑
│   ├── overdue.ts                # 超期计算
│   ├── stats.ts                  # 统计分析
│   ├── handlers.ts               # 处理人员管理
│   ├── replyTemplate.ts          # 回复模板管理
│   ├── views.ts                  # 视图管理
│   ├── operationLog.ts           # 操作日志
│   ├── similarity.ts             # 相似度计算
│   ├── csvImport.ts              # CSV 导入
│   ├── csvExport.ts              # CSV 导出
│   └── helpers.ts                # 通用工具
├── hooks/            # 自定义 Hook
│   └── useTheme.ts               # 主题 Hook
├── data/             # 静态数据
│   └── mockData.ts               # Mock 演示数据
├── App.tsx           # 应用入口组件
├── main.tsx          # 应用入口文件
└── index.css         # 全局样式
```

## 常见问题

### Q: 启动后数据从哪里来？
A: 首次访问会自动加载 mock 演示数据，方便快速体验功能。实际使用时可通过导入功能录入真实数据。

### Q: 数据安全吗？
A: 所有数据存储在本地浏览器中，不会上传到任何服务器。敏感数据请做好本地备份和设备安全防护。

### Q: 如何在多台电脑间同步数据？
A: 使用系统内的「备份恢复」功能导出备份文件，然后在另一台电脑上导入。
