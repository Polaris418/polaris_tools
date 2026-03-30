# 数据库目录说明

本目录是后端数据库资产的统一入口。

## 目录结构

```text
db/
├── migration/   # 唯一权威迁移目录（Flyway）
├── seed/        # 开发环境初始化数据（非迁移链）
└── archive/     # 历史手工 SQL 归档（只读）
```

## 使用规则

- 所有结构变更必须新增到 `db/migration/`，禁止再写入 `src/main/resources/sql/` 或 `sql-scripts/`。
- `db/seed/` 仅用于本地开发初始化，不作为生产迁移方案。
- `db/archive/` 仅保留历史脚本，不能作为部署执行入口。

## 常用命令

```bash
mvn -f backend/pom.xml flyway:info
mvn -f backend/pom.xml flyway:migrate
```
