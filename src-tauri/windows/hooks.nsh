!macro NSIS_HOOK_POSTINSTALL
  # Register context menu for all files (*)
  WriteRegStr HKCU "Software\Classes\*\shell\TinyRename" "" "使用 TinyRename 重新命名"
  WriteRegStr HKCU "Software\Classes\*\shell\TinyRename" "Icon" '"$INSTDIR\TinyRename.exe",0'
  WriteRegStr HKCU "Software\Classes\*\shell\TinyRename\command" "" '"$INSTDIR\TinyRename.exe" "%1"'

  # Register context menu for directories
  WriteRegStr HKCU "Software\Classes\Directory\shell\TinyRename" "" "使用 TinyRename 重新命名"
  WriteRegStr HKCU "Software\Classes\Directory\shell\TinyRename" "Icon" '"$INSTDIR\TinyRename.exe",0'
  WriteRegStr HKCU "Software\Classes\Directory\shell\TinyRename\command" "" '"$INSTDIR\TinyRename.exe" "%1"'
!macroend

!macro NSIS_HOOK_POSTUNINSTALL
  # Clean up registry keys on uninstall
  DeleteRegKey HKCU "Software\Classes\*\shell\TinyRename"
  DeleteRegKey HKCU "Software\Classes\Directory\shell\TinyRename"
!macroend
