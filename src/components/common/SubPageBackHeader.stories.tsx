import type { Story } from '@ladle/react';
import { I18nextProvider } from 'react-i18next';

import i18n from '@/i18n';

import { SubPageBackHeader } from './SubPageBackHeader';

export const Default: Story = () => (
  <I18nextProvider i18n={i18n}>
    <div className="flex w-full max-w-[600px] flex-col bg-points-page-surface-muted">
      <SubPageBackHeader titleKey="收入明细" onBackClick={() => {}} />
    </div>
  </I18nextProvider>
);

export const LongTitle: Story = () => (
  <I18nextProvider i18n={i18n}>
    <div className="flex w-full max-w-[360px] flex-col bg-points-page-surface-muted">
      <SubPageBackHeader
        titleKey="很长的子页标题用于检查省略与换行"
        onBackClick={() => {}}
      />
    </div>
  </I18nextProvider>
);
