import type { components, operations, paths } from './api-generated';

/**
 * OpenAPI 自动生成类型的适配层。
 * 业务代码优先依赖这里导出的类型，避免直接耦合生成文件命名细节。
 */
export type ApiPaths = paths;
export type ApiOperations = operations;
export type ApiSchemas = components['schemas'];

export type ResultSchemaKey = Extract<keyof ApiSchemas, `Result${string}`>;
export type ApiResult<T extends ResultSchemaKey> = ApiSchemas[T];

// 常用结果类型别名
export type LoginApiResult = ApiSchemas['ResultLoginResponse'];
export type UserProfileApiResult = ApiSchemas['ResultUserResponse'];
export type ToolListApiResult = ApiSchemas['ResultPageResultToolResponse'];
