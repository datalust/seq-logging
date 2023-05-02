# Seq Logging for JavaScript ![Build](https://github.com/datalust/seq-logging/workflows/Test/badge.svg) ![Publish](https://github.com/datalust/seq-logging/workflows/Publish/badge.svg) [![NPM](https://img.shields.io/npm/v/seq-logging.svg)](https://www.npmjs.com/package/seq-logging)

> This library makes it easy to support Seq from Node.js logging libraries, including [Winston](https://github.com/winstonjs/winston) via [winston-seq](https://github.com/datalust/winston-seq), [Pino](https://github.com/pinojs/pino) via [`pino-seq`](https://github.com/datalust/pino-seq), [Bunyan](https://github.com/trentm/node-bunyan) via [`bunyan-seq`](https://github.com/continuousit/bunyan-seq), and [Ts.ED logger](https://logger.tsed.io) via [@tsed/logger-seq](https://logger.tsed.io/appenders/seq.html). It is not expected that applications will interact directly with this package.

### Usage

A `Logger` is configured with `serverUrl`, and optionally `apiKey` as well as event and batch size limits.
`requestTimeout` can be used to adjust timeout for stalled connections, default: 30s.

```js
let process = require('process');
let seq = require('seq-logging');

let logger = new seq.Logger({ serverUrl: 'http://localhost:5341' });

logger.emit({
    timestamp: new Date(),
    level: 'Information',
    messageTemplate: 'Hello for the {n}th time, {user}!',
    properties: {
        user: process.env.USERNAME,
        n: 20
    }
});

logger.close();
```

Events are sent using the `emit()` method, that internally performs asynchronous batching based on payload size.

When the application exits, `close()` ensures all buffered events are written. This can be done at any time otherwise using the `flush()` method. Both of these methods return promises indicating completion.

When logging from a browser, and the application is being navigated away or closed, a `pagehide` or `unload` event listener has limited options and asynchronous methods will usually not succeed.  In that case, the application can call `flushToBeacon()` to queue all remaining buffered events into [`navigator.sendBeacon()`](https://developer.mozilla.org/docs/Web/API/Navigator/sendBeacon).  There is a size limit imposed by browsers so this is a best-effort attempt.

### Implementations

 * [bunyan-seq](https://github.com/datalust/bunyan-seq) - collect events from the Buyan logging framework
 * [pino-seq](https://github.com/datalust/pino-seq) - A stream to send Pino events to Seq
 * [winston-seq](https://github.com/SuperPaintman/winston-seq) - A Seq transport for Winston
 * [@tsed/logger-seq](https://logger.tsed.io/appenders/seq.html) - A Seq transport for Ts.ED logger
