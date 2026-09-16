export enum SkillLevel {
  Beginner = 'beginner',
  Elementary = 'elementary',
  Intermediate = 'intermediate',
  Advanced = 'advanced',
  Expert = 'expert',
}

export enum EducationLevel {
  HighSchool = 'high_school',
  Associate = 'associate',
  Bachelor = 'bachelor',
  Master = 'master',
  Doctor = 'doctor',
}

export enum SkillCategory {
  Technology = 'technology',
  Language = 'language',
  Soft = 'soft',
}

export type SkillProficiency = 1 | 2 | 3 | 4 | 5;

export const skillLevelLabels: Record<SkillLevel, string> = {
  [SkillLevel.Beginner]: '入门',
  [SkillLevel.Elementary]: '基础',
  [SkillLevel.Intermediate]: '熟练',
  [SkillLevel.Advanced]: '高级',
  [SkillLevel.Expert]: '专家',
};

export const educationLevelLabels: Record<EducationLevel, string> = {
  [EducationLevel.HighSchool]: '高中',
  [EducationLevel.Associate]: '专科',
  [EducationLevel.Bachelor]: '本科',
  [EducationLevel.Master]: '硕士',
  [EducationLevel.Doctor]: '博士',
};

export const skillCategoryLabels: Record<SkillCategory, string> = {
  [SkillCategory.Technology]: '技术',
  [SkillCategory.Language]: '语言',
  [SkillCategory.Soft]: '软技能',
};

// 枚举值本身是跨语言共享的结构信息，这里仅提供英文显示标签，
// 预览时非中文语言统一回退到英文。
export const skillLevelLabelsEn: Record<SkillLevel, string> = {
  [SkillLevel.Beginner]: 'Beginner',
  [SkillLevel.Elementary]: 'Elementary',
  [SkillLevel.Intermediate]: 'Intermediate',
  [SkillLevel.Advanced]: 'Advanced',
  [SkillLevel.Expert]: 'Expert',
};

export const educationLevelLabelsEn: Record<EducationLevel, string> = {
  [EducationLevel.HighSchool]: 'High School',
  [EducationLevel.Associate]: 'Associate',
  [EducationLevel.Bachelor]: 'Bachelor',
  [EducationLevel.Master]: 'Master',
  [EducationLevel.Doctor]: 'Doctor',
};

export const skillCategoryLabelsEn: Record<SkillCategory, string> = {
  [SkillCategory.Technology]: 'Technology',
  [SkillCategory.Language]: 'Language',
  [SkillCategory.Soft]: 'Soft Skills',
};

