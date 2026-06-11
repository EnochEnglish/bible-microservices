/**
 * bible-module-service - 模块管理服务
 *
 * 核心职责：
 * - 圣经数据导入（OSIS/USFX/Zefania XML 格式）
 * - 译本安装/卸载
 * - 模块元数据管理
 * - 从 open-bibles 等源下载圣经数据
 *
 * 这是替代 JSword 的核心服务：
 * JSword 负责 SWORD 模块格式解析，
 * 我们自己解析 OSIS/USFX/Zefania 三种公开格式
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

    // Spring Boot Data JPA
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")

    // Validation
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Jackson
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-xml")

    // OkHttp - 下载圣经数据文件
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // H2 数据库
    runtimeOnly("com.h2database:h2")

    // PostgreSQL
    runtimeOnly("org.postgresql:postgresql")

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