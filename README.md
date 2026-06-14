# figma-config

把 Figma Config 年會的議程、講者與場次資訊整理成 LLM 友善格式，讓你可以直接在 Claude 中查詢，或匯出成 Markdown 檔案。

![Figma Config connector 已啟用於 Claude](assets/usage-1-connector.png)

## 這是什麼？

Figma Config 是 Figma 的年度設計師大會。這套工具爬取年會官方網站，把全部議程、講者資訊與場次說明整理成結構化資料，提供兩種使用方式：透過 MCP 伺服器直接在 Claude 中查詢，或用 CLI 工具把資料匯出到本地。

目前收錄 **2026 年舊金山場次**（6 月 24–25 日）的完整資料，工具設計上可沿用於未來年度。

---

## 快速開始（直接在 Claude 查詢）

### 效果預覽

| 啟用 connector，查詢進行中 | 詳細回應呈現 |
|---|---|
| ![查詢效果](assets/usage-2-query.png) | ![詳細資訊](assets/usage-3-detail.png) |

```
今年 Figma Config 的第二天有哪些場次？
哪些場次跟 AI 或機器學習有關？
Google 的講者有誰？
給我 Figma Config 2026 的整體摘要。
```

### claude.ai 瀏覽器 — 免安裝

| 步驟 | 操作 | 截圖 |
|---|---|---|
| 1 | 在左側導覽列點選 **Customize** | ![](assets/setup-1-customize.png) |
| 2 | 前往 **Connectors** → 點選 **+** → **Add custom connector** | ![](assets/setup-2-connectors.png) |
| 3 | 填入 **Name**：`Figma Config`（可自行取名）<br>填入 **URL**：`https://figma-config-llms-txt-mcp.vercel.app/mcp`<br>點選 **Add** | ![](assets/setup-3-form.png) |
| 4 | 見到工具權限頁面代表設定成功 | ![](assets/setup-4-success.png) |

### Claude Desktop / Cursor — 本地執行

在 `~/Library/Application Support/Claude/claude_desktop_config.json` 加入：

```json
{
  "mcpServers": {
    "figma-config": {
      "command": "npx",
      "args": ["figma-config-2026-mcp"]
    }
  }
}
```

> 首次使用會即時爬取年會網站（約 90 秒），之後快取 24 小時，後續查詢幾乎即時。

---

## 給開發者

這個 monorepo 由三個套件組成，分工明確：爬取解析、資料匯出、查詢介面各自獨立，可單獨使用或組合運作。

```mermaid
flowchart LR
    A[config.figma.com] -->|爬取 + 解析| B[@yenlai/figma-config-core]
    B --> C[figma-config-llms-txt]
    C -->|輸出 data.json| D[figma-config-2026-mcp]
    D -->|5 個查詢工具| E[Claude]
```

### 套件

| 套件 | 角色 | 說明 | 文件 |
|---|---|---|---|
| `@yenlai/figma-config-core` | 核心引擎 | 爬蟲、解析、格式化；`cli` 與 `mcp` 共同依賴 | [packages/core](packages/core) |
| `figma-config-llms-txt` | 資料生產者 | 執行爬取流程，輸出 `data.json`、Markdown、`llms.txt` | [packages/cli](packages/cli) |
| `figma-config-2026-mcp` | 查詢介面 | 讀取 `data.json`，透過 MCP 協定提供 5 個工具給 Claude | [packages/mcp](packages/mcp) |

各套件均有獨立的 README，提供完整的安裝與使用說明。

---

## License

MIT
