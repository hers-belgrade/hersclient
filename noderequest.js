var childprocess = require('child_process');
var schemas = {
	'https' : require('https'),
	'http'  : require('http')
}

var reqcount = 0;
var reqmap = {};

function createSender(){
  var sp = childprocess.fork(__dirname+'/noderequestprocess.js');
  var ret = {process:sp,requests:0,statii:{ok:0,error:0}};
  sp.on('message',function(m){
    ret.requests--;
    if(!m){return;}
    var id = m.id;
    if(!id){return;}
    var reqobj = reqmap[id];
    if(!reqobj){return;}
    delete reqmap[id];
    var method = reqobj[m.status];
    if(typeof method !== 'function'){console.log('no method on',m.status);return;}
    ret.statii[m.status]++;
    method(m.data);
  });
  var sender = function(schema,reqobj,reqid){
    ret.requests++;
    sp.send({schema:schema,data:reqobj,id:reqid});
  };
  ret.send = sender;
  return ret;
};

var senders = [createSender()];

function send(schema,reqobj,cb,errcb){
  reqcount++;
  reqmap[reqcount] = {ok:cb,error:errcb};
  var sent = false;
  for(var i in senders){
    var sender = senders[i];
    //console.log('sender',i,'requests',sender.requests,'statii',sender.statii);
    if(sender.requests<50){
      sender.send(schema,reqobj,reqcount);
      sent = true;
      break;
    }
  }
  if(!sent){
    var s = createSender();
    senders.push(s);
    s.send(schema,reqobj,reqcount);
  }
};

Request = function (schema, address, port, command, rq_method, data, cb, errcb) {
  var module = schemas[schema];
  if(!module){return;}

  /*
	rq_method = (rq_method || 'POST').toUpperCase();
	var url = '';
	url += (schema || 'http');
	url += '://';
	url += (address || 'localhost');
	url += (':'+(port || 80));
	if (command && command.length) {
		if (command.charAt(0) != '/') command = '/'+command;
		url += command;
	}

	var setup = {
		url : encodeURI(url),
		method : rq_method
	}

	if ('POST' === rq_method) setup.json = data;
	if ('GET'  === rq_method) setup.qs = data;
  */

	if ('function' !== typeof(cb)) cb = function () {console.log(arguments)};
	if ('function' !== typeof(errcb)) errcb = function () {console.log(arguments)};

  var qs = '';
  for(var i in data){
    if(qs.length){
      qs = qs+'&';
    }
    var tod = typeof data[i];
    switch(tod){
      case 'string':
      case 'number':
        qs += (i+'='+data[i]);
        break;
      case 'object':
        qs += (i+'='+JSON.stringify(data[i]));
        break;
    }
  }
  if(qs.length){
    command = command+'?'+qs;
  }
  var robj = {
    hostname:address,
    port:port,
    method:'GET',
    path:encodeURI(command)
  };
  //console.log(robj);

  send(schema,robj,cb,errcb);
  return;

  var rcvdata = '';
  var req = module.request(robj,function(resp){
    resp.setEncoding('utf8');
    resp.on('data',function(chunk){rcvdata+=chunk;});
    resp.on('close',function(){cb();});
    resp.on('end',function(){
      try{
        rcvdata = JSON.parse(rcvdata);
      }catch(e){
        console.log('parse error',e,'on',rcvdata);
      }
      //console.log('calling cb on',rcvdata);
      cb(rcvdata);
    });
  });
  req.on('error',errcb);
  req.end();
  /*
	request(setup, function (error, res, body) {
		if (error) return errcb(error);
		if (res.statusCode && res.statusCode != 200) return errcb (parseInt(res.statusCode), body);
		try {
			body = JSON.parse(body);
		}catch (e) {}
		cb(body);
	});
  */
}

module.exports = Request;
