"use strict";

module.exports = function (safeGlobalBlob, safeGlobalFetch, safeGlobalAbortController) {
    const HEADER = '{"Events":[';
    const FOOTER = "]}";
    const HEADER_FOOTER_BYTES = (new safeGlobalBlob([HEADER])).size + (new safeGlobalBlob([FOOTER])).size;

    class SeqLogger {
        constructor(config) {
            let dflt = {
                serverUrl: 'http://localhost:5341',
                apiKey: null,
                maxBatchingTime: 2000,
                eventSizeLimit: 256 * 1024,
                batchSizeLimit: 1024 * 1024,
                requestTimeout: 30000,
                maxRetries: 5,
                retryDelay: 5000,
                onError: e => {
                    console.error("[seq]", e);
                }
            };
            let cfg = config || dflt;
            var serverUrl = cfg.serverUrl || dflt.serverUrl;
            if (!serverUrl.endsWith('/')) {
                serverUrl += '/';
            }
            this._endpoint = serverUrl + 'api/events/raw';
            this._apiKey = cfg.apiKey || dflt.apiKey;
            this._maxBatchingTime = cfg.maxBatchingTime || dflt.maxBatchingTime;
            this._eventSizeLimit = cfg.eventSizeLimit || dflt.eventSizeLimit;
            this._batchSizeLimit = cfg.batchSizeLimit || dflt.batchSizeLimit;
            this._requestTimeout = cfg.requestTimeout || dflt.requestTimeout;
            this._onError = cfg.onError || dflt.onError;
            this._maxRetries = cfg.maxRetries || dflt.maxRetries;
            this._retryDelay = cfg.retryDelay || dflt.retryDelay;

            this._queue = [];
            this._timer = null;
            this._closed = false;
            this._activeShipper = null;
        }

        /**
         * Flush events queued at the time of the call, and wait for pending writes to complete regardless of configured batching/timers.
         * @returns {Promise<boolean>}
         */
        flush() {
            return this._ship();
        }

        /**
         * Flush then destroy connections, close the logger, destroying timers and other resources.
         * @returns {Promise<void>}
         */
        close() {
            if (this._closed) {
                throw new Error('The logger has already been closed.');
            }

            this._closed = true;
            this._clearTimer();
            return this.flush();
        }

        /**
         * Enqueue an event in Seq format.
         * @param {*} event
         * @returns {void}
         */
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
            const level = typeof event.level === 'string' ? event.level : undefined;
            const timestamp = event.timestamp instanceof Date ? event.timestamp : new Date();
            const messageTemplate = typeof event.messageTemplate === 'string' ? event.messageTemplate :
                event.messageTemplate !== null && event.messageTemplate !== undefined ? event.messageTemplate.toString() : "(No message provided)";
            const exception = typeof event.exception === 'string' ? event.exception :
                event.exception !== null && event.exception !== undefined ? event.exception.toString() : undefined;
            const properties = typeof event.properties === 'object' ? event.properties : undefined;
            return {
                Timestamp: timestamp,
                Level: level,
                MessageTemplate: messageTemplate,
                Exception: exception,
                Properties: properties
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

        /**
         *
         * @returns {Promise<boolean>}
         */
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
                let json;
                try {
                    json = JSON.stringify(next);
                } catch (e) {
                    const cleaned = removeCirculars(next);
                    json = JSON.stringify(cleaned);
                    // Log that this event to be able to detect circular structures
                    // using same timestamp as cleaned event to make finding it easier
                    this.emit({
                        timestamp: cleaned.Timestamp,
                        level: "Error",
                        messageTemplate: "[seq] Circular structure found"
                    });
                }
                var jsonLen = new safeGlobalBlob([json]).size;
                if (jsonLen > this._eventSizeLimit) {
                    this._onError("[seq] Event body is larger than " + this._eventSizeLimit + " bytes: " + json);
                    this._queue[i] = next = this._eventTooLargeErrorEvent(next);
                    json = JSON.stringify(next);
                    jsonLen = new safeGlobalBlob([json]).size;
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

        _httpOrNetworkError(res) {
            const networkErrors = ['ECONNRESET', 'ENOTFOUND', 'ESOCKETTIMEDOUT', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'EPIPE', 'EAI_AGAIN', 'EBUSY'];
            return networkErrors.includes(res) || 500 <= res.status && res.status < 600;
        }

        _post(batch, bytes) {
            let attempts = 0;

            return new Promise((resolve, reject) => {
                const sendRequest = (batch, bytes) => {
                    const controller = new safeGlobalAbortController();
                    attempts++;
                    const timerId = setTimeout(() => {
                        controller.abort();
                        if (attempts > this._maxRetries) {
                            reject('HTTP log shipping failed, reached timeout (' + this._requestTimeout + ' ms)');
                        } else {
                            setTimeout(() => sendRequest(batch, bytes), this._retryDelay);
                        }
                    }, this._requestTimeout);

                    safeGlobalFetch(this._endpoint, {
                        keepalive: true,
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "X-Seq-ApiKey": this._apiKey ? this._apiKey : null,
                            "Content-Length": bytes,
                        },
                        body: `${HEADER}${batch.join(',')}${FOOTER}`,
                        signal: controller.signal,
                    })
                        .then((res) => {
                            clearTimeout(timerId);
                            let httpErr = null;
                            if (res.status !== 200 && res.status !== 201) {
                                httpErr = 'HTTP log shipping failed: ' + res.status;
                                if (this._httpOrNetworkError(res) && attempts < this._maxRetries) {
                                    return setTimeout(() => sendRequest(batch, bytes), this._retryDelay);
                                }
                                return reject(httpErr);
                            }
                            return resolve(true);
                        })
                        .catch((err) => {
                            clearTimeout(timerId);
                            reject(err);
                        })
                }

                return sendRequest(batch, bytes);
            });
        }
    }


    return SeqLogger;
};

const isValue = (obj) => {
    if (!obj) return true;
    if (typeof obj !== "object") return true;
    return false;
};

const removeCirculars = (obj, branch = new Map(), path = "root") => {
    if (isValue(obj)) return obj;
    if (branch.has(obj)) {
        // In seq it is more clear if we remove the root.Properties object path
        const circularPath = branch.get(obj).replace("root.Properties.", "");
        return "== Circular structure: '" + circularPath + "' ==";
    } else {
        branch.set(obj, path);
    }

    if (obj instanceof Array) {
        return obj.map((value, i) =>
            isValue(value) ? value : removeCirculars(value, new Map(branch), path + `[${i}]`)
        );
    }
    const keys = Object.keys(obj);
    // Will rescue Date and other classes.
    if (keys.length === 0) {
        return obj;
    }
    const replaced = {};
    keys.forEach((key) => {
        const value = obj[key];
        if (isValue(value)) {
            replaced[key] = value;
            return;
        }
        replaced[key] = removeCirculars(value, new Map(branch), path + "." + key);
    });
    return replaced;
};
