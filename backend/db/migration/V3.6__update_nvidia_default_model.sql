-- Migration: 更新 NVIDIA 默认模型与推荐参数
-- Date: 2026-03-16
-- Author: Codex
--
-- 背景:
-- 早期默认 NVIDIA 配置使用 stepfun-ai/step-3.5-flash，且参数偏向实验调试。
-- 现将默认模型切换为 openai/gpt-oss-20b，并收敛到更适合生产的非流式参数。
--
-- 策略:
-- 仅升级仍在使用旧默认模型的 NVIDIA 配置，避免覆盖管理员手工指定的自定义模型。

UPDATE `ai_provider_config`
SET
    `model` = 'openai/gpt-oss-20b',
    `timeout_ms` = CASE
        WHEN `timeout_ms` IN (5000, 10000) THEN 15000
        ELSE `timeout_ms`
    END,
    `temperature` = CASE
        WHEN `temperature` = 0.20 THEN 0.10
        ELSE `temperature`
    END,
    `top_p` = CASE
        WHEN `top_p` = 0.90 THEN 1.00
        ELSE `top_p`
    END,
    `max_tokens` = CASE
        WHEN `max_tokens` IN (512, 2048, 4096) THEN 1024
        ELSE `max_tokens`
    END
WHERE `deleted` = 0
  AND `provider_type` = 'nvidia'
  AND `model` = 'stepfun-ai/step-3.5-flash';
