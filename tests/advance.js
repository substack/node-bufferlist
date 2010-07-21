#!/usr/bin/env node
// Test advancing the buffer
var assert = require('assert');

var Buffer = require('buffer').Buffer;
var BufferList = require('bufferlist');

var b = new BufferList;

var buf1 = new Buffer(5); buf1.write('abcde');
var buf2 = new Buffer(3); buf2.write('xyz');
var buf3 = new Buffer(5); buf3.write('11358');

b.push(buf1);
assert.equal(b.take(b.length), 'abcde', 'pushed correctly');
b.advance(3);
assert.equal(b.take(b.length), 'de', 'advanced with one buffer');
b.advance(3);
assert.equal(b.take(b.length), '', 'advanced one buffer past the end');
b.push(buf2);
assert.equal(b.take(b.length), 'yz', 'offset preserved past the end');
b.push(buf3);
assert.equal(b.take(b.length), 'yz11358', 'second push after advance');
b.advance(4);
assert.equal(b.take(b.length), '358', 'advance after two pushes');
