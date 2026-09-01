import { useTranslation } from 'react-i18next';

import type { InviteRecordItemResponse } from '@/api/__generated__/wallet/model/inviteRecordItemResponse';
import { cn, formatDateFromMillisecond } from '@/utils';

import { readInviteRecordIsValid } from '../inviteFormat';
import { InviteRecordAvatar } from './InviteRecordAvatar';

type DirectInviteUserRowProps = {
  record: InviteRecordItemResponse;
};

export function DirectInviteUserRow({ record }: DirectInviteUserRowProps) {
  const { t } = useTranslation();

  const nickname =
    typeof record.nickname === 'string' ? record.nickname.trim() : '';
  const inviteeId =
    typeof record.inviteeUserId === 'string' ? record.inviteeUserId.trim() : '';
  const displayName =
    nickname.length > 0 ? nickname : inviteeId.length > 0 ? inviteeId : '-';

  const registeredAt = record.createdAt ?? record.bindAt;
  const isValidUser = readInviteRecordIsValid(record);

  return (
    <li className={cn('flex w-full items-center gap-3 py-2.5')}>
      <InviteRecordAvatar
        userId={inviteeId || undefined}
        avatarUrl={record.avatarUrl}
        alt={displayName}
        fallbackChar={displayName}
      />

      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-base leading-6 font-bold text-foreground">
          {displayName}
        </p>
        <p className="truncate text-sm leading-5 text-muted-foreground">
          {registeredAt
            ? t('注册于 {{date}}', {
                date: formatDateFromMillisecond(registeredAt, 'YYYY-MM-DD'),
              })
            : '-'}
        </p>
      </div>

      <span
        className={cn(
          'shrink-0 rounded-full px-3 py-[5px] text-[13px] leading-[18px] font-bold',
          isValidUser
            ? 'bg-play-drama-stat-surface text-play-drama-stat-foreground'
            : 'bg-muted text-muted-foreground',
        )}
      >
        {isValidUser ? t('有效用户') : t('待激活')}
      </span>
    </li>
  );
}
