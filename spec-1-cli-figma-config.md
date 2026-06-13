# Spec 1 — CLI 工具 (`@figma-config/cli`)

**版本：** v1.0.0-spec  
**優先序：** P0（第一個完成）

---

## 1. 目標

提供一個 Node.js CLI 工具，能自動將 Figma Config 2026 官網的議程、講者、session 等公開頁面，轉換為 LLM-friendly 的 Markdown 與 `llms.txt` 格式，並輸出到本地檔案系統。

---

## 2. 使用方式

```bash
# 無需安裝，直接執行
npx figma-config-llms-txt

# 指定活動場次與輸出目錄
npx figma-config-llms-txt --event san-francisco --output ./output

# 只輸出特定類型
npx figma-config-llms-txt --only sessions

# 使用本地快取（不重新爬取）
npx figma-config-llms-txt --cache-only

# 強制重新爬取
npx figma-config-llms-txt --refresh
```

---

## 3. 功能需求

### 3.1 核心爬取流程（`packages/core`）

| 步驟 | 說明 |
|---|---|
| F-01 | 讀取 `https://config.figma.com/sitemap.xml`，取得所有 URL |
| F-02 | 過濾出 `/session/`、`/event/`、`/speakers/`、`/agenda/`、`/sponsors/`、`/faq/` 路徑 |
| F-03 | 對每個 URL 發起 `HTTP GET`，取得 SSR HTML |
| F-04 | 每次請求間隔 **≥ 1000ms**（可透過 `--delay` 參數調整） |
| F-05 | 使用 Cheerio 解析 `<main>` 元素，提取結構化資料 |
| F-06 | 使用 Turndown 將 HTML 轉換為 Markdown |
| F-07 | 將結果快取到 `~/.cache/figma-config/`（TTL：24 小時） |

### 3.2 資料結構（解析目標）

```typescript
interface Session {
  id: string;           // UUID from URL
  url: string;
  title: string;
  date: string;         // e.g. "Jun 25"
  time: string;         // e.g. "2:15–2:45 PM PDT"
  stage: string;        // e.g. "Main Stage"
  tags: string[];       // e.g. ["Keynote", "AI", "UX"]
  speakers: Speaker[];
  description: string;
  type: 'session' | 'event';
}

interface Speaker {
  name: string;
  title: string;
  company: string;
  profileUrl?: string;
}

interface AgendaDay {
  date: string;         // e.g. "June 24"
  sessions: Session[];
}
```

### 3.3 輸出需求

| 輸出檔案 | 格式 | 說明 |
|---|---|---|
| `llms.txt` | llms.txt 規範 | 頂層索引，含所有 session 連結與一行摘要 |
| `llms-full.txt` | 純文字 Markdown | 所有內容合併，適合直接貼入 LLM context |
| `sessions/{uuid}.md` | Markdown | 每個 session 一個獨立檔案 |
| `agenda.md` | Markdown | 依日期排序的完整議程表 |
| `speakers.md` | Markdown | 所有講者列表 |
| `data.json` | JSON | 結構化資料，供 MCP server 使用 |

### 3.4 `llms.txt` 輸出格式規範

```markdown
# Figma Config 2026

> Figma's annual design & development conference.
> San Francisco, Moscone Center, June 23–25, 2026.
> 3 days · 90+ sessions · Main Stage + Mezzanine Stage

## Agenda Overview
- [Full Agenda](https://config.figma.com/san-francisco/agenda/): Browse all sessions by day and filter by topic

## Sessions — June 23
- [Badge pickup](./sessions/xxx.md): 9:00 AM–7:00 PM, Moscone North. Registration pickup.
- [Config Commons](./sessions/xxx.md): 12:00–7:00 PM, Config Commons area.

## Sessions — June 24
- [Figma product launch](./sessions/xxx.md): 9:00–10:20 AM, Main Stage. Opening keynote by Dylan Field.
...

## Speakers
- [Dylan Field](./speakers.md#dylan-field): CEO & Co-founder, Figma

## Optional
- [Sponsors](https://config.figma.com/san-francisco/sponsors/): Event sponsors
- [FAQ](https://config.figma.com/san-francisco/faq/): Frequently asked questions
```

---

## 4. 技術選型

| 項目 | 選擇 | 版本 | 理由 |
|---|---|---|---|
| Runtime | Node.js | `>=18` | 原生 fetch、ESM、`--experimental-vm-modules` |
| 語言 | TypeScript | `^5.x` | 型別安全，利於後續 MCP 共用 |
| HTML 解析 | `cheerio` | `^1.x` | SSR 頁面無需 headless browser |
| HTML → MD | `turndown` | `^7.x` | 業界標準，支援自訂規則 |
| GFM 表格 | `turndown-plugin-gfm` | `^1.x` | 支援 Markdown 表格語法 |
| CLI 框架 | `commander` | `^12.x` | 輕量，無需 yargs |
| 進度顯示 | `ora` | `^8.x` | Spinner + 進度提示 |
| 快取 | `cacache` | `^18.x` | 本地 content-addressable 快取 |
| 測試 | `vitest` | `^1.x` | 快速，支援 ESM |
| 打包 | `tsup` | `^8.x` | 快速 TypeScript bundler |

---

## 5. 錯誤處理

| 錯誤情境 | 處理方式 |
|---|---|
| 網路請求失敗（4xx/5xx）| 跳過該 URL，記錄到 `error.log`，繼續執行 |
| 解析失敗（DOM 結構異動）| 回退使用純文字 `innerText`，標記 `[parse-error]` |
| Rate limit 或 503 | 自動 retry 3 次，間隔指數退避（2s, 4s, 8s） |
| 輸出目錄無寫入權限 | 立即報錯並提示正確用法 |
| sitemap.xml 不可用 | 使用內建 URL fallback 列表 |

---

## 6. CLI 參數完整規格

```
Options:
  --event <name>     活動場次 (default: "san-francisco")
  --output <dir>     輸出目錄 (default: "./figma-config-output")
  --only <types>     只處理指定類型，逗號分隔 (sessions,events,speakers,faq)
  --delay <ms>       請求間隔毫秒 (default: 1000)
  --cache-only       使用快取，不重新爬取
  --refresh          忽略快取，強制重新爬取
  --no-full          不輸出 llms-full.txt（節省時間）
  --format <fmt>     輸出格式：markdown|json|both (default: "both")
  --verbose          顯示詳細日誌
  -h, --help         顯示說明
  -v, --version      顯示版本號
```

---

## 7. 測試要求

| 測試類型 | 覆蓋目標 | 工具 |
|---|---|---|
| Unit | `parser.ts` 各解析函式、`formatter.ts` 輸出格式 | vitest |
| Integration | 使用本地 HTML fixture 測試完整流程 | vitest |
| Snapshot | llms.txt / Markdown 輸出格式不意外變動 | vitest snapshot |
| E2E（選做）| 實際爬取一個 session URL | vitest（需網路） |

---

## 8. 驗收條件

- [ ] `npx figma-config-llms-txt` 零設定可執行
- [ ] 90 秒內完成全站爬取（約 90 URL × 1s delay）
- [ ] 輸出的 `llms.txt` 符合 [llmstxt.org](https://llmstxt.org) 規範
- [ ] 輸出的 `data.json` 可被 MCP server 直接讀取
- [ ] 測試覆蓋率 ≥ 80%
- [ ] TypeScript 嚴格模式（`"strict": true`）無報錯
