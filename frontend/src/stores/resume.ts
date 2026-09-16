import { create } from 'zustand';
import { EducationLevel, SkillCategory, SkillLevel } from '../types/enums';
import type { LangCode, LangVariant, LocalField } from '../types/i18n';
import { Resume, ResumeBasicInfo, ResumeSection, ResumeSectionType } from '../types/resume';
import { createId } from '../utils/format';
import {
  approveResumeLanguage,
  makeField,
  makeListField,
  removeResumeLanguage,
  resolveLangCode,
  seedResumeLanguage,
  SOURCE_LANGUAGE,
  SOURCE_LANGUAGE_LABEL,
} from '../utils/i18n';
import { migrateResume } from '../utils/migration';
import { readStorage, storageKeys, writeStorage } from '../utils/storage';
import { useTemplateStore } from './template';

const defaultSections: ResumeSection[] = [
  { id: 'summary', title: makeField(SOURCE_LANGUAGE, '职业摘要'), enabled: true },
  { id: 'work', title: makeField(SOURCE_LANGUAGE, '工作经历'), enabled: true },
  { id: 'projects', title: makeField(SOURCE_LANGUAGE, '项目经历'), enabled: true },
  { id: 'skills', title: makeField(SOURCE_LANGUAGE, '技能矩阵'), enabled: true },
  { id: 'education', title: makeField(SOURCE_LANGUAGE, '教育经历'), enabled: true },
];

const defaultBasicInfo: ResumeBasicInfo = {
  fullName: '林知远',
  headline: makeField(SOURCE_LANGUAGE, '增长产品经理 / AI 工具策划'),
  phone: '+86 138 0000 2831',
  email: 'lin.resume@example.com',
  location: makeField(SOURCE_LANGUAGE, '上海'),
  website: 'portfolio.example.com',
  avatarUrl: '',
};

function buildResume(templateId = 'atelier', title = '我的智能简历'): Resume {
  const now = new Date().toISOString();

  return {
    id: createId('resume'),
    title: makeField(SOURCE_LANGUAGE, title),
    templateId,
    createdAt: now,
    updatedAt: now,
    i18n: { languages: [{ code: SOURCE_LANGUAGE, label: SOURCE_LANGUAGE_LABEL }], sourceLanguage: SOURCE_LANGUAGE },
    basicInfo: defaultBasicInfo,
    summary: makeField(
      SOURCE_LANGUAGE,
      '8 年产品与增长经验，曾从 0 到 1 搭建多端内容生产工具，擅长用数据识别业务瓶颈并组织跨团队交付。',
    ),
    sections: defaultSections,
    workExperiences: [
      {
        id: createId('work'),
        companyName: makeField(SOURCE_LANGUAGE, '青松科技'),
        position: makeField(SOURCE_LANGUAGE, '高级产品经理'),
        startDate: '2021.06',
        endDate: '',
        responsibilities: makeListField(SOURCE_LANGUAGE, ['负责 AI 内容工作台的规划、验证与迭代节奏', '组织设计、算法、工程和增长团队共创核心工作流']),
        achievements: makeListField(SOURCE_LANGUAGE, ['核心编辑链路转化率提升 32%', '将简历生成任务平均耗时从 42 分钟降至 11 分钟']),
      },
      {
        id: createId('work'),
        companyName: makeField(SOURCE_LANGUAGE, '云岭数据'),
        position: makeField(SOURCE_LANGUAGE, '增长产品经理'),
        startDate: '2018.03',
        endDate: '2021.05',
        responsibilities: makeListField(SOURCE_LANGUAGE, ['搭建用户分层运营模型', '推进看板、实验平台和增长活动配置化']),
        achievements: makeListField(SOURCE_LANGUAGE, ['季度留存提升 18%', '实验上线周期缩短 45%']),
      },
    ],
    educations: [
      {
        id: createId('edu'),
        school: makeField(SOURCE_LANGUAGE, '华东理工大学'),
        major: makeField(SOURCE_LANGUAGE, '信息管理与信息系统'),
        level: EducationLevel.Bachelor,
        startDate: '2013.09',
        endDate: '2017.06',
        gpa: '3.7 / 4.0',
        honors: makeListField(SOURCE_LANGUAGE, ['优秀毕业生', '校级创新项目一等奖']),
      },
    ],
    skills: [
      { id: createId('skill'), name: makeField(SOURCE_LANGUAGE, '产品策略'), level: SkillLevel.Expert, proficiency: 5, category: SkillCategory.Soft },
      { id: createId('skill'), name: makeField(SOURCE_LANGUAGE, 'A/B Testing'), level: SkillLevel.Advanced, proficiency: 4, category: SkillCategory.Technology },
      { id: createId('skill'), name: makeField(SOURCE_LANGUAGE, 'SQL / 数据分析'), level: SkillLevel.Advanced, proficiency: 4, category: SkillCategory.Technology },
      { id: createId('skill'), name: makeField(SOURCE_LANGUAGE, '英语沟通'), level: SkillLevel.Intermediate, proficiency: 3, category: SkillCategory.Language },
    ],
    projects: [
      {
        id: createId('project'),
        name: makeField(SOURCE_LANGUAGE, 'AI 简历诊断引擎'),
        role: makeField(SOURCE_LANGUAGE, '产品负责人'),
        startDate: '2023.11',
        endDate: '2024.08',
        techStack: makeListField(SOURCE_LANGUAGE, ['React', 'LLM Workflow', 'Embedding', 'Analytics']),
        description: makeField(SOURCE_LANGUAGE, '为求职者提供结构化简历评分、岗位匹配建议和改写建议。'),
        outcomes: makeListField(SOURCE_LANGUAGE, ['首月完成 4.6 万份简历诊断', '付费转化率较旧版提升 21%']),
      },
    ],
  };
}

// 启动即迁移：旧的单语言备份会被整体升格为源语言（中文）数据。
const storedResumes = readStorage<unknown[]>(storageKeys.resumes, []).map(migrateResume);
const initialResumes = storedResumes.length > 0 ? storedResumes : [buildResume('atelier', '产品经理求职简历')];
const initialActiveResumeId = readStorage<string | null>(storageKeys.activeResumeId, initialResumes[0]?.id ?? null);

// 首次打开（无任何本地数据）时把演示简历落盘，保证刷新 / 直接用 URL 打开
// 某个简历 id 时数据仍然存在，而不是在内存里另建一份新简历。
if (storedResumes.length === 0) {
  writeStorage(storageKeys.resumes, initialResumes);
  writeStorage(storageKeys.activeResumeId, initialActiveResumeId);
}

function persist(state: Pick<ResumeState, 'resumes' | 'activeResumeId'>): void {
  writeStorage(storageKeys.resumes, state.resumes);
  writeStorage(storageKeys.activeResumeId, state.activeResumeId);
}

function cloneResume(source: Resume, newTitle?: LocalField): Resume {
  // 深拷贝隔离：复制出的语言版本与原件互不影响。
  const clone: Resume = structuredClone(source);
  clone.id = createId('resume');
  clone.title = newTitle ?? source.title;
  clone.createdAt = new Date().toISOString();
  clone.updatedAt = clone.createdAt;
  clone.workExperiences = clone.workExperiences.map((item) => ({ ...item, id: createId('work') }));
  clone.educations = clone.educations.map((item) => ({ ...item, id: createId('edu') }));
  clone.skills = clone.skills.map((item) => ({ ...item, id: createId('skill') }));
  clone.projects = clone.projects.map((item) => ({ ...item, id: createId('project') }));
  return clone;
}

interface ResumeState {
  resumes: Resume[];
  activeResumeId: string | null;
  createResume: () => string;
  duplicateResume: (resumeId: string) => string | null;
  deleteResume: (resumeId: string) => void;
  setActiveResume: (resumeId: string | null) => void;
  updateResume: (resumeId: string, patch: Partial<Resume>) => void;
  updateBasicInfo: (resumeId: string, patch: Partial<ResumeBasicInfo>) => void;
  reorderSections: (resumeId: string, sectionIds: ResumeSectionType[]) => void;
  toggleSection: (resumeId: string, sectionId: ResumeSectionType) => void;
  replaceResumes: (resumes: Resume[], activeResumeId?: string | null) => void;
  addLanguage: (resumeId: string, variant: LangVariant, copyFrom?: LangCode) => void;
  removeLanguage: (resumeId: string, lang: LangCode) => void;
  approveLanguage: (resumeId: string, lang: LangCode) => void;
}

export const useResumeStore = create<ResumeState>((set, get) => ({
  resumes: initialResumes,
  activeResumeId: initialActiveResumeId,
  createResume: () => {
    const selectedTemplateId = useTemplateStore.getState().selectedTemplateId;
    const resume = buildResume(selectedTemplateId, `新简历 ${get().resumes.length + 1}`);
    set((state) => ({
      resumes: [resume, ...state.resumes],
      activeResumeId: resume.id,
    }));
    persist(get());
    return resume.id;
  },
  duplicateResume: (resumeId) => {
    const source = get().resumes.find((resume) => resume.id === resumeId);
    if (!source) {
      return null;
    }

    const sourceTitle = source.title;
    const copyLabel =
      sourceTitle && typeof sourceTitle === 'object'
        ? { ...sourceTitle, values: { ...sourceTitle.values, [source.i18n.sourceLanguage]: `${sourceTitle.values[source.i18n.sourceLanguage] ?? '简历'} 副本` } }
        : sourceTitle;
    const clone = cloneResume(source, copyLabel);

    set((state) => ({
      resumes: [clone, ...state.resumes],
      activeResumeId: clone.id,
    }));
    persist(get());
    return clone.id;
  },
  deleteResume: (resumeId) => {
    set((state) => {
      const nextResumes = state.resumes.filter((resume) => resume.id !== resumeId);
      const activeResumeId =
        state.activeResumeId === resumeId ? nextResumes[0]?.id ?? null : state.activeResumeId;
      return { resumes: nextResumes, activeResumeId };
    });
    persist(get());
  },
  setActiveResume: (resumeId) => {
    set({ activeResumeId: resumeId });
    persist(get());
  },
  updateResume: (resumeId, patch) => {
    set((state) => ({
      resumes: state.resumes.map((resume) =>
        resume.id === resumeId
          ? {
              ...resume,
              ...patch,
              updatedAt: new Date().toISOString(),
            }
          : resume,
      ),
    }));
    persist(get());
  },
  updateBasicInfo: (resumeId, patch) => {
    set((state) => ({
      resumes: state.resumes.map((resume) =>
        resume.id === resumeId
          ? {
              ...resume,
              basicInfo: { ...resume.basicInfo, ...patch },
              updatedAt: new Date().toISOString(),
            }
          : resume,
      ),
    }));
    persist(get());
  },
  reorderSections: (resumeId, sectionIds) => {
    set((state) => ({
      resumes: state.resumes.map((resume) => {
        if (resume.id !== resumeId) {
          return resume;
        }
        const sortedSections = sectionIds
          .map((sectionId) => resume.sections.find((section) => section.id === sectionId))
          .filter((section): section is ResumeSection => Boolean(section));
        return { ...resume, sections: sortedSections, updatedAt: new Date().toISOString() };
      }),
    }));
    persist(get());
  },
  toggleSection: (resumeId, sectionId) => {
    set((state) => ({
      resumes: state.resumes.map((resume) =>
        resume.id === resumeId
          ? {
              ...resume,
              sections: resume.sections.map((section) =>
                section.id === sectionId ? { ...section, enabled: !section.enabled } : section,
              ),
              updatedAt: new Date().toISOString(),
            }
          : resume,
      ),
    }));
    persist(get());
  },
  replaceResumes: (resumes, activeResumeId) => {
    set({ resumes, activeResumeId: activeResumeId ?? resumes[0]?.id ?? null });
    persist(get());
  },
  addLanguage: (resumeId, variant, copyFrom) => {
    set((state) => ({
      resumes: state.resumes.map((resume) => {
        if (resume.id !== resumeId) {
          return resume;
        }
        // 忽略首尾空白，按大小写不敏感判重（en / EN / en 视为同一语言）。
        const code = variant.code.trim();
        if (!code || resume.i18n.languages.some((item) => item.code.trim().toLowerCase() === code.toLowerCase())) {
          return resume;
        }
        const normalizedVariant = { code, label: variant.label.trim() || code };
        const from = resolveLangCode(resume.i18n.languages, copyFrom ?? resume.i18n.sourceLanguage) ?? resume.i18n.sourceLanguage;
        const seeded = seedResumeLanguage(resume, from, normalizedVariant.code);
        return {
          ...seeded,
          i18n: { ...seeded.i18n, languages: [...seeded.i18n.languages, normalizedVariant] },
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
    persist(get());
  },
  removeLanguage: (resumeId, lang) => {
    set((state) => ({
      resumes: state.resumes.map((resume) => {
        if (resume.id !== resumeId) {
          return resume;
        }
        // 大小写不敏感地解析到实际代码；源语言恒不可移除。
        const actual = resolveLangCode(resume.i18n.languages, lang);
        if (!actual || actual === resume.i18n.sourceLanguage) {
          return resume;
        }
        const stripped = removeResumeLanguage(resume, actual);
        return {
          ...stripped,
          i18n: { ...stripped.i18n, languages: stripped.i18n.languages.filter((item) => item.code !== actual) },
          updatedAt: new Date().toISOString(),
        };
      }),
    }));
    persist(get());
  },
  approveLanguage: (resumeId, lang) => {
    set((state) => ({
      resumes: state.resumes.map((resume) => {
        if (resume.id !== resumeId) {
          return resume;
        }
        const actual = resolveLangCode(resume.i18n.languages, lang);
        if (!actual) {
          return resume;
        }
        return { ...approveResumeLanguage(resume, actual), updatedAt: new Date().toISOString() };
      }),
    }));
    persist(get());
  },
}));
