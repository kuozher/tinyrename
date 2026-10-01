# TinyRename

> 極簡、快速、直覺的 Windows 批次檔案／資料夾重新命名工具。  
> Minimalist, fast, and intuitive batch renaming tool for Windows, inspired by Figma's Rename dialog.

---

## ✨ 核心特色 / Key Features

- 🎨 **Figma 式直覺操作**：以 Token 按鈕（現有名稱、序號 ↑、序號 ↓、修改日期）取代手寫複雜正則表達式，點擊即組合。
- ⚡ **極致輕量**：採用 Tauri 2 + Rust 後端，Release 執行檔**僅約 4.3 MB**，啟動秒開，記憶體佔用極低。
- 🔄 **大小寫一鍵轉換**：支援「原始 / 大寫 / 小寫 / 字首大寫（Title Case）」，靈活套用於最終檔名。
- 📅 **日期格式化支援**：內建 `$date` 與 `$date(YYYYMMDD)`，自動提取檔案實際修改日期。
- ↩ **安全復原 (Undo)**：重新命名後支援一鍵復原或按下 `Ctrl+Z` 還原上次操作，自動記錄操作日誌。
- 🔍 **即時預覽與純淨 Diff**：即時反映命名結果，無干擾色塊，以主題翡翠綠精準標示變更部分。
- 🛡 **安全防護**：
  - **副檔名自動保護**：任何操作均不影響原始副檔名。
  - **即時衝突偵測**：同名衝突、非法字元立即高亮並禁用執行按鈕。
  - **Windows 大小寫改名安全處理**：解決 NTFS 系統下大小寫重命名可能失效的問題。
- 🌐 **雙語支援**：繁體中文與 English 即時切換，設定自動記憶。
- 🌓 **主題外觀**：支援跟隨 Windows 系統外觀、手動下拉切換深色（Dark）或淺色（Light）模式，符合 WCAG AAA 高對比無障礙要求。
- 🪟 **原生視窗體驗**：預設視窗 640×640 px（最小寬度 600px 防破版），保留 Windows 系統原生標題列與縮放關閉按鈕。

---

## 🚀 啟動方式 / Launch Modes

### 1. 右鍵選單啟動（推薦）
在 Windows 檔案總管選取多個檔案或資料夾，點擊右鍵選單中的 **「使用 TinyRename 重新命名」**，程式將直接載入選取項目進入操作介面。

> **免安裝版註冊右鍵選單**：直接雙擊執行目錄下的 `register-context-menu.bat`（無需管理員權限）。如需移除，執行 `unregister-context-menu.bat` 即可。

### 2. 獨立開啟拖曳
直接執行 `tinyrename.exe`，將檔案或資料夾拖曳進視窗中央的虛線拖放區即可開始重新命名；在操作介面中也可隨時繼續拖入追加檔案。

---

## 🏷 Token 語法速查 / Syntax Reference

| 按鈕 | Token 語法 | 說明 | 範例 |
|------|-----------|------|------|
| **現有名稱** | `$name` | 插入原始檔名（不含副檔名） | `photo_$name` → `photo_IMG_01.jpg` |
| **序號 ↑** | `$NN` | 遞增序號，`N` 數量代表補零位數 | `$N` (1), `$NN` (01), `$NNN` (001) |
| **序號 ↓** | `$nn` | 遞減序號，`n` 數量代表補零位數 | `$nn` (05, 04, 03...) |
| **修改日期** | `$date` | 插入檔案修改日期（預設 YYYY-MM-DD） | `photo_$date` → `photo_2026-04-01.jpg` |
| **自訂日期** | `$date(...)` | 支援自訂格式如 YYYYMMDD | `$date(YYYYMMDD)` → `20260401` |
| **文字跳脫** | `$$` | 輸出原文字元 `$` | `price_$$100` → `price_$100.txt` |

- **大小寫切換**：可選擇「原始 / 大寫 / 小寫 / 字首大寫」，即時對所有輸出結果進行大小寫規整。
- **序號設定**：輸入包含 `$N` 或 `$n` 時，介面會自動展開 `起始值 (Start from)` 與 `間隔 (Interval)` 的 Stepper 調整控制項。
- **篩選條件 (Match)**：若輸入篩選條件，只會替換匹配文字；留空時則將整個檔名主體替換為新名稱模板。支援點擊 `.*` 切換正則表達式模式。

---

## 🛠 開發與編譯 / Development & Build

### 需求環境
- Node.js 18+ & npm
- Rust 1.77+ (Cargo)
- Windows 10/11

### 本地開發
```bash
# 安裝依賴
npm install

# 執行單元測試 (Vitest)
npm test

# 啟動前端與 Tauri 開發環境
npm run tauri dev
```

### 發行版編譯
```bash
# 前端型別檢查與打包
npm run build

# 編譯極簡二進位 Release 執行檔 (約 4.3 MB)
cargo build --release --manifest-path src-tauri/Cargo.toml

# 產出的執行檔位於:
# src-tauri\target\release\tinyrename.exe 及根目錄 tinyrename.exe
```

---

## 📄 License
MIT License.
