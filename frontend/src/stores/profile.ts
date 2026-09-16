import { create } from 'zustand';
import { Profile } from '../types/profile';
import { makeField, SOURCE_LANGUAGE } from '../utils/i18n';
import { migrateProfile } from '../utils/migration';
import { readStorage, storageKeys, writeStorage } from '../utils/storage';

export const defaultProfile: Profile = {
  fullName: '林知远',
  headline: makeField(SOURCE_LANGUAGE, '增长产品经理 / AI 工具策划'),
  phone: '+86 138 0000 2831',
  email: 'lin.resume@example.com',
  location: makeField(SOURCE_LANGUAGE, '上海'),
  website: 'https://portfolio.example.com',
  avatarUrl: '',
  targetRole: makeField(SOURCE_LANGUAGE, '高级产品经理'),
  summary: makeField(
    SOURCE_LANGUAGE,
    '擅长把复杂业务拆解为可交付的产品系统，最近关注 AI 工作流、B2B 增长和数据驱动的用户体验优化。',
  ),
};

interface ProfileState {
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
  replaceProfile: (profile: Profile) => void;
}

export const useProfileStore = create<ProfileState>((set, get) => ({
  profile: migrateProfile(readStorage<unknown>(storageKeys.profile, defaultProfile)),
  updateProfile: (patch) => {
    set((state) => ({ profile: { ...state.profile, ...patch } }));
    writeStorage(storageKeys.profile, get().profile);
  },
  replaceProfile: (profile) => {
    set({ profile: migrateProfile(profile) });
    writeStorage(storageKeys.profile, get().profile);
  },
}));
