import { useAppLogin } from '@/hooks/useAppLogin';
import useGlobalStore from '@/stores/global';

/** 短剧详情 / H5 播放页：未登录时拉起登录弹窗（与评分、质押等交互一致） */
export function usePlayRequireLogin() {
  const isLogin = useGlobalStore((state) => state.isLogin);
  const { login } = useAppLogin();

  const requireLogin = () => {
    if (isLogin) {
      return true;
    }

    login();
    return false;
  };

  return { isLogin, requireLogin };
}
