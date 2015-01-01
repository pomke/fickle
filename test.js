var assert = require('assert');
var fickle = require('./index');

describe("Fickle", function() {




    it("works", function(done) {
        var ink = fickle({
            brand : 'Diamine',
            colour : 'purple',
            ml : 80,
        });

        assert.equal(ink.get('a'), 1);
        done();

    });



});
