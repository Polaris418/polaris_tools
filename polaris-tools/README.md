# Polaris Tools Frontend

前端基于 React 19 + TypeScript + Vite。

## 环境要求

- Node.js 18+
- npm

## 启动步骤

```bash
cd polaris-tools
cp .env.local.example .env.local
npm install
npm run dev
```

本地开发默认地址：`http://localhost:3000`

说明：

- `npm run dev` 使用 `vite.config.ts` 中配置的 Vite 开发端口 `3000`
- 如果通过仓库根目录的 `docker compose up --build -d` 启动，宿主机访问地址仍是 `http://localhost:5173`

## 环境变量

`polaris-tools/.env.local.example`：

- `VITE_API_BASE_URL`：后端地址，建议 `http://localhost:8080`
- `GEMINI_API_KEY`：可选，AI 功能使用

注意：

- `VITE_API_BASE_URL` 不要带 `/api/v1`
- API 客户端会在请求中自行拼接接口前缀

## 常用命令

```bash
npm run dev
npm run build
npm run preview
npm run test
npm run test:run
npm run test:ui
npm run generate:api
```

## API 类型生成

后端启动后可生成 OpenAPI 类型文件：

```bash
npm run generate:api
```

输出文件：`polaris-tools/types/api-generated.ts`

## 主要目录

```text
polaris-tools/
├── api/
├── components/
├── context/
├── hooks/
├── i18n/
├── pages/
├── tests/
├── tools/
└── utils/
```
