import { Check } from 'lucide-react';
import type { LangCode, LocalField, LocalListField } from '../../types/i18n';
import { fromLines, toLines } from '../../utils/format';
import {
  approveField,
  approveListField,
  getLocal,
  getLocalList,
  setLocal,
  setLocalList,
  setSource,
  setSourceList,
} from '../../utils/i18n';

const inputClass =
  'w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]';

interface BaseProps {
  lang: LangCode;
  source: LangCode;
  /** 简历全部语言码，源语言改动时据此把其它有译文的语言标为待复核。 */
  languages: LangCode[];
  className?: string;
  ariaLabel?: string;
}

interface FieldProps extends BaseProps {
  field: LocalField;
  onChange: (field: LocalField) => void;
}

interface ListFieldProps extends BaseProps {
  field: LocalListField;
  onChange: (field: LocalListField) => void;
  hint?: string;
}

function ownText(field: LocalField, lang: LangCode, source: LangCode, isSource: boolean): string {
  if (field && typeof field === 'object') {
    return field.values[lang] ?? (isSource ? field.values[source] ?? '' : '');
  }
  return typeof field === 'string' && (isSource || lang === source) ? field : '';
}

function ownLines(field: LocalListField, lang: LangCode, source: LangCode, isSource: boolean): string[] {
  if (field && typeof field === 'object' && !Array.isArray(field)) {
    return field.values[lang] ?? (isSource ? field.values[source] ?? [] : []);
  }
  return Array.isArray(field) ? field : [];
}

function StatusRow({ isStale, isFallback, isSource, onApprove }: { isStale: boolean; isFallback: boolean; isSource: boolean; onApprove: () => void }) {
  if (isStale) {
    return (
      <span className="inline-flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
        <span className="rounded-sm bg-amber-500/15 px-1.5 py-0.5 font-semibold">待复核</span>
        <button
          type="button"
          onClick={onApprove}
          className="inline-flex items-center gap-1 rounded-sm border border-amber-500/40 px-1.5 py-0.5 font-semibold hover:bg-amber-500/10"
        >
          <Check size={12} aria-hidden /> 复核通过
        </button>
      </span>
    );
  }
  if (isFallback && !isSource) {
    return <span className="text-xs text-[var(--muted)]">未翻译，当前回退显示原文</span>;
  }
  return null;
}

export function LocalizedInput({ field, lang, source, languages, onChange, className, ariaLabel }: FieldProps) {
  const isSource = lang === source;
  const resolved = getLocal(field, lang, source);
  const value = ownText(field, lang, source, isSource);

  const commit = (next: string) => {
    onChange(isSource ? setSource(field, source, next, languages) : setLocal(field, lang, source, next));
  };

  return (
    <span className="block space-y-1">
      <StatusRow isStale={resolved.isStale} isFallback={resolved.isFallback} isSource={isSource} onApprove={() => onChange(approveField(field, lang, source))} />
      <input
        className={`${inputClass} ${className ?? ''}`}
        value={value}
        aria-label={ariaLabel}
        placeholder={!isSource && resolved.isFallback ? resolved.value : undefined}
        onChange={(event) => commit(event.target.value)}
      />
    </span>
  );
}

export function LocalizedTextarea({ field, lang, source, languages, onChange, className, ariaLabel }: FieldProps) {
  const isSource = lang === source;
  const resolved = getLocal(field, lang, source);
  const value = ownText(field, lang, source, isSource);

  const commit = (next: string) => {
    onChange(isSource ? setSource(field, source, next, languages) : setLocal(field, lang, source, next));
  };

  return (
    <span className="block space-y-1">
      <StatusRow isStale={resolved.isStale} isFallback={resolved.isFallback} isSource={isSource} onApprove={() => onChange(approveField(field, lang, source))} />
      <textarea
        className={`${inputClass} min-h-24 resize-y leading-6 ${className ?? ''}`}
        value={value}
        aria-label={ariaLabel}
        placeholder={!isSource && resolved.isFallback ? resolved.value : undefined}
        onChange={(event) => commit(event.target.value)}
      />
    </span>
  );
}

export function LocalizedLineList({ field, lang, source, languages, onChange, className, ariaLabel, hint }: ListFieldProps) {
  const isSource = lang === source;
  const resolved = getLocalList(field, lang, source);
  const value = fromLines(ownLines(field, lang, source, isSource));

  const commit = (next: string) => {
    const lines = toLines(next);
    onChange(isSource ? setSourceList(field, source, lines, languages) : setLocalList(field, lang, source, lines));
  };

  return (
    <span className="block space-y-1">
      <StatusRow isStale={resolved.isStale} isFallback={resolved.isFallback} isSource={isSource} onApprove={() => onChange(approveListField(field, lang, source))} />
      {hint ? <span className="block text-xs text-[var(--muted)]">{hint}</span> : null}
      <textarea
        className={`${inputClass} min-h-24 resize-y leading-6 ${className ?? ''}`}
        value={value}
        aria-label={ariaLabel}
        placeholder={!isSource && resolved.isFallback ? fromLines(resolved.value) : undefined}
        onChange={(event) => commit(event.target.value)}
      />
    </span>
  );
}

/** 结构字段（日期 / 联系方式 / 枚举等）的共享标记。 */
export function SharedBadge({ label = '全语言共享' }: { label?: string }) {
  return <span className="rounded-sm bg-[var(--surface-alt)] px-1.5 py-0.5 text-[0.68rem] font-medium text-[var(--muted)]">{label}</span>;
}
