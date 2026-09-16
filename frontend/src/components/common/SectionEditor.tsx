import { Plus, Trash2 } from 'lucide-react';
import { EducationLevel, educationLevelLabels, SkillCategory, SkillLevel, skillCategoryLabels, skillLevelLabels, SkillProficiency } from '../../types/enums';
import type { LangCode } from '../../types/i18n';
import { Resume, ResumeSectionType } from '../../types/resume';
import { createId } from '../../utils/format';
import { makeField, makeListField, SOURCE_LANGUAGE } from '../../utils/i18n';
import { Button } from './Button';
import { LocalizedInput, LocalizedLineList, LocalizedTextarea, SharedBadge } from './LocalizedField';

interface SectionEditorProps {
  resume: Resume;
  sectionId: ResumeSectionType;
  lang: LangCode;
  onChange: (patch: Partial<Resume>) => void;
}

const inputClass =
  'w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]';
const blockClass = 'border border-[var(--border)] bg-[var(--surface)] p-4';

function sectionFieldTitle(resume: Resume, sectionId: ResumeSectionType) {
  return resume.sections.find((section) => section.id === sectionId)?.title ?? makeField(SOURCE_LANGUAGE, '模块');
}

interface SectionCtx {
  resume: Resume;
  lang: LangCode;
  source: LangCode;
  languages: LangCode[];
  onChange: (patch: Partial<Resume>) => void;
}

function SectionHeader({ resume, sectionId, ctx, onAdd }: { resume: Resume; sectionId: ResumeSectionType; ctx: SectionCtx; onAdd: () => void }) {
  const sectionIndex = resume.sections.findIndex((section) => section.id === sectionId);
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0 flex-1">
        <LocalizedInput
          field={sectionFieldTitle(resume, sectionId)}
          lang={ctx.lang}
          source={ctx.source}
          languages={ctx.languages}
          ariaLabel="模块标题"
          className="font-display text-2xl font-semibold"
          onChange={(title) =>
            ctx.onChange({
              sections: resume.sections.map((section, index) => (index === sectionIndex ? { ...section, title } : section)),
            })
          }
        />
      </div>
      <Button icon={<Plus size={16} aria-hidden />} onClick={onAdd}>
        添加
      </Button>
    </div>
  );
}

export function SectionEditor({ resume, sectionId, lang, onChange }: SectionEditorProps) {
  const ctx: SectionCtx = {
    resume,
    lang,
    source: resume.i18n.sourceLanguage,
    languages: resume.i18n.languages.map((item) => item.code),
    onChange,
  };

  if (sectionId === 'summary') {
    return (
      <section className={blockClass}>
        <h2 className="font-display text-2xl font-semibold">
          <LocalizedInput
            field={sectionFieldTitle(resume, sectionId)}
            lang={lang}
            source={ctx.source}
            languages={ctx.languages}
            ariaLabel="模块标题"
            onChange={(title) =>
              onChange({ sections: resume.sections.map((section) => (section.id === 'summary' ? { ...section, title } : section)) })
            }
          />
        </h2>
        <label className="mt-5 block space-y-2 text-sm font-medium">
          <span>职业摘要</span>
          <LocalizedTextarea
            field={resume.summary}
            lang={lang}
            source={ctx.source}
            languages={ctx.languages}
            ariaLabel="职业摘要"
            onChange={(summary) => onChange({ summary })}
          />
        </label>
      </section>
    );
  }

  if (sectionId === 'work') {
    return (
      <section className={blockClass}>
        <SectionHeader
          resume={resume}
          sectionId={sectionId}
          ctx={ctx}
          onAdd={() =>
            onChange({
              workExperiences: [
                ...resume.workExperiences,
                {
                  id: createId('work'),
                  companyName: makeField(ctx.source, lang === ctx.source ? '新公司' : ''),
                  position: makeField(ctx.source, lang === ctx.source ? '职位名称' : ''),
                  startDate: '',
                  endDate: '',
                  responsibilities: makeListField(ctx.source, lang === ctx.source ? ['负责事项'] : []),
                  achievements: makeListField(ctx.source, lang === ctx.source ? ['关键成果'] : []),
                },
              ],
            })
          }
        />
        <div className="mt-5 space-y-4">
          {resume.workExperiences.map((item) => (
            <div className="border border-[var(--border)] bg-[var(--bg)] p-4" key={item.id}>
              <div className="grid gap-3 md:grid-cols-2">
                <LocalizedInput field={item.companyName} lang={lang} source={ctx.source} languages={ctx.languages} ariaLabel="公司名称" onChange={(companyName) => onChange({ workExperiences: resume.workExperiences.map((work) => (work.id === item.id ? { ...work, companyName } : work)) })} />
                <LocalizedInput field={item.position} lang={lang} source={ctx.source} languages={ctx.languages} ariaLabel="职位" onChange={(position) => onChange({ workExperiences: resume.workExperiences.map((work) => (work.id === item.id ? { ...work, position } : work)) })} />
                <label className="space-y-1 text-sm font-medium">
                  <span className="flex items-center gap-2">开始时间 <SharedBadge /></span>
                  <input className={inputClass} value={item.startDate} aria-label="开始时间" placeholder="开始时间" onChange={(event) => onChange({ workExperiences: resume.workExperiences.map((work) => (work.id === item.id ? { ...work, startDate: event.target.value } : work)) })} />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span className="flex items-center gap-2">结束时间 <SharedBadge /></span>
                  <input className={inputClass} value={item.endDate} aria-label="结束时间" placeholder="结束时间" onChange={(event) => onChange({ workExperiences: resume.workExperiences.map((work) => (work.id === item.id ? { ...work, endDate: event.target.value } : work)) })} />
                </label>
              </div>
              <label className="mt-3 block space-y-2 text-sm font-medium">
                <span>职责描述，每行一条</span>
                <LocalizedLineList field={item.responsibilities} lang={lang} source={ctx.source} languages={ctx.languages} ariaLabel="职责描述" onChange={(responsibilities) => onChange({ workExperiences: resume.workExperiences.map((work) => (work.id === item.id ? { ...work, responsibilities } : work)) })} />
              </label>
              <label className="mt-3 block space-y-2 text-sm font-medium">
                <span>成就列表，每行一条</span>
                <LocalizedLineList field={item.achievements} lang={lang} source={ctx.source} languages={ctx.languages} ariaLabel="成就列表" onChange={(achievements) => onChange({ workExperiences: resume.workExperiences.map((work) => (work.id === item.id ? { ...work, achievements } : work)) })} />
              </label>
              <Button
                className="mt-3"
                icon={<Trash2 size={15} aria-hidden />}
                variant="ghost"
                onClick={() => onChange({ workExperiences: resume.workExperiences.filter((work) => work.id !== item.id) })}
              >
                删除经历
              </Button>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (sectionId === 'education') {
    return (
      <section className={blockClass}>
        <SectionHeader
          resume={resume}
          sectionId={sectionId}
          ctx={ctx}
          onAdd={() =>
            onChange({
              educations: [
                ...resume.educations,
                {
                  id: createId('edu'),
                  school: makeField(ctx.source, lang === ctx.source ? '学校名称' : ''),
                  major: makeField(ctx.source, lang === ctx.source ? '专业' : ''),
                  level: EducationLevel.Bachelor,
                  startDate: '',
                  endDate: '',
                  gpa: '',
                  honors: makeListField(ctx.source, []),
                },
              ],
            })
          }
        />
        <div className="mt-5 space-y-4">
          {resume.educations.map((item) => (
            <div className="border border-[var(--border)] bg-[var(--bg)] p-4" key={item.id}>
              <div className="grid gap-3 md:grid-cols-2">
                <LocalizedInput field={item.school} lang={lang} source={ctx.source} languages={ctx.languages} ariaLabel="学校" onChange={(school) => onChange({ educations: resume.educations.map((education) => (education.id === item.id ? { ...education, school } : education)) })} />
                <LocalizedInput field={item.major} lang={lang} source={ctx.source} languages={ctx.languages} ariaLabel="专业" onChange={(major) => onChange({ educations: resume.educations.map((education) => (education.id === item.id ? { ...education, major } : education)) })} />
                <label className="space-y-1 text-sm font-medium">
                  <span className="flex items-center gap-2">学历 <SharedBadge /></span>
                  <select
                    className={inputClass}
                    value={item.level}
                    aria-label="学历"
                    onChange={(event) =>
                      onChange({
                        educations: resume.educations.map((education) =>
                          education.id === item.id ? { ...education, level: event.target.value as EducationLevel } : education,
                        ),
                      })
                    }
                  >
                    {Object.values(EducationLevel).map((level) => (
                      <option key={level} value={level}>
                        {educationLevelLabels[level]}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span className="flex items-center gap-2">GPA <SharedBadge /></span>
                  <input className={inputClass} value={item.gpa} aria-label="GPA" placeholder="GPA" onChange={(event) => onChange({ educations: resume.educations.map((education) => (education.id === item.id ? { ...education, gpa: event.target.value } : education)) })} />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span className="flex items-center gap-2">开始时间 <SharedBadge /></span>
                  <input className={inputClass} value={item.startDate} aria-label="开始时间" placeholder="开始时间" onChange={(event) => onChange({ educations: resume.educations.map((education) => (education.id === item.id ? { ...education, startDate: event.target.value } : education)) })} />
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span className="flex items-center gap-2">结束时间 <SharedBadge /></span>
                  <input className={inputClass} value={item.endDate} aria-label="结束时间" placeholder="结束时间" onChange={(event) => onChange({ educations: resume.educations.map((education) => (education.id === item.id ? { ...education, endDate: event.target.value } : education)) })} />
                </label>
              </div>
              <label className="mt-3 block space-y-2 text-sm font-medium">
                <span>荣誉，每行一条</span>
                <LocalizedLineList field={item.honors} lang={lang} source={ctx.source} languages={ctx.languages} ariaLabel="荣誉" onChange={(honors) => onChange({ educations: resume.educations.map((education) => (education.id === item.id ? { ...education, honors } : education)) })} />
              </label>
              <Button
                className="mt-3"
                icon={<Trash2 size={15} aria-hidden />}
                variant="ghost"
                onClick={() => onChange({ educations: resume.educations.filter((education) => education.id !== item.id) })}
              >
                删除教育
              </Button>
            </div>
          ))}
        </div>
      </section>
    );
  }

  if (sectionId === 'skills') {
    return (
      <section className={blockClass}>
        <SectionHeader
          resume={resume}
          sectionId={sectionId}
          ctx={ctx}
          onAdd={() =>
            onChange({
              skills: [
                ...resume.skills,
                {
                  id: createId('skill'),
                  name: makeField(ctx.source, lang === ctx.source ? '新技能' : ''),
                  level: SkillLevel.Intermediate,
                  proficiency: 3,
                  category: SkillCategory.Technology,
                },
              ],
            })
          }
        />
        <div className="mt-5 space-y-3">
          {resume.skills.map((item) => (
            <div className="grid gap-3 border border-[var(--border)] bg-[var(--bg)] p-3 md:grid-cols-[1.2fr_1fr_1fr_0.8fr_auto]" key={item.id}>
              <LocalizedInput field={item.name} lang={lang} source={ctx.source} languages={ctx.languages} ariaLabel="技能名称" onChange={(name) => onChange({ skills: resume.skills.map((skill) => (skill.id === item.id ? { ...skill, name } : skill)) })} />
              <select
                className={inputClass}
                value={item.category}
                aria-label="技能分类"
                onChange={(event) =>
                  onChange({
                    skills: resume.skills.map((skill) =>
                      skill.id === item.id ? { ...skill, category: event.target.value as SkillCategory } : skill,
                    ),
                  })
                }
              >
                {Object.values(SkillCategory).map((category) => (
                  <option key={category} value={category}>
                    {skillCategoryLabels[category]}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                value={item.level}
                aria-label="熟练度标签"
                onChange={(event) =>
                  onChange({
                    skills: resume.skills.map((skill) =>
                      skill.id === item.id ? { ...skill, level: event.target.value as SkillLevel } : skill,
                    ),
                  })
                }
              >
                {Object.values(SkillLevel).map((level) => (
                  <option key={level} value={level}>
                    {skillLevelLabels[level]}
                  </option>
                ))}
              </select>
              <select
                className={inputClass}
                value={item.proficiency}
                aria-label="熟练度分数"
                onChange={(event) =>
                  onChange({
                    skills: resume.skills.map((skill) =>
                      skill.id === item.id ? { ...skill, proficiency: Number(event.target.value) as SkillProficiency } : skill,
                    ),
                  })
                }
              >
                {([1, 2, 3, 4, 5] as SkillProficiency[]).map((score) => (
                  <option key={score} value={score}>
                    {score}
                  </option>
                ))}
              </select>
              <Button
                className="px-3"
                icon={<Trash2 size={15} aria-hidden />}
                variant="ghost"
                aria-label="删除技能"
                onClick={() => onChange({ skills: resume.skills.filter((skill) => skill.id !== item.id) })}
              />
            </div>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section className={blockClass}>
      <SectionHeader
        resume={resume}
        sectionId={sectionId}
        ctx={ctx}
        onAdd={() =>
          onChange({
            projects: [
              ...resume.projects,
              {
                id: createId('project'),
                name: makeField(ctx.source, lang === ctx.source ? '新项目' : ''),
                role: makeField(ctx.source, lang === ctx.source ? '角色' : ''),
                startDate: '',
                endDate: '',
                techStack: makeListField(ctx.source, []),
                description: makeField(ctx.source, lang === ctx.source ? '项目描述' : ''),
                outcomes: makeListField(ctx.source, []),
              },
            ],
          })
        }
      />
      <div className="mt-5 space-y-4">
        {resume.projects.map((item) => (
          <div className="border border-[var(--border)] bg-[var(--bg)] p-4" key={item.id}>
            <div className="grid gap-3 md:grid-cols-2">
              <LocalizedInput field={item.name} lang={lang} source={ctx.source} languages={ctx.languages} ariaLabel="项目名称" onChange={(name) => onChange({ projects: resume.projects.map((project) => (project.id === item.id ? { ...project, name } : project)) })} />
              <LocalizedInput field={item.role} lang={lang} source={ctx.source} languages={ctx.languages} ariaLabel="角色" onChange={(role) => onChange({ projects: resume.projects.map((project) => (project.id === item.id ? { ...project, role } : project)) })} />
              <label className="space-y-1 text-sm font-medium">
                <span className="flex items-center gap-2">开始时间 <SharedBadge /></span>
                <input className={inputClass} value={item.startDate} aria-label="开始时间" placeholder="开始时间" onChange={(event) => onChange({ projects: resume.projects.map((project) => (project.id === item.id ? { ...project, startDate: event.target.value } : project)) })} />
              </label>
              <label className="space-y-1 text-sm font-medium">
                <span className="flex items-center gap-2">结束时间 <SharedBadge /></span>
                <input className={inputClass} value={item.endDate} aria-label="结束时间" placeholder="结束时间" onChange={(event) => onChange({ projects: resume.projects.map((project) => (project.id === item.id ? { ...project, endDate: event.target.value } : project)) })} />
              </label>
            </div>
            <label className="mt-3 block space-y-2 text-sm font-medium">
              <span>技术栈，每行一项</span>
              <LocalizedLineList field={item.techStack} lang={lang} source={ctx.source} languages={ctx.languages} ariaLabel="技术栈" onChange={(techStack) => onChange({ projects: resume.projects.map((project) => (project.id === item.id ? { ...project, techStack } : project)) })} />
            </label>
            <label className="mt-3 block space-y-2 text-sm font-medium">
              <span>项目描述</span>
              <LocalizedTextarea field={item.description} lang={lang} source={ctx.source} languages={ctx.languages} ariaLabel="项目描述" onChange={(description) => onChange({ projects: resume.projects.map((project) => (project.id === item.id ? { ...project, description } : project)) })} />
            </label>
            <label className="mt-3 block space-y-2 text-sm font-medium">
              <span>成果，每行一条</span>
              <LocalizedLineList field={item.outcomes} lang={lang} source={ctx.source} languages={ctx.languages} ariaLabel="成果" onChange={(outcomes) => onChange({ projects: resume.projects.map((project) => (project.id === item.id ? { ...project, outcomes } : project)) })} />
            </label>
            <Button
              className="mt-3"
              icon={<Trash2 size={15} aria-hidden />}
              variant="ghost"
              onClick={() => onChange({ projects: resume.projects.filter((project) => project.id !== item.id) })}
            >
              删除项目
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}
