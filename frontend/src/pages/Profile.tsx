import { useState } from 'react';
import { AvatarUploader } from '../components/common/AvatarUploader';
import { ContactForm, ProfileLanguageSelect } from '../components/common/ContactForm';
import { useProfileStore } from '../stores/profile';

export function Profile() {
  const profile = useProfileStore((state) => state.profile);
  const updateProfile = useProfileStore((state) => state.updateProfile);
  const [lang, setLang] = useState('en');

  return (
    <div>
      <div className="flex flex-col justify-between gap-4 border-b border-[var(--border)] pb-6 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase text-[var(--accent-strong)]">Global profile</p>
          <h1 className="mt-2 font-display text-4xl font-semibold">个人信息编辑</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--muted)]">
            全局资料会作为所有简历的默认引用；标题、城市、求职意向和摘要可按语言维护，姓名与联系方式全语言共享。
          </p>
        </div>
        <ProfileLanguageSelect lang={lang} onChange={setLang} />
      </div>
      <section className="mt-6 border border-[var(--border)] bg-[var(--surface)] p-5">
        <AvatarUploader value={profile.avatarUrl} name={profile.fullName} onChange={(avatarUrl) => updateProfile({ avatarUrl })} />
        <div className="mt-6">
          <ContactForm profile={profile} lang={lang} onChange={updateProfile} />
        </div>
      </section>
    </div>
  );
}
