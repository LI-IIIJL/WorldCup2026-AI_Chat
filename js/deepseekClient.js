/**
 * ============================================
 *  AI 客户端 — 接入 LongCat API（OpenAI 兼容格式）
 * ============================================
 *
 * LongCat 提供每日 500 万 tokens 免费额度，完全够用。
 * 已预配 Key，开箱即用。
 */

class AIClient {
    constructor(config) {
        this.config = config;
        this.STORAGE_KEY = 'worldcup_ai_chat_quota';
        this.LAST_DATE_KEY = 'worldcup_ai_chat_date';
    }

    /** 当前是否为 Demo 模式 */
    get isDemoMode() {
        return this._getDemoPref();
    }

    /** 获取 Demo 模式偏好 */
    _getDemoPref() {
        const stored = localStorage.getItem('worldcup_ai_demo_mode');
        return stored !== null ? stored === 'true' : this.config.DEMO_MODE_DEFAULT;
    }

    /** 切换 Demo 模式 */
    toggleDemoMode(enable) {
        localStorage.setItem('worldcup_ai_demo_mode', enable);
    }

    /** 获取今日剩余配额 */
    getRemainingQuota() {
        this._resetIfNewDay();
        const used = parseInt(localStorage.getItem(this.STORAGE_KEY) || '0');
        return Math.max(0, this.config.DAILY_API_QUOTA - used);
    }

    /** 检查是否有可用配额 */
    _hasQuota() {
        this._resetIfNewDay();
        const used = parseInt(localStorage.getItem(this.STORAGE_KEY) || '0');
        return used < this.config.DAILY_API_QUOTA;
    }

    /** 消耗一次配额 */
    _consumeQuota() {
        this._resetIfNewDay();
        const used = parseInt(localStorage.getItem(this.STORAGE_KEY) || '0');
        localStorage.setItem(this.STORAGE_KEY, used + 1);
    }

    /** 跨日重置 */
    _resetIfNewDay() {
        const today = new Date().toDateString();
        const lastDate = localStorage.getItem(this.LAST_DATE_KEY);
        if (lastDate !== today) {
            localStorage.setItem(this.STORAGE_KEY, '0');
            localStorage.setItem(this.LAST_DATE_KEY, today);
        }
    }

    /** API Key 是否已配置 */
    get hasApiKey() {
        const key = this.config.LONGCA_API_KEY;
        return key && key.length > 10 && !key.startsWith('sk-xxxx');
    }

    /**
     * 调用 LongCat API（OpenAI 兼容格式）
     * @returns {Promise<string>} AI 回复文本
     */
    async chat(query, context = '', faqContext = '') {
        if (!this.hasApiKey) {
            throw new Error('未配置 API Key，请检查 CONFIG.js 中的 LONGCA_API_KEY');
        }
        if (!this._hasQuota()) {
            throw new Error('今日配额已用完，明天再来吧！');
        }

        this._consumeQuota();

        const systemPrompt = `你叫"世界杯AI助手"，是2026美加墨世界杯官方观赛App的内置AI助手。

## 你的性格
- 热情、专业、聊得来。像一个懂球的朋友，不是冷冰冰的客服。
- 回答简短有力，除非用户问得很深。
- 可以使用⚽🏆🥅等足球emoji。

## 知识边界
- 你对足球规则、世界杯历史、球队球员背景了如指掌。
- 不要编造比分或比赛结果！
- 不知道的就说"这个我还不确定"。

## 回复风格
- 用中文，简洁自然
- 涉及多个条目时分点列出`;

        const messages = [
            { role: 'system', content: systemPrompt }
        ];

        if (context) {
            messages.push({
                role: 'assistant',
                content: '对话历史：\n' + context.substring(0, 2000)
            });
        }

        if (faqContext) {
            messages.push({
                role: 'system',
                content: '【知识库参考】\n' + faqContext
            });
        }

        // 当前时间上下文
        const now = new Date();
        const timeStr = now.toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
        messages.push({
            role: 'system',
            content: `【当前时间】北京时间 ${timeStr}`
        });

        messages.push({ role: 'user', content: query });

        const payload = {
            model: this.config.LONGCA_MODEL,
            messages: messages,
            temperature: this.config.LONGCA_TEMPERATURE,
            max_tokens: this.config.LONGCA_MAX_TOKENS
        };

        const response = await fetch(this.config.LONGCA_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${this.config.LONGCA_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errBody = await response.text();
            throw new Error(`API 请求失败 (${response.status}): ${errBody}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        return content || '抱歉，AI 没有返回有效回复。';
    }
}
