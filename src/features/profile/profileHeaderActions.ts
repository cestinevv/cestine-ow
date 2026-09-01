export function shouldShowProfileHeaderAction({
  isLogin,
  isOwn,
  hasFollowAction,
}: {
  isLogin: boolean;
  isOwn: boolean;
  hasFollowAction: boolean;
}): boolean {
  if (!isLogin) {
    return false;
  }

  return isOwn || hasFollowAction;
}
