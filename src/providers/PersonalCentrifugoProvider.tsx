import { UnauthorizedError } from 'centrifuge';
import type { ReactNode } from 'react';

import { token } from '@/api/__generated__/wallet/centrifugo/centrifugo';
import type { CentrifugoTokenResponse } from '@/api/__generated__/wallet/model/centrifugoTokenResponse';
import { unwrapOrvalPayload } from '@/features/mining/miningFormat';
import { CentrifugoProvider } from '@/providers/CentrifugoProvider';
import useGlobalStore from '@/stores/global';

const CENTRIFUGO_WSS_BASE_URL =
  import.meta.env.VITE_CENTRIFUGO_WSS_BASE_URL?.trim().replace(/\/$/, '') ?? '';
const CENTRIFUGO_WSS_URL = CENTRIFUGO_WSS_BASE_URL
  ? `${CENTRIFUGO_WSS_BASE_URL}/centrifugo/connection/websocket?format=json&cf_ws_frame_ping_pong=true`
  : '';
export function PersonalCentrifugoProvider({
  children,
  enabled = true,
}: {
  children: ReactNode;
  enabled?: boolean;
}) {
  const isLogin = useGlobalStore((state) => state.isLogin);
  const userId = useGlobalStore((state) => state.userProfile?.userId);

  async function getToken() {
    const response = await token();
    const payload = unwrapOrvalPayload<CentrifugoTokenResponse>(response);

    if (!payload?.token || !payload.userId) {
      throw new Error('Centrifugo token response is incomplete');
    }
    if (payload.userId !== userId) {
      throw new UnauthorizedError('Centrifugo user does not match login user');
    }

    return payload.token;
  }

  return (
    <CentrifugoProvider
      connectionKey={userId}
      enabled={Boolean(enabled && isLogin && userId && CENTRIFUGO_WSS_URL)}
      endpoint={CENTRIFUGO_WSS_URL}
      getToken={getToken}
    >
      {children}
    </CentrifugoProvider>
  );
}
