package com.bible.search

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

/**
 * bible-search-service 启动类
 *
 * 全文检索微服务，基于 Apache Lucene
 */
@SpringBootApplication
class SearchServiceApplication

fun main(args: Array<String>) {
    runApplication<SearchServiceApplication>(*args)
}