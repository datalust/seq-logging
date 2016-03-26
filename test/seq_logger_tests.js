"use strict";

let assert = require('assert');
let SeqLogger = require('../seq_logger');

describe('SeqLogger', () => {
    
   describe('constructor()', () => {
      it('defaults missing configuration arguments', () => {
         let logger = new SeqLogger();
         assert.equal(logger._endpoint.hostname, 'localhost'); 
         assert.equal(logger._endpoint.port, 5341); 
         assert.equal(logger._endpoint.protocol, 'http:');
         assert.equal(logger._endpoint.path, '/api/events/raw/');         
         assert.equal(logger._apiKey, null);
      });
      
      it('uses configuration arguments that are provided', () => {
         let logger = new SeqLogger({serverUrl: 'https://my-seq/prd', apiKey: '12345'});
         assert.equal(logger._endpoint.hostname, 'my-seq'); 
         assert.equal(logger._endpoint.port, null); 
         assert.equal(logger._endpoint.protocol, 'https:');
         assert.equal(logger._endpoint.path, '/prd/api/events/raw/');         
         assert.equal(logger._apiKey, '12345');
      });
      
      it('correctly formats slashed paths', () => {
         let logger = new SeqLogger({serverUrl: 'https://my-seq/prd/'});
         assert.equal(logger._endpoint.path, '/prd/api/events/raw/');         
      });
   });
   
   describe('emit()', () => {
      it('detects missing event', () => {
          let logger = new SeqLogger();
          try {
              logger.emit();
          } catch (e) {
              return;
          }
          assert.fail(null, null, 'Expected an error');
      });
      
      it('enqueues events', () => {
          let logger = new SeqLogger();
          logger.emit(makeTestEvent());
          logger._clearTimer();
          assert.equal(1, logger._queue.length);
      });
      
      it('ignores calls afer the logger is closed', () => {
          let logger = new SeqLogger();
          return logger.close().then(() => {
             logger.emit(makeTestEvent());
             assert.equal(0, logger._queue.length); 
          });
      });
      
      it('converts events to the wire format', () => {
          let logger = new SeqLogger();
          let event = makeTestEvent();
          logger.emit(event);
          logger._clearTimer();
          let wire = logger._queue[0];
          assert.equal(event.messageTemplate, wire.MessageTemplate);
          assert.equal(event.timestamp, wire.Timestamp);
          assert.equal(event.level, wire.Level);
          assert.equal(event.exception, wire.Exception);
          assert.equal(event.properties.a, wire.Properties.a);
      });
   });
});

function makeTestEvent() {
    return {
        Level: "Error",
        Timestamp: new Date(),
        MessageTemplate: 'Hello!',
        Exception: "Some error at some file on some line",
        Properties: { "a": 1 }
    };
}