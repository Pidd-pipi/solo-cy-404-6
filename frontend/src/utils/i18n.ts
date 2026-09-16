import type { Resume } from '../types/resume';
import type { LangCode, LangVariant, LocalField, LocalListField, LocalText, LocalTextList } from '../types/i18n';

/** 常用语言预设，添加语言时直接选择；也支持自定义语言码。 */
export const LANG_PRESETS: LangVariant[] = [
  { code: 'zh-CN', label: '中文（简体）' },
  { code: 'zh-TW', label: '中文（繁體）' },
  { code: 'en', label: 'English' },
  { code: 'ja', label: '日本語' },
  { code: 'ko', label: '한국어' },
  { code: 'fr', label: 'Français' },
  { code: 'de', label: 'Deutsch' },
  { code: 'es', label: 'Español' },
];

export const SOURCE_LANGUAGE: LangCode = 'zh-CN';
export const SOURCE_LANGUAGE_LABEL = '中文（简体）';

export interface ResolvedText {
  value: string;
  /** true 表示当前语言没有译文，值回退自原文（或其它回退来源）。 */
  isFallback: boolean;
  /** true 表示该译文相对原文已过期，需要复核。 */
  isStale: boolean;
}

export interface ResolvedList {
  value: string[];
  isFallback: boolean;
  isStale: boolean;
}

const hasText = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const hasList = (value: unknown): value is string[] => Array.isArray(value) && value.some((item) => typeof item === 'string' && item.trim().length > 0);

function tidyStale(stale: Record<LangCode, true | undefined>): LocalText['stale'] {
  const entries = Object.entries(stale).filter(([, flag]) => flag === true) as [LangCode, true][];
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/** 统一升格为对象形态；裸 string 视为源语言原文。 */
function asText(field: LocalField | null | undefined, source: LangCode): LocalText {
  if (field && typeof field === 'object') {
    return { values: field.values ?? {}, stale: field.stale };
  }
  return hasText(field) ? { values: { [source]: field } } : { values: {} };
}

function asList(field: LocalListField | null | undefined, source: LangCode): LocalTextList {
  if (field && typeof field === 'object' && !Array.isArray(field)) {
    return { values: field.values ?? {}, stale: field.stale };
  }
  return hasList(field) ? { values: { [source]: field } } : { values: {} };
}

// ---------------------------------------------------------------------------
// 读取
// ---------------------------------------------------------------------------

export function getLocal(field: LocalField | null | undefined, lang: LangCode, source: LangCode): ResolvedText {
  if (typeof field === 'string') {
    return { value: field, isFallback: lang !== source, isStale: false };
  }
  if (!field) {
    return { value: '', isFallback: true, isStale: false };
  }
  const own = field.values?.[lang];
  if (hasText(own)) {
    return { value: own, isFallback: false, isStale: field.stale?.[lang] === true };
  }
  const origin = field.values?.[source];
  if (hasText(origin)) {
    return { value: origin, isFallback: lang !== source, isStale: false };
  }
  return { value: own ?? '', isFallback: false, isStale: field.stale?.[lang] === true };
}

export function getLocalList(field: LocalListField | null | undefined, lang: LangCode, source: LangCode): ResolvedList {
  if (Array.isArray(field)) {
    return { value: field, isFallback: lang !== source, isStale: false };
  }
  if (!field) {
    return { value: [], isFallback: true, isStale: false };
  }
  const own = field.values?.[lang];
  if (hasList(own)) {
    return { value: own, isFallback: false, isStale: field.stale?.[lang] === true };
  }
  const origin = field.values?.[source];
  if (hasList(origin)) {
    return { value: origin, isFallback: lang !== source, isStale: false };
  }
  return { value: own ?? [], isFallback: false, isStale: field.stale?.[lang] === true };
}

// ---------------------------------------------------------------------------
// 写入
// ---------------------------------------------------------------------------

/** 写入某语言译文，并清除该语言的待复核标记。 */
export function setLocal(field: LocalField | null | undefined, lang: LangCode, source: LangCode, value: string): LocalText {
  const next = asText(field, source);
  const stale = { ...(next.stale ?? {}) };
  delete stale[lang];
  return { values: { ...next.values, [lang]: value }, stale: tidyStale(stale) };
}

export function setLocalList(field: LocalListField | null | undefined, lang: LangCode, source: LangCode, value: string[]): LocalTextList {
  const next = asList(field, source);
  const stale = { ...(next.stale ?? {}) };
  delete stale[lang];
  return { values: { ...next.values, [lang]: value }, stale: tidyStale(stale) };
}

/**
 * 写入原文：更新源语言内容，并把「已有译文」的其它语言标为待复核；
 * 尚无译文的语言不产生标记（它们本就回退显示原文）。
 */
export function setSource(field: LocalField | null | undefined, source: LangCode, value: string, languages: LangCode[]): LocalText {
  const next = asText(field, source);
  const values = { ...next.values, [source]: value };
  const stale: Record<LangCode, true | undefined> = { ...(next.stale ?? {}) };
  for (const lang of languages) {
    if (lang === source) {
      continue;
    }
    if (hasText(values[lang])) {
      stale[lang] = true;
    } else {
      delete stale[lang];
    }
  }
  return { values, stale: tidyStale(stale) };
}

export function setSourceList(field: LocalListField | null | undefined, source: LangCode, value: string[], languages: LangCode[]): LocalTextList {
  const next = asList(field, source);
  const values = { ...next.values, [source]: value };
  const stale: Record<LangCode, true | undefined> = { ...(next.stale ?? {}) };
  for (const lang of languages) {
    if (lang === source) {
      continue;
    }
    if (hasList(values[lang])) {
      stale[lang] = true;
    } else {
      delete stale[lang];
    }
  }
  return { values, stale: tidyStale(stale) };
}

/** 复制现有语言内容为新语言起步；目标语言已有译文时不覆盖。 */
export function seedField(field: LocalField | null | undefined, from: LangCode, to: LangCode, source: LangCode): LocalField {
  const next = asText(field, source);
  if (hasText(next.values[to])) {
    return field ?? next;
  }
  const resolved = getLocal(field, from, source);
  if (!hasText(resolved.value)) {
    return field ?? next;
  }
  return { ...next, values: { ...next.values, [to]: resolved.value } };
}

export function seedListField(field: LocalListField | null | undefined, from: LangCode, to: LangCode, source: LangCode): LocalListField {
  const next = asList(field, source);
  if (hasList(next.values[to])) {
    return field ?? next;
  }
  const resolved = getLocalList(field, from, source);
  if (!hasList(resolved.value)) {
    return field ?? next;
  }
  return { ...next, values: { ...next.values, [to]: [...resolved.value] } };
}

/** 移出某个语言：只删除该语言的译文与标记，其它语言不受影响。 */
export function removeFieldLang(field: LocalField | null | undefined, lang: LangCode, source: LangCode): LocalField {
  if (typeof field === 'string') {
    return field;
  }
  const next = asText(field, source);
  const values = { ...next.values };
  const stale = { ...(next.stale ?? {}) };
  delete values[lang];
  delete stale[lang];
  return { values, stale: tidyStale(stale) };
}

export function removeListFieldLang(field: LocalListField | null | undefined, lang: LangCode, source: LangCode): LocalListField {
  if (Array.isArray(field)) {
    return field;
  }
  const next = asList(field, source);
  const values = { ...next.values };
  const stale = { ...(next.stale ?? {}) };
  delete values[lang];
  delete stale[lang];
  return { values, stale: tidyStale(stale) };
}

/** 单字段复核通过：清除该语言的待复核标记。 */
export function approveField(field: LocalField | null | undefined, lang: LangCode, source: LangCode): LocalField {
  if (typeof field === 'string' || !field?.stale?.[lang]) {
    return field ?? asText(field, source);
  }
  const stale = { ...field.stale };
  delete stale[lang];
  return { ...field, stale: tidyStale(stale) };
}

export function approveListField(field: LocalListField | null | undefined, lang: LangCode, source: LangCode): LocalListField {
  if (Array.isArray(field) || !field?.stale?.[lang]) {
    return field ?? asList(field, source);
  }
  const stale = { ...field.stale };
  delete stale[lang];
  return { ...field, stale: tidyStale(stale) };
}

// ---------------------------------------------------------------------------
// 构造
// ---------------------------------------------------------------------------

export function makeField(source: LangCode, value = ''): LocalText {
  return value ? { values: { [source]: value } } : { values: {} };
}

export function makeListField(source: LangCode, value: string[] = []): LocalTextList {
  return value.length > 0 ? { values: { [source]: value } } : { values: {} };
}

// ---------------------------------------------------------------------------
// 整份简历遍历：对所有可翻译字段施加变换
// ---------------------------------------------------------------------------

type FieldTransform = (field: LocalField) => LocalField;
type ListFieldTransform = (field: LocalListField) => LocalListField;

export function mapResumeFields(resume: Resume, onField: FieldTransform, onListField: ListFieldTransform): Resume {
  return {
    ...resume,
    title: onField(resume.title),
    summary: onField(resume.summary),
    sections: resume.sections.map((section) => ({ ...section, title: onField(section.title) })),
    basicInfo: {
      ...resume.basicInfo,
      headline: onField(resume.basicInfo.headline),
      location: onField(resume.basicInfo.location),
    },
    workExperiences: resume.workExperiences.map((item) => ({
      ...item,
      companyName: onField(item.companyName),
      position: onField(item.position),
      responsibilities: onListField(item.responsibilities),
      achievements: onListField(item.achievements),
    })),
    educations: resume.educations.map((item) => ({
      ...item,
      school: onField(item.school),
      major: onField(item.major),
      honors: onListField(item.honors),
    })),
    skills: resume.skills.map((item) => ({ ...item, name: onField(item.name) })),
    projects: resume.projects.map((item) => ({
      ...item,
      name: onField(item.name),
      role: onField(item.role),
      description: onField(item.description),
      techStack: onListField(item.techStack),
      outcomes: onListField(item.outcomes),
    })),
  };
}

/** 为整份简历新增语言：从 from 复制现有内容到 to（不覆盖已有译文、不置待复核）。 */
export function seedResumeLanguage(resume: Resume, from: LangCode, to: LangCode): Resume {
  const source = resume.i18n.sourceLanguage;
  return mapResumeFields(
    resume,
    (field) => seedField(field, from, to, source),
    (field) => seedListField(field, from, to, source),
  );
}

/** 从整份简历移出某个语言（其它语言数据保持不变）。 */
export function removeResumeLanguage(resume: Resume, lang: LangCode): Resume {
  const source = resume.i18n.sourceLanguage;
  return mapResumeFields(
    resume,
    (field) => removeFieldLang(field, lang, source),
    (field) => removeListFieldLang(field, lang, source),
  );
}

/** 整份语言一键复核通过。 */
export function approveResumeLanguage(resume: Resume, lang: LangCode): Resume {
  const source = resume.i18n.sourceLanguage;
  return mapResumeFields(
    resume,
    (field) => approveField(field, lang, source),
    (field) => approveListField(field, lang, source),
  );
}

function fieldIsStale(field: LocalField | LocalListField, lang: LangCode): boolean {
  return Boolean(field && typeof field === 'object' && !Array.isArray(field) && field.stale?.[lang]);
}

/** 统计某语言待复核字段数量。 */
export function countResumeStale(resume: Resume, lang: LangCode): number {
  if (lang === resume.i18n.sourceLanguage) {
    return 0;
  }
  let count = 0;
  const countField = (field: LocalField) => {
    if (fieldIsStale(field, lang)) {
      count += 1;
    }
    return field;
  };
  const countList = (field: LocalListField) => {
    if (fieldIsStale(field, lang)) {
      count += 1;
    }
    return field;
  };
  mapResumeFields(resume, countField, countList);
  return count;
}
