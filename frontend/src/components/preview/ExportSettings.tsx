import { Download } from 'lucide-react';
import type { LangVariant } from '../../types/i18n';
import { Button } from '../common/Button';

interface ExportSettingsProps {
  margin: number;
  fontSize: number;
  isExporting: boolean;
  languages: LangVariant[];
  lang: string;
  onLangChange: (lang: string) => void;
  onMarginChange: (value: number) => void;
  onFontSizeChange: (value: number) => void;
  onExport: () => void;
}

export function ExportSettings({
  margin,
  fontSize,
  isExporting,
  languages,
  lang,
  onLangChange,
  onMarginChange,
  onFontSizeChange,
  onExport,
}: ExportSettingsProps) {
  return (
    <aside className="border border-[var(--border)] bg-[var(--surface)] p-4">
      <h2 className="font-display text-xl font-semibold">导出设置</h2>
      <div className="mt-5 space-y-5">
        <label className="block space-y-2 text-sm font-medium">
          <span>导出版本语言</span>
          <select
            className="w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-3 py-2 text-sm"
            value={lang}
            onChange={(event) => onLangChange(event.target.value)}
            aria-label="导出版本语言"
          >
            {languages.map((variant) => (
              <option key={variant.code} value={variant.code}>
                {variant.label}
                {variant.code === languages[0]?.code ? '（原文）' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-2 text-sm font-medium">
          <span>页边距 {margin}mm</span>
          <input
            className="w-full accent-[var(--accent)]"
            type="range"
            min="8"
            max="24"
            value={margin}
            onChange={(event) => onMarginChange(Number(event.target.value))}
          />
        </label>
        <label className="block space-y-2 text-sm font-medium">
          <span>字号 {fontSize}px</span>
          <input
            className="w-full accent-[var(--accent)]"
            type="range"
            min="11"
            max="16"
            value={fontSize}
            onChange={(event) => onFontSizeChange(Number(event.target.value))}
          />
        </label>
        <Button
          className="w-full"
          disabled={isExporting}
          icon={<Download size={16} aria-hidden />}
          onClick={onExport}
          variant="primary"
        >
          {isExporting ? '导出中' : '导出 PDF'}
        </Button>
      </div>
    </aside>
  );
}
