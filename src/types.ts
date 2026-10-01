export interface FileItem {
  id: string;
  path: string;
  parent_dir: string;
  original_name: string;
  stem: string;
  extension: string;
  is_dir: boolean;
  size: number;
  modified_timestamp: number;
}

export type CaseMode = 'none' | 'upper' | 'lower' | 'title';

export interface RenameOperation {
  id: string;
  old_path: string;
  new_path: string;
}

export interface RenameFailure {
  old_path: string;
  new_path: string;
  error: string;
}

export interface RenameHistoryItem {
  old_path: string;
  new_path: string;
}

export interface BatchRenameResult {
  success_count: number;
  failures: RenameFailure[];
  history: RenameHistoryItem[];
}

export interface DiffSegment {
  text: string;
  type: 'same' | 'added' | 'removed';
}

export interface RenamePreviewItem {
  file: FileItem;
  selected: boolean;
  isMatch: boolean;
  newStem: string;
  newName: string;
  newPath: string;
  hasChanged: boolean;
  conflictReason?: string;
  diffSegments: DiffSegment[];
}

export type Language = 'zh-TW' | 'en';
export type Theme = 'system' | 'light' | 'dark';

export interface AppConfig {
  language: Language;
  theme: Theme;
}
