/**
 * Bible Microservices - 根项目构建配置
 *
 * 统一管理所有微服务的版本和公共依赖
 * 各子服务在自己的 build.gradle.kts 中声明具体依赖
 */
plugins {
    // Kotlin JVM - 所有服务共用
    kotlin("jvm") version "1.9.22" apply false

    // Spring Boot - 所有服务共用
    id("org.springframework.boot") version "3.2.2" apply false

    // Spring 依赖管理
    id("io.spring.dependency-management") version "1.1.4" apply false

    // Kotlin Spring 插件
    kotlin("plugin.spring") version "1.9.22" apply false

    // Kotlin JPA 插件
    kotlin("plugin.jpa") version "1.9.22" apply false
}

// 所有子项目公共配置
subprojects {
    repositories {
        // 阿里云 Maven 镜像（国内加速）
        maven {
            url = uri("https://maven.aliyun.com/repository/public")
        }
        mavenCentral()
    }

    // 统一 JDK 版本
    tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
        kotlinOptions {
            jvmTarget = "17"
        }
    }
}
