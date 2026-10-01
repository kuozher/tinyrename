import { useEffect, useRef, FC } from 'react';
import { Language } from '../types';
import { t } from '../lib/i18n';
import { X, ExternalLink } from 'lucide-react';
import { openUrl } from '@tauri-apps/plugin-opener';

interface HelpPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const HelpPopover: FC<HelpPopoverProps> = ({ isOpen, onClose, lang }) => {
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose();
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleOpenRegexDocs = () => {
    const url = lang === 'zh-TW'
      ? 'https://developer.mozilla.org/zh-TW/docs/Web/JavaScript/Guide/Regular_expressions'
      : 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_expressions';
    openUrl(url).catch((err) => console.error('Failed to open doc:', err));
  };

  return (
    <div className="help-backdrop" onClick={onClose}>
      <div
        className="help-popover-container"
        ref={popoverRef}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="help-popover-header">
          <div className="help-popover-title">{t(lang, 'helpTitle')}</div>
          <button
            className="help-popover-close"
            onClick={onClose}
            aria-label="Close"
            type="button"
          >
            <X size={18} />
          </button>
        </div>

        <div className="help-popover-body">
          <p className="help-subtitle">{t(lang, 'helpSubtitle')}</p>

          <div className="help-section-title">{t(lang, 'syntaxRef')}</div>
          <table className="help-table">
            <tbody>
              <tr>
                <td><code>$name</code></td>
                <td>{t(lang, 'syntaxName')}</td>
              </tr>
              <tr>
                <td><code>$NN</code></td>
                <td>{t(lang, 'syntaxNN')}</td>
              </tr>
              <tr>
                <td><code>$nn</code></td>
                <td>{t(lang, 'syntaxDescN')}</td>
              </tr>
              <tr>
                <td><code>$date</code></td>
                <td>{t(lang, 'syntaxDate')}</td>
              </tr>
              <tr>
                <td><code>$$</code></td>
                <td>{t(lang, 'syntaxEscape')}</td>
              </tr>
            </tbody>
          </table>

          <div className="help-section-title">{t(lang, 'exampleTitle')}</div>
          <div className="help-examples">
            <div className="example-item"><code>photo_$date_$NN</code> → <span>photo_2026-04-01_01.jpg</span></div>
            <div className="example-item"><code>$NN-$name</code> → <span>01-document.pdf</span></div>
            <div className="example-item"><code>$date(YYYYMMDD)_$name</code> → <span>20260401_report.docx</span></div>
          </div>

          <div className="help-section-title">{t(lang, 'regexGuideTitle')}</div>
          <div className="regex-help-box">
            <p>{t(lang, 'regexGuideDesc')}</p>
            <button
              type="button"
              className="regex-doc-link-btn"
              onClick={handleOpenRegexDocs}
            >
              <span>{t(lang, 'regexDocLink')}</span>
              <ExternalLink size={12} style={{ marginLeft: 4 }} />
            </button>
          </div>

          <div className="help-tips">
            <div className="tip-item">{t(lang, 'tipExtension')}</div>
            <div className="tip-item">{t(lang, 'tipMatch')}</div>
            <div className="tip-item">{t(lang, 'tipCase')}</div>
            <div className="tip-item">{t(lang, 'tipUndo')}</div>
            <div className="tip-item">{t(lang, 'tipButtons')}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
