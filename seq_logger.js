"use strict";

let http = require('http');
let https = require('https');
let url = require('url');

const LEVELS = {
    "Verbose": "Verbose",
    "Debug": "Debug",
    "Information" : "Information",
    "Warning": "Warning",
    "Error": "Error",
    "Fatal": "Fatal"
};

const HEADER = "{Events:[";
const FOOTER = "]}";
const HEADER_FOOTER_BYTES = Buffer.byteLength(HEADER, 'utf8') + Buffer.byteLength(FOOTER, 'utf8');


class SeqLogger {
    constructor(config) {
        let dflt = {
            serverUrl: 'http://localhost:5341', 
            apiKey: null,
            maxBatchingTime: 2000,
            eventSizeLimit: 256 * 1024,
            batchSizeLimit: 1024 * 1024,
            requestTimeout: 30000,
            onError: e => { console.error("[seq]", e); }
        };
        let cfg = config || dflt;
        var serverUrl = cfg.serverUrl || dflt.serverUrl;
        if (!serverUrl.endsWith('/')) {
            serverUrl += '/';
        }
        this._endpoint = url.parse(serverUrl + 'api/events/raw');
        this._apiKey = cfg.apiKey || dflt.apiKey;    
        this._maxBatchingTime = cfg.maxBatchingTime || dflt.maxBatchingTime;
        this._eventSizeLimit = cfg.eventSizeLimit || dflt.eventSizeLimit;
        this._batchSizeLimit = cfg.batchSizeLimit || dflt.batchSizeLimit;
        this._requestTimeout = cfg.requestTimeout || dflt.requestTimeout;
        this._onError = cfg.onError || dflt.onError;
        this._queue = [];
        this._timer = null;
        this._closed = false;
        this._activeShipper = null;
    }

    // Flush events queued at the time of the call, and wait for pending writes to complete
    // regardless of configured batching/timers.
    flush() {
        return this._ship();
    }

    // A browser only function that queues events for sending using the
    // navigator.sendBeacon() API.  This may work in an unload or pagehide event
    // handler when a normal flush() would not.
    // Events over 63K in length are discarded (with a warning sent in its place) 
    // and the total size batch will be no more than 63K in length.
    flushToBeacon() {
        if (this._queue.length === 0) {
            return false;
        }

        if (typeof navigator === 'undefined' || !navigator.sendBeacon || typeof Blob === 'undefined') {
            return false;
        }

        const currentBatchSizeLimit = this._batchSizeLimit;
        const currentEventSizeLimit = this._eventSizeLimit;
        this._batchSizeLimit = Math.min(63 * 1024, this._batchSizeLimit);
        this._eventSizeLimit = Math.min(63 * 1024, this._eventSizeLimit);

        const dequeued = this._dequeBatch();

        this._batchSizeLimit = currentBatchSizeLimit;
        this._eventSizeLimit = currentEventSizeLimit;

        const {dataParts, options, beaconUrl, size} = this._prepForBeacon(dequeued);

        const data = new Blob(dataParts, options);
        return navigator.sendBeacon(beaconUrl, data);
    }

    // Flush then close the logger, destroying timers and other resources.
    close() {
        if (this._closed) {
            throw new Error('The logger has already been closed.');
        }
        
        this._closed = true;
        this._clearTimer();
        
        return this.flush();
    }

    // Enqueue an event in Seq format.
    emit(event) {
        if (!event) {
            throw new Error('An event must be provided');
        }
        if (this._closed) {
            return;
        }
        let norm = this._toWireFormat(event);
        this._queue.push(norm);
        if (!this._activeShipper) {
            this._setTimer();
        }
    }

    _setTimer() {
        if (this._timer !== null) {
            return;
        }
        
        this._timer = setTimeout(() => {
            this._timer = null;
            this._onTimer();
        }, this._maxBatchingTime);
    }
    
    _clearTimer() {
        if (this._timer !== null) {
            clearTimeout(this._timer);
            this._timer = null;
        }
    }

    _onTimer() {
        if (!this._activeShipper) {
            this._ship();
        }
    }

    _toWireFormat(event) {
        return {
            Timestamp: event.timestamp || new Date(),
            Level: LEVELS[event.level], // Missing is fine
            MessageTemplate: event.messageTemplate || "(No message provided)",
            Exception: event.exception, // Missing is fine
            Properties: event.properties // Missing is fine
        };
    }
    
    _eventTooLargeErrorEvent(event) {
        return {
            Timestamp: event.Timestamp,
            Level: event.Level,
            MessageTemplate: "(Event too large) {initial}...",
            Properties: {
                initial: event.MessageTemplate.substring(0, 12),
                sourceContext: "Seq Javascript Client", 
                eventSizeLimit: this._eventSizeLimit
            }
        };
    }
    
    _reset(shipper) {
        if (this._activeShipper === shipper) {
            this._activeShipper = null;
            if (this._queue.length !== 0) {
                this._setTimer();
            }
        }
    }
    
    _ship() {
        if (this._queue.length === 0) {
            return Promise.resolve(false);
        }
        
        let wait = this._activeShipper || Promise.resolve(false);
        let shipper = this._activeShipper = wait
            .then(() => {
                let more = drained => {
                    if (drained) {
                        // If the queue was drained, let the timer
                        // push us forwards.
                        return true;
                    }
                    return this._sendBatch().then(d => more(d));
                }
                return this._sendBatch().then(drained => more(drained));
            })
            .then(() => this._reset(shipper), e => {
                this._onError(e);
                this._reset(shipper);
            });

        return shipper;
    }
    
    _sendBatch() {
        if (this._queue.length === 0) {
            return Promise.resolve(true);
        }

        let dequeued = this._dequeBatch();
        let drained = this._queue.length === 0;
        return this._post(dequeued.batch, dequeued.bytes).then(() => drained);        
    }
    
    _dequeBatch() {
        var bytes = HEADER_FOOTER_BYTES;
        let batch = [];
        var i = 0;
        var delimSize = 0;
        while (i < this._queue.length) {
            let next = this._queue[i];
            let json = JSON.stringify(next);
            var jsonLen = Buffer.byteLength(json, 'utf8');
            if (jsonLen > this._eventSizeLimit) {
                this._onError("[seq] Event body is larger than " + this._eventSizeLimit + " bytes: " + json);
                this._queue[i] = next = this._eventTooLargeErrorEvent(next);
                json = JSON.stringify(next);
                jsonLen = Buffer.byteLength(json, 'utf8');
            }
            
            // Always try to send a batch of at least one event, even if the batch size is
            // tiny.
            if (i !== 0 && bytes + jsonLen + delimSize > this._batchSizeLimit) {
                break;
            }
            
            i = i + 1;
            bytes += jsonLen + delimSize;
            delimSize = 1; // ","
            batch.push(json);
        }
        
        this._queue.splice(0, i);
        return {batch, bytes};
    }
    
    _post(batch, bytes) {
        return new Promise((resolve, reject) => {
            var opts = {
                host: this._endpoint.hostname,
                port: this._endpoint.port,
                path: this._endpoint.path,
                protocol: this._endpoint.protocol,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': bytes
                },
                timeout: this._requestTimeout
            };
            
            if (this._apiKey) {
                opts.headers["X-Seq-ApiKey"] = this._apiKey;
            }

            let requestFactory = opts.protocol === 'https:' ? https : http;
            let req = requestFactory.request(opts);

            req.on("socket", (socket) => {
                socket.on("timeout", () => {
                    req.abort();
                    reject('HTTP log shipping failed, reached timeout (' + this._requestTimeout + ' ms)')
                })
            });
            
            req.on('response', res => {
                var httpErr = null;
                if (res.statusCode !== 200 && res.statusCode !== 201) {
                    httpErr = 'HTTP log shipping failed: ' + res.statusCode;
                }
                
                res.on('data', () => {});           
                res.on('error', e => {
                    reject(e);
                });
                res.on('end', () => {
                    if (httpErr !== null) {
                        reject(httpErr);
                    } else {
                        resolve(true); 
                    }
                });
            });
            
            req.on('error', e => {
                reject(e);
            });

            req.write(HEADER);           
            var delim = ""; 
            for (var b = 0; b < batch.length; b++) {
                req.write(delim);
                delim = ",";
                req.write(batch[b]);
            }
            req.write(FOOTER);
            req.end();
        });
    }

    _prepForBeacon(dequeued) {        
        const {batch, bytes} = dequeued;

        const dataParts = [HEADER, batch.join(','), FOOTER];

        // CORS-safelisted for the Content-Type request header
        const options = {type: 'text/plain'};
        
        const endpointWithKey = Object.assign({}, this._endpoint, {query: {'apiKey': this._apiKey}});

        return {
            dataParts,
            options,
            beaconUrl: url.format(endpointWithKey),
            size: bytes,
        };
    }
}

module.exports = SeqLogger;
