import { useTranslation } from 'react-i18next';

import IconMoreArrow from '@/assets/svg/IconMoreArrow';
import { Button } from '@/components/ui/button';

type InviteCodeBindingEntryProps = {
  onClick: () => void;
};

export function InviteCodeBindingEntry({
  onClick,
}: InviteCodeBindingEntryProps) {
  const { t } = useTranslation();

  return (
    <section className="rounded-2xl bg-card">
      <Button
        type="button"
        variant="ghost"
        onClick={onClick}
        className="h-14 w-full justify-between rounded-2xl px-4 py-4 text-base leading-6 font-bold text-foreground hover:bg-muted/50 md:h-16 md:px-5"
      >
        {t('绑定邀请码')}
        <IconMoreArrow className="h-5 w-2.5 text-wallet-text-secondary" />
      </Button>
    </section>
  );
}
