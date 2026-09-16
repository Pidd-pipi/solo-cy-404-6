import { LocalField } from './i18n';

export interface Profile {
  // 姓名与联系方式为跨语言共享的结构信息
  fullName: string;
  headline: LocalField;
  phone: string;
  email: string;
  location: LocalField;
  website: string;
  avatarUrl: string;
  targetRole: LocalField;
  summary: LocalField;
}
