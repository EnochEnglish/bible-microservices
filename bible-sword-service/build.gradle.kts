/**
 * bible-sword-service - SWORD Module Native Reader
 *
 * Core responsibility:
 * - Read SWORD modules natively via JSword (no pre-import)
 * - Expose REST API for passages, dictionaries, commentaries
 * - License: JSword (LGPL v2.1) linked as project dependency
 */
plugins {
    id("org.springframework.boot")
    id("io.spring.dependency-management")
    kotlin("jvm")
    kotlin("plugin.spring")
}

dependencies {
    // === JSword LGPL module (project dependency) ===
    implementation(project(":bible-sword-reader"))

    // === JSword transitive deps needed at runtime ===
    implementation("org.jdom:jdom2:2.0.6.1")
    implementation("org.apache.commons:commons-compress:1.21")
    implementation("org.slf4j:slf4j-api:2.0.9")

    // === Spring Boot ===
    implementation("org.springframework.boot:spring-boot-starter-web")
    implementation("org.springframework.boot:spring-boot-starter-actuator")

    // === Kotlin support ===
    implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
    implementation("com.fasterxml.jackson.datatype:jackson-datatype-jsr310")
    implementation("org.jetbrains.kotlin:kotlin-reflect")

    // === Caching (JSword has internal LRU, but we add server-side cache) ===
    implementation("org.springframework.boot:spring-boot-starter-cache")
    implementation("com.github.ben-manes.caffeine:caffeine")

    // === Test ===
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
