/**
 * ============================================
 *  世界杯 AI 助手 — 实时数据代理后端
 * ============================================
 *
 * 功能：
 * - 代理 football-data.org / api-sports / BDL 的实时数据
 * - 每设备每日配额限制（5次/天）
 * - API Key 保存在后端，不暴露给前端
 *
 * 部署方式：
 *   npm install
 *   cp .env.example .env  # 填入真实 API Key
 *   node server.js
 *
 * 前端对接：
 *   向 /api/* 发送 GET 请求，后端自动转发到对应 API
 *   配额不足时返回 429（Too Many Requests）
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3030;

// ==================== 中间件 ====================

app.use(cors({ origin: true }));
app.use(express.json());

// ==================== 速率限制 ====================

const DAILY_QUOTA = parseInt(process.env.DAILY_QUOTA_PER_DEVICE || '5');
const DB_PATH = path.join(__dirname, 'rate-limit-db.json');

/** 加载持久化限频数据库 */
function loadDB() {
    try {
        if (fs.existsSync(DB_PATH)) {
            return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
        }
    } catch (e) {
        console.warn('⚠️ 限频数据库读取失败，重新创建:', e.message);
    }
    return {};
}

/** 持久化保存 */
function saveDB(db) {
    try {
        fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    } catch (e) {
        console.error('❌ 限频数据库写入失败:', e.message);
    }
}

/** 获取设备标识（IP + User-Agent 指纹） */
function getDeviceId(req) {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || req.socket.remoteAddress
            || 'unknown';
    const ua = (req.headers['user-agent'] || '').substring(0, 50);
    const customFingerprint = req.headers['x-device-fingerprint'] || '';
    // 组合 IP + UA 哈希作为设备 ID
    const raw = `${ip}|${ua}|${customFingerprint}`;
    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
        hash = ((hash << 5) - hash) + raw.charCodeAt(i);
        hash |= 0;
    }
    return `dev_${Math.abs(hash).toString(16).substring(0, 10)}`;
}

/** 获取当日日期字符串 */
function today() {
    return new Date().toISOString().substring(0, 10);
}

/** 检查并消耗配额，返回 { allowed, remaining, waitSeconds } */
function checkQuota(deviceId) {
    const db = loadDB();
    const key = `${deviceId}_${today()}`;
    const used = db[key] || 0;

    if (used >= DAILY_QUOTA) {
        return { allowed: false, remaining: 0, used };
    }

    db[key] = used + 1;
    saveDB(db);
    return { allowed: true, remaining: DAILY_QUOTA - used - 1, used: used + 1 };
}

/** 查询剩余配额（不消耗） */
function peekQuota(deviceId) {
    const db = loadDB();
    const key = `${deviceId}_${today()}`;
    const used = db[key] || 0;
    return { remaining: Math.max(0, DAILY_QUOTA - used), used };
}

/** 配额中间件 */
function quotaMiddleware(req, res, next) {
    const deviceId = getDeviceId(req);
    req.deviceId = deviceId;

    const q = checkQuota(deviceId);
    if (!q.allowed) {
        return res.status(429).json({
            error: 'DAILY_QUOTA_EXCEEDED',
            message: `今日实时数据配额已用完（每日 ${DAILY_QUOTA} 次）。明天再来吧！`,
            remaining: 0,
            deviceId,
            dailyQuota: DAILY_QUOTA
        });
    }

    req.quota = q;
    next();
}

// ==================== API 代理工具 ====================

/** 安全截断字符串 */
function truncate(str, max = 500) {
    if (!str) return '';
    return String(str).substring(0, max);
}

// ==================== 端点：实时比分 ====================
// 来源：football-data.org /matches

app.get('/api/live-scores', async (req, res) => {
    const apiKey = process.env.FOOTBALL_DATA_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ error: 'FOOTBALL_DATA_KEY_MISSING', message: 'football-data API Key 未配置' });
    }

    try {
        const response = await axios.get('https://api.football-data.org/v4/matches', {
            headers: { 'X-Auth-Token': apiKey },
            params: { status: 'LIVE,FINISHED,SCHEDULED', limit: 20 }
        });

        const matches = (response.data.matches || []).map(m => ({
            id: m.id,
            status: m.status,
            minute: m.minute,
            homeTeam: m.homeTeam?.name || m.homeTeam?.shortName || '?',
            awayTeam: m.awayTeam?.name || m.awayTeam?.shortName || '?',
            homeScore: m.score?.fullTime?.home ?? m.score?.halfTime?.home,
            awayScore: m.score?.fullTime?.away ?? m.score?.halfTime?.away,
            group: m.group || m.competition?.name || '',
            datetime: m.utcDate,
            stage: m.stage
        }));

        res.json({
            success: true,
            quota: { remaining: req.quota.remaining, used: req.quota.used },
            data: matches,
            source: 'football-data.org'
        });
    } catch (e) {
        const status = e.response?.status || 500;
        const msg = truncate(e.response?.data?.message || e.message);
        res.status(status).json({ error: 'API_ERROR', message: msg, source: 'football-data.org' });
    }
});

// ==================== 端点：球员数据 ====================
// 来源：api-sports.io /players

app.get('/api/player', async (req, res) => {
    const apiKey = process.env.API_SPORTS_KEY;
    const playerName = req.query.name;
    if (!apiKey) {
        return res.status(503).json({ error: 'API_SPORTS_KEY_MISSING', message: 'api-sports API Key 未配置' });
    }
    if (!playerName) {
        return res.status(400).json({ error: 'PARAM_MISSING', message: '缺少 name 参数' });
    }

    try {
        // 搜索球员（api-sports 按姓名搜索）
        const searchRes = await axios.get('https://v3.football.api-sports.io/players', {
            headers: { 'x-apisports-key': apiKey },
            params: { search: playerName, season: '2026' }
        });

        const players = (searchRes.data.response || []).slice(0, 5).map(p => ({
            id: p.player?.id,
            name: p.player?.name,
            nameCn: '',
            age: p.player?.age,
            nationality: p.player?.nationality,
            position: p.statistics?.[0]?.games?.position || '',
            team: p.statistics?.[0]?.team?.name || '',
            rating: p.statistics?.[0]?.games?.rating || '',
            goals: p.statistics?.[0]?.goals?.total || 0,
            assists: p.statistics?.[0]?.goals?.assists || 0,
            photo: p.player?.photo || ''
        }));

        res.json({
            success: true,
            quota: { remaining: req.quota.remaining, used: req.quota.used },
            data: players,
            source: 'api-sports.io'
        });
    } catch (e) {
        const status = e.response?.status || 500;
        const msg = truncate(e.response?.data?.message || e.message);
        res.status(status).json({ error: 'API_ERROR', message: msg, source: 'api-sports.io' });
    }
});

// ==================== 端点：实时比赛统计 ====================
// 来源：api-sports.io /fixtures/statistics

app.get('/api/match-stats', async (req, res) => {
    const apiKey = process.env.API_SPORTS_KEY;
    const matchId = req.query.id;
    if (!apiKey) {
        return res.status(503).json({ error: 'API_SPORTS_KEY_MISSING', message: 'api-sports API Key 未配置' });
    }
    if (!matchId) {
        return res.status(400).json({ error: 'PARAM_MISSING', message: '缺少 id 参数' });
    }

    try {
        const statsRes = await axios.get('https://v3.football.api-sports.io/fixtures/statistics', {
            headers: { 'x-apisports-key': apiKey },
            params: { fixture: matchId }
        });

        const stats = (statsRes.data.response || []).map(t => ({
            team: t.team?.name || '',
            statistics: (t.statistics || []).map(s => ({
                type: s.type || '',
                value: s.value ?? '-'
            }))
        }));

        res.json({
            success: true,
            quota: { remaining: req.quota.remaining, used: req.quota.used },
            data: stats,
            source: 'api-sports.io'
        });
    } catch (e) {
        const status = e.response?.status || 500;
        const msg = truncate(e.response?.data?.message || e.message);
        res.status(status).json({ error: 'API_ERROR', message: msg, source: 'api-sports.io' });
    }
});

// ==================== 端点：查询剩余配额（不消耗） ====================

app.get('/api/quota', (req, res) => {
    const deviceId = getDeviceId(req);
    const q = peekQuota(deviceId);
    res.json({
        success: true,
        remaining: q.remaining,
        used: q.used,
        dailyLimit: DAILY_QUOTA,
        deviceId
    });
});

// ==================== 健康检查 ====================

app.get('/api/health', (req, res) => {
    const hasFootballKey = !!process.env.FOOTBALL_DATA_API_KEY;
    const hasApiSportsKey = !!process.env.API_SPORTS_KEY;
    const hasBdlKey = !!process.env.BALLDONTLIE_API_KEY;

    res.json({
        status: 'ok',
        version: '1.0.0',
        quotaPerDevice: DAILY_QUOTA,
        apisConfigured: {
            'football-data.org': hasFootballKey,
            'api-sports.io': hasApiSportsKey,
            'bdl-goat': hasBdlKey
        },
        endpoints: [
            'GET /api/live-scores',
            'GET /api/player?name=X',
            'GET /api/match-stats?id=X',
            'GET /api/quota',
            'GET /api/health'
        ]
    });
});

// ==================== 启动 ====================

app.listen(PORT, '0.0.0.0', () => {
    console.log(`
⚽ 世界杯 AI 助手 — 实时数据代理后端
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  端口:       ${PORT}
  配额:       ${DAILY_QUOTA} 次/天/设备
  限频存储:   ${DB_PATH}

  已配置 API:
    football-data: ${process.env.FOOTBALL_DATA_API_KEY ? '✅' : '❌'}
    api-sports:    ${process.env.API_SPORTS_KEY ? '✅' : '❌'}
    bdl-goat:      ${process.env.BALLDONTLIE_API_KEY ? '✅' : '❌'}

  端点:
    GET /api/health          ← 健康检查
    GET /api/quota           ← 查看本设备剩余配额
    GET /api/live-scores     ← 实时比分（football-data）
    GET /api/player?name=X   ← 球员数据（api-sports）
    GET /api/match-stats?id=X← 比赛统计（api-sports）
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
});
