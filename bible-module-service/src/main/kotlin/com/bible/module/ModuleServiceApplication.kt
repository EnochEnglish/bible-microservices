package com.bible.module

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

/**
 * bible-module-service 启动类
 *
 * 圣经模块管理微服务
 * 替代 JSword 的模块安装功能
 */
@SpringBootApplication
class ModuleServiceApplication

fun main(args: Array<String>) {
    runApplication<ModuleServiceApplication>(*args)
}