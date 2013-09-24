HERSClient = function (_data,url,_id_params,cb_map) {
  var data = _data;
	var url = url || {};

	var address = url.address || 'localhost';
	var port = url.port || 80;
	var schema = url.schema || 'http';
	var method = url.method || 'POST';
	var id_params = _id_params || {name:'', roles:[]};
  var sidname = '';
  var old_sidname = '';
  var sid = '';
  var stop = false;
  var cbm = cb_map || {};
  var func_call_error = cbm.func_call_error_cb ? cbm.func_call_error_cb : function(errcode,errparams,errmess){/*console.log('FUNCTION CALL ERROR',errcode,errmess);*/};

	var error_to = undefined;
	var error_cnt = 0;
	var error_reconnect_sec = 1;

  var resphandler,errhandler;

  function makeidobj(){
		var iddata = {};
		if (!sidname) {
			iddata.name = id_params.name;
			iddata.roles= id_params.roles;
		}else{
			iddata[sidname] = sid;
		}
    return iddata;
  }

	function check() {
    if(stop){return;}
    //setTimeout(function(){
      Request (schema, address, port, '/', method, makeidobj(), resphandler, errhandler);
    //},2000);
	}

  resphandler = function(resp) {
    if(!(resp && (typeof resp === 'object') && (resp instanceof Array))){
      console.log('oops');
      return;
    }
    var sobj = resp.shift();
    old_sidname = sidname;
    for(var i in sobj){
      sidname = i;
      sid = sobj[i];
    }
    error_cnt = 0;
    error_reconnect_sec = 1;
    if (old_sidname && sidname != old_sidname) {
      data.reset();
      if(id_params.name){
        sid = '';
        sidname = '';
      }
    }
    var txn = resp.shift();
    var txnl = txn.length;
    for(var i=0; i<txnl; i++){
      try{
        data.commit(txn[i]);
      }
      catch(e){
        console.log(id_params.name,e);
      }
    }
    check();
  };

  errhandler = function() {
    //console.log('comm error',arguments);
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
      func_call_error(obj.errorcode,obj.errparams,obj.errormessage);
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

  this.go = function(){check();};
  this.stop = function(){stop=true;}
  this.data = data;
}

module.exports = HERSClient;
