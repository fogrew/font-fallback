import type { FitMetrics } from './model';

export interface SystemFont {
  id: string;
  family: string;
  localNames: readonly string[];
  genericFamily: 'sans-serif' | 'serif' | 'monospace';
  metrics: FitMetrics;
  latinWidthEm: number;
}

export const systemFonts: readonly SystemFont[] = [
  {
    id: 'arial',
    family: 'Arial',
    localNames: ['Arial', 'ArialMT'],
    genericFamily: 'sans-serif',
    metrics: {
      unitsPerEm: 2048,
      hhea: { ascent: 1854, descent: -434, lineGap: 67 },
      typo: null,
      win: null,
    },
    latinWidthEm: 913 / 2048,
  },
  {
    id: 'helvetica',
    family: 'Helvetica',
    localNames: ['Helvetica'],
    genericFamily: 'sans-serif',
    metrics: {
      unitsPerEm: 2048,
      hhea: { ascent: 1577, descent: -471, lineGap: 0 },
      typo: null,
      win: null,
    },
    latinWidthEm: 913 / 2048,
  },
  {
    id: 'timesNewRoman',
    family: 'Times New Roman',
    localNames: ['Times New Roman', 'TimesNewRomanPSMT'],
    genericFamily: 'serif',
    metrics: {
      unitsPerEm: 2048,
      hhea: { ascent: 1825, descent: -443, lineGap: 87 },
      typo: null,
      win: null,
    },
    latinWidthEm: 832 / 2048,
  },
  {
    id: 'georgia',
    family: 'Georgia',
    localNames: ['Georgia'],
    genericFamily: 'serif',
    metrics: {
      unitsPerEm: 2048,
      hhea: { ascent: 1878, descent: -449, lineGap: 0 },
      typo: null,
      win: null,
    },
    latinWidthEm: 913 / 2048,
  },
  {
    id: 'verdana',
    family: 'Verdana',
    localNames: ['Verdana'],
    genericFamily: 'sans-serif',
    metrics: {
      unitsPerEm: 2048,
      hhea: { ascent: 2059, descent: -430, lineGap: 0 },
      typo: null,
      win: null,
    },
    latinWidthEm: 1049 / 2048,
  },
  {
    id: 'tahoma',
    family: 'Tahoma',
    localNames: ['Tahoma'],
    genericFamily: 'sans-serif',
    metrics: {
      unitsPerEm: 2048,
      hhea: { ascent: 2049, descent: -423, lineGap: 0 },
      typo: null,
      win: null,
    },
    latinWidthEm: 917 / 2048,
  },
  {
    id: 'trebuchetMS',
    family: 'Trebuchet MS',
    localNames: ['Trebuchet MS', 'TrebuchetMS'],
    genericFamily: 'sans-serif',
    metrics: {
      unitsPerEm: 2048,
      hhea: { ascent: 1923, descent: -455, lineGap: 0 },
      typo: null,
      win: null,
    },
    latinWidthEm: 934 / 2048,
  },
  {
    id: 'courierNew',
    family: 'Courier New',
    localNames: ['Courier New', 'CourierNewPSMT'],
    genericFamily: 'monospace',
    metrics: {
      unitsPerEm: 2048,
      hhea: { ascent: 1705, descent: -615, lineGap: 0 },
      typo: null,
      win: null,
    },
    latinWidthEm: 1229 / 2048,
  },
  {
    id: 'segoeUI',
    family: 'Segoe UI',
    localNames: ['Segoe UI', 'SegoeUI'],
    genericFamily: 'sans-serif',
    metrics: {
      unitsPerEm: 2048,
      hhea: { ascent: 2210, descent: -514, lineGap: 0 },
      typo: null,
      win: null,
    },
    latinWidthEm: 908 / 2048,
  },
];
