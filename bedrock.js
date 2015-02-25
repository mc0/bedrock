/**
 * Bedrock.js 0.8.3
 *
 * Bedrock.js is a foundation framework for large applications
 * by Mark Caudill and James Hartig.
 *
 * API originally based off Backbone.js 1.1.2
 * (c) 2010-2014 Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
 * Backbone may be freely distributed under the MIT license.
 *
 * Notable API differences in README.md
 *
 * Version relationships
 * Bedrock 0.7.x based off Backbone.js 1.1.2
 *
 */

// The root variable is a reference to the global object
// (`window` in the browser, `exports` on the server).
(function(root, factory) {

  // Initial Setup
  // -------------

  var rootContext = root,
      Bedrock, $, _, globalRef;

  // Called when we're ready to setup and export
  function ready(_, $, exports) {
    factory(rootContext, root, exports, _, $);
  }

  // Set up Bedrock appropriately for the environment. Start with AMD.
  if (typeof define === 'function' && define.amd) {
    // Export global even in AMD case in case this script is loaded with
    // others that may still expect a global Bedrock.
    define(['lodash', 'jquery', 'exports'], ready);
    return;
  }

  // For Bedrock's purposes, jQuery, Zepto, Ender, or jQuery-like library owns
  // the `$` variable.
  $ = root.jQuery || root.Zepto || root.ender || root.$;

  // For Node.js or CommonJS. jQuery may not be needed as a module.
  if (typeof exports !== 'undefined' && typeof module !== 'undefined') {
    // Require lodash if we're on the server and it's not already present.
    _ = require('lodash');
    Bedrock = exports;
    // The root in node.js may not be this context
    globalRef = exports && module && typeof global == 'object' && global;
    if (globalRef && (globalRef.global === globalRef || globalRef.window === globalRef || globalRef.self === globalRef)) {
      root = globalRef;
    }
    // Do not export on root
    rootContext = null;
    ready(_, $, Bedrock);
  } else {
    ready(root._, $, {});
  }

// We are making a safe reference to undefined
}(this, function(exportTo, root, Bedrock, _, $, undefined) {
  // Current version of the library.
  var VERSION = '0.8.2';

  // Create local references to array/object methods we'll want to use later.
  var Array = root.Array,
      arrayProto = Array.prototype,
      splice = arrayProto.splice,
      hasOwnProperty = {}.hasOwnProperty;

  // A noop function for doing nothing
  function noop() {}

  // Runs Bedrock.js in *noConflict* mode, returning the `Bedrock` variable
  // to its previous owner. Returns a reference to this Bedrock object.
  var noConflict = function() {
    if (!exportTo) {
      return noop;
    }
    // The previous value of the `Bedrock` variable
    var previousBedrock = exportTo.Bedrock;

    return function() {
      exportTo.Bedrock = previousBedrock;
      return Bedrock;
    }
  }();

  // Trim whitespace (simplified)
  var trim = function() {
    if (String.prototype.trim) {
      return function(string) {
        return String.prototype.trim.call(string);
      };
    }
    var trimRegex = /^[\s]+|[\s]+$/g;
    return function(string) {
      return string.replace(trimRegex, '');
    };
  }();

  // Events
  // -------------
  var uniqueLIDCount = 1;

  // Fix memory leak reported in https://github.com/jashkenas/backbone/issues/3453
  // Though their fix is probably better, its a lot larger to try and port right now
  function eventsLeftForContext(obj, ctx) {
    var keys = _.keys(obj._events),
      i = keys.length,
      n, j;
    while (i--) {
      n = keys[i];
      j = obj._events[n].length;
      while (j--) {
        if (obj._events[n][j].ctx === ctx) {
          return true;
        }
      }
    }
    return false;
  }

  // Space literal reference used to split event strings.
  var eventSplitter = ' ';

  // Implement fancy features of the Events API such as multiple event
  // names `"change blur"` and jQuery-style event maps `{change: action}`
  // in terms of the existing API.
  function eventsApi(obj, action, name, rest) {
    if (!name) return true;
    var keys, key, i, l;

    // Handle event maps.
    if (typeof name === 'object') {
      keys = _.keys(name);
      for (i = 0, l = keys.length; i < l; i++) {
        key = keys[i];
        obj[action].apply(obj, [key, name[key]].concat(rest));
      }
      return false;
    }

    // Handle space separated event names.
    if (name.indexOf(eventSplitter) != -1) {
      var names = name.split(eventSplitter);
      // Order matters for this for `trigger`
      for (i = 0, l = names.length; i < l; i++) {
        obj[action].apply(obj, [names[i]].concat(rest));
      }
      return false;
    }

    return true;
  }

  // Used for creating only-call-once functions
  function onceFactory(name, callback, cleanup) {
    var ran = false;
    function once() {
      if (ran) return;
      ran = true;
      cleanup(name, once);
      callback.apply(this, arguments);
    }
    once._callback = callback;
    return once;
  }

  // Optimized trigger handling function made to stay speedy
  function triggerApi(name, args) {
    if (!name) return;
    var events = this._events[name],
      allEvents = this._events.all;
    if (events) triggerEvents(events, args);
    if (allEvents) triggerEvents(allEvents, [name].concat(args));
  }

  // An optimized internal dispatch function for triggering events. Tries to
  // keep the usual cases speedy (most internal Bedrock events have 3 arguments).
  function triggerEvents(events, args) {
    var i = -1,
      l = events.length,
      argsLength = args.length,
      a1 = args[0],
      a2 = args[1],
      a3 = args[2],
      ev;
    if (argsLength == 0) {
      while (++i < l) {
        (ev = events[i]).callback.call(ev.ctx);
      }
    } else if (argsLength == 1) {
      while (++i < l) {
        (ev = events[i]).callback.call(ev.ctx, a1);
      }
    } else if (argsLength == 2) {
      while (++i < l) {
        (ev = events[i]).callback.call(ev.ctx, a1, a2);
      }
    } else if (argsLength == 3) {
      while (++i < l) {
        (ev = events[i]).callback.call(ev.ctx, a1, a2, a3);
      }
    } else {
      while (++i < l) {
        (ev = events[i]).callback.apply(ev.ctx, args);
      }
    }
  }

  // A module that can be mixed in to *any object* in order to provide it with
  // custom events. You may bind with `on` or remove with `off` callback
  // functions to an event; `trigger`-ing an event fires all callbacks in
  // succession.
  //
  //     var object = {};
  //     _.extend(object, Bedrock.Events);
  //     object.on('expand', function() { alert('expanded'); });
  //     object.trigger('expand');
  //
  var Events = {

    // Bind an event to a `callback` function. Passing `"all"` will bind
    // the callback to all events fired.
    on: function(name, callback, context) {
      if (!eventsApi(this, 'on', name, [callback, context])) return this;
      if (!callback) return this;
      this._events = this._events || {};
      var events = this._events[name] || (this._events[name] = []);
      events.push({callback: callback, context: context, ctx: context || this});
      return this;
    },

    // Bind an event to only be triggered a single time. After the first time
    // the callback is invoked, it will be removed.
    once: function(name, callback, context) {
      if (!eventsApi(this, 'once', name, [callback, context])) return this;
      if (!callback) return this;
      var once = onceFactory(name, callback, _.bind(this.off, this));
      return this.on(name, once, context);
    },

    // Remove one or many callbacks. If `context` is null, removes all
    // callbacks with that function. If `callback` is null, removes all
    // callbacks for the event. If `name` is null, removes all bound
    // callbacks for all events.
    off: function(name, callback, context) {
      var remaining, ev, events, names, i, j, k;
      if (!this._events) return this;
      if (!eventsApi(this, 'off', name, [callback, context])) return this;
      if (!name && !callback && !context) {
        this._events = void 0;
        return this;
      }

      names = name ? [name] : _.keys(this._events);
      i = names.length;
      while (i--) {
        name = names[i];
        if (events = this._events[name]) {
          remaining = [];
          if (callback || context) {
            // These events are guaranteed to be in order so use a `for`
            for (j = 0, k = events.length; j < k; j++) {
              ev = events[j];
              if ((callback && callback !== ev.callback && callback !== ev.callback._callback) ||
                  (context && context !== ev.context)) {
                remaining[remaining.length] = ev;
              }
            }
          }

          // Replace the events array if we have any left; otherwise clean up
          // the array on _events
          if (remaining.length) {
            this._events[name] = remaining;
          } else {
            delete this._events[name];
          }
        }
      }

      return this;
    },

    // Trigger one or many events, firing all bound callbacks. Callbacks are
    // passed the same arguments as `trigger` is, apart from the event name
    // (unless you're listening on `"all"`, which will cause your callback to
    // receive the true name of the event as the first argument).
    trigger: function(name) {
      if (!this._events) return this;
      // Ignore the name argument
      var length = Math.max(0, arguments.length - 1);
      var args = new Array(length);
      for (var i = 0; i < length; i++) args[i] = arguments[i + 1];
      if (!eventsApi(this, 'trigger', name, args)) return this;

      triggerApi.call(this, name, args);
      return this;
    },

    // Inversion-of-control versions of `on` and `once`. Tell *this* object to
    // listen to an event in another object ... keeping track of what it's
    // listening to.
    listenTo: function(obj, name, callback) {
      var listeningTo = this._listeningTo || (this._listeningTo = {});
      var id = obj._listenId || (obj._listenId = uniqueLIDCount++);
      listeningTo[id] = obj;
      if (!callback && typeof name === 'object') callback = this;
      obj.on(name, callback, this);
      return this;
    },

    listenToOnce: function(obj, name, callback) {
      if (typeof name === 'object') {
        // Cannot use eventsApi since we need to call it on this but send obj.
        var keys = _.keys(name),
            i = keys.length,
            event;
        while (i--) {
          event = keys[i];
          this.listenToOnce(obj, event, name[event]);
        }
        return this;
      }
      if (!callback) return this;
      var once = onceFactory(name, callback, _.bind(this.stopListening, this, obj));
      return this.listenTo(obj, name, once);
    },

    // Tell this object to stop listening to either specific events ... or
    // to every object it's currently listening to.
    stopListening: function(obj, name, callback) {
      var listeningTo = this._listeningTo;
      if (!listeningTo) return this;
      var remove = !name && !callback;
      if (!callback && typeof name === 'object') callback = this;
      if (obj) (listeningTo = {})[obj._listenId] = obj;
      var keys = _.keys(listeningTo),
          i = keys.length,
          id;
      while (i--) {
        id = keys[i];
        obj = listeningTo[id];
        obj.off(name, callback, this);
        if (remove || !eventsLeftForContext(obj, this)) {
          delete this._listeningTo[id];
        }
      }
      return this;
    },

    extend: function(object) {
      _.extend(object, Events);
      return object;
    }
  };

  // Allow the `Bedrock` object to serve as a global event bus, for folks who
  // want global "pubsub" in a convenient place.
  _.extend(Bedrock, Events);

  // Model
  // -------------
  var uniqueCIDCount = 1,
      unsetObject = {unset: true}; // A special object for unsetting in unset and clear

  // Bedrock **Models** are the basic data object in the framework --
  // frequently representing a row in a table in a database on your server.
  // A discrete chunk of data and a bunch of useful, related methods for
  // performing computations and transformations on that data.

  // Create a new model with the specified attributes. A client id (`cid`)
  // is automatically generated and assigned in the attributes.

  // Doesn't clone attributes parameter unless done so in parse.
  function Model(attributes, opts) {
    this.cid = 'c' + (uniqueCIDCount++);
    var options = opts || {},
        validAttrs = this.parse(attributes, options),
        attrs = validAttrs || {};

    if (validAttrs === false) {
      this.valid = false;
    }
    if (this.defaults) {
      attrs = _.defaults({}, attrs, this.defaults);
    }
    if (hasOwnProperty.call(attrs, this.idAttribute)) {
      this.id = attrs[this.idAttribute];
    }

    this.attributes = attrs;
    this._previousAttributes = null;
    this.changed = {};
    this.initialize.call(this, attrs, options);
  }

  // Attach all inheritable methods to the Model prototype.
  _.extend(Model.prototype, Events, {
    // The identifier for this model that usually derrived from `idAttribute`.
    id: undefined,

    // The default name for the JSON `id` attribute is `"id"`. MongoDB and
    // CouchDB users may want to set this to `"_id"`.
    idAttribute: 'id',

    // A hash of attributes whose current and previous value differ.
    changed: null,

    // If the parse method returned false then the model is not valid and
    // this would be set to false. It will not be added to a collection.
    valid: true,

    // Clone attributes by default. Override it with your own logic to clean
    // up and rename attributes.
    parse: function(attributes, options) {
      return (options && options.clone === false) ? attributes : _.clone(attributes);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: noop,

    // Return a copy of the model's `attributes` object.
    toJSON: function() {
      return _.clone(this.attributes);
    },

    // Get the value of an attribute.
    get: function(attr) {
      return this.attributes[attr];
    },

    // Get the HTML-escaped value of an attribute.
    escape: function(attr) {
      return _.escape(this.get(attr));
    },

    // Returns `true` if the attribute contains a value that is not null
    // or undefined.
    has: function(attr) {
      return this.get(attr) != null;
    },

    // Handle merges, which happen when a duplicate (new) model is added to a
    // collection. Default is to just call set.
    merge: function(newAttrs, opts) {
      return this.set(newAttrs, opts);
    },

    // Set a hash of model attributes on the object, firing `"change"`. This is
    // the core primitive operation of a model, updating the data and notifying
    // anyone who needs to know about the change in state. The heart of the beast.
    set: function(key, valOrOpts, opts) {
      var val, attr, attrs, unset, changes, silent, changing, prev, current,
          options, changed, attrDiffers;
      if (key == null || key === false) return this;

      // Fast-track for handling .unset and .clear
      unset = opts === unsetObject && (options = (valOrOpts || {}));

      // Handle both `"key", value` and `{key: value}` -style arguments.
      if (typeof key === 'object') {
        attrs = key;
        options = valOrOpts;
      } else {
        (attrs = {})[key] = valOrOpts;
      }

      options = options || opts || {};

      // Extract attributes and options.
      unset           = unset || options.unset;
      silent          = options.silent;
      changes         = [];
      changing        = this._changing;
      this._changing  = true;

      if (!changing) {
        this._previousAttributes = {};
        this.changed = {};
      }
      current = this.attributes;
      changed = this.changed;
      prev = this._previousAttributes;

      // For each `set` attribute, update or delete the current value.
      var keys = _.keys(attrs),
          attrPos = keys.length;
      while (attrPos--) {
        attr = keys[attrPos];
        if (!unset) val = attrs[attr];
        attrDiffers = !_.isEqual(current[attr], val);
        if (attrDiffers) {
          // Check for changes of `id`.
          if (attr === this.idAttribute) {
            this.id = val;
            // Always fire change:id before firing any other change events
            changes.unshift(attr);
          } else {
            changes.push(attr);
          }
        }
        if (changing && _.isEqual(prev[attr], val)) {
          delete changed[attr];
        } else if (attrDiffers) {
          changed[attr] = val;
        }
        if (!changing || !hasOwnProperty.call(prev, attr)) prev[attr] = current[attr];
        current[attr] = val;
      }

      // Trigger all relevant attribute changes.
      if (!silent && changes.length) {
        this._pending = options;
        for (var i = 0, l = changes.length; i < l; i++) {
          this.trigger('change:' + changes[i], this, current[changes[i]], options);
        }

        // The `while` loop combined with `this._changing` improves the changed object.
        // It addresses changes being recursively nested within `"change"` events.
        if (changing) return this;
        do {
          options = this._pending;
          this._pending = false;
          this.trigger('change', this, options);
        } while (this._pending);
      }
      if (!changing) {
        this._changing = false;
      }
      return this;
    },

    // Remove an attribute from the model, firing `"change"`. `unset` is a noop
    // if the attribute doesn't exist.
    unset: function(attr, options) {
      return this.set(attr, options, unsetObject);
    },

    // Clear all attributes on the model, firing `"change"`.
    clear: function(options) {
      return this.set(this.attributes, options, unsetObject);
    },

    // Determine if the model has changed since the last `"change"` event.
    // If you specify an attribute name, determine if that attribute has changed.
    hasChanged: function(attr) {
      if (attr == null) return !_.isEmpty(this.changed);
      return hasOwnProperty.call(this.changed, attr);
    },

    // Return an object containing all the attributes that have changed, or
    // false if there are no changed attributes. Useful for determining what
    // parts of a view need to be updated and/or what attributes need to be
    // persisted to the server. Unset attributes will be set to undefined.
    // You can also pass an attributes object to diff against the model,
    // determining if there *would be* a change.
    changedAttributes: function(diff) {
      if (!diff) return this.hasChanged() ? _.clone(this.changed) : false;
      var changed = false,
          changing = this._changing,
          old = this._previousAttributes,
          current = this.attributes,
          keys = _.keys(diff),
          i = keys.length,
          attr, val;
      while (i--) {
        attr = keys[i];
        val = diff[attr];
        if (changing && hasOwnProperty.call(old, attr) && _.isEqual(old[attr], val)) continue;
        if (_.isEqual(current[attr], val)) continue;
        (changed || (changed = {}))[attr] = val;
      }
      return changed;
    },

    // Get the previous value of an attribute, recorded at the time the last
    // `"change"` event was fired.
    previous: function(attr) {
      if (attr == null || this._previousAttributes == null) return null;
      // If it wasn't changed in the last set, then we can just return the current.
      return hasOwnProperty.call(this._previousAttributes, attr) ?
        this._previousAttributes[attr] : this.attributes[attr];
    },

    // Get all of the attributes of the model at the time of the previous
    // `"change"` event.
    previousAttributes: function() {
      if (this._previousAttributes == null) return {};
      return _.extend({}, this.attributes, this._previousAttributes);
    },

    // Destroy this model by removing listeners and triggering an event.
    // Removes the model from any collections its in.
    destroy: function(opts) {
      var options = opts ? _.clone(opts) : {};
      this.trigger('destroy', this, undefined, options);
      this.off();
    },

    // Create a new model with identical attributes to this one.
    clone: function() {
      return new this.constructor(this.attributes);
    }

  });

  // lodash methods that we want to implement on the Model.
  var modelMethods = [
    'keys', 'values', 'pairs',
    'invert', 'pick', 'omit',
    'result'
  ];

  // Mix in each lodash method as a proxy to `Model#attributes`.
  _.each(modelMethods, function(method) {
    // Remove any unsupported methods for custom lodash builds
    if (!_[method]) {
      return;
    }

    Model.prototype[method] = function() {
      var args = new Array(arguments.length + 1);
      args[0] = this.attributes;
      // We added attributes to args so add one to args index
      for (var i = 0; i < arguments.length; i++) args[i + 1] = arguments[i];
      return _[method].apply(_, args);
    };
  });

  // Collection
  // -------------
  // Default options for `Collection#set`.
  var setOptions = {add: true, remove: true, merge: true},
      addOptions = {add: true, remove: false},
      moveOptions = {add: true, remove: false, move: true};

  // For use in `Collection#toJSON`
  function collectionToJSON(model) {
    return model.toJSON(this);
  }

  // For use in `Collection#set`
  function collectionFireAddEvents(coll, toAdd, at, addOpts) {
    for (var i = 0, l = toAdd.length; i < l; i++) {
      if (at != null) addOpts.index = at + i;
      toAdd[i].trigger('add', toAdd[i], coll, addOpts);
    }
  }

  function collectionAddAndOrder(toAdd, at, order) {
    var i, l, orderedModels, initial;
    if (at != null && at < this.length) {
      // Splice.apply could hit args limit.
      l = toAdd.length;
      if (l > 5000) {
        initial = new Array(2);
        initial[0] = at;
        initial[1] = 0;
        for (i = 0; i < l; i += 5000) {
          initial = at + i;
          splice.apply(this.models, initial.concat(toAdd.slice(i, i + 5000)));
        }
      } else {
        splice.apply(this.models, [at, 0].concat(toAdd));
      }
    } else {
      if (order) {
        this.models.length = 0;
      }
      orderedModels = order || toAdd;
      for (i = 0, l = orderedModels.length; i < l; i++) {
        this.models.push(orderedModels[i]);
      }
    }
  }

  // If models tend to represent a single row of data, a Bedrock Collection is
  // more analagous to a table full of data ... or a small slice or page of that
  // table, or a collection of rows that belong together for a particular reason
  // -- all of the messages in this particular folder, all of the documents
  // belonging to this particular author, and so on. Collections maintain
  // indexes of their models, both in order, and for lookup by `id`.

  // Create a new **Collection**, perhaps to contain a specific type of `model`.
  // If a `comparator` is specified, the Collection will maintain
  // its models in sort order, as they're added and removed.
  function Collection(models, opts) {
    var options = opts || {},
        model = options.model,
        comparator = options.comparator,
        modelOptions = options.modelOptions;

    if (model) {
      this.model = model;
    }
    if (comparator !== undefined) {
      this.comparator = comparator;
    }
    if (modelOptions !== undefined) {
      this._modelOptions = modelOptions;
    }

    if (models) {
      this.reset(models, _.extend({silent: true}, options));
    } else {
      this.models = [];
      this._byId  = {};
    }

    if (options.mergeOnAdd !== undefined) this.mergeOnAdd = !!options.mergeOnAdd;
    this.initialize(models, options);
  }

  // Define the Collection's inheritable methods.
  _.extend(Collection.prototype, Events, {

    // The default model for a collection is just a **Model**.
    model: Model,

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: noop,

    // There are no models initially so we have a length of 0
    length: 0,

    // Should we default to merging when add() is called
    mergeOnAdd: false,

    // The JSON representation of a Collection is an array of the
    // models' attributes.
    toJSON: function(options) {
      return this.map(collectionToJSON, options);
    },

    // Add a model, or list of models to the set.
    add: function(models, options) {
      return this.set(models, _.extend({merge: this.mergeOnAdd}, options, addOptions));
    },

    // Remove a model, or a list of models from the set.
    remove: function(m, opts) {
      var singular = !_.isArray(m),
          models = singular ? [m] : _.clone(m),
          options = opts || {},
          i, j, l, index, model;
      // In order to fire removes we're going to rewrite models
      // as we go and j is going to keep our position. If a model
      // is invalid and not actually removed, it won't be written.
      j = 0;
      for (i = 0, l = models.length; i < l; i++) {
        model = models[i] = this.get(models[i]);
        if (!model) continue;
        delete this._byId[model.id];
        delete this._byId[model.cid];
        index = this.indexOf(model);
        this.models.splice(index, 1);
        this.length--;
        if (!options.silent) {
          options.index = index;
          model.trigger('remove', model, this, options);
        }
        models[j++] = model;
        this._removeReference(model);
      }
      // We only need to slice if models array should be smaller, which is
      // caused by some models not actually getting removed.
      if (models.length !== j) models = models.slice(0, j);
      if (!options.silent && j > 0) {
        this.trigger('removes', this, models, options);
      }
      return singular ? models[0]: models;
    },

    // Update a collection by `set`-ing a new list of models, adding new ones,
    // removing models that are no longer present, and merging models that
    // already exist in the collection, as necessary. Similar to **Model#set**,
    // the core operation for updating the data contained by the collection.
    set: function(m, opts) {
      var options = _.defaults({}, opts, setOptions),
          at = options.at;

      if (at < 0) at += this.length + 1;

      var singular = !_.isArray(m),
          models = this.parse(singular ? (m ? [m] : []) : m, options),
          modelsLen = models.length,
          newModels = singular ? models : new models.constructor(modelsLen),
          firstModelAt = at,
          sortable = this.comparator && (at == null) && options.sort !== false,
          sortAttr = _.isString(this.comparator) ? this.comparator : null,
          sort = false,
          order = !sortable && options.add && options.remove ? [] : false,
          orderChanged = false,
          didMove = false,
          toAdd = [],
          toRemove = [],
          modelMap = {},
          addOpts = at != null ? _.clone(options) : options,
          i, l, model, existing, attrs, modelOptions, index, numToAdd;


      // Turn bare objects into model references, and prevent invalid models
      // from being added.
      for (i = 0, l = modelsLen; i < l; i++) {
        attrs = models[i] || {};
        if (attrs instanceof Model) {
          model = attrs;
        }

        // Build new modelOptions each time since parse() might modify reference.
        modelOptions = _.extend({}, this._modelOptions, options);

        // If a duplicate is found, prevent it from being added and
        // optionally merge it into the existing model.
        existing = this.get(attrs);
        if (!existing) {
           attrs = model = this._prepareModel(attrs, modelOptions);
           if (model && model.valid) {
             existing = this.get(model);
           }
        }
        if (existing) {
          if (options.remove) modelMap[existing.cid] = true;
          if (options.move) {
            index = this.indexOf(existing);
            // If we removed something before at, the first model is moving back, otherwise
            // we need to increase at to the next index to skip over the model we just added.
            if (index < at) {
              firstModelAt--;
              at--;
            }
            splice.apply(this.models, [at, 0].concat(toAdd, this.models.splice(index, 1)));
            didMove = true;
            numToAdd = toAdd.length;
            at += numToAdd + 1;
            this.length += numToAdd;
            if (!options.silent) collectionFireAddEvents(this, toAdd, at, addOpts);
            toAdd.length = 0;
          }
          if (options.merge && attrs !== existing) {
            // If they sent a model then pick the arguments off it.
            if (attrs === model) {
              attrs = model.attributes;
            } else {
              attrs = this.model.prototype.parse(attrs, modelOptions);
            }
            existing.merge(attrs, modelOptions);
            if (sortable && !sort && existing.hasChanged(sortAttr)) sort = true;
          }
          newModels[i] = existing;

        // If this is a new, valid model, push it to the `toAdd` list.
        } else if (options.add) {
          newModels[i] = model;
          if (!model || !model.valid) continue;
          toAdd.push(model);
          this._addReference(model);
        }

        // Do not add multiple models with the same `id`.
        model = existing || model;
        if (!model) continue;
        if (order && !modelMap[model.id]) {
          order.push(model);

          // Check to see if this is actually a new model at this index.
          orderChanged = orderChanged || !this.models[i] || model.cid !== this.models[i].cid;
        }
        // If a model doesn't have an id don't store it in modelMap
        if (model.id != null) modelMap[model.id] = true;
      }

      // Remove nonexistent models if appropriate.
      if (options.remove) {
        for (i = 0, l = this.length; i < l; ++i) {
          if (!modelMap[(model = this.models[i]).cid]) toRemove.push(model);
        }
        if (toRemove.length) this.remove(toRemove, options);
      }

      // See if sorting is needed, update `length` and splice in new models.
      numToAdd = toAdd.length;
      if (numToAdd || orderChanged) {
        if (sortable) sort = true;
        collectionAddAndOrder.call(this, toAdd, at, order);
        this.length += numToAdd;
      }

      // Silently sort the collection if appropriate.
      if (sort) this.sort({silent: true});

      if (!options.silent) {
        // Trigger `add` events.
        collectionFireAddEvents(this, toAdd, at, addOpts);

        // Trigger `sort` event or `adds` event.
        if (options.move && didMove) {
          this.trigger('move', this, this.models.slice(firstModelAt, at + numToAdd), firstModelAt, options);
        } else if (numToAdd > 0) {
          if (at != null) addOpts.index = at;
          this.trigger('adds', this, toAdd, addOpts);
        }

        // Trigger `sort` if the collection was sorted.
        if (sort || orderChanged) this.trigger('sort', this, options);
      }
      return singular ? newModels[0] : newModels;
    },

    // When you have more items than you want to add or remove individually,
    // you can reset the entire set with a new list of models, without firing
    // any granular `add` or `remove` events. Fires `reset` when finished.
    // Useful for bulk operations and optimizations.
    reset: function(resetModels, opts) {
      var options = _.extend({}, opts),
        i = this.length;
      while (i--) {
        this._removeReference(this.models[i]);
      }
      options.previousModels = this.models;
      this.length = 0;
      this.models = [];
      this._byId  = {};
      var models = this.add(resetModels, _.extend({silent: true}, options));
      if (!options.silent) {
        this.trigger('reset', this, options);
      }
      return models;
    },

    // Add a model to the end of the collection.
    push: function(model, options) {
      return this.add(model, _.extend({at: this.length}, options));
    },

    // Remove a model from the end of the collection.
    pop: function(options) {
      var model = this.models[this.length - 1];
      this.remove(model, options);
      return model;
    },

    // Add a model to the beginning of the collection.
    unshift: function(model, options) {
      return this.add(model, _.extend({at: 0}, options));
    },

    // Remove a model from the beginning of the collection.
    shift: function(options) {
      var model = this.models[0];
      this.remove(model, options);
      return model;
    },

    // Slice out a sub-array of models from the collection.
    slice: function(begin, end) {
      return this.models.slice(begin, end);
    },

    // Get a model from the set by id.
    get: function(obj) {
      if (obj == null) return void 0;
      if (typeof obj !== 'object') return this._byId[obj];
      var idProp = this.model.prototype.idAttribute;
      var id = obj[idProp] != null ? obj[idProp] : obj.id;
      return this._byId[id] || this._byId[obj.cid];
    },

    // Get the model at the given index.
    at: function(index) {
      if (index < 0) {
        return this.models[index + this.length];
      }
      return this.models[index];
    },

    // Move provided models to index.
    // `move` event fires with models moved and index of first moved model. Event may
    // include ones that were not previously in the collection.
    // `add` event fires for any models that were not previously in the collection.
    move: function(models, index, options) {
      return this.set(models, _.extend({at: index, merge: this.mergeOnAdd}, options, moveOptions));
    },

    // Return models with matching attributes. Useful for simple cases of
    // `filter`.
    where: function(attrs, first) {
      if (_.isEmpty(attrs)) return first ? void 0 : [];
      var keys = _.keys(attrs);
      return this[first ? 'find' : 'filter'](function(model) {
        var i = keys.length,
            key;
        while (i--) {
          key = keys[i];
          if (attrs[key] !== model.get(key)) {
            return false;
          }
        }
        return true;
      });
    },

    // Return the first model with matching attributes. Useful for simple cases
    // of `find`.
    findWhere: function(attrs) {
      return this.where(attrs, true);
    },

    // Force the collection to re-sort itself. You don't need to call this under
    // normal circumstances, as the set will maintain sort order as each item
    // is added.
    sort: function(options) {
      if (options && options.comparator) {
        this.comparator = options.comparator;
      }
      if (!this.comparator) return this;

      // Run sort based on type of `comparator`.
      if (_.isString(this.comparator) || this.comparator.length === 1) {
        this.models = this.sortBy(this.comparator, this);
      } else {
        this.models.sort(_.bind(this.comparator, this));
      }

      if (!options || !options.silent) this.trigger('sort', this, options);
      return this;
    },

    // Figure out the smallest index at which a model should be inserted so as
    // to maintain order.
    sortedIndex: function(model, val, context) {
      var value = val || this.comparator;
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _.sortedIndex(this.models, model, iterator, context);
    },

    // Pluck an attribute from each model in the collection.
    pluck: function(attr) {
      var models = this.models;
      var attrs = [];
      for (var i = 0, l = models.length; i < l; i++) {
          attrs.push(models[i].get(attr));
      }
      return attrs;
    },

    // Create a new instance of a model in this collection. Add the model to the
    // collection immediately.
    create: function(modelData, opts) {
      var options = _.extend({}, this._modelOptions, opts);
      var success = options.success;
      var model = this._prepareModel(modelData, options);
      if (!model) return false;
      this.add(model, options);
      if (success) success(model, null, options);
      return model;
    },

    // **parse** converts a response into a list of models to be added to the
    // collection. The default implementation is just to pass it through.
    // You do NOT have to check a models' valid property; that happens automatically.
    parse: function(resp, options) {
      return resp;
    },

    // Create a new collection with an identical list of models as this one.
    // Doesn't keep the comparator.
    clone: function(opts) {
      var options = _.extend({modelOptions: this._modelOptions, model: this.model}, opts);
      return new this.constructor(this.models, options);
    },

    // Prepare a hash of attributes (or other model) to be added to this
    // collection.
    _prepareModel: function(attrs, opts) {
      if (attrs instanceof Model) return attrs;
      return new this.model(attrs, opts || {});
    },

    // Internal method to create a model's ties to a collection.
    _addReference: function(model) {
      this._byId[model.cid] = model;
      if (model.id != null) this._byId[model.id] = model;
      model.on('all', this._onModelEvent, this);
    },

    // Internal method to sever a model's ties to a collection.
    _removeReference: function(model) {
      model.off('all', this._onModelEvent, this);
    },

    // Internal method called every time a model in the set fires an event.
    // Sets need to update their indexes when models change ids. All other
    // events simply proxy through. "add" and "remove" events that originate
    // in other collections are ignored.
    _onModelEvent: function(event, model, coll, options) {
      if ((event === 'add' || event === 'remove') && coll !== this) return;
      var collection = coll;
      if (event === 'destroy') {
        this.remove(model, options);
        collection = this;
      }
      if (model && event === 'change:' + model.idAttribute) {
        delete this._byId[model.previous(model.idAttribute)];
        if (model.id != null) this._byId[model.id] = model;
      }
      this.trigger(event, model, collection, options);
    }

  });

  // lodash methods that we want to implement on the Collection.
  // 90% of the core usefulness of Bedrock Collections is actually implemented
  // right here:
  var methods = ['forEach', 'each', 'map', 'collect', 'reduce', 'foldl',
    'inject', 'reduceRight', 'foldr', 'find', 'detect', 'filter', 'select',
    'reject', 'every', 'all', 'some', 'any', 'include', 'contains', 'invoke',
    'max', 'min', 'toArray', 'size', 'first', 'head', 'take', 'initial', 'rest',
    'tail', 'drop', 'last', 'without', 'difference', 'indexOf', 'shuffle',
    'lastIndexOf', 'isEmpty', 'chain', 'sample','reduceRight', 'forEachRight',
    'dropWhile', 'dropRight', 'dropRightWhile', 'takeRight', 'takeWhile',
    'takeRightWhile', 'partition'];

  // Mix in each lodash method as a proxy to `Collection#models`.
  _.each(methods, function(method) {
    // Remove any unsupported methods for custom lodash builds
    if (!_[method]) {
      return;
    }

    Collection.prototype[method] = function() {
      var args = new Array(arguments.length + 1);
      args[0] = this.models;
      // We added models to args so add one to args index
      for (var i = 0; i < arguments.length; i++) args[i + 1] = arguments[i];
      return _[method].apply(_, args);
    };
  });

  // lodash methods that take a property name as an argument.
  var attributeMethods = [
    'groupBy', 'countBy', 'sortBy', 'indexBy', 'sortByAll'
  ];

  // Use attributes instead of properties.
  _.each(attributeMethods, function(method) {
    // Remove any unsupported methods for custom lodash builds
    if (!_[method]) {
      return;
    }

    Collection.prototype[method] = function(value, context) {
      var iterator = _.isFunction(value) ? value : function(model) {
        return model.get(value);
      };
      return _[method](this.models, iterator, context);
    };
  });

  // View
  // -------------
  var uniqueViewIDCount = 1,
      viewOptions = [
        'model', 'collection', 'el', 'id', 'attributes', 'className',
        'tagName', 'events'
      ];

  // Bedrock Views are almost more convention than they are actual code. A View
  // is simply a JavaScript object that represents a logical chunk of UI in the
  // DOM. This might be a single item, an entire list, a sidebar or panel, or
  // even the surrounding frame which wraps your whole app. Defining a chunk of
  // UI as a **View** allows you to define your DOM events declaratively, without
  // having to worry about render order ... and makes it easy for the view to
  // react to specific changes in the state of your models.

  // Creating a `View` creates its initial element outside of the DOM,
  // if an existing element is not provided...
  function View(opts) {
    this.cid = 'view' + (uniqueViewIDCount++);

    var options = opts || {};
    if (this.options) {
      options = _.extend({}, this.options, options);
    }
    _.extend(this, _.pick(options, viewOptions));

    this.options = options;
    var el;
    if (!this.el) {
      el = this._createElement();
    }
    this.setElement(el || this.el, false);
    this.initialize(options);
    this.delegateEvents();
  }

  // Set up all inheritable **View** properties and methods.
  _.extend(View.prototype, Events, {

    // The default `tagName` of a View's element is `"div"`.
    tagName: 'div',

    // jQuery delegate for element lookup, scoped to DOM elements within the
    // current view. This should be preferred over global DOM searches
    // whenever possible.
    $: function(selector) {
      return this.$el.find(selector);
    },

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: noop,

    // **render** is the core function that your view should override, in order
    // to populate its element (`this.el`), with the appropriate HTML. The
    // convention is for **render** to always return `this`.
    render: function() {
      return this;
    },

    // Remove this view by taking the element out of the DOM, and removing any
    // applicable event listeners.
    remove: function() {
      this.$el.remove();
      this.stopListening();
      return this;
    },

    // Change the view's element (`this.el` property), including event
    // re-delegation.
    setElement: function(element, delegate) {
      if (this.$el) this.undelegateEvents();
      this.$el = element instanceof Bedrock.$ ? element : Bedrock.$(element);
      this.el = this.$el[0];
      if (delegate !== false) this.delegateEvents();
      return this;
    },

    // Set callbacks, where `this.events` is a hash of
    //
    // *{"event selector": "callback"}*
    //
    //     {
    //       'mousedown .title':  'edit',
    //       'click .button':     'save',
    //       'click .open':       function(e) { ... }
    //     }
    //
    // pairs. Callbacks will be bound to the view, with `this` set properly.
    // Uses event delegation for efficiency.
    // Omitting the selector binds the event to `this.el`.
    // This only works for delegate-able events: not `focus`, `blur`, and
    // not `change`, `submit`, and `reset` in Internet Explorer.
    delegateEvents: function(events) {
      if (!(events || (events = this.events))) return this;
      var keys = _.keys(events),
          i = keys.length,
          method, key, pos, curPos, eventName, selector;
      this.undelegateEvents();
      while(i--) {
        key = keys[i];
        if (hasOwnProperty.call(events, key)) {
          method = events[key];
          if (!_.isFunction(method)) method = this[events[key]];
          if (!method) continue;

          // Find where to split the string into eventName and selector
          // then trim the selector.
          pos = 0;
          eventName = '';
          selector = '';
          while (pos < key.length) {
            curPos = key.indexOf(' ', pos);
            if (curPos == -1 && pos == 0) {
              eventName = key;
              break;
            }
            if (curPos - pos > 1) {
              eventName = eventName || key.substring(pos, curPos);
              selector = trim(key.substring(curPos + 1));
              break;
            }
            pos = curPos + 1;
          }

          eventName = (eventName || key) + '.delegateEvents' + this.cid;
          method = _.bind(method, this);
          if (selector === '') {
            this.$el.on(eventName, method);
          } else {
            this.$el.on(eventName, selector, method);
          }
        }
      }
      return this;
    },

    // Clears all callbacks previously bound to the view with `delegateEvents`.
    // You usually don't need to use this, but may wish to if you have multiple
    // Bedrock views attached to the same DOM element.
    undelegateEvents: function() {
      this.$el.off('.delegateEvents' + this.cid);
      return this;
    },

    // Create a DOM element on the View to render into from the `id`,
    // `className` and `tagName` properties.
    _createElement: function() {
      var attrs = this.attributes,
          $el = Bedrock.$('<' + this.tagName + '>');
      if (this.className || this.id) {
        attrs = _.defaults({'class': this.className, 'id': this.id}, attrs);
      }
      if (attrs) {
          $el.attr(attrs);
      }
      return $el[0];
    }

  });

  // Router
  // -------------
  // Cached regular expressions for matching named param parts and splatted
  // parts of route strings.
  var optionalParam = /\((.*?)\)/g,
      namedParam    = /(\(\?)?:\w+/g,
      splatParam    = /\*\w+/g,
      escapeRegExp  = /[\-{}\[\]+?.,\\\^$|#\s]/g;

  function namedOptionalSwap(match, optional) {
    return optional ? match : '([^/?]+)';
  }

  // Routers map dispatcher URLs to actions, and fire events when routes are
  // matched. Creating a new one sets its `routes` hash, if not set statically.
  function Router(opts) {
    if (opts && opts.routes) this.routes = opts.routes;
    this._bindRoutes();
    this.initialize.apply(this, arguments);
  }

  // Set up all inheritable **Router** properties and methods.
  _.extend(Router.prototype, Events, {

    // Initialize is an empty function by default. Override it with your own
    // initialization logic.
    initialize: noop,

    // Manually bind a single named route to a callback. For example:
    //
    //     this.route('search/:query/p:num', 'search', function(query, num) {
    //       ...
    //     });
    //
    route: function(route, name, callback) {
      if (!_.isRegExp(route)) route = this._routeToRegExp(route);
      if (_.isFunction(name)) {
        callback = name;
        name = '';
      }
      if (!callback) callback = this[name];
      var router = this;
      Bedrock.history.route(route, function(fragment) {
        var args = router._extractParameters(route, fragment);
        if (router.execute(callback, args) !== false) {
          router.trigger.apply(router, ['route:' + name].concat(args));
          router.trigger('route', name, args);
          Bedrock.history.trigger('route', router, name, args);
        }
      });
      return this;
    },

    // Execute a route handler with the provided parameters.  This is an
    // excellent place to do pre-route setup or post-route cleanup.
    execute: function(callback, args) {
      if (callback) {
        callback.apply(this, args);
      }
    },

    // Simple proxy to `Bedrock.history` to save a fragment into the history.
    navigate: function(fragment, options) {
      Bedrock.history.navigate(fragment, options);
      return this;
    },

    // Bind all defined routes to `Bedrock.history`. We have to reverse the
    // order of the routes here to support behavior where the most general
    // routes can be defined at the bottom of the route map.
    _bindRoutes: function() {
      if (!this.routes) return;
      var route, routes = _.keys(this.routes);
      while ((route = routes.pop()) != null) {
        this.route(route, this.routes[route]);
      }
    },

    // Convert a route string into a regular expression, suitable for matching
    // against the current location hash.
    _routeToRegExp: function(route) {
      var routeMatch = route.replace(escapeRegExp, '\\$&')
        .replace(optionalParam, '(?:$1)?')
        .replace(namedParam, namedOptionalSwap)
        .replace(splatParam, '([^?]*?)');
      return new RegExp('^' + routeMatch + '(?:\\?([\\s\\S]*))?$');
    },

    // Given a route, and a URL fragment that it matches, return the array of
    // extracted decoded parameters. Empty or unmatched parameters will be
    // treated as `null` to normalize cross-browser behavior.
    _extractParameters: function(route, fragment) {
      var params = route.exec(fragment).slice(1);
      return _.map(params, function(param, i) {
        // Don't decode the search params.
        if (i === params.length - 1) return param || null;
        return param ? decodeURIComponent(param) : null;
      });
    }

  });

  // History
  // -------------
  // Cached regex for stripping a leading hash/slash and trailing space.
  var routeStripper = /^[#\/]|\s+$/g;

  // Cached regex for stripping leading and trailing slashes.
  var rootStripper = /^\/+|\/+$/g;

  // Cached regex for detecting MSIE.
  var isExplorer = /msie [\w.]+/;

  // Cached regex for removing a trailing slash.
  var trailingSlash = /\/$/;

  // Cached regex for stripping urls of hash.
  var pathStripper = /#.*$/;

  // Handles cross-browser history management, based on either
  // [pushState](http://diveintohtml5.info/history.html) and real URLs, or
  // [onhashchange](https://developer.mozilla.org/en-US/docs/DOM/window.onhashchange)
  // and URL fragments. If the browser supports neither (old IE, natch),
  // falls back to polling.
  function History() {
    this.handlers = [];
    _.bindAll(this, 'checkUrl');

    // Ensure that `History` can be used outside of the browser.
    if (typeof window !== 'undefined') {
      this.location = window.location;
      this.history = window.history;
    }
  }

  // Has the history handling already been started?
  History.started = false;

  // Set up all inheritable **History** properties and methods.
  _.extend(History.prototype, Events, {

    // The default interval to poll for hash changes if necessary. Defaults
    // to 20 times per second (50ms).
    interval: 50,

    // Are we at the app root?
    atRoot: function() {
      return this.location.pathname.replace(/[^\/]$/, '$&/') === this.root;
    },

    // Gets the true hash value. Cannot use location.hash directly due to bug
    // in Firefox where location.hash will always be decoded.
    getHash: function(window) {
      var match = (window || this).location.href.match(/#(.*)$/);
      return match ? match[1] : '';
    },

    // Get the cross-browser normalized URL fragment, either from the URL,
    // the hash, or the override.
    getFragment: function(fragment, forcePushState) {
      if (fragment == null) {
        if (this._hasPushState || !this._wantsHashChange || forcePushState) {
          fragment = decodeURI(this.location.pathname + this.location.search);
          var root = this.root.replace(trailingSlash, '');
          if (!fragment.indexOf(root)) fragment = fragment.slice(root.length);
        } else {
          fragment = this.getHash();
        }
      }
      return fragment.replace(routeStripper, '');
    },

    // Start the hash change handling, returning `true` if the current URL matches
    // an existing route, and `false` otherwise.
    start: function(options) {
      if (History.started) throw new Error("Bedrock.history has already been started");
      History.started = true;

      // Figure out the initial configuration. Do we need an iframe?
      // Is pushState desired ... is it available?
      var fragment = this.getFragment(),
          docMode = document.documentMode,
          oldIE = (isExplorer.exec(navigator.userAgent.toLowerCase()) && (!docMode || docMode <= 7)),
          loc = this.location;
      this.options = _.extend({root: '/'}, this.options, options);
      this.root = this.options.root;
      this._wantsHashChange = this.options.hashChange !== false;
      this._wantsPushState = !!this.options.pushState;
      this._hasPushState = !!(this.options.pushState && this.history && this.history.pushState);

      // Normalize root to always include a leading and trailing slash.
      this.root = ('/' + this.root + '/').replace(rootStripper, '/');

      // Determine if we need to change the base url, for a pushState link
      // opened by a non-pushState browser.
      this.fragment = fragment;

      if (oldIE && this._wantsHashChange) {
        var frame = Bedrock.$('<iframe src="javascript:0" tabindex="-1">');
        this.iframe = frame.hide().appendTo('body')[0].contentWindow;
        this.navigate(fragment);
      }

      // Depending on whether we're using pushState or hashes, and whether
      // 'onhashchange' is supported, determine how we check the URL state.
      if (this._hasPushState) {
        Bedrock.$(window).on('popstate', this.checkUrl);
      } else if (this._wantsHashChange && ('onhashchange' in window) && !oldIE) {
        Bedrock.$(window).on('hashchange', this.checkUrl);
      } else if (this._wantsHashChange) {
        this._checkUrlInterval = setInterval(this.checkUrl, this.interval);
      }

      // Transition from hashChange to pushState or vice versa if both are
      // requested.
      if (this._wantsHashChange && this._wantsPushState) {

        // If we've started off with a route from a `pushState`-enabled
        // browser, but we're currently in a browser that doesn't support it...
        if (!this._hasPushState && !this.atRoot()) {
          this.fragment = this.getFragment(null, true);
          this.location.replace(this.root + '#' + this.fragment);
          // Return immediately as browser will do redirect to new url
          return true;

        // Or if we've started out with a hash-based route, but we're currently
        // in a browser where it could be `pushState`-based instead...
        } else if (this._hasPushState && this.atRoot() && loc.hash) {
          this.fragment = this.getHash().replace(routeStripper, '');
          this.history.replaceState({}, document.title, this.root + this.fragment);
        }

      }

      if (this.options.silent) {
        return;
      }

      return this.loadUrl();
    },

    // Disable Bedrock.history, perhaps temporarily. Not useful in a real app,
    // but possibly useful for unit testing Routers.
    stop: function() {
      Bedrock.$(window).off('popstate', this.checkUrl).off('hashchange', this.checkUrl);
      // Some environments will throw when clearing an undefined interval.
      if (this._checkUrlInterval) {
        clearInterval(this._checkUrlInterval);
      }
      History.started = false;
    },

    // Add a route to be tested when the fragment changes. Routes added later
    // may override previous routes.
    route: function(route, callback) {
      this.handlers.unshift({route: route, callback: callback});
    },

    // Checks the current URL to see if it has changed, and if it has,
    // calls `loadUrl`, normalizing across the hidden iframe.
    checkUrl: function(e) {
      var current = this.getFragment();
      if (current === this.fragment && this.iframe) {
        current = this.getFragment(this.getHash(this.iframe));
      }

      if (current === this.fragment) {
        return false;
      }

      if (this.iframe) {
        this.navigate(current);
      }
      this.loadUrl();
    },

    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.getFragment(fragmentOverride);
      this.fragment = fragment;
      return _.any(this.handlers, function(handler) {
        if (handler.route.test(fragment)) {
          handler.callback(fragment);
          return true;
        }
      });
    },

    // Save a fragment into the hash history, or replace the URL state if the
    // 'replace' option is passed. You are responsible for properly URL-encoding
    // the fragment in advance.
    //
    // The options object can contain `trigger: true` if you wish to have the
    // route callback be fired (not usually desirable), or `replace: true`, if
    // you wish to modify the current URL without adding an entry to the history.
    navigate: function(frag, options) {
      if (!History.started) return false;
      if (!options || options === true) options = {trigger: !!options};

      var fragment = this.getFragment(frag || ''),
          url = this.root + fragment;

      // Strip the hash for matching.
      fragment = fragment.replace(pathStripper, '');

      if (this.fragment === fragment) return;
      this.fragment = fragment;

      // Don't include a trailing slash on the root.
      if (fragment === '' && url !== '/') url = url.slice(0, -1);

      // If pushState is available, we use it to set the fragment as a real URL.
      if (this._hasPushState) {
        this.history[options.replace ? 'replaceState' : 'pushState']({}, document.title, url);

      // If hash changes haven't been explicitly disabled, update the hash
      // fragment to store history.
      } else if (this._wantsHashChange) {
        this._updateHash(this.location, fragment, options.replace);
        if (this.iframe && (fragment !== this.getFragment(this.getHash(this.iframe)))) {
          // Opening and closing the iframe tricks IE7 and earlier to push a
          // history entry on hash-tag change.  When replace is true, we don't
          // want this.
          if(!options.replace) this.iframe.document.open().close();
          this._updateHash(this.iframe.location, fragment, options.replace);
        }

      // If you've told us that you explicitly don't want fallback hashchange-
      // based history, then `navigate` becomes a page refresh.
      } else {
        return this.location.assign(url);
      }
      if (options.trigger) this.loadUrl(fragment);
    },

    // Update the hash location, either replacing the current entry, or adding
    // a new one to the browser history.
    _updateHash: function(location, fragment, replace) {
      if (replace) {
        var href = location.href.replace(/(javascript:|#).*$/, '');
        location.replace(href + '#' + fragment);
      } else {
        // Some browsers require that `hash` contains a leading #.
        location.hash = '#' + fragment;
      }
    }

  });

  // Helpers
  // -------
  var objCreate = function() {
    function TempParentObj() {}

    return Object.create || function(protoObj) {
      TempParentObj.prototype = protoObj;
      return new TempParentObj();
    };
  }();

  // Helper function to correctly set up the prototype chain, for subclasses.
  // Similar to `goog.inherits`, but uses a hash of prototype properties and
  // class properties to be extended.
  function extend(prototypeProps, staticProps) {
    var parent = this,
        child;

    // The constructor function for the new subclass is either defined by you
    // (the "constructor" property in your `extend` definition), or defaulted
    // by us to simply call the parent's constructor.
    if (hasOwnProperty.call(prototypeProps || false, 'constructor')) {
      child = prototypeProps.constructor;
    } else {
      child = function() {
        return parent.apply(this, arguments);
      };
    }

    // Add static properties to the constructor function, if supplied.
    _.extend(child, parent, staticProps);

    child.prototype = objCreate(parent.prototype);
    child.prototype.constructor = child;

    // Add prototype properties (instance properties) to the subclass,
    // if supplied.
    if (prototypeProps) {
      _.extend(child.prototype, prototypeProps);
    }

    // Set a convenience property in case the parent's prototype is needed
    // later.
    child.__super__ = parent.prototype;

    return child;
  }

  // Export
  // -------------
  Bedrock.VERSION = VERSION;
  Bedrock.$ = $;

  // Set up inheritance for the model, collection, router, view and history.
  Model.extend = Collection.extend = Router.extend = View.extend = History.extend = extend;

  // Expose Events, Model, Collection, View, Router and History
  Bedrock.Events = Events;
  Bedrock.Model = Model;
  Bedrock.Collection = Collection;
  Bedrock.View = View;
  Bedrock.Router = Router;
  Bedrock.History = History;

  // Create the default Bedrock.history.
  Bedrock.history = new History;

  if (exportTo) {
    Bedrock.noConflict = noConflict;
    exportTo.Bedrock = Bedrock;
  } else {
    Bedrock.noConflict = noop;
  }
}));
