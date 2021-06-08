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

export type SeqLogLevel = 'Verbose' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Fatal';

export interface RemoteConfig{
  MinimumLevelAccepted: SeqLogLevel | null
}

export interface SeqEvent {
  timestamp: Date;
  level?: SeqLogLevel;
  messageTemplate?: string;
  properties?: object;
  exception?: string;
}

export declare class Logger {
  constructor(config: SeqLoggerConfig);

  emit(event: SeqEvent): void;
  close(): Promise<boolean>;
  flush(): Promise<boolean>;
  flushToBeacon(): Promise<boolean>;
}
