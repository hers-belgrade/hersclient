function jqueryBindToScalar(collection,scalarname,jqueryobj,selector,behavior){
  if(typeof scalarname !== 'string'){
    throw "Scalarname "+scalarname+" has to be a string";
  }
  if(!(behavior&&(behavior.activator||behavior.deactivator||behavior.setter))){
    return;
  }
  var jqo = selector ? (function(jqo,sel){return function(){return jqo.find(sel);}})(jqueryobj,selector) : (function(jqo){return function(){return jqo};})(jqueryobj);
  return listenToCollectionField(jqo,collection,scalarname,behavior);
};

