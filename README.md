

<p align="center">
  [Fickle Logo](https://github.com/pomke/fickle/blob/master/docs/fickle.png?raw=true)
</p>

## Fickle objects, with multiple observer contexts.

[![build status](https://secure.travis-ci.org/pomke/fickle.png)](http://travis-ci.org/pomke/fickle)

Fickle is intended for situations where there are multiple contexts for 
receiving notifications about changes, with different requirements such
as time-base batch processing, different change-set formats etc.

Fickle has two very simple concepts: 

### Models 

A model is an object with setters and getters:

````javascript
var ink = fickle({
    name : 'shadow',
    hue : '#333',
    ml : 200,
    stats : { views : 0 },
    tags : ['monochrome'] });

// single value set
ink.set('name', 'smoke');

// multi value set
ink.set({'stats.views' : 1, 'ml' : 80});

// increment views by 2
ink.increment('stats.views', 2);

// decrement views by 1
ink.decrement('stats.views', 1);

// get stats
ink.get('stats') // -> { views : 2 }

// push a value onto an array
ink.push('tags', 'special');
ink.get('tags'); // -> ['monochrome', 'special']

// insert a value at a given index of an array
ink.insert('tags', 'dark', 0);
ink.get('tags'); // -> ['dark', 'monochrome', 'special']

// 'empty' a value: reduces a string to '', an object to {}, an array to []
ink.empty('tags');
ink.get('tags'); // -> []

// delete a value
ink.del('stats.views') 
ink.get('stats'); // -> {}
````

### Contexts

In Fickle, models are observed through an 'Observer Context'. Contexts 
determine the manner in which observers are updated, and provide methods
for registering observer functions.


````javascript 
var ink = fickle({
    name : 'shadow',
    hue : '#333',
    ml : 200,
    stats : { views : 0 },
    tags : ['monochrome'] });

// A default context updates as soon as changes come in, this is great for
// connecting to view logic.
var viewCtx = fickle.context(); 

// A batching context is useful when updating the server, this one updates
// observers at a maximum frequency of 5 seconds
serverCtx = fickle.context({
    cacheTime : 5000
});

// observe a specific key path on an object with 'on'
viewCtx.on(ink, 'name', function(obj, name) { 
    console.log("name changed to", name); 
});

// observe any changes
serverCtx.onAny(ink, function(obj, changes) { 
    console.log("saving fields:", changes); 
    //save changes to server ...
});

// set and get some values..
ink.set('name', 'slate');
ink.set({name : 'silver', hue : '#777'});
ink.get("ml");

// output:
name changed to slate
name changed to silver
saving fields: {'name' : 'silver', 'hue' : '#777'}
200

// pausing a context stops it receiving any updates
viewCtx.pause(true);
viewCtx.pause(false);

// clearing a context unbinds observers
viewCtx.clear(ink);
serverCtx.clearAll();
````

    
