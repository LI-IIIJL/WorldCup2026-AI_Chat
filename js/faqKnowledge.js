/**
 * ============================================
 *  FAQ 知识库匹配引擎 — 从 Kotlin 移植
 * ============================================
 *
 * 包含 30+ 条预置足球知识，通过关键词匹配回复。
 * 与 Android 版 FaqKnowledge.kt 保持逻辑一致。
 */

// ==================== FAQ 知识库数据 ====================
// （嵌入 JS 而非外部 JSON，避免 file:// 协议下的 CORS 问题）

const FAQ_DATA = [
  {
    "id": "offside_01", "category": "规则解释",
    "keywords": ["越位", "什么是越位", "越位规则", "offside"],
    "question": "什么是越位？",
    "answer": "**越位**是足球比赛中最核心的进攻规则之一。\n\n**判定条件**（三条需同时满足）：\n1️⃣ 进攻球员在**对方半场**\n2️⃣ 该球员比**球**和**倒数第二名防守球员**更靠近对方底线\n3️⃣ 在队友传球的瞬间，该球员**参与了进攻**\n\n**不构成越位的情况**：\n- 在本方半场\n- 与倒数第二名防守球员平行\n- 界外球、角球、球门球直接传入\n\n💡 **VAR 时代**：如今越位判定会由 VAR 通过划线技术精确到厘米级别。",
    "relatedQuestions": ["var_01"]
  },
  {
    "id": "var_01", "category": "规则解释",
    "keywords": ["VAR", "视频助理裁判", "视频回放", "var"],
    "question": "VAR 是什么？如何工作？",
    "answer": "**VAR（Video Assistant Referee，视频助理裁判）** 是 2018 年世界杯首次引入的技术系统。\n\n**检查范围**：\n⚽ **进球** — 进攻方是否犯规、越位、出界\n⚽ **点球** — 判罚是否正确\n⚽ **直接红牌** — 是否过度严厉\n⚽ **身份错误** — 给牌给错人\n\n**流程**：\n1. 主裁做出判罚\n2. VAR 团队在视频回放室分析\n3. 如需改判 → 主裁到场边回看监视器\n4. 最终决定权**始终在主裁**手中\n\n2022 世界杯还引入了 **半自动越位技术**（SAOT）。",
    "relatedQuestions": ["offside_01"]
  },
  {
    "id": "red_card_01", "category": "规则解释",
    "keywords": ["红牌", "罚下", "直接红牌", "两黄变一红"],
    "question": "什么情况会被罚红牌？",
    "answer": "红牌意味着该球员**立即离场**，球队**少一人作战**（不能补人）。\n\n**直接红牌**：\n🔴 严重铲球、暴力行为、故意手球破坏进球机会、侮辱性语言\n\n**两黄变一红**：同一球员累积 **2 张黄牌** 也会变成红牌。\n\n**惩罚**：停赛至少 1 场。",
    "relatedQuestions": ["yellow_card_01"]
  },
  {
    "id": "yellow_card_01", "category": "规则解释",
    "keywords": ["黄牌", "警告", "吃牌"],
    "question": "什么情况会被出示黄牌？",
    "answer": "黄牌是裁判对球员的**正式警告**。\n\n**常见原因**：\n🟡 鲁莽犯规、故意手球、拖延时间\n🟡 不满判罚抗议、假摔\n🟡 未保持 9.15 米距离\n\n**累积规则**：一场 2 张黄牌 → 红牌罚下；杯赛累积 2 张停赛 1 场。",
    "relatedQuestions": ["red_card_01"]
  },
  {
    "id": "penalty_01", "category": "规则解释",
    "keywords": ["点球", "罚球点球", "12码", "点球规则"],
    "question": "什么情况下判点球？",
    "answer": "防守方**在本方罚球区（禁区）内**犯规，裁判将判罚点球。\n\n**常见判罚**：\n⚽ 铲人/踢人/绊人、拉人/推人\n⚽ 故意手球（手臂超出身体自然轮廓）\n⚽ 冲撞守门员\n\n点球点距球门 **11 米（12 码）**，门将须至少一只脚踩在门线上。",
    "relatedQuestions": ["penalty_shootout_01", "handball_01"]
  },
  {
    "id": "penalty_shootout_01", "category": "规则解释",
    "keywords": ["点球大战", "互射点球", "点球决胜"],
    "question": "点球大战的规则是什么？",
    "answer": "淘汰赛**加时赛后仍平局**时的决胜方式。\n\n**流程**：\n1️⃣ 各选 **5 名球员**轮流主罚\n2️⃣ 硬币决定先罚后罚\n3️⃣ 5 轮后领先者胜，平局→**突然死亡**\n\n📊 先罚球队胜率约 **60%**。",
    "relatedQuestions": ["penalty_01"]
  },
  {
    "id": "free_kick_01", "category": "规则解释",
    "keywords": ["任意球", "直接任意球", "间接任意球"],
    "question": "直接任意球和间接任意球的区别？",
    "answer": "**直接任意球**：可直接射门得分（踢人、拉人、手球等犯规）。\n\n**间接任意球**：触及其他球员前不能直接得分（危险动作、阻挡门将等）。\n\n人墙距离至少 **9.15 米**。",
    "relatedQuestions": ["penalty_01", "corner_kick_01"]
  },
  {
    "id": "corner_kick_01", "category": "规则解释",
    "keywords": ["角球", "角球规则", "corner"],
    "question": "什么情况下判角球？",
    "answer": "防守方最后触碰球使球**整体越过球门线**（未进球）时，判**角球**给进攻方。\n\n- 球放在**角球弧**内\n- 防守球员距球 9.15 米以上\n- 可直接射门得分\n- 角球**没有越位**",
    "relatedQuestions": ["free_kick_01"]
  },
  {
    "id": "handball_01", "category": "规则解释",
    "keywords": ["手球", "手球犯规", "故意手球"],
    "question": "什么情况算手球犯规？",
    "answer": "**犯规**：\n🔴 故意用手/手臂触球\n🔴 手臂超出**身体自然轮廓**\n🔴 手球后直接进球或创造机会\n\n**不犯规**：\n✅ 手臂**自然垂放贴近身体**\n✅ 球从其他身体部位弹到手\n✅ 支撑倒地（不扩大防守面积）",
    "relatedQuestions": ["penalty_01"]
  },
  {
    "id": "substitution_01", "category": "规则解释",
    "keywords": ["换人", "替补", "换人规则"],
    "question": "世界杯每场比赛可以换几个人？",
    "answer": "**每场最多换 5 人**，分**最多 3 次换人窗口**。\n\n**演变**：\n- 1998 前：2 人 | 1998-2020：3 人 | 2020 后：5 人\n\n加时赛可额外换 **1 人**。每队报名 **26 人**（2026 新规）。",
    "relatedQuestions": ["worldcup_format_01"]
  },
  {
    "id": "injury_time_01", "category": "规则解释",
    "keywords": ["补时", "伤停补时", "加时"],
    "question": "伤停补时怎么算？",
    "answer": "用于弥补比赛中断的时间。\n\n**计入**：换人、受伤处理、进球庆祝、VAR 检查、拖延时间\n\n**2022 新规**：更精确计量，有的半场超过 10 分钟。",
    "relatedQuestions": ["extra_time_01"]
  },
  {
    "id": "extra_time_01", "category": "规则解释",
    "keywords": ["加时赛", "加时规则", "30分钟"],
    "question": "加时赛规则是什么？",
    "answer": "淘汰赛 90 分钟打平后，进入 **30 分钟加时赛**（上下半场各 15 分钟）。\n\n- 可额外使用一次换人窗口\n- 仍打平 → **点球大战**",
    "relatedQuestions": ["penalty_shootout_01"]
  },
  {
    "id": "worldcup_format_01", "category": "赛事赛制",
    "keywords": ["世界杯赛制", "小组赛", "淘汰赛", "2026赛制"],
    "question": "2026 世界杯的赛制是什么？",
    "answer": "2026 年美加墨世界杯首次扩军至 **48 支球队**。\n\n**小组赛**：\n- **12 个小组**，每组 **4 队**\n- 每组前 **2 名**（24 队）直接出线\n- **8 个成绩最好的小组第三名** 也出线\n- 共 **32 队** 进淘汰赛\n\n**淘汰赛**：1/16 → 1/8 → 1/4 → 半决赛 → 三四名决赛 → 决赛",
    "relatedQuestions": ["worldcup_history_01", "worldcup_qualify_01"]
  },
  {
    "id": "worldcup_history_01", "category": "世界杯历史",
    "keywords": ["世界杯历史", "世界杯起源", "第一届世界杯"],
    "question": "世界杯的历史是怎样的？",
    "answer": "**里程碑**：\n🏆 1930 — 首届在乌拉圭，13 队参赛\n🏆 1998 — 扩军至 32 队\n🏆 2002 — 首次在亚洲（韩日）\n🏆 2018 — 引入 VAR\n🏆 2022 — 卡塔尔，梅西率阿根廷夺冠\n🏆 2026 — 扩军至 48 队，美加墨三国联办\n\n**夺冠次数**：巴西 5 次 > 德国/意大利 4 次 > 阿根廷 3 次",
    "relatedQuestions": ["worldcup_format_01", "worldcup_2026_host_01"]
  },
  {
    "id": "worldcup_qualify_01", "category": "赛事赛制",
    "keywords": ["世界杯预选赛", "预选赛", "出线规则"],
    "question": "世界杯预选赛是怎么打的？",
    "answer": "各大洲分配名额角逐决赛圈席位。\n\n**2026 名额**：\n🌍 欧洲 16 席 | 非洲 9 席 | 亚洲 8 席\n🌍 南美 6 席 | 中北美 6 席 | 大洋洲 1 席 | 附加赛 2 席",
    "relatedQuestions": ["worldcup_format_01"]
  },
  {
    "id": "golden_boot_01", "category": "技术统计",
    "keywords": ["金靴", "最佳射手", "射手榜"],
    "question": "金靴奖是怎么评的？",
    "answer": "**金靴奖**颁发给每届世界杯**进球最多**的球员。\n\n**历史金靴**：\n🥇 2022 — 姆巴佩 **8 球**\n🥇 2018 — 凯恩 **6 球**\n🥇 1958 — 方丹 **13 球**（历史最高）\n\n**金球奖**是最佳球员，和金靴不同。",
    "relatedQuestions": ["golden_glove_01"]
  },
  {
    "id": "golden_glove_01", "category": "技术统计",
    "keywords": ["金手套", "最佳门将", "雅辛奖"],
    "question": "金手套奖是怎么评的？",
    "answer": "颁发给每届世界杯**最佳门将**。\n\n**评选依据**：零封场次、扑救成功率、关键扑救。\n\n🥇 2022 — 埃米利亚诺·马丁内斯\n🥇 2018 — 库尔图瓦\n🥇 2014 — 诺伊尔",
    "relatedQuestions": ["golden_boot_01"]
  },
  {
    "id": "worldcup_groups_01", "category": "赛事赛制",
    "keywords": ["小组出线", "小组排名", "积分规则", "同分怎么算"],
    "question": "小组赛同分怎么决定出线？",
    "answer": "排序顺序：\n1️⃣ **积分**（胜 3 平 1 负 0）\n2️⃣ **净胜球**\n3️⃣ **进球数**\n4️⃣ **相互战绩**\n5️⃣ **相互净胜球**\n6️⃣ **相互进球数**\n7️⃣ **公平竞赛积分**\n8️⃣ **抽签**\n\n8 个成绩最好的小组第三名也可出线。",
    "relatedQuestions": ["worldcup_format_01"]
  },
  {
    "id": "formation_01", "category": "球队知识",
    "keywords": ["阵型", "足球阵型", "4-4-2", "4-3-3", "3-5-2"],
    "question": "常见足球阵型有哪些？",
    "answer": "**4-3-3**（最流行）— 边锋拉宽度，中场三角控制\n**4-2-3-1**（攻守平衡）— 双后腰保护，单箭头突前\n**3-4-3**（三后卫）— 翼卫攻防转换关键\n**4-4-2**（经典）— 双前锋\n**5-3-2**（防反）— 铁桶阵+快速反击",
    "relatedQuestions": ["team_roles_01"]
  },
  {
    "id": "team_roles_01", "category": "球队知识",
    "keywords": ["位置", "足球位置", "前锋", "中场", "后卫", "门将"],
    "question": "足球场上各位置负责什么？",
    "answer": "⚽ **门将** — 最后防线，禁区内可用手\n🛡️ **后卫** — 中后卫（中路防守）、边后卫（边路+助攻）、翼卫\n🎯 **中场** — 后腰（拦截）、中前卫（攻防转换）、前腰（组织）\n⚡ **前锋** — 边锋（突破内切）、中锋（禁区得分）",
    "relatedQuestions": ["formation_01"]
  },
  {
    "id": "legend_players_01", "category": "球队知识",
    "keywords": ["梅西", "C罗", "姆巴佩", "内马尔", "传奇球员"],
    "question": "当今足坛最著名的球员有哪些？",
    "answer": "**梅西** 🇦🇷 — 2022 冠军+金球，8 次金球奖（历史最多）\n**C 罗** 🇵🇹 — 5 次金球奖，连续 6 届世界杯（2006-2026）\n**姆巴佩** 🇫🇷 — 2018 冠军，2022 决赛帽子戏法\n\n⚽ 2026 是 **老将谢幕+新星崛起** 的一届！",
    "relatedQuestions": ["golden_boot_01"]
  },
  {
    "id": "worldcup_2026_host_01", "category": "世界杯历史",
    "keywords": ["2026世界杯", "美加墨世界杯", "2026美加墨"],
    "question": "2026 世界杯有什么特别之处？",
    "answer": "由**美加墨**三国联合举办，创多项历史。\n\n- 首次 3 国联办 | 首次 48 队 | 104 场创纪录\n- 新增 **1/16 决赛** 轮次\n- 6 月 11 日开幕 → 7 月 19 日决赛\n\n场馆：美国 11 座 + 加拿大 2 座 + 墨西哥 3 座",
    "relatedQuestions": ["worldcup_format_01"]
  },
  {
    "id": "china_football_01", "category": "球队知识",
    "keywords": ["中国足球", "中国队", "国足", "中国男足"],
    "question": "中国队进过世界杯吗？",
    "answer": "中国男足只进过 **1 次** — **2002 年韩日世界杯**（0 胜 3 负，进 0 球失 9 球）。\n\n之后连续 5 届未能出线。\n\n**2026 年**：中国队正在 18 强赛中奋战，新赛制下是最好的出线机会之一！",
    "relatedQuestions": ["worldcup_qualify_01"]
  },
  {
    "id": "worldcup_trophy_01", "category": "世界杯历史",
    "keywords": ["大力神杯", "世界杯奖杯", "雷米特杯"],
    "question": "大力神杯是什么样的？",
    "answer": "**大力神杯**（FIFA World Cup Trophy）1974 年起使用。\n\n**规格**：高 36.8cm，重 6.175kg，18K 金实心材质，底座孔雀石。\n\n冠军获得**复制品**（真品由 FIFA 保管）。",
    "relatedQuestions": ["worldcup_history_01"]
  },
  {
    "id": "stadium_01", "category": "世界杯历史",
    "keywords": ["世界杯场馆", "球场", "办赛场馆"],
    "question": "世界杯有哪些著名球场？",
    "answer": "**2022 卡塔尔**：卢赛尔地标体育场（决赛场地）\n\n**2026 主要场馆**：\n🇺🇸 大都会体育场（纽约，决赛地 82,500 席）\n🇺🇸 玫瑰碗（洛杉矶）\n🇺🇸 AT&T 体育场（达拉斯，可容 10.5 万）\n🇲🇽 阿兹台克体育场（唯一两届决赛场地）",
    "relatedQuestions": ["worldcup_2026_host_01"]
  },
  {
    "id": "fifa_ranking_01", "category": "技术统计",
    "keywords": ["FIFA排名", "世界排名", "国家队排名"],
    "question": "FIFA 世界排名怎么算？",
    "answer": "基于 **ELO 评分系统**，每月更新。\n\n**关键因素**：比赛重要性、对手强弱、地区系数、净胜球差。\n\n**当前前列**（2026.6）：阿根廷 > 法国 > 巴西 > 英格兰 > 比利时",
    "relatedQuestions": ["worldcup_format_01"]
  },
  {
    "id": "hat_trick_01", "category": "技术统计",
    "keywords": ["帽子戏法", "单场三球", "大四喜"],
    "question": "帽子戏法是什么？",
    "answer": "一名球员**同一场进 3 球**。\n\n**世界杯经典**：\n🎩 2022 决赛 — 姆巴佩\n🎩 1966 决赛 — 赫斯特（唯一决赛帽子戏法）\n🎩 2002 — 克洛泽 vs 沙特（头球帽子戏法）",
    "relatedQuestions": ["golden_boot_01"]
  },
  {
    "id": "var_technology_01", "category": "技术统计",
    "keywords": ["半自动越位", "SAOT", "电子越位"],
    "question": "半自动越位技术（SAOT）是什么？",
    "answer": "2022 世界杯首次使用的黑科技。\n\n**原理**：12 台跟踪摄像头追踪 29 个身体数据点 + 球内传感器 + AI 自动判断。\n\n**效果**：判定从 70 秒 → **约 20 秒**，厘米级精度。\n\n是否参与进攻仍需人工判断。",
    "relatedQuestions": ["var_01", "offside_01"]
  },
  {
    "id": "transfer_fee_01", "category": "球队知识",
    "keywords": ["转会费", "转会纪录", "最贵球员"],
    "question": "足坛转会费最贵的球员？",
    "answer": "🥇 内马尔 — €2.22 亿（2017）\n🥈 姆巴佩 — €1.8 亿（2018）\n🥉 贝林厄姆 — €1.34 亿（2023）\n\n转会费给**出售方俱乐部**，球员拿工资+签字费。",
    "relatedQuestions": ["legend_players_01"]
  }
];

// ==================== FAQ 引擎 ====================

class FaqKnowledge {
    constructor() {
        this.allEntries = FAQ_DATA;
        this.isLoaded = true;
    }

    /** 无需异步加载，数据已在 FAQ_DATA 中 */
    async ensureLoaded() {
        // 数据已内嵌，无需额外加载
    }

    /** 搜索匹配的 FAQ 条目 */
    search(query) {
        if (!this.allEntries || this.allEntries.length === 0) return null;
        const q = query.toLowerCase().trim();
        let bestEntry = null;
        let bestScore = 0;
        const threshold = 0.3;

        for (const entry of this.allEntries) {
            const score = this._calculateMatchScore(q, entry);
            if (score > bestScore) {
                bestScore = score;
                bestEntry = { ...entry, confidence: score };
            }
        }

        return bestScore >= threshold ? bestEntry : null;
    }

    /**
     * 计算匹配分数（0.0 ~ 1.0）
     * 算法与 Kotlin 版 FaqKnowledge.calculateMatchScore 一致
     */
    _calculateMatchScore(query, entry) {
        let score = 0;

        // 1. 关键词匹配
        for (const keyword of entry.keywords) {
            const kw = keyword.toLowerCase();
            if (query === kw) {
                score += 1.0;
            } else if (query.includes(kw)) {
                score += 0.6;
            } else if (kw.includes(query)) {
                score += 0.3;
            } else {
                // Jaccard 相似度（字符级）
                const kwChars = new Set(kw);
                const queryChars = new Set(query);
                let intersection = 0;
                for (const c of kwChars) {
                    if (queryChars.has(c)) intersection++;
                }
                const union = new Set([...kwChars, ...queryChars]).size;
                if (union > 0) {
                    const jaccard = intersection / union;
                    if (jaccard > 0.5) score += 0.2;
                }
            }
        }

        // 2. 问题文本匹配
        const entryQ = entry.question.toLowerCase();
        const qChars = new Set(query);
        const eqChars = new Set(entryQ);
        let common = 0;
        for (const c of qChars) {
            if (eqChars.has(c)) common++;
        }
        const textSimilarity = common / Math.max(query.length, entryQ.length, 1);
        if (textSimilarity > 0.6) {
            score += 0.2;
        }

        // 3. 短查询权重加成
        if (query.length <= 4 && score > 0) {
            score *= 1.3;
        }

        return score;
    }
}
