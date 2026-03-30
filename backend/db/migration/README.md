# 迁移脚本说明

`db/migration/` 是项目唯一权威迁移目录。

## 命名规范

```text
V{版本号}__{描述}.sql
```

## 当前迁移链

- `V0.0__seed_data.sql`：开发 Seed 占位迁移（默认无业务数据写入）
- `V1.0__baseline.sql`：核心业务与文档模块基线表
- `V1.1__email_system.sql`：邮件系统基线表
- `V1.2__add_columns_to_email_audit_log.sql`
- `V1.3__add_updated_at_to_user_favorite.sql`
- `V2.1__create_verification_code_table.sql`
- `V2.2__create_verification_log_table.sql`
- `V2.3__create_verification_alert_history_table.sql`
- `V2.4__optimize_verification_indexes.sql`
- `V3.1__add_language_preference_to_user.sql`
- `V3.2__add_password_updated_at_to_user.sql`
- `V3.3__add_email_verified_columns_to_user.sql`

## 使用约束

- 不再从 `src/main/resources/sql/` 或 `sql-scripts/` 执行迁移。
- 历史脚本仅保留在 `db/archive/` 供追溯。

## 常用命令

```bash
mvn -f backend/pom.xml flyway:info
mvn -f backend/pom.xml flyway:migrate
```

## 开发 Seed

本地快速初始化示例数据请使用：

```bash
mysql -u root -p polaris < backend/db/seed/init.dev.sql
```
