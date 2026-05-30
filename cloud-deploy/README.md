# Bible Microservices - 云服务器部署包

## 系统要求

- Linux 服务器（Ubuntu 20.04+ / CentOS 7+）
- Java 17（OpenJDK 17）
- 开放端口：8080（API 网关）

## 快速部署

### 1. 安装 Java 17

```bash
# Ubuntu / Debian
sudo apt update
sudo apt install openjdk-17-jdk -y

# CentOS / RHEL
sudo yum install java-17-openjdk -y

# 验证
java -version
```

### 2. 上传并解压

```bash
# 上传 bible-cloud-deploy.zip 到服务器
scp bible-cloud-deploy.zip user@your-server:/opt/

# SSH 登录服务器
ssh user@your-server

# 解压
cd /opt
unzip bible-cloud-deploy.zip -d bible-microservices
cd bible-microservices

# 赋予脚本执行权限
chmod +x start.sh stop.sh
```

### 3. 启动服务

```bash
./start.sh
```

输出示例：
```
======================
  Bible Microservices v1.0
  Starting 4 services...
======================
[1/4] Starting Text Service on port 8081...
  PID: 12345
...
  Access at: http://YOUR_SERVER_IP:8080
```

### 4. 验证运行

```bash
# 查看进程
ps aux | grep bible

# 测试 API
curl http://localhost:8080/api/v1/bible/translations

# 测试经文查询
curl http://localhost:8080/api/v1/bible/kjv/john/3/16
```

### 5. 停止服务

```bash
./stop.sh
```

## 目录结构

```
bible-microservices/
├── start.sh              # 启动脚本
├── stop.sh               # 停止脚本
├── services/            # JAR 包
│   ├── bible-gateway.jar
│   ├── bible-text-service.jar
│   ├── bible-search-service.jar
│   └── bible-module-service.jar
├── data/                # 数据目录（H2 数据库自动创建）
└── logs/                # 日志目录
```

## 端口说明

| 服务 | 端口 | 说明 |
|------|------|------|
| Gateway | 8080 | API 网关（对外暴露） |
| Text Service | 8081 | 经文查询（内部） |
| Search Service | 8082 | 全文检索（内部） |
| Module Service | 8083 | 模块管理（内部） |

**只需开放 8080 端口**，其余端口仅内部访问。

## 导入圣经数据

KJV 数据已包含在 `bible-text-service.jar` 中（首次运行自动初始化）。

如需导入其他译本：

```bash
# 将 OSIS/USFX/Zefania XML 文件放入服务器
# 通过 API 导入：
curl -X POST http://localhost:8083/api/v1/modules/import \
  -F "file=@your-bible.xml"
```

## 防火墙配置

```bash
# Ubuntu (ufw)
sudo ufw allow 8080/tcp
sudo ufw reload

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-port=8080/tcp
sudo firewall-cmd --reload
```

## Nginx 反向代理（可选）

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

## 常见问题

**Q: 启动后访问 404？**
A: 等待 10-20 秒让服务完全启动，然后访问 `http://IP:8080/api/v1/bible/translations`

**Q: 如何修改端口？**
A: 编辑 `start.sh`，修改 `--server.port=` 参数

**Q: 数据存在哪里？**
A: `data/` 目录下的 H2 数据库文件，可定期备份

**Q: 如何查看日志？**
A: `tail -f logs/text-service.log`
