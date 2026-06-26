/**
 * ============================================
 *  数据库查询引擎 — 球员/球队/比赛/预测
 * ============================================
 *
 * 加载本地 JSON 数据文件，提供搜索查询能力。
 * 所有数据均为静态快照，不调用任何外部 API。
 */

class DataQuery {
    constructor() {
        this.playersByTeam = {};    // teamName -> player[]
        this.playersById = {};      // api_sports_id -> player
        this.playersByName = {};    // name_lower -> player
        this.teams = [];            // team[]
        this.teamsById = {};        // teamId -> team
        this.teamsByFifaCode = {};
        this.matches = [];
        this.predictions = [];
        this.stadiums = [];
        this.matchesByTeam = {};
        this.predictionsByTeam = {};
        this.isLoaded = false;
        this._loadPromise = null;
    }

    /** 加载全部数据 */
    async ensureLoaded() {
        if (this.isLoaded) return;
        if (this._loadPromise) return this._loadPromise;

        this._loadPromise = this._loadAll();
        return this._loadPromise;
    }

    async _loadAll() {
        try {
            // 并行加载所有数据
            const [playersRaw, teamsRaw, matchesRaw, predsRaw, stadiumsRaw] = await Promise.all([
                this._fetchJSON('data/players_2026.json'),
                this._fetchJSON('data/teams.json'),
                this._fetchJSON('data/matches.json'),
                this._fetchJSON('data/predictions.json'),
                this._fetchJSON('data/bdl_stadiums.json')
            ]);

            this._indexPlayers(playersRaw);
            this._indexTeams(teamsRaw);
            this._indexMatches(matchesRaw);
            this._indexPredictions(predsRaw);
            this._indexStadiums(stadiumsRaw);

            this.isLoaded = true;
            console.log(`✅ 数据库加载完成: ${Object.keys(this.playersByName).length} 球员, ${this.teams.length} 球队, ${this.matches.length} 比赛, ${this.predictions.length} 预测`);
        } catch (e) {
            console.warn('⚠️ 数据库加载失败（file:// 协议下不支持 fetch JSON）:', e.message);
            this.isLoaded = false;
        }
    }

    async _fetchJSON(path) {
        const resp = await fetch(path);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}: ${path}`);
        return await resp.json();
    }

    // ==================== 索引 ====================

    _indexPlayers(data) {
        // 按球队分组
        for (const team of (data.teams || [])) {
            const teamName = team.name;
            this.playersByTeam[teamName.toLowerCase()] = [];
            this.playersByTeam[team.name] = [];  // preserve case

            for (const player of (team.players || [])) {
                // 球员 ID 索引
                if (player.api_sports_id) {
                    this.playersById[player.api_sports_id] = player;
                }
                // 球员名索引（英文 + 中文）
                const nameLower = (player.name || '').toLowerCase();
                this.playersByName[nameLower] = player;
                this.playersByName[nameLower] = player;

                // 中文名索引
                if (player.nameCn) {
                    this.playersByName[player.nameCn] = player;
                }

                // 记录所属球队
                player._teamName = team.name;
                player._teamNameCn = team.nameCn || team.name;

                this.playersByTeam[teamName.toLowerCase()].push(player);
            }
            this.playersByTeam[teamName.toLowerCase()].sort((a, b) => (a.jerseyNumber || 99) - (b.jerseyNumber || 99));
        }
    }

    _indexTeams(teams) {
        this.teams = teams;
        for (const team of teams) {
            this.teamsById[team.id] = team;
            this.teamsByFifaCode[team.fifaCode?.toLowerCase()] = team;
            this.teamsByFifaCode[team.iso2?.toLowerCase()] = team;
        }
    }

    _indexMatches(matches) {
        this.matches = Array.isArray(matches) ? matches : (matches.matches || matches.data || []);
        // 按球队索引
        for (const m of this.matches) {
            const home = (m.homeTeam || '').toLowerCase();
            const away = (m.awayTeam || '').toLowerCase();
            if (!this.matchesByTeam[home]) this.matchesByTeam[home] = [];
            if (!this.matchesByTeam[away]) this.matchesByTeam[away] = [];
            this.matchesByTeam[home].push(m);
            this.matchesByTeam[away].push(m);
        }
    }

    _indexPredictions(preds) {
        const list = preds.predictions || preds;
        this.predictions = Array.isArray(list) ? list : [];
        for (const p of this.predictions) {
            const a = (p.teamA?.name || '').toLowerCase();
            const b = (p.teamB?.name || '').toLowerCase();
            if (!this.predictionsByTeam[a]) this.predictionsByTeam[a] = [];
            if (!this.predictionsByTeam[b]) this.predictionsByTeam[b] = [];
            this.predictionsByTeam[a].push(p);
            this.predictionsByTeam[b].push(p);
        }
    }

    _indexStadiums(stadiums) {
        this.stadiums = Array.isArray(stadiums) ? stadiums : [];
    }

    // ==================== 查询方法 ====================

    /** 查找球员（英文名或中文名） */
    findPlayer(query) {
        const q = query.toLowerCase().trim();
        // 精确匹配
        if (this.playersByName[q]) return this.playersByName[q];

        // 模糊匹配（名字包含查询词）
        for (const [name, player] of Object.entries(this.playersByName)) {
            if (name.includes(q)) return player;
        }

        // 中文名包含
        for (const [name, player] of Object.entries(this.playersByName)) {
            if (q.includes(name)) return player;
        }

        return null;
    }

    /** 搜索球员（返回所有匹配结果） */
    searchPlayers(query) {
        const q = query.toLowerCase().trim();
        const results = [];

        for (const [name, player] of Object.entries(this.playersByName)) {
            if (name.includes(q)) {
                // 去重
                if (!results.some(r => r.api_sports_id === player.api_sports_id && r.name === player.name)) {
                    results.push(player);
                }
            }
        }

        // 按相关性排序
        return results.sort((a, b) => {
            const aName = (a.name || '').toLowerCase();
            const bName = (b.name || '').toLowerCase();
            const aExact = aName === q ? 2 : aName.includes(q) ? 1 : 0;
            const bExact = bName === q ? 2 : bName.includes(q) ? 1 : 0;
            return bExact - aExact;
        }).slice(0, 10);
    }

    /** 查找球队 */
    findTeam(query) {
        const q = query.toLowerCase().trim();

        // 按英/中文名匹配
        for (const team of this.teams) {
            if ((team.name || '').toLowerCase() === q ||
                (team.nameCn || '').toLowerCase() === q) return team;
            if ((team.name || '').toLowerCase().includes(q) ||
                (team.nameCn || '').toLowerCase().includes(q)) return team;
        }

        // 按 FIFA 代码
        if (this.teamsByFifaCode[q]) return this.teamsByFifaCode[q];

        return null;
    }

    /** 获取球队全部球员 */
    getTeamPlayers(teamName) {
        const q = teamName.toLowerCase().trim();
        return this.playersByTeam[q] || [];
    }

    /** 获取球队比赛 */
    getTeamMatches(teamName) {
        const q = teamName.toLowerCase().trim();
        return (this.matchesByTeam[q] || []).sort((a, b) => {
            return (new Date(a.datetime || 0)) - (new Date(b.datetime || 0));
        });
    }

    /** 获取球队预测 */
    getTeamPredictions(teamName) {
        const q = teamName.toLowerCase().trim();
        return this.predictionsByTeam[q] || [];
    }

    /** 按位置筛选球员 */
    getPlayersByPosition(teamName, position) {
        const players = this.getTeamPlayers(teamName);
        if (!position) return players;
        return players.filter(p => (p.position || '').toUpperCase() === position.toUpperCase());
    }

    /** 格式化球员信息为文本 */
    formatPlayerCard(player) {
        const posMap = { 'GK': '门将', 'DF': '后卫', 'MF': '中场', 'FW': '前锋' };
        const pos = posMap[player.position] || player.position || '未知';
        const teamInfo = player._teamName ? ` ${player._teamName}` : '';

        return `**${player.nameCn || player.name}**${player.nameCn ? `（${player.name}）` : ''}
┌ 位置：${pos} | 号码：${player.jerseyNumber || '?'}
├ 俱乐部：${player.club || '未知'}${player.market_value_mil != null ? ` | 身价：€${player.market_value_mil}M` : ''}
└ 球队：${teamInfo}`;
    }

    /** 格式化球队信息为文本 */
    formatTeamCard(team) {
        const players = this.getTeamPlayers(team.name);
        const gk = players.filter(p => p.position === 'GK').length;
        const df = players.filter(p => p.position === 'DF').length;
        const mf = players.filter(p => p.position === 'MF').length;
        const fw = players.filter(p => p.position === 'FW').length;
        const stars = players.filter(p => p.market_value_mil != null && p.market_value_mil >= 30);

        return `**${team.nameCn || team.name}**（${team.name}）
🏆 FIFA 代码：${team.fifaCode} | 小组：${team.group}
👥 阵容：${players.length} 人（GK ${gk} / DF ${df} / MF ${mf} / FW ${fw}）
⭐ 球星：${stars.map(s => s.nameCn || s.name).join('、') || '无'}`;
    }

    /** 格式化比赛为文本 */
    formatMatchCard(match) {
        const home = match.homeTeamCn || match.homeTeam || '?';
        const away = match.awayTeamCn || match.awayTeam || '?';
        const score = match.status === 'FINISHED'
            ? `${match.homeScore ?? '?'} - ${match.awayScore ?? '?'}`
            : 'vs';
        const date = match.datetime ? new Date(match.datetime).toLocaleString('zh-CN') : '待定';
        const status = match.status === 'FINISHED' ? '✅ 已结束'
            : match.status === 'LIVE' ? '🔴 进行中'
            : '📅 未开始';

        return `⚽ **${home} ${score} ${away}**
📋 小组：${match.group || match.round || '?'} | ${status}
🕐 ${date}`;
    }

    /** 格式化预测为文本 */
    formatPredictionCard(pred) {
        const a = pred.teamA?.cnName || pred.teamA?.name || '?';
        const b = pred.teamB?.cnName || pred.teamB?.name || '?';
        const aWin = pred.teamA?.winProb ?? pred.teamA?.mcWinProb ?? '?';
        const bWin = pred.teamB?.winProb ?? pred.teamB?.mcWinProb ?? '?';
        const draw = pred.draw ?? pred.mcDraw ?? '?';
        const score = pred.predictedScore || '?';
        const conf = pred.confidence || '中';

        let text = `🔮 **${a} vs ${b}**\n`;
        text += `📊 胜率：${a} ${aWin}% | 平 ${draw}% | ${b} ${bWin}%\n`;
        text += `🎯 预测比分：${score}（置信度：${conf}）\n`;
        text += `📝 ${pred.analysis || ''}`;

        if (pred.playersToWatch?.length) {
            text += '\n👀 **关注球员**：';
            text += pred.playersToWatch.map(p =>
                `${p.team === (pred.teamA?.name || pred.teamA?.cnName) ? '🏠' : '✈️'} ${p.player}（${p.reason}）`
            ).join('、');
        }

        return text;
    }

    /** 获取所有球队名列表（用于意图引擎注入） */
    getAllTeamNames() {
        const names = new Set();
        for (const team of this.teams) {
            if (team.name) names.add(team.name);
            if (team.nameCn) names.add(team.nameCn);
            if (team.fifaCode) names.add(team.fifaCode);
        }
        return Array.from(names);
    }

    /** 获取所有球员名列表（用于注入） */
    getAllPlayerNames() {
        const names = new Set();
        for (const [key, player] of Object.entries(this.playersByName)) {
            if (player.name) names.add(player.name);
            if (player.nameCn) names.add(player.nameCn);
        }
        return Array.from(names).slice(0, 500); // 取前 500 个常见名
    }
}
