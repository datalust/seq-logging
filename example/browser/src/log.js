/*
Create a logger that can write events to Seq.
*/

import { Logger as SeqLogger } from 'seq-logging/browser';
import status from './status';

export default (messageTemplate) => {
    // Connect to the Seq server
    const logger = new SeqLogger({ serverUrl: 'http://localhost:5341' });

    // When the button is hit, send an event to Seq
    document.getElementById('log-event').addEventListener('click', () => {
        logger.emit({
            timestamp: new Date(),
            level: 'Information',
            messageTemplate,
            properties: {
                source: navigator.userAgent
            }
        });

        status('Logging an event...');
    });
}
