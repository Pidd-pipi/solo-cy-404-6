import dayjs from 'dayjs';
import type { LangCode } from '../types/i18n';

export function createId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatDateTime(value: string): string {
  return dayjs(value).format('YYYY-MM-DD HH:mm');
}

// 日期本体（如 2021.06）是跨语言共享的结构信息；只有「至今 / 开始时间」
// 这类占位文案随语言切换。
const PRESENT_LABELS: Partial<Record<LangCode, string>> = {
  'zh-CN': '至今',
  'zh-TW': '至今',
  en: 'Present',
  ja: '現在',
  ko: '현재',
  fr: "aujourd'hui",
  de: 'heute',
  es: 'actualidad',
};

const START_LABELS: Partial<Record<LangCode, string>> = {
  'zh-CN': '开始时间',
  'zh-TW': '開始時間',
  en: 'Start',
  ja: '開始',
  ko: '시작',
  fr: 'Début',
  de: 'Beginn',
  es: 'Inicio',
};

function labelFor(lang: LangCode, map: Partial<Record<LangCode, string>>, fallback: string): string {
  return map[lang] ?? (lang.startsWith('zh') ? map['zh-CN'] ?? fallback : map.en ?? fallback);
}

export function presentLabel(lang: LangCode): string {
  return labelFor(lang, PRESENT_LABELS, 'Present');
}

export function formatDateRange(startDate: string, endDate: string, lang: LangCode = 'zh-CN'): string {
  const start = startDate || labelFor(lang, START_LABELS, 'Start');
  const end = endDate || presentLabel(lang);
  return `${start} - ${end}`;
}

export function toLines(value: string): string[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function fromLines(lines: string[]): string {
  return lines.join('\n');
}

