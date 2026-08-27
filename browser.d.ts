declare module 'seq-logging/browser' {
  // Browser and Node share the same Logger implementation (seq_logger.js),
  // so the browser entry has an identical public type surface. Re-export the
  // existing declarations to keep the two entries from drifting.
  export * from './index.js';
  
  export type SeqLogLevel =
    | 'Verbose' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Fatal';

  export interface RemoteConfig {
    MinimumLevelAccepted: SeqLogLevel | null;
  }

  export interface SeqLoggerConfig {
    serverUrl?: string;
    apiKey?: string;
    maxBatchingTime?: number;
    eventSizeLimit?: number;
    batchSizeLimit?: number;
    requestTimeout?: number;
    maxRetries?: number;
    retryDelay?: number;
    onError: (e: Error) => void;
    onRemoteConfigChange?: (remoteConfig: RemoteConfig) => void;
  }

  export interface SeqEvent {
    timestamp: Date;
    level?: string;
    traceId?: string;
    spanId?: string;
    messageTemplate?: string;
    properties?: object;
    exception?: string;
  }

  export class Logger {
    constructor(config: SeqLoggerConfig);
    emit(event: SeqEvent): void;
    close(): Promise<void>;
    flush(): Promise<boolean>;
  }
}
