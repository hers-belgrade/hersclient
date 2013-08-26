function jqueryBindToScalar(collection,path,jqueryobj,selector,behavior){
  if(!(behavior&&(behavior.activator||behavior.deactivator||behavior.setter))){
    return;
  }
  var jqo = selector ? (function(jqo,sel){return function(){return jqo.find(sel);}})(jqueryobj,selector) : (function(jqo){return function(){return jqo};})(jqueryobj);
  return listenToCollectionField(jqo,collection,path[0],behavior);
};

