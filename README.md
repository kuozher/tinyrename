<div align="center">

# TinyRename

<p align="center">
  <strong>極簡、快速、直覺的 Windows 批次檔案／資料夾重新命名工具</strong><br>
  <em>對標 Figma Rename 對話框哲學，用點擊取代記憶複雜語法</em>
</p>

<p align="center">
  <a href="README.en.md">English</a> •
  <a href="#-介面預覽--screenshots">介面預覽</a> •
  <a href="#-下載安裝--download">下載安裝</a> •
  <a href="#-核心特色--features">核心特色</a> •
  <a href="#-作者碎碎唸">作者碎碎唸</a> •
  <a href="#-ai-揭露--ai-disclosure">AI 揭露</a>
</p>

[![Release](https://img.shields.io/github/v/release/kuozher/tinyrename?style=flat-square&color=056547)](https://github.com/kuozher/tinyrename/releases)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=flat-square)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-Windows%2010%20%7C%2011-0078D6.svg?style=flat-square)](https://github.com/kuozher/tinyrename)

</div>

---

## 📸 介面預覽 / Screenshots

| 啟動空狀態（支援全視窗拖放） | 匯入檔案即時預覽 Diff |
| :---: | :---: |
| ![啟動空狀態](docs/screenshots/screenshot_startup_min.png) | ![檔案匯入](docs/screenshots/screenshot_item_in_min.png) |

| 多重規則管線鏈（Pipeline Bar）與常用範本 | 序號增減與即時命名結果對照 |
| :---: | :---: |
| ![多步驟管線鏈](docs/screenshots/screenshot_steps_min.png) | ![序號與預覽](docs/screenshots/screenshot_end_min.png) |

<div align="center">
  <p><strong>💡 內建「瞭解用法」語法速查 Popover</strong></p>
  <img src="docs/screenshots/screenshot_learn_more_min.png" alt="語法速查教學" width="560" />
</div>

---

## 💬 作者碎碎唸

> 我因為看不懂正則，然後覺得 figma 比較順手，所以就迅速的做了簡單的設定，絕大多數時候雖然僅僅只是讓多個檔案加上序號，但能少一事就少，方便為主。

---

## 🤖 AI 揭露 / AI Disclosure

> 本專案使用 google gemini CLI (agy) 調用 opus 4.6 進行 PRD，由 gemini 3.8 flash (high) 實做，後續 UI、邏輯、操作和驗證等等則由我人工進行。

---

## 📥 下載安裝 / Download

請至 [GitHub Releases 最新發布頁面](https://github.com/kuozher/tinyrename/releases) 下載：

| 版本類型 | 檔案名稱 | 說明 |
| :--- | :--- | :--- |
| **自動安裝版 (NSIS)** | `TinyRename_0.1.0_x64-setup.exe` | 推薦使用。安裝精靈自動為檔案與資料夾註冊 Windows 右鍵選單，卸載時乾淨清除，體積僅 1.4 MB。 |
| **便攜免安裝版 (ZIP)** | `TinyRename_0.1.0_x64-portable.zip` | 解壓即用。內含獨立執行檔與一鍵註冊／解除右鍵選單的 `.bat` 腳本。 |

---

## ✨ 核心特色 / Features

- 🎨 **Figma 式直覺體驗**：以語意化 Token 按鈕（`現有名稱`、`日期`、`序號 ↑`、`序號 ↓`）取代繁瑣正則，點擊即時組合。
- 🔗 **多重規則管線鏈（Rule Chaining Pipeline）**：支援逐步新增多道命名工序（例如：第一步清除前綴 ➔ 第二步統一小寫 ➔ 第三步追加流水號），步驟切換即時連動。
- ⚡ **常用範本庫（Presets）**：內建相片日期、文件編號、小寫底線等多種經典範本，並支援一鍵將當前步驟儲存為個人專屬範本。
- 🖱 **Windows 右鍵深度整合（單實例喚醒）**：檔案總管中無論單檔或一次框選多個檔案/資料夾按右鍵，自動彙整於同一個視窗，絕不重複彈出多重視窗。
- ⚡ **極致輕量與千檔效能**：Tauri 2 + Rust 原生核心，記憶體佔用極低；預覽表格搭配原生虛擬化渲染技術，處理上千個檔案依舊 60 FPS 順暢滾動。
- 🛡 **多重安全防護機制**：
  - **副檔名自動鎖定保護**：任何更名操作絕對不影響原始副檔名。
  - **即時同名／非法字元攔截**：同名衝突、非法檔名符號立即高亮紅底並鎖定執行按鈕。
  - **Windows MAX_PATH 260 字元超長預警**：及早攔截 Windows 底層檔名長度限制，防範 IO 崩潰。
  - **Windows 大小寫安全重命名**：完美處理 NTFS 檔案系統對僅大小寫變更的更名問題。
- ↩ **一鍵安全復原（Undo）**：完成更名後支援一鍵復原或按下 `Ctrl+Z` 復原上一批操作，歷史紀錄自動儲存。
- 🌐 **雙語與跨主題無障礙**：繁體中文與 English 即時切換；深淺主題自適應切換，色彩對比度符合 WCAG AAA 標準。

---

## 🏷 Token 語法一覽 / Syntax Reference

| 標籤按鈕 | Token 語法 | 說明 | 範例 |
| :--- | :--- | :--- | :--- |
| **現有名稱** | `$name` | 原始檔名主體（不含副檔名） | `photo_$name` → `photo_IMG_01.jpg` |
| **序號 ↑** | `$NN` | 遞增序號，`N` 數量決定補零位數 | `$N` (1), `$NN` (01), `$NNN` (001) |
| **序號 ↓** | `$nn` | 遞減序號，`n` 數量決定補零位數 | `$nn` (05, 04, 03...) |
| **日期** | `$date` | 檔案修改日期（預設 YYYY-MM-DD） | `photo_$date` → `photo_2026-04-01.jpg` |
| **自訂日期** | `$date(...)` | 支援自訂格式（如 `YYYYMMDD`） | `$date(YYYYMMDD)` → `20260401` |
| **文字跳脫** | `$$` | 輸出原文字元 `$` | `item_$$100` → `item_$100.txt` |

- **序號微調**：當命名規則中輸入序號時，自動展開 `起始值 (Start)` 與 `間隔 (Step)` 微調按鈕。
- **大小寫規整**：支援「無 / 大寫 / 小寫 / 字首大寫（Title Case）」，一鍵對最終輸出結果規整。
- **篩選條件（Match）**：可輸入純文字篩選，或點擊 `.*` 切換為標準正則表達式，僅針對匹配部分進行更動。

---

## 🛠 本地開發與編譯 / Development

### 環境需求
- [Node.js](https://nodejs.org/) (18+) & npm
- [Rust](https://www.rust-lang.org/) (1.77+) & Cargo
- Windows 10 / 11

### 常用指令
```bash
# 1. 安裝依賴
npm install

# 2. 本地開發模式 (熱重載)
npm run tauri dev

# 3. 執行單元測試
npm test

# 4. 編譯發布版安裝包 (產出 NSIS 安裝檔)
npx tauri build
```

---

## 📄 開源授權 / License

本專案採用 [MIT License](LICENSE) 授權開源。
