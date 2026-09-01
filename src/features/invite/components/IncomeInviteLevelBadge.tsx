import { cn } from '@/utils';

export enum IncomeInviteLevel {
  Lv1 = 1,
  Lv2 = 2,
  Lv3 = 3,
  Lv4 = 4,
  Lv5 = 5,
}

const LEVEL_BADGE_CLASS: Record<IncomeInviteLevel, string> = {
  [IncomeInviteLevel.Lv1]: 'bg-[rgba(0,111,255,0.5)]',
  [IncomeInviteLevel.Lv2]: 'bg-[rgba(12,168,127,0.5)]',
  [IncomeInviteLevel.Lv3]: 'bg-[rgba(207,138,55,0.5)]',
  [IncomeInviteLevel.Lv4]: 'bg-[rgba(207,79,91,0.5)]',
  [IncomeInviteLevel.Lv5]: 'bg-[rgba(114,68,228,0.5)]',
};

type IncomeInviteLevelBadgeProps = {
  level: IncomeInviteLevel;
};

export function IncomeInviteLevelBadge({ level }: IncomeInviteLevelBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 items-center rounded-full py-1 pr-1.5 pl-2',
        'text-xs leading-4 font-medium tracking-[0.04px] text-white',
        LEVEL_BADGE_CLASS[level],
      )}
    >
      Lv{level}
    </span>
  );
}
