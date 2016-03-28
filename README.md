Seq Logging for JavaScript [![Build status](https://ci.appveyor.com/api/projects/status/j579f7e7dpdo91u7/branch/master?svg=true)](https://ci.appveyor.com/project/seqlogs/seq-logging/branch/master) [![NPM](https://img.shields.io/npm/v/seq-logging.svg)](https://www.npmjs.com/package/seq-logging)

> This work-in-progress library makes it easy to support Seq from Node.js logging libraries, initially `node-bunyan`. It is not expected that applications will interact directly with this package.

### Usage

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
