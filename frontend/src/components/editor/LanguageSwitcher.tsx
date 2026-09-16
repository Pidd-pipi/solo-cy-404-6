import { useMemo, useState } from 'react';
import { Check, Globe, Plus, X } from 'lucide-react';
import type { LangVariant } from '../../types/i18n';
import { Resume } from '../../types/resume';
import { countResumeStale, LANG_PRESETS } from '../../utils/i18n';
import { Button } from '../common/Button';

interface LanguageSwitcherProps {
  resume: Resume;
  lang: string;
  onSelect: (lang: string) => void;
  onAdd: (variant: LangVariant, copyFrom: string) => void;
  onRemove: (lang: string) => void;
  onApproveAll: (lang: string) => void;
}

export function LanguageSwitcher({ resume, lang, onSelect, onAdd, onRemove, onApproveAll }: LanguageSwitcherProps) {
  const [showAdd, setShowAdd] = useState(false);
  const source = resume.i18n.sourceLanguage;
  const staleByLang = useMemo(() => {
    const map: Record<string, number> = {};
    for (const variant of resume.i18n.languages) {
      map[variant.code] = countResumeStale(resume, variant.code);
    }
    return map;
  }, [resume]);

  const currentStale = staleByLang[lang] ?? 0;
  const isSource = lang === source;

  return (
    <div className="rounded-md border border-[var(--border)] bg-[var(--surface)] p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Globe size={15} className="text-[var(--muted)]" aria-hidden />
        {resume.i18n.languages.map((variant) => {
          const stale = staleByLang[variant.code] ?? 0;
          const active = variant.code === lang;
          return (
            <button
              key={variant.code}
              type="button"
              data-testid={`lang-${variant.code}`}
              data-active={active ? 'true' : 'false'}
              onClick={() => onSelect(variant.code)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition ${
                active
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--ink)]'
                  : 'border-[var(--border)] bg-[var(--bg)] text-[var(--muted)] hover:bg-[var(--surface-alt)]'
              }`}
            >
              {variant.label}
              {variant.code === source ? (
                <span className="rounded-sm bg-[var(--surface-alt)] px-1 text-[0.65rem] font-medium">原文</span>
              ) : null}
              {stale > 0 ? <span className="rounded-full bg-amber-500/20 px-1.5 text-[0.65rem] font-bold text-amber-600 dark:text-amber-400">{stale}</span> : null}
            </button>
          );
        })}
        <button
          type="button"
          data-testid="add-lang-toggle"
          onClick={() => setShowAdd((value) => !value)}
          className="inline-flex items-center gap-1 rounded-full border border-dashed border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--muted)] hover:bg-[var(--surface-alt)]"
        >
          <Plus size={13} aria-hidden /> 添加语言
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {!isSource ? (
          <>
            <Button
              data-testid="approve-all-lang"
              variant="ghost"
              className="min-h-0 px-2 py-1 text-xs"
              icon={<Check size={13} aria-hidden />}
              onClick={() => onApproveAll(lang)}
              disabled={currentStale === 0}
            >
              全部复核通过{currentStale > 0 ? `（${currentStale}）` : ''}
            </Button>
            <Button
              data-testid="remove-lang"
              variant="ghost"
              className="min-h-0 px-2 py-1 text-xs text-[var(--danger)]"
              icon={<X size={13} aria-hidden />}
              onClick={() => {
                if (window.confirm(`确定移出「${resume.i18n.languages.find((item) => item.code === lang)?.label ?? lang}」版本吗？该语言译文将被删除，其它语言不受影响。`)) {
                  onRemove(lang);
                }
              }}
            >
              移出当前语言
            </Button>
          </>
        ) : (
          <p className="text-xs text-[var(--muted)]">原文语言不可移出；修改原文后，已有译文会被标记为待复核。</p>
        )}
      </div>

      {showAdd ? (
        <AddLanguageForm
          resume={resume}
          onCancel={() => setShowAdd(false)}
          onSubmit={(variant, copyFrom) => {
            onAdd(variant, copyFrom);
            setShowAdd(false);
          }}
        />
      ) : null}
    </div>
  );
}

function AddLanguageForm({
  resume,
  onSubmit,
  onCancel,
}: {
  resume: Resume;
  onSubmit: (variant: LangVariant, copyFrom: string) => void;
  onCancel: () => void;
}) {
  const existing = new Set(resume.i18n.languages.map((item) => item.code));
  const availablePresets = LANG_PRESETS.filter((preset) => !existing.has(preset.code));
  const [presetCode, setPresetCode] = useState(availablePresets[0]?.code ?? '__custom__');
  const [customCode, setCustomCode] = useState('');
  const [customLabel, setCustomLabel] = useState('');
  const [copyFrom, setCopyFrom] = useState(resume.i18n.sourceLanguage);
  const [error, setError] = useState('');

  const inputClass =
    'w-full rounded-md border border-[var(--border)] bg-[var(--bg)] px-2.5 py-1.5 text-sm text-[var(--ink)]';

  const handleSubmit = () => {
    const isCustom = presetCode === '__custom__' || availablePresets.length === 0;
    const code = (isCustom ? customCode : presetCode).trim();
    const preset = LANG_PRESETS.find((item) => item.code === code);
    const label = (isCustom ? customLabel.trim() : '') || preset?.label || code;
    if (!code) {
      setError('请填写语言代码，例如 en、fr、de。');
      return;
    }
    if (existing.has(code)) {
      setError('该语言已存在。');
      return;
    }
    onSubmit({ code, label }, copyFrom);
  };

  return (
    <div className="mt-3 space-y-2 border-t border-[var(--border)] pt-3">
      <div className="grid gap-2 sm:grid-cols-3">
        <label className="space-y-1 text-xs font-medium">
          <span>语言</span>
          <select data-testid="add-lang-preset" className={inputClass} value={presetCode} onChange={(event) => setPresetCode(event.target.value)}>
            {availablePresets.map((preset) => (
              <option key={preset.code} value={preset.code}>
                {preset.label}（{preset.code}）
              </option>
            ))}
            <option value="__custom__">自定义…</option>
          </select>
        </label>
        {presetCode === '__custom__' || availablePresets.length === 0 ? (
          <>
            <label className="space-y-1 text-xs font-medium">
              <span>语言代码</span>
              <input className={inputClass} value={customCode} placeholder="en" onChange={(event) => setCustomCode(event.target.value)} />
            </label>
            <label className="space-y-1 text-xs font-medium">
              <span>显示名称</span>
              <input className={inputClass} value={customLabel} placeholder="English" onChange={(event) => setCustomLabel(event.target.value)} />
            </label>
          </>
        ) : null}
        <label className="space-y-1 text-xs font-medium">
          <span>从现有版本复制起步</span>
          <select data-testid="add-lang-copyfrom" className={inputClass} value={copyFrom} onChange={(event) => setCopyFrom(event.target.value)}>
            {resume.i18n.languages.map((variant) => (
              <option key={variant.code} value={variant.code}>
                {variant.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-[var(--muted)]">复制仅作为翻译起点：新语言与源版本内容独立，之后各自修改互不影响。</p>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
      <div className="flex gap-2">
        <Button data-testid="add-lang-submit" className="min-h-0 px-3 py-1.5 text-xs" variant="primary" icon={<Plus size={13} aria-hidden />} onClick={handleSubmit}>
          添加
        </Button>
        <Button className="min-h-0 px-3 py-1.5 text-xs" variant="ghost" onClick={onCancel}>
          取消
        </Button>
      </div>
    </div>
  );
}
