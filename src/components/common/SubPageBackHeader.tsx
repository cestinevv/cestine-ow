import { useTranslation } from 'react-i18next';

import IconChevronLeft from '@/assets/svg/IconChevronLeft';
import { Button } from '@/components/ui/button';

type SubPageBackHeaderProps = {
  /** i18n 文案 key（与稿面语种一致） */
  titleKey: string;
  /** 点击返回箭头时触发（通常 `navigate` 回父级路由） */
  onBackClick: () => void;
};

/**
 * 带子页标题与返回的顶栏（邀请记录/返佣记录/收入明细等共用）。
 */
export function SubPageBackHeader({
  titleKey,
  onBackClick,
}: SubPageBackHeaderProps) {
  const { t } = useTranslation();

  return (
    <header className="flex w-full items-center gap-6 py-6">
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        className="rounded-full text-foreground"
        onClick={onBackClick}
      >
        <IconChevronLeft className="size-6" />
      </Button>
      <h1 className="text-xl leading-7 font-bold tracking-[-0.08px] text-foreground">
        {t(titleKey)}
      </h1>
    </header>
  );
}
