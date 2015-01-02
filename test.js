var assert = require('assert');
var fickle = require('./index');

describe("Fickle Models", function() {

    var ink;
    
    it("Can create a model.", function(done) {
        ink = fickle({
            name : 'shadow',
            hue : '#333',
            ml : 200,
            stats : { views : 0 },
            tags : ['monochrome'] 
        });
        done();
    });

    it("Can perform key, value set.", function(done) {
        // single value set
        ink.set('name', 'smoke');
        assert.equal(ink.get('name'), 'smoke');
        done();
    });

    it("Can perform {k : v, ...} set.", function(done) {
        // multi value set
        ink.set({'stats.views' : 1, 'ml' : 80});
        assert.equal(ink.get('stats.views'), 1);
        done();
    });


    it("Can perform an increment.", function(done) {
        // increment views by 2
        ink.increment('stats.views', 2);
        assert.equal(ink.get('stats.views'), 3);
        done();
    });

    it("Can perform a decrement.", function(done) {
        // decrement views by 1
        ink.decrement('stats.views', 1);
        assert.equal(ink.get('stats.views'), 2);
        done();
    });


    it("Can push to an array.", function(done) {
        // push a value onto an array
        ink.push('tags', 'special');
        assert.equal(ink.get('tags')[1], 'special');
        done();
    });

    it("Can insert into an array.", function(done) {
        // insert a value at a given index of an array
        ink.insert('tags', 'dark', 0);
        assert.equal(ink.get('tags')[0], 'dark');
        done();
    });

    it("Can empty a value.", function(done) {
        ink.empty('tags');
        assert.equal(ink.get('tags').length, 0);
        done();
    });

    it("Can delete a value.", function(done) {
        // delete a value
        ink.del('stats.views'); 
        assert.deepEqual(ink.get('stats'), {});
        done();
    });

});

describe("Fickle Contexts", function() {

    var context, context2, context3;

    var ink = fickle({
        name : 'shadow',
        hue : '#333',
        ml : 200,
        stats : { views : 0 },
        tags : ['monochrome']
    });

    var pink = fickle({
        name : 'pink',
        hue : '#3c1',
        ml : 80,
        stats : { views : 0 },
        tags : ['valentine']
    });

    var r = {}; //test results

    function stash(testName, done) {
        return function(obj, val) {
            r[testName] = {obj:obj, val:val};
            if(done) return done();
        };
    }

    it("Can create a default context.", function(done) {
        context = fickle.context();
        done();
    });

    it("Can create a cached context.", function(done) {
        context2 = fickle.context({ cacheTime : 1000 });
        done();
    });
    
    it("Can create a cached context with changelog format.", function(done) {
        context3 = fickle.context({ cacheTime : 1000, format : "changelog" });
        done();
    });

    it("Can catch an immediate change.", function(done) {
        context.on(ink, 'name', stash('immediate', function(){
            assert.equal(r.immediate.val, 'blue');
            done();
        }));
        ink.set('name', 'blue');
        context.clear(ink);
    });

/*
        context2.onAny(ink, function(obj, val) { console.log("EVERYTHING",val); done(); });
        ink.set('name', 'blue');
        ink.set({'name' : 'green', ml : 300, tinted : true});
        ink.del('tinted');

       */





});
