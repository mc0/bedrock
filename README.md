bedrock
=======

A simplified, fast framework for Models, Views, Controllers and Events based off [Backbone.js](https://github.com/jashkenas/backbone)

# Differences from Backbone.js

`Sync` is removed. No `fetch`/`read`/`sync`/`isNew`/etc on models.

`Model.collection` will never exist.

Collection constructor accepts `mergeOnAdd` which can be used to overwrite the default merge option (false) for `add`. Models now have a
`merge` function so you can handle merges yourself. The default `merge` function just calls `set`.

Models do not have validation methods (`isValid`/`validate`). Use `parse` instead as a replacement.

Models with the `parse(attrs, options)` method overridden can edit/coerce/add attributes before they are initially set on the model. You should
be careful with modifying the `attrs` reference directly since that is the reference to the original object passed to the constructor. `parse`
needs to return the `attributes` that are going to be set on the model or false to indicate to a collection that the model is invalid. Returning
false will prevent it from being added to a collection and update the `valid` property (not attribute) on the model.

Collections can also have a `parse` method which can be used to reject "invalid" models from being added to a collection. Whenever
`add`/`push`/`set` is called on a collection, the collection's `parse` method will get called and it should return the "new" array that will be 
added/pushed/set on the collection.

`Model.unset` sets keys on `attributes` to undefined instead of deleting them.

Tabs (instead of spaces) are invalid syntax for the purposes of setting up events in `delegateEvents`

When a `destroy` event is emitted from a model member of a Collection, the collection that is sent in the arguments is the firing collection.

Collections accept `modelOptions` that gets passed along for every model created by that collection.

`Collection.move` now allows moving models around within a collection; if the models don't exist in the collection, then new models will be added.

When cloning on a collection, a custom `comparator` is NOT transferred over to the new collection. A custom `model` is, however.

`routes` and `defaults` cannot be functions.

Defining a `modelId` is not supported.

# Why?

Grooveshark needed a extremely lightweight framework for dealing with Models/Collections. It was acceptable to cut features and cut corners
in order to achieve extremely fast constructors.

# Who?

[Mark Caudill](https://github.com/mc0/)

[James Hartig](https://github.com/fastest963/)
