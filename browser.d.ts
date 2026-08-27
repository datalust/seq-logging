// Browser and Node share the same Logger implementation (seq_logger.js),
// so the browser entry has an identical public type surface. Re-export the
// existing declarations to keep the two entries from drifting.
export * from './index.js';
