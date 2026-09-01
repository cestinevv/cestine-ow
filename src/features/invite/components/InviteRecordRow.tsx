import type { InviteRecordItemResponse } from '@/api/__generated__/wallet/model/inviteRecordItemResponse';
import { AppDateTimeText } from '@/components/common/AppDateTimeText';
import { cn } from '@/utils';

import { InviteRecordAvatar } from './InviteRecordAvatar';

type InviteRecordRowProps = {
  record: InviteRecordItemResponse;
  isLast: boolean;
};

export function InviteRecordRow({ record, isLast }: InviteRecordRowProps) {
  const nickname =
    typeof record.nickname === 'string' ? record.nickname.trim() : '';
  const inviteeId =
    typeof record.inviteeUserId === 'string' ? record.inviteeUserId.trim() : '';
  const displayName =
    nickname.length > 0 ? nickname : inviteeId.length > 0 ? inviteeId : '-';

  const invitedRaw = record.bindAt ?? record.createdAt;

  return (
    <li
      className={cn(
        'grid w-full grid-cols-[1fr_auto] items-center gap-3 px-4 pt-2 pb-4',
        !isLast && 'border-b border-border/70',
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <InviteRecordAvatar
          userId={inviteeId || undefined}
          avatarUrl={record.avatarUrl}
          alt={displayName}
          fallbackChar={displayName}
        />
        <p className="truncate text-base leading-6 font-bold text-foreground">
          {displayName}
        </p>
      </div>
      <AppDateTimeText
        value={invitedRaw}
        layout="inline"
        fallback="-"
        className="truncate text-right text-xs leading-4 font-normal tracking-[0.04px] text-muted-foreground"
      />
    </li>
  );
}
