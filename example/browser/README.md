# Logging to Seq via the browser

The `seq-logging` library is primarily intended for Node apps, but it can be used from the browser too. This example uses [webpack](https://webpack.js.org/) along with the [`node-polyfill-webpack-plugin`](https://www.npmjs.com/package/node-polyfill-webpack-plugin) plugin to polyfill the Node APIs used by `seq-logging`.

Have a look in the `src/log.js` file for the code that sets up a `Logger` and emits events.

## Running the sample

Run:

```
npm run serve
```

and open a browser window to `localhost:8080` (or whatever port webpack uses). The script will connect to a Seq instance at `localhost:5341` and use the very fancy button to log an event. It will also listen for incoming events from the server and log them to the dev tools console.

```
npm run cypress
```

Runs the cypress tests. Fails if the Seq server has user authentication enabled. 