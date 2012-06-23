#!/usr/bin/env node

var util = require('util');
var Buffer = require('buffer').Buffer;
var BufferList = require('bufferlist');

var buf1 = new Buffer(5); buf1.write('abcde');
var buf2 = new Buffer(3); buf2.write('xyz');
var buf3 = new Buffer(5); buf3.write('11358');

var b = new BufferList;
b.push(buf1,buf2,buf3);

util.puts(b.take(10)); // abcdexyz11
util.puts(b.take(3)); // abc
util.puts(b.take(100)); // abcdexyz11358
