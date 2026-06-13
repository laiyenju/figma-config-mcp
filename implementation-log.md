# Implementation Log — figma-config-llms-txt

## 決策記錄

| 項目 | 決定 | 理由 |
|---|---|---|
| Package manager | pnpm | monorepo 標準，速度快、disk 省 |
| User-Agent | `figma-config-llms-txt/1.0` | 透明、符合爬蟲禮節 |
| robots.txt | 合規 ✅ | 只封鎖 /register/*，目標路徑全部開放 |
| Module format | ESM (`"type": "module"`) | ora ^8.x 純 ESM，統一格式避免相容問題 |
| Parser 策略 | 多層 fallback | class selector → semantic HTML → innerText；WebFetch 無法取得精確 class，保守設計以應對 DOM 異動 |
| data.json 路徑 | `~/.cache/figma-config/data.json` | CLI 與 MCP server 共用穩定路徑，MCP 不需知道 CLI 的 --output 參數 |
| MCP 工具結構 | tools.ts 單檔 + index.ts 入口 | 5 個 tool 邏輯量不大，單檔維護成本低；若之後擴充可拆 |

---

## 進度

### Phase 1 — Monorepo 骨架 ✅
- [x] pnpm-workspace.yaml
- [x] 根 package.json
- [x] tsconfig.base.json
- [x] .gitignore

### Phase 2 — packages/core ✅
- [x] src/types.ts
- [x] src/cache.ts
- [x] src/scraper.ts
- [x] src/parser.ts
- [x] src/formatter.ts
- [x] src/index.ts
- [x] tests/fixtures/session.html / agenda.html / speakers.html
- [x] tests/parser.test.ts
- [x] tests/formatter.test.ts

### Phase 3 — packages/cli ✅
- [x] src/index.ts

### Phase 4 — packages/mcp ✅
- [x] src/tools.ts（5 個 tools：get_agenda / get_session / get_speakers / search_sessions / get_event_summary）
- [x] src/index.ts

---

## 待確認 / 已知風險

| 項目 | 說明 |
|---|---|
| ~~Parser 選擇器準確度~~ | ✅ 修正：網站用 CSS-in-JS hashed classes；全面改用語意屬性：`article[aria-label]` 取代 class 選擇器、`<time>` 元素取代正則、`<h2>` 取代 `<h1>`；role `<p>` 是 article 的 sibling 需用 `.parent().find('p')`；議程頁主要靠 CSR，SSR 僅 6 筆，CLI fallback 為主要資料路徑 |
| ~~CLI ↔ MCP data.json 路徑不一致~~ | ✅ 修正：CLI 寫完後額外呼叫 `setCached('data.json', ...)`；MCP 改用 `getCached` 讀取，統一走 cacache，不再依賴獨立檔案路徑 |
| ~~pnpm install~~ | ✅ 完成；補 `vendor.d.ts` 修 turndown-plugin-gfm 型別宣告；31 tests passed |

---

## 變動記錄

- **2026-06-13** — 初版全部建立完成（Phase 1–4）
- **2026-06-13** — 發現 CLI 輸出路徑與 MCP 讀取路徑不一致，記錄為待確認項目
- **2026-06-13** — pnpm install 完成；修 pnpm-workspace.yaml allowBuilds esbuild、補 vendor.d.ts、formatter.ts 實際呼叫 td.turndown()；全 31 tests passed
- **2026-06-13** — 修 CLI ↔ MCP data.json 路徑不一致：CLI 加 setCached、MCP 改用 getCached，統一走 cacache
- **2026-06-13** — Parser 選擇器全面修正：CSS-in-JS hashed classes 無效；改用 article[aria-label]、time 元素、h2、parent().find(p)；更新 3 個 test fixtures；31 tests passed
