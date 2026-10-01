import { describe, it, expect } from 'vitest';
import {
  evaluateTemplate,
  computeDiffSegments,
  computeRenamePreviews,
  formatDate,
  applyCaseMode,
} from '../renameEngine';
import { FileItem } from '../../types';

describe('formatDate and Date tokens', () => {
  const testEpochSec = 1774953600; // 2026-04-01 00:00:00 UTC (or local)

  it('formats custom date string', () => {
    const formatted = formatDate(testEpochSec, 'YYYYMMDD');
    expect(formatted.length).toBe(8);
    expect(formatted.startsWith('2026')).toBe(true);
  });

  it('evaluates $date and $date(format) in template', () => {
    const res1 = evaluateTemplate('photo_$date', 'test', 0, 1, 1, 1, testEpochSec);
    expect(res1.startsWith('photo_2026-')).toBe(true);

    const res2 = evaluateTemplate('$date(YYYYMMDD)_$name', 'img', 0, 1, 1, 1, testEpochSec);
    expect(res2.startsWith('2026')).toBe(true);
    expect(res2.endsWith('_img')).toBe(true);
  });
});

describe('applyCaseMode', () => {
  it('converts to upper case', () => {
    expect(applyCaseMode('hello_world-test', 'upper')).toBe('HELLO_WORLD-TEST');
  });

  it('converts to lower case', () => {
    expect(applyCaseMode('HELLO_World-TEST', 'lower')).toBe('hello_world-test');
  });

  it('converts to title case', () => {
    expect(applyCaseMode('hello_world-test', 'title')).toBe('Hello_World-Test');
  });
});

describe('evaluateTemplate', () => {
  it('evaluates $name token correctly', () => {
    expect(evaluateTemplate('$name_test', 'photo', 0, 5, 1, 1)).toBe('photo_test');
  });

  it('evaluates $N ascending with padding based on N count', () => {
    expect(evaluateTemplate('$name_$N', 'img', 0, 5, 1, 1)).toBe('img_1');
    expect(evaluateTemplate('$name_$NN', 'img', 0, 5, 1, 1)).toBe('img_01');
    expect(evaluateTemplate('$name_$NNN', 'img', 0, 5, 1, 1)).toBe('img_001');
    expect(evaluateTemplate('$name_$NNNN', 'img', 9, 15, 1, 1)).toBe('img_0010');
  });

  it('evaluates startFrom and step', () => {
    expect(evaluateTemplate('item_$NN', 'x', 0, 3, 10, 5)).toBe('item_10');
    expect(evaluateTemplate('item_$NN', 'x', 1, 3, 10, 5)).toBe('item_15');
    expect(evaluateTemplate('item_$NN', 'x', 2, 3, 10, 5)).toBe('item_20');
  });

  it('evaluates $nn descending sequence', () => {
    expect(evaluateTemplate('rev_$NN_$nn', 'x', 0, 3, 1, 1)).toBe('rev_01_03');
    expect(evaluateTemplate('rev_$NN_$nn', 'x', 1, 3, 1, 1)).toBe('rev_02_02');
    expect(evaluateTemplate('rev_$NN_$nn', 'x', 2, 3, 1, 1)).toBe('rev_03_01');
  });

  it('preserves escaped $$ as single $', () => {
    expect(evaluateTemplate('price_$$100_$name', 'sale', 0, 1, 1, 1)).toBe('price_$100_sale');
  });
});

describe('computeDiffSegments', () => {
  it('returns same when old and new are identical', () => {
    expect(computeDiffSegments('test.png', 'test.png')).toEqual([
      { text: 'test.png', type: 'same' },
    ]);
  });

  it('highlights suffix addition', () => {
    const diff = computeDiffSegments('test.png', 'test_01.png');
    expect(diff).toEqual([
      { text: 'test', type: 'same' },
      { text: '_01', type: 'added' },
      { text: '.png', type: 'same' },
    ]);
  });

  it('highlights prefix addition', () => {
    const diff = computeDiffSegments('test.png', 'photo_test.png');
    expect(diff).toEqual([
      { text: 'photo_', type: 'added' },
      { text: 'test.png', type: 'same' },
    ]);
  });
});

describe('computeRenamePreviews', () => {
  const sampleFiles: FileItem[] = [
    {
      id: 'C:\\test\\image 13.png',
      path: 'C:\\test\\image 13.png',
      parent_dir: 'C:\\test',
      original_name: 'image 13.png',
      stem: 'image 13',
      extension: '.png',
      is_dir: false,
      size: 1024,
      modified_timestamp: 1774953600,
    },
    {
      id: 'C:\\test\\image 15.png',
      path: 'C:\\test\\image 15.png',
      parent_dir: 'C:\\test',
      original_name: 'image 15.png',
      stem: 'image 15',
      extension: '.png',
      is_dir: false,
      size: 2048,
      modified_timestamp: 1774953600,
    },
  ];

  it('renames without match (full template)', () => {
    const selected = new Set(sampleFiles.map((f) => f.id));
    const { previews } = computeRenamePreviews(sampleFiles, selected, {
      matchPattern: '',
      isRegex: false,
      renameTemplate: 'photo_$NN',
      startFrom: 1,
      step: 1,
    });

    expect(previews[0].newName).toBe('photo_01.png');
    expect(previews[1].newName).toBe('photo_02.png');
    expect(previews[0].conflictReason).toBeUndefined();
  });

  it('renames with substring match', () => {
    const selected = new Set(sampleFiles.map((f) => f.id));
    const { previews } = computeRenamePreviews(sampleFiles, selected, {
      matchPattern: 'image',
      isRegex: false,
      renameTemplate: 'pic',
      startFrom: 1,
      step: 1,
    });

    expect(previews[0].newName).toBe('pic 13.png');
    expect(previews[1].newName).toBe('pic 15.png');
  });

  it('applies case mode conversion', () => {
    const selected = new Set([sampleFiles[0].id]);
    const { previews } = computeRenamePreviews(sampleFiles, selected, {
      matchPattern: '',
      isRegex: false,
      renameTemplate: '$name',
      startFrom: 1,
      step: 1,
      caseMode: 'upper',
    });

    expect(previews[0].newName).toBe('IMAGE 13.png');
  });

  it('detects naming conflicts when two items get identical names', () => {
    const selected = new Set(sampleFiles.map((f) => f.id));
    const { previews } = computeRenamePreviews(sampleFiles, selected, {
      matchPattern: '',
      isRegex: false,
      renameTemplate: 'constant_name',
      startFrom: 1,
      step: 1,
    });

    expect(previews[0].newName).toBe('constant_name.png');
    expect(previews[1].newName).toBe('constant_name.png');
    expect(previews[0].conflictReason).toBeDefined();
    expect(previews[1].conflictReason).toBeDefined();
  });

  it('detects invalid windows characters', () => {
    const selected = new Set([sampleFiles[0].id]);
    const { previews } = computeRenamePreviews(sampleFiles, selected, {
      matchPattern: '',
      isRegex: false,
      renameTemplate: 'bad:name*?',
      startFrom: 1,
      step: 1,
    });

    expect(previews[0].conflictReason).toContain('包含不合法字元');
  });
});
