# ⚽ WorldCup2026 AI Chat

> **世界杯 AI 助手** — 2026 美加墨世界杯智能问答 Web Demo

本项目是 [WorldCupScan](https://github.com/lijionglin/WorldCupScan) App 的 **Tab B（AI 对话模块）** 的 Web 版移植。

核心架构：**本地 FAQ 秒回 + LongCat AI 智能增强**，展示 Android App 中 AI 对话模块的设计思路和实现逻辑。

---

## ✨ 功能特性

### 核心能力
- **⚽ 足球规则问答** — 越位、VAR、红黄牌、点球规则等 30+ 条预置知识
- **🏆 世界杯知识** — 历史、赛制、场馆、纪录、球星
- **🔮 本地秒回** — FAQ 命中 0 延迟，不消耗任何 API 配额
- **🤖 LongCat AI 智能增强** — 已预配免费 API Key，开箱即用（每日 500 万 tokens 免费额度）

### Demo 模式（默认）
| 功能 | 说明 |
|------|------|
| FAQ 本地匹配 | 30+ 条足球知识，关键词精准匹配 |
| 意图识别 | 12 种意图分类（问候/规则/比分/阵容/赛程等） |
| 建议问题 | 随对话轮次动态更新的 4 个快捷问题 |
| 零 API 消耗 | 纯前端运行，无需配置 Key |

### AI 模式（默认开启）
| 功能 | 说明 |
|------|------|
| AI 智能回答 | 由 LongCat AI（OpenAI 兼容）驱动的自然对话 |
| 数据上下文注入 | 自动注入当前时间和对话上下文 |
| 无限配额 | 每日 500 万 tokens 免费额度，开箱即用 |
| 零配置 | API Key 已预绑在 CONFIG.js |

---

## 🚀 快速开始

### 方式一：在线体验
直接打开 `index.html` 即可使用。
- **AI 模式**（默认）：由 LongCat AI 驱动，已预配免费 Key，开箱即用
- **Demo 模式**：可手动切换，纯本地 FAQ 运行

### 方式二：使用 Demo 模式
点击右上角「🎯 切换 Demo」按钮，即可完全在本地运行，零 API 消耗。

### 方式三：部署到服务器
直接上传所有文件到任意静态托管服务即可（GitHub Pages / Vercel / Netlify 均可）。

---

## 🏗️ 项目结构

```
WorldCup2026-AI_Chat/
├── index.html              # 入口页面
├── CONFIG.js               # 配置文件（API Key 占位符）
├── README.md               # 本文件
├── css/
│   └── style.css           # Neon Pitch 深色主题
└── js/
    ├── app.js              # 主应用逻辑
    ├── intentEngine.js     # 意图识别引擎（从 Kotlin 移植）
    ├── faqKnowledge.js     # FAQ 知识库 + 匹配引擎（数据内嵌）
    └── deepseekClient.js   # LongCat AI 客户端（OpenAI 兼容格式）
```

---

## 🧠 架构设计

### 三层回复策略（与 Android 版一致）

```
用户输入
    │
    ▼
┌─────────────────────┐
│  意图识别引擎         │  ← intentEngine.js（12 种意图）
│  IntentEngine        │
└────────┬────────────┘
         │
         ▼
┌─────────────────────┐    命中 (≥0.6)    ┌──────────────────┐
│  FAQ 知识库匹配       │ ──────────────→ │ 本地秒回          │
│  FaqKnowledge        │                  │ 零 API 消耗       │
└────────┬────────────┘                  └──────────────────┘
         │ 部分命中 (≥0.3)
         ▼
┌─────────────────────┐    AI 模式开启?  ┌──────────────────┐
│  FAQ + AI 补充       │ ──────────────→ │ AI 智能增强回复    │
│                      │                  │ 由 LongCat 驱动    │
└────────┬────────────┘                  └──────────────────┘
         │ 未命中
         ▼
┌─────────────────────┐    AI 模式开启?  ┌──────────────────┐
│ 引导回复 / AI 兜底     │ ──────────────→ │ AI 完整回答        │
│                      │                  │ 或 Demo 引导      │
└─────────────────────┘                  └──────────────────┘
```

### 速率限制

```
┌─────────────────────────────┐
│  localStorage 计数器          │
│  每日重置（跨日自动清零）        │
│  Demo 模式: 0/∞（永不消耗）    │
│  AI 模式:  999 次/天（LongCat 免费额度） │
└─────────────────────────────┘
```

---

## 📋 意图分类列表（12 种）

| 意图 | 触发词 | Demo 行为 | AI 行为 |
|------|--------|-----------|---------|
| GREETING | 你好/在吗/你是谁 | 问候回复 | 问候回复 |
| RULE_QUESTION | 越位/VAR/手球 | FAQ 匹配 | FAQ + AI 补充 |
| MATCH_SCORE | 比分/赢了/2-1 | 引导提示 | AI 回答 |
| LINEUP_QUERY | 首发/阵容 | 引导提示 | AI 回答 |
| SCHEDULE_QUERY | 赛程/几点 | 引导提示 | AI 回答 |
| STANDINGS_QUERY | 积分榜/排名 | 引导提示 | AI 回答 |
| PREDICTION_QUERY | 预测/胜率 | 引导提示 | AI 回答 |
| PLAYER_INFO | 梅西是谁 | FAQ/引导 | AI 回答 |
| TEAM_INFO | 阿根廷队 | 引导提示 | AI 回答 |
| PLAYER_RECOGNITION | 识别/截图 | 引导上传 | 引导上传 |
| GENERAL_CHAT | 其他 | 兜底引导 | AI 回答 |
| UNKNOWN | 空输入 | 兜底引导 | 兜底引导 |

---

## 🔐 安全机制

- **AI Key 公开**：LongCat API Key 已预绑在 `CONFIG.js` 中随代码公开
  - 这是免费的社区额度（5M tokens/天），无需担心被盗用
  - 如需更换，直接在 `CONFIG.js` 修改 `LONGCA_API_KEY` 即可
- **客户端限频**：LongCat 调用受 localStorage 计数保护（宽松 999 次/天）
- **Demo 隔离**：切换 Demo 模式后完全本地运行，永不触发外部 API

---

## 📜 许可

本项目仅供学习和展示用途。世界杯相关数据版权归 FIFA 所有。

---

## 🔗 相关项目

- [WorldCupScan](https://github.com/lijionglin/WorldCupScan) — Android App 完整源码
- LongCat AI — 由 [LongCat](https://longcat.chat/) 提供免费 API 额度
