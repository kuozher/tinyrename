import { FileItem, RenamePreviewItem, DiffSegment, CaseMode } from '../types';

export interface RenameEngineOptions {
  matchPattern: string;
  isRegex: boolean;
  renameTemplate: string;
  startFrom: number;
  step: number;
  caseMode?: CaseMode;
}

const INVALID_WIN_CHARS = /[<>:"/\\|?*]/;

/**
 * Formats a UNIX timestamp (in seconds) into custom date string.
 */
export function formatDate(timestampSec: number, formatStr: string = 'YYYY-MM-DD'): string {
  const date = timestampSec > 0 ? new Date(timestampSec * 1000) : new Date();
  const yyyy = String(date.getFullYear());
  const yy = yyyy.slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  let result = formatStr;
  result = result.replace(/YYYY/g, yyyy);
  result = result.replace(/YY/g, yy);
  result = result.replace(/MM/g, mm);
  result = result.replace(/DD/g, dd);
  result = result.replace(/HH/g, hh);
  result = result.replace(/mm/g, min);
  result = result.replace(/ss/g, ss);
  return result;
}

/**
 * Applies case conversion to string.
 */
export function applyCaseMode(str: string, mode: CaseMode = 'none'): string {
  switch (mode) {
    case 'upper':
      return str.toUpperCase();
    case 'lower':
      return str.toLowerCase();
    case 'title':
      return str.replace(/([a-zA-Z0-9])([a-zA-Z0-9]*)/g, (_, first, rest) => {
        return first.toUpperCase() + rest.toLowerCase();
      });
    case 'none':
    default:
      return str;
  }
}

/**
 * Replaces tokens ($name, $NN..., $nn..., $date, $date(format)) with evaluated strings.
 */
export function evaluateTemplate(
  template: string,
  stem: string,
  matchIndex: number,
  totalMatching: number,
  startFrom: number,
  step: number,
  modifiedTimestamp: number = 0
): string {
  if (!template) {
    return '';
  }

  const ascNum = startFrom + matchIndex * step;
  const descNum = startFrom + Math.max(0, totalMatching - 1 - matchIndex) * step;

  // 1. Preserve literal $$ as placeholder
  let result = template.replace(/\$\$/g, '\u0000');

  // 2. $name -> stem
  result = result.replace(/\$name/g, stem);

  // 3. $date(format) and $date
  result = result.replace(/\$date\(([^)]+)\)/g, (_, customFmt) => {
    return formatDate(modifiedTimestamp, customFmt);
  });
  result = result.replace(/\$date\b/g, () => {
    return formatDate(modifiedTimestamp, 'YYYY-MM-DD');
  });

  // 4. $N+ -> ascending with zero padding
  result = result.replace(/\$N+/g, (match) => {
    const padLen = match.length - 1;
    const numStr = String(ascNum);
    return numStr.length < padLen ? numStr.padStart(padLen, '0') : numStr;
  });

  // 5. $n+ -> descending with zero padding
  result = result.replace(/\$n+/g, (match) => {
    const padLen = match.length - 1;
    const numStr = String(descNum);
    return numStr.length < padLen ? numStr.padStart(padLen, '0') : numStr;
  });

  // 6. Restore escaped $
  result = result.replace(/\u0000/g, '$');

  return result;
}

/**
 * Computes common prefix and suffix to highlight additions in newName.
 */
export function computeDiffSegments(oldName: string, newName: string): DiffSegment[] {
  if (oldName === newName) {
    return [{ text: newName, type: 'same' }];
  }

  if (!oldName) {
    return [{ text: newName, type: 'added' }];
  }

  if (!newName) {
    return [{ text: oldName, type: 'removed' }];
  }

  let start = 0;
  while (
    start < oldName.length &&
    start < newName.length &&
    oldName[start] === newName[start]
  ) {
    start++;
  }

  let oldEnd = oldName.length - 1;
  let newEnd = newName.length - 1;
  while (
    oldEnd >= start &&
    newEnd >= start &&
    oldName[oldEnd] === newName[newEnd]
  ) {
    oldEnd--;
    newEnd--;
  }

  const segments: DiffSegment[] = [];
  const prefix = newName.substring(0, start);
  const added = newName.substring(start, newEnd + 1);
  const suffix = newName.substring(newEnd + 1);

  if (prefix) {
    segments.push({ text: prefix, type: 'same' });
  }
  if (added) {
    segments.push({ text: added, type: 'added' });
  }
  if (suffix) {
    segments.push({ text: suffix, type: 'same' });
  }

  return segments;
}

/**
 * Computes rename preview for all files given the current options.
 */
/**
 * Computes rename preview for all files across multiple pipeline steps.
 */
export function computePipelinePreviews(
  files: FileItem[],
  selectedIds: Set<string>,
  steps: RenameEngineOptions[]
): { previews: RenamePreviewItem[]; regexError?: string } {
  let firstRegexError: string | undefined;

  // Stems tracked across steps
  const currentStems: string[] = files.map((f) => f.stem);

  for (const stepOpt of steps) {
    const {
      matchPattern = '',
      isRegex = false,
      renameTemplate = '$name',
      startFrom = 1,
      step = 1,
      caseMode = 'none',
    } = stepOpt;

    const hasMatch = matchPattern.trim().length > 0;
    const hasTemplate = renameTemplate.length > 0;
    const hasCase = caseMode !== 'none';

    // If step does nothing, skip
    if (!hasMatch && !hasTemplate && !hasCase) {
      continue;
    }

    let regex: RegExp | null = null;
    if (hasMatch && isRegex) {
      try {
        regex = new RegExp(matchPattern, 'gi');
      } catch (e: any) {
        if (!firstRegexError) {
          firstRegexError = e.message || 'Invalid regular expression';
        }
      }
    }

    // 1. Identify matches in current step
    const matchFlags: boolean[] = [];
    let totalMatching = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isSelected = selectedIds.has(file.id);
      if (!isSelected) {
        matchFlags.push(false);
        continue;
      }

      const stem = currentStems[i];
      if (!hasMatch) {
        matchFlags.push(true);
        totalMatching++;
      } else if (isRegex) {
        if (regex) {
          regex.lastIndex = 0;
          const matches = regex.test(stem);
          matchFlags.push(matches);
          if (matches) totalMatching++;
        } else {
          matchFlags.push(false);
        }
      } else {
        const matches = stem.toLowerCase().includes(matchPattern.toLowerCase());
        matchFlags.push(matches);
        if (matches) totalMatching++;
      }
    }

    // 2. Transform matching stems
    let matchIndex = 0;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isSelected = selectedIds.has(file.id);
      const isMatch = matchFlags[i];

      if (!isSelected || !isMatch) {
        continue;
      }

      let stem = currentStems[i];

      if (!hasMatch) {
        // Entire stem is replaced by template
        stem = evaluateTemplate(
          renameTemplate,
          stem,
          matchIndex,
          totalMatching,
          startFrom,
          step,
          file.modified_timestamp
        );
      } else if (isRegex && regex) {
        // Regex replace
        const replacement = evaluateTemplate(
          renameTemplate,
          stem,
          matchIndex,
          totalMatching,
          startFrom,
          step,
          file.modified_timestamp
        );
        regex.lastIndex = 0;
        stem = stem.replace(regex, replacement);
      } else {
        // Substring replace
        const replacement = evaluateTemplate(
          renameTemplate,
          stem,
          matchIndex,
          totalMatching,
          startFrom,
          step,
          file.modified_timestamp
        );
        const searchPattern = matchPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const textRegex = new RegExp(searchPattern, 'gi');
        stem = stem.replace(textRegex, replacement);
      }

      if (hasCase) {
        stem = applyCaseMode(stem, caseMode);
      }

      currentStems[i] = stem;
      matchIndex++;
    }
  }

  // 3. Build previews & diff against original_name
  const rawPreviews: Array<{
    file: FileItem;
    selected: boolean;
    isMatch: boolean;
    newStem: string;
    newName: string;
    newPath: string;
    hasChanged: boolean;
    diffSegments: DiffSegment[];
  }> = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const isSelected = selectedIds.has(file.id);
    const newStem = currentStems[i];
    const newName = `${newStem}${file.extension}`;
    const sep = file.path.includes('/') ? '/' : '\\';
    const newPath = file.parent_dir ? `${file.parent_dir}${sep}${newName}` : newName;
    const hasChanged = newName !== file.original_name;
    const diffSegments = computeDiffSegments(file.original_name, newName);

    rawPreviews.push({
      file,
      selected: isSelected,
      isMatch: isSelected,
      newStem,
      newName,
      newPath,
      hasChanged,
      diffSegments,
    });
  }

  // 4. Conflict detection
  const pathCounts = new Map<string, number>();
  for (const item of rawPreviews) {
    if (item.selected) {
      const normalized = item.newPath.toLowerCase();
      pathCounts.set(normalized, (pathCounts.get(normalized) || 0) + 1);
    }
  }

  const previews: RenamePreviewItem[] = rawPreviews.map((item) => {
    let conflictReason: string | undefined;

    if (item.selected && item.hasChanged) {
      if (!item.newStem.trim()) {
        conflictReason = '檔名不可為空 / File name cannot be empty';
      } else if (INVALID_WIN_CHARS.test(item.newStem)) {
        conflictReason = '包含不合法字元 (\\ / : * ? " < > |)';
      } else if (item.newPath.length >= 260) {
        conflictReason = '路徑長度超過 Windows 260 字元上限 / Path exceeds Windows MAX_PATH (260)';
      } else {
        const normalized = item.newPath.toLowerCase();
        if ((pathCounts.get(normalized) || 0) > 1) {
          conflictReason = '多個檔案重新命名後同名衝突 / Multiple files resolve to the same name';
        }
      }
    }

    return {
      ...item,
      conflictReason,
    };
  });

  return { previews, regexError: firstRegexError };
}

/**
 * Computes rename preview for all files given a single set of options.
 */
export function computeRenamePreviews(
  files: FileItem[],
  selectedIds: Set<string>,
  options: RenameEngineOptions
): { previews: RenamePreviewItem[]; regexError?: string } {
  return computePipelinePreviews(files, selectedIds, [options]);
}
