import { PresetItem } from '../types';

export const BUILTIN_PRESETS: PresetItem[] = [
  {
    id: 'preset_photo_date_nn',
    name: 'presetPhotoArchive',
    isBuiltin: true,
    steps: [
      {
        id: 'step_photo_1',
        matchPattern: '',
        isRegex: false,
        renameTemplate: 'photo_$date_$NN',
        startFrom: 1,
        step: 1,
        caseMode: 'none',
      },
    ],
  },
  {
    id: 'preset_doc_numbering',
    name: 'presetDocNumbering',
    isBuiltin: true,
    steps: [
      {
        id: 'step_doc_1',
        matchPattern: '',
        isRegex: false,
        renameTemplate: '$NN-$name',
        startFrom: 1,
        step: 1,
        caseMode: 'none',
      },
    ],
  },
  {
    id: 'preset_date_prefix',
    name: 'presetDatePrefix',
    isBuiltin: true,
    steps: [
      {
        id: 'step_date_1',
        matchPattern: '',
        isRegex: false,
        renameTemplate: '$date_$name',
        startFrom: 1,
        step: 1,
        caseMode: 'none',
      },
    ],
  },
  {
    id: 'preset_lower_case',
    name: 'presetLowerCase',
    isBuiltin: true,
    steps: [
      {
        id: 'step_lower_1',
        matchPattern: '',
        isRegex: false,
        renameTemplate: '$name',
        startFrom: 1,
        step: 1,
        caseMode: 'lower',
      },
    ],
  },
  {
    id: 'preset_clean_and_number',
    name: 'presetCleanAndNumber',
    isBuiltin: true,
    steps: [
      {
        id: 'step_clean_1',
        name: '正規替換',
        matchPattern: '[-_ ]+',
        isRegex: true,
        renameTemplate: '_',
        startFrom: 1,
        step: 1,
        caseMode: 'none',
      },
      {
        id: 'step_clean_2',
        name: '追加序號',
        matchPattern: '',
        isRegex: false,
        renameTemplate: '$name_$NN',
        startFrom: 1,
        step: 1,
        caseMode: 'none',
      },
    ],
  },
];
