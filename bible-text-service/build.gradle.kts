/**
 * bible-text-service - 经文查询服务
 *
 * 核心职责：
 * - 经文查询（单节、范围、整章）
 * - 译本管理（多译本切换）
 * - 数据持久化（H2/PostgreSQL）
 * - 经文缓存
 */
plugins {
    id("org.springframework.boot")
    id("io.spring.dependency-management")
    kotlin("jvm")
    kotlin("plugin.spring")
    kotlin("plugin.jpa")
}

dependencies {
    // Spring Boot Web
    implementation("org.springframework.boot:spring-boot-starter-web")

    // Spring Boot Data JPA - 经文数据持久化
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")

    // Spring Cache - 经文缓存
    implementation("org.springframework.boot:spring-boot-starter-cache")

    // Jackson - JSON 序列化
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")

    // XML 解析 - 支持 OSIS/USFX/Zefania 格式
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-xml")

    // PostgreSQL
    runtimeOnly("org.postgresql:postgresql")

    // H2 开发数据库
    runtimeOnly("com.h2database:h2")

    // Validation
    implementation("org.springframework.boot:spring-boot-starter-validation")

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