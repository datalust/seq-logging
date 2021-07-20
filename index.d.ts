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
  level?: SeqLogLevel
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
  /**
   * * A browser only function that queues events for sending using the navigator.sendBeacon() API.
   * * This may work in an unload or pagehide event handler when a normal flush() would not.
   * * Events over 63K in length are discarded (with a warning sent in its place) and the total size batch will be no more than 63K in length.
   * @returns {boolean}
   */
  flushToBeacon (): boolean
}
