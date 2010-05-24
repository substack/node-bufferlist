var BufferList = require('bufferlist').BufferList;
var EventEmitter = require('events').EventEmitter;
var sys = require('sys');

Binary.prototype = new EventEmitter;
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
                this.lazyPopContext();
            }
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
    this.forever = function f (g) {
        var action = {
            ready : false,
            action : function () {
                g.call(this, this.vars);
                f.call(binary, g);
            },
            type : 'forever'
        };
        this.pushAction(action);
        setTimeout(function () {
            action.ready = true;
            binary.emit('next');
        }, 0);
        return this;
    }

    this.f = function (x) {
        this.pushAction({
            ready : true,
            action : function () {
                sys.log(x);
            }
        });
        return this;
    }

    this.dc = function() {
        this.pushAction({
            ready : true,
            action : function () {
                sys.p(contexts);
            }
        });
        return this;
    }
    
    // Repeat some action n times
    this.repeat = function (n, f) {
        var n = typeof(n) == 'string' ? this.vars[n] : n;
        for (var i=0; i<n; i++) {
            (function (j) {
                this.pushAction({
                    ready : true,
                    action : function () {
                        f.call(this, this.vars, j);
                    }
                });
            }).call(this, i);
        }
        return this;
    }
    
    // Clear the action queue. This is useful for inner branches.
    // Perhaps later there should also be a push and pop for entire action
    // queues.
    this.clear = function (value) {
        contexts = [[]];
        return this;
    };
    
    // Stop processing and remove any listeners
    this.exit = function () {
        this.pushAction({
            ready : true,
            action : function () {
                contexts = [[]];
                buffer.removeListener('push', process);
                this.removeListener('next', process);
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
            var length = function (vars) { return vars[opts.length] };
        }
        else if (typeof(opts.length) == 'number') {
            var length = function (vars) { return opts.length };
        }
        
        var into_t = typeof(opts.into);
        var into_types = 'function string'.split(' ');
        if (into_types.indexOf(into_t) < 0) {
            throw TypeError('Unsupported into type: ' + into_t);
        }
        
        this.pushAction({
            ready : function () {
                var s = length.call(binary,binary.vars) * opts.bytes;
                return buffer.length - offset >= s;
            },
            action : function () {
                var s = length.call(binary,binary.vars) * opts.bytes;
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
        this.emit('next');
        return this;
    };

    this.popAction = function () {
        return contexts[0].shift();
    }

    this.nextAction = function () {
        if (contexts[0].length == 0) return;
        return contexts[0][0];
    }

    this.pushContext = function () {
        contexts.unshift([]);
        return this;
    }

    this.popContext = function () {
        contexts.shift();
        return this;
    }

    this.lazyPopContext = function () {
        this.pushAction({
            ready : true,
            action : function () {
                this.popContext();
            }
        });
    }

    var offset = 0;
    var contexts = [[]];
    var binary = this;
    
    function process () {
        sys.log(buffer.length);
        var action = binary.nextAction()
        if (!action) return;
        
        var ready = {
            'function' : action.ready,
            'boolean' : function () { return action.ready },
        }[typeof(action.ready)];
        if (!ready) throw "Unknown action.ready type";
        
        if (ready()) {
            binary.popAction();
            action.action.call(binary, action.action, contexts[0]);
            binary.emit('next');
        }
    }
    this.addListener('next', process);
    buffer.addListener('push', process);
}

