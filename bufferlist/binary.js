var BufferList = require('bufferlist').BufferList;
var EventEmitter = require('events').EventEmitter;
var sys = require('sys');

exports.Binary = Binary;
function Binary(buffer) {
    if (!(this instanceof Binary)) return new Binary(buffer);
    this.vars = {};
    
    this.tap = function (f) {
        this.pushAction({
            ready : true,
            action : function () {
                this.pushContext();
                f.call(this, this.vars);
            },
        });
        return this;
    };
    
    // Perform some action when v == value
    this.when = function (v, value, f) {
        return this.tap(function (vars) {
            if (this.vars[v] == value) {
                f.call(this, vars);
            }
        });
    };
    
    // Perform some action when v != value
    this.unless = function (v, value, f) {
        return this.tap(function (vars) {
            if (this.vars[v] != value) {
                f.call(this, vars);
            }
        });
    };
    
    // Perform some action forever
    this.forever = function (f) {
        this.pushAction({
            ready : true,
            action : function () {
                f.call(this, this.vars);
                this.forever(f);
            }
        });
        return this;
    }
    
    // Repeat some action n times
    this.repeat = function (n, f) {
        for (var i=1; i<=n; i++) {
            this.pushAction({
                ready : true,
                action : function () {
                    // last arg is i so vars is in the usual place
                    f.call(this, this.vars, i);
                }
            });
        }
        return this;
    }
    
    // Repeat some action until v == value
    this.until = function () {
        if (arguments.length == 3) {
            var v1 = arguments[0];
            var v2 = arguments[1];
            var checker = function (vars) {
                if (typeof(v1) == 'string') {
                    v1 = vars[v1];
                }
                if (typeof(v2) == 'string') {
                    v2 = vars[v2];
                }
                return v1 == v2;
            };
            var f = arguments[2];
        }
        else if (arguments.length == 2) {
            var checker = arguments[0];
            var f = arguments[1];
        }
        
        this.pushAction({
            ready : true,
            action : function () {
                if (!checker(this.vars)) {
                    f.call(this, this.vars);
                    this.pushAction({
                        ready : true,
                        action : function () {
                            this.until(checker,f);
                            sys.log('inner!');
                        },
                        type : 'until',
                    });
                }
            }
        });
        return this;
    }
    
    // End a context and exit if there are no more contexts.
    this.end = function () {
        this.pushAction({
            ready : true,
            action : function () {
                this.popContext();
                if (contexts.length == 0) this.exit();
            }
        });
        return this;
    };
    
    // Stop processing and remove any listeners
    this.exit = function () {
        this.pushAction({
            ready : true,
            action : function () {
                contexts = [];
                buffer.removeListener('push', stepper);
            }
        });
        return this;
    };
    
    // convert byte strings to little endian numbers
    function decodeLE (bytes) {
        var acc = 0;
        for (var i = 0; i < bytes.length; i++) {
            acc += Math.pow(256,i) * bytes[i];
        }
        return acc;
    }
    
    // convert byte strings to big endian numbers
    function decodeBE (bytes) {
        var acc = 0;
        for (var i = 0; i < bytes.length; i++) {
            acc += Math.pow(256, bytes.length - i - 1) * bytes[i];
        }
        return acc;
    }
    
    this.get = function (opts) {
        var into_t = typeof(opts.into);
        var into_types = 'function string'.split(' ');
        if (into_types.indexOf(into_t) < 0) {
            throw TypeError('Unsupported into type: ' + into_t);
        }
        
        this.pushAction({
            ready : function () {
                return buffer.length - offset >= opts.bytes;
            },
            action : function () {
                var data = buffer.join(offset, offset + opts.bytes);
                var decoded = opts.endian && opts.endian == 'little'
                    ? decodeLE(data)
                    : decodeBE(data)
                ;
                
                offset += opts.bytes;
                if (into_t == 'function') {
                    opts.into.call(this, decoded);
                }
                else {
                    this.vars[opts.into] = decoded;
                }
            },
        });
        return this;
    };
    
    this.getWord8 = function (into) {
        return this.get({ into : into, bytes : 1 });
    };
    
    this.getWord16be = function (into) {
        return this.get({ into : into, bytes : 2, endian : 'big' });
    };
    
    this.getWord16le = function (into) {
        return this.get({ into : into, bytes : 2, endian : 'little' });
    };
    
    this.getWord32be = function (into) {
        return this.get({ into : into, bytes : 4, endian : 'big' });
    };
    
    this.getWord32le = function (into) {
        return this.get({ into : into, bytes : 4, endian : 'little' });
    };
    
    this.getWord64be = function (into) {
        return this.get({ into : into, bytes : 8, endian : 'big' });
    };
    
    this.getWord64le = function (into) {
        return this.get({ into : into, bytes : 8, endian : 'little' });
    };
    
    this.getBuffer = function (into, length) {
        return this.gets({ into : into, bytes : 1, length : length });
    };
    
    this.gets = function (opts) {
        if (typeof(opts.length) == 'string') {
            var s = opts.length;
            opts.length = function (vars) { return vars[s] };
        }
        else if (typeof(opts.length) == 'number') {
            var s = opts.length;
            opts.length = function (vars) { return s };
        }
        
        function size () {
            return opts.length.call(binary,binary.vars) * opts.bytes;
        }
        
        var into_t = typeof(opts.into);
        var into_types = 'function string'.split(' ');
        if (into_types.indexOf(into_t) < 0) {
            throw TypeError('Unsupported into type: ' + into_t);
        }
        
        this.pushAction({
            ready : function () {
                var s = size();
                return s && buffer.length - offset >= s;
            },
            action : function () {
                var s = size();
                var data = buffer.join(offset, offset + s);
                offset += s;
                
                if (into_t == 'function') {
                    opts.into.call(this,data);
                }
                else if (into_t == 'string') {
                    this.vars[opts.into] = data;
                }
            },
        });
        return this;
    };
    
    // Advance the bufferlist to the internal offset so that unused Buffers in
    // the linked list can be garbage collected and so the module doesn't need
    // to traverse the list as far.
    this.flush = function () {
        this.pushAction({
            ready : true,
            action : function () {
                buffer.advance(offset);
                offset = 0;
            }
        });
        return this;
    };
    
    // Skip ahead a relative number of bytes in the input stream.
    // Uses jump.
    this.skip = function (bytes) {
        this.jump(bytes);
        return this;
    }
    
    // Jump back a relative number of bytes in the bufferlist stream.
    // Uses jump.
    this.rewind = function (bytes) {
        this.jump(-bytes);
        return this;
    };
    
    // Jump an absolute number of bytes into the bufferlist stream.
    // Bytes may be positive or negative.
    // Raises an exception when the buffer list has been advanced
    // (via flush) past the number of bytes specified.
    this.jump = function (bytes) {
        this.pushAction({
            ready : function () {
                return buffer.length - offset >= bytes
            },
            action : function () {
                offset += bytes;
                if (offset < 0) {
                    throw RangeError('BufferList offset < 0');
                }
            }
        });
        return this;
    };
    
    // Push an action onto the current action queue
    this.pushAction = function (opts) {
        contexts[0].push(opts);
        this.stepAction();
        return this;
    };
    
    this.popAction = function () {
        var action = contexts[0].shift();
        if (!action && contexts.length > 1) {
            this.popContext();
            return this.popAction();
        }
        else {
            return action;
        }
    };
    
    this.nextAction = function (opts) {
        if (contexts.length == 0) return;
        var action = contexts[0][0];
        if (!action && contexts.length > 1)
            return contexts[1][0];
        else return action;
    };
    
    this.pushContext = function () {
        contexts.unshift([]);
        return this;
    };
    
    this.popContext = function () {
        contexts.shift();
        return this;
    };
    
    var offset = 0;
    var contexts = [[]]; // contexts full of actions to execute
    
    this.stepAction = function () {
        var action = this.nextAction();
        if (!action) return;
        
        var ready = {
            'function' : action.ready,
            'boolean' : function () { return action.ready },
        }[typeof(action.ready)];
        if (!ready) throw "Unknown action.ready type";
        
        if (ready()) {
            this.popAction();
            action.action.call(this, this.vars);
            this.stepAction();
        }
    }
    
    var binary = this;
    function stepper () { binary.stepAction() }
    buffer.addListener('push', stepper);
}
