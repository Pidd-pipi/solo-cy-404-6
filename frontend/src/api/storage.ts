import { Profile } from '../types/profile';
import { Resume } from '../types/resume';
import { migrateProfile, migrateResume, SNAPSHOT_VERSION } from '../utils/migration';
import { readStorage, storageKeys, writeStorage } from '../utils/storage';

export interface WorkspaceSnapshot {
  version: number;
  exportedAt: string;
  resumes: Resume[];
  activeResumeId: string | null;
  profile: Profile;
  selectedTemplateId: string;
  theme: 'light' | 'dark';
}

export function readWorkspaceSnapshot(fallbackProfile: Profile): WorkspaceSnapshot {
  return {
    version: SNAPSHOT_VERSION,
    exportedAt: new Date().toISOString(),
    // 直接从 localStorage 读取时同样过迁移，保证旧数据导出即为 v2
    resumes: readStorage<unknown[]>(storageKeys.resumes, []).map(migrateResume),
    activeResumeId: readStorage<string | null>(storageKeys.activeResumeId, null),
    profile: migrateProfile(readStorage<unknown>(storageKeys.profile, fallbackProfile)),
    selectedTemplateId: readStorage<string>(storageKeys.template, 'atelier'),
    theme: readStorage<'light' | 'dark'>(storageKeys.theme, 'light'),
  };
}

export function writeWorkspaceSnapshot(snapshot: WorkspaceSnapshot): void {
  writeStorage(storageKeys.resumes, snapshot.resumes);
  writeStorage(storageKeys.activeResumeId, snapshot.activeResumeId);
  writeStorage(storageKeys.profile, snapshot.profile);
  writeStorage(storageKeys.template, snapshot.selectedTemplateId);
  writeStorage(storageKeys.theme, snapshot.theme);
}
