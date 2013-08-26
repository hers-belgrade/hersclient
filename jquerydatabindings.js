function invoker(jqofunc,func){
  var jqo = jqofunc;
  if(typeof func === 'function'){
    return function(val){
      func.call(jqo(),val);
    };
  }else{
    return function(val){
      (jqo())[func](val);
    };
  }
};

function jqueryBindToScalar(collection,path,jqueryobj,selector,behavior){
  if(!(behavior&&(behavior.activator||behavior.deactivator||behavior.setter))){
    return;
  }
  var jqo = selector ? (function(jqo,sel){return function(){return jqo.find(sel);}})(jqueryobj,selector) : (function(jqo){return function(){return jqo};})(jqueryobj);
  var act = (behavior.activator)?invoker(jqo,behavior.activator):function(){};
  var deact = (behavior.deactivator)?invoker(jqo,behavior.deactivator):function(){};
  var sf = (behavior.setter) ? invoker(jqo,behavior.setter) : function(){};
  listenToDataPath(collection,path,function(ent){
    act(ent);
    sf(ent.value());
    var _e = ent;
    ent.changed.attach(function(old,newval){
      sf(newval,old);
    });
  },function(ent){
    sf('');
    deact(ent);
  });
};

