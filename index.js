"use strict";

const Logger = (await import('./seq_logger.js')).DefineLogger(
    typeof Blob !== 'undefined' ? Blob : (await import('buffer')).Blob,
    typeof fetch !== 'undefined' ? fetch : await import('node-fetch'),
    typeof AbortController !== 'undefined' ? AbortController : await import('abort-controller')
);

export { Logger };
