"use strict";

let http = require('http');
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
            onError: e => { console.error("[seq]", e); }
        };
        let cfg = config || dflt;
        var serverUrl = cfg.serverUrl || dflt.serverUrl;
        if (!serverUrl.endsWith('/')) {
            serverUrl += '/';
        }
        this._endpoint = url.parse(serverUrl + 'api/events/raw/');
        this._apiKey = cfg.apiKey || dflt.apiKey;    
        this._maxBatchingTime = cfg.maxBatchingTime || dflt.maxBatchingTime;
        this._eventSizeLimit = cfg.eventSizeLimit || dflt.eventSizeLimit;
        this._batchSizeLimit = cfg.batchSizeLimit || dflt.batchSizeLimit;
        this._onError = cfg.onError || dflt.onError;
        this._queue = [];
        this._timer = null;
        this._closed = false;
        this._activeShipper = null;
    }

    // Flush events queued at the time of the call, and wait for pending writes to complete
    // regardless of configured batching/timers.
    flush() {
        return this._ship({flush: true});
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
        let norm = this._normalize(event);
        this._queue.push(event);
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
        this._ship();
    }

    _normalize(event) {
        return {
            Timestamp: event.Timestamp || new Date(),
            Level: LEVELS[event.Level], // Missing is fine
            MessageTemplate: event.MessageTemplate || "(No message provided)",
            Exception: event.Exception, // Missing is fine
            Properties: event.Properties // Missing is fine
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
    
    _reset() {
        this._activeShipper = null;
        if (this._queue.length !== 0) {
            this._setTimer();
        }
    }
    
    _ship() {
        if (this._queue.lenth === 0) {
            return Promise.resolve(false);
        }
        
        let wait = this._activeShipper || Promise.resolve(false);
        let shipper = this._activeShipper = wait
            .then(() => {
                let more = a => {
                    if (!a) {
                        return a;
                    }
                    return this._sendBatch().then(b => more(b));
                }
                return this._sendBatch().then(c => more(c));
            })
            .then(() => this._reset(), e => {
                this._onError(e);
                this._reset();
            });

        return shipper;
    }
    
    _sendBatch() {
        if (this._queue.length === 0) {
            return Promise.resolve(false);
        }
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
            
            if (bytes + jsonLen + delimSize > this._batchSizeLimit) {
                break;
            }
            
            i = i + 1;
            bytes += jsonLen + delimSize;
            delimSize = 1; // ","
            batch.push(json);
        }
        
        this._queue.splice(0, i);
        
        var p = new Promise((resolve, reject) => {
            var opts = {
                host: this._endpoint.hostname,
                port: this._endpoint.port,
                path: this._endpoint.path,
                protocol: this._endpoint.protocol,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': bytes
                }
            };
            
            if (this._apiKey) {
                opts.headers["X-Seq-ApiKey"] = self._apiKey;
            }

            let req = http.request(opts);
            
            req.on('response', res => {
                res.on('data', () => {});           
                res.on('error', e => {
                    reject(e);
                });
                res.on('end', () => {
                    resolve(true); 
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
        
        return p;
    }
}

module.exports = SeqLogger;
