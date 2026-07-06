# 课程系统后端启动修复（2026-07-06）

## 问题
1. **H2 CHECK 约束冲突**：旧数据库 schema 中 `users.role` 有 `CHECK(role IN ('ADMIN','USER'))` 限制，DataInitializer 插入 `role='TEACHER'` 的 principal 用户时违反约束 CONSTRAINT_4D，导致启动失败
2. **SecurityConfig 路由匹配**：`.requestMatchers("/api/v1/orgs", "POST")` 使用字符串方法参数，Spring Security 不正确地匹配了 GET 请求，导致 `GET /api/v1/orgs` 返回 403

## 修复
1. 用 H2 JDBC 执行 `ALTER TABLE users DROP CONSTRAINT IF EXISTS CONSTRAINT_4D` 删除旧约束
2. SecurityConfig 改用 `HttpMethod.POST`/`HttpMethod.PUT`/`HttpMethod.DELETE` 枚举精确匹配 HTTP 方法
3. 重新编译 bootJar 并启动

## 验证结果
- Settings API 200（公开）
- Orgs API 200（公开 GET + 认证 GET）
- Courses API 200
- Principal 登录成功（TEACHER 角色）
- 组织成员 2 人（principal=ADMIN, admin=OWNER）
- 前端 6 个页面全部 200

## 关键文件
- `bible-monolith/src/main/kotlin/com/bible/monolith/config/SecurityConfig.kt`（HttpMethod 枚举）
- `CheckH2.java`（临时工具，可删除）
