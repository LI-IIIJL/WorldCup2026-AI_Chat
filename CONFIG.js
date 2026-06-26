/**
 * ============================================
 *  WorldCup2026 AI Chat — 配置文件
 * ============================================
 *
 * 本文件包含所有可配置参数。
 * 已预配 LongCat 免费 API Key（5,000,000 tokens/天）
 * 警告：此 Key 会随代码公开到 GitHub，因为是免费额度所以不担心被盗用
 * 如果你担心，可以自行替换为自己的 Key
 */

const CONFIG = {
    // ==================== LongCat API（免费，不限量） ====================
    // LongCat API 通过 OpenAI 兼容格式接入
    // 每天免费 5,000,000 Tokens，提交反馈可升至 120,000,000
    // 申请地址：https://longcat.chat/platform/
    LONGCA_API_KEY: 'ak_2580OP61I21N2753Df8Oo0CP85i7w',

    // LongCat API 配置（OpenAI 兼容格式）
    LONGCA_API_URL: 'https://api.longcat.chat/openai/v1/chat/completions',
    LONGCA_MODEL: 'LongCat-2.0-Preview',
    LONGCA_TEMPERATURE: 0.8,
    LONGCA_MAX_TOKENS: 2000,

    // ==================== Demo 模式 ====================
    // Demo 模式下所有回复走本地 FAQ（不消耗任何 API）
    // 默认关闭 AI 模式？false = 默认开启 AI（因为 LongCat 免费）
    DEMO_MODE_DEFAULT: false,

    // ==================== 速率限制 ====================
    // LongCat 每天 500 万 tokens，不需要严格限频
    // 但为了防止单个页面刷屏，设一个宽松配额
    DAILY_API_QUOTA: 999,

    // ==================== 应用信息 ====================
    APP_NAME: '世界杯 AI 助手',
    APP_VERSION: '1.0.0',
    REPO_URL: 'https://github.com/lijionglin/WorldCup2026-AI_Chat'
};
