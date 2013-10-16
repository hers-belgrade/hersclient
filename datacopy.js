function isObj (obj) {return (typeof(obj) === 'object');}
function keyCount (obj) {
  var ret = 0;
  for (var i in obj) {
    ret++;
  }
  return ret;
}

function Scalar () {
	var data = undefined;

	var changed = new HookCollection(); //will be fired only upon changes

	var destroyed = new HookCollection();

	this.set = function (value) {
		var old = data;
		data = value;
		if (old != value) changed.fire(old,value);
	};

  this.destroy = function(){
    var mydata = data;
    data = undefined;
    changed.fire(mydata,undefined);
    destroyed.fire(this);
    changed.destruct();
    destroyed.destruct();
  }
	this.value = function () {return data;}
  this.changed = changed;
  this.destroyed = destroyed;
}

function Collection (){
	var data = {};

	var elementAdded = new HookCollection();
	var elementRemoved = new HookCollection();

  var txnBegins = new HookCollection();
  var txnEnds = new HookCollection();
	var destroyed = new HookCollection();

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
		//if ('string' === top_) return path.length ? data[path] : this;
		if ('string' === top_){
      if(path.length){
        var ret = data[path];
        if(typeof ret === 'undefined'){
          //console.log('no data for',path,'on',data);
        }
        return ret;
      }else{
        return this;
      }
    }
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

	this.set = function (name, d) {
    if(typeof name === 'undefined'){
      this.reset();
      return;
    }
		var entity = data[name];
		var fire_addition = !entity;

		if ('object' === typeof(d)) {
			if (entity && !(entity instanceof Collection)) {
				if(entity instanceof Scalar){
          elementRemoved(name,entity);
          entity.destroy();
        }
				entity = null;
			}
			if (!entity){
        entity = new Collection();
        fire_addition = true;
      }else{
        entity.reset();
      }
			for (var i in d) entity.set(i, d);
		}else{
			if (entity && !(entity instanceof Scalar)) {
				if(entity instanceof Collection){
          elementRemoved(name,entity);
          entity.destroy(); 
        }
				entity = null;
			}
			if (!entity) {entity = new Scalar(); fire_addition = true;}
			entity.set(d);
		}
		data[name] = entity;
		if(fire_addition){
      elementAdded.fire(name, entity);
    }
		return entity;
	};

  this.remove = function (name){
    var d = data[name];
    if(typeof d !== 'undefined'){
      elementRemoved.fire(name,d);
      d.destroy();
      delete data[name];
    }
  };

  this.reset = (function(_t,_data){
    var t = _t,data=_data;
    return function(){
      for(var i in data){
        t.remove(i);
      }
    };
  })(this,data);

  this.start = function(txnalias){
    txnBegins.fire(txnalias);
  };

  this.end = function(txnalias){
    /*
    for(var i in data){
      if(data[i].txnEnds){
        data[i].end(txnalias);
      }
    }
    */
    txnEnds.fire(txnalias);
  };

  this.destroy = (function(_t,_data){
    var t = _t;
    var data = _data;
    return function(){
      for(var i in data){
        data[i].destroy();
        delete data[i];
        elementRemoved.fire(i);
      }
      data = undefined;
      destroyed.fire(t);
      elementAdded.destruct();
      elementRemoved.destruct();
      txnBegins.destruct();
      txnEnds.destruct();
      destroyed.destruct();
      for(var i in t){
        delete t[i];
      }
    };
  })(this,data);

	this.commit = function (txn) {
		if (txn.length < 2) {
			console.error('IVALID TXN length ', txn);
			return;
		}
    //console.log(txn);
    var action = txn.shift(), path = txn.shift(), data = (txn.length) ? txn.shift() : undefined;
    var tf = this['perform_'+action];
    if ('function' === typeof (tf)) {
      tf.call(this,path, data);
    }
	}

  this.elementAdded = elementAdded;
  this.elementRemoved = elementRemoved;
  this.txnBegins = txnBegins;
  this.txnEnds = txnEnds;
  this.destroyed = destroyed;
};

Collection.prototype.perform_set = function (op, d) {
  var path = op.slice(0);
  var c_parent = this;
  var affectedpath='';

  while(path.length>1){
    var pe = path.shift();
    c_parent = c_parent.element(pe);
    if (!c_parent) {
      return;
      throw op+" is an invalid path on "+JSON.stringify(this.value())+' in setting '+pe;
    }
    affectedpath+=(pe+'/');
    this.affected[affectedpath] = c_parent;
  }

  var name = path.pop(); //or shift, doesn't matter, path is of length 1
  c_parent.set(name, d);
};

Collection.prototype.perform_remove = function (p) {
  if(!((typeof p === 'object')&&(p instanceof Array))){return;}
  var prnt = this;
  var level = 0;
  var name = '';
  var affectedpath = '';
  while(level<p.length-1){
    name = p[level];
    prnt = prnt.element(name);
    if(!prnt){
      return;
      throw p+' is an invalid path on '+JSON.stringify(this.value())+' in removing '+name;
    }
    affectedpath+=(name+'/');
    level++;
  }
  name = p[level];
  if(name){
    prnt.remove(name);
  }
  if(affectedpath.length){
    delete this.affected[affectedpath];
  }
};

Collection.prototype.perform_start = function (n) {
  this.affected = {};
  this.start(n);
};

Collection.prototype.perform_end = function (n) {
  for(var i in this.affected){
    this.affected[i].end(n);
  }
  delete this.affected;
  this.end(n);
};


Collection.prototype.subscribe_bunch = function (map) {
  var ret = {};
  for (var i in map) {
    if (this[i] instanceof HookCollection) ret[i] = this[i].attach (map[i]);
  }
  return ret;
};
module.exports = {
	Scalar : Scalar,
	Collection: Collection
};
