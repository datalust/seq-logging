export interface SeqLoggerConfig {
  serverUrl?: string;
  apiKey?: string;
  maxBatchingTime?: number;
  eventSizeLimit?: number;
  batchSizeLimit?: number;
  requestTimeout?: number;
  onError: (e: Error) => void;
}

export type SeqLogLevel = 'Verbose' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Fatal';

export interface SeqEvent {
  timestamp: Date;
  level?: SeqLogLevel;
  messageTemplate?: string;
  properties?: object;
  exception?: string;
}

export declare class SeqLogger {
  constructor(config: SeqLoggerConfig);

  emit(event: SeqEvent): void;
  close(): Promise<boolean>;
  flush(): Promise<boolean>;
  flushToBeacon(): Promise<boolean>;
}
