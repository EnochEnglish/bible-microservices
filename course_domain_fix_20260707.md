# 课程系统修复与领域管理 CRUD — 2026-07-07

## 目标
修复用户反馈的 3 个问题：(1) 之前课程被删除需恢复 (2) 注释面板右侧溢出 (3) 系统设置领域管理需支持增删改

## 关键操作与结论

### 1. 课程恢复
- 重新创建了 3 门被删除的课程：新生命课程(ID=8)、基要真理(ID=9)、祷告生活(ID=10)
- 保留大使命课程(ID=7)，共 4 门课程全部 published
- 使用 Node.js 脚本调用后端 API 创建（避免 PowerShell 中文乱码问题）

### 2. 注释面板溢出修复
- 根因：`.tsk-panel { width:640px }` 固定宽度超出 grid 列宽 280px
- 修复：改为 `width:100%; min-width:0; overflow-x:hidden`
- `#commentaryBody` 加 `max-width:100%; overflow-x:hidden`

### 3. 领域管理 CRUD 全栈实现
- **后端**：新建 `DomainConfig` 实体（列名 `domain_value` 避开 H2 保留字 `value`）、`DomainConfigRepository`、`DomainConfigService`
- **API**：`GET/POST /settings/domains`、`PUT/DELETE /settings/domains/{id}`
- **安全**：GET permitAll，写操作需 ADMIN/TEACHER
- **种子数据**：DataInitializer 启动时插入 4 个默认领域（theology/english/cs/university）
- **前端**：settings.js 新增 `loadDomains()` 带编辑/删除按钮和添加表单

### 4. 端到端验证
- 领域 CRUD 测试通过（创建 music→更新→删除，最终回到 4 个默认领域）
- 课程 API 通过前端代理返回 4 门课程
- 后端运行中（PID 12712, 端口 8080, -Xmx768m）
- 前端运行中（端口 3000）
- 版本号 v=20260707a

## 当前状态
- Git commit a5efe48 已提交到 monolith-clean 分支
- GitHub push 因 GFW 阻断暂未完成
- 默认账号：admin/admin123（管理员）、principal/principal123（教师）
