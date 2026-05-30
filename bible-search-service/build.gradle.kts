/**
 * bible-search-service - 全文检索服务
 *
 * 核心职责：
 * - 经文全文搜索（关键字、短语）
 * - 多译本搜索
 * - 搜索建议/自动补全
 * - 搜索结果高亮
 *
 * 技术方案：
 * - Apache Lucene 全文索引
 * - 支持中英文分词
 */
plugins {
    id("org.springframework.boot")
    id("io.spring.dependency-management")
    kotlin("jvm")
    kotlin("plugin.spring")
}

dependencies {
    // Spring Boot Web
    implementation("org.springframework.boot:spring-boot-starter-web")

    // Spring Boot Validation
    implementation("org.springframework.boot:spring-boot-starter-validation")

    // Apache Lucene - 全文检索引擎
    implementation("org.apache.lucene:lucene-core:9.8.0")
    implementation("org.apache.lucene:lucene-queryparser:9.8.0")
    implementation("org.apache.lucene:lucene-highlighter:9.8.0")
    implementation("org.apache.lucene:lucene-analysis-common:9.8.0")
    implementation("org.apache.lucene:lucene-analysis-smartcn:9.8.0")

    // Jackson
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")

    // OkHttp - 调用 text-service 获取经文
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

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