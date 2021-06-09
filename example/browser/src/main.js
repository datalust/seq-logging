/*
The entrypoint of our little example.

Follow the `setupLog` and `setupListen` functions for more details on
how the sample works.
*/

import setupLog from './log';
import setupListen from './listen';
import index from './index.html';

document.body.innerHTML = index;

const messageTemplate = 'Logging to Seq from the browser!';

setupListen(messageTemplate);
setupLog(messageTemplate);
