# Seq Logging for JavaScript [![Build status](https://ci.appveyor.com/api/projects/status/j579f7e7dpdo91u7/branch/master?svg=true)](https://ci.appveyor.com/project/seqlogs/seq-logging/branch/master) [![NPM](https://img.shields.io/npm/v/seq-logging.svg)](https://www.npmjs.com/package/seq-logging)

> This library makes it easy to support Seq from Node.js logging libraries, currently `node-bunyan` (see **Implementations** below). It is not expected that applications will interact directly with this package.

### Usage

A `Logger` is configured with `serverUrl`, and optionally `apiKey` as well as event and batch size limits.

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

### Implementations

 * [bunyan-seq](https://github.com/continuousit/bunyan-seq) - collect events from the Buyan logging framework
 
