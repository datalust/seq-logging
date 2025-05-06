"use strict";

import process from 'process';
import { Logger as SeqLogger } from '../index.js';

const seq = new SeqLogger({ serverUrl: 'http://localhost:5341' });
var n = 0;

const interval = setInterval(sayHello, 100);

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
