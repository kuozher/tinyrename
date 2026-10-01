@echo off
chcp 65001 >nul
echo 正在移除 TinyRename 右鍵選單...
echo Unregistering TinyRename context menu...

reg delete "HKCU\Software\Classes\*\shell\TinyRename" /f >nul 2>&1
reg delete "HKCU\Software\Classes\Directory\shell\TinyRename" /f >nul 2>&1

echo.
echo [成功/Success] TinyRename 右鍵選單已成功移除！
echo Context menu successfully removed!
echo.
pause
