function handlerForScalar(scalar){
  scalar.changed.attach(bla);
};

function handlerForElementAdded(elementname,scalarhandler,collectionhandler,destructionhandler){
  var name = elementname;
  var sh = scalarhandler;
  var ch = collectionhandler;
  var dh = destructionhandler;
  return function(ename,entity){
    if(name==ename){
      if(entity.changed){//scalar
        sh(entity);
      }
      if(entity.elementAdded){//collection
        ch(entity);
      }
      entity.destroyed.attach(dh);
    }
  };
};

function handlerForElementRemoved(elementname,removalhandler){
  var name = elementname;
  var rh = removalhandler;
  return function(ename,entity){
    if(name==ename){
      rh(entity);
    }
  };
};

function handleCollectionOnCollection(index,collection,collectionname,creationhandler,removalhandler,destructionhandler){
  collection.elementAdded.attach(handlerForElementAdded(collectionname,function(){
    throw "expecting a collection, not a scalar on "+collectionname;
  },function(entity){
    entity.destroyed.attach(destructionhandler);
    creationhandler(entity,index+1);
  },destructionhandler));
  collection.elementRemoved.attach(handlerForElementRemoved(collectionname,removalhandler));
  var e = collection.element(collectionname);
  if(e){
    creationhandler(e,index+1);
    e.destroyed.attach(destructionhandler);
  }
};

function handleEntityOnCollection(index,collection,entityname,creationhandler,removalhandler){
  collection.elementAdded.attach(handlerForElementAdded(entityname,creationhandler,creationhandler,removalhandler));
  collection.elementRemoved.attach(handlerForElementRemoved(entityname,removalhandler));
  var e = collection.element(entityname);
  if(e){
    creationhandler(e,index+1);
    e.destroyed.attach(removalhandler);
  }
}

function listenToDataPath(collection,path,creationcb,destructioncb){
  if(!collection){return;}
  var _path = path.slice();
  var _pl = _path.length;
  if(!_pl){
    collection.destroyed.attach(destructioncb);
    creationcb(collection);
  }
  var handler = function(_ent,i){
    if(i+1<_pl){
      handleCollectionOnCollection(i,_ent,_path[i],function(entity,_ind){
        handler(entity,_ind);
      },function(){
      });
    }else{
      handleEntityOnCollection(i,_ent,_path[i],function(entity,_ind){
        creationcb(entity);
      },destructioncb);
    }
  };
  handler(collection,0);
};

function listenToCollectionField(collection,fieldname,creationcb,destructioncb,alterationcb){
  if(!collection){return;}
  collection.elementAdded.attach(function(name,entity){
    creationcb.apply(selector(),arguments);
  });
};

function listenToDataFields(collection,fieldnamearry,cb){
  if(typeof cb !== 'function'){
    return;
  }
  var _cb = cb;
  var _coll = collection;
  var fnh = {};
  var ch = {};
  function trytogo(){
    for(var i in fnh){
      if(typeof ch[i] === 'undefined'){
        return false;
      }
    }
    _cb(ch);
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
      listenToDataPath(_coll,[index],function(entity){
        _set(index,entity);
      },function(entity){
        _unset(index);
      });
    })(fn);
  }
};

module.exports = {
  listenToDataPath:listenToDataPath,
  listenToDataFields:listenToDataFields
};
