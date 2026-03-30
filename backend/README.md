# Polaris Tools Backend

后端基于 Spring Boot 3 + MyBatis-Plus + MySQL，提供认证、工具、分类、邮件与管理接口。

## 目录结构

```text
backend/
├── src/main/java/com/polaris/      # 业务代码
├── src/main/resources/             # 配置与 Mapper
│   └── application.yml
├── src/test/                       # 测试代码
├── db/
│   ├── migration/                  # 唯一权威迁移目录
│   ├── seed/                       # 开发初始化数据（非迁移）
│   └── archive/                    # 历史手工 SQL 归档
├── .env.example
└── pom.xml
```

## 环境要求

- JDK 17+
- Maven 3.6+
- MySQL 8+
- Redis 7+（可选）

## 配置步骤

```bash
cd backend
cp .env.example .env
```

必须关注的环境变量：

- `JWT_SECRET`：必填，建议至少 32 字符
- `EMAIL_PROVIDER`：`resend` 或 `aws-ses`
- 当 `EMAIL_PROVIDER=resend`：`RESEND_API_KEY` 必填
- 当 `EMAIL_PROVIDER=aws-ses`：`AWS_ACCESS_KEY_ID`、`AWS_SECRET_ACCESS_KEY` 必填

## 数据库初始化（开发）

```bash
mysql -u root -p polaris < db/seed/init.dev.sql
```

迁移命令（Flyway）：

```bash
mvn flyway:info
mvn flyway:migrate
```

## 启动与测试

启动：

```bash
mvn spring-boot:run
```

测试：

```bash
mvn test
```

打包：

```bash
mvn clean package
```

## API 文档

默认地址：`http://localhost:8080/swagger-ui.html`

说明：

- 通过 `SPRINGDOC_ENABLED` 控制文档开关
- 生产环境建议设置为 `false`

## 安全说明

- `/api/v1/dev/**` 仅在 `dev` profile 下放行
- 不要提交 `.env`
