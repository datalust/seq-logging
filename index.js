"use strict";

// Variable used to force testing fallback modules
// This should remain false, but can be changed in testing
const fallback = false;

const Logger = (await import('./seq_logger.js')).DefineLogger(
    !fallback && typeof Blob !== 'undefined' ? Blob : (await import('buffer')).Blob,
    !fallback && typeof fetch !== 'undefined' ? fetch : (await import('node-fetch')).default,
    !fallback && typeof AbortController !== 'undefined' ? AbortController : (await import('abort-controller')).AbortController
);

export { Logger };
