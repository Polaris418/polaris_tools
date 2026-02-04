# 数据库迁移文件

本目录包含 Flyway 风格的数据库迁移文件，用于管理数据库架构的版本控制。

## 迁移文件命名规范

迁移文件遵循 Flyway 命名规范：

```
V{版本号}__{描述}.sql
```

例如：
- `V1.2__add_columns_to_email_audit_log.sql`
- `V2.1__create_verification_code_table.sql`

## 现有迁移

### V1.x - 初始版本和早期修复
- `V1.2__add_columns_to_email_audit_log.sql` - 为 email_audit_log 表添加 updated_at 和 deleted 列
- `V1.3__add_updated_at_to_user_favorite.sql` - 为 user_favorite 表添加 updated_at 列

### V2.x - 邮件验证系统
- `V2.1__create_verification_code_table.sql` - 创建邮件验证码表
- `V2.2__create_verification_log_table.sql` - 创建邮件验证日志表

## 执行迁移

### 方法 1: 使用提供的脚本（推荐）

#### Windows (PowerShell)
```powershell
cd backend
.\run-verification-migrations.ps1
```

#### Linux/Mac (Bash)
```bash
cd backend
chmod +x run-verification-migrations.sh
./run-verification-migrations.sh
```

### 方法 2: 手动执行

```bash
# 连接到数据库
mysql -u root -p polaris

# 执行迁移文件
source db/migration/V2.1__create_verification_code_table.sql
source db/migration/V2.2__create_verification_log_table.sql
```

### 方法 3: 使用环境变量配置

```bash
# 设置数据库连接参数
export DB_HOST=localhost
export DB_PORT=3306
export DB_NAME=polaris
export DB_USERNAME=root
export DB_PASSWORD=your_password

# 执行迁移脚本
./run-verification-migrations.sh
```

## 验证迁移

执行迁移后，可以运行验证脚本来确认表结构和索引：

```bash
mysql -u root -p polaris < src/main/resources/sql/verify_verification_tables.sql
```

或者手动验证：

```sql
-- 查看表结构
DESCRIBE email_verification_code;
DESCRIBE email_verification_log;

-- 查看索引
SHOW INDEX FROM email_verification_code;
SHOW INDEX FROM email_verification_log;

-- 测试插入
INSERT INTO email_verification_code (code_hash, email, purpose, expires_at) 
VALUES ('test_hash', 'test@example.com', 'register', DATE_ADD(NOW(), INTERVAL 10 MINUTE));

-- 测试查询
SELECT * FROM email_verification_code WHERE email = 'test@example.com';

-- 清理测试数据
DELETE FROM email_verification_code WHERE email = 'test@example.com';
```

## 迁移最佳实践

1. **版本号递增**: 新迁移文件的版本号应该大于现有的最大版本号
2. **描述清晰**: 文件名应该清楚地描述迁移的内容
3. **幂等性**: 使用 `CREATE TABLE IF NOT EXISTS` 等语句确保迁移可以重复执行
4. **注释完整**: 在迁移文件中添加详细的注释说明背景和目的
5. **测试验证**: 在开发环境充分测试后再应用到生产环境
6. **备份数据**: 在生产环境执行迁移前务必备份数据库

## 回滚策略

如果需要回滚迁移，可以：

1. 手动删除创建的表：
```sql
DROP TABLE IF EXISTS email_verification_code;
DROP TABLE IF EXISTS email_verification_log;
```

2. 或者使用软删除标记（如果表已有数据）：
```sql
-- 标记表为已删除（需要先添加相应的元数据表）
UPDATE schema_version SET deleted = 1 WHERE version = '2.1';
```

## 相关文档

- [邮件验证系统需求文档](../../.kiro/specs/email-verification-system/requirements.md)
- [邮件验证系统设计文档](../../.kiro/specs/email-verification-system/design.md)
- [邮件验证系统任务列表](../../.kiro/specs/email-verification-system/tasks.md)

## 问题排查

### 错误: Unknown column 'deleted' in 'where clause'

这通常是因为表缺少 `deleted` 列。确保所有继承 `BaseEntity` 的实体对应的表都包含以下列：
- `id` (BIGINT, PRIMARY KEY)
- `created_at` (DATETIME)
- `updated_at` (DATETIME)
- `deleted` (TINYINT)

### 错误: Table already exists

如果表已存在，迁移脚本会跳过创建（使用了 `IF NOT EXISTS`）。如果需要重新创建表，请先删除现有表。

### 错误: Access denied

检查数据库连接参数（用户名、密码、主机、端口）是否正确。
