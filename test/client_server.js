// Test a client/server interaction
// If nothing gets printed, everything is fine.

var sys = require('sys');
var net = require('net');
var client = new net.Stream;

exports['client/server'] = function (assert) {
    var BufferList = require('bufferlist');
    var bufs = new BufferList;
    var elems = [];

    client.addListener('data', function (data) {
        bufs.push(data);
        elems.push(data);
        
        assert.equal(bufs.take(3), elems[0], 'take first 3 bytes');
        assert.equal(bufs.take(100), elems.join(''), 'take past length of buffer');
    });

    client.addListener('end', function (data) {
        assert.equal(bufs.length, elems.join('').length, 'verify length');
        assert.equal(bufs.take(bufs.length), elems.join(''), 'take to the end');
        client.end();
    });

    var port = 1e4 + Math.random() * ((1 << 16) - 1 - 1e4);
    var server = net.createServer(function (stream) {
        stream.addListener('connect', function () {
            stream.write('foo');
            setTimeout(function () {
                stream.write('bar');
                setTimeout(function () {
                    stream.write('baz');
                    stream.end();
                    server.close();
                }, 500);
            }, 500);
        });
    });
    server.listen(port);

    setTimeout(function () {
        client.connect(port);
    }, 50);
};

