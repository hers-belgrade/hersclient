function Scalar () {
	var data = undefined;

	var changed = new HookCollection(); //will be fired only upon changes
	var updated = new HookCollection(); //will be fired after every set

	var destroyed = new HookCollection();

	this.set = function (value) {
		var old = data;
		data = value;
		updated.fire(old, value);
		if (old != value) changed.fire(old,value);
	};

  this.destroy = function(){
    data = undefined;
    destroyed.fire();
    changed.destruct();
    destroyed.destruct();
  }
	this.value = function () {return data;}
  this.changed = changed;
  this.destroyed = destroyed;
	this.updated = updated;
}

function Collection (){
	var data = {};

	var elementAdded = new HookCollection();
	var elementRemoved = new HookCollection();

  var txnBegins = new HookCollection();
  var txnEnds = new HookCollection();
	var reset = new HookCollection();

	this.value = function () {
		var ret = {};
		for (var i in data) {
			ret[i] = data[i].value();
		}
		return ret;
	}

	this.element = function (path) {
		var top_ = typeof(path);
		if ('undefined'=== top_) return undefined;
		if ('string' === top_) return data[path];
		if ('number' === top_) return data[path];
		if ('object' === top_ && !(path instanceof Array)) return undefined;

    var level = 0;
    var pathl = path.length;
    var ret = this;
    while(level<pathl){
      ret = ret.element(path[level]);
      level++;
    }
    return ret;
	}

	function isObj (obj) {return (typeof(obj) === 'object');}
	function keyCount (obj) {
		var ret = 0;
		for (var i in obj) {
			ret++;
		}
		return ret;
	}
	var actions = {
		'set' : function (op, d) {
			//console.log('===', op);
			if (op.length == 0 && isObj(d) && keyCount(d) == 0) {
				data = d;
				reset.fire();
				return;
			}

			var path = op.slice(0);
			var c_parent = this;

      while(path.length>1){
        var pe = path.shift();
				c_parent = c_parent.element(pe);
				if (!c_parent) {
          throw op+" is an invalid path";
				}
			}

			var name = path.pop(); //or shift, doesn't matter, path is of length 1
			c_parent.set(name, d);
		},
		'remove' : function (p) {
			var prnt = this;
			for (var i in p) {
				var name = p[i];
				if (i == p.length-1) break;
				prnt = prnt.element(p[i]);
				if (!prnt) {
					return console.error('UNABLE TO FIND PATH ...');
				}
			}
			prnt.remove(name);
		},
		'start' : function (n) {
			this.start(n);
		},
		'end': function (n) {
			this.end(n);
		}
	};

	this.set = function (name, d) {
		var entity = data[name];
		var should_fire = !entity;

		if ('object' === typeof(d)) {
			if (entity && !(entity instanceof Collection)) {
				if(entity instanceof Scalar){
          elementRemoved(name,entity);
          entity.destroy();
        }
				entity = undefined;
			}
			if (!entity) { entity = new Collection(); should_fire = true; }
			for (var i in d) entity.set(i, d);
		}else{

			if (entity && !(entity instanceof Scalar)) {
				if(entity instanceof Collection){
          elementRemoved(name,entity);
          entity.destroy(); 
        }
				entity = undefined;
			}
			if (!entity) {entity = new Scalar(); should_fire = true;}
			entity.set(d);
		}
		data[name] = entity;
		should_fire && elementAdded.fire(name, entity);
		return entity;
	};

  this.remove = function (name){
    if(typeof data[name] !== 'undefined'){
      data[name].destroy();
      delete data[name];
      elementRemoved.fire(name);
    }
  };

  this.start = function(txnalias){
    txnBegins.fire(txnalias);
  };

  this.end = function(txnalias){
    txnEnds.fire(txnalias);
		affected_paths = undefined;
  };

  this.destroy = function(){
    for(var i in data){
      data[i].destroy();
      delete data[i];
      elementRemoved.fire(i);
    }
    data = undefined;
    elementAdded.destruct();
    elementRemoved.destruct();
    txnBegins.destruct();
    txnEnds.destruct();
  };

	this.commit = function (txn) {
		if (txn.length < 2) {
			console.error('IVALID TXN length ', txn);
			return;
		}
		try {
			var action = txn.shift(), path = txn.shift(), data = (txn.length) ? txn.shift() : undefined;
			if ('function' === typeof (actions[action])) {
				actions[action].call(this,path, data);
			}
		}catch (e) {
			console.log(e.stack);
			console.log('ERROR ',e,txn);
		}
	}

  this.elementAdded = elementAdded;
  this.elementRemoved = elementRemoved;
  this.txnBegins = txnBegins;
  this.txnEnds = txnEnds;
	this.reset = reset;
};

Collection.prototype.subscribe_bunch = function (map) {
  var ret = {};
  for (var i in map) {
    if (this[i] instanceof HookCollection) ret[i] = this[i].attach (map[i]);
  }
  return ret;
};

Collection.prototype.follow = function(path,creationcb,alterationcb,removalcb){
};

module.exports = {
	Scalar : Scalar,
	Collection: Collection
}
