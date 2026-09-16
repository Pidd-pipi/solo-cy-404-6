import { SkillCategory, SkillLevel, SkillProficiency } from './enums';
import { LocalField } from './i18n';

export interface Skill {
  id: string;
  name: LocalField;
  // 枚举与熟练度分数为跨语言共享的结构信息
  level: SkillLevel;
  proficiency: SkillProficiency;
  category: SkillCategory;
}
