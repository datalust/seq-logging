"use strict";

let Logger = require('./seq_logger')(Blob, fetch, typeof AbortController !== 'undefined' ? AbortController : require('abort-controller'));

module.exports = {Logger};
