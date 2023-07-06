"use strict";

let Logger = require('./seq_logger')(
    typeof Blob !== 'undefined' ? Blob : require('buffer').Blob,
    typeof fetch !== 'undefined' ? fetch : require('node-fetch'),
    typeof AbortController !== 'undefined' ? AbortController : require('abort-controller')
);

module.exports = {Logger};
