// 多语言核心逻辑自检：npm run i18n:selftest
// @ts-ignore - 项目未安装 @types/node，assert 为 Node 内置模块
import assert from 'node:assert';
import {
  approveResumeLanguage,
  countResumeStale,
  getLocal,
  getLocalList,
  mapResumeFields,
  removeResumeLanguage,
  seedResumeLanguage,
  setLocal,
  setLocalList,
  setSource,
  setSourceList,
} from '../src/utils/i18n';
import { migrateProfile, migrateResume, migrateWorkspaceSnapshot } from '../src/utils/migration';
import type { Resume } from '../src/types/resume';

const ZH = 'zh-CN';
const EN = 'en';
let passed = 0;
const ok = (name: string) => {
  passed += 1;
  console.log(`✓ ${name}`);
};

// 1. v1 裸字符串迁移：旧文字成为源语言原文
const v1 = {
  id: 'r1',
  title: '中文简历',
  templateId: 'atelier',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  basicInfo: { fullName: '张三', headline: '工程师', phone: '1', email: 'a@b.c', location: '上海', website: '' },
  summary: '摘要原文',
  sections: [{ id: 'summary', title: '职业摘要', enabled: true }],
  workExperiences: [
    { id: 'w1', companyName: '青松科技', position: '产品经理', startDate: '2021.06', endDate: '至今', responsibilities: ['职责一'], achievements: [] },
  ],
  educations: [],
  skills: [],
  projects: [],
};
const resume: Resume = migrateResume(v1);
assert.strictEqual(resume.i18n.sourceLanguage, ZH);
assert.strictEqual(getLocal(resume.title, ZH, ZH).value, '中文简历');
assert.strictEqual(getLocal(resume.title, EN, ZH).value, '中文简历', '未翻译时英文回退原文');
assert.strictEqual(getLocal(resume.title, EN, ZH).isFallback, true);
assert.strictEqual(resume.workExperiences[0].startDate, '2021.06');
assert.deepStrictEqual(getLocalList(resume.workExperiences[0].responsibilities, ZH, ZH).value, ['职责一']);
assert.strictEqual(resume.basicInfo.fullName, '张三');
ok('v1 迁移：旧文字升格为源语言，缺失译文回退原文');

// 2. 破损数据不崩
const broken = migrateResume({ title: null, sections: 'bad', workExperiences: [{ companyName: 123 }] });
assert.strictEqual(broken.sections.length, 5, '缺失模块被补齐为 5 个');
assert.strictEqual(getLocal(broken.workExperiences[0].companyName, ZH, ZH).value, '');
assert.ok(broken.id.startsWith('resume_migrated'));
ok('v1 迁移：破损 / 缺字段数据可容错打开');

// 3. 添加语言 = 从源语言复制起步
let r = seedResumeLanguage(resume, ZH, EN);
assert.strictEqual(getLocal(r.title, EN, ZH).value, '中文简历');
assert.strictEqual(getLocalList(r.workExperiences[0].responsibilities, EN, ZH).value[0], '职责一');
assert.strictEqual(r.i18n.languages.length, 1, 'seed 不改语言列表（由 store 追加）');
ok('添加语言：从现有版本复制内容起步');

// 4. 改原文 -> 已有译文的语言标记 stale；无译文语言不标记
const langs = [ZH, EN, 'ja'];
let field = setLocal(r.summary, EN, ZH, 'English summary');
const r2: Resume = { ...r, i18n: { ...r.i18n, languages: [...r.i18n.languages, { code: EN, label: 'English' }] } };
field = setSource(field, ZH, '新摘要原文', langs);
assert.strictEqual(field.stale?.[EN], true, '英文译文存在 -> 标待复核');
assert.strictEqual(field.stale?.ja, undefined, '日文无译文 -> 不标记');
assert.strictEqual(getLocal(field, EN, ZH).value, 'English summary', '旧译文保留');
assert.strictEqual(getLocal(field, EN, ZH).isStale, true);
ok('原文更新：旧译文保留且仅对已有译文语言标记待复核');

// 5. 列表字段同样 stale
let list = setLocalList(r2.workExperiences[0].responsibilities, EN, ZH, ['Duty one']);
list = setSourceList(list, ZH, ['新职责'], langs);
assert.strictEqual(list.stale?.[EN], true);
list = setLocalList(list, EN, ZH, ['Duty one edited']);
assert.strictEqual(list.stale?.[EN], undefined, '重新编辑译文即清除自身待复核');
ok('列表字段：改原文标待复核，编辑译文清标记');

// 6. 整份统计 / 一键复核
let r3 = mapResumeFields(
  r2,
  (f) => (f === r2.summary ? field : f),
  (f) => f,
);
assert.strictEqual(countResumeStale(r3, EN), 1);
r3 = approveResumeLanguage(r3, EN);
assert.strictEqual(countResumeStale(r3, EN), 0);
ok('整份语言：待复核计数与一键复核通过');

// 7. 移出语言不影响其它语言
const r4 = removeResumeLanguage(r2, EN);
assert.strictEqual(getLocal(r4.title, ZH, ZH).value, '中文简历', '源语言保留');
assert.strictEqual(getLocal(r4.title, EN, ZH).isFallback, true, '英文译文已删除 -> 回退');
assert.strictEqual(getLocal(r4.title, EN, ZH).value, '中文简历');
// 源语言本身仍完好且结构字段不变
assert.strictEqual(r4.workExperiences[0].startDate, '2021.06');
ok('移出语言：仅删除该语言，其它语言与结构不受影响');

// 8. profile 迁移
const p1 = migrateProfile({ fullName: '张三', headline: '工程师', targetRole: 'PM', location: '北京', summary: '个人摘要' });
assert.strictEqual(p1.fullName, '张三');
assert.strictEqual(getLocal(p1.headline, EN, ZH).value, '工程师');
assert.strictEqual(getLocal(p1.targetRole, ZH, ZH).value, 'PM');
ok('全局 profile 迁移');

// 9. 旧备份（无 version）经 workspace 迁移打开
const ws = migrateWorkspaceSnapshot({ resumes: [v1], profile: { fullName: '张三' }, selectedTemplateId: 'atelier', theme: 'dark' });
assert.strictEqual(ws.version, 2);
assert.strictEqual(ws.resumes.length, 1);
assert.strictEqual(ws.theme, 'dark');
assert.strictEqual(ws.activeResumeId, 'r1');
ok('旧备份恢复：无 version 备份可正常打开并升级到 v2');

// 10. v2 备份保持待复核状态（幂等迁移）
const v2Snapshot = {
  version: 2,
  resumes: [{ ...v2Shape(r3), i18n: { languages: [{ code: ZH, label: '中文' }, { code: EN, label: 'English' }], sourceLanguage: ZH } }],
  profile: { fullName: '张三' },
};
const ws2 = migrateWorkspaceSnapshot(v2Snapshot);
const rr = ws2.resumes[0];
assert.deepStrictEqual(rr.i18n.languages.map((l) => l.code), [ZH, EN]);
ok('v2 备份恢复：语言列表与字段保持一致');

function v2Shape(resume: Resume) {
  return JSON.parse(JSON.stringify(resume));
}

console.log(`\n全部 ${passed} 项自检通过`);
