# Bible Microservices - 分发包构建完成

**时间:** 2026-05-03 08:20
**状态:** ✅ 完成

## 构建成果

**分发包:** `bible-microservices/BibleMicroservices-1.0.0-portable.zip` (202.2 MB)

解压后目录结构:
```
dist/
├── start.bat              # 双击启动所有服务
├── stop.bat               # 停止所有服务
├── README.html            # 使用说明
├── LICENSE               # MIT 许可证
├── app.ico               # 图标
├── data/                 # H2数据库和Lucene索引存储目录
├── logs/                 # 服务日志目录
├── jdk-17.0.15+6-jre/    # Java 17 运行时 (嵌入式, 零配置)
└── services/
    ├── gateway/           # Bible Gateway (8080)
    ├── text-service/      # Text Service (8081)
    ├── search-service/    # Search Service (8082)
    └── module-service/    # Module Service (8083)
```

## 内含内容

| 组件 | 版本 | 说明 |
|------|------|------|
| Java JRE | 17.0.15 | 嵌入式，无需安装 Java |
| Spring Boot | 3.2.2 | 全部 4 个服务 |
| Gateway | - | API 网关，路由 + CORS |
| Text Service | - | H2 嵌入式数据库，经文 CRUD |
| Search Service | - | Lucene 全文搜索 |
| Module Service | - | OSIS/USFX/Zefania XML 解析器 |

## 使用方式

1. 解压 `BibleMicroservices-1.0.0-portable.zip`
2. 双击 `start.bat`
3. 等待 4/4 服务启动完成
4. 浏览器自动打开 Swagger UI

## 已知遗留问题 (来自之前会话)

- **module-service /import-url 端点 500 错误** — OSIS 解析器网络下载超时，建议用 `/import` 文件上传方式导入圣经数据，或通过 text-service 的 `/import` 端点直接导入 JSON 测试数据
- **搜索索引为空** — 首次使用需先导入圣经数据，搜索服务会自动建立索引
- **H2 数据重启后丢失** — 开发模式使用内存数据库；生产环境需配置 PostgreSQL

## InnoSetup 安装包

未成功安装 InnoSetup，未生成 `.exe` 安装程序。
如需安装包，需手动安装 InnoSetup 6 (jrsoftware.org/is.exe) 后运行 `installer/inno-setup.iss` 脚本编译。