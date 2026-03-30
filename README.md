# Polaris Tools

Polaris Tools 是一个前后端分离的在线工具平台仓库，当前仓库内已包含：

- `backend/`：Spring Boot 后端源码、资源文件、数据库迁移与开发 seed
- `polaris-tools/`：React + Vite 前端源码、测试、构建配置与工具实现
- 根目录统一启动脚本：用于一键启动前后端、构建与测试

## 仓库结构

```text
AAA_polaris_tool/
├── backend/                 # Spring Boot 后端
│   ├── src/main/java/       # 后端业务源码
│   ├── src/main/resources/  # application.yml / mapper 等资源
│   ├── src/test/            # 后端测试
│   ├── db/migration/        # Flyway 迁移
│   ├── db/seed/             # 开发初始化数据
│   ├── .env.example         # 后端环境变量示例
│   └── pom.xml
├── polaris-tools/           # React + Vite 前端
│   ├── tools/               # 工具实现
│   ├── pages/               # 页面
│   ├── api/                 # API 请求封装
│   ├── tests/               # 前端测试
│   ├── .env.local.example   # 前端环境变量示例
│   └── package.json
├── docker-compose.yml       # 本地容器编排
├── package.json             # 根目录统一脚本
└── README.md
```

## 环境要求

- Node.js 18+
- npm 9+
- JDK 17+
- Maven 3.6+
- MySQL 8+
- Redis 7+（可选，本地部分能力可无 Redis 运行）

## 快速启动

### 1. 安装前端依赖

```bash
cd polaris-tools
npm install
```

### 2. 配置后端环境变量

```bash
cd backend
cp .env.example .env
```

至少需要确认：

- `JWT_SECRET`
- 数据库连接配置
- 如需邮件功能，再配置邮件供应商相关变量

### 3. 初始化数据库（开发环境可选导入 seed）

```bash
mysql -u root -p polaris < backend/db/seed/init.dev.sql
```

### 4. 启动前后端

在仓库根目录执行：

```bash
npm run dev:frontend
npm run dev:backend
```

默认地址：

- 前端：[http://localhost:3000](http://localhost:3000)
- 后端：[http://localhost:8080](http://localhost:8080)

## 根目录统一命令

```bash
npm run dev:frontend
npm run dev:backend
npm run build:frontend
npm run build:backend
npm run test:frontend
npm run test:backend
```

## Docker 启动

如果你本地已安装 Docker，可直接在根目录运行：

```bash
docker compose up --build -d
```

## 说明

- 仓库当前包含前后端运行所需的核心代码与启动文件
- 不包含本地临时输出、调试产物、归档型历史资料
- 复杂功能的详细说明可分别查看：
  - `backend/README.md`
  - `polaris-tools/README.md`
