# Spec 2 — MCP Server (`@figma-config/mcp`)

**版本：** v1.0.0-spec  
**優先序：** P1（依賴 `core` 完成後開發）

---

## 1. 目標

將 Figma Config 2026 的議程資料包裝為符合 MCP 規範的 Server，讓 Claude Desktop、Cursor、Windsurf 等工具的 LLM 可以透過工具呼叫直接查詢議程、講者與 session 資訊。

---

## 2. 使用方式

### 設定（一次性）

將以下內容加入 MCP client 設定檔：

```json
// Claude Desktop: ~/Library/Application Support/Claude/claude_desktop_config.json
// Cursor: ~/.cursor/mcp.json
{
  "mcpServers": {
    "figma-config-2026": {
      "command": "npx",
      "args": ["-y", "figma-config-2026-mcp"]
    }
  }
}
```

### 使用（對 LLM 自然語言提問）

```
你：Config 2026 第二天有哪些跟 AI 相關的 session？
你：Dylan Field 在幾點上台？場地在哪？
你：幫我列出所有 Keynote 場次並寫成摘要
你：Config 2026 一共有幾個講者？
```

---

## 3. MCP Tools 規格

### Tool 1：`get_agenda`

取得完整議程，可依日期、標籤篩選。

```typescript
// Input Schema
{
  date?: "june-23" | "june-24" | "june-25",  // 不填則回傳全部
  tag?: string,        // 篩選 tag，如 "AI"、"Keynote"、"UX"
  stage?: string,      // 篩選場地，如 "Main Stage"
  format?: "markdown" | "json"  // 回傳格式（default: "markdown"）
}

// Output（format: "markdown"）
`
## June 24 — Main Stage
| 時間 | Session | 講者 |
|---|---|---|
| 9:00–10:20 AM | Figma product launch (Keynote) | Dylan Field |
| ... | ... | ... |
`

// Output（format: "json"）
AgendaDay[]  // 見 core 資料結構
```

---

### Tool 2：`get_session`

取得特定 session 的完整資訊。

```typescript
// Input Schema
{
  id?: string,      // session UUID
  title?: string,   // 模糊搜尋標題（擇一使用）
}

// Output（Markdown）
`
# Figma deep dive
**日期：** June 25 · 2:15–2:45 PM PDT
**場地：** Main Stage, Exhibitor Level Hall ABC
**標籤：** Figma

## 講者
- Jake Albaugh — Developer Advocate, Figma

## 說明
Take a deep dive into Figma's latest products...

**連結：** https://config.figma.com/san-francisco/session/...
`
```

---

### Tool 3：`get_speakers`

取得所有或特定講者資訊。

```typescript
// Input Schema
{
  name?: string,      // 模糊搜尋名字
  company?: string,   // 篩選公司，如 "Figma"、"Dropbox"
  limit?: number      // 回傳筆數上限（default: 20）
}

// Output（Markdown）
`
## Speakers

- **Dylan Field** — CEO & Co-founder, Figma
  Sessions: Figma product launch (Jun 24, Main Stage)

- **Catt Small** — Staff Product Designer, Dropbox
  Sessions: The canvas is not dead (Jun 25, Mezzanine Stage)
...
`
```

---

### Tool 4：`search_sessions`

全文關鍵字搜尋議程與說明文字。

```typescript
// Input Schema
{
  query: string,       // 搜尋關鍵字
  limit?: number       // 回傳筆數上限（default: 10）
}

// Output（Markdown）
`
搜尋「AI」找到 8 個結果：

1. **The canvas is not dead** (Jun 25, Mezzanine Stage)
   Tags: Process, AI, UX, Workflows
   ...

2. ...
`
```

---

### Tool 5：`get_event_summary`

取得活動總覽，供 LLM 建立整體認知。

```typescript
// Input Schema（無必填參數）
{}

// Output（Markdown）
`
# Figma Config 2026 — 活動總覽

- **地點：** Moscone Center, San Francisco
- **日期：** June 23–25, 2026
- **場次數量：** 90+ sessions
- **講者人數：** 50+ speakers
- **場地：** Main Stage · Mezzanine Stage · Config Commons

## 議程亮點
- Jun 23: Badge pickup · Config Commons 開幕
- Jun 24: Figma product launch（主題演講）
- Jun 25: Figma deep dive · Closing keynote

## 連結
- 官網：https://config.figma.com
- 完整議程：https://config.figma.com/san-francisco/agenda/
`
```

---

## 4. 技術選型

| 項目 | 選擇 | 版本 | 理由 |
|---|---|---|---|
| MCP SDK | `@modelcontextprotocol/sdk` | `^1.x` | 官方 SDK，stdio transport |
| 資料來源 | `@figma-config/core` | local | 讀取 `data.json` 快取 |
| 搜尋 | `fuse.js` | `^7.x` | 輕量模糊搜尋，無需外部服務 |
| Transport | stdio | — | 最廣泛支援的 MCP transport 方式 |
| 快取更新 | 啟動時檢查 TTL | — | 若快取過期（>24h）自動觸發 CLI 爬取 |

---

## 5. MCP Server 行為規範

| 行為 | 規範 |
|---|---|
| 資料來源 | 優先讀本地 `data.json`，不存在時自動呼叫 core scraper 初始化 |
| 回應語言 | 依使用者查詢語言回應（不硬編碼語言） |
| 回應長度 | 單次回應不超過 8000 tokens，超過自動分頁並提示 |
| 錯誤回應 | 回傳 MCP 標準錯誤物件，含可讀錯誤訊息 |
| 冷啟動時間 | ≤ 3 秒（快取存在時） |

---

## 6. 驗收條件

- [ ] 可在 Claude Desktop / Cursor 中正確載入（`npx -y figma-config-2026-mcp`）
- [ ] 5 個 Tools 均能正確回應並通過 MCP Inspector 驗證
- [ ] 模糊搜尋（Fuse.js）對中英文查詢均可命中
- [ ] 快取機制正常，不每次請求都爬取網站
- [ ] Server 可在 3 秒內完成冷啟動
