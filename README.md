# 🌟 Polaris Tools

<div align="center">

**一个现代化的在线工具集平台**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.2.0-brightgreen.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-19.2.3-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8.2-blue.svg)](https://www.typescriptlang.org/)

[English](README.md) | [简体中文](README_CN.md)

</div>

## 📖 项目简介

Polaris Tools 是一个功能丰富的在线工具集平台，提供各种实用的开发工具和文档转换功能。项目采用前后端分离架构，后端基于 Spring Boot 3，前端使用 React 19 + TypeScript 构建。

### ✨ 核心特性

- 🔐 **完整的用户认证系统** - 支持邮箱验证码登录/注册、密码登录、访客模式
- 📧 **多邮件服务提供商** - 支持 AWS SES 和 Resend，可动态切换
- 🛠️ **丰富的在线工具** - Base64 编码、UUID 生成、密码生成器、时间戳转换等
- 📝 **Markdown 转 Word** - 支持批量转换、实时预览、多种导出格式
- 🌍 **国际化支持** - 中英文双语界面
- 📊 **管理后台** - 用户管理、工具管理、邮件监控、数据统计
- 🎨 **现代化 UI** - 响应式设计，支持深色模式
- ⚡ **高性能** - Redis 缓存、数据库优化、前端虚拟列表

## 🏗️ 技术栈

### 后端技术

- **核心框架**: Spring Boot 3.2.0 + Java 17
- **数据访问**: MyBatis-Plus 3.5.5 + MySQL 8.0
- **安全认证**: Spring Security + JWT (jjwt 0.11.5)
- **缓存**: Redis 7+
- **邮件服务**: AWS SES v2 + Resend
- **文档处理**: Flexmark (Markdown) + Docx4j (Word) + OpenHTMLtoPDF (PDF)
- **限流**: Bucket4j 8.7.0
- **API 文档**: SpringDoc OpenAPI 2.6.0

### 前端技术

- **核心框架**: React 19.2.3 + TypeScript 5.8.2
- **构建工具**: Vite 6.2.0
- **状态管理**: React Context API
- **UI 组件**: 自定义组件库
- **图表**: Recharts 3.7.0
- **Markdown**: markdown-it + KaTeX
- **文档处理**: docx + jsPDF
- **测试**: Vitest 4.0.18 + Testing Library

## 📦 项目结构

```
polaris-tools/
├── backend/                    # 后端服务
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/polaris/
│   │   │   │   ├── common/     # 通用组件
│   │   │   │   ├── config/     # 配置类
│   │   │   │   ├── controller/ # 控制器层
│   │   │   │   ├── dto/        # 数据传输对象
│   │   │   │   ├── entity/     # 实体类
│   │   │   │   ├── mapper/     # 数据访问层
│   │   │   │   ├── security/   # 安全组件
│   │   │   │   └── service/    # 业务逻辑层
│   │   │   └── resources/
│   │   │       ├── application.yml
│   │   │       └── db/migration/  # 数据库迁移脚本
│   │   └── test/               # 测试代码
│   ├── db/migration/           # Flyway 迁移脚本
│   └── pom.xml
│
└── polaris-tools/              # 前端应用
    ├── api/                    # API 客户端
    ├── components/             # React 组件
    ├── pages/                  # 页面组件
    │   └── admin/              # 管理后台页面
    ├── hooks/                  # 自定义 Hooks
    ├── utils/                  # 工具函数
    ├── i18n/                   # 国际化配置
    ├── tools/                  # 工具页面
    │   └── md2word/            # Markdown 转 Word 工具
    ├── tests/                  # 测试文件
    └── package.json
```

## 🚀 快速开始

### 环境要求

- **后端**:
  - JDK 17+
  - Maven 3.6+
  - MySQL 8.0+
  - Redis 7+

- **前端**:
  - Node.js 18+
  - npm 或 yarn

### 后端启动

1. **克隆项目**
```bash
git clone https://github.com/Polaris418/polaris_tools.git
cd polaris_tools/backend
```

2. **配置数据库**

创建数据库：
```sql
CREATE DATABASE polaris CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

3. **配置应用**

复制 `.env.example` 为 `.env` 并配置：
```properties
# 数据库配置
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/polaris
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=your_password

# Redis 配置
SPRING_REDIS_HOST=localhost
SPRING_REDIS_PORT=6379

# JWT 配置
JWT_SECRET=your_jwt_secret_key_here
JWT_EXPIRATION=86400000

# AWS SES 配置
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_REGION=us-east-1
AWS_SES_FROM_EMAIL=noreply@yourdomain.com

# Resend 配置
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=noreply@yourdomain.com
```

4. **运行应用**
```bash
mvn spring-boot:run
```

后端服务将在 `http://localhost:8080` 启动

5. **访问 API 文档**

Swagger UI: `http://localhost:8080/swagger-ui.html`

### 前端启动

1. **进入前端目录**
```bash
cd polaris-tools
```

2. **安装依赖**
```bash
npm install
```

3. **配置环境变量**

复制 `.env.local.example` 为 `.env.local`：
```env
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

4. **启动开发服务器**
```bash
npm run dev
```

前端应用将在 `http://localhost:5173` 启动

## 🔧 主要功能模块

### 用户功能

- ✅ 邮箱验证码注册/登录
- ✅ 密码登录
- ✅ 访客模式（无需注册即可使用部分功能）
- ✅ 用户资料管理
- ✅ 头像自定义（DiceBear 集成）
- ✅ 邮件偏好设置
- ✅ 多语言切换

### 工具集

- ✅ **Base64 编码/解码** - 文本和文件的 Base64 转换
- ✅ **UUID 生成器** - 批量生成 UUID
- ✅ **密码生成器** - 自定义强度的密码生成
- ✅ **时间戳转换** - Unix 时间戳与日期互转
- ✅ **URL 编码/解码** - URL 参数编码解码
- ✅ **大小写转换** - 多种文本格式转换
- ✅ **颜色转换** - HEX/RGB/HSL 颜色格式转换
- ✅ **字数统计** - 文本字数、字符统计
- ✅ **Markdown 转 Word** - 支持批量转换、实时预览

### 管理后台

- ✅ 用户管理（CRUD、状态管理）
- ✅ 工具管理（分类、排序）
- ✅ 邮件队列监控
- ✅ 邮件模板管理
- ✅ 邮件发送统计
- ✅ 验证码监控
- ✅ 抑制列表管理
- ✅ 系统统计面板

### 邮件系统

- ✅ 多提供商支持（AWS SES / Resend）
- ✅ 动态切换邮件服务
- ✅ 邮件队列和重试机制
- ✅ 邮件模板系统
- ✅ 发送速率限制
- ✅ 邮件审计日志
- ✅ 实时监控和告警

## 📊 数据库设计

项目使用 Flyway 进行数据库版本管理，主要数据表包括：

- `user` - 用户信息
- `tool` - 工具信息
- `category` - 工具分类
- `user_favorite` - 用户收藏
- `tool_usage` - 工具使用记录
- `email_verification_code` - 验证码
- `email_verification_log` - 验证日志
- `email_queue` - 邮件队列
- `email_audit_log` - 邮件审计日志
- `email_template` - 邮件模板
- `email_suppression` - 邮件抑制列表
- `notification` - 系统通知

## 🧪 测试

### 后端测试

```bash
cd backend
mvn test
```

### 前端测试

```bash
cd polaris-tools
npm run test        # 运行测试
npm run test:ui     # 测试 UI 界面
npm run test:run    # 单次运行测试
```

## 📝 API 文档

### 认证 API

- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/logout` - 用户登出
- `POST /api/v1/auth/refresh` - 刷新 Token
- `GET /api/v1/auth/me` - 获取当前用户

### 验证码 API

- `POST /api/v1/verification/send` - 发送验证码
- `POST /api/v1/verification/verify` - 验证验证码
- `POST /api/v1/verification/login` - 验证码登录
- `POST /api/v1/verification/register` - 验证码注册

### 工具 API

- `GET /api/v1/tools` - 获取工具列表
- `GET /api/v1/tools/{id}` - 获取工具详情
- `POST /api/v1/tools/{id}/use` - 记录工具使用

### 管理 API

- `GET /api/v1/admin/users` - 用户列表
- `GET /api/v1/admin/statistics` - 统计数据
- `GET /api/v1/admin/emails` - 邮件日志
- `GET /api/v1/admin/monitoring` - 监控数据

完整 API 文档请访问 Swagger UI。

## 🔒 安全特性

- JWT 令牌认证
- 密码加密存储（BCrypt）
- CORS 跨域配置
- XSS 防护
- CSRF 防护
- SQL 注入防护
- 请求速率限制
- 邮件发送频率限制
- 验证码过期机制

## 🌐 部署

### Docker 部署（推荐）

```bash
# 构建镜像
docker-compose build

# 启动服务
docker-compose up -d
```

### 手动部署

#### 后端部署

```bash
cd backend
mvn clean package -DskipTests
java -jar target/polaris-tools-backend-0.0.1-SNAPSHOT.jar
```

#### 前端部署

```bash
cd polaris-tools
npm run build
# 将 dist 目录部署到 Nginx 或其他 Web 服务器
```

## 🤝 贡献指南

欢迎贡献代码！请遵循以下步骤：

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 详见 [LICENSE](LICENSE) 文件

## 👥 作者

- **Polaris418** - [GitHub](https://github.com/Polaris418)

## 🙏 致谢

- [Spring Boot](https://spring.io/projects/spring-boot)
- [React](https://reactjs.org/)
- [MyBatis-Plus](https://baomidou.com/)
- [Vite](https://vitejs.dev/)
- [DiceBear](https://dicebear.com/)
- 所有贡献者

## 📮 联系方式

如有问题或建议，请通过以下方式联系：

- 提交 [Issue](https://github.com/Polaris418/polaris_tools/issues)
- 发送邮件至：[your-email@example.com]

---

<div align="center">
Made with ❤️ by Polaris418
</div>
