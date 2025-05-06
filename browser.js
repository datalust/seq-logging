"use strict";

const Logger = (await import('./seq_logger')).DefineLogger(Blob, fetch, typeof AbortController !== 'undefined' ? AbortController : await import('abort-controller'));

export { Logger };
