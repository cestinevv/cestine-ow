import type { SubscriptionOptions } from 'centrifuge';
import { useEffect, useRef } from 'react';

import {
  type CentrifugoConnectionHandlers,
  type CentrifugoSubscriptionHandlers,
  useCentrifugoConnection,
} from '@/providers/CentrifugoProvider';

type UseCentrifugoSubscriptionOptions<TData> = CentrifugoConnectionHandlers &
  CentrifugoSubscriptionHandlers<TData> & {
    channel?: string;
    enabled?: boolean;
    subscriptionOptions?: SubscriptionOptions;
  };

export function useCentrifugoSubscription<TData = unknown>({
  channel,
  enabled = true,
  subscriptionOptions,
  ...handlers
}: UseCentrifugoSubscriptionOptions<TData>) {
  const connection = useCentrifugoConnection();
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;

  useEffect(() => {
    if (!enabled || !channel) {
      return;
    }

    const removeConnectionListener = connection.listen({
      onConnected: (context, meta) => {
        handlersRef.current.onConnected?.(context, meta);
      },
      onConnecting: (context) => {
        handlersRef.current.onConnecting?.(context);
      },
      onDisconnected: (context) => {
        handlersRef.current.onDisconnected?.(context);
      },
      onConnectionError: (context) => {
        handlersRef.current.onConnectionError?.(context);
      },
    });
    const unsubscribe = connection.subscribe<TData>(
      channel,
      {
        onPublication: (data, context) => {
          handlersRef.current.onPublication?.(data, context);
        },
        onSubscribed: (context) => {
          handlersRef.current.onSubscribed?.(context);
        },
        onSubscribing: (context) => {
          handlersRef.current.onSubscribing?.(context);
        },
        onUnsubscribed: (context) => {
          handlersRef.current.onUnsubscribed?.(context);
        },
        onSubscriptionError: (context) => {
          handlersRef.current.onSubscriptionError?.(context);
        },
      },
      subscriptionOptions,
    );

    return () => {
      unsubscribe();
      removeConnectionListener();
    };
  }, [channel, connection, enabled, subscriptionOptions]);
}
