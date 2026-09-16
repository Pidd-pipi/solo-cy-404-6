import { LocalField, LocalListField } from './i18n';

export interface WorkExperience {
  id: string;
  companyName: LocalField;
  position: LocalField;
  // 日期为跨语言共享的结构信息
  startDate: string;
  endDate: string;
  responsibilities: LocalListField;
  achievements: LocalListField;
}
