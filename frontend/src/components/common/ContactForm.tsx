import { Globe } from 'lucide-react';
import { LocalizedInput, LocalizedTextarea, SharedBadge } from './LocalizedField';
import { Profile } from '../../types/profile';
import { LANG_PRESETS, SOURCE_LANGUAGE } from '../../utils/i18n';

interface ContactFormProps {
  profile: Profile;
  lang: string;
  onChange: (patch: Partial<Profile>) => void;
}

const inputClass =
  'w-full rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--ink)] placeholder:text-[var(--muted)]';

export function ProfileLanguageSelect({ lang, onChange }: { lang: string; onChange: (lang: string) => void }) {
  // 个人资料是跨简历的全局资料：可在常用语言间直接切换编辑，源语言固定为中文。
  const options = LANG_PRESETS.some((preset) => preset.code === lang) ? LANG_PRESETS : [...LANG_PRESETS, { code: lang, label: lang }];
  return (
    <label className="inline-flex items-center gap-2 text-sm font-semibold">
      <Globe size={15} className="text-[var(--muted)]" aria-hidden />
      资料语言
      <select
        className="rounded-md border border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm font-medium"
        value={lang}
        onChange={(event) => onChange(event.target.value)}
        aria-label="个人资料语言"
      >
        {options.map((preset) => (
          <option key={preset.code} value={preset.code}>
            {preset.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function ContactForm({ profile, lang, onChange }: ContactFormProps) {
  const source = SOURCE_LANGUAGE;
  // 全局资料不参与简历的待复核联动，这里只在源语言与当前语言之间读写译文。
  const languages = [source];
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <label className="space-y-1 text-sm font-medium">
        <span className="flex items-center gap-2">姓名 <SharedBadge /></span>
        <input className={inputClass} value={profile.fullName} onChange={(event) => onChange({ fullName: event.target.value })} />
      </label>
      <div className="space-y-1 text-sm font-medium">
        <span>求职意向</span>
        <LocalizedInput field={profile.targetRole} lang={lang} source={source} languages={languages} ariaLabel="求职意向" onChange={(targetRole) => onChange({ targetRole })} />
      </div>
      <label className="space-y-1 text-sm font-medium">
        <span className="flex items-center gap-2">电话 <SharedBadge /></span>
        <input className={inputClass} value={profile.phone} onChange={(event) => onChange({ phone: event.target.value })} />
      </label>
      <label className="space-y-1 text-sm font-medium">
        <span className="flex items-center gap-2">邮箱 <SharedBadge /></span>
        <input className={inputClass} type="email" value={profile.email} onChange={(event) => onChange({ email: event.target.value })} />
      </label>
      <div className="space-y-1 text-sm font-medium">
        <span>城市</span>
        <LocalizedInput field={profile.location} lang={lang} source={source} languages={languages} ariaLabel="城市" onChange={(location) => onChange({ location })} />
      </div>
      <label className="space-y-1 text-sm font-medium">
        <span className="flex items-center gap-2">主页 <SharedBadge /></span>
        <input className={inputClass} value={profile.website} onChange={(event) => onChange({ website: event.target.value })} />
      </label>
      <div className="space-y-1 text-sm font-medium md:col-span-2">
        <span>一句话定位</span>
        <LocalizedInput field={profile.headline} lang={lang} source={source} languages={languages} ariaLabel="一句话定位" onChange={(headline) => onChange({ headline })} />
      </div>
      <div className="space-y-1 text-sm font-medium md:col-span-2">
        <span>个人摘要</span>
        <LocalizedTextarea field={profile.summary} lang={lang} source={source} languages={languages} ariaLabel="个人摘要" onChange={(summary) => onChange({ summary })} />
      </div>
    </div>
  );
}
