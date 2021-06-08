/*
Use a WebSocket connection to listen for log events being ingested by Seq.

Emitting from the logger is asynchronous, so we don't know whether an event
has been logged until we can read it back out from the server.
*/

import status from './status';

export default (messageTemplate) => {
    // Open a WebSocket connection to Seq
    var incoming = new WebSocket('ws://localhost:5341/api/events/stream');

    // When the socket receives incoming event data, look for our log event
    incoming.addEventListener('message', (msg) => {
        var evt = JSON.parse(msg.data);

        if (evt['@mt'] === messageTemplate) {
            console.log('received an event from Seq', evt);

            status('The event was logged!');
        }
    });
}
