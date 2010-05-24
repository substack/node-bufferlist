#!/usr/bin/env node
var fs = require('fs');
var sys = require('sys');
var path = require('path');
var proc = require('child_process');

var scriptName = path.basename(__filename);

fs.readdir(__dirname, function (err, files) {
    var tests = files.filter(function (file) {
        return file.match(/\.js$/) && file != scriptName && file != 'binary_rfb.js'
    });
    
    var failed = 0;
    var ok = 0;
    
    (function nextTest () {
        var test = tests.pop();
        if (!test) {
            sys.puts(
                (ok + failed) + ' tests: '
                + ok + ' ok, ' + failed + ' failed'
            );
        }
        else {
            sys.print(test + ' ... ');
            proc.exec(__dirname + '/' + test, function (err, stdout, stderr) {
                if (err) {
                    sys.puts('failed');
                    sys.puts(err);
                    failed ++;
                }
                else if (stderr) {
                    sys.puts('failed');
                    sys.puts(stderr);
                    failed ++;
                }
                else {
                    sys.puts('ok');
                    ok ++;
                }
                nextTest();
            });
        }
    })();
});
