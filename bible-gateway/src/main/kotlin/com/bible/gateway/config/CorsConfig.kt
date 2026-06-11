package com.bible.gateway.config

import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.web.cors.CorsConfiguration
import org.springframework.web.cors.reactive.CorsWebFilter
import org.springframework.web.cors.reactive.UrlBasedCorsConfigurationSource

/**
 * CORS 跨域配置
 *
 * Spring Cloud Gateway 使用 WebFlux，不是 WebMVC
 * 所以用 CorsWebFilter 而不是 WebMvcConfigurer
 */
@Configuration
class CorsConfig {

    @Bean
    fun corsWebFilter(): CorsWebFilter {
        val config = CorsConfiguration().apply {
            // 允许所有来源（开发模式），生产环境需限制
            addAllowedOriginPattern("*")
            // Local development
            addAllowedOrigin("http://localhost:5173")
            addAllowedOrigin("http://localhost:8080")
            addAllowedOrigin("http://localhost:3000")
            addAllowedOrigin("http://127.0.0.1:3000")
            // Production domains
            addAllowedOrigin("https://www.usebible.com")
            addAllowedOrigin("https://usebible.com")
            addAllowedOrigin("https://andbible.cn")
            addAllowedOrigin("https://andbible.com")
            // 允许所有请求头和方法
            addAllowedHeader("*")
            addAllowedMethod("*")
            // 允许携带凭证
            allowCredentials = true
            // 预检请求缓存时间
            maxAge = 3600L
        }

        val source = UrlBasedCorsConfigurationSource()
        source.registerCorsConfiguration("/**", config)

        return CorsWebFilter(source)
    }
}
