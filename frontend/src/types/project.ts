import { LocalField, LocalListField } from './i18n';

export interface Project {
  id: string;
  name: LocalField;
  role: LocalField;
  // 日期为跨语言共享的结构信息
  startDate: string;
  endDate: string;
  techStack: LocalListField;
  description: LocalField;
  outcomes: LocalListField;
}
