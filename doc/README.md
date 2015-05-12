# Bedrock

## <a id="#Bedrock-Events"></a>Bedrock.Events

An extendable object that gives you jQuery-like `on`, `off` and `trigger` event
delegation. Also provides functionality for inverse-of-control event listening.

### <a id="#Bedrock-Events-on"></a>`on(name, callback[, context])`

Add a listener to the object that gets called when an event `name` is
triggered. This callback will receive any arguments passed to `trigger`. The
`callback` can be bound via the `context` parameter.

### <a id="#Bedrock-Events-once"></a>`once(name, callback[, context])`

The same as `on` except that the `callback` will only be called once before it
is removed as a listener.

### <a id="#Bedrock-Events-off"></a>`off([name[, callback[, context]]])`

Removes event listeners with exceeding specificity as to which listeners get
removed from the object. For example, if `callback` and `context` are omitted,
events for all of `name` will be removed. Also keep in mind you can omit
`callback` and still pass in `contexxt`.

### <a id="#Bedrock-Events-trigger"></a>`trigger(name[, ...args])`

Trigger the event `name` on the object with any arguments passed along to
listeners.

```js
var object = Bedrock.Events.extend({}),
    context = {};
object.on('expand', function(hello, bye) { console.log(hello + ' ' + bye); }, context);
object.trigger('expand', 'hello', 'bye');
// -> outputs 'hello bye'

object.on('expand', function(hello, bye) { console.log(bye + ' ' + hello); });
object.off('expand', null, context);
object.trigger('expand', 'hello', 'bye');
// -> outputs 'bye hello'
```

### <a id="#Bedrock-Events-listenTo"></a>`listenTo(obj, name, callback)`

Keeps track of the listeners attached to `obj` via this method so that they
can be removed from the object this method is called on. The context is assumed
to be the current object.

### <a id="#Bedrock-Events-listenToOnce"></a>`listenToOnce(obj, name, callback)`

The same as `listenTo` except that the `callback` will only be called once
before it is removed as a listener on the `obj`.

### <a id="#Bedrock-Events-stopListening"></a>`stopListening([obj[, name[, callback]]])`

Removes listeners attached to other objects in exceeding specificity similar
to `off`. If all arguments are omitted it will remove all listeners attached to
other objects added via `listenTo` or `listenToOnce`. Keep in mind this may
remove listeners attached via `on` or `once` if `listenTo` or `listenToOnce`
were used on the objects.

```js
var object = Bedrock.Events.extend({}),
    otherObject = Bedrock.Events.extend({});
object.listenTo(otherObject, 'online', function(who) { console.log(who + ' is online'); });
otherObject.trigger('online', 'James');
// -> outputs 'bye hello'
object.stopListening();
otherObject.trigger('online', 'James');
// -> nothing happens
```

### <a id="#Bedrock-Events-extend"></a>`extend(object)`

Provides the Events methods on the object provided and returns the object
passed in as `object`.

## <a id="#Bedrock-Model"></a>Bedrock.Model

*Inherits [Bedrock.Events](#Bedrock-Events)*

*Inherits `keys`, `values`, `pairs`, `invert`, `pick`, `omit` and `result` from
[lodash](https://lodash.com) if each function is available at runtime*

A simple model that provides a mechanism for a coherent way to get, set and
interact with objects that represent an item. Basically think of a model as
a key-value store (called attributes) with helper methods.

### <a id="#Bedrock-Model-ctor"></a>`new Bedrock.Model([attributes[, options]])`

Creates a new model using the provided attributes and options. These options
are passed along to `parse` and `initialize`.

### <a id="#Bedrock-Model-id"></a>`id: undefined`

The model identifier present on constructed models.

### <a id="#Bedrock-Model-idAttribute"></a>`idAttribute: 'id'`

The attribute name that will be used to assign the model identifier. By
default this is `id` and will automatically set the `id` property
(unchangeable) to that key's value during construction if present.

### <a id="#Bedrock-Model-changed"></a>`changed: null`

An object (or null) value representing any changes since the model was
constructed or since the previous [`set`](#Bedrock-Model-set).

### <a id="#Bedrock-Model-parse"></a>`parse(attributes[, options])`

Parse is called first during model construction and given the raw attributes
passed into the constructor. By default the parse method clones and returns
the attributes in except if `options.clone` is `false`. If parse returns false,
the attributes passed in are assumed to be invalid and `valid` on the model is
set to `false`. It is advisable to override it with a parse method of your own
when extending `Bedrock.Model`.

### <a id="#Bedrock-Model-initialize"></a>`initialize([options])`

A no operation function that can be overridden when extending `Bedrock.Model`.
This is the last thing that gets run during the constructor.

### <a id="#Bedrock-Model-toJSON"></a>`toJSON()`

Returns a shallow copy of the attributes on the model.

### <a id="#Bedrock-Model-get"></a>`get(attribute)`

Gets an attribute from the model.

### <a id="#Bedrock-Model-escape"></a>`escape(attribute)`

Gets an escaped attribute value from the model by using `_.escape`.

### <a id="#Bedrock-Model-has"></a>`has(attribute)`

Returns `true` if the attribute is defined (not undefined or null) and `false`
otherwise.

### <a id="#Bedrock-Model-merge"></a>`merge(attributes[, options])`

This provides a mechanism for merging two models together. By default, the
(`set`)[#Bedrock-Model-set] method is called with `attributes` and `options`
and the result returned.

### <a id="#Bedrock-Model-set"></a>`set(attribute, value[, options])`

Sets an attribute to a specific value. Quite possibly the most versatile method
on a model, `set` also allows setting multiple attributes at once by using the
alternate function parameters: `set(attributes[, options])`. When an attribute
changes, events are triggered on the underlying model in the form
`"change:[attribute]"`. In addition, after the `set` is finished it will
trigger a `"change"` event to signify the model has changed. To squelch these
events, simply set the option `silent` to `true`.

```js
var model = new Bedrock.Model({id: 1, name: 'Meow mix'});
model.on('change:name', function(model, value, options) {
   console.log(model.id + ' name changed to ' + value);
});
model.set('name', 'Meow max');
// => "1 name changed to Meow max"
model.set('name', 'Meow mix', {silent: true});
// nothing prints; however, the name on the model changed
```

### <a id="#Bedrock-Model-unset"></a>`unset(attribute[, options])`

So similar to (`set`)[#Bedrock-Model-set] that internally we actually call
(`set`)[#Bedrock-Model-set]. The differences are few except that the attributes
are removed from the model. This method also takes the function parameters in
the form: `unset(attributes[, options])`. Triggers the same events and can be
silenced the same as (`set`)[#Bedrock-Model-set].

### <a id="#Bedrock-Model-set"></a>`clear([options])`

Unsets all attributes on the model. Triggers the same events and can be
silenced the same as (`set`)[#Bedrock-Model-set].

### <a id="#Bedrock-Model-hasChanged"></a>`hasChanged(attribute)`

Returns whether the attribute has changed recently by checking the `changed`
attribute for a property named `attribute`.

### <a id="#Bedrock-Model-hasChanged"></a>`hasChanged([attribute])`

Returns `true` or `false` depending on if the model has changed since the last
`"change"` event. If an attribute is provided, it instead returns whether the
attribute has changed recently by checking the `changed` attribute for a
property named `attribute`.

### <a id="#Bedrock-Model-changedAttributes"></a>`changedAttributes()`

Returns an object containing all the attributes that have changed since the
last `"change"` event. This is basically just cloning the `changed` property.

### <a id="#Bedrock-Model-diff"></a>`diff(attributes)`

Compare a different set of `attributes` with the model's attributes and return
the difference. Also accepts another model in which case it uses the model's
attributes.

### <a id="#Bedrock-Model-previous"></a>`previous([attribute])`

Returns the value of `attribute` before the last `"change"` event.

### <a id="#Bedrock-Model-previousAttributes"></a>`previousAttributes()`

Returns all of the attributes that changed during the last `"change"` event.

### <a id="#Bedrock-Model-destroy"></a>`destroy([options])`

Triggers the `"destroy"` event on the model and in doing so removes itself
from any collections that contain the model. The `options` are passed along
with the `"destroy"` event. Finally, all event listeners are removed from the
model.

### <a id="#Bedrock-Model-clone"></a>`clone()`

Constructs a new instance of the model using the same attributes currently
on the model and returns that new instance.

## <a id="#Bedrock-Collection"></a>Bedrock.Collection

*Inherits [Bedrock.Events](#Bedrock-Events)*

*Inherits `forEach`, `each`, `map`, `collect`, `reduce`, `foldl`,
`inject`, `reduceRight`, `foldr`, `find`, `detect`, `filter`, `select`,
`reject`, `every`, `all`, `some`, `any`, `include`, `contains`, `invoke`,
`max`, `min`, `toArray`, `size`, `first`, `head`, `take`, `initial`, `rest`,
`tail`, `drop`, `last`, `without`, `difference`, `indexOf`, `shuffle`,
`lastIndexOf`, `isEmpty`, `chain`, `sample`,`reduceRight`, `forEachRight`,
`dropWhile`, `dropRight`, `dropRightWhile`, `takeRight`, `takeWhile`,
`takeRightWhile`, `partition` from [lodash](https://lodash.com) if each
function is available at runtime*

A unique group of related (possibly ordered) models.

### <a id="#Bedrock-Collection-move"></a>`move(models, at, options)`

Moves models within a collection; if any models don't exist in the collection,
they will be added. The event `"move" (collection, models, index)` fires for
the move and the index sent is the current index of the first model that was
moved.

NOTE: The `at` passed to `move` is relative to the state of the collection
_before_ `move` is called. Example:

    // If you want to move a to AFTER c (in other words, at index 3) you'd call coll.move(a, 3)
     0     2    4
     |     |    |
    [ a, b, c, d ]
        |     |
        1     3
    // The resulting array after the move will be
    [ b, c, a, d ]
    // Since a is now at index 2, the "move" event will fire with: (coll, [a], 2)

For any models that were added, an `add` event is fired. An `adds` event will
_not_ be fired unless nothing was actually moved, only added.
