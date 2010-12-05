// Test advancing the buffer

var Buffer = require('buffer').Buffer;
var BufferList = require('../bufferlist');

exports.advance = function (assert) {
    var b = new BufferList;
    var buf1 = new Buffer(5); buf1.write('abcde');
    var buf2 = new Buffer(3); buf2.write('xyz');
    var buf3 = new Buffer(5); buf3.write('11358');
    
    b.write(buf1);
    assert.equal(b.take(b.length), 'abcde', 'wrote correctly');
    b.advance(3);
    assert.equal(b.take(b.length), 'de', 'advanced with one buffer');
    b.advance(3);
    assert.equal(b.take(b.length), '', 'advanced one buffer past the end');
    b.write(buf2);
    assert.equal(b.take(b.length), 'yz', 'offset preserved past the end');
    b.write(buf3);
    assert.equal(b.take(b.length), 'yz11358', 'second write after advance');
    b.advance(4);
    assert.equal(b.take(b.length), '358', 'advance after two writes');
};
