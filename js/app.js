/**
 * ============================================
 *  世界杯 AI 助手 — 主应用逻辑
 * ============================================
 */

(function() {
    'use strict';

    // ==================== 应用状态 ====================
    const state = {
        messages: [],
        isLoading: false,
        aiEnabled: false
    };

    // ==================== 核心组件 ====================
    const intentEngine = new IntentEngine();
    const faqKnowledge = new FaqKnowledge();
    const aiClient = new AIClient(CONFIG);

    // ==================== DOM 引用 ====================
    const $ = (id) => document.getElementById(id);
    const chatMessages = $('chat-messages');
    const userInput = $('user-input');
    const sendBtn = $('send-btn');
    const suggestionsBar = $('suggestions-bar');
    const statusBadge = $('status-badge');
    const demoIndicator = $('demo-indicator');
    const toggleMode = $('toggle-mode');

    // ==================== 初始化 ====================
    async function init() {
        await faqKnowledge.ensureLoaded();
        updateDemoUI();
        addMessage({
            role: 'ai',
            text: '👋 你好！我是世界杯 AI 助手 ⚽\n\n' +
                '我可以帮你：\n' +
                '• ⚽ 回答足球规则问题（越位、VAR等）\n' +
                '• 🔮 查看预测与夺冠分析\n' +
                '• 🏆 查询世界杯历史知识\n\n' +
                '试试下面的建议问题吧！👇',
            isWelcome: true
        });
        renderSuggestions(getInitialSuggestions());
        userInput.focus();
    }

    // ==================== 消息管理 ====================

    function addMessage(msg) {
        state.messages.push({
            id: Date.now() + Math.random(),
            role: msg.role,
            text: msg.text,
            isWelcome: msg.isWelcome || false
        });
        renderMessages();
    }

    function renderMessages() {
        chatMessages.innerHTML = '';
        state.messages.forEach(msg => {
            const div = document.createElement('div');
            div.className = `message ${msg.role}-message${msg.isWelcome ? ' welcome' : ''}`;
            div.innerHTML = formatText(msg.text);
            chatMessages.appendChild(div);
        });
        scrollToBottom();
    }

    /** 格式化文本（支持粗体） */
    function formatText(text) {
        // 转义 HTML
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        // 粗体 **text**
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        // 换行
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    function scrollToBottom() {
        setTimeout(() => {
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 50);
    }

    // ==================== 建议问题 ====================

    function getInitialSuggestions() {
        return [
            { text: '越位是什么意思？', icon: '⚽' },
            { text: 'VAR 是什么？', icon: '🖥️' },
            { text: '2026 世界杯赛制', icon: '🏆' },
            { text: '梅西是谁？', icon: '⭐' }
        ];
    }

    function renderSuggestions(suggestions) {
        suggestionsBar.innerHTML = '';
        suggestions.forEach(s => {
            const chip = document.createElement('span');
            chip.className = 'suggestion-chip';
            chip.textContent = `${s.icon} ${s.text}`;
            chip.addEventListener('click', () => {
                userInput.value = s.text;
                handleSend();
            });
            suggestionsBar.appendChild(chip);
        });
    }

    // ==================== 发送消息 ====================

    async function handleSend() {
        const text = userInput.value.trim();
        if (!text || state.isLoading) return;

        userInput.value = '';
        setLoading(true);

        // 添加用户消息
        addMessage({ role: 'user', text });

        // 生成回复
        const reply = await generateReply(text);
        addMessage({ role: 'ai', text: reply });

        setLoading(false);
        renderSuggestions(getUpdatedSuggestions());

        // 如果启用了 AI 模式，更新配额显示
        if (state.aiEnabled) {
            updateDemoUI();
        }
    }

    async function generateReply(query) {
        const intentResult = intentEngine.classify(query);

        // 问候 → 直接回复
        if (intentResult.intent === IntentType.GREETING) {
            const hour = new Date().getHours();
            const g = hour < 6 ? '🌙 夜深了' : hour < 12 ? '🌅 早上好' :
                       hour < 14 ? '☀️ 中午好' : hour < 18 ? '🌤️ 下午好' : '🌆 晚上好';
            return `${g}！我是世界杯 AI 助手 ⚽\n\n📸 截图识别 · ⚽ 足球知识 · 🔮 预测 · 🏆 赛事信息\n\n试试上方的建议问题吧！👇`;
        }

        // 球员识别 → 引导
        if (intentResult.intent === IntentType.PLAYER_RECOGNITION) {
            return '📸 本 Demo 暂不支持图片识别功能。\n\n你可以试试问我这些：\n• ⚽ **越位规则** — 越位是什么意思？\n• 🖥️ **VAR技术** — VAR 是什么？\n• 🏆 **世界杯知识** — 大力神杯的材质？\n• ⭐ **球星介绍** — 姆巴佩是谁？';
        }

        // FAQ 命中 → 本地秒回
        const faq = faqKnowledge.search(query);
        if (faq && faq.confidence >= 0.6) {
            const related = faq.relatedQuestions?.length
                ? '\n\n💡 相关问题：' + faq.relatedQuestions.join('、')
                : '';
            return `⚽ **${faq.question}**\n\n${faq.answer}${related}`;
        }

        // 一般规则问题但 FAQ 未命中 → 尝试用 FAQ 低置信度信息
        if (faq && faq.confidence >= 0.3) {
            const base = `⚽ **${faq.question}**\n\n${faq.answer}`;

            // 如果启用了 AI 模式，补充 AI 回复
            if (state.aiEnabled && aiClient.hasApiKey) {
                try {
                    const context = state.messages.slice(-6).map(m =>
                        `[${m.role}] ${m.text.substring(0, 200)}`
                    ).join('\n');
                    const supplement = await aiClient.chat(
                        `用户问了「${query}」，我已有以下知识，请补充更多背景：\n${faq.answer}`,
                        context,
                        `已有知识：${faq.answer.substring(0, 300)}`
                    );
                    return base + '\n\n---\n🤖 **AI 补充**\n' + supplement;
                } catch (e) {
                    return base;
                }
            }
            return base;
        }

        // 其他意图 + AI 模式开启 → AI 回复
        if (state.aiEnabled && aiClient.hasApiKey) {
            try {
                const context = state.messages.slice(-6).map(m =>
                    `[${m.role}] ${m.text.substring(0, 200)}`
                ).join('\n');
                return await aiClient.chat(query, context);
            } catch (e) {
                if (e.message.includes('配额')) {
                    return `⚠️ ${e.message}\n\n当前为 Demo 模式，你可以关闭 AI 模式使用本地知识库回复。`;
                }
                return `⚠️ AI 服务暂时不可用（${e.message}）。\n\n以下为本地知识库能回答的问题：\n• ⚽ 越位规则、VAR、红黄牌\n• 🏆 2026 世界杯赛制\n• ⭐ 球星介绍（梅西、姆巴佩等）\n• 🌍 世界杯历史知识`;
            }
        }

        // 纯 Demo 模式 + 非 FAQ → 引导
        return getDemoFallback(intentResult);
    }

    function getDemoFallback(intentResult) {
        const intent = intentResult.intent;
        if (intent === IntentType.MATCH_SCORE || intent === IntentType.SCHEDULE_QUERY) {
            return '📊 本 Demo 不包含实时比赛数据。\n\n你可以试试问：\n• ⚽ **越位是什么意思？**\n• 🖥️ **VAR 如何工作？**\n• 🏆 **2026 世界杯赛制**\n• 🌍 **世界杯历史知识**';
        }
        if (intent === IntentType.PREDICTION_QUERY) {
            return '🔮 本 Demo 不包含实时预测数据。\n\n试试问这些吧：\n• ⚽ 越位规则\n• 🖥️ VAR 技术\n• 🏆 世界杯历史';
        }
        if (intent === IntentType.PLAYER_INFO) {
            const player = intentResult.entities.player;
            if (player) {
                return `⭐ **${player}** 是一位著名足球运动员！\n\n关于${player}的详细信息，建议查看 App 内的球员资料页面。\n\n试试问：\n• ⚽ 越位是什么意思？\n• 🖥️ VAR 是什么？`;
            }
        }
        if (intent === IntentType.TEAM_INFO) {
            const team = intentResult.entities.team;
            if (team) {
                return `🏟️ **${team}** 是 2026 世界杯参赛球队之一！\n\n详细阵容和战绩请查看 App 内的球队详情页。`;
            }
        }
        // 兜底回复
        return '🤔 这个问题超出 Demo 的知识范围了。\n\n你可以试试：\n• ⚽ **越位是什么意思？** — 足球规则\n• 🖥️ **VAR 是什么？** — 科技规则\n• 🏆 **2026 世界杯赛制** — 赛事知识\n• ⭐ **姆巴佩是谁？** — 球星介绍\n\n切换到 **AI 模式** 获取智能回答（已内置 LongCat API Key，开箱即用）。';
    }

    function getUpdatedSuggestions() {
        const n = state.messages.length;
        if (n <= 3) {
            return [
                { text: '越位是什么意思？', icon: '⚽' },
                { text: 'VAR 是什么？', icon: '🖥️' },
                { text: '2026 世界杯赛制', icon: '🏆' },
                { text: '大力神杯的材质', icon: '🏟️' }
            ];
        }
        if (n <= 8) {
            return [
                { text: '点球大战规则', icon: '⚽' },
                { text: '什么是帽子戏法？', icon: '🎩' },
                { text: '金靴奖怎么评？', icon: '🥇' },
                { text: '2026 场馆分布', icon: '🏟️' }
            ];
        }
        return [
            { text: 'FIFA 排名怎么算？', icon: '📊' },
            { text: '半自动越位技术', icon: '🖥️' },
            { text: '中国队进过世界杯吗？', icon: '🇨🇳' },
            { text: '转会费最贵的球员', icon: '💰' }
        ];
    }

    // ==================== UI ====================

    function setLoading(loading) {
        state.isLoading = loading;
        sendBtn.disabled = loading;
        userInput.disabled = loading;
        sendBtn.textContent = loading ? '...' : '发送';
        if (loading) {
            userInput.placeholder = '思考中...';
        } else {
            userInput.placeholder = '输入你的问题...';
            userInput.focus();
        }
    }

    function updateDemoUI() {
        const isDemo = aiClient.isDemoMode;
        state.aiEnabled = !isDemo;

        if (isDemo) {
            demoIndicator.textContent = '🎯 Demo 模式';
            demoIndicator.className = 'badge badge-demo';
            statusBadge.textContent = '本地 FAQ（0/∞）';
            toggleMode.textContent = '🔓 开启 AI';
        } else {
            const quota = aiClient.getRemainingQuota();
            demoIndicator.textContent = '🤖 AI 模式';
            demoIndicator.className = 'badge badge-ai';
            statusBadge.textContent = `LongCat AI（${quota}/${CONFIG.DAILY_API_QUOTA}）`;

            if (!aiClient.hasApiKey) {
                statusBadge.textContent = '⚠️ 未配置 API Key';
            }
        }
    }

    // ==================== 事件绑定 ====================

    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    });

    // 模式切换
    toggleMode.addEventListener('click', () => {
        const newMode = !aiClient.isDemoMode;
        aiClient.toggleDemoMode(newMode);

        if (!newMode) {
            addMessage({
                role: 'ai',
                text: `🤖 **AI 模式已开启！**\n\n由 **LongCat AI** 提供智能回答（每日高达 ${CONFIG.DAILY_API_QUOTA} 次配额）。\nFAQ 命中的问题仍然本地秒回！`
            });
        } else {
            addMessage({
                role: 'ai',
                text: '🎯 **已切换回 Demo 模式**\n\n使用本地知识库回复，不消耗任何 API 配额。\n所有足球规则、世界杯知识类问题均可本地秒回！'
            });
        }

        updateDemoUI();
    });

    // ==================== 启动 ====================
    document.addEventListener('DOMContentLoaded', init);

})();
