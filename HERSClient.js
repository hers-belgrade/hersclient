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

	var error_to = undefined;
	var error_cnt = 0;
	var error_reconnect_sec = 1;

  var resphandler,errhandler;

	function check() {
		var iddata = {};
		if (!sidname) {
			iddata.name = id_params.name;
			iddata.roles= id_params.roles;
		}else{
			iddata[sidname] = sid;
		}
		Request (schema, address, port, '/', method, iddata, resphandler, errhandler);
	}

  resphandler = function(resp) {
    if(!(resp && (typeof resp === 'object') && (resp instanceof Array))){
      console.log('oops');
      return;
    }
    var sobj = resp.shift();
    for(var i in sobj){
      sidname = i;
      sid = sobj[i];
    }
    error_cnt = 0;
    error_reconnect_sec = 1;
    if (old_sidname && sidname != old_sidname) {
      data.reset();
    }
    var txn = resp.shift();
    var txnl = txn.length;
    for(var i=0; i<txnl; i++){
      data.commit(txn[i]);
    }
    check();
  };

  errhandler = function() {
    error_cnt ++;
    if (error_cnt >= 5) {
      error_cnt = 0;
      if(error_reconnect_sec<3){
        error_reconnect_sec++;
      }
    }

    console.log('will try again in '+error_reconnect_sec+' seconds');
    error_to = setTimeout(check, error_reconnect_sec*1000);
  };


	this.do_command = function (request, iddata, cb) {
		var self = this;

		var command = '/'+request;
		iddata = iddata || {};
		iddata[consumer.sidname] = consumer.sid;
		Request (schema, address, port, command, method, iddata); //response callback is irrelevant until proven otherwise
	}

  this.go = function(){check();};
  this.data = data;
}

module.exports = HERSClient;
