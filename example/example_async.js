"use strict";

let process = require('process');
let SeqLogger = require('../index').Logger;

let seq = new SeqLogger({ serverUrl: 'http://localhost:5341', onRemoteConfigChange: (config) => {
    console.log(config);
}});

sayHello(100)
    .then(() => seq.close());

async function sayHello(times) {
    for(let n = 0; n <= times; n++){
        await new Promise((accept) => setTimeout(accept, 1 * 1000)); // Waits 1 second before each round

        console.log('Round ', n);
        seq.emit({
            timestamp: new Date(),
            level: 'Information',
            messageTemplate: 'Hello for the {n}th time, {user}!',
            properties: {
                user: process.env.USERNAME,
                n: n
            }
        });

        if (n % 5 == 0) { // Flush every 5 events
            seq.flush();
        }
    }
}

