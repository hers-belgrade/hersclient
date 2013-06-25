var hooks = function(){};
var logTeller = function(){};
var Request = function(){};

function EventEmitter(){}
EventEmitter.prototype.emit = function(eventname){
  if((typeof this.cbs === 'object')&&(typeof this.cbs[eventname] === 'function')){
    this.cbs[eventname].apply(this,Array.prototype.slice.call(arguments,1));
  }
};

function TellingClient(schema,cbs){
  this.jobs = [];
  this.schema = schema;
  this.cbs = cbs;
};
TellingClient.prototype = new EventEmitter();
TellingClient.prototype.constructor = TellingClient;
TellingClient.prototype.isConnected = function(){
  return this.address&&this.port;
};
TellingClient.prototype.hitMe = function(){
	if(!this.isConnected()){return;}
	var t = this;
	var obj = {alive:true,rq:undefined};
	this.errorCount = this.errorCount||0;
	function handleerr(error){
		obj.alive=false;
    if(!error){
      return;
    }
		if(error==='TIMEOUT'){
			console.log(t.name,'server in',error,'on',t.address+':'+t.port,t.passcode);
			return !t.isConnected();
		}
		console.log(t.name,'server in',error,'#',t.errorCount,'on',t.address+':'+t.port,t.passcode);
		t.errorCount++;
		if(t.errorCount>=5){
			t.errorCount=0;
			t.setCommParams();
			t.emit('disconnect');
			return true;
		}
	};
	var to = setTimeout(function(){
		if(!obj.alive){return;}
		if(obj.rq){
			obj.rq.abort();
		}
		if(!handleerr('TIMEOUT')){
			t.hitMe();
		}
	},8000);
  var hm = function(err){
		var shm=true;
		if(!obj.alive){return;}
		if(err){
			shm = !handleerr(err);
		}
		clearTimeout(to);
		logTeller(t.name,'should hitMe again',shm);
		if(shm){
			t.hitMe();
		}
  };
  obj.rq = this.doRequest(TellingClient.initCommand,{},hm,function(data){
		if(!obj.alive){return;}
		clearTimeout(to);
    if(data){
      logTeller(t.name,'init returned with',data,'sending it again');
    }
		t.analyzeResponse(data);
    hm();
	},function(){});
};
TellingClient.prototype.setCommParams = function(address,port,passcode){
  var changed=((this.address!==address)&&(this.port!==port)&&(this.passcode!==passcode));
  this.address=address;
  this.port=port;
  if(this.passcode&&this.passcode.length&&(this.passcode!==passcode)){
    this.jobs = [];
  }
  this.passcode=passcode;
  if(changed){
    delete this.clientId;
  }
	if(this.isConnected()){
		this.hitMe();
	}
  this.dumpQueues();
};
TellingClient.prototype.setClientId = function(data){
  var shouldfire = (this.clientId!==data.clientId);
  this.clientId = data.clientId;
  if(this.clientId&&shouldfire&&this.isConnected()){
    this.emit('ready');
    return;
  }
};
TellingClient.prototype.dumpQueues = function(){
  logTeller('should dump',this.jobs,'connected',this.isConnected());
  if(this.isConnected()){
    if(!this.jobs.length){
      //this.hitMe();
    }else{
      var job = (this.jobs.splice(0,1))[0];
      this._sendCore.apply(this,job);
    }
  }
};
TellingClient.initCommand = '/now/init';
TellingClient.prototype._sendCore = function(command,paramobj,cb){
  if(command[0]!=='/'){
    command='/'+command;
  }
  paramobj=paramobj||{};
  var t = this;
  function _undo(why){
		logTeller(t.name,'undoing',command,'because',why);
		t.jobs.unshift([command,paramobj,cb]);
  };
  function _s(){
    t._sendCore(command,paramobj,cb);
  };
  if(!this.isConnected()){
		this.emit('disconnect');
    logTeller(command,'will have to wait until I get the address and port');
    _undo('not connected');
    return;
  }
  if(!this.clientId){
    logTeller(command,'will have to wait until I obtain the clientId');
    _undo('not authenticated');
    //this.hitMe();
    return;
  }
  this.doRequest(command,paramobj,_undo,function(data){if(typeof cb==='function'){cb(data);}t.dumpQueues();},function(){t.dumpQueues();});
};
TellingClient.prototype.doRequest = function(command,paramobj,_undo,cb,errcb){
  if(this.clientId){
    paramobj.clientId=this.clientId;
  }
  var po = {'$jsonPackage':JSON.stringify(paramobj)};
  if(this.passcode){
    po.passcode = this.passcode;
  }
  logTeller(this.name,'sending',command,paramobj);
  var t = this;
  return Request(t.schema,t.address,t.port,command,po,function(data){
		if((typeof data === 'object')&&(data.error==='Client ID missing')){
			_undo('Client ID missing');
			delete t.clientId;
		}
    cb(data);
	},function onErr(data){
		var dc = (data ? data.code : '');
    _undo('error '+dc);
		if(dc!=='ECONNRESET'){
			if(t.clientId){
				console.log(t.address,t.port,command,'COMMERROR',data,dc);
				logTeller('queue',t.queue);
				delete t.clientId;
			}
		}
    errcb();
  },function onDown(){
    t.port = 0;
    t.address = '';
   registryclient.signalServiceDown(t.name);
   _undo('down');
   t.emit('disconnect');
  });
};
TellingClient.prototype.send = function(command,paramobj,cb){
  this.jobs.push([command,paramobj,cb]);
  this.dumpQueues();
};
TellingClient.prototype.analyzeResponse = function(data,cb){
  logTeller('got',data);
  if(data){
    var di = data.invoke;
    if(di&&di.length){
      var dil = di.length;
      for(var i=0; i<dil; i++){
        var ie = di[i];
        var m = ie.method;
        var po = ie.paramobj;
        logTeller('looking for my method',m);
        var f = this[m];
        if(typeof f === 'function'){
          logTeller(m,'found, invoking');
          f.call(this,po);
        }
        logTeller(m,'not found');
      }
      delete data.invoke;
    }
  }
  /*
  console.log();
  console.log(cb.toString());
  console.log(data);
  console.log();
  */
  if(typeof cb === 'function'){
    cb(data);
  }
  this.dumpQueues();
};
function Teller(schema,name,cbs){
  this.name=name;
  this.queue=[];
  this.listeningHooks = {};
  this.readies = new hooks();
  this.unreadies = new hooks();
  var t = this;
  this.client = new TellingClient(schema,{
    ready:function(){
      t.readies.fire(t);
    },
    disconnect:function(){
      t.unreadies.fire(t);
      t.emit('disconnect');
      logTeller(t.name,'should try connect',!t.dontTry);
      if(!t.dontTry){
        t.connect();
      }
    }
  });
	this.client.name = this.name;
  this.connect();
  this.cbs = cbs;
};
Teller.prototype = new EventEmitter();
Teller.prototype.constructor = Teller;
Teller.prototype.log = function(){
  var pa = Array.prototype.slice.call(arguments);
  pa.unshift(':');
  pa.unshift(this.name);
  logTeller.apply(null,pa);
};
Teller.prototype.clientConnected = function(){
  return this.client.isConnected();
};
Teller.prototype.connect = function connect(){
  if(this.clientConnected()){
    return;
  }else{
    this.emit('cannot_connect');
  }
}
Teller.prototype.setCommParams = function(address,port,passcode){
  this.client.setCommParams(address,port,passcode);
};
Teller.prototype.tell = function tell(methodname,paramobj,cb){
  this.client.send(methodname,paramobj,cb);
}
Teller.prototype.listen = function listen(callname,handler){
  var ch = this.listeningHooks[callname];
  if(!ch){
    ch = new hooks();
    var self = this;
    this.client[callname] = function(data){
      logTeller('invoking',callname);
      if(typeof data !== 'object'){return;}
      if(data.paramobj){
        var cbid = data.__cbId;
        var cb = (typeof cbid !== 'undefined') ? (function(data){
          self.tell('acceptCBResponse',{__cbID:cbid,paramobj:data});
        }) : (function(){});
        ch.fire(data.paramobj,cb);
        return;
      }
      ch.fire(data);
    };
  }
  return ch.attach(handler);
};
Teller.prototype.unlisten = function(callname,cbindex){
	var ch = this.listeningHooks[callname];
	if(ch){
		ch.detach(cbindex);
	}
};
Teller.prototype.ready = function(cb,unreadycb){
  if(typeof cb !== 'function'){
    return;
  }
	var urf = (typeof unreadycb === 'function');
  if(this.client.isConnected()&&this.client.clientId){
    cb(this);
  }else{
    if(urf){unreadycb(this);}
  }
  this.readies.attach(cb);
	if(urf){
		this.unreadies.attach(unreadycb);
	}
};

module.exports = {
  theClass:Teller,
  setLogger:function(l){logTeller=l;},
  setRequest:function(r){Request=r;},
  setHooks:function(h){hooks=h;}
}
