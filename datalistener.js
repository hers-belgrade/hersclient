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

function listenToCollectionField(sel_fn_or_obj,collection,fieldname,behavior){
  if(!collection){return;}
  var selector = (typeof sel_fn_or_obj === 'function') ? sel_fn_or_obj : (function(obj){var o = obj; return function(){return o;}})(sel_fn_or_obj);
  if(!(behavior&&(behavior.activator||behavior.deactivator||behavior.setter))){
    return;
  }
  var act = (behavior.activator)?dataFuncInvoker(selector,behavior.activator):function(){};
  var deact = (behavior.deactivator)?dataFuncInvoker(selector,behavior.deactivator):function(){};
  var sf = (behavior.setter) ? dataFuncInvoker(selector,behavior.setter) : function(){};
  collection.elementAdded.attach((function(fname){
    var fn = fname;
    return function(name,entity){
      if(name===fn){
        act(entity);
        if(entity.changed){//scalar
          sf(entity.value());
          entity.changed.attach(function(oldval,newval){sf(newval,oldval);});
        }
      }
    }
  })(fieldname));
  collection.elementRemoved.attach((function(fname){
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
      e.changed.attach(function(oldval,newval){sf(newval,oldval);});
    }
    e.destroyed.attach(deact);
  }
};

function listenToDataFields(sel_fn_or_obj,collection,fieldnamearry,cb){
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
    (function(index){
      var _ch = ch;
      var _set = set;
      var _unset = unset;
      listenToCollectionField(null,_coll,index,{activator:function(entity){
        _set(index,entity);
      },deactivator:function(entity){
        _unset(index);
      }});
    })(fn);
  }
};

module.exports = {
  listenToCollectionField:listenToCollectionField,
  listenToDataFields:listenToDataFields
};
