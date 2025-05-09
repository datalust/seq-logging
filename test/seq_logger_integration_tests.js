"use strict";

import assert from 'assert';
import * as uuid from 'uuid';
import request from 'superagent';
import { Logger as SeqLogger } from '../index.js';

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
        verifyMarkerStored(event.properties.testMarker, event.traceId, event.spanId, url, apiKey, done);
    }, storeGracePeriodInMs);
}

function makeTestEvent() {
    return {
        level: 'Error',
        timestamp: new Date(),
        traceId: '6112be4ab9f113c499dbf4817e503a69',
        spanId: '2f2b39a596fc76cd',
        messageTemplate: 'Event produced by integration test',
        exception: 'Some error at some file on some line',
        properties: { testMarker: uuid.v4() }
    };
}

function verifyMarkerStored(testMarker, traceId, spanId, url, apiKey, callback) {

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
                && res.body[0].Properties.some(item => item.Name === "testMarker" && item.Value === testMarker)
                && res.body[0].TraceId === traceId
                && res.body[0].SpanId === spanId
            ) {
                    callback();
                    return;
            }

            callback("The verify marker response does not contain expected result");
        });
}