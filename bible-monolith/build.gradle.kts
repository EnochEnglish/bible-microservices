/**
 * bible-monolith - Merged Microservices Monolith
 *
 * Combines 6 Spring Boot services into a single JVM application:
 * - bible-gateway (API CORS config)
 * - bible-text-service (verse query, annotations, bookmarks, Strong's, dictionary)
 * - bible-search-service (full-text search via Lucene)
 * - bible-module-service (module management, BibleParser import)
 * - bible-auth-service (JWT auth + admin)
 * - bible-sword-service (JSword SWORD modules + dictionary + GenBook)
 *
 * JVM: -Xms48m -Xmx160m (1 GiB server)
 * Port: 8080 (single port)
 * H2 databases: shared data/ directory
 */
plugins {
    id("org.springframework.boot")
    id("io.spring.dependency-management")
    kotlin("jvm")
    kotlin("plugin.spring")
    kotlin("plugin.jpa")
}

dependencies {
    // ===== Spring Boot Core =====
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-security")
    implementation("org.springframework.boot:spring-boot-starter-data-jpa")
    implementation("org.springframework.boot:spring-boot-starter-validation")
    implementation("org.springframework.boot:spring-boot-starter-actuator")
    implementation("org.springframework.boot:spring-boot-starter-cache")

    // ===== Jackson (JSON/XML) =====
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")
    implementation("com.fasterxml.jackson.dataformat:jackson-dataformat-xml")

    // ===== JWT =====
    implementation("io.jsonwebtoken:jjwt-api:0.12.5")
    runtimeOnly("io.jsonwebtoken:jjwt-impl:0.12.5")
    runtimeOnly("io.jsonwebtoken:jjwt-jackson:0.12.5")

    // ===== Kotlin =====
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    // ===== Apache Lucene (full-text search) =====
    implementation("org.apache.lucene:lucene-core:9.8.0")
    implementation("org.apache.lucene:lucene-queryparser:9.8.0")
    implementation("org.apache.lucene:lucene-highlighter:9.8.0")
    implementation("org.apache.lucene:lucene-analysis-common:9.8.0")
    implementation("org.apache.lucene:lucene-analysis-smartcn:9.8.0")

    // ===== OkHttp (for HTTP calls to self / external) =====
    implementation("com.squareup.okhttp3:okhttp:4.12.0")

    // ===== JSword SWORD Reader =====
    implementation(project(":bible-sword-reader"))
    implementation("org.jdom:jdom2:2.0.6.1")
    implementation("org.apache.commons:commons-compress:1.21")
    implementation("org.slf4j:slf4j-api:2.0.9")

    // ===== Caffeine Cache =====
    implementation("com.github.ben-manes.caffeine:caffeine")

    // ===== H2 Database =====
    runtimeOnly("com.h2database:h2")

    // ===== PostgreSQL (production) =====
    runtimeOnly("org.postgresql:postgresql")

    // ===== Test =====
    testImplementation("org.springframework.boot:spring-boot-starter-test")
}

kotlin {
    jvmToolchain(17)
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
    kotlinOptions {
        freeCompilerArgs = listOf("-Xjsr305=strict")
        jvmTarget = "17"
    }
}

tasks.test {
    useJUnitPlatform()
}

springBoot {
    mainClass.set("com.bible.monolith.BibleMonolithApplicationKt")
    buildInfo()
}
