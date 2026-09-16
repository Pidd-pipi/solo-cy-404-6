// 多语言对照数据模型
//
// 一份简历在所有语言间共享「结构」（模块顺序、条目 id、姓名、日期、联系方式、
// 枚举、熟练度等），只对可翻译文字保存各语言副本。每个可翻译字段都是一个
// LocalField（标量）或 LocalListField（字符串数组），记录：
//   values：语言码 -> 译文；源语言（原文）也存放在这里
//   stale ：语言码 -> true，表示该语言译文相对原文已过期、待复核
//
// 为兼容旧备份，字段也允许直接是 string / string[]（v1 形态），
// 读取时由 utils/migration.ts 统一升格为对象形态。

export type LangCode = string;

export interface LangVariant {
  code: LangCode;
  label: string;
}

/** 每份简历的多语言元信息。languages[0] 即源语言（原文语言），不可删除。 */
export interface ResumeI18n {
  languages: LangVariant[];
  sourceLanguage: LangCode;
}

export interface LocalText {
  values: Partial<Record<LangCode, string>>;
  stale?: Partial<Record<LangCode, true>>;
}

export interface LocalTextList {
  values: Partial<Record<LangCode, string[]>>;
  stale?: Partial<Record<LangCode, true>>;
}

/** 标量可翻译字段；裸 string 仅用于 v1 旧数据。 */
export type LocalField = string | LocalText;

/** 列表可翻译字段；裸 string[] 仅用于 v1 旧数据。 */
export type LocalListField = string[] | LocalTextList;
