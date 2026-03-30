# 开发 Seed 数据

`init.dev.sql` 为开发环境初始化快照（已脱敏），用于本地快速搭建数据。

## 使用方式

```bash
mysql -u root -p polaris < backend/db/seed/init.dev.sql
```

## 注意

- 该文件不属于迁移链。
- 生产环境禁止使用该快照初始化。
