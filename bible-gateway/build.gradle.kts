/**
 * bible-gateway - API 网关
 *
 * 核心职责：
 * - 统一入口，路由到各微服务
 * - CORS 跨域配置
 * - 限流保护
 * - 请求日志
 * - 健康检查
 *
 * 技术方案：
 * - Spring Cloud Gateway（响应式网关）
 */
plugins {
    id("org.springframework.boot")
    id("io.spring.dependency-management")
    kotlin("jvm")
    kotlin("plugin.spring")
}

dependencies {
    // Spring Cloud Gateway - 响应式 API 网关
    implementation("org.springframework.boot:spring-boot-starter-webflux")

    // Spring Cloud Gateway
    implementation("org.springframework.cloud:spring-cloud-starter-gateway:4.1.0")

    // Jackson
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")

    // Actuator - 健康检查
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // 测试
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

kotlin {
    jvmToolchain(17)
}

tasks.test {
    useJUnitPlatform()
}

springBoot {
    buildInfo()
}
