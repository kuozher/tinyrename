@echo off
chcp 65001 >nul
echo 正在註冊 TinyRename 右鍵選單...
echo Registering TinyRename context menu...

set "TARGET_EXE=%~dp0src-tauri\target\release\tinyrename.exe"
if not exist "%TARGET_EXE%" (
    set "TARGET_EXE=%~dp0tinyrename.exe"
)

if not exist "%TARGET_EXE%" (
    echo [警告/Warning] 找不到 tinyrename.exe，將使用當前目錄作為參照路徑。
    set "TARGET_EXE=%~dp0tinyrename.exe"
)

:: 針對所有檔案註冊右鍵選單 (HKCU 無需管理員權限)
reg add "HKCU\Software\Classes\*\shell\TinyRename" /ve /t REG_SZ /d "使用 TinyRename 重新命名" /f >nul
reg add "HKCU\Software\Classes\*\shell\TinyRename" /v "Icon" /t REG_SZ /d "\"%TARGET_EXE%\",0" /f >nul
reg add "HKCU\Software\Classes\*\shell\TinyRename\command" /ve /t REG_SZ /d "\"%TARGET_EXE%\" \"%%1\"" /f >nul

:: 針對資料夾註冊右鍵選單
reg add "HKCU\Software\Classes\Directory\shell\TinyRename" /ve /t REG_SZ /d "使用 TinyRename 重新命名" /f >nul
reg add "HKCU\Software\Classes\Directory\shell\TinyRename" /v "Icon" /t REG_SZ /d "\"%TARGET_EXE%\",0" /f >nul
reg add "HKCU\Software\Classes\Directory\shell\TinyRename\command" /ve /t REG_SZ /d "\"%TARGET_EXE%\" \"%%1\"" /f >nul

echo.
echo [成功/Success] TinyRename 右鍵選單已成功註冊至目前使用者！
echo Context menu successfully registered for the current user!
echo.
pause
