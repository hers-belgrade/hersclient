function removeEmptyElements(arry){
  var i = 0;
  while(i<arry.length){
    if(typeof arry[i] !== 'undefined'){
      i++;
    }else{
      arry.splice(i,1);
    }
  }
};

function handlerForScalar(scalar){
  scalar.changed.attach(bla);
};

function handlerForElementAdded(elementname,scalarhandler,collectionhandler){
  var name = elementname;
  var sh = scalarhandler;
  var ch = collectionhandler;
  return function(ename,entity){
    if(name==ename){
      if(entity.changed){//scalar
        sh(entity);
      }
      if(entity.elementAdded){//collection
        ch(entity);
      }
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
  }));
  collection.elementRemoved.attach(handlerForElementRemoved(collectionname,removalhandler));
  var e = collection.element(collectionname);
  if(e){
    console.log(collectionname,'exists');
    creationhandler(e,index+1);
    e.destroyed.attach(destructionhandler);
  }
};

function handleEntityOnCollection(index,collection,entityname,creationhandler,removalhandler){
  collection.elementAdded.attach(handlerForElementAdded(entityname,creationhandler,creationhandler));
  collection.elementRemoved.attach(handlerForElementRemoved(entityname,removalhandler));
  var e = collection.element(entityname);
  if(e){
    creationhandler(e,index+1);
  }
}

function PathListener(collection,path,creationcb,destructioncb){
  if(!collection){return;}
  var _path = path.slice();
  var _pl = _path.length;
  if(!_pl){return;}
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

module.exports = PathListener;
