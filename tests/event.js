#!/usr/bin/env node
// Test joining lots of chunks into one buffer
var assert = require('assert');

var Buffer = require('buffer').Buffer;
var BufferList = require('bufferlist');

var b = new BufferList;
var times = 0;

b.addListener('push', function (args) {
    assert.equal(
        pushed.toString(),
        args.toString(),
        'pushed callback gives its arguments'
    );
    times ++;
});

var buf1 = new Buffer(5); buf1.write('abcde');
var buf2 = new Buffer(3); buf2.write('xyz');
var buf3 = new Buffer(5); buf3.write('11358');

var pushed = [buf1,buf2];
b.push(buf1,buf2);

assert.equal(times, 1, 'pushed once');

var pushed = [buf3];
b.push(buf3);

assert.equal(times, 2, 'pushed two times');

assert.equal(b.take(), 'abcdexyz11358', 'entire buffer check');

var advanced = 0;
b.addListener('advance', function (n) {
    assert.equal(n, 3, 'n = 3 in advance callback')
    advanced ++;
});
b.advance(3);
assert.equal(b.take(3), 'dex', 'advanced 3');
assert.equal(advanced, 1, 'advance callback triggered once');
