"use strict";

let process = require('process');
let SeqLogger = require('../seq_logger');

let seq = new SeqLogger({ serverUrl: 'http://localhost:5341' });
var n = 0;

let interval = setInterval(sayHello, 100);

function sayHello() {
    n = n + 1;
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
    
    if (n === 25) {
        seq.flush();
    }
    
    if (n === 100) {
        clearInterval(interval);
        seq.close();
    }
}

