#!/usr/bin/env node
// Test binary looping functions
var assert = require('assert');
var sys = require('sys');

var Buffer = require('buffer').Buffer;
var BufferList = require('bufferlist').BufferList;
var Binary = require('bufferlist/binary').Binary;

// test repeat
var reps = 0;
var trickyList = [];

Binary(new BufferList)
    .repeat(5000, function(vars, n) {
        reps++;
    })
    .tap(function (vars) {
        assert.equal(
            reps, 5000, 'reps != 5000, reps == ' + reps + ' in repeat test'
        );
    })
    .repeat(3, function (vars, i) {
        this
            .repeat(4, function (vars, j) {
                trickyList.push([ i + 1, j + 1 ]);
            })
        ;
    })
    .tap(function (vars) {
        expectedTrickyList = [
            [0,0],[0,1],[0,2],[0,3],
            [1,0],[1,1],[1,2],[1,3],
            [2,0],[2,1],[2,2],[2,3]
        ];
        for (var i = 0; i < trickyList.length; i++) {
            assert.equal(
                trickyList[i][0],
                expectedTrickyList[i][0],
                'trickly list is not what it should be. it should be: ' +
                    sys.inspect(expectedTrickyList) + '. it is: ' +
                    sys.inspect(trickyList)
            );
            assert.equal(
                trickyList[i][1],
                expectedTrickyList[i][1],
                'trickly list is not what it should be. it should be: ' +
                    sys.inspect(expectedTrickyList) + '. it is: ' +
                    sys.inspect(trickyList)
            );
        }
    })
;

assert.equal(reps, 5000, 'reps != 5000, reps == ' + reps + ' in outer repeat check');

var c = 0;
Binary(new BufferList)
    .forever(function (vars) {
        c ++;
        if (c == 10000) this.exit();
    })
;

setTimeout(function () {
    assert.equal(
        c, 10000, 'c != 10000, c == ' + c + ' in terminated forever check'
    );
}, 1000);

var bufferList = new BufferList;
var loops = 0;
Binary(bufferList)
    .forever(function () {
        this
            .getWord16be('count')
            .tap(function (vars) {
                assert.equal(
                    vars.count, 100, 'count != 100, count == ' + vars.count
                );
                vars.reps = 0;
            })
            .repeat('count', function (vars, i) {
                this
                    .getWord16be('size')
                    .tap(function (vars) {
                        assert.equal(
                            vars.size, 1000,
                            'size != 1000, size == ' + vars.size
                        );
                    })
                    .getBuffer('block', 'size')
                ;
                vars.reps ++;
            })
            .tap(function (vars) {
                assert.equal(
                    vars.reps, 100, 'reps != 100, reps == ' + vars.reps
                );
            })
        ;
        loops ++;
        if (loops == 20) this.exit();
    })
;

for (var n = 0; n < 20; n++) {
    var countBuf = new Buffer(2);
    countBuf[0] = Math.floor(100 / 256);
    countBuf[1] = 100 % 256;
    bufferList.push(countBuf);
    
    for (var i = 0; i < 100; i++) {
        var buf = new Buffer(1000 + 2);
        buf[0] = Math.floor(1000 / 256);
        buf[1] = 1000 % 256;
        for (var j = 0; j < 1000; j++) {
            buf[j + 2] = j;
        }
        bufferList.push(buf);
    }
}

setTimeout(function () {
    assert.equal(loops, 20, 'loops != 20, loops == ' + loops);
}, 1000);

