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
// 「该语言已有译文（含显式清空）」以键存在为准：空字符串 / 空数组也是明确的翻译结果，
// 不能因为内容为空就回退到原文或被当成未翻译。返回 undefined 表示该语言尚无译文键。
const ownTextValue = (values: Partial<Record<LangCode, string>>, lang: LangCode): string | undefined =>
  Object.prototype.hasOwnProperty.call(values, lang) && typeof values[lang] === 'string' ? values[lang] : undefined;
const ownListValue = (values: Partial<Record<LangCode, string[]>>, lang: LangCode): string[] | undefined =>
  Object.prototype.hasOwnProperty.call(values, lang) && Array.isArray(values[lang]) ? values[lang] : undefined;

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
  const values = field.values ?? {};
  // 键存在即视为该语言已有翻译：显式清空的字段保持为空，不回退原文。
  const own = ownTextValue(values, lang);
  if (own !== undefined) {
    return { value: own, isFallback: false, isStale: field.stale?.[lang] === true };
  }
  const origin = values[source];
  if (typeof origin === 'string') {
    return { value: origin, isFallback: lang !== source, isStale: false };
  }
  return { value: '', isFallback: false, isStale: field.stale?.[lang] === true };
}

export function getLocalList(field: LocalListField | null | undefined, lang: LangCode, source: LangCode): ResolvedList {
  if (Array.isArray(field)) {
    return { value: field, isFallback: lang !== source, isStale: false };
  }
  if (!field) {
    return { value: [], isFallback: true, isStale: false };
  }
  const values = field.values ?? {};
  // 键存在即视为该语言已有翻译：被清空的列表保持为空数组，不回退显示源语言条目。
  const own = ownListValue(values, lang);
  if (own !== undefined) {
    return { value: own, isFallback: false, isStale: field.stale?.[lang] === true };
  }
  const origin = values[source];
  if (Array.isArray(origin)) {
    return { value: origin, isFallback: lang !== source, isStale: false };
  }
  return { value: [], isFallback: false, isStale: field.stale?.[lang] === true };
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
    // 键存在即代表该语言维护过译文（即使被显式清空），原文变化时同样需要复核。
    if (ownTextValue(values, lang) !== undefined) {
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
    if (ownListValue(values, lang) !== undefined) {
      stale[lang] = true;
    } else {
      delete stale[lang];
    }
  }
  return { values, stale: tidyStale(stale) };
}

/** 复制现有语言内容为新语言起步；目标语言已有译文键（含显式清空）时不覆盖。 */
export function seedField(field: LocalField | null | undefined, from: LangCode, to: LangCode, source: LangCode): LocalField {
  const next = asText(field, source);
  if (ownTextValue(next.values, to) !== undefined) {
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
  if (ownListValue(next.values, to) !== undefined) {
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

// ---------------------------------------------------------------------------
// 语言代码规范化与重复版本合并
// ---------------------------------------------------------------------------

/** 规范化语言代码：忽略首尾空白；重复判断时大小写不敏感。 */
export function normalizeLangCode(code: LangCode): LangCode {
  return code.trim();
}

/** 比较用键：去空白并转小写（zh-CN / zh-cn / EN / en 视为同一语言）。 */
export function langKey(code: LangCode): string {
  return normalizeLangCode(code).toLowerCase();
}

interface LangGroup {
  key: string;
  /** 合并后保留的规范代码：沿用语言列表中首次出现的写法。 */
  canonical: LangCode;
  /** 同一语言的所有代码写法（含大小写/空白差异），按出现顺序。 */
  members: LangCode[];
}

function groupCodes(codes: LangCode[]): LangGroup[] {
  const groups: LangGroup[] = [];
  for (const raw of codes) {
    const code = normalizeLangCode(raw);
    if (!code) {
      continue;
    }
    const key = langKey(code);
    const group = groups.find((item) => item.key === key);
    if (group) {
      if (!group.members.includes(code)) {
        group.members.push(code);
      }
    } else {
      groups.push({ key, canonical: code, members: [code] });
    }
  }
  return groups;
}

/** 在语言列表中大小写不敏感地解析出实际代码；不存在时返回 null。 */
export function resolveLangCode(languages: LangVariant[], selected: LangCode): LangCode | null {
  const key = langKey(selected);
  return languages.find((item) => langKey(item.code) === key)?.code ?? null;
}

function dedupeLanguageVariants(languages: LangVariant[], groups: LangGroup[]): LangVariant[] {
  return groups.map((group) => {
    // 规范代码优先沿用语言列表中已登记的名称；未登记（只存在于字段里的孤儿译文）也补登，避免内容不可见。
    const variant = languages.find((item) => langKey(item.code) === group.key);
    const preset = LANG_PRESETS.find((item) => langKey(item.code) === group.key);
    return { code: group.canonical, label: variant?.label || preset?.label || group.canonical };
  });
}

function mergeTextField(field: LocalField | null | undefined, groups: LangGroup[], source: LangCode): LocalText {
  const text = asText(field, source);
  const values: LocalText['values'] = {};
  const stale: Record<LangCode, true> = {};
  for (const group of groups) {
    const candidates = group.members
      .map((member) => text.values[member])
      .filter((value): value is string => typeof value === 'string');
    if (candidates.length === 0) {
      continue;
    }
    const nonEmpty = candidates.find((value) => value.trim() !== '');
    // 非空译文优先，避免被另一种写法里的空值覆盖；全部为空时取首个写法。
    values[group.canonical] = nonEmpty ?? candidates[0];
    if (group.canonical === source) {
      continue; // 源语言不参与待复核
    }
    const hadStale = group.members.some((member) => text.stale?.[member] === true);
    const distinct = new Set(candidates.map((value) => value.trim()));
    // 写法间内容不一致即为冲突：保留一种（非空优先），但标记待复核，不静默丢弃。
    if (hadStale || distinct.size > 1) {
      stale[group.canonical] = true;
    }
  }
  return { values, stale: tidyStale(stale) };
}

function mergeListField(field: LocalListField | null | undefined, groups: LangGroup[], source: LangCode): LocalTextList {
  const list = asList(field, source);
  const values: LocalTextList['values'] = {};
  const stale: Record<LangCode, true> = {};
  for (const group of groups) {
    const candidates = group.members
      .map((member) => list.values[member])
      .filter((value): value is string[] => Array.isArray(value));
    if (candidates.length === 0) {
      continue;
    }
    const nonEmpty = candidates.find((value) => value.some((line) => line.trim() !== ''));
    // 非空列表优先；都为空则保留显式清空的空数组（取首个写法）。
    values[group.canonical] = nonEmpty ? [...nonEmpty] : [...candidates[0]];
    if (group.canonical === source) {
      continue;
    }
    const hadStale = group.members.some((member) => list.stale?.[member] === true);
    const signatures = new Set(candidates.map((value) => JSON.stringify(value)));
    if (hadStale || signatures.size > 1) {
      stale[group.canonical] = true;
    }
  }
  return { values, stale: tidyStale(stale) };
}

/** 收集简历所有可翻译字段里实际出现过的语言代码（含未登记在 i18n.languages 中的）。 */
function collectResumeFieldCodes(resume: Resume): LangCode[] {
  const codes: LangCode[] = [];
  const seen = new Set<string>();
  const remember = (field: LocalField | LocalListField) => {
    if (field && typeof field === 'object' && !Array.isArray(field)) {
      for (const code of Object.keys(field.values ?? {})) {
        const key = langKey(code);
        if (!seen.has(key)) {
          seen.add(key);
          codes.push(code);
        }
      }
    }
  };
  mapResumeFields(
    resume,
    (field) => {
      remember(field);
      return field;
    },
    (field) => {
      remember(field);
      return field;
    },
  );
  return codes;
}

/**
 * 合并简历里大小写不同的重复语言：
 * - 语言列表按大小写不敏感去重，保留首次出现的写法与名称；
 * - 各字段同语言的多种写法合并为唯一键：非空译文优先、保留待复核状态，
 *   写法间内容冲突时标记待复核（由人复核），绝不静默丢失内容；
 * - 源语言身份映射到合并后的规范代码。
 */
export function dedupeResumeLanguages(resume: Resume): Resume {
  const groupsMap = new Map<string, LangGroup>();
  const groups: LangGroup[] = [];
  // 先以语言列表建立分组，规范代码以列表中首次出现的写法为准。
  for (const variant of resume.i18n.languages) {
    const code = normalizeLangCode(variant.code);
    if (!code) {
      continue;
    }
    const key = langKey(code);
    const existing = groupsMap.get(key);
    if (!existing) {
      const group: LangGroup = { key, canonical: code, members: [code] };
      groupsMap.set(key, group);
      groups.push(group);
    } else if (!existing.members.includes(code)) {
      existing.members.push(code);
    }
  }
  // 再把仅出现在字段里的代码（未登记语言、大小写不同等）并入对应分组。
  for (const rawCode of collectResumeFieldCodes(resume)) {
    const code = normalizeLangCode(rawCode);
    const key = langKey(code);
    const existing = groupsMap.get(key);
    if (existing) {
      if (!existing.members.includes(code)) {
        existing.members.push(code);
      }
    } else {
      const group: LangGroup = { key, canonical: code, members: [code] };
      groupsMap.set(key, group);
      groups.push(group);
    }
  }
  if (groups.length === 0) {
    return resume;
  }

  const originalSource = normalizeLangCode(resume.i18n.sourceLanguage);
  const sourceGroup = groups.find((group) => group.key === langKey(originalSource)) ?? groups[0];
  const merged = mapResumeFields(
    resume,
    (field) => mergeTextField(field, groups, sourceGroup.canonical),
    (field) => mergeListField(field, groups, sourceGroup.canonical),
  );
  return {
    ...merged,
    i18n: {
      languages: dedupeLanguageVariants(resume.i18n.languages, groups),
      sourceLanguage: sourceGroup.canonical,
    },
  };
}

/** Profile 没有语言列表，按字段里出现的代码合并；规范代码优先取常用预设写法。 */
export function dedupeProfileLanguages<T>(profile: T, fieldKeys: (keyof T)[]): T {
  const codes: LangCode[] = [];
  for (const key of fieldKeys) {
    const field = profile[key] as LocalField | undefined;
    if (field && typeof field === 'object' && !Array.isArray(field)) {
      codes.push(...Object.keys(field.values ?? {}));
    }
  }
  const groups = groupCodes(codes).map((group) => {
    const preset = LANG_PRESETS.find((item) => langKey(item.code) === group.key);
    return preset ? { ...group, canonical: preset.code } : group;
  });
  if (groups.length === 0) {
    return profile;
  }
  const next: Record<string, unknown> = { ...(profile as object) };
  for (const key of fieldKeys) {
    next[key as string] = mergeTextField(profile[key] as LocalField, groups, SOURCE_LANGUAGE);
  }
  return next as T;
}

/** 统计某语言待复核字段数量。 */
export function countResumeStale(resume: Resume, lang: LangCode): number {
  if (langKey(lang) === langKey(resume.i18n.sourceLanguage)) {
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
