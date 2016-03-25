var SeqLogger = require('./seq_logger');

var seq = new SeqLogger({ serverUrl: 'http://localhost:5341' });

seq.emit({
    Timestamp: new Date(),
    Level: 'Information',
    MessageTemplate: 'Hello, {user}!',
    Properties: {
        user: 'nblumhardt'
    }
});

seq.close();
