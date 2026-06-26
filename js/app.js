/**
 * ============================================
 *  世界杯 AI 助手 — 主应用逻辑
 *  v2.0 — 集成数据库查询
 * ============================================
 *  数据来源：本地 JSON 快照（不调用任何外部 API）
 *  - players_2026.json: 1246 名球员
 *  - teams.json: 48 支球队
 *  - matches.json: 104 场比赛
 *  - predictions.json: 蒙特卡洛预测
 *  - bdl_stadiums.json: 场馆信息
 */

(function() {
    'use strict';

    // ==================== 应用状态 ====================
    const state = {
        messages: [],
        isLoading: false,
        aiEnabled: false,
        dbReady: false
    };

    // ==================== 核心组件 ====================
    const intentEngine = new IntentEngine();
    const faqKnowledge = new FaqKnowledge();
    const aiClient = new AIClient(CONFIG);
    const dataQuery = new DataQuery();

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
        await dataQuery.ensureLoaded();

        if (dataQuery.isLoaded) {
            state.dbReady = true;
            // 注入球队名和球员名到意图引擎
            intentEngine.addTeamNames(dataQuery.getAllTeamNames());
            intentEngine.addPlayerNames(dataQuery.getAllPlayerNames());
        }

        updateDemoUI();
        addMessage({
            role: 'ai',
            text: '👋 你好！我是世界杯 AI 助手 ⚽\n\n' +
                '我可以帮你：\n' +
                '• ⚽ 回答足球规则问题（越位、VAR等）\n' +
                (state.dbReady
                    ? '• ⭐ **查询球员资料**（梅西、姆巴佩等 1246 名球员）\n' +
                      '• 🏟️ **了解球队信息**（48 支参赛队阵容）\n' +
                      '• 🔮 **查看比赛预测**（蒙特卡洛模型数据）\n' +
                      '• 📊 **查询比赛结果**（已完赛场次比分）\n'
                    : '• 🔮 查看预测与夺冠分析\n') +
                '• 🏆 世界杯历史知识\n\n' +
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

    function formatText(text) {
        let html = text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\n/g, '<br>');
        return html;
    }

    function scrollToBottom() {
        setTimeout(() => chatMessages.scrollTop = chatMessages.scrollHeight, 50);
    }

    // ==================== 建议问题 ====================

    function getInitialSuggestions() {
        if (!state.dbReady) {
            return [
                { text: '越位是什么意思？', icon: '⚽' },
                { text: 'VAR 是什么？', icon: '🖥️' },
                { text: '2026 世界杯赛制', icon: '🏆' },
                { text: '中国队进过世界杯吗？', icon: '🇨🇳' }
            ];
        }
        return [
            { text: '越位是什么意思？', icon: '⚽' },
            { text: '梅西是谁？', icon: '⭐' },
            { text: '阿根廷队阵容', icon: '🇦🇷' },
            { text: '墨西哥 vs 南非预测', icon: '🔮' }
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
        addMessage({ role: 'user', text });

        const reply = await generateReply(text);
        addMessage({ role: 'ai', text: reply });

        setLoading(false);
        renderSuggestions(getUpdatedSuggestions());
        if (state.aiEnabled) updateDemoUI();
    }

    // ==================== 核心回复生成 ====================

    async function generateReply(query) {
        // 第一步：意图分类
        const intentResult = intentEngine.classify(query);

        // 问候
        if (intentResult.intent === IntentType.GREETING) {
            return getGreetingReply();
        }

        // 球员识别 → 引导
        if (intentResult.intent === IntentType.PLAYER_RECOGNITION) {
            return '📸 本 Demo 暂不支持图片识别。\n\n试试问这些：\n• ⚽ **越位规则** — 越位是什么意思？\n• ⭐ **球员查询** — 梅西是谁？\n• 🏟️ **球队查询** — 阿根廷队阵容？\n• 🔮 **比赛预测** — 墨西哥 vs 南非预测？';
        }

        // 第二步：FAQ 高置信度命中 → 本地秒回
        const faq = faqKnowledge.search(query);
        if (faq && faq.confidence >= 0.6) {
            const related = faq.relatedQuestions?.length
                ? '\n\n💡 相关问题：' + faq.relatedQuestions.join('、')
                : '';
            return `⚽ **${faq.question}**\n\n${faq.answer}${related}`;
        }

        // 第三步：数据库查询
        const dbReply = await getDatabaseReply(intentResult, query);
        if (dbReply) return dbReply;

        // 第四步：FAQ 低置信度 + AI 补充
        if (faq && faq.confidence >= 0.3) {
            return await getFaqWithAiSupplement(faq, query);
        }

        // 第五步：AI 模式兜底
        if (state.aiEnabled && aiClient.hasApiKey) {
            return await getAiReply(query);
        }

        // 第六步：纯 Demo 模式引导
        return getDemoFallback(intentResult);
    }

    // ==================== 数据库查询（核心新增功能） ====================

    async function getDatabaseReply(intent, query) {
        if (!state.dbReady) return null;

        switch (intent.intent) {
            case IntentType.PLAYER_INFO: {
                // 尝试从意图引擎提取的实体查询
                let playerName = intent.entities.player;
                if (!playerName) {
                    // 从查询文本中提取：去除"是谁/介绍/球员"等关键词
                    const cleaned = query.replace(/是谁|他是谁|介绍|球员|资料/g, '').trim();
                    playerName = cleaned;
                }
                if (!playerName) return null;

                const player = dataQuery.findPlayer(playerName);
                if (player) {
                    return `⭐ **${player.nameCn || player.name}** 球员资料\n\n${dataQuery.formatPlayerCard(player)}`;
                }

                // 模糊搜索
                const results = dataQuery.searchPlayers(playerName);
                if (results.length > 0) {
                    let reply = `👀 找到 **${results.length}** 个匹配结果：\n\n`;
                    for (const p of results.slice(0, 5)) {
                        reply += `• ${p.nameCn || p.name}（${p.position || '?'}，${p._teamName || '?'}）\n`;
                    }
                    if (results.length > 5) reply += `...以及另外 ${results.length - 5} 名球员\n`;
                    reply += '\n💡 输入完整姓名获取详细信息！';
                    return reply;
                }
                return null; // 没找到，交给 AI 或兜底
            }

            case IntentType.TEAM_INFO: {
                const teamName = intent.entities.team;
                if (!teamName) return null;

                const team = dataQuery.findTeam(teamName);
                if (!team) return null;

                let reply = `🏟️ **${team.nameCn || team.name}** 球队档案\n\n`;
                reply += dataQuery.formatTeamCard(team) + '\n\n';

                // 列出核心球员
                const players = dataQuery.getTeamPlayers(team.name);
                const gk = players.filter(p => p.position === 'GK').slice(0, 3);
                const df = players.filter(p => p.position === 'DF').slice(0, 4);
                const mf = players.filter(p => p.position === 'MF').slice(0, 4);
                const fw = players.filter(p => p.position === 'FW').slice(0, 4);

                if (gk.length > 0) reply += `🧤 **门将**：${gk.map(p => p.nameCn || p.name).join('、')}\n`;
                if (df.length > 0) reply += `🛡️ **后卫**：${df.map(p => p.nameCn || p.name).join('、')}\n`;
                if (mf.length > 0) reply += `🎯 **中场**：${mf.map(p => p.nameCn || p.name).join('、')}\n`;
                if (fw.length > 0) reply += `⚡ **前锋**：${fw.map(p => p.nameCn || p.name).join('、')}\n`;
                reply += `\n👥 共 ${players.length} 名球员`;

                // 相关比赛
                const matches = dataQuery.getTeamMatches(team.name).slice(0, 3);
                if (matches.length > 0) {
                    reply += '\n\n📋 **近期比赛**：\n';
                    for (const m of matches) {
                        reply += `• ${dataQuery.formatMatchCard(m)}\n`;
                    }
                }

                // 相关预测
                const preds = dataQuery.getTeamPredictions(team.name).slice(0, 1);
                if (preds.length > 0) {
                    reply += '\n🔮 **预测**：点我查看预测详情\n';
                }

                return reply;
            }

            case IntentType.MATCH_SCORE: {
                const teamName = intent.entities.team;
                if (!teamName) return null;

                const team = dataQuery.findTeam(teamName);
                if (!team) return null;

                const matches = dataQuery.getTeamMatches(team.name);

                // 筛选已完成和即将进行的
                const finished = matches.filter(m => m.status === 'FINISHED').slice(-3);
                const upcoming = matches.filter(m => m.status !== 'FINISHED').slice(0, 3);

                let reply = `📊 **${team.nameCn || team.name}** 比赛数据\n\n`;

                if (finished.length > 0) {
                    reply += '✅ **已完赛**：\n';
                    for (const m of finished) {
                        reply += `• ${dataQuery.formatMatchCard(m)}\n`;
                    }
                } else {
                    reply += '暂无已完赛记录\n';
                }

                if (upcoming.length > 0) {
                    reply += '\n📅 **即将进行**：\n';
                    for (const m of upcoming) {
                        reply += `• ${dataQuery.formatMatchCard(m)}\n`;
                    }
                }

                return reply;
            }

            case IntentType.SCHEDULE_QUERY: {
                const teamName = intent.entities.team;
                let matches = this._allMatchesSorted ? this._allMatchesSorted : (() => {
                    // 按日期排序所有比赛
                    const all = (Array.isArray(dataQuery.matches) ? dataQuery.matches : [])
                        .filter(m => m.status !== 'FINISHED')
                        .sort((a, b) => new Date(a.datetime || 0) - new Date(b.datetime || 0));
                    this._allMatchesSorted = all;
                    return all;
                })();

                if (teamName) {
                    const team = dataQuery.findTeam(teamName);
                    if (team) {
                        const teamMatches = dataQuery.getTeamMatches(team.name)
                            .filter(m => m.status !== 'FINISHED');
                        if (teamMatches.length > 0) {
                            let reply = `📅 **${team.nameCn || team.name}** 赛程\n\n`;
                            for (const m of teamMatches.slice(0, 5)) {
                                reply += `• ${dataQuery.formatMatchCard(m)}\n`;
                            }
                            return reply;
                        }
                    }
                }

                // 显示最近即将进行的 5 场比赛
                if (matches.length > 0) {
                    let reply = '📅 **即将到来的比赛**\n\n';
                    for (const m of matches.slice(0, 5)) {
                        reply += `• ${dataQuery.formatMatchCard(m)}\n`;
                    }
                    return reply;
                }
                return null;
            }

            case IntentType.PREDICTION_QUERY: {
                const teamName = intent.entities.team;

                if (teamName) {
                    const team = dataQuery.findTeam(teamName);
                    if (team) {
                        const preds = dataQuery.getTeamPredictions(team.name);
                        if (preds.length > 0) {
                            let reply = `🔮 **${team.nameCn || team.name}** 预测\n\n`;
                            for (const p of preds.slice(0, 3)) {
                                reply += dataQuery.formatPredictionCard(p) + '\n\n';
                            }
                            return reply;
                        }
                    }
                }

                // 通用预测展示
                const allPreds = dataQuery.predictions.slice(0, 5);
                if (allPreds.length > 0) {
                    let reply = '🔮 **蒙特卡洛模型预测**\n\n';
                    for (const p of allPreds) {
                        reply += dataQuery.formatPredictionCard(p) + '\n\n';
                    }
                    return reply;
                }
                return null;
            }

            default:
                return null;
        }
    }

    // ==================== 辅助回复 ====================

    function getGreetingReply() {
        const hour = new Date().getHours();
        const g = hour < 6 ? '🌙 夜深了' : hour < 12 ? '🌅 早上好' :
                   hour < 14 ? '☀️ 中午好' : hour < 18 ? '🌤️ 下午好' : '🌆 晚上好';

        let reply = `${g}！我是世界杯 AI 助手 ⚽\n\n`;
        if (state.dbReady) {
            reply += '我能帮你：\n' +
                '• ⚽ **足球规则** — 越位、VAR、红黄牌\n' +
                '• ⭐ **球员查询** — 梅西、姆巴佩等 1246 名球员\n' +
                '• 🏟️ **球队档案** — 48 支参赛队完整阵容\n' +
                '• 🔮 **比赛预测** — 蒙特卡洛模型分析\n' +
                '• 📊 **比赛结果** — 已完赛比分查询\n' +
                '• 🏆 **世界杯知识** — 历史、赛制、纪录';
        } else {
            reply += '我能帮你：\n' +
                '• ⚽ 足球规则问答\n' +
                '• 🏆 世界杯历史知识';
        }
        return reply + '\n\n试试上方的建议问题吧！👇';
    }

    async function getFaqWithAiSupplement(faq, query) {
        const base = `⚽ **${faq.question}**\n\n${faq.answer}`;
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
            } catch (_) {
                return base;
            }
        }
        return base;
    }

    async function getAiReply(query) {
        try {
            let dataContext = '';
            if (state.dbReady) {
                // 注入关键数据到上下文
                dataContext += '【已加载数据】\n';
                dataContext += `- 球员数：${Object.keys(dataQuery.playersByName).length} 人\n`;
                dataContext += `- 球队数：${dataQuery.teams.length} 队\n`;
                dataContext += `- 比赛数：${dataQuery.matches.length} 场\n`;
                dataContext += `- 预测数：${dataQuery.predictions.length} 条\n`;
            }

            const context = state.messages.slice(-8).map(m =>
                `[${m.role}] ${m.text.substring(0, 200)}`
            ).join('\n');

            return await aiClient.chat(query, context, dataContext);
        } catch (e) {
            if (e.message.includes('配额')) {
                return `⚠️ ${e.message}\n\n切换到 Demo 模式使用本地数据库回复。`;
            }
            return `⚠️ AI 暂时不可用（${e.message}）。\n\n本地数据库可查：\n• ⭐ 梅西、姆巴佩等 1246 名球员\n• 🏟️ 48 支球队完整阵容\n• 🔮 蒙特卡洛预测分析\n• 📊 比赛结果查询`;
        }
    }

    function getDemoFallback(intentResult) {
        const intent = intentResult.intent;

        // 数据库未就绪时的引导
        if (!state.dbReady) {
            if (intent === IntentType.MATCH_SCORE || intent === IntentType.SCHEDULE_QUERY) {
                return '📊 数据库未加载（file:// 协议限制）。\n\n请通过 GitHub Pages 部署，或打开本地服务器访问。';
            }
            if (intent === IntentType.PREDICTION_QUERY) {
                return '🔮 预测数据未加载。\n\n请通过 GitHub Pages 部署后使用。\n\n试试问：\n• ⚽ 越位规则\n• 🖥️ VAR 技术\n• 🏆 世界杯历史';
            }
            if (intent === IntentType.PLAYER_INFO || intent === IntentType.TEAM_INFO) {
                return '⭐ 球员/球队数据未加载。\n\n请通过 GitHub Pages 部署后使用。';
            }
        }

        if (intent === IntentType.MATCH_SCORE || intent === IntentType.SCHEDULE_QUERY) {
            return '📊 数据库已加载！试试输入球队名查询特定队伍的比赛。\n\n或者试用：\n• ⚽ **越位是什么意思？**\n• ⭐ **梅西是谁？**\n• 🏟️ **阿根廷队阵容**\n• 🔮 **墨西哥 vs 南非预测**';
        }
        if (intent === IntentType.PREDICTION_QUERY) {
            return '🔮 预测数据已加载！试试输入球队名查看预测。\n\n比如：\n• 墨西哥预测\n• 巴西 vs 法国分析';
        }
        if (intent === IntentType.PLAYER_INFO) {
            const player = intentResult.entities.player;
            if (player) return `⭐ **${player}** 可能是位球员！\n\n试试输入完整姓名查询。或者问：\n• ⚽ 越位是什么意思？\n• 🏟️ 阿根廷队有谁？`;
        }
        if (intent === IntentType.TEAM_INFO) {
            const team = intentResult.entities.team;
            if (team) return `🏟️ **${team}** 是 2026 世界杯参赛队！\n\n试试问 "**${team}阵容**" 查看球员列表。`;
        }
        return '🤔 试试这些吧：\n• ⚽ **越位是什么意思？**\n• ⭐ **梅西是谁？**（查球员）\n• 🏟️ **阿根廷队阵容**（查球队）\n• 🔮 **墨西哥 vs 南非预测**（查预测）\n• 📊 **墨西哥比赛结果**（查比赛）\n\n或切换到 AI 模式获取全面回答。';
    }

    // ==================== 建议问题动态更新 ====================

    function getUpdatedSuggestions() {
        const n = state.messages.length;
        if (n <= 3) {
            return state.dbReady ? [
                { text: '越位是什么意思？', icon: '⚽' },
                { text: '梅西是谁？', icon: '⭐' },
                { text: '阿根廷队阵容', icon: '🇦🇷' },
                { text: '墨西哥 vs 南非预测', icon: '🔮' }
            ] : [
                { text: '越位是什么意思？', icon: '⚽' },
                { text: 'VAR 是什么？', icon: '🖥️' },
                { text: '2026 世界杯赛制', icon: '🏆' },
                { text: '大力神杯的材质', icon: '🏟️' }
            ];
        }
        if (n <= 8) {
            return state.dbReady ? [
                { text: '姆巴佩是谁？', icon: '⭐' },
                { text: '巴西队阵容', icon: '🇧🇷' },
                { text: '法国队比赛结果', icon: '📊' },
                { text: '点球大战规则', icon: '⚽' }
            ] : [
                { text: '点球大战规则', icon: '⚽' },
                { text: '什么是帽子戏法？', icon: '🎩' },
                { text: '金靴奖怎么评？', icon: '🥇' },
                { text: '2026 场馆分布', icon: '🏟️' }
            ];
        }
        return state.dbReady ? [
            { text: '中国队阵容有哪些人？', icon: '🇨🇳' },
            { text: '夺冠热门预测', icon: '🏆' },
            { text: '转会费最贵的球员', icon: '💰' },
            { text: '英格兰队比赛', icon: '🏴󠁧󠁢󠁥󠁮󠁧󠁿' }
        ] : [
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
        userInput.placeholder = loading ? '思考中...' : '输入你的问题...';
        if (!loading) userInput.focus();
    }

    function updateDemoUI() {
        const isDemo = aiClient.isDemoMode;
        state.aiEnabled = !isDemo;

        if (isDemo) {
            demoIndicator.textContent = '🎯 Demo 模式';
            demoIndicator.className = 'badge badge-demo';
            statusBadge.textContent = state.dbReady ? '本地 FAQ + 数据库' : '本地 FAQ（0/∞）';
            toggleMode.textContent = '🔓 开启 AI';
        } else {
            const quota = aiClient.getRemainingQuota();
            demoIndicator.textContent = '🤖 AI 模式';
            demoIndicator.className = 'badge badge-ai';
            statusBadge.textContent = `LongCat AI（${quota}/${CONFIG.DAILY_API_QUOTA}）`;
            if (!aiClient.hasApiKey) statusBadge.textContent = '⚠️ 未配置 API Key';
        }
    }

    // ==================== 事件绑定 ====================

    sendBtn.addEventListener('click', handleSend);
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    });

    toggleMode.addEventListener('click', () => {
        const newMode = !aiClient.isDemoMode;
        aiClient.toggleDemoMode(newMode);

        if (!newMode) {
            addMessage({
                role: 'ai',
                text: `🤖 **AI 模式已开启！**\n\n由 **LongCat AI** 提供智能回答。\n数据库已就绪，球员/球队/比赛/预测均可查询！`
            });
        } else {
            addMessage({
                role: 'ai',
                text: '🎯 **已切换回 Demo 模式**\n\n使用本地 FAQ + 数据库回复，零 API 消耗。\n球员查询、球队阵容、比赛结果、预测分析均可用！'
            });
        }
        updateDemoUI();
    });

    document.addEventListener('DOMContentLoaded', init);

})();
