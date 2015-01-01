

<p align="center">
  <img src="https://github.com/pomke/fickle/blob/master/docs/fickle.png?raw=true" alt="Fickle Logo"/>
</p>

# An object with multiple observer contexts.

Fickle is intended for situations where there are multiple contexts for 
receiving notifications about changes, with different requirements such
as time-base batch processing and verification of recipt.


````javascript 
var ink = fickle({
    name : 'shadow'
    hue : '#333',
    ml : 200,
    tags : ['monochrome']});
});

// a context for updating client views
view = fickle.context(); 

// a context for updating the server, has a timeout and 
// requires verification that updates have been processed
// before clearing their dirty flag for this context.
server = fickle.context({
    cacheTime : 1000,
    verify : true
});

// observe a specific key path
view.on(ink, 'name', function(obj, name) { 
    console.log("name changed to", name); 
});

// observe any changes
server.onAny(ink, function(obj, changes, callback) { 
    console.log("saving fields:", changes); 
    
    //save changes to server ...

    // callback array of verified fields to clear dirty flag on
    return callback(Object.keys(changes));
});

// set and get some values..
ink.set('name', 'slate');
ink.set({name : 'silver', hue : '#777'});
ink.get("ml");

// clearing a context unbinds all observers
server.clear();

// output:

name changed to slate
name changed to silver
saving fields: {'name' : 'silver', 'hue' : '#777'}
200
````

    
