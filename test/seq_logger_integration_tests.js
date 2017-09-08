"use strict";

let assert = require('assert');
let uuid = require('uuid');
let request = require('superagent');
let SeqLogger = require('../seq_logger');

// TEST CONFIGURATION
const serverUrlHttp = '[CONFIGURE_URL_HERE]';
const serverUrlHttps = '[CONFIGURE_URL_HERE]';
const storeGracePeriodInMs = 1000;
// required if authentication is turned on 
const apiKeyWithUserLevelPermissions = null; 

describe('SeqLogger', () => {

    it.skip('works with HTTP', done => {
        if(serverUrlHttp === '[CONFIGURE_URL_HERE]') {
            done('In order to run this test, configure the serverUrlHttp setting in the test file with SEQ HTTP url')
            return;
        }

        testEmitAndVerifyStored(serverUrlHttp, apiKeyWithUserLevelPermissions, done);
    });
    
    it.skip('works with HTTPS', done => {
        if(serverUrlHttps === '[CONFIGURE_URL_HERE]') {
            done('In order to run this test, configure the serverUrlHttps setting in the test file with SEQ HTTPS url')
            return;
        }

        testEmitAndVerifyStored(serverUrlHttps, apiKeyWithUserLevelPermissions, done);
    });

});

function testEmitAndVerifyStored(url, apiKey, done) {
    let logger = new SeqLogger({
        serverUrl: url,
        apiKey: apiKey,
        maxBatchingTime: 1, 
        onError: err => done(err)
    });
    
    let event = makeTestEvent();

    logger.emit(event);

    setTimeout(() => {
        verifyMarkerStored(event.properties.testMarker, url, apiKey, done);
    }, storeGracePeriodInMs);
}

function makeTestEvent() {
    return {
        level: 'Error',
        timestamp: new Date(),
        messageTemplate: 'Event produced by integration test',
        exception: 'Some error at some file on some line',
        properties: { testMarker: uuid.v4() }
    };
}

function verifyMarkerStored(testMarker, url, apiKey, callback) {

    request.get(url + '/api/events')
        .query({count: 1, filter: 'Equal(testMarker, @"' + testMarker + '")'})
        .set('X-Seq-ApiKey', apiKey)
        .end((err, res) => {
            if(err) {
                callback(err);
                return;
            }
            
            if(res.body instanceof Array 
                && res.body.length === 1
                && res.body[0].Properties
                && res.body[0].Properties.some(item => item.Name === "testMarker" && item.Value === testMarker)) {
                    callback();
                    return;
            }

            callback("The verify marker response does not contain expected result");
        });
}