import React, { useRef } from 'react';
import { RuleStep, PresetItem, Language } from '../types';
import { PresetDropdown } from './PresetDropdown';
import { t } from '../lib/i18n';
import { Plus, X, ArrowRight } from 'lucide-react';

interface PipelineBarProps {
  steps: RuleStep[];
  activeStepIndex: number;
  language: Language;
  customPresets: PresetItem[];
  currentPresetId: string | null;
  onSelectStep: (index: number) => void;
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  onSelectPreset: (preset: PresetItem) => void;
  onSaveCurrentAsPreset: (name: string) => void;
  onDeleteCustomPreset: (id: string) => void;
}

export const PipelineBar: React.FC<PipelineBarProps> = ({
  steps,
  activeStepIndex,
  language,
  customPresets,
  currentPresetId,
  onSelectStep,
  onAddStep,
  onRemoveStep,
  onSelectPreset,
  onSaveCurrentAsPreset,
  onDeleteCustomPreset,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const getStepSummary = (step: RuleStep, index: number): string => {
    if (step.name) return step.name;
    if (step.matchPattern) {
      return `替換: ${step.matchPattern.slice(0, 8)}`;
    }
    if (step.renameTemplate) {
      return step.renameTemplate.slice(0, 10);
    }
    return t(language, 'stepDefaultName', { index: index + 1 });
  };

  return (
    <div className="pipeline-bar-wrapper">
      <div className="pipeline-scroll-area" ref={scrollRef}>
        <div className="pipeline-steps-track">
          {steps.map((step, idx) => {
            const isActive = idx === activeStepIndex;
            return (
              <React.Fragment key={step.id}>
                {idx > 0 && (
                  <span className="pipeline-arrow-separator">
                    <ArrowRight size={11} strokeWidth={2.4} />
                  </span>
                )}
                <div
                  className={`pipeline-step-pill ${isActive ? 'active' : ''}`}
                  onClick={() => onSelectStep(idx)}
                  title={`步驟 ${idx + 1}`}
                >
                  <span className="step-badge">{idx + 1}</span>
                  <span className="step-summary-text">{getStepSummary(step, idx)}</span>

                  {steps.length > 1 && (
                    <button
                      type="button"
                      className="step-remove-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveStep(idx);
                      }}
                      title={t(language, 'stepRemove')}
                    >
                      <X size={11} strokeWidth={2.5} />
                    </button>
                  )}
                </div>
              </React.Fragment>
            );
          })}

          <button
            type="button"
            className="pipeline-add-step-btn"
            onClick={onAddStep}
            title={t(language, 'addStep')}
          >
            <Plus size={12} strokeWidth={2.5} style={{ marginRight: 3 }} />
            <span>{t(language, 'addStep')}</span>
          </button>
        </div>
      </div>

      <div className="pipeline-divider-vertical" />

      <div className="pipeline-docked-right">
        <PresetDropdown
          language={language}
          customPresets={customPresets}
          currentPresetId={currentPresetId}
          onSelectPreset={onSelectPreset}
          onSaveCurrentAsPreset={onSaveCurrentAsPreset}
          onDeleteCustomPreset={onDeleteCustomPreset}
        />
      </div>
    </div>
  );
};
