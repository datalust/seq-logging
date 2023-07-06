export interface SeqLoggerConfig {
  serverUrl?: string
  apiKey?: string
  maxBatchingTime?: number
  eventSizeLimit?: number
  batchSizeLimit?: number
  requestTimeout?: number
  maxRetries?: number
  retryDelay?: number
  onError: (e: Error) => void
  onRemoteConfigChange?: (remoteConfig: RemoteConfig) => void
}

export type SeqLogLevel = 'Verbose' | 'Debug' | 'Information' | 'Warning' | 'Error' | 'Fatal'

export interface RemoteConfig {
  MinimumLevelAccepted: SeqLogLevel | null
}

export interface SeqEvent {
  timestamp: Date
  level?: string
  messageTemplate?: string
  properties?: object
  exception?: string
}

export declare class Logger {
  constructor (config: SeqLoggerConfig)
  /**
   * Enqueue an event in Seq format.
   * @param {*} event
   * @returns {void}
   */
  emit (event: SeqEvent): void
  /**
   * Flush then destroy connections, close the logger, destroying timers and other resources.
   * @returns {Promise<void>}
   */
  close (): Promise<void>
  /**
   * Flush events queued at the time of the call, and wait for pending writes to complete regardless of configured batching/timers.
   * @returns {Promise<boolean}
   */
  flush (): Promise<boolean>
}
