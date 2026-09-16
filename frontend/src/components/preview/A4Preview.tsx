import { forwardRef } from 'react';
import type { LangCode } from '../../types/i18n';
import { Resume } from '../../types/resume';
import { ResumePreview } from './ResumePreview';

interface A4PreviewProps {
  resume: Resume;
  margin: number;
  fontSize: number;
  lang?: LangCode;
}

export const A4Preview = forwardRef<HTMLDivElement, A4PreviewProps>(({ resume, margin, fontSize, lang }, ref) => (
  <div className="mx-auto w-full max-w-[794px]">
    <div
      ref={ref}
      className="aspect-[210/297] w-full overflow-hidden bg-white shadow-panel"
      style={{ padding: `${margin}mm` }}
    >
      <ResumePreview resume={resume} fontSize={fontSize} lang={lang} />
    </div>
  </div>
));

A4Preview.displayName = 'A4Preview';
