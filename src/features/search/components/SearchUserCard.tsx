import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';

import type { UserSearchItemResponse } from '@/api/__generated__/wallet/model/userSearchItemResponse';
import { UserProfileAvatarCircle } from '@/components/common/UserProfileAvatar';
import { UserProfileRouteLink } from '@/components/common/UserProfileRouteLink';
import { Button } from '@/components/ui/button';
import { Spinner } from '@/components/ui/spinner';
import {
  getSearchUserFollowAction,
  getSearchUserFollowLabel,
  isSearchUserFollowing,
  parseSearchUserFollowStatus,
  SEARCH_USER_FOLLOW_STATUS,
} from '@/features/search/searchUserFollow';
import { cn, formatNumber, readSnowflakeId } from '@/utils';

type SearchUserCardProps = {
  item: UserSearchItemResponse;
  isSelf: boolean;
  isPending: boolean;
  onFollowToggle: (item: UserSearchItemResponse) => void;
};

const USER_STAT_FIELDS = [
  ['followerCount', '粉丝'],
  ['totalLikeCount', '获赞'],
] as const;

export function SearchUserCard({
  item,
  isSelf,
  isPending,
  onFollowToggle,
}: SearchUserCardProps) {
  const { t } = useTranslation();
  const userId = readSnowflakeId(item.userId);
  const nickname = item.nickname?.trim() || '-';
  const profile = item.profile?.trim();
  const followStatus = parseSearchUserFollowStatus(item.followStatus);
  const followLabel = getSearchUserFollowLabel(followStatus);
  const followAction = getSearchUserFollowAction(followStatus);
  const isFollowing = isSearchUserFollowing(followStatus);
  const isOwnUser = isSelf || followStatus === SEARCH_USER_FOLLOW_STATUS.SELF;

  const handleFollowToggle = () => {
    onFollowToggle(item);
  };

  if (!userId) {
    return null;
  }

  const profileContent = (
    <>
      <UserProfileAvatarCircle
        userId={userId}
        avatarUrl={item.avatarUrl}
        fallbackChar={nickname.slice(0, 1)}
        size={72}
        containerClassName="size-16 md:size-18"
      />

      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <header className="flex min-w-0 flex-col gap-0.5">
          <h2 className="truncate text-base leading-6 font-bold text-foreground">
            {nickname}
          </h2>
          {profile ? (
            <p className="truncate text-sm leading-5 text-muted-foreground">
              {profile}
            </p>
          ) : null}
        </header>

        <dl className="flex min-w-0 items-center gap-4 whitespace-nowrap">
          {USER_STAT_FIELDS.map(([field, label]) => (
            <div key={field} className="flex min-w-0 items-center gap-0.5">
              <dd className="truncate text-sm leading-5 font-bold text-foreground">
                {formatNumber(item[field], 0)}
              </dd>
              <dt className="shrink-0 text-xs leading-4 tracking-[0.04px] text-muted-foreground">
                {t(label)}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </>
  );

  return (
    <article className="flex min-h-28 items-center gap-3 overflow-hidden rounded-[12px] bg-card p-5 text-card-foreground md:min-h-30 md:p-6">
      {isOwnUser ? (
        <Link
          to="/profile"
          className="flex min-w-0 flex-1 items-center gap-3 no-underline"
        >
          {profileContent}
        </Link>
      ) : (
        <UserProfileRouteLink
          userId={userId}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          {profileContent}
        </UserProfileRouteLink>
      )}
      {!isOwnUser ? (
        <Button
          type="button"
          variant={isFollowing ? 'secondary' : 'default'}
          disabled={isPending || followAction === undefined}
          onClick={handleFollowToggle}
          className={cn(
            'h-9 min-w-19 shrink-0 rounded-[12px] px-6 text-sm leading-5 font-bold',
            isFollowing
              ? 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-muted-foreground'
              : 'bg-foreground text-background hover:bg-foreground/90 hover:text-background',
          )}
        >
          {isPending ? (
            <Spinner className="size-4 text-background" />
          ) : (
            t(followLabel)
          )}
        </Button>
      ) : null}
    </article>
  );
}
