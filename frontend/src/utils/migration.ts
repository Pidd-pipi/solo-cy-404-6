// v1（单语言、裸字符串）-> v2（多语言对照）迁移。
//
// 所有进入应用的数据（localStorage 启动读取、备份导入）都先过这里，
// 因此旧备份缺少多语言数据时仍能正常打开：旧文字整体作为源语言原文。
// 迁移同时是防御性规范化：v2 数据缺字段 / 字段破损也不会导致渲染崩溃。

import { EducationLevel, SkillCategory, SkillLevel, SkillProficiency } from '../types/enums';
import type { LangCode, LangVariant, LocalField, LocalListField, LocalText, LocalTextList, ResumeI18n } from '../types/i18n';
import type { Profile } from '../types/profile';
import type { Resume, ResumeBasicInfo, ResumeSection, ResumeSectionType } from '../types/resume';
import { makeField, makeListField, SOURCE_LANGUAGE, SOURCE_LANGUAGE_LABEL } from './i18n';

export const SNAPSHOT_VERSION = 2;

const DEFAULT_SECTION_TITLES: Record<ResumeSectionType, string> = {
  summary: '职业摘要',
  work: '工作经历',
  projects: '项目经历',
  skills: '技能矩阵',
  education: '教育经历',
};
const SECTION_ORDER: ResumeSectionType[] = ['summary', 'work', 'projects', 'skills', 'education'];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function asString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function asStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string');
  }
  return [];
}

function enumValue<T extends string>(value: unknown, values: readonly T[], fallback: T): T {
  return typeof value === 'string' && (values as readonly string[]).includes(value) ? (value as T) : fallback;
}

// ---------------------------------------------------------------------------
// 可翻译字段升格
// ---------------------------------------------------------------------------

/**
 * 标量字段 -> LocalText。
 * - 裸字符串（v1）：整体归入源语言
 * - 对象（v2）：保留已有各语言译文与 stale，只做容错
 */
export function migrateField(raw: unknown, source: LangCode): LocalField {
  if (typeof raw === 'string') {
    return makeField(source, raw);
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const record = raw as Record<string, unknown>;
    const values: LocalText['values'] = {};
    const valuesRaw = asRecord(record.values);
    for (const [code, text] of Object.entries(valuesRaw)) {
      if (typeof text === 'string') {
        values[code] = text;
      }
    }
    const stale: LocalText['stale'] = {};
    const staleRaw = asRecord(record.stale);
    for (const [code, flag] of Object.entries(staleRaw)) {
      if (flag === true) {
        stale[code] = true;
      }
    }
    const result: LocalText = { values };
    if (Object.keys(stale).length > 0) {
      result.stale = stale;
    }
    return result;
  }
  return makeField(source);
}

export function migrateListField(raw: unknown, source: LangCode): LocalListField {
  if (Array.isArray(raw)) {
    return makeListField(source, asStringArray(raw));
  }
  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    const values: LocalTextList['values'] = {};
    for (const [code, lines] of Object.entries(asRecord(record.values))) {
      if (Array.isArray(lines)) {
        values[code] = asStringArray(lines);
      }
    }
    const stale: LocalTextList['stale'] = {};
    for (const [code, flag] of Object.entries(asRecord(record.stale))) {
      if (flag === true) {
        stale[code] = true;
      }
    }
    const result: LocalTextList = { values };
    if (Object.keys(stale).length > 0) {
      result.stale = stale;
    }
    return result;
  }
  return makeListField(source);
}

function migrateI18n(raw: unknown): ResumeI18n {
  const record = asRecord(raw);
  const languagesRaw = Array.isArray(record.languages) ? record.languages : null;
  if (languagesRaw) {
    const languages: LangVariant[] = [];
    for (const item of languagesRaw) {
      const lang = asRecord(item);
      const code = asString(lang.code).trim();
      if (!code) {
        continue;
      }
      languages.push({ code, label: asString(lang.label) || code });
    }
    if (languages.length > 0) {
      const sourceLanguage = asString(record.sourceLanguage);
      return { languages, sourceLanguage: languages.some((lang) => lang.code === sourceLanguage) ? sourceLanguage : languages[0].code };
    }
  }
  return { languages: [{ code: SOURCE_LANGUAGE, label: SOURCE_LANGUAGE_LABEL }], sourceLanguage: SOURCE_LANGUAGE };
}

function migrateBasicInfo(raw: unknown, source: LangCode): ResumeBasicInfo {
  const info = asRecord(raw);
  return {
    fullName: asString(info.fullName),
    headline: migrateField(info.headline, source),
    phone: asString(info.phone),
    email: asString(info.email),
    location: migrateField(info.location, source),
    website: asString(info.website),
    avatarUrl: asString(info.avatarUrl),
  };
}

function migrateSections(raw: unknown, source: LangCode): ResumeSection[] {
  if (Array.isArray(raw) && raw.length > 0) {
    // 保持旧数据中模块的存储顺序，再补齐缺失模块
    const stored: ResumeSection[] = [];
    const seen = new Set<ResumeSectionType>();
    for (const item of raw) {
      const record = asRecord(item);
      const id = enumValue<ResumeSectionType>(record.id, SECTION_ORDER, 'summary');
      if (seen.has(id)) {
        continue;
      }
      seen.add(id);
      stored.push({
        id,
        title: migrateField(record.title, source),
        enabled: asBoolean(record.enabled, true),
      });
    }
    for (const id of SECTION_ORDER) {
      if (!seen.has(id)) {
        stored.push({ id, title: makeField(source, DEFAULT_SECTION_TITLES[id]), enabled: true });
      }
    }
    return stored;
  }
  return SECTION_ORDER.map((id) => ({ id, title: makeField(source, DEFAULT_SECTION_TITLES[id]), enabled: true }));
}

export function migrateResume(raw: unknown): Resume {
  const record = asRecord(raw);
  const i18n = migrateI18n(record.i18n);
  const source = i18n.sourceLanguage;
  const now = new Date().toISOString();

  return {
    id: asString(record.id) || `resume_migrated_${Date.now().toString(36)}`,
    title: migrateField(record.title, source),
    templateId: asString(record.templateId) || 'atelier',
    createdAt: asString(record.createdAt) || now,
    updatedAt: asString(record.updatedAt) || now,
    i18n,
    basicInfo: migrateBasicInfo(record.basicInfo, source),
    summary: migrateField(record.summary, source),
    sections: migrateSections(record.sections, source),
    workExperiences: asStringArrayNested(record.workExperiences).map((item) => ({
      id: item.id,
      companyName: migrateField(item.companyName, source),
      position: migrateField(item.position, source),
      startDate: item.startDate,
      endDate: item.endDate,
      responsibilities: migrateListField(item.responsibilities, source),
      achievements: migrateListField(item.achievements, source),
    })),
    educations: asStringArrayNested(record.educations).map((item) => ({
      id: item.id,
      school: migrateField(item.school, source),
      major: migrateField(item.major, source),
      level: enumValue(item.level, Object.values(EducationLevel), EducationLevel.Bachelor),
      startDate: item.startDate,
      endDate: item.endDate,
      gpa: item.gpa,
      honors: migrateListField(item.honors, source),
    })),
    skills: asStringArrayNested(record.skills).map((item) => ({
      id: item.id,
      name: migrateField(item.name, source),
      level: enumValue(item.level, Object.values(SkillLevel), SkillLevel.Intermediate),
      proficiency: clampProficiency(item.proficiency),
      category: enumValue(item.category, Object.values(SkillCategory), SkillCategory.Technology),
    })),
    projects: asStringArrayNested(record.projects).map((item) => ({
      id: item.id,
      name: migrateField(item.name, source),
      role: migrateField(item.role, source),
      startDate: item.startDate,
      endDate: item.endDate,
      techStack: migrateListField(item.techStack, source),
      description: migrateField(item.description, source),
      outcomes: migrateListField(item.outcomes, source),
    })),
  };
}

interface NormalizedItem {
  id: string;
  startDate: string;
  endDate: string;
  gpa: string;
  [key: string]: unknown;
}

function asStringArrayNested(raw: unknown): NormalizedItem[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.map((entry, index) => {
    const record = asRecord(entry);
    return {
      ...record,
      id: asString(record.id) || `item_migrated_${index}_${Date.now().toString(36)}`,
      startDate: asString(record.startDate),
      endDate: asString(record.endDate),
      gpa: asString(record.gpa),
    };
  });
}

function clampProficiency(raw: unknown): SkillProficiency {
  const value = typeof raw === 'number' ? Math.round(raw) : Number.NaN;
  return ([1, 2, 3, 4, 5] as SkillProficiency[]).find((score) => score === value) ?? 3;
}

export function migrateProfile(raw: unknown): Profile {
  const record = asRecord(raw);
  const source = SOURCE_LANGUAGE;
  return {
    fullName: asString(record.fullName),
    headline: migrateField(record.headline, source),
    phone: asString(record.phone),
    email: asString(record.email),
    location: migrateField(record.location, source),
    website: asString(record.website),
    avatarUrl: asString(record.avatarUrl),
    targetRole: migrateField(record.targetRole, source),
    summary: migrateField(record.summary, source),
  };
}

/** 备份导入入口：无 version 视为 v1；resumes / profile 均过迁移。 */
export function migrateWorkspaceSnapshot(raw: unknown): {
  version: number;
  resumes: Resume[];
  profile: Profile;
  activeResumeId: string | null;
  selectedTemplateId: string;
  theme: 'light' | 'dark';
  exportedAt?: string;
} {
  const record = asRecord(raw);
  const resumes = Array.isArray(record.resumes) ? record.resumes.map(migrateResume) : [];
  const profile = migrateProfile(record.profile);
  const activeResumeId = asString(record.activeResumeId) || null;
  const selectedTemplateId = asString(record.selectedTemplateId) || 'atelier';
  const theme = record.theme === 'dark' ? 'dark' : 'light';
  return {
    version: SNAPSHOT_VERSION,
    resumes,
    profile,
    activeResumeId: activeResumeId && resumes.some((resume) => resume.id === activeResumeId) ? activeResumeId : resumes[0]?.id ?? null,
    selectedTemplateId,
    theme,
    exportedAt: asString(record.exportedAt) || undefined,
  };
}
