# Polaris Tools Platform - Backend

Polaris Tools Platform 后端服务，基于 Spring Boot 3.2.5 + MyBatis-Plus 3.5.6 + MySQL 8.0 构建。

## 项目结构

```
backend/
├── docs/                           # 📄 文档目录
│   ├── README.md                   # 文档说明
│   ├── TASK-4-IMPLEMENTATION-SUMMARY.md
│   ├── TASK-5-IMPLEMENTATION-SUMMARY.md
│   └── CHECKPOINT-3-VERIFICATION-REPORT.md
├── tests/                          # 🧪 测试脚本目录
│   ├── README.md                   # 测试说明
│   ├── test-auth.ps1               # 认证模块测试
│   ├── test-auth.sh
│   ├── test-tool-management.ps1    # 工具管理测试
│   ├── test-category-management.ps1 # 分类管理测试
│   └── test-category-simple.ps1
├── src/                            # 💻 源代码目录
│   ├── main/
│   │   ├── java/com/polaris/
│   │   │   ├── common/             # 通用组件
│   │   │   ├── config/             # 配置类
│   │   │   ├── controller/         # 控制器层
│   │   │   ├── dto/                # 数据传输对象
│   │   │   ├── entity/             # 实体类
│   │   │   ├── mapper/             # 数据访问层
│   │   │   ├── security/           # 安全组件
│   │   │   └── service/            # 业务逻辑层
│   │   └── resources/
│   │       ├── application.yml     # 应用配置
│   │       └── db/init.sql         # 数据库初始化脚本
│   └── test/                       # 单元测试（待实现）
├── init-db.ps1                     # 数据库初始化脚本
├── pom.xml                         # Maven 配置
└── README.md                       # 本文件
```

## 技术栈

- **Java 17** - 编程语言
- **Spring Boot 3.2.5** - 核心框架
- **Spring Security** - 安全认证
- **MyBatis-Plus 3.5.6** - ORM 框架
- **MySQL 8.0+** - 关系型数据库
- **Redis 7+** - 缓存（待集成）
- **JWT (jjwt 0.11.5)** - 无状态认证
- **Lombok** - 代码简化
- **SpringDoc OpenAPI 2.6.0** - API 文档

## 快速开始

### 1. 环境要求

- JDK 17+
- Maven 3.6+
- MySQL 8.0+
- Redis 7+ (可选)

### 2. 数据库初始化

```powershell
# Windows PowerShell
./init-db.ps1
```

或手动执行：
```sql
mysql -u root -p < src/main/resources/db/init.sql
```

### 3. 配置应用

编辑 `src/main/resources/application.yml`，配置数据库连接：

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/polaris?useUnicode=true&characterEncoding=utf8&useSSL=false&serverTimezone=Asia/Shanghai
    username: root
    password: your_password
```

### 4. 运行应用

```bash
# 使用 Maven
mvn spring-boot:run

# 或编译后运行
mvn clean package
java -jar target/polaris-tools-backend-0.0.1-SNAPSHOT.jar
```

应用将在 http://localhost:8080 启动

### 5. 访问 API 文档

启动后访问 Swagger UI：
http://localhost:8080/swagger-ui.html

## 已实现的功能模块

### ✅ 用户认证与授权 (Task 2)
- 用户注册
- 用户登录
- JWT Token 生成和验证
- 获取当前用户信息

### ✅ 工具管理 (Task 4)
- 工具 CRUD 操作
- 工具列表查询（分页、搜索、过滤）
- 工具浏览计数
- 工具使用记录

### ✅ 分类管理 (Task 5)
- 分类 CRUD 操作
- 分类列表查询（包含工具数量）
- 分类名称唯一性验证
- 防止删除有工具的分类

## API 端点

### 认证 API
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `POST /api/v1/auth/logout` - 用户登出
- `POST /api/v1/auth/refresh` - 刷新 Token
- `GET /api/v1/auth/me` - 获取当前用户

### 工具 API
- `GET /api/v1/tools` - 获取工具列表
- `GET /api/v1/tools/{id}` - 获取工具详情
- `POST /api/v1/tools` - 创建工具（管理员）
- `PUT /api/v1/tools/{id}` - 更新工具（管理员）
- `DELETE /api/v1/tools/{id}` - 删除工具（管理员）
- `POST /api/v1/tools/{id}/view` - 记录浏览
- `POST /api/v1/tools/{id}/use` - 记录使用

### 分类 API
- `GET /api/v1/categories` - 获取分类列表
- `GET /api/v1/categories/{id}` - 获取分类详情
- `POST /api/v1/categories` - 创建分类（管理员）
- `PUT /api/v1/categories/{id}` - 更新分类（管理员）
- `DELETE /api/v1/categories/{id}` - 删除分类（管理员）

## 测试

### 运行 API 测试

```powershell
# 进入测试目录
cd tests

# 运行认证测试
./test-auth.ps1

# 运行工具管理测试
./test-tool-management.ps1

# 运行分类管理测试
./test-category-simple.ps1
```

详细测试说明请查看 [tests/README.md](tests/README.md)

## 开发文档

详细的开发文档请查看 [docs/README.md](docs/README.md)

## 待实现功能

- [ ] 搜索与过滤功能 (Task 7)
- [ ] 收藏功能模块 (Task 8)
- [ ] 使用统计模块 (Task 9)
- [ ] Redis 缓存集成 (Task 11)
- [ ] 单元测试和集成测试 (Task 19)

## 贡献指南

1. 遵循现有的代码风格和架构
2. 为新功能编写测试
3. 更新相关文档
4. 提交前运行所有测试

## 许可证

[待定]
