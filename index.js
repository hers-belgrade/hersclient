var https = require('https');
var http = require('http');
var hooks = require('./hooks');
var noderequest = require('./noderequest');

function logTeller(){
  return;
  console.log.apply(console,arguments)
};
function Request(schema,address,port,command,data,cb,errcb,downcb){
  var path = '';
  for(var i in data){
    if(path.length){
      path += '&';
    }
    path += (encodeURIComponent(i)+'='+encodeURIComponent(data[i]));
  }
  path = command+'?'+path;
  var go = {hostname:address,port:port,path:path,method:'POST'};
  logTeller('getting',go);
  var response='';
  var statusCode;
  function addChunk(chunk){
    //logTeller('adding',chunk);
    response+=chunk;
  };
  function finalize(){
    try{
      logTeller(path,'finalizing',response);
      (statusCode != 200) && console.log('SHOULD CHECK ON statusCode, ',statusCode);
      if(statusCode==401){
        downcb();
      }

      if(response){
        var jsr;
        var ok;
        try{
          jsr = JSON.parse(response);
          ok=true;
        }
        catch(e){
          console.log('Server response for',address,port,path,'cannot be parsed',response);
          ok=false;
        }
        if(ok){
          try{cb(jsr);}
          catch(e){
            console.log('Error in registryclient\'s callback',e,e.stack);
          }
        }
      }
    }
    catch(e){
      console.log(e);
      console.log(e.stack);
      errcb(e);
    }
  };
  var s;
  switch(schema){
    case 'https':
      s = https;
      break;
    case 'http':
      s = http;
      break;
    default:
      throw this.schema+' communication schema is not supported';
  }
  var rq = s.request(go,function(res){
    statusCode=res.statusCode;
    res.on('data',addChunk);
    res.on('end',finalize);
    res.on('close',errcb);
  });
  rq.on('error',errcb);
  rq.end();
	return rq;
};

var m = require('./Teller');
m.setLogger(logTeller);
m.setRequest(Request);
m.setHooks(hooks);

var fs = require('fs');

function codeOf(modulename){
  var p = require.resolve('./'+modulename);
  return p ? fs.readFileSync(p,'utf8') : '';
}

module.exports = {
  Teller:m.theClass,
  codeOf:codeOf,
	noderequest : noderequest,
	HTTP_LongPollClient : require ('./http_client').HTTP_LongPollClient,
	//LongPollBuffer : require('./LPBuffer').LongPollBuffer, ///TODO: seems to me that this one is not used at all
	LongPollConsumer:require('./LPConsumer').LPConsumer,
	HTTPLongPollDataCopy : require('./http_longpoll_data_copy').HTTPLongPollDataCopy
};
