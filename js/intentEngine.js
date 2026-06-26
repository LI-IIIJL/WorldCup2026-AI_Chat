/**
 * ============================================
 *  意图识别引擎 — 从 Kotlin 移植
 * ============================================
 *
 * 通过关键词匹配将用户输入分类为 12 种意图，
 * 并提取实体（球队名、球员名）。
 * 与 Android 版 IntentEngine.kt 保持逻辑一致。
 */

// ==================== 定义 ====================

/** 意图类型（与 IntentType.kt 一致） */
const IntentType = {
    GREETING: 'GREETING',
    RULE_QUESTION: 'RULE_QUESTION',
    PLAYER_RECOGNITION: 'PLAYER_RECOGNITION',
    MATCH_SCORE: 'MATCH_SCORE',
    LINEUP_QUERY: 'LINEUP_QUERY',
    SCHEDULE_QUERY: 'SCHEDULE_QUERY',
    STANDINGS_QUERY: 'STANDINGS_QUERY',
    PREDICTION_QUERY: 'PREDICTION_QUERY',
    PLAYER_INFO: 'PLAYER_INFO',
    TEAM_INFO: 'TEAM_INFO',
    GENERAL_CHAT: 'GENERAL_CHAT',
    UNKNOWN: 'UNKNOWN'
};

/** 意图识别结果 */
class IntentResult {
    constructor(intent, confidence, entities = {}) {
        this.intent = intent;
        this.confidence = confidence;
        this.entities = entities;
    }
}

// ==================== 引擎 ====================

class IntentEngine {
    constructor() {
        this.playerNames = new Set();
        this.teamNames = new Set();
    }

    /** 注入球员名（用于实体提取） */
    addPlayerNames(names) {
        names.forEach(n => this.playerNames.add(n));
    }

    /** 注入球队名（用于实体提取） */
    addTeamNames(names) {
        names.forEach(n => this.teamNames.add(n));
    }

    /** 对用户输入进行意图分类 */
    classify(query) {
        const q = query.toLowerCase().trim();
        if (!q) return new IntentResult(IntentType.UNKNOWN, 0);

        // 按优先级依次匹配
        let result;
        result = this._detectGreeting(q); if (result) return result;
        result = this._detectPlayerRecognition(q); if (result) return result;
        result = this._detectMatchScore(q); if (result) return result;
        result = this._detectLineup(q); if (result) return result;
        result = this._detectStandings(q); if (result) return result;
        result = this._detectRule(q); if (result) return result;
        result = this._detectPrediction(q); if (result) return result;
        result = this._detectPlayerInfo(q); if (result) return result;
        result = this._detectTeamInfo(q); if (result) return result;
        result = this._detectSchedule(q); if (result) return result;

        return new IntentResult(IntentType.GENERAL_CHAT, 0.3);
    }

    // ==================== 各意图检测器 ====================

    _detectGreeting(q) {
        const patterns = ['你好', '您好', 'hi', 'hello', '嗨', 'hey',
            '在吗', '在不在', '早上好', '晚上好', '下午好',
            '你是谁', '你能做什么', '有什么功能'];
        for (const p of patterns) {
            if (q === p || q.startsWith(p)) {
                return new IntentResult(IntentType.GREETING, 0.9);
            }
        }
        return null;
    }

    _detectPlayerRecognition(q) {
        const patterns = ['识别', '截图', '照片', '图片', '拍照', '看看这是谁',
            '这个人是谁', '球员是谁', '上传', '扫描'];
        for (const p of patterns) {
            if (q.includes(p)) {
                return new IntentResult(IntentType.PLAYER_RECOGNITION, 0.85);
            }
        }
        return null;
    }

    _detectMatchScore(q) {
        const patterns = ['比分', '几比几', '多少比多少', '赢了', '输了', '平了', '战平'];
        const hasScorePattern = /\d+\s*[-:：]\s*\d+/.test(q);
        for (const p of patterns) {
            if (q.includes(p) || hasScorePattern) {
                const entities = this._extractTeamNames(q);
                return new IntentResult(IntentType.MATCH_SCORE,
                    hasScorePattern ? 0.95 : 0.8, entities);
            }
        }
        if (q.includes('比赛怎么样') || q.includes('踢得怎么样')) {
            const entities = this._extractTeamNames(q);
            return new IntentResult(IntentType.MATCH_SCORE, 0.6, entities);
        }
        return null;
    }

    _detectLineup(q) {
        const patterns = ['首发', '阵容', '谁在场上', '出场', '名单', '排兵布阵'];
        for (const p of patterns) {
            if (q.includes(p)) {
                return new IntentResult(IntentType.LINEUP_QUERY, 0.85,
                    this._extractTeamNames(q));
            }
        }
        return null;
    }

    _detectSchedule(q) {
        const patterns = ['赛程', '赛程表', '比赛安排', '几点', '什么时间', '哪天', '什么时候'];
        for (const p of patterns) {
            if (q.includes(p)) {
                return new IntentResult(IntentType.SCHEDULE_QUERY, 0.8,
                    this._extractTeamNames(q));
            }
        }
        if ((q.includes('今天') || q.includes('明天') || q.includes('后天')) &&
            q.includes('比赛')) {
            return new IntentResult(IntentType.SCHEDULE_QUERY, 0.85,
                this._extractTeamNames(q));
        }
        return null;
    }

    _detectStandings(q) {
        const patterns = ['积分榜', '排名', '积分', '小组排名', '小组积分', '排第几'];
        for (const p of patterns) {
            if (q.includes(p)) {
                return new IntentResult(IntentType.STANDINGS_QUERY, 0.85,
                    this._extractTeamNames(q));
            }
        }
        return null;
    }

    _detectRule(q) {
        const patterns = ['越位', '手球', '点球', '红牌', '黄牌', '犯规', '换人',
            '角球', '任意球', '界外球', '球门球', '补时', '加时',
            'var', '视频回放', '规则', '是什么意思', '怎么算',
            '金球', '银球', '帽子戏法', '德比'];
        for (const p of patterns) {
            if (q.includes(p)) {
                return new IntentResult(IntentType.RULE_QUESTION, 0.9);
            }
        }
        return null;
    }

    _detectPrediction(q) {
        const patterns = ['预测', '胜率', '谁赢', '谁会赢', '夺冠', '冠军',
            '胜负', '稳赢', '赔率', '概率'];
        for (const p of patterns) {
            if (q.includes(p)) {
                return new IntentResult(IntentType.PREDICTION_QUERY, 0.85,
                    this._extractTeamNames(q));
            }
        }
        return null;
    }

    _detectPlayerInfo(q) {
        const patterns = ['是谁', '他是谁', '介绍', '球员'];
        for (const p of patterns) {
            if (q.includes(p)) {
                const entities = this._extractPlayerName(q);
                if (Object.keys(entities).length > 0) {
                    return new IntentResult(IntentType.PLAYER_INFO, 0.8, entities);
                }
            }
        }
        return null;
    }

    _detectTeamInfo(q) {
        const patterns = ['介绍', '球队', '资料', '关于', '实力'];
        const teamNamesHint = this._extractTeamNames(q);
        for (const p of patterns) {
            if (q.includes(p) && Object.keys(teamNamesHint).length > 0) {
                return new IntentResult(IntentType.TEAM_INFO, 0.8, teamNamesHint);
            }
        }
        if (Object.keys(teamNamesHint).length > 0 && q.includes('队')) {
            return new IntentResult(IntentType.TEAM_INFO, 0.7, teamNamesHint);
        }
        return null;
    }

    // ==================== 实体提取 ====================

    _extractTeamNames(q) {
        // 先尝试静态关键词
        const teams = ['阿根廷', '巴西', '法国', '德国', '意大利', '西班牙', '葡萄牙',
            '英格兰', '荷兰', '比利时', '克罗地亚', '乌拉圭', '墨西哥',
            '日本', '韩国', '沙特', '伊朗', '澳大利亚', '摩洛哥', '塞内加尔',
            '加纳', '喀麦隆', '尼日利亚', '美国', '加拿大', '哥斯达黎加',
            '中国', '瑞士', '波兰', '丹麦', '瑞典', '土耳其'];
        for (const team of teams) {
            if (q.includes(team)) return { team };
        }
        // 再尝试注入的完整球队名（英文）
        for (const team of this.teamNames) {
            const t = team.toLowerCase();
            if (q.includes(t) || t.includes(q)) {
                return { team: team };
            }
        }
        return {};
    }

    _extractPlayerName(q) {
        const players = ['梅西', 'c罗', 'C罗', '姆巴佩', '内马尔', '凯恩',
            '德布劳内', '萨拉赫', '莱万', '本泽马', '莫德里奇',
            '贝林厄姆', '维尼修斯', '哈兰德', '萨卡', '福登'];
        for (const player of players) {
            if (q.includes(player)) return { player };
        }
        // 再尝试注入的完整球员名
        for (const player of this.playerNames) {
            const p = player.toLowerCase();
            if (q.includes(p) || p.includes(q)) {
                return { player: player };
            }
        }
        return {};
    }
}
