# ⚽ WorldCup2026 AI Chat

> **世界杯 AI 助手** — 2026 美加墨世界杯智能问答 Web Demo
>
> **版本**: v2.0 | **更新**: 2026-06-26
>
> **本 Demo 是 Android App「WorldCupScan」Tab B（AI 对话模块）的浏览器版移植**，
> 保留了核心的意图识别引擎 + FAQ 知识库 + AI 对话三层架构，
> 并**完整嵌入 1246 名球员 + 48 支球队 + 104 场比赛 + 蒙特卡洛预测数据**，
> 实现不依赖任何付费 API 的全功能离线查询。

---

## 🔴 诚实声明：这版 README 和前版有什么不同

| 我前版的内容 | 事实真相 | 本版修正 |
|:------------|:---------|:---------|
| "核心架构：FAQ + AI 增强" | **漏了数据库查询**，没有提到嵌入的 1246 名球员数据 | 现在完整说明了三层架构：**FAQ + 数据库 + AI** |
| "Demo 模式零 API 消耗" | **不够准确**——数据库查询也是零 API 消耗 | 明确区分：FAQ 本地秒回 / 数据库本地查询 / AI 走 LongCat |
| "AI 模式由 LongCat 驱动" | **缺少数据上下文注入说明**——AI 对话时是否带球员/球队数据？ | 现在明确：AI 模式会注入球员/球队/比赛/预测数据上下文 |
| 缺少技术实现细节 | 读者想 fork 改代码，不知道怎么改 | 新增数据库引擎工作原理+数据索引策略说明 |

---

## 🎯 功能覆盖清单

### 与 Android 版 Tab B 对比

| 功能模块 | Android 版 | Web Demo | 说明 |
|:---------|:----------:|:--------:|:------|
| **意图识别引擎**（12 种意图） | ✅ | ✅ | IntentEngine.kt → intentEngine.js，逻辑一致 |
| **FAQ 本地匹配**（30+条足球规则） | ✅ | ✅ | 数据内嵌 JS，关键词匹配算法一致 |
| **三级置信度路由**（≥0.6/≥0.3/兜底） | ✅ | ✅ | 完全移植 |
| **球员查询**（1246 人） | ✅ | ✅ | **v2.0 新增** — 从 players_2026.json 查库 |
| **球队阵容查询**（48 队） | ✅ | ✅ | **v2.0 新增** — teams.json + 球员列表 |
| **比赛结果查询**（104 场） | ✅ | ✅ | **v2.0 新增** — matches.json 本地查询 |
| **蒙特卡洛预测** | ✅ | ✅ | **v2.0 新增** — predictions.json 查询 |
| **场馆信息**（16 座） | ✅ | ✅ | **v2.0 新增** — bdl_stadiums.json |
| **荣誉墙（TrophyData）** | ✅ | ⚠️ | Web 版未包含 trophies_cache.json（1.6MB，后续可加） |
| **DeepSeek API** | ✅ | ⚠️ | 已替换为 LongCat（免费，5M tokens/天） |
| **AR 截图识别** | ✅ | ❌ | 浏览器无摄像头 AR 能力 |
| **Android 原生 UI** | ✅ | ❌ | 浏览器 HTML 界面 |
| **实时 API 数据轮询** | ✅ | ❌ | 不进���任何付费 API，全部本地静态数据 |
| **你的付费 API 配额消耗** | 🔴 **会消耗** | 🟢 **零消耗** | football-data / api-sports / BDL 一个都没碰 |

---

## 🧠 三层回复策略（v2.0 新增数据库层）

```
用户输入
    │
    ▼
┌─────────────────────┐
│  意图识别引擎         │  ← intentEngine.js（12 种意图）
│  注入 1246 球员名    │     注满所有已知球员/球队名
│  注入 48 队名+FIFA码 │     提升实体提取命中率
└────────┬────────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│ Layer1 │ │ Layer1 │
│ 问候   │ │ 球员   │
│ 规则   │ │ 识别   │
│ 兜底   │ └────────┘
└────────┘
    │
    ▼
┌─────────────────────┐  命中 (≥0.6)    ┌──────────────────┐
│  Layer 2             │ ──────────────→ │ FAQ 本地秒回      │
│  FAQ 知识库匹配       │                  │ 零 API 消耗       │
│  FaqKnowledge        │                  │ 30+ 条预置知识    │
└────────┬────────────┘                  └──────────────────┘
         │ 部分命中 (≥0.3)
         ▼
┌─────────────────────┐  命中           ┌──────────────────────┐
│  Layer 3             │ ──────────────→ │ 数据库查询回复        │
│  数据库查询引擎       │                  │                       │
│  DataQuery           │                  │ 球员资料/球队阵容      │
│  ───────────          │                  │ 比赛结果/蒙特卡洛预测  │
│  players_2026.json   │                  │ 场馆信息              │
│  teams.json          │                  │ 零 API 消耗           │
│  matches.json        │                  │                       │
│  predictions.json    │                  │                       │
│  bdl_stadiums.json   │                  │                       │
└────────┬────────────┘                  └──────────────────────┘
         │ 数据库未命中
         ▼
┌─────────────────────┐  AI 模式开启?   ┌──────────────────┐
│  Layer 4             │ ──────────────→ │ LongCat AI 回复    │
│  AI 兜底             │                  │ 注入球员/球队/比赛  │
│  或引导回复           │                  │ 数据到上下文       │
└─────────────────────┘                  └──────────────────┘
```

---

## 📊 数据库引擎技术细节（v2.0 核心新增）

### 数据源一览

| 数据文件 | 大小 | 记录数 | 查询能力 |
|:---------|:----:|:------:|:---------|
| `data/players_2026.json` | 469 KB | 48 队 × 26 人 = 1248 名球员 | 按姓名（中/英）、号码、位置、球队查询 |
| `data/teams.json` | 8.9 KB | 48 队 | 按队名（中/英）、FIFA 代码、小组查询 |
| `data/matches.json` | 48 KB | 104 场比赛 | 按球队、日期、状态筛选 |
| `data/predictions.json` | 105 KB | 全部场次 | 蒙特卡洛胜率/比分/关键因素/关注球员 |
| `data/bdl_stadiums.json` | 2.3 KB | 16 座场馆 | 名称/城市/容量 |

**总量**：~633 KB，全部为本地静态 JSON，**不调用任何外部 API**。

### 索引策略

```
DataQuery 类内部维护 7 个索引:
├── playersByName  → Map<name_lower, player>       ← 中/英文名快速查找
├── playersByTeam  → Map<teamName_lower, player[]>  ← 球队→球员列表
├── playersById    → Map<api_sports_id, player>     ← API ID 查找
├── teamsByFifaCode→ Map<fifaCode, team>            ← FIFA 代码查找
├── matchesByTeam  → Map<teamName_lower, match[]>   ← 球队→比赛
├── predictionsByTeam→ Map<teamName_lower, pred[]>  ← 球队→预测
└── intents注入: 1246名球员+48队名→IntentEngine     ← 提升实体提取
```

### 查询方法

| 方法 | 用途 | 示例查询 |
|:-----|:-----|:---------|
| `findPlayer(query)` | 精确匹配球员 | "梅西"、"Lionel Messi" |
| `searchPlayers(query)` | 模糊搜索（返回 TOP 10） | "梅"、"巴佩" |
| `findTeam(query)` | 查找球队 | "阿根廷"、"ARG" |
| `getTeamPlayers(teamName)` | 获取球队全部球员 | → 按号码排序的 26 人 |
| `getTeamMatches(teamName)` | 获取球队比赛 | → 已完成 + 即将进行 |
| `getTeamPredictions(teamName)` | 获取预测 | → 胜率/比分/关注球员 |

---

## 📋 意图分类完整清单（12 种）

| 意图 | 触发词 | v1.0 Demo 行为 | **v2.0 新版行为** | AI 模式行为 |
|:-----|:-------|:--------------|:-----------------|:------------|
| GREETING | 你好/在吗/你是谁 | 问候回复 | ✅ **问候+显示当前可用功能清单** | 问候回复 |
| RULE_QUESTION | 越位/VAR/手球 | FAQ 匹配 | ✅ FAQ 匹配（不变） | FAQ + AI 补充 |
| PLAYER_INFO | 梅西是谁/姆巴佩介绍 | ❌ 引导提示"查 App" | ✅ **从数据库查球员**，返回号码/位置/俱乐部/身价 | 数据库查询+AI补充 |
| TEAM_INFO | 阿根廷队/巴西队 | ❌ 引导提示"查 App" | ✅ **从数据库查球队**，返回阵容/分组/核心球员 | 数据库查询+AI补充 |
| MATCH_SCORE | 墨西哥比分/赢了 | ❌ "不支持实时数据" | ✅ **从数据库查已完赛比分** | 数据库查询+AI补充 |
| SCHEDULE_QUERY | 赛程/几点有比赛 | ❌ "不支持实时数据" | ✅ **从数据库查赛程**（未来 5 场） | 数据库查询+AI补充 |
| PREDICTION_QUERY | 预测/胜率/夺冠 | ❌ "不支持预测" | ✅ **从数据库查蒙特卡洛预测**（胜率/比分/关注球员） | 数据库查询+AI补充 |
| LINEUP_QUERY | 首发/阵容 | 引导提示 | ✅ **同 TEAM_INFO**，返回阵容列表 | 数据库查询 |
| STANDINGS_QUERY | 积分榜/排名 | 引导提示 | ⚠️ 无实时数据，引导看 App | AI 回答 |
| PLAYER_RECOGNITION | 截图/照片/识别 | 引导提示 | ✅ **引导提示+建议使用文字查询** | 引导提示 |
| GENERAL_CHAT | 其他 | 兜底引导 | ✅ 兜底引导 / AI 回复 | AI 完整回答 |
| UNKNOWN | 空输入 | 兜底引导 | ✅ 兜底引导 | 兜底引导 |

---

## 🚀 快速开始

### 🔵 方式一：GitHub Pages 部署（推荐，数据库全功能可用）

1. 打开仓库 Settings → Pages → 选中 `main` 分支根目录
2. 等待 1-2 分钟部署完成
3. 访问 `https://li-iiijl.github.io/WorldCup2026-AI_Chat/`
4. 打开后**数据库自动加载**，可直接查询球员/球队/比赛/预测

### 🟢 方式二：本地服务器（数据库全功能可用）

```bash
# Python
python -m http.server 8000
# 然后访问 http://localhost:8000

# Node.js
npx serve .
# 然后访问 http://localhost:3000
```

### 🟡 方式三：直接打开 index.html（数据库不可用，FAQ + AI 模式可用）

> **原因**：浏览器 `file://` 协议禁止 fetch() 请求本地 JSON 文件。
> 数据库不回加载，但 FAQ 知识库（内嵌 JS）+ LongCat AI 仍可正常使用。

---

## 🏗️ 项目结构

```
WorldCup2026-AI_Chat/
├── index.html              # 入口页面（Neon Pitch 深色主题聊天 UI）
├── CONFIG.js               # 全局配置（LongCat API Key + 模型参数）
├── README.md               # 本文档
│
├── css/
│   └── style.css           # 深色主题样式表（#0F0F23 底 / #FF6B35 橙）
│
├── js/
│   ├── app.js              # 主应用逻辑（消息管理/回复路由/UI 更新）
│   ├── intentEngine.js     # 意图识别引擎（12 种意图，与 Kotlin 版一致）
│   ├── faqKnowledge.js     # FAQ 知识库 + 关键词匹配引擎（数据内嵌）
│   ├── dataQuery.js        # 数据库查询引擎（球员/球队/比赛/预测索引）
│   └── deepseekClient.js   # LongCat AI 客户端（OpenAI 兼容格式）
│
└── data/                   # 数据库（静态 JSON，部署后才可访问）
    ├── players_2026.json   # 1248 名球员（48 队 × 26 人）
    ├── teams.json          # 48 支参赛队
    ├── matches.json        # 104 场比赛
    ├── predictions.json    # 蒙特卡洛预测
    └── bdl_stadiums.json   # 16 座场馆
```

---

## ⚠️ 已知限制（诚实版）

| 限制 | 原因 | 影响范围 |
|:-----|:-----|:---------|
| **file:// 下数据库不可用** | 浏览器安全策略禁止 fetch 本地文件 | 仅限直接双击 index.html 时 |
| **比赛数据为静态快照** | 无实时 API，不会自动更新比分 | 所有比赛数据固定为 JSON 导出的时间点 |
| **无荣誉墙数据** | trophies_cache.json（1.6MB）暂未包含 | 球员详情没有历史荣誉展示 |
| **无伤病数据** | 本地 injured 字段不可靠 | 伤病相关查询无法精确回复 |
| **无实时积分榜** | standings 需要 football-data API | 小组排名查询走兜底引导 |
| **AI 回复质量依赖 LongCat** | 非自研模型 | 数据类查询走本地，AI 仅做通用回答 |

---

## 🔐 API 配额安全（最重要）

| 你的付费 API | Demo 是否调用 | 配额消耗 |
|:--------------|:------------:|:---------|
| **football-data.org**（免费，10次/分） | ❌ 不调用 | 🟢 0 |
| **api-sports.io Pro**（$19/月，7500次/天） | ❌ 不调用 | 🟢 0 |
| **BDL GOAT**（$39.99/月） | ❌ 不调用 | 🟢 0 |
| **LongCat**（免费，5M tokens/天） | ✅ 预配在 CONFIG.js | 🟢 免费额度，无限续 |
| **本地 JSON 数据** | ✅ 全部离线查询 | 🟢 0 |

---

## 🔗 相关项目

- [WorldCupScan](https://github.com/LI-IIIJL/WorldCupScan) — Android App 完整源码（Kotlin + 4 Tab + AR + AI）
- [LongCat AI](https://longcat.chat/) — 提供免费 API 额度（5M tokens/天）
- [DeepSeek](https://deepseek.com/) — Android 版原用的 AI 模型
