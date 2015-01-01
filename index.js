var op = require('object-path');

module.exports = function(obj) {
    return new Fickle(obj);
};

module.exports.context = function(opts) {
    return opts;
};


function Fickle(obj) {
    var self = this;
    var data = obj || {};
    var contexts = {}; //Contexts to update
    var id = id();

    self.get = partial(op.get, _data);
    self.exists = partial(op.has, _data);

    //Modifiers:
    self.set = partial(op.set, _data);
    self.del = partial(op.del, _data);
    self.empty = partial(op.empty, _data);
    self.insert = partial(op.insert, _data);
    self.push = partial(op.push, _data);
}


function Context(opts) {
    opts = opts || {};

    var self = this;
    var id = id();
    var cacheTime = opts.cacheTime || 0;
    var verify = opts.verify || false;
    var watching = {}; // objects being watched

    self.on = function(obj, path, cb) {
        
    };

    function hookObj(obj) {

    }

}

/******************************    Helpers   ********************************/

function id() {
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

