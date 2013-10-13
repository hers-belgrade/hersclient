var schemas = {
	'https' : require('https'),
	'http'  : require('http')
}

for(var i in schemas){
  schemas[i].globalAgent.maxSockets = 20;
}

function report(responseobj,id,responsestatus){
  if(typeof process.send !== 'function'){
    console.log('No parent process to send',responsestatus,responseobj,'to');
    return;
  }
  process.send({id:id,status:responsestatus,data:responseobj});
};

function doRequest(schema,requestobj,id){
  var module = schemas[schema];
  if(!module){return report({wrong_schema:schema},id,'error');}
  var rcvdata = '';
  try{
    var req = module.request(requestobj,function(resp){
      var _id = id;
      resp.setEncoding('utf8');
      resp.on('data',function(chunk){rcvdata+=chunk;});
      resp.on('close',function(){report({},_id,'error');});
      resp.on('end',function(){
        try{
          rcvdata = JSON.parse(rcvdata);
        }catch(e){
          console.log('parse error',e,'on',rcvdata);
          report({parse_error:e},_id,'error');
        }
        report(rcvdata,_id,'ok');
      });
    });
    req.on('error',function(error){
      report({requesterror:error.code},id,'error');
    });
    req.end();
  }catch(e){
    report({requesterror:e},id,'error');
  }
};

process.on('message',function(m){
  if(!(m&&m.id&&m.schema&&m.data)){
    return;
  }
  doRequest(m.schema,m.data,m.id);
});
