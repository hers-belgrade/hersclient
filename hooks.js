function HookCollection(){
  this.collection = {};
	this.counter = 0;
};
HookCollection.prototype.empty = function(){
	var c = 0;
	for(var n in this.collection){
		c++;
	}
  return c<1;
};
HookCollection.prototype.inc = function(){
	var t = this;
	function _inc(){
		t.counter++;
		if(t.counter>10000000){
			t.counter=1;
		}
	};
	_inc();
	while(this.counter in this.collection){
		_inc();
	}
};
HookCollection.prototype.count = function () {return this.collection.length;}
HookCollection.prototype.attach = function(cb){
  if(typeof cb === 'function'){
		this.inc();
    this.collection[this.counter]=cb;
		return this.counter;
  }
};
HookCollection.prototype.detach = function(i){
	delete this.collection[i];
};
HookCollection.prototype.fire = function(){
  var c = this.collection;
  var fordel=[];
  var pa = Array.prototype.slice.call(arguments);
  for(var i in c){
    try{
      var fqn = c[i];
      fqn.apply(null,pa);
    }
    catch(e){
      console.log(e);
      console.log(e.stack);
      fordel.unshift(i);
    }
  }
  var fdl = fordel.length;
  for(var i=0; i<fdl; i++){
		delete c[fordel[i]];
  }
};
HookCollection.prototype.fireAndForget = function(){
  var c = this.collection;
  var pa = Array.prototype.slice.call(arguments);
  for(var i in c){
    try{
      c[i].apply(null,pa);
    }
    catch(e){
      console.log(e);
      console.log(e.stack);
    }
  }
	this.collection = {};
};

module.exports=HookCollection;
