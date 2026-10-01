import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getCurrentWebview } from '@tauri-apps/api/webview';
import {
  FileItem,
  RenameOperation,
  RenameHistoryItem,
  BatchRenameResult,
  AppConfig,
  Language,
  Theme,
  CaseMode,
  RuleStep,
  PresetItem,
} from './types';
import { computePipelinePreviews } from './lib/renameEngine';
import { t } from './lib/i18n';
import { HelpPopover } from './components/HelpPopover';
import { PipelineBar } from './components/PipelineBar';
import {
  FolderUp,
  X,
  Languages,
  AlertTriangle,
  CheckSquare,
  Square,
  Trash2,
  ChevronDown,
  Plus,
  Minus,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import './App.css';

interface ToastState {
  message: string;
  canUndo: boolean;
}

export function App() {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Rule Pipeline state
  const [steps, setSteps] = useState<RuleStep[]>([
    {
      id: 'step_1',
      matchPattern: '',
      isRegex: false,
      renameTemplate: '$name',
      startFrom: 1,
      step: 1,
      caseMode: 'none',
    },
  ]);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [currentPresetId, setCurrentPresetId] = useState<string | null>(null);

  // App UI state
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isDraggingOver, setIsDraggingOver] = useState<boolean>(false);
  const [toastState, setToastState] = useState<ToastState | null>(null);
  const [isRenaming, setIsRenaming] = useState<boolean>(false);
  const [lastRenameHistory, setLastRenameHistory] = useState<RenameHistoryItem[] | null>(null);

  // Config state
  const [config, setConfig] = useState<AppConfig>({
    language: 'zh-TW',
    theme: 'system',
    customPresets: [],
  });

  const renameInputRef = useRef<HTMLInputElement>(null);
  const toastTimeoutRef = useRef<number | null>(null);

  // 1. Initial configuration and files
  // Helper to merge new files into the list without duplicates and ensure they are selected
  const mergeNewFiles = useCallback((newItems: FileItem[]) => {
    if (!newItems || newItems.length === 0) return;
    setFiles((prev) => {
      const existingPaths = new Set(prev.map((p) => p.path));
      const toAdd = newItems.filter((item) => !existingPaths.has(item.path));
      if (toAdd.length === 0) return prev;
      const updated = [...prev, ...toAdd];
      setSelectedIds(new Set(updated.map((f) => f.id)));
      return updated;
    });
  }, []);

  // 1. Initial configuration and files loading
  useEffect(() => {
    // Load persisted configuration
    invoke<AppConfig>('load_config')
      .then((cfg) => {
        if (cfg) {
          setConfig(cfg);
        }
      })
      .catch((err) => console.error('Failed to load config:', err));

    // Fetch initial files (primary CLI args + any pending secondary instance items)
    const fetchInitialFiles = () => {
      invoke<FileItem[]>('get_initial_files')
        .then((initialFiles) => {
          if (initialFiles && initialFiles.length > 0) {
            mergeNewFiles(initialFiles);
          }
        })
        .catch((err) => console.error('Failed to get initial files:', err));
    };

    fetchInitialFiles();

    // Re-check after 350ms in case secondary instances were launched with slight delay by Windows Explorer
    const retryTimer = setTimeout(fetchInitialFiles, 350);
    return () => clearTimeout(retryTimer);
  }, [mergeNewFiles]);

  // 1b. Listen to incoming files from secondary instances (e.g. multi-file right-click selection)
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<FileItem[]>('single-instance-files', (event) => {
      const incoming = event.payload;
      if (incoming && incoming.length > 0) {
        mergeNewFiles(incoming);
      }
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => console.error('Failed to listen to single-instance-files:', err));

    return () => {
      if (unlisten) unlisten();
    };
  }, [mergeNewFiles]);

  // 2. Setup theme
  useEffect(() => {
    const root = document.documentElement;
    if (config.theme === 'system') {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    } else {
      root.setAttribute('data-theme', config.theme);
    }
  }, [config.theme]);

  // 3. Listen to system dark mode changes if on system theme
  useEffect(() => {
    if (config.theme !== 'system') return;

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (e: MediaQueryListEvent) => {
      document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [config.theme]);

  // 4. Update Window Title
  useEffect(() => {
    const title = files.length > 0
      ? t(config.language, 'renameItems', { count: selectedIds.size })
      : t(config.language, 'appTitle');

    try {
      getCurrentWindow().setTitle(title);
    } catch {
      // Ignore if not permitted
    }
  }, [files.length, selectedIds.size, config.language]);

  // 5. Tauri drag and drop handling
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    try {
      getCurrentWebview()
        .onDragDropEvent((event) => {
          if (event.payload.type === 'enter') {
            setIsDraggingOver(true);
          } else if (event.payload.type === 'leave') {
            setIsDraggingOver(false);
          } else if (event.payload.type === 'drop') {
            setIsDraggingOver(false);
            const paths = event.payload.paths;
            if (paths && paths.length > 0) {
              invoke<FileItem[]>('get_files_info', { paths })
                .then((newItems) => {
                  if (newItems && newItems.length > 0) {
                    setFiles((prev) => {
                      const existingPaths = new Set(prev.map((p) => p.path));
                      const toAdd = newItems.filter((item) => !existingPaths.has(item.path));
                      const updated = [...prev, ...toAdd];
                      setSelectedIds(new Set(updated.map((f) => f.id)));
                      return updated;
                    });
                  }
                })
                .catch((err) => console.error('Failed to get files info:', err));
            }
          }
        })
        .then((u) => {
          unlisten = u;
        })
        .catch(() => {
          // Not running inside Tauri webview
        });
    } catch {
      // Fallback
    }

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  // 6. Compute real-time rename preview and conflicts
  const showToast = useCallback((message: string, canUndo: boolean = false, durationMs: number = 4000) => {
    if (toastTimeoutRef.current) {
      clearTimeout(toastTimeoutRef.current);
    }
    setToastState({ message, canUndo });
    toastTimeoutRef.current = window.setTimeout(() => {
      setToastState(null);
    }, durationMs);
  }, []);

  // Active step accessor and updater
  const currentStep = steps[activeStepIndex] || steps[0] || {
    id: 'step_fallback',
    matchPattern: '',
    isRegex: false,
    renameTemplate: '$name',
    startFrom: 1,
    step: 1,
    caseMode: 'none' as CaseMode,
  };

  const updateCurrentStep = (updates: Partial<RuleStep>) => {
    setSteps((prev) => {
      const copy = [...prev];
      const targetIdx = activeStepIndex < copy.length ? activeStepIndex : 0;
      if (copy[targetIdx]) {
        copy[targetIdx] = { ...copy[targetIdx], ...updates };
      }
      return copy;
    });
    setCurrentPresetId(null);
  };

  const handleAddStep = () => {
    const newStepId = `step_${Date.now()}`;
    const newStep: RuleStep = {
      id: newStepId,
      matchPattern: '',
      isRegex: false,
      renameTemplate: '$name',
      startFrom: 1,
      step: 1,
      caseMode: 'none',
    };
    setSteps((prev) => [...prev, newStep]);
    setActiveStepIndex(steps.length);
    setCurrentPresetId(null);
  };

  const handleRemoveStep = (indexToRemove: number) => {
    if (steps.length <= 1) return;
    setSteps((prev) => prev.filter((_, idx) => idx !== indexToRemove));
    if (activeStepIndex >= indexToRemove && activeStepIndex > 0) {
      setActiveStepIndex(activeStepIndex - 1);
    }
    setCurrentPresetId(null);
  };

  const handleSelectPreset = (preset: PresetItem) => {
    const clonedSteps: RuleStep[] = preset.steps.map((s, idx) => ({
      ...s,
      id: `step_${Date.now()}_${idx}`,
    }));
    setSteps(clonedSteps);
    setActiveStepIndex(0);
    setCurrentPresetId(preset.id);
  };

  const handleSaveCurrentAsPreset = (name: string) => {
    const newPreset: PresetItem = {
      id: `preset_custom_${Date.now()}`,
      name,
      steps: steps.map((s) => ({ ...s })),
    };
    const updatedCustom = [...(config.customPresets || []), newPreset];
    const newConfig = { ...config, customPresets: updatedCustom };
    setConfig(newConfig);
    invoke('save_config', { config: newConfig }).catch(console.error);
    setCurrentPresetId(newPreset.id);
    showToast(`✅ ${t(config.language, 'presetSaved', { name })}`);
  };

  const handleDeleteCustomPreset = (presetId: string) => {
    const updatedCustom = (config.customPresets || []).filter((p) => p.id !== presetId);
    const newConfig = { ...config, customPresets: updatedCustom };
    setConfig(newConfig);
    invoke('save_config', { config: newConfig }).catch(console.error);
    if (currentPresetId === presetId) {
      setCurrentPresetId(null);
    }
  };

  // 6. Compute real-time rename preview and conflicts via pipeline
  const { previews, regexError } = useMemo(() => {
    return computePipelinePreviews(files, selectedIds, steps);
  }, [files, selectedIds, steps]);

  const conflicts = useMemo(() => {
    return previews.filter((p) => p.conflictReason);
  }, [previews]);

  const changedCount = useMemo(() => {
    return previews.filter((p) => p.selected && p.hasChanged && !p.conflictReason).length;
  }, [previews]);

  const hasSequenceTokens = useMemo(() => {
    return /\$(?:N+|n+)(?![a-zA-Z])/.test(currentStep.renameTemplate);
  }, [currentStep.renameTemplate]);

  // Insert token at cursor position
  const insertToken = (token: string) => {
    const input = renameInputRef.current;
    if (!input) {
      updateCurrentStep({ renameTemplate: currentStep.renameTemplate + token });
      return;
    }

    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? input.value.length;
    const val = input.value;
    const nextVal = val.substring(0, start) + token + val.substring(end);

    updateCurrentStep({ renameTemplate: nextVal });

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + token.length, start + token.length);
    }, 0);
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const removeFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  const clearAllFiles = () => {
    setFiles([]);
    setSelectedIds(new Set());
    setLastRenameHistory(null);
  };

  // Execute batch rename
  const handleRename = async () => {
    if (conflicts.length > 0 || changedCount === 0 || isRenaming) return;

    setIsRenaming(true);

    const operations: RenameOperation[] = previews
      .filter((p) => p.selected && p.hasChanged)
      .map((p) => ({
        id: p.file.id,
        old_path: p.file.path,
        new_path: p.newPath,
      }));

    try {
      const res = await invoke<BatchRenameResult>('rename_files', { operations });

      if (res.failures.length === 0) {
        setLastRenameHistory(res.history);
        showToast(t(config.language, 'successToast', { count: res.success_count }), true, 6000);

        // Refresh paths in current list to reflect new names
        setFiles((prev) => {
          return prev.map((f) => {
            const preview = previews.find((p) => p.file.id === f.id);
            if (preview && preview.selected && preview.hasChanged) {
              return {
                ...f,
                path: preview.newPath,
                original_name: preview.newName,
                stem: preview.newStem,
              };
            }
            return f;
          });
        });
      } else {
        showToast(`${t(config.language, 'errorToast')}: ${res.failures[0].error}`, false);
      }
    } catch (err: any) {
      showToast(`${t(config.language, 'errorToast')}: ${err?.message || err}`, false);
    } finally {
      setIsRenaming(false);
    }
  };

  // Execute Undo
  const handleUndo = useCallback(async () => {
    if (!lastRenameHistory || lastRenameHistory.length === 0 || isRenaming) return;

    setIsRenaming(true);

    try {
      const res = await invoke<BatchRenameResult>('undo_rename', { operations: lastRenameHistory });

      if (res.failures.length === 0) {
        showToast(t(config.language, 'undoSuccess', { count: res.success_count }), false, 3500);

        // Map reverted paths back: history had old_path -> new_path, now it's reverted back to old_path
        const revertMap = new Map<string, string>();
        for (const item of lastRenameHistory) {
          revertMap.set(item.new_path, item.old_path);
        }

        setFiles((prev) => {
          return prev.map((f) => {
            const originalPath = revertMap.get(f.path);
            if (originalPath) {
              const sep = originalPath.includes('/') ? '/' : '\\';
              const parts = originalPath.split(sep);
              const original_name = parts[parts.length - 1];
              const dotIdx = original_name.lastIndexOf('.');
              const stem = (!f.is_dir && dotIdx > 0) ? original_name.substring(0, dotIdx) : original_name;
              return {
                ...f,
                path: originalPath,
                original_name,
                stem,
              };
            }
            return f;
          });
        });

        setLastRenameHistory(null);
      } else {
        showToast(`${t(config.language, 'errorToast')}: ${res.failures[0].error}`, false);
      }
    } catch (err: any) {
      showToast(`${t(config.language, 'errorToast')}: ${err?.message || err}`, false);
    } finally {
      setIsRenaming(false);
    }
  }, [lastRenameHistory, isRenaming, config.language, showToast]);

  // Global Ctrl+Z / Cmd+Z shortcut for undo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        // If user is editing text in an input field, let native browser undo handle it
        if (document.activeElement?.tagName === 'INPUT') {
          return;
        }
        if (lastRenameHistory && lastRenameHistory.length > 0) {
          e.preventDefault();
          handleUndo();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lastRenameHistory, handleUndo]);

  // Toggle Language
  const toggleLanguage = () => {
    const nextLang: Language = config.language === 'zh-TW' ? 'en' : 'zh-TW';
    const nextConfig: AppConfig = { ...config, language: nextLang };
    setConfig(nextConfig);
    invoke('save_config', { config: nextConfig }).catch(console.error);
  };

  // Change Theme via Dropdown
  const handleThemeChange = (newTheme: Theme) => {
    const nextConfig: AppConfig = { ...config, theme: newTheme };
    setConfig(nextConfig);
    invoke('save_config', { config: nextConfig }).catch(console.error);
  };

  return (
    <div className="app-container">
      {/* Toast Notification with Undo button */}
      {toastState && (
        <div className="toast-container">
          <span>{toastState.message}</span>
          {toastState.canUndo && lastRenameHistory && (
            <button
              type="button"
              className="toast-undo-btn"
              onClick={handleUndo}
            >
              {t(config.language, 'undo')}
            </button>
          )}
        </div>
      )}

      {/* Drag Over Overlay */}
      {isDraggingOver && (
        <div className="drag-overlay">
          <FolderUp size={52} />
          <div className="drag-overlay-text">{t(config.language, 'dropToAdd')}</div>
        </div>
      )}

      {/* App Header (Vertically stacked title & subtitle, no duplicate icon) */}
      <header className="app-header">
        <div className="header-left">
          <span className="header-title">
            {files.length > 0
              ? t(config.language, 'renameItems', { count: selectedIds.size })
              : t(config.language, 'appTitle')}
          </span>
          {files.length > 0 && (
            <span className="header-subtitle">
              {t(config.language, 'totalItems', { total: files.length })}
            </span>
          )}
        </div>

        <div className="header-actions">
          <button
            className="icon-btn"
            onClick={toggleLanguage}
            title={config.language === 'zh-TW' ? 'Switch to English' : '切換為繁體中文'}
            type="button"
          >
            <Languages size={14} style={{ marginRight: 4 }} />
            {config.language === 'zh-TW' ? 'EN' : '繁中'}
          </button>

          {/* Theme Dropdown Select */}
          <div className="theme-select-wrapper">
            <select
              className="theme-select"
              value={config.theme}
              onChange={(e) => handleThemeChange(e.target.value as Theme)}
              aria-label="Theme Selection"
            >
              <option value="system">{t(config.language, 'themeSystem')}</option>
              <option value="light">{t(config.language, 'themeLight')}</option>
              <option value="dark">{t(config.language, 'themeDark')}</option>
            </select>
            <span className="theme-select-arrow">
              <ChevronDown size={13} />
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      {files.length === 0 ? (
        <div className="empty-state">
          <div className="empty-drop-zone">
            <FolderUp size={48} className="empty-icon" />
            <div className="empty-title">{t(config.language, 'emptyTitle')}</div>
            <div className="empty-subtitle">{t(config.language, 'emptySubtitle')}</div>
          </div>
        </div>
      ) : (
        <>
          {/* Rule Configuration Section */}
          <section className="config-section">
            {/* Pipeline Bar: Step tabs on left + Presets dropdown on right */}
            <PipelineBar
              steps={steps}
              activeStepIndex={activeStepIndex}
              language={config.language}
              customPresets={config.customPresets || []}
              currentPresetId={currentPresetId}
              onSelectStep={setActiveStepIndex}
              onAddStep={handleAddStep}
              onRemoveStep={handleRemoveStep}
              onSelectPreset={handleSelectPreset}
              onSaveCurrentAsPreset={handleSaveCurrentAsPreset}
              onDeleteCustomPreset={handleDeleteCustomPreset}
            />

            <div className="field-group">
              <label className="field-label">{t(config.language, 'matchLabel')}</label>
              <div className="input-with-action">
                <input
                  type="text"
                  className={`text-input ${regexError ? 'error' : ''}`}
                  placeholder={t(config.language, 'matchPlaceholder')}
                  value={currentStep.matchPattern}
                  onChange={(e) => updateCurrentStep({ matchPattern: e.target.value })}
                />
                <button
                  type="button"
                  className={`regex-toggle-btn ${currentStep.isRegex ? 'active' : ''}`}
                  onClick={() => updateCurrentStep({ isRegex: !currentStep.isRegex })}
                  title={t(config.language, 'regexTooltip')}
                >
                  .*
                </button>
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">{t(config.language, 'renameToLabel')}</label>
              <input
                ref={renameInputRef}
                type="text"
                className="text-input"
                placeholder={t(config.language, 'renameToPlaceholder')}
                value={currentStep.renameTemplate}
                onChange={(e) => updateCurrentStep({ renameTemplate: e.target.value })}
              />
            </div>

            {/* Token chip buttons + Conditional Sequence Steppers on the right */}
            <div className="token-row">
              <button
                type="button"
                className="token-chip-btn"
                onClick={() => insertToken('$name')}
              >
                {t(config.language, 'tokenCurrentName')}
              </button>
              <button
                type="button"
                className="token-chip-btn"
                onClick={() => insertToken('$date')}
              >
                {t(config.language, 'tokenDate')}
              </button>
              <button
                type="button"
                className="token-chip-btn"
                onClick={() => insertToken('$NN')}
              >
                <span>{t(config.language, 'tokenNumberAsc')}</span>
                <span className="token-arrow-icon">
                  <ArrowUp size={13} strokeWidth={2.6} />
                </span>
              </button>
              <button
                type="button"
                className="token-chip-btn"
                onClick={() => insertToken('$nn')}
              >
                <span>{t(config.language, 'tokenNumberDesc')}</span>
                <span className="token-arrow-icon">
                  <ArrowDown size={13} strokeWidth={2.6} />
                </span>
              </button>

              {/* Sequence Steppers: Appears to the right of sequence tokens when sequence token is in rule */}
              {hasSequenceTokens && (
                <div className="token-steppers-group">
                  <div className="stepper-control">
                    <span className="stepper-label">{t(config.language, 'startFrom')}</span>
                    <div className="stepper-box">
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => updateCurrentStep({ startFrom: currentStep.startFrom - 1 })}
                        title="Decrease"
                      >
                        <Minus size={12} strokeWidth={2.4} />
                      </button>
                      <input
                        type="number"
                        className="stepper-input"
                        value={currentStep.startFrom}
                        onChange={(e) => updateCurrentStep({ startFrom: parseInt(e.target.value, 10) || 0 })}
                      />
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => updateCurrentStep({ startFrom: currentStep.startFrom + 1 })}
                        title="Increase"
                      >
                        <Plus size={12} strokeWidth={2.4} />
                      </button>
                    </div>
                  </div>

                  <div className="stepper-control">
                    <span className="stepper-label">{t(config.language, 'step')}</span>
                    <div className="stepper-box">
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => updateCurrentStep({ step: Math.max(1, currentStep.step - 1) })}
                        title="Decrease"
                      >
                        <Minus size={12} strokeWidth={2.4} />
                      </button>
                      <input
                        type="number"
                        className="stepper-input"
                        min="1"
                        value={currentStep.step}
                        onChange={(e) => updateCurrentStep({ step: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                      />
                      <button
                        type="button"
                        className="stepper-btn"
                        onClick={() => updateCurrentStep({ step: currentStep.step + 1 })}
                        title="Increase"
                      >
                        <Plus size={12} strokeWidth={2.4} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Case conversion segmented control on left + Clear list on right */}
            <div className="case-control-row">
              <div className="case-control-left">
                <span className="case-label">{t(config.language, 'caseLabel')}</span>
                <div className="segmented-case">
                  <button
                    type="button"
                    className={`segmented-btn ${currentStep.caseMode === 'none' ? 'active' : ''}`}
                    onClick={() => updateCurrentStep({ caseMode: 'none' })}
                  >
                    {t(config.language, 'caseNone')}
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${currentStep.caseMode === 'upper' ? 'active' : ''}`}
                    onClick={() => updateCurrentStep({ caseMode: 'upper' })}
                  >
                    {t(config.language, 'caseUpper')}
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${currentStep.caseMode === 'lower' ? 'active' : ''}`}
                    onClick={() => updateCurrentStep({ caseMode: 'lower' })}
                  >
                    {t(config.language, 'caseLower')}
                  </button>
                  <button
                    type="button"
                    className={`segmented-btn ${currentStep.caseMode === 'title' ? 'active' : ''}`}
                    onClick={() => updateCurrentStep({ caseMode: 'title' })}
                  >
                    {t(config.language, 'caseTitle')}
                  </button>
                </div>
              </div>

              {files.length > 0 && (
                <div className="case-control-right">
                  <button
                    className="clear-list-btn"
                    onClick={clearAllFiles}
                    title={t(config.language, 'clearAll')}
                    type="button"
                  >
                    <Trash2 size={13} style={{ marginRight: 4 }} />
                    <span>{t(config.language, 'clearAll')}</span>
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* Conflict Banner */}
          {conflicts.length > 0 && (
            <div className="conflict-banner">
              <AlertTriangle size={16} />
              <span>{t(config.language, 'conflictWarning', { count: conflicts.length })}</span>
            </div>
          )}

          {/* Preview Table */}
          <section className="preview-section">
            <div className="preview-table-container">
              <table className="preview-table">
                <thead>
                  <tr>
                    <th className="col-checkbox">
                      <button
                        type="button"
                        onClick={toggleSelectAll}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                      >
                        {selectedIds.size === files.length ? (
                          <CheckSquare size={15} color="var(--accent-color)" />
                        ) : (
                          <Square size={15} color="var(--text-muted)" />
                        )}
                      </button>
                    </th>
                    <th className="col-original">{t(config.language, 'colOriginal')}</th>
                    <th className="col-preview">{t(config.language, 'colPreview')}</th>
                    <th className="col-action"></th>
                  </tr>
                </thead>
                <tbody>
                  {previews.map((item) => (
                    <tr
                      key={item.file.id}
                      className={item.conflictReason ? 'has-conflict' : ''}
                    >
                      <td className="col-checkbox">
                        <button
                          type="button"
                          onClick={() => toggleSelectOne(item.file.id)}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                        >
                          {item.selected ? (
                            <CheckSquare size={15} color="var(--accent-color)" />
                          ) : (
                            <Square size={15} color="var(--text-muted)" />
                          )}
                        </button>
                      </td>

                      <td className="col-original" title={item.file.original_name}>
                        {item.file.original_name}
                      </td>

                      <td className="col-preview" title={item.newName}>
                        {!item.selected || !item.isMatch || !item.hasChanged ? (
                          <span className="text-dimmed">{item.newName}</span>
                        ) : (
                          <>
                            {item.diffSegments.map((seg, i) => (
                              <span
                                key={i}
                                className={seg.type === 'added' ? 'diff-added' : 'diff-same'}
                              >
                                {seg.text}
                              </span>
                            ))}
                          </>
                        )}
                        {item.conflictReason && (
                          <span className="conflict-tag">⚠ {item.conflictReason}</span>
                        )}
                      </td>

                      <td className="col-action">
                        <button
                          type="button"
                          className="delete-row-btn"
                          onClick={() => removeFile(item.file.id)}
                          title={t(config.language, 'colActions')}
                        >
                          <X size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {/* Footer */}
      <footer className="app-footer">
        <div className="footer-left">
          <button
            type="button"
            className="learn-more-link"
            onClick={() => setIsHelpOpen(true)}
          >
            {t(config.language, 'learnMore')}
          </button>
        </div>

        <div className="footer-right">
          <button
            type="button"
            className="btn-secondary"
            onClick={clearAllFiles}
          >
            {t(config.language, 'cancel')}
          </button>
          <button
            type="button"
            className="btn-primary"
            disabled={conflicts.length > 0 || changedCount === 0 || isRenaming}
            onClick={handleRename}
          >
            {changedCount > 0
              ? t(config.language, 'renameCountBtn', { count: changedCount })
              : t(config.language, 'renameBtn')}
          </button>
        </div>
      </footer>

      {/* Frosted Popover Modal */}
      <HelpPopover
        isOpen={isHelpOpen}
        onClose={() => setIsHelpOpen(false)}
        lang={config.language}
      />
    </div>
  );
}

export default App;
