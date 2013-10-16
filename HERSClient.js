HERSClient = function (_data,url,_id_params,cb_map) {
  var data = _data;
	var url = url || {};

	var address = url.address || 'localhost';
	var port = url.port || 80;
	var schema = url.schema || 'http';
	var method = url.method || 'GET';
	var id_params = _id_params || {name:'', roles:[]};
  var sidname = '';
  var sid = '';
  var shouldrun = true;
  var cbm = cb_map || {};
  var func_call_error = cbm.func_call_error_cb ? cbm.func_call_error_cb : function(errcode,errparams,errmess){/*console.log('FUNCTION CALL ERROR',errcode,errmess);*/};

	var error_to = undefined;
	var error_cnt = 0;
	var error_reconnect_sec = 1;
  var diecb;

  var resphandler,errhandler;

  function makeidobj(){
		var iddata = {};
		if (!sidname) {
      console.log(id_params.name,'identifying');
			iddata.name = id_params.name;
			iddata.roles= id_params.roles;
		}else{
			iddata[sidname] = sid;
		}
    return iddata;
  }

	function check() {
    if(typeof diecb==='function'){
      diecb();
      return;
    }
    if(!shouldrun){return;}
    //setTimeout(function(){
      Request (schema, address, port, '/', method, makeidobj(), resphandler, errhandler);
    //},2000);
	}

  resphandler = function(resp) {
    if(!(resp && (typeof resp === 'object') && (resp instanceof Array))){
      console.log('oops');
      return;
    }
    if(!data){
      return;
    }
    var sobj = resp.shift();
    var old_sidname = sidname;
    var old_sid = sid;
    for(var i in sobj){
      sidname = i;
      sid = sobj[i];
    }
    error_cnt = 0;
    error_reconnect_sec = 1;
    if ((!sobj)||(old_sidname && (sidname != old_sidname))||(old_sid && (sid != old_sid))) {
      console.log(id_params.name,'resetting');
      data.reset();
      if(id_params.name){
        sid = '';
        sidname = '';
      }
    }else{
      var txn = resp.shift();
      if(txn){
        var txnl = txn.length;
        for(var i=0; i<txnl; i++){
          try{
            if(data){
              data.commit(txn[i]);
            }
          }
          catch(e){
            console.log(id_params ? id_params.name : 'destroyed client',e);
          }
        }
      }else{
        console.log(sobj);
      }
    }
    check();
  };

  errhandler = function() {
    console.log('comm error',arguments);
    error_cnt ++;
    if (error_cnt >= 5) {
      error_cnt = 0;
      if(error_reconnect_sec<3){
        error_reconnect_sec++;
      }
    }

    //console.log('will try again in '+error_reconnect_sec+' seconds');
    error_to = setTimeout(check, error_reconnect_sec*1000);
  };

  function func_call_handler(obj){
    if((typeof obj === 'object')&&(obj.errorcode)){
      func_call_error && func_call_error(obj.errorcode,obj.errparams,obj.errormessage);
    }
  }


	this.do_command = function (request, paramobj, cb, ctx) {
		var self = this;

		var command = (request&&request.length&&request[0]==='/') ? request : '/'+request;
    var po = makeidobj();
    po.paramobj=paramobj;
    var fch = cb ? function(obj){
      if((typeof obj === 'object')&&(obj.errorcode)){
        cb.call(ctx,obj.errorcode,obj.errorparams,obj.errormessage);
      }
    } : func_call_handler;
		Request (schema, address, port, command, method, po,fch,errhandler); //response callback is irrelevant until proven otherwise
	}

  this.destroy = (function(_t){
    var t = _t;
    return function(cb){
      diecb = function(){
        address=undefined;
        port=undefined;
        schema=undefined;
        id_params=undefined;
        sidname=undefined;
        sid=undefined;
        shouldrun=undefined;
        cbm=undefined;
        func_call_error=undefined;
        data.reset();
        data=undefined;
        for(var i in t){
          delete t[i];
        }
        if(typeof cb==='function'){
          cb();
        }else{
          console.trace();
          console.log('client destroying self without cb');
        }
      };
    };
  })(this);

  this.go = function(){shouldrun=true;check();};
  this.stop = function(){shouldrun=false;}
  this.data = data;
}

module.exports = HERSClient;
