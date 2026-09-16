import { EducationLevel } from './enums';
import { LocalField, LocalListField } from './i18n';

export interface Education {
  id: string;
  school: LocalField;
  major: LocalField;
  level: EducationLevel;
  // 日期 / GPA / 学历枚举为跨语言共享的结构信息
  startDate: string;
  endDate: string;
  gpa: string;
  honors: LocalListField;
}
