import {
  Centrifuge,
  type ClientEvents,
  type Options,
  type Subscription,
  type SubscriptionEvents,
  type SubscriptionOptions,
} from 'centrifuge';
import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
} from 'react';

export type CentrifugoConnectedMeta = {
  reconnected: boolean;
};

export type CentrifugoConnectionHandlers = {
  onConnected?: (
    context: Parameters<ClientEvents['connected']>[0],
    meta: CentrifugoConnectedMeta,
  ) => void;
  onConnecting?: ClientEvents['connecting'];
  onDisconnected?: ClientEvents['disconnected'];
  onConnectionError?: ClientEvents['error'];
};

export type CentrifugoSubscriptionHandlers<TData = unknown> = {
  onPublication?: (
    data: TData,
    context: Parameters<SubscriptionEvents['publication']>[0],
  ) => void;
  onSubscribed?: SubscriptionEvents['subscribed'];
  onSubscribing?: SubscriptionEvents['subscribing'];
  onUnsubscribed?: SubscriptionEvents['unsubscribed'];
  onSubscriptionError?: SubscriptionEvents['error'];
};

type SubscriptionEntry = {
  consumers: Map<symbol, CentrifugoSubscriptionHandlers<unknown>>;
  options?: SubscriptionOptions;
  subscription?: Subscription;
};

export class CentrifugoConnection {
  private client?: Centrifuge;
  private connectedOnce = false;
  private connectionConsumers = new Map<symbol, CentrifugoConnectionHandlers>();
  private subscriptions = new Map<string, SubscriptionEntry>();

  connect(endpoint: string, options?: Partial<Options>) {
    this.disconnect();
    this.connectedOnce = false;
    this.client = new Centrifuge(endpoint, options);

    this.client.on('connected', (context) => {
      const meta = { reconnected: this.connectedOnce };
      this.connectedOnce = true;
      this.connectionConsumers.forEach((consumer) => {
        consumer.onConnected?.(context, meta);
      });
    });
    this.client.on('connecting', (context) => {
      this.connectionConsumers.forEach((consumer) => {
        consumer.onConnecting?.(context);
      });
    });
    this.client.on('disconnected', (context) => {
      this.connectionConsumers.forEach((consumer) => {
        consumer.onDisconnected?.(context);
      });
    });
    this.client.on('error', (context) => {
      this.connectionConsumers.forEach((consumer) => {
        consumer.onConnectionError?.(context);
      });
    });

    this.subscriptions.forEach((entry, channel) => {
      this.attachSubscription(channel, entry);
    });
    this.client.connect();
  }

  disconnect() {
    this.subscriptions.forEach((entry) => {
      this.detachSubscription(entry);
    });
    this.client?.removeAllListeners();
    this.client?.disconnect();
    this.client = undefined;
  }

  listen(handlers: CentrifugoConnectionHandlers) {
    const consumerId = Symbol('centrifugo-connection-consumer');
    this.connectionConsumers.set(consumerId, handlers);

    return () => {
      this.connectionConsumers.delete(consumerId);
    };
  }

  subscribe<TData>(
    channel: string,
    handlers: CentrifugoSubscriptionHandlers<TData>,
    options?: SubscriptionOptions,
  ) {
    const consumerId = Symbol(channel);
    const entry = this.subscriptions.get(channel) ?? {
      consumers: new Map(),
      options,
    };

    entry.consumers.set(consumerId, {
      onPublication: handlers.onPublication
        ? (data, context) => {
            handlers.onPublication?.(data as TData, context);
          }
        : undefined,
      onSubscribed: handlers.onSubscribed,
      onSubscribing: handlers.onSubscribing,
      onUnsubscribed: handlers.onUnsubscribed,
      onSubscriptionError: handlers.onSubscriptionError,
    });
    this.subscriptions.set(channel, entry);
    this.attachSubscription(channel, entry);

    return () => {
      entry.consumers.delete(consumerId);
      if (entry.consumers.size > 0) {
        return;
      }

      this.detachSubscription(entry);
      this.subscriptions.delete(channel);
    };
  }

  private attachSubscription(channel: string, entry: SubscriptionEntry) {
    if (!this.client || entry.subscription) {
      return;
    }

    const subscription = this.client.newSubscription(channel, entry.options);
    entry.subscription = subscription;
    subscription.on('publication', (context) => {
      entry.consumers.forEach((consumer) => {
        consumer.onPublication?.(context.data, context);
      });
    });
    subscription.on('subscribed', (context) => {
      entry.consumers.forEach((consumer) => {
        consumer.onSubscribed?.(context);
      });
    });
    subscription.on('subscribing', (context) => {
      entry.consumers.forEach((consumer) => {
        consumer.onSubscribing?.(context);
      });
    });
    subscription.on('unsubscribed', (context) => {
      entry.consumers.forEach((consumer) => {
        consumer.onUnsubscribed?.(context);
      });
    });
    subscription.on('error', (context) => {
      entry.consumers.forEach((consumer) => {
        consumer.onSubscriptionError?.(context);
      });
    });
    subscription.subscribe();
  }

  private detachSubscription(entry: SubscriptionEntry) {
    if (!entry.subscription) {
      return;
    }

    entry.subscription.removeAllListeners();
    entry.subscription.unsubscribe();
    this.client?.removeSubscription(entry.subscription);
    entry.subscription = undefined;
  }
}

const CentrifugoContext = createContext<CentrifugoConnection | null>(null);

type CentrifugoProviderProps = {
  children: ReactNode;
  connectionKey?: string;
  enabled?: boolean;
  endpoint?: string;
  getToken?: NonNullable<Options['getToken']>;
};

const CENTRIFUGO_CONNECTION_OPTIONS = {
  minReconnectDelay: 500,
  maxReconnectDelay: 30_000,
} as const;

export function CentrifugoProvider({
  children,
  connectionKey,
  enabled = true,
  endpoint,
  getToken,
}: CentrifugoProviderProps) {
  const connectionRef = useRef<CentrifugoConnection | null>(null);
  const getTokenRef = useRef(getToken);
  getTokenRef.current = getToken;

  if (!connectionRef.current) {
    connectionRef.current = new CentrifugoConnection();
  }

  const connection = connectionRef.current;
  const hasTokenLoader = Boolean(getToken);

  useEffect(() => {
    if (!enabled || !endpoint || connectionKey === '') {
      connection.disconnect();
      return;
    }

    connection.connect(endpoint, {
      ...CENTRIFUGO_CONNECTION_OPTIONS,
      getToken: hasTokenLoader
        ? (context) => {
            const loadToken = getTokenRef.current;
            if (!loadToken) {
              return Promise.reject(
                new Error('Centrifugo token loader is unavailable'),
              );
            }
            return loadToken(context);
          }
        : null,
    });

    return () => {
      connection.disconnect();
    };
  }, [connection, connectionKey, enabled, endpoint, hasTokenLoader]);

  return (
    <CentrifugoContext.Provider value={connection}>
      {children}
    </CentrifugoContext.Provider>
  );
}

export function useCentrifugoConnection() {
  const connection = useContext(CentrifugoContext);
  if (!connection) {
    throw new Error(
      'useCentrifugoConnection must be used within CentrifugoProvider',
    );
  }

  return connection;
}
