/**
 * Bible Microservices - 根项目配�?
 * 
 * 微服务架构：
 * - bible-gateway: API 网关（路由、限流、认证）
 * - bible-text-service: 经文查询服务
 * - bible-search-service: 全文检索服�?
 * - bible-module-service: 模块管理服务
 */
rootProject.name = "bible-microservices"

include("bible-gateway")
include("bible-text-service")
include("bible-search-service")
include("bible-module-service")
include("bible-sword-service")
include("bible-sword-reader")
include("bible-auth-service")
include("bible-monolith")

