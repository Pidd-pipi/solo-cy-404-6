import { Education } from './education';
import { ResumeI18n, LocalField } from './i18n';
import { Project } from './project';
import { Skill } from './skill';
import { WorkExperience } from './work-experience';

export type ResumeSectionType = 'summary' | 'work' | 'education' | 'skills' | 'projects';

export interface ResumeBasicInfo {
  // 姓名与联系方式为跨语言共享的结构信息；headline / location 可翻译
  fullName: string;
  headline: LocalField;
  phone: string;
  email: string;
  location: LocalField;
  website: string;
  avatarUrl?: string;
}

export interface ResumeSection {
  id: ResumeSectionType; // 结构键，非随机 id
  title: LocalField; // 可翻译的模块标题
  enabled: boolean;
}

export interface Resume {
  id: string;
  title: LocalField;
  templateId: string;
  createdAt: string;
  updatedAt: string;
  i18n: ResumeI18n;
  basicInfo: ResumeBasicInfo;
  summary: LocalField;
  // sections 是所有语言共享的唯一模块顺序与开关
  sections: ResumeSection[];
  workExperiences: WorkExperience[];
  educations: Education[];
  skills: Skill[];
  projects: Project[];
}

export type ResumeCollection = Resume[];
