"use strict";

let process = require('process');
let SeqLogger = require('./seq_logger');

let seq = new SeqLogger({ serverUrl: 'http://localhost:5341' });
var n = 0;

let interval = setInterval(sayHello, 100);

function sayHello() {
    n = n + 1;
    console.log('Round ', n);
    
    seq.emit({
        Timestamp: new Date(),
        Level: 'Information',
        MessageTemplate: 'Hello for the {n}th time, {user}!',
        Properties: {
            user: process.env.USERNAME,
            n: n
        }
    });
    
    if (n === 100) {
        clearInterval(interval);
        seq.close();
    }
}

