use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::Manager;

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct FileItem {
    pub id: String,
    pub path: String,
    pub parent_dir: String,
    pub original_name: String,
    pub stem: String,
    pub extension: String,
    pub is_dir: bool,
    pub size: u64,
    pub modified_timestamp: u64,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct RenameOperation {
    pub id: String,
    pub old_path: String,
    pub new_path: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct RenameFailure {
    pub old_path: String,
    pub new_path: String,
    pub error: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct RenameHistoryItem {
    pub old_path: String,
    pub new_path: String,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct BatchRenameResult {
    pub success_count: usize,
    pub failures: Vec<RenameFailure>,
    pub history: Vec<RenameHistoryItem>,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Debug)]
pub struct AppConfig {
    pub language: String,
    pub theme: String,
}

impl Default for AppConfig {
    fn default() -> Self {
        Self {
            language: "zh-TW".to_string(),
            theme: "system".to_string(),
        }
    }
}

fn parse_file_item(path_str: &str) -> Option<FileItem> {
    let path = Path::new(path_str);
    if !path.exists() {
        return None;
    }

    let is_dir = path.is_dir();
    let original_name = match path.file_name() {
        Some(name) => name.to_string_lossy().to_string(),
        None => return None,
    };

    let parent_dir = match path.parent() {
        Some(parent) => parent.to_string_lossy().to_string(),
        None => String::new(),
    };

    let metadata = fs::metadata(path).ok();
    let size = metadata.as_ref().map(|m| m.len()).unwrap_or(0);
    let modified_timestamp = metadata
        .and_then(|m| m.modified().ok())
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs())
        .unwrap_or(0);

    let (stem, extension) = if is_dir {
        (original_name.clone(), String::new())
    } else {
        // If file starts with dot and has no other dot (e.g. .gitignore)
        let ext = path.extension().map(|e| format!(".{}", e.to_string_lossy())).unwrap_or_default();
        let stem = path.file_stem().map(|s| s.to_string_lossy().to_string()).unwrap_or_else(|| original_name.clone());
        (stem, ext)
    };

    let full_path = path.to_string_lossy().to_string();

    Some(FileItem {
        id: full_path.clone(),
        path: full_path,
        parent_dir,
        original_name,
        stem,
        extension,
        is_dir,
        size,
        modified_timestamp,
    })
}

#[tauri::command]
fn get_initial_files() -> Vec<FileItem> {
    let args: Vec<String> = std::env::args().skip(1).collect();
    let mut items = Vec::new();
    let mut seen = HashSet::new();

    for arg in args {
        if arg.starts_with('-') {
            continue;
        }

        if let Some(item) = parse_file_item(&arg) {
            if seen.insert(item.path.clone()) {
                items.push(item);
            }
        }
    }

    items
}

#[tauri::command]
fn get_files_info(paths: Vec<String>) -> Vec<FileItem> {
    let mut items = Vec::new();
    let mut seen = HashSet::new();

    for path_str in paths {
        if let Some(item) = parse_file_item(&path_str) {
            if seen.insert(item.path.clone()) {
                items.push(item);
            }
        }
    }

    items
}

fn execute_rename_batch(operations: Vec<RenameOperation>) -> BatchRenameResult {
    let mut success_count = 0;
    let mut failures = Vec::new();
    let mut history = Vec::new();

    for op in operations {
        let old_path = Path::new(&op.old_path);
        let new_path = Path::new(&op.new_path);

        if !old_path.exists() {
            failures.push(RenameFailure {
                old_path: op.old_path.clone(),
                new_path: op.new_path.clone(),
                error: "原始檔案不存在 / Source file does not exist".to_string(),
            });
            continue;
        }

        // Check if old_path and new_path are identical
        if op.old_path == op.new_path {
            success_count += 1;
            continue;
        }

        // Case-only rename check on Windows (e.g. image.jpg -> IMAGE.jpg)
        let is_case_only_rename = op.old_path.to_lowercase() == op.new_path.to_lowercase();

        if is_case_only_rename {
            // Safe two-step rename to handle Windows case-insensitivity
            let timestamp = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map(|d| d.as_nanos())
                .unwrap_or(0);
            let temp_name = format!("{}.tmp_tinyrename_{}_{}", op.old_path, std::process::id(), timestamp);
            let temp_path = Path::new(&temp_name);

            if let Err(e) = fs::rename(old_path, temp_path) {
                failures.push(RenameFailure {
                    old_path: op.old_path.clone(),
                    new_path: op.new_path.clone(),
                    error: format!("暫存重新命名失敗: {}", e),
                });
                continue;
            }

            if let Err(e) = fs::rename(temp_path, new_path) {
                let _ = fs::rename(temp_path, old_path);
                failures.push(RenameFailure {
                    old_path: op.old_path.clone(),
                    new_path: op.new_path.clone(),
                    error: format!("重新命名失敗: {}", e),
                });
                continue;
            }

            success_count += 1;
            history.push(RenameHistoryItem {
                old_path: op.old_path,
                new_path: op.new_path,
            });
            continue;
        }

        // If new target already exists and is a different file
        if new_path.exists() {
            failures.push(RenameFailure {
                old_path: op.old_path.clone(),
                new_path: op.new_path.clone(),
                error: "目標檔案已存在 / Destination file already exists".to_string(),
            });
            continue;
        }

        // Standard rename
        match fs::rename(old_path, new_path) {
            Ok(_) => {
                success_count += 1;
                history.push(RenameHistoryItem {
                    old_path: op.old_path,
                    new_path: op.new_path,
                });
            }
            Err(e) => {
                failures.push(RenameFailure {
                    old_path: op.old_path.clone(),
                    new_path: op.new_path.clone(),
                    error: e.to_string(),
                });
            }
        }
    }

    BatchRenameResult {
        success_count,
        failures,
        history,
    }
}

fn save_history_log(app: &tauri::AppHandle, history: &[RenameHistoryItem]) {
    if history.is_empty() {
        return;
    }
    let mut config_path = get_config_file_path(app);
    if config_path.pop() {
        let history_dir = config_path.join("history");
        let _ = fs::create_dir_all(&history_dir);
        let timestamp = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        let log_file = history_dir.join(format!("history_{}.json", timestamp));
        if let Ok(json) = serde_json::to_string_pretty(history) {
            let _ = fs::write(log_file, json);
        }
    }
}

#[tauri::command]
fn rename_files(app: tauri::AppHandle, operations: Vec<RenameOperation>) -> BatchRenameResult {
    let result = execute_rename_batch(operations);
    if !result.history.is_empty() {
        save_history_log(&app, &result.history);
    }
    result
}

#[tauri::command]
fn undo_rename(operations: Vec<RenameHistoryItem>) -> BatchRenameResult {
    // Reverse the rename items (new_path becomes old_path)
    let reverse_ops: Vec<RenameOperation> = operations
        .into_iter()
        .rev()
        .enumerate()
        .map(|(i, item)| RenameOperation {
            id: format!("undo_{}", i),
            old_path: item.new_path,
            new_path: item.old_path,
        })
        .collect();

    execute_rename_batch(reverse_ops)
}

fn get_config_file_path(app: &tauri::AppHandle) -> PathBuf {
    // 1. Check if config.json exists next to current executable (portable mode)
    if let Ok(exe_path) = std::env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let portable_cfg = exe_dir.join("config.json");
            if portable_cfg.exists() {
                return portable_cfg;
            }
        }
    }

    // 2. Standard AppData directory
    if let Ok(app_dir) = app.path().app_data_dir() {
        return app_dir.join("config.json");
    }

    PathBuf::from("config.json")
}

#[tauri::command]
fn load_config(app: tauri::AppHandle) -> AppConfig {
    let path = get_config_file_path(&app);
    if let Ok(content) = fs::read_to_string(&path) {
        if let Ok(config) = serde_json::from_str::<AppConfig>(&content) {
            return config;
        }
    }
    AppConfig::default()
}

#[tauri::command]
fn save_config(app: tauri::AppHandle, config: AppConfig) -> Result<(), String> {
    let path = get_config_file_path(&app);
    if let Some(parent) = path.parent() {
        let _ = fs::create_dir_all(parent);
    }

    let json = serde_json::to_string_pretty(&config).map_err(|e| e.to_string())?;
    fs::write(&path, json).map_err(|e| e.to_string())?;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            get_initial_files,
            get_files_info,
            rename_files,
            undo_rename,
            load_config,
            save_config
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
