#!/usr/bin/env node
// Starts a rfb server that listens on port 59000 and serves rectangles from
// ./tests/rfb-test-data directory

var sys = require('sys');
var net = require('net');
var fs = require('fs');
var path = require('path');

function Word8(x) {
        return String.fromCharCode(x);
}

function Word16be(x) {
        return String.fromCharCode((x>>8)&0xFF) + String.fromCharCode(x&0xFF);
}

function Word32be(x) {
        return String.fromCharCode((x>>24)&0xFF) + String.fromCharCode((x>>16)&0xFF) +
            String.fromCharCode((x>>8)&0xFF) + String.fromCharCode(x&0xFF);
}

var S_EXPECT_RFB = 0;
var S_EXPECT_SECNUM = 1;
var S_EXPECT_SHARED = 2;
var S_EXPECT_FB_UPDATE = 3;

var RFBServer = net.createServer(function (stream) {
    var state = S_EXPECT_RFB;
    stream.setEncoding('binary');
    stream.addListener('connect', function () {
        sys.log('client connected, sending RFB version to client');
        stream.write('RFB 003.008\n');
    });
    stream.addListener('data', function (data) {
        if (state == S_EXPECT_RFB) {
            if (!/RFB 003\.008\n/.test(data)) {
                sys.log('client sent wrong RFB version string: ' + data);
                stream.end();
                return;
            }
            sys.log('got RFB version from client, writing secLen 1 and secTypes 1');
            stream.write('\x01', 'binary'); // secLen of 1
            stream.write('\x01', 'binary'); // secTypes 1
            state = S_EXPECT_SECNUM;
        }
        else if (state == S_EXPECT_SECNUM) {
            stream.write('\x00\x00\x00\x00'); // secRes
            state = S_EXPECT_SHARED;
        }
        else if (state == S_EXPECT_SHARED) {
            stream.write(Word16be(720), 'binary');
            stream.write(Word16be(400), 'binary');
            stream.write(Word8(32), 'binary');
            stream.write(Word8(1), 'binary');
            stream.write(Word8(2), 'binary');
            stream.write(Word8(3), 'binary');
            stream.write(Word16be(4), 'binary');
            stream.write(Word16be(5), 'binary');
            stream.write(Word16be(6), 'binary');
            stream.write(Word8(7), 'binary');
            stream.write(Word8(8), 'binary');
            stream.write(Word8(9), 'binary');

            stream.write(Word8(10), 'binary'); // padding 3 bytes
            stream.write(Word8(11), 'binary');
            stream.write(Word8(12), 'binary');

            stream.write(Word32be(4), 'binary'); // nameLength
            stream.write("test");

            state = S_EXPECT_FB_UPDATE;
        }
        else if (state = S_EXPECT_FB_UPDATE) {
            // here the fun begins, send the updates from rfb-test-data directory
            //

            var SEND_TYPE = 'one'; // send one rect at a time, use 'all' to send all

            fs.readdir(__dirname + '/rfb-test-data', function (err, files) {
                function rectDim(fileName) {
                    var m = fileName.match(/^\d+-rgba-(\d+)-(\d+)-(\d+)-(\d+).dat$/);
                    var dim = [m[1], m[2], m[3], m[4]].map(function (n) {
                        return parseInt(n, 10);
                    });
                    return { x: dim[0], y: dim[1], w: dim[2], h: dim[3] }
                }

                function sendFile(fileName) {
                    var dim = rectDim(fileName);
                    var data = fs.readFileSync(__dirname + '/rfb-test-data/' + fileName, 'binary');

                    sys.log('sending ' + rgbaFiles[i]);

                    /* writing data individually makes node-rfb go nuts */
                     
                    stream.write('\x00', 'binary'); // serverMsgTypes.fbUpdate
                    stream.write('\x00', 'binary'); // skip 1 byte
                    stream.write(Word16be(1), 'binary'); // nRects
                    stream.write(Word16be(dim.x), 'binary'); // x
                    stream.write(Word16be(dim.y), 'binary'); // y
                    stream.write(Word16be(dim.w), 'binary'); // w
                    stream.write(Word16be(dim.h), 'binary'); // h
                    stream.write(Word32be(0), 'binary'); // encodingType
                    stream.write(data, 'binary');

                    

                    /*

                    var buf = [];

                    buf.push('\x00'); // serverMsgTypes.fbUpdate
                    buf.push('\x00'); // skip 1 byte
                    buf.push(Word16be(1)); // nRects
                    buf.push(Word16be(dim.x)); // x
                    buf.push(Word16be(dim.y)); // y
                    buf.push(Word16be(dim.w)); // w
                    buf.push(Word16be(dim.h)); // h
                    buf.push(Word32be(0)); // encodingType
                    buf.push(data);
                    sys.log(data.length);

                    var toSend = buf.join('');
                    stream.write(toSend, 'binary');

                    */
                }

                function sendAll(files) {

                    /* writing data individually makes node-rfb go nuts
                     
                    stream.write('\x00', 'binary'); // serverMsgTypes.fbUpdate
                    stream.write('\x00', 'binary'); // skip 1 byte
                    stream.write(Word16be(files.length), 'binary'); // nRects
                    for (var i = 0; i<files.length; i++) {
                        var fileName = files[i];
                        var dim = rectDim(fileName);
                        var data = fs.readFileSync(__dirname + '/rfb-test-data/' + fileName, 'binary');
                        stream.write(Word16be(dim.x), 'binary'); // x
                        stream.write(Word16be(dim.y), 'binary'); // y
                        stream.write(Word16be(dim.w), 'binary'); // w
                        stream.write(Word16be(dim.h), 'binary'); // h
                        stream.write(Word32be(0), 'binary'); // encodingType
                        stream.write(data, 'binary');
                    }

                    */

                    var buf = [];

                    buf.push('\x00'); // serverMsgTypes.fbUpdate
                    buf.push('\x00'); // skip 1 byte
                    buf.push(Word16be(files.length)); // nRects
                    for (var i = 0; i<files.length; i++) {
                        var fileName = files[i];
                        var dim = rectDim(fileName);
                        var data = fs.readFileSync(__dirname + '/rfb-test-data/' + fileName, 'binary');
                        buf.push(Word16be(dim.x)); // x
                        buf.push(Word16be(dim.y)); // y
                        buf.push(Word16be(dim.w)); // w
                        buf.push(Word16be(dim.h)); // h
                        buf.push(Word32be(0)); // encodingType
                        buf.push(data);
                    }

                    var toSend = buf.join('');
                    stream.write(toSend, 'binary');
                }

                var rgbaFiles = files.filter(function (file) {
                    return file.match(/^\d+-rgba-\d+-\d+-\d+-\d+\.dat$/)
                }).sort();

                if (SEND_TYPE == 'one') {
                    //for (var i=0; i<rgbaFiles.length; i++) {
                    for (var i=0; i<1; i++) { // enough to make node-rfb go nuts
                        sendFile(rgbaFiles[i]);
                    }
                }
                else if (SEND_TYPE == 'all') {
                    sendAll(rgbaFiles);
                }
                else {
                    sys.log('unknown SEND_TYPE');
                    process.exit(1);
                }
            });
        }
    });
    stream.addListener('end', function () {
        sys.log('client disconnected');
    });
}).listen(59000);

sys.log('rfb server on port 59000');

