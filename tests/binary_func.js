#!/usr/bin/env node
// Functional binary interface
var assert = require('assert');
var sys = require('sys');

var Buffer = require('buffer').Buffer;
var BufferList = require('bufferlist').BufferList;
var Binary = require('bufferlist/binary').Binary;

// test repeat
var reps = 0;
var trickyList = [];
var bList = new BufferList;

Binary(bList)
    .repeat(5, function(n, vars) {
        reps++;
    })
    .tap(function (vars) {
        assert.equal(
            reps, 5, 'reps != 5, reps == ' + reps + ' in repeat test'
        );
    })
    .repeat(3, function (vars, i) {
        this
            .repeat(4, function (vars, j) {
                trickyList.push([i,j]);
            })
        ;
    })
    .tap(function (vars) {
        expectedTrickyList = [
            [1,1],[1,2],[1,3],[1,4],
            [2,1],[2,2],[2,3],[2,4],
            [3,1],[3,2],[3,3],[3,4]
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

assert.equal(reps, 5, 'reps != 5, reps == ' + reps + ' in outer check');

var buf = new Buffer(7);
buf.write("abc\x00def", 'binary');
bList.push(buf);

