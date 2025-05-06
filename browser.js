"use strict";

// Variable used to force testing fallback modules
// This should remain false, but can be changed in testing
const fallback = false;

const Logger = (await import('./seq_logger.js')).DefineLogger(
    Blob,
    fetch,
    !fallback && typeof AbortController !== 'undefined' ? AbortController : (await import('abort-controller')).AbortController
);

export { Logger };
