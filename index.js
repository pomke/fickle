var op = require('object-path');

module.exports = function(obj) {
    return new Fickle(obj);
};

module.exports.context = function(opts) {
    return new Context(opts);
};

function Fickle(obj) {
    var id;
    var self = this;
    id = self._id = mkID();
    var data = obj || {};
    var contexts = {}; //Contexts to update

    // Getters:
    self.get = partial(op.get, data);
    self.exists = partial(op.has, data);

    // Modifiers:
    self.set = setter('set');
    self.del = setter('del');
    self.empty = setter('empty');
    self.insert = setter('insert');
    self.push = setter('push');
    self.increment = setter('increment');
    self.decrement = setter('decrement');

    // Internals:
    var setters = {
        set : partial(op.set, data),
        del : partial(op.del, data),
        empty : partial(op.empty, data),
        insert : partial(op.insert, data),
        push : partial(op.push, data)
    };

    self._hook = function(ctxID, ctx) {
        contexts[ctxID] = ctx;
        return id;
    };

    function setter(method) {
        return function(/* arguments */) {
            var changes = {};
            var path;
            switch(method) {
                case 'set':
                    //Handle key/value or an object of updates
                    var updates;
                    if(typeof arguments[0] === 'string') {
                        updates = {}; 
                        updates[arguments[0]] = arguments[1];
                    } else {
                        updates = arguments[0];
                    }
                    Object.keys(updates).forEach(function(k) {
                        var value = updates[k];
                        setters.set(k, value);
                        changes[k] = value;
                    });
                    break;
                case 'del':
                case 'empty':
                case 'insert':
                case 'push':
                    var args = Array.prototype.slice.call(arguments);
                    setters[method].apply(null, args);
                    changes[arguments[0]] = self.get(arguments[0]);
                    break;
                case 'increment':
                    path = arguments[0];
                    setters.set(path, self.get(path) + arguments[1]);
                    changes[path] = self.get(path);
                    break;
                case 'decrement':
                    path = arguments[0];
                    setters.set(path, self.get(path) - arguments[1]);
                    changes[path] = self.get(path);
                    break;
            }

            // update each context with the changes
            process.nextTick(function notifyContexts() {
                Object.keys(contexts).forEach(function(ctxID) {
                    contexts[ctxID]._changes(id, method, changes);
                });
            });
        };
    }

}


function Context(opts) {
    opts = opts || {};

    var self = this;
    var id = mkID();
    var cacheTime = opts.cacheTime || 0;
    var cache = {};
    var format = opts.format || 'rolled';
    var watching = {}; // objects being watched
    var observers = {};
    var paused = false;
    var last;

    function pushObs(obj, path, cb) {
        var objID = obj._id;
        var paths = observers[objID] ? observers[objID] : observers[objID] = {}; 
        var obs = paths[path] ? paths[path] : paths[path] = [];
        if(!obs[path]) obs[path] = [];
        obs.push(cb);
    }

    self.on = function(obj, path, cb) {
        hookObj(obj);
        pushObs(obj, path, cb);
    };

    self.onAny = function(obj, cb) {
        hookObj(obj);
        pushObs(obj, '*', cb);
    };

    self.clear = function(obj) {
        //TODO
    };

    self.clearAll = function() {
        //TODO
    };

    self.pause = function(bool) {
        paused = bool;
    };

    self._changes = function(objID, method, changes) {
        if(paused) return; 
        var now = new Date().getTime();

        // stage changes in cache before propagating to observers
        if(!cache[objID]) cache[objID] = {};
        var stage = cache[objID];
        Object.keys(changes).forEach(function(k) {
            if(!stage[k]) cache[k] = [];
            stage[k].push([now, method, changes[k]]);
        });

        if(!cacheTime || (last && now > (last + cacheTime))) {
            // propagate changes
            self.propagate();
        } else {
            // set a timer for the next send
            setTimeout(self.propagate, (last + cacheTime) - now);
        }
    };

    self._propagate = function() {
        // process cache, send results to observers
        Object.keys(cache).forEach(function(objID) {
            var changes = cache[objID]; //changes for this object
            Object.keys(observers[objID]).forEach(function(path) {
                var obs = observers[objID][path]; //observers for path
                
            });
        });
    };

    // Connect obj and context
    function hookObj(obj) {
        watching[obj._hook(id, self)] = obj;
    }

}

/******************************    Helpers   ********************************/

// Make a UUID
function mkID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(
        /[xy]/g, function(c) {
        var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
        return v.toString(16);
    });
}
 
function partial(f) {
    var args = Array.prototype.slice.call(arguments, 1);
    return function() {
        var remainingArgs = Array.prototype.slice.call(arguments);
        return f.apply(null, args.concat(remainingArgs));
    };
}

