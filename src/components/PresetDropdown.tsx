import React, { useState, useRef, useEffect } from 'react';
import { PresetItem, Language } from '../types';
import { BUILTIN_PRESETS } from '../lib/presets';
import { t, TranslationKey } from '../lib/i18n';
import { Bookmark, ChevronDown, Trash2, Check, Plus } from 'lucide-react';

interface PresetDropdownProps {
  language: Language;
  customPresets: PresetItem[];
  currentPresetId: string | null;
  onSelectPreset: (preset: PresetItem) => void;
  onSaveCurrentAsPreset: (name: string) => void;
  onDeleteCustomPreset: (id: string) => void;
}

export const PresetDropdown: React.FC<PresetDropdownProps> = ({
  language,
  customPresets,
  currentPresetId,
  onSelectPreset,
  onSaveCurrentAsPreset,
  onDeleteCustomPreset,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close when clicked outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setIsSaving(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isSaving && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isSaving]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPresetName.trim()) return;
    onSaveCurrentAsPreset(newPresetName.trim());
    setNewPresetName('');
    setIsSaving(false);
    setIsOpen(false);
  };

  const getPresetDisplayName = (preset: PresetItem): string => {
    if (preset.isBuiltin) {
      return t(language, preset.name as TranslationKey);
    }
    return preset.name;
  };

  return (
    <div className="preset-dropdown-container" ref={dropdownRef}>
      <button
        type="button"
        className={`preset-trigger-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title={t(language, 'presetsTitle')}
      >
        <Bookmark size={13} style={{ marginRight: 5 }} />
        <span>{t(language, 'presetsDropdown')}</span>
        <ChevronDown size={12} style={{ marginLeft: 4 }} />
      </button>

      {isOpen && (
        <div className="preset-menu">
          {/* Section: Built-in */}
          <div className="preset-section-header">{t(language, 'presetBuiltinSection')}</div>
          <div className="preset-list">
            {BUILTIN_PRESETS.map((preset) => {
              const isSelected = currentPresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  className={`preset-item-btn ${isSelected ? 'selected' : ''}`}
                  onClick={() => {
                    onSelectPreset(preset);
                    setIsOpen(false);
                  }}
                >
                  <span className="preset-item-name">{getPresetDisplayName(preset)}</span>
                  {isSelected && <Check size={13} className="preset-check-icon" />}
                </button>
              );
            })}
          </div>

          <div className="preset-divider" />

          {/* Section: Custom Presets */}
          <div className="preset-section-header">{t(language, 'presetCustomSection')}</div>
          <div className="preset-list">
            {customPresets.length === 0 ? (
              <div className="preset-empty">{t(language, 'presetEmptyCustom')}</div>
            ) : (
              customPresets.map((preset) => {
                const isSelected = currentPresetId === preset.id;
                return (
                  <div key={preset.id} className="preset-item-row">
                    <button
                      type="button"
                      className={`preset-item-btn ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        onSelectPreset(preset);
                        setIsOpen(false);
                      }}
                    >
                      <span className="preset-item-name">⭐ {preset.name}</span>
                      {isSelected && <Check size={13} className="preset-check-icon" />}
                    </button>
                    <button
                      type="button"
                      className="preset-delete-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteCustomPreset(preset.id);
                      }}
                      title="Delete preset"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          <div className="preset-divider" />

          {/* Section: Save current */}
          {isSaving ? (
            <form className="preset-save-form" onSubmit={handleSave}>
              <input
                ref={inputRef}
                type="text"
                className="preset-save-input"
                placeholder={t(language, 'presetSavePlaceholder')}
                value={newPresetName}
                onChange={(e) => setNewPresetName(e.target.value)}
              />
              <div className="preset-save-actions">
                <button
                  type="button"
                  className="preset-cancel-btn"
                  onClick={() => {
                    setIsSaving(false);
                    setNewPresetName('');
                  }}
                >
                  {t(language, 'presetCancel')}
                </button>
                <button type="submit" className="preset-confirm-btn" disabled={!newPresetName.trim()}>
                  {t(language, 'presetSaveConfirm')}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              className="preset-save-trigger-btn"
              onClick={() => setIsSaving(true)}
            >
              <Plus size={13} style={{ marginRight: 6 }} />
              <span>{t(language, 'presetSaveCurrent')}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
};
