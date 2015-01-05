(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
(function (process){
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
        var paths = observers[objID] || (observers[objID] = {});
        var obs = paths[path] || (paths[path] = []);
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
        var stage = cache[objID]; //stage is the cache for this objID
        Object.keys(changes).forEach(function(k) {
            if(!stage[k]) stage[k] = [];
            stage[k].push([now, method, changes[k]]);
        });

        if(!cacheTime || (last && now > (last + cacheTime))) {
            // propagate changes
            self._propagate();
        } else {
            // set a timer for the next send
            setTimeout(self._propagate, (last + cacheTime) - now);
        }
    };

    self._propagate = function() {
        // process cache, send results to observers
        //for each object we have changes cached for..

        Object.keys(cache).forEach(function(objID) {
            var changes = cache[objID]; //changes for this object

            //for each registered observer path for this object..
            Object.keys(observers[objID]).forEach(function(path) {
                //If we have changes for this path..
                var obs = observers[objID][path];
                if(changes[path]) {
                    //notify all observers for path
                    obs.forEach(function(observer) {
                        observer(watching[objID], changes[path][changes[path].length-1][2]);
                    });
                }
                if(path === "*") {
                    //catch all! respond with everything
                    obs.forEach(function(observer) {
                        var out;
                        switch(format) {
                            case 'rolled':
                                // rolled format, latest changed values
                                out = {};
                                Object.keys(changes).forEach(function(k) {
                                    out[k] = changes[k][changes[k].length-1][2];
                                });
                                break;
                            case 'changelog':
                                // changelog format, array of changes
                                out = [];
                                Object.keys(changes).forEach(function(k) {
                                    changes[k].forEach(function(change) {
                                        out.push([change[0], change[1], k, change[2]]);
                                    });
                                });
                                break;
                        }

                        observer(watching[objID], out);
                    });
                }
            });
        });
        cache = {}; //Finished propagating, clear cached changes
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


}).call(this,require('_process'))
},{"_process":3,"object-path":2}],2:[function(require,module,exports){
(function (root, factory){
  'use strict';

  /*istanbul ignore next:cant test*/
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = factory();
  } else if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define([], factory);
  } else {
    // Browser globals
    root.objectPath = factory();
  }
})(this, function(){
  'use strict';

  var
    toStr = Object.prototype.toString,
    _hasOwnProperty = Object.prototype.hasOwnProperty;

  function isEmpty(value){
    if (!value) {
      return true;
    }
    if (isArray(value) && value.length === 0) {
      return true;
    } else {
      for (var i in value) {
        if (_hasOwnProperty.call(value, i)) {
          return false;
        }
      }
      return true;
    }
  }

  function toString(type){
    return toStr.call(type);
  }

  function isNumber(value){
    return typeof value === 'number' || toString(value) === "[object Number]";
  }

  function isString(obj){
    return typeof obj === 'string' || toString(obj) === "[object String]";
  }

  function isObject(obj){
    return typeof obj === 'object' && toString(obj) === "[object Object]";
  }

  function isArray(obj){
    return typeof obj === 'object' && typeof obj.length === 'number' && toString(obj) === '[object Array]';
  }

  function isBoolean(obj){
    return typeof obj === 'boolean' || toString(obj) === '[object Boolean]';
  }

  function getKey(key){
    var intKey = parseInt(key);
    if (intKey.toString() === key) {
      return intKey;
    }
    return key;
  }

  function set(obj, path, value, doNotReplace){
    if (isNumber(path)) {
      path = [path];
    }
    if (isEmpty(path)) {
      return obj;
    }
    if (isString(path)) {
      return set(obj, path.split('.').map(getKey), value, doNotReplace);
    }
    var currentPath = path[0];

    if (path.length === 1) {
      var oldVal = obj[currentPath];
      if (oldVal === void 0 || !doNotReplace) {
        obj[currentPath] = value;
      }
      return oldVal;
    }

    if (obj[currentPath] === void 0) {
      //check if we assume an array
      if(isNumber(path[1])) {
        obj[currentPath] = [];
      } else {
        obj[currentPath] = {};
      }
    }

    return set(obj[currentPath], path.slice(1), value, doNotReplace);
  }

  function del(obj, path) {
    if (isNumber(path)) {
      path = [path];
    }

    if (isEmpty(obj)) {
      return void 0;
    }

    if (isEmpty(path)) {
      return obj;
    }
    if(isString(path)) {
      return del(obj, path.split('.'));
    }

    var currentPath = getKey(path[0]);
    var oldVal = obj[currentPath];

    if(path.length === 1) {
      if (oldVal !== void 0) {
        if (isArray(obj)) {
          obj.splice(currentPath, 1);
        } else {
          delete obj[currentPath];
        }
      }
    } else {
      if (obj[currentPath] !== void 0) {
        return del(obj[currentPath], path.slice(1));
      }
    }

    return obj;
  }

  var objectPath = {};

  objectPath.has = function (obj, path) {
    if (isEmpty(obj)) {
      return false;
    }

    if (isNumber(path)) {
      path = [path];
    } else if (isString(path)) {
      path = path.split('.');
    }

    if (isEmpty(path) || path.length === 0) {
      return false;
    }

    for (var i = 0; i < path.length; i++) {
      var j = path[i];
      if ((isObject(obj) || isArray(obj)) && _hasOwnProperty.call(obj, j)) {
        obj = obj[j];
      } else {
        return false;
      }
    }

    return true;
  };

  objectPath.ensureExists = function (obj, path, value){
    return set(obj, path, value, true);
  };

  objectPath.set = function (obj, path, value, doNotReplace){
    return set(obj, path, value, doNotReplace);
  };

  objectPath.insert = function (obj, path, value, at){
    var arr = objectPath.get(obj, path);
    at = ~~at;
    if (!isArray(arr)) {
      arr = [];
      objectPath.set(obj, path, arr);
    }
    arr.splice(at, 0, value);
  };

  objectPath.empty = function(obj, path) {
    if (isEmpty(path)) {
      return obj;
    }
    if (isEmpty(obj)) {
      return void 0;
    }

    var value, i;
    if (!(value = objectPath.get(obj, path))) {
      return obj;
    }

    if (isString(value)) {
      return objectPath.set(obj, path, '');
    } else if (isBoolean(value)) {
      return objectPath.set(obj, path, false);
    } else if (isNumber(value)) {
      return objectPath.set(obj, path, 0);
    } else if (isArray(value)) {
      value.length = 0;
    } else if (isObject(value)) {
      for (i in value) {
        if (_hasOwnProperty.call(value, i)) {
          delete value[i];
        }
      }
    } else {
      return objectPath.set(obj, path, null);
    }
  };

  objectPath.push = function (obj, path /*, values */){
    var arr = objectPath.get(obj, path);
    if (!isArray(arr)) {
      arr = [];
      objectPath.set(obj, path, arr);
    }

    arr.push.apply(arr, Array.prototype.slice.call(arguments, 2));
  };

  objectPath.coalesce = function (obj, paths, defaultValue) {
    var value;

    for (var i = 0, len = paths.length; i < len; i++) {
      if ((value = objectPath.get(obj, paths[i])) !== void 0) {
        return value;
      }
    }

    return defaultValue;
  };

  objectPath.get = function (obj, path, defaultValue){
    if (isNumber(path)) {
      path = [path];
    }
    if (isEmpty(path)) {
      return obj;
    }
    if (isEmpty(obj)) {
      return defaultValue;
    }
    if (isString(path)) {
      return objectPath.get(obj, path.split('.'), defaultValue);
    }

    var currentPath = getKey(path[0]);

    if (path.length === 1) {
      if (obj[currentPath] === void 0) {
        return defaultValue;
      }
      return obj[currentPath];
    }

    return objectPath.get(obj[currentPath], path.slice(1), defaultValue);
  };

  objectPath.del = function(obj, path) {
    return del(obj, path);
  };

  return objectPath;
});

},{}],3:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}]},{},[1]);
