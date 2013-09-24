function dataFuncInvoker(selfunc,func){
  var sel = selfunc;
  if(typeof func === 'function'){
    return function(){
      func.apply(sel(),arguments);
    };
  }else{
    return function(){
      var s = sel();
      s[func].apply(s,arguments);
    };
  }
};

function Listener(){
  this.attached = [];
};
Listener.prototype.add = function(source,listener){
  this.attached.push({source:source,hook:source.attach(listener)});
};
Listener.prototype.release = function(){
  for(var i in this.attached){
    var a = this.attached[i];
    a.source.detach(a.hook);
  }
  this.attached = [];
};

function listenToCollectionField(sel_fn_or_obj,collection,fieldname,behavior){
  var ret = new Listener();
  if(!collection){return ret;}
  var selector = (typeof sel_fn_or_obj === 'function') ? sel_fn_or_obj : (function(obj){var o = obj; return function(){return o;}})(sel_fn_or_obj);
  if(!(behavior&&(behavior.activator||behavior.deactivator||behavior.setter))){
    return;
  }
  var act = (behavior.activator)?dataFuncInvoker(selector,behavior.activator):function(){};
  var deact = (behavior.deactivator)?dataFuncInvoker(selector,behavior.deactivator):function(){};
  var sf = (behavior.setter) ? dataFuncInvoker(selector,behavior.setter) : function(){};
  ret.add(collection.elementAdded,(function(_listener,fname){
    var listener=_listener,fn = fname;
    return function(name,entity){
      if(name===fn){
        act(entity);
        if(entity.changed){//scalar
          sf(entity.value());
          listener.add(entity.changed,(function(oldval,newval){sf(newval,oldval);}));
        }
      }
    };
  })(ret,fieldname));
  ret.add(collection.elementRemoved,(function(fname){
    var fn = fname;
    return function(name,entity){
      if(name===fn){
        sf('');
        deact(entity);
      }
    }
  })(fieldname));
  var e = collection.element(fieldname);
  if(e){
    act(e);
    if(e.changed){
      sf(e.value());
      ret.add(e.changed,function(oldval,newval){sf(newval,oldval);});
    }
    ret.add(e.destroyed,deact);
  }
  return ret;
};

function Listeners(){
  this.collection = [];
}
Listeners.prototype.add = function(listener){
  this.collection.push(listener);
};
Listeners.prototype.release = function(){
  for(var i in this.collection){
    this.collection[i].release();
  }
  this.collection=[];
};

function listenToDataFields(sel_fn_or_obj,collection,fieldnamearry,cb){
  var ret = new Listeners();
  if(typeof cb !== 'function'){
    return;
  }
  if(!collection){return;}
  var selector = (typeof sel_fn_or_obj === 'function') ? sel_fn_or_obj : (function(obj){var o = obj; return function(){return o;}})(sel_fn_or_obj);
  var sf = dataFuncInvoker(selector,cb);
  var _coll = collection;
  var fnh = {};
  var ch = {};
  function trytogo(){
    for(var i in fnh){
      if(typeof ch[i] === 'undefined'){
        return false;
      }
    }
    sf(ch);
  };
  function set(fieldname,fieldval){
    if(typeof fnh[fieldname] === 'undefined'){
      return;
    }
    if(typeof fieldval === 'undefined'){
      return;
    }
    ch[fieldname] = fieldval;
    trytogo();
  };
  function unset(fieldname){
    delete ch[fieldname];
  };
  for(var i in fieldnamearry){
    var fn = fieldnamearry[i];
    fnh[fn] = 1;
    (function(_listeners,index){
      var listeners = _listeners;
      var _ch = ch;
      var _set = set;
      var _unset = unset;
      listeners.add(listenToCollectionField(null,_coll,index,{activator:function(entity){
        _set(index,entity);
      },deactivator:function(entity){
        _unset(index);
      }}));
    })(ret,fn);
  }
};

module.exports = {
  listenToCollectionField:listenToCollectionField,
  listenToDataFields:listenToDataFields
};
