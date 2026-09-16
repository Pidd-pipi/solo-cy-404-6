import { useMemo, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { EmptyState } from '../components/common/EmptyState';
import { A4Preview } from '../components/preview/A4Preview';
import { ExportSettings } from '../components/preview/ExportSettings';
import { useExportPdf } from '../hooks/useExportPdf';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { useResumeStore } from '../stores/resume';
import { getLocal } from '../utils/i18n';

export function ExportPreview() {
  const { id } = useParams();
  const previewRef = useRef<HTMLDivElement | null>(null);
  const resume = useResumeStore((state) => state.resumes.find((item) => item.id === id));
  const [margin, setMargin] = useLocalStorage('smart-resume:export-margin', 14);
  const [fontSize, setFontSize] = useLocalStorage('smart-resume:export-font-size', 12);
  const [storedLang, setStoredLang] = useLocalStorage<string>(`smart-resume:export-lang:${id}`, resume?.i18n.sourceLanguage ?? 'zh-CN');
  const { exportPdf, isExporting, error } = useExportPdf(previewRef);

  const lang = useMemo(() => {
    if (!resume) {
      return storedLang;
    }
    return resume.i18n.languages.some((item) => item.code === storedLang) ? storedLang : resume.i18n.sourceLanguage;
  }, [resume, storedLang]);

  if (!resume) {
    return <EmptyState title="无法导出" description="没有找到这份简历，可能已被删除。" />;
  }

  const source = resume.i18n.sourceLanguage;
  const titleText = getLocal(resume.title, lang, source).value || 'resume';
  const safeFileTitle = titleText.replace(/[\\/:*?"<>|]+/g, '_').trim() || 'resume';

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-end">
        <div>
          <Link className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--accent-strong)]" to={`/resumes/${resume.id}/edit`}>
            <ArrowLeft size={15} aria-hidden /> 返回编辑
          </Link>
          <h1 className="mt-3 font-display text-4xl font-semibold">PDF 导出预览</h1>
          <p className="mt-2 text-sm text-[var(--muted)]">按 A4 比例渲染所选语言版本，导出前可调整页边距和字号。</p>
        </div>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[300px_1fr]">
        <ExportSettings
          fontSize={fontSize}
          isExporting={isExporting}
          margin={margin}
          languages={resume.i18n.languages}
          lang={lang}
          onLangChange={setStoredLang}
          onExport={() => exportPdf(`${safeFileTitle}.pdf`, margin)}
          onFontSizeChange={setFontSize}
          onMarginChange={setMargin}
        />
        <div className="overflow-auto bg-[var(--surface-alt)] p-6">
          <A4Preview ref={previewRef} resume={resume} margin={margin} fontSize={fontSize} lang={lang} />
          {error ? <p className="mt-4 text-sm text-[var(--danger)]">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
