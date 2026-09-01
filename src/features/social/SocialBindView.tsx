import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearch } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  getGetStatusQueryKey,
  handleCallback,
} from '@/api/__generated__/wallet/social-account-binding/social-account-binding';
import { ContentContainer } from '@/components/common/ContentContainer';
import { Spinner } from '@/components/ui/spinner';
import {
  closeTwitterOAuthPopupIfOpened,
  postTwitterBindResultToOpener,
  type TwitterBindResultStatus,
} from '@/features/social/socialBindOAuth';
import useGlobalStore from '@/stores/global';
import { cn, IS_PRODUCTION } from '@/utils';

type LandingPhase = 'idle' | 'processing' | 'success' | 'failed';

/** 路由 search 偶发丢参时，从真实 URL 再读一遍（尤其 ?error=） */
function readLandingFromLocation(): {
  bind?: string;
  code?: string;
  error?: string;
  state?: string;
} {
  if (typeof window === 'undefined') {
    return {};
  }

  const params = new URLSearchParams(window.location.search);

  return {
    bind: params.get('bind') ?? undefined,
    code: params.get('code') ?? undefined,
    error: params.get('error') ?? undefined,
    state: params.get('state') ?? undefined,
  };
}

export function SocialBindView() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const isLogin = useGlobalStore((state) => state.isLogin);

  const {
    code: searchCode,
    state: searchState,
    error: searchError,
    bind: searchBind,
  } = useSearch({
    from: '/social-bind',
  });

  const locationLanding = readLandingFromLocation();
  const oauthError = searchError || locationLanding.error;
  const bindResult = searchBind || locationLanding.bind;
  const code = searchCode || locationLanding.code;
  const state = searchState || locationLanding.state;

  const [phase, setPhase] = useState<LandingPhase>(() => {
    if (oauthError || bindResult || (code && state)) {
      return 'processing';
    }

    return 'idle';
  });

  const handledRef = useRef(false);

  useEffect(() => {
    if (handledRef.current) {
      return;
    }

    /** 落地结果收口：通知父页、刷新 status、关窗 */
    function finishBindResult(status: TwitterBindResultStatus) {
      handledRef.current = true;

      setPhase(status === 'success' ? 'success' : 'failed');
      postTwitterBindResultToOpener(status);

      void queryClient.invalidateQueries({
        queryKey: getGetStatusQueryKey(),
      });

      // error / failed：尽快关窗；成功稍留片刻
      const closeDelayMs = status === 'success' ? 400 : 0;

      window.setTimeout(() => {
        closeTwitterOAuthPopupIfOpened();
        void navigate({ to: '/social-bind', search: {}, replace: true });
      }, closeDelayMs);
    }

    // 1) 后端/X：?error=access_denied（取消授权等）— 优先于 bind
    if (oauthError) {
      finishBindResult('failed');
      return;
    }

    // 2) 后端 302：?bind=success|failed
    if (bindResult === 'success' || bindResult === 'failed') {
      finishBindResult(bindResult);
      return;
    }

    // 3) 兜底：前端收 code/state 时代调 callback
    if (code && state) {
      handledRef.current = true;

      if (!isLogin) {
        finishBindResult('failed');
        return;
      }

      setPhase('processing');

      void (async () => {
        try {
          await handleCallback({ code, state });
          finishBindResult('success');
        } catch {
          finishBindResult('failed');
        }
      })();
    }
  }, [bindResult, oauthError, code, state, isLogin, navigate, queryClient]);

  const title =
    phase === 'success'
      ? t('绑定成功')
      : phase === 'failed'
        ? t('绑定失败')
        : phase === 'processing'
          ? t('正在完成 X 账号绑定…')
          : t('X 账号绑定');

  const description =
    phase === 'success'
      ? t('可关闭此窗口，返回原页面继续操作')
      : phase === 'failed'
        ? t('请关闭此窗口后重试绑定')
        : phase === 'processing'
          ? t('请稍候…')
          : t('请从活动页发起 X 账号绑定');

  const isPopup = typeof window !== 'undefined' && Boolean(window.opener);

  return (
    <main className="flex min-h-[50vh] items-center py-10 md:py-16">
      <ContentContainer>
        <section
          className={cn(
            'mx-auto flex w-full max-w-md flex-col items-center gap-4',
            'rounded-2xl border border-border bg-card px-6 py-10 text-center',
          )}
        >
          {phase === 'processing' ? (
            <Spinner className="size-6 text-foreground" />
          ) : null}

          <h1 className="m-0 text-xl leading-7 font-bold text-foreground">
            {title}
          </h1>
          <p className="m-0 text-sm leading-5 text-muted-foreground">
            {description}
          </p>

          {!isPopup && phase !== 'processing' && !IS_PRODUCTION ? (
            <Link
              to="/1011"
              className="text-sm leading-5 font-medium text-primary underline-offset-4 hover:underline"
            >
              {t('返回活动页')}
            </Link>
          ) : null}
        </section>
      </ContentContainer>
    </main>
  );
}
