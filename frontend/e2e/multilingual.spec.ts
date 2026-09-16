import { BrowserContext, expect, Page, test } from '@playwright/test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// 多语言简历对照台端到端测试：全部通过真实页面入口（路由 + 真实 localStorage、
// 真实文件下载/选择对话框）驱动，可重复运行（每个用例开始都清空本地存储）。

const RESUMES_KEY = 'smart-resume:resumes';

async function resetStorage(page: Page): Promise<void> {
  await page.goto('/resumes');
  await page.evaluate(() => window.localStorage.clear());
  await page.reload();
  await page.getByRole('heading', { name: '简历列表' }).waitFor();
}

async function readResumes(page: Page): Promise<any[]> {
  return page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? '[]'), RESUMES_KEY);
}

// 初始演示简历只存在于内存（首次变更才落盘），因此从列表页第一张卡片的
// 「编辑」链接读取简历 id，与用户真实入口一致。
async function firstResumeId(page: Page): Promise<string> {
  await page.goto('/resumes');
  const href = await page.getByTestId('resume-card').first().getByRole('link', { name: /编辑/ }).getAttribute('href');
  const match = /\/resumes\/([^/]+)\/edit/.exec(href ?? '');
  if (!match) {
    throw new Error(`无法从列表卡片解析简历 id，href=${href ?? 'null'}`);
  }
  return match[1];
}

async function getRaw(page: Page, key: string): Promise<string | null> {
  // writeStorage 以 JSON 序列化存储，这里解析回原始值
  return page.evaluate((storageKey) => {
    const raw = window.localStorage.getItem(storageKey);
    return raw === null ? null : (JSON.parse(raw) as string);
  }, key);
}

async function addLanguage(page: Page, code: string): Promise<void> {
  await page.getByTestId('add-lang-toggle').click();
  await page.getByTestId('add-lang-preset').selectOption(code);
  await page.getByTestId('add-lang-submit').click();
  await expect(page.getByTestId(`lang-${code}`)).toHaveAttribute('data-active', 'true');
}

async function openEditor(page: Page, id: string): Promise<void> {
  await page.goto(`/resumes/${id}/edit`);
  await page.getByTestId('resume-preview').waitFor();
}

test.describe('多语言简历对照台', () => {
  test.beforeEach(async ({ page }) => {
    await resetStorage(page);
  });

  test('添加语言→翻译→原文变化→逐字段复核→刷新持久化', async ({ page }) => {
    const id = await firstResumeId(page);
    await openEditor(page, id);

    // 添加英语（默认从中文复制起步），添加后当前语言切到英语
    await addLanguage(page, 'en');
    await page.getByTestId('section-work').click();

    const companyField = page.getByTestId('field-公司名称').first();
    await expect(companyField.locator('input')).toHaveValue('青松科技'); // 复制起步内容

    // 翻译该字段
    await companyField.locator('input').fill('Qingsong Tech');
    await expect(companyField).not.toContainText('[data-testid=stale-badge]');

    // 原文（中文）变化
    await page.getByTestId('lang-zh-CN').click();
    await expect(companyField.locator('input')).toHaveValue('青松科技');
    await companyField.locator('input').fill('青松科技集团');

    // 切回英文：旧译文保留且进入待复核
    await page.getByTestId('lang-en').click();
    await expect(companyField.locator('input')).toHaveValue('Qingsong Tech');
    await expect(companyField.getByTestId('stale-badge')).toBeVisible();

    // 逐字段复核通过
    await companyField.getByTestId('stale-approve').click();
    await expect(companyField.getByTestId('stale-badge')).toHaveCount(0);

    // 刷新页面：语言停留在英文，译文与复核状态持久化
    await page.reload();
    await page.getByTestId('section-work').click();
    await expect(page.getByTestId('lang-en')).toHaveAttribute('data-active', 'true');
    const afterReload = page.getByTestId('field-公司名称').first();
    await expect(afterReload.locator('input')).toHaveValue('Qingsong Tech');
    await expect(afterReload.getByTestId('stale-badge')).toHaveCount(0);

    const resumes = await readResumes(page);
    const field = resumes[0].workExperiences[0].companyName;
    expect(field.values.en).toBe('Qingsong Tech');
    expect(field.values['zh-CN']).toBe('青松科技集团');
    expect(field.stale?.en).toBeUndefined();
  });

  test('列表清空后保持为空；未翻译语言回退原文；原文变化后清空版本进入待复核', async ({ page }) => {
    const id = await firstResumeId(page);
    await openEditor(page, id);
    await addLanguage(page, 'en');

    // 英语下把「荣誉」列表显式清空
    await page.getByTestId('section-education').click();
    const honorsField = page.getByTestId('field-荣誉');
    await honorsField.locator('textarea').fill('');
    await expect(honorsField.locator('textarea')).toHaveValue('');

    // 页面（预览）保持为空，不回退显示源语言荣誉条目
    const preview = page.getByTestId('resume-preview');
    await expect(preview).not.toContainText('优秀毕业生');
    await expect(preview).not.toContainText('校级创新项目一等奖');

    // 新增一个从未翻译的语言（日语）：回退显示原文荣誉
    await addLanguage(page, 'ja');
    await page.getByTestId('section-education').click();
    await expect(preview).toContainText('优秀毕业生');

    // 英语的清空状态仍然保持为空，不回退
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('field-荣誉').locator('textarea')).toHaveValue('');
    await expect(preview).not.toContainText('优秀毕业生');

    // 原文变化：已显式清空的英语版本也进入待复核（不被当成未翻译）
    await page.getByTestId('lang-zh-CN').click();
    await page.getByTestId('field-荣誉').locator('textarea').fill('优秀毕业生\n新荣誉');
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('field-荣誉').getByTestId('stale-badge')).toBeVisible();
    // 仍是空的，不回退新原文
    await expect(page.getByTestId('field-荣誉').locator('textarea')).toHaveValue('');
    await expect(preview).not.toContainText('新荣誉');
  });

  test('导出语言首次继承编辑选择；手动切换不回写编辑页；移出语言后导出回退；关闭重开保持', async ({ browser, page }) => {
    const id = await firstResumeId(page);
    await openEditor(page, id);
    await addLanguage(page, 'en');
    await page.getByTestId('section-work').click();
    await page.getByTestId('field-公司名称').first().locator('input').fill('Qingsong Technology');

    // 首次进入导出：沿用编辑页停留的英语
    await page.goto(`/resumes/${id}/export`);
    const exportLang = page.getByTestId('export-lang');
    await expect(exportLang).toHaveValue('en');
    await expect(page.getByTestId('resume-preview')).toContainText('Qingsong Technology');

    // 导出页手动切到中文：只影响导出选择
    await exportLang.selectOption('zh-CN');
    await expect(page.getByTestId('resume-preview')).toContainText('青松科技');
    const workingLang = await getRaw(page, `smart-resume:working-lang:${id}`);
    expect(workingLang).toBe('en'); // 编辑页语言未被改写
    expect(await getRaw(page, `smart-resume:export-lang:${id}`)).toBe('zh-CN');

    // 刷新导出页，手动选择保持
    await page.reload();
    await expect(page.getByTestId('export-lang')).toHaveValue('zh-CN');

    // 切回英语作为导出选择，然后在编辑页移出英语
    await exportLang.selectOption('en');
    await openEditor(page, id);
    await expect(page.getByTestId('lang-en')).toHaveAttribute('data-active', 'true');
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByTestId('remove-lang').click();
    await expect(page.getByTestId('lang-en')).toHaveCount(0);

    // 再进导出：英语已移出，回退到仍然存在的源语言
    await page.goto(`/resumes/${id}/export`);
    await expect(page.getByTestId('export-lang')).toHaveValue('zh-CN');
    expect(await getRaw(page, `smart-resume:export-lang:${id}`)).toBe('zh-CN');

    // 关闭整个浏览器上下文再重开（用同一存储状态），选择依旧保持
    const stateFile = path.join(os.tmpdir(), `resume-storage-${id.slice(-6)}.json`);
    await page.context().storageState({ path: stateFile });
    const reopened: BrowserContext = await browser.newContext({ storageState: stateFile });
    const page2: Page = await reopened.newPage();
    await page2.goto(`/resumes/${id}/export`);
    await expect(page2.getByTestId('export-lang')).toHaveValue('zh-CN');
    await reopened.close();
    fs.rmSync(stateFile, { force: true });
  });

  test('复制整份简历后多语言数据彼此独立', async ({ page }) => {
    const id = await firstResumeId(page);
    await openEditor(page, id);
    await addLanguage(page, 'en');
    await page.getByTestId('section-work').click();
    await page.getByTestId('field-公司名称').first().locator('input').fill('ORIGINAL-EN');

    // 从列表复制整份简历
    await page.goto('/resumes');
    await page.getByTestId('resume-menu').first().click();
    await page.getByTestId('duplicate-resume').click();
    const resumesAfterDuplicate = await readResumes(page);
    expect(resumesAfterDuplicate).toHaveLength(2);

    // 在副本上修改英语译文
    const cloneId = resumesAfterDuplicate[0].id; // 复制件置顶
    expect(cloneId).not.toBe(id);
    await openEditor(page, cloneId);
    // 副本是新简历 id，编辑器默认打开源语言；切到英语应看到随深拷贝带来的译文
    await page.getByTestId('lang-en').click();
    await expect(page.getByTestId('lang-en')).toHaveAttribute('data-active', 'true');
    await page.getByTestId('section-work').click();
    await expect(page.getByTestId('field-公司名称').first().locator('input')).toHaveValue('ORIGINAL-EN');
    await page.getByTestId('field-公司名称').first().locator('input').fill('CLONE-EN');

    const finalResumes = await readResumes(page);
    const original = finalResumes.find((resume: any) => resume.id === id);
    const clone = finalResumes.find((resume: any) => resume.id === cloneId);
    expect(original.workExperiences[0].companyName.values.en).toBe('ORIGINAL-EN');
    expect(clone.workExperiences[0].companyName.values.en).toBe('CLONE-EN');
    // 副本是完整深拷贝：语言列表一致，但条目 id 全部重新生成
    expect(clone.i18n.languages.map((lang: any) => lang.code)).toEqual(['zh-CN', 'en']);
    expect(clone.workExperiences[0].id).not.toBe(original.workExperiences[0].id);
  });

  test('备份导出→清空→导入为真实文件往返；旧备份缺多语言数据仍可打开', async ({ page }) => {
    const id = await firstResumeId(page);
    await openEditor(page, id);
    await addLanguage(page, 'en');
    await page.getByTestId('section-work').click();
    await page.getByTestId('field-公司名称').first().locator('input').fill('Backup EN');
    await page.goto('/resumes');

    // 真实下载备份文件
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('export-json').click();
    const download = await downloadPromise;
    const backupPath = await download.path();
    expect(backupPath).toBeTruthy();
    const backup = JSON.parse(fs.readFileSync(backupPath!, 'utf8'));
    expect(backup.version).toBe(2);
    expect(backup.resumes[0].i18n.languages.map((lang: any) => lang.code)).toContain('en');

    // 清空本地数据后通过真实文件选择器导入
    await resetStorage(page);
    await page.getByTestId('import-file').setInputFiles(backupPath!);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: '简历列表' }).waitFor();
    const restored = await readResumes(page);
    expect(restored[0].workExperiences[0].companyName.values.en).toBe('Backup EN');
    expect(restored[0].i18n.sourceLanguage).toBe('zh-CN');

    // 旧备份（v1：无 version、裸中文字符串、无 i18n）
    const legacy = {
      exportedAt: '2024-01-01T00:00:00.000Z',
      activeResumeId: 'legacy-1',
      selectedTemplateId: 'atelier',
      theme: 'light',
      profile: {
        fullName: '张三',
        headline: '旧版工程师',
        phone: '13900000000',
        email: 'legacy@example.com',
        location: '北京',
        website: '',
        avatarUrl: '',
        targetRole: '产品经理',
        summary: '旧版摘要',
      },
      resumes: [
        {
          id: 'legacy-1',
          title: '旧版中文简历',
          templateId: 'atelier',
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-02T00:00:00.000Z',
          basicInfo: {
            fullName: '张三',
            headline: '旧版工程师',
            phone: '13900000000',
            email: 'legacy@example.com',
            location: '北京',
            website: '',
          },
          summary: '旧版摘要内容',
          sections: [
            { id: 'summary', title: '职业摘要', enabled: true },
            { id: 'work', title: '工作经历', enabled: true },
          ],
          workExperiences: [
            {
              id: 'legacy-w1',
              companyName: '旧公司',
              position: '旧职位',
              startDate: '2020.01',
              endDate: '至今',
              responsibilities: ['旧职责一'],
              achievements: ['旧成果一'],
            },
          ],
          educations: [],
          skills: [],
          projects: [],
        },
      ],
    };
    const legacyPath = path.join(os.tmpdir(), 'legacy-resume-backup.json');
    fs.writeFileSync(legacyPath, JSON.stringify(legacy), 'utf8');

    await resetStorage(page);
    await page.getByTestId('import-file').setInputFiles(legacyPath);
    await page.waitForLoadState('networkidle');
    await page.getByRole('heading', { name: '简历列表' }).waitFor();

    // 旧备份被迁移后可正常打开与渲染
    await page.goto('/resumes/legacy-1/edit');
    await page.getByTestId('resume-preview').waitFor();
    const preview = page.getByTestId('resume-preview');
    await expect(preview).toContainText('旧公司');
    await expect(preview).toContainText('旧职责一');
    const migrated = await readResumes(page);
    expect(migrated[0].i18n.sourceLanguage).toBe('zh-CN');
    expect(migrated[0].workExperiences[0].companyName.values['zh-CN']).toBe('旧公司');
    expect(migrated[0].sections).toHaveLength(5); // 缺失模块自动补齐
    fs.rmSync(legacyPath, { force: true });
  });
});
