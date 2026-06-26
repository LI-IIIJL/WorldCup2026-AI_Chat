/**
 * ============================================
 *  实时数据后端客户端
 * ============================================
 *
 * 连接到可选的后端代理服务器，获取实时比赛数据。
 * 如果后端未配置（BACKEND_URL 为空），所有方法直接返回 null。
 * 每设备每日配额由后端控制。
 */

class BackendClient {
    constructor(config) {
        this.baseUrl = config.BACKEND_URL || '';
        this.available = !!this.baseUrl;
        this._quotaCache = null;
    }

    /** 后端是否已配置且可用 */
    get isAvailable() { return this.available; }

    /** 获取设备指纹（基于浏览器指纹） */
    _getFingerprint() {
        let fp = localStorage.getItem('worldcup_device_fp');
        if (!fp) {
            fp = 'fp_' + Math.random().toString(36).substring(2, 12)
                       + Date.now().toString(36);
            localStorage.setItem('worldcup_device_fp', fp);
        }
        return fp;
    }

    /** 发起请求到后端 */
    async _fetch(endpoint, params = {}) {
        if (!this.available) return null;

        const url = new URL(`${this.baseUrl}${endpoint}`);
        Object.entries(params).forEach(([k, v]) => {
            if (v !== undefined && v !== null) url.searchParams.set(k, v);
        });

        try {
            const resp = await fetch(url, {
                headers: {
                    'X-Device-Fingerprint': this._getFingerprint()
                }
            });
            const data = await resp.json();

            if (data.quota) this._quotaCache = data.quota;

            if (!resp.ok) {
                if (data.error === 'DAILY_QUOTA_EXCEEDED') {
                    return { error: 'quota_exceeded', message: data.message, quota: data.quota };
                }
                return { error: 'api_error', message: data.message || `HTTP ${resp.status}` };
            }

            return data;
        } catch (e) {
            this.available = false; // 连接失败，标记为不可用
            return { error: 'network', message: e.message };
        }
    }

    /** 查询剩余配额 */
    async getQuota() {
        const result = await this._fetch('/api/quota');
        if (result?.success) {
            this._quotaCache = { remaining: result.remaining, used: result.used, limit: result.dailyLimit };
            return this._quotaCache;
        }
        return null;
    }

    /** 获取实时比分 */
    async getLiveScores() {
        const result = await this._fetch('/api/live-scores');
        if (result?.success) return result.data;
        return null;
    }

    /** 搜索球员（实时 API） */
    async searchPlayer(name) {
        const result = await this._fetch('/api/player', { name });
        if (result?.success) return result.data;
        return null;
    }

    /** 获取比赛统计 */
    async getMatchStats(matchId) {
        const result = await this._fetch('/api/match-stats', { id: matchId });
        if (result?.success) return result.data;
        return null;
    }

    /** 当前缓存的配额信息 */
    get quotaInfo() {
        return this._quotaCache;
    }
}
