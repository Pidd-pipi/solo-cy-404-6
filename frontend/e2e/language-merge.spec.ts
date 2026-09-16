import { expect, Page, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 语言代码合并专项测试。
//
// 真实备份中刻意构造：
//   - 一个源语言 zh-CN
//   - 同一语言的多个大小写变体 en / EN（语言列表 + 各字段里均出现）
//   - 字段孤儿代码 fr / FR（译文存在，但语言列表里未登记）
//   - 冲突译文、空值与非空并存、列表冲突、全部为空等多种字段形态
// 经真实文件「导入」入口后，断言语言选项、译文取值、待复核标记与导出选择。
//
// 每个用例 beforeEach 都清空 localStorage 并重新导入同一份备份，互不影响、可重复运行；
// 用例名包含具体语言代码与场景，失败时可直接定位是哪种语言/哪种情况。

const RESUME_ID = 'merge-1';
const RESUMES_KEY = 'smart-resume:resumes';

function buildBackup() {
  return {
    version: 2,
    exportedAt: '2026-01-01T00:00:00.000Z',
    activeResumeId: RESUME_ID,
    selectedTemplateId: 'atelier',
    theme: 'light' as const,
    profile: {
      fullName: '张三',
      // 大小写变体在全局资料里也出现，迁移时同样合并
      headline: { values: { 'zh-CN': '源 Headline', en: 'Profile EN', EN: 'Profile EN Upper' } },
      phone: '',
      email: '',
      location: '',
      website: '',
      avatarUrl: '',
      targetRole: '',
      summary: '',
    },
    resumes: [
      {
        id: RESUME_ID,
        // 场景 A：空与非空并存（en 为空、EN 有值）-> 保留非空，冲突标待复核
        title: { values: { 'zh-CN': '源标题', en: '', EN: 'Upper Title' } },
        templateId: 'atelier',
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
        i18n: {
          languages: [
            { code: 'zh-CN', label: '中文' },
            { code: 'en', label: 'English' },
            { code: 'EN', label: 'English Upper' },
          ],
          sourceLanguage: 'zh-CN',
        },
        basicInfo: {
          fullName: '张三',
          // 场景 B：该字段两个变体全部为空 -> 合并后仍为空，不标待复核
          headline: { values: { 'zh-CN': '源 Headline', en: '', EN: '' } },
          phone: '13900000000',
          email: 'merge@example.com',
          // 场景 C：非空与空并存（en 有值、EN 为空）-> 保留非空，冲突标待复核
          location: { values: { 'zh-CN': '上海', en: 'Shanghai', EN: '' } },
          website: '',
        },
        // 场景 D：非空且内容冲突 -> 保留首个写法的非空值，标待复核
        summary: { values: { 'zh-CN': '源摘要', en: 'EN Summary', EN: 'EN Summary Upper' } },
        sections: [
          { id: 'summary', title: { values: { 'zh-CN': '职业摘要' } }, enabled: true },
          { id: 'work', title: { values: { 'zh-CN': '工作经历' } }, enabled: true },
          { id: 'projects', title: { values: { 'zh-CN': '项目经历' } }, enabled: true },
          { id: 'skills', title: { values: { 'zh-CN': '技能矩阵' } }, enabled: true },
          { id: 'education', title: { values: { 'zh-CN': '教育经历' } }, enabled: true },
        ],
        workExperiences: [
          {
            id: 'w1',
            // 场景 E：两个变体内容一致 -> 合并不标待复核
            companyName: { values: { 'zh-CN': '公司', en: 'Company', EN: 'Company' } },
            // 场景 F：内容一致但原本就待复核 -> 待复核状态保留
            position: { values: { 'zh-CN': '职位', en: 'Role', EN: 'Role' }, stale: { EN: true } },
            startDate: '2020.01',
            endDate: '',
            // 场景 G：列表内容冲突 -> 保留首个非空写法，标待复核
            responsibilities: { values: { en: ['Duty A', 'Duty B'], EN: ['Duty X'] } },
            // 场景 H：列表两个变体全部为空 -> 空数组保留，不标待复核
            achievements: { values: { en: [], EN: [] } },
          },
        ],
        educations: [
          {
            id: 'e1',
            school: { values: { 'zh-CN': '学校' } },
            major: '',
            level: 'bachelor',
            startDate: '2016.09',
            endDate: '2020.06',
            gpa: '',
            // 场景 I：列表孤儿代码，仅一种写法 fr -> 补登语言，不标待复核
            honors: { values: { fr: ['Honneur FR'] } },
          },
        ],
        skills: [],
        projects: [
          {
            id: 'p1',
            // 场景 J：孤儿代码 fr / FR 内容冲突 -> 规范为 fr，保留非空，标待复核
            name: { values: { 'zh-CN': '源项目', fr: 'Projet FR', FR: 'Projet FR Upper' } },
            role: '',
            startDate: '2023.01',
            endDate: '',
            techStack: [],
            // 场景 K：孤儿代码只有一种写法 fr -> 不标待复核
            description: { values: { 'zh-CN': '源项目描述', fr: 'Description FR' } },
            outcomes: [],
          },
        ],
      },
    ],
  };
}

const fixturePath = path.join(os.tmpdir(), 'language-merge-backup.json');

async function resetStorage(page: Page): Promise<void> {
  await page.goto('/resumes');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByRole('heading', { name: '简历列表' }).waitFor();
}

async function importFixture(page: Page): Promise<void> {
  await resetStorage(page);
  await page.getByTestId('import-file').setInputFiles(fixturePath);
  await page.waitForLoadState('networkidle');
  await page.getByRole('heading', { name: '简历列表' }).waitFor();
}

async function readMergedResume(page: Page): Promise<any> {
  const resumes = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]'), RESUMES_KEY);
  expect(resumes.length, '导入后应恰好有一份简历').toBe(1);
  expect(resumes[0].id, '导入的简历 id 与备份一致').toBe(RESUME_ID);
  return resumes[0];
}

async function exportOptionValues(page: Page): Promise<string[]> {
  await page.goto(`/resumes/${RESUME_ID}/export`);
  return page.getByTestId('export-lang').evaluate((select) =>
    Array.from((select as HTMLSelectElement).options).map((option) => option.value),
  );
}

test.describe('语言代码合并（大小写变体 / 孤儿代码 / 冲突译文）', () => {
  test.beforeAll(() => {
    fs.writeFileSync(fixturePath, JSON.stringify(buildBackup()), 'utf8');
  });

  test.afterAll(() => {
    fs.rmSync(fixturePath, { force: true });
  });

  test.beforeEach(async ({ page }) => {
    await importFixture(page);
  });

  test('[zh-CN/en/EN/fr] 导入后语言选项唯一：en/EN 合并、孤儿 fr 补登、源语言保留', async ({ page }) => {
    const resume = await readMergedResume(page);
    expect(resume.i18n.sourceLanguage, '源语言身份稳定').toBe('zh-CN');
    expect(resume.i18n.languages.map((l: any) => l.code), '大小写变体合并、孤儿补登').toEqual(['zh-CN', 'en', 'fr']);
    expect(resume.i18n.languages.find((l: any) => l.code === 'en').label, '合并后沿用首次登记名称').toBe('English');
    expect(resume.i18n.languages.find((l: any) => l.code === 'fr').label, '孤儿语言用预设名称').toBe('Français');

    // 编辑器胶囊同样唯一
    await page.goto(`/resumes/${RESUME_ID}/edit`);
    await page.getByTestId('resume-preview').waitFor();
    await expect(page.getByTestId('lang-en'), '只保留一个 en 胶囊').toHaveCount(1);
    await expect(page.getByTestId('lang-EN'), '大写 EN 胶囊不应存在').toHaveCount(0);
    await expect(page.getByTestId('lang-fr'), '孤儿 fr 被补登为可选语言').toHaveCount(1);
    await expect(page.getByTestId('lang-zh-CN'), '源语言保留').toHaveCount(1);

    // 导出语言下拉与语言列表一致
    expect(await exportOptionValues(page), '导出选项与合并后语言一致').toEqual(['zh-CN', 'en', 'fr']);
  });

  test('[en] 译文取值：非空优先于空、全空保持空、冲突保留非空', async ({ page }) => {
    const resume = await readMergedResume(page);
    const en = (field: any) => field.values.en;

    expect(en(resume.title), '[en] 空与非空并存时保留非空').toBe('Upper Title');
    expect(en(resume.basicInfo.headline), '[en] 两种写法全空 -> 仍为空字符串').toBe('');
    expect(en(resume.basicInfo.location), '[en] 非空与空并存时保留非空').toBe('Shanghai');
    expect(en(resume.summary), '[en] 非空冲突时保留首个写法的非空值').toBe('EN Summary');
    expect(en(resume.workExperiences[0].companyName), '[en] 一致译文原样保留').toBe('Company');
    expect(Object.keys(resume.workExperiences[0].companyName.values), '[en/EN] 旧大写键已并入规范键').not.toContain('EN');
  });

  test('[fr] 字段孤儿代码译文：合并为规范 fr，取值与待复核正确', async ({ page }) => {
    const resume = await readMergedResume(page);
    const project = resume.projects[0];
    expect(Object.keys(project.name.values).sort(), '[fr/FR] 合并为单个 fr 键').toEqual(['fr', 'zh-CN']);
    expect(project.name.values.fr, '[fr] 冲突时保留首个非空写法').toBe('Projet FR');
    expect(project.name.stale?.fr, '[fr] 写法冲突 -> 待复核').toBe(true);
    expect(project.description.values.fr, '[fr] 单一写法译文保留').toBe('Description FR');
    expect(project.description.stale?.fr, '[fr] 无冲突 -> 不标待复核').toBeUndefined();
    expect(resume.educations[0].honors.values.fr, '[fr] 列表孤儿译文保留').toEqual(['Honneur FR']);

    // UI：切到孤儿语言 fr 后能看到合并内容
    await page.goto(`/resumes/${RESUME_ID}/edit`);
    await page.getByTestId('resume-preview').waitFor();
    await page.getByTestId('lang-fr').click();
    await page.getByTestId('section-projects').click();
    const nameField = page.getByTestId('field-项目名称');
    await expect(nameField.locator('input'), '[fr] 编辑器显示合并后的项目名').toHaveValue('Projet FR');
    await expect(nameField.getByTestId('stale-badge'), '[fr] 冲突字段显示待复核').toBeVisible();
    const descField = page.getByTestId('field-项目描述');
    await expect(descField.locator('textarea'), '[fr] 单写法描述正常显示').toHaveValue('Description FR');
    await expect(descField.getByTestId('stale-badge'), '[fr] 无冲突不显示待复核').toHaveCount(0);
  });

  test('[en] 待复核标记：冲突与原 stale 保留，一致/全空不误标', async ({ page }) => {
    const resume = await readMergedResume(page);
    const work = resume.workExperiences[0];
    expect(resume.title.stale?.en, '[en] 空/非空冲突 -> 待复核').toBe(true);
    expect(resume.summary.stale?.en, '[en] 非空冲突 -> 待复核').toBe(true);
    expect(resume.basicInfo.location.stale?.en, '[en] 非空/空冲突 -> 待复核').toBe(true);
    expect(resume.basicInfo.headline.stale?.en, '[en] 全空无冲突 -> 不标待复核').toBeUndefined();
    expect(work.companyName.stale?.en, '[en] 一致译文 -> 不标待复核').toBeUndefined();
    expect(work.position.stale?.en, '[en] 原本待复核 -> 状态保留').toBe(true);

    // UI 抽查：职位有待复核、公司没有
    await page.goto(`/resumes/${RESUME_ID}/edit`);
    await page.getByTestId('resume-preview').waitFor();
    await page.getByTestId('lang-en').click();
    await page.getByTestId('section-work').click();
    await expect(page.getByTestId('field-职位').getByTestId('stale-badge'), '[en] 职位待复核可见').toBeVisible();
    await expect(page.getByTestId('field-公司名称').getByTestId('stale-badge'), '[en] 公司不应待复核').toHaveCount(0);
  });

  test('[en] 列表冲突保留首个非空并待复核；列表全空保持空且不待复核', async ({ page }) => {
    const resume = await readMergedResume(page);
    const work = resume.workExperiences[0];
    expect(work.responsibilities.values.en, '[en] 列表冲突保留首个非空写法').toEqual(['Duty A', 'Duty B']);
    expect(work.responsibilities.stale?.en, '[en] 列表冲突 -> 待复核').toBe(true);
    expect(work.achievements.values.en, '[en] 列表全空 -> 显式空数组保留').toEqual([]);
    expect(work.achievements.stale?.en, '[en] 列表全空 -> 不标待复核').toBeUndefined();

    await page.goto(`/resumes/${RESUME_ID}/edit`);
    await page.getByTestId('resume-preview').waitFor();
    await page.getByTestId('lang-en').click();
    await page.getByTestId('section-work').click();
    await expect(page.getByTestId('field-职责描述').locator('textarea'), '[en] 冲突列表显示合并结果').toHaveValue('Duty A\nDuty B');
    await expect(page.getByTestId('field-职责描述').getByTestId('stale-badge'), '[en] 冲突列表待复核').toBeVisible();
    await expect(page.getByTestId('field-成就列表').locator('textarea'), '[en] 空列表保持空白').toHaveValue('');
    await expect(page.getByTestId('field-成就列表').getByTestId('stale-badge'), '[en] 空列表不待复核').toHaveCount(0);
  });

  test('重复迁移幂等：合并后再次经文件导入，语言/译文/待复核不再变化', async ({ page }) => {
    const first = await readMergedResume(page);

    // 以合并结果模拟「再次导出」，落盘为新备份，再清空、重新导入
    const reexportPath = path.join(os.tmpdir(), 'language-merge-reexport.json');
    const resumes = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]'), RESUMES_KEY);
    fs.writeFileSync(reexportPath, JSON.stringify({ ...buildBackup(), resumes }), 'utf8');
    await resetStorage(page);
    await page.getByTestId('import-file').setInputFiles(reexportPath);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: '简历列表' }).waitFor();

    const second = await readMergedResume(page);
    expect(second.i18n.languages.map((l: any) => l.code), '重复迁移语言仍唯一').toEqual(['zh-CN', 'en', 'fr']);
    expect(second.title, '重复迁移标题字段不再变化').toEqual(first.title);
    expect(second.summary, '重复迁移摘要字段不再变化').toEqual(first.summary);
    expect(second.workExperiences[0].responsibilities, '重复迁移冲突列表不再变化').toEqual(first.workExperiences[0].responsibilities);
    expect(second.projects[0].name, '重复迁移孤儿字段不再变化').toEqual(first.projects[0].name);
    fs.rmSync(reexportPath, { force: true });
  });

  test('刷新后再次导出：下载的备份中不再出现重复语言代码', async ({ page }) => {
    await page.goto(`/resumes/${RESUME_ID}/edit`);
    await page.getByTestId('resume-preview').waitFor();
    await page.reload(); // 刷新后数据来自真实持久化
    await page.getByTestId('resume-preview').waitFor();

    await page.goto('/resumes');
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-json').click();
    const download = await downloadPromise;
    const backupPath = await download.path();
    expect(backupPath, '导出产生真实文件').toBeTruthy();
    const backup = JSON.parse(fs.readFileSync(backupPath!, 'utf8'));
    expect(backup.version, '导出为 v2').toBe(2);
    const codes = backup.resumes[0].i18n.languages.map((l: any) => l.code);
    expect(codes, '再次导出无重复语言').toEqual(['zh-CN', 'en', 'fr']);
    const allFieldCodes = new Set<string>();
    const scan = (value: unknown) => {
      if (value && typeof value === 'object') {
        const record = value as Record<string, unknown>;
        if (record.values && typeof record.values === 'object') {
          Object.keys(record.values as object).forEach((code) => allFieldCodes.add(code));
        }
        Object.values(record).forEach(scan);
      }
    };
    scan(backup.resumes[0]);
    expect([...allFieldCodes].sort(), '字段里也不再残留大写 EN 键').toEqual(['en', 'fr', 'zh-CN']);
  });

  test('[EN→移除] 移除大小写变体后导出回退源语言，其它语言（fr）保留', async ({ page }) => {
    // 用旧大写写法作为导出选择，验证大小写不敏感解析
    await page.evaluate((key) => window.localStorage.setItem(key, JSON.stringify('EN')), `smart-resume:export-lang:${RESUME_ID}`);

    // 在编辑器移除英语（胶囊只有规范 en）
    await page.goto(`/resumes/${RESUME_ID}/edit`);
    await page.getByTestId('resume-preview').waitFor();
    await page.getByTestId('lang-en').click();
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByTestId('remove-lang').click();
    await expect(page.getByTestId('lang-en'), '英语胶囊消失').toHaveCount(0);
    await expect(page.getByTestId('lang-fr'), '其它语言 fr 保留').toHaveCount(1);
    await expect(page.getByTestId('lang-zh-CN'), '源语言保留').toHaveCount(1);

    // 进入导出：EN 已不存在，回退到源语言 zh-CN；fr 仍可选择
    await page.goto(`/resumes/${RESUME_ID}/export`);
    await expect(page.getByTestId('export-lang'), '导出选择回退源语言').toHaveValue('zh-CN');
    expect(await exportOptionValues(page), '导出选项为现存语言').toEqual(['zh-CN', 'fr']);

    const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? 'null'), `smart-resume:export-lang:${RESUME_ID}`);
    expect(stored, '残留的大写 EN 选择被改写为现存语言').toBe('zh-CN');
  });
});
