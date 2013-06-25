var Teller = require('../').Teller;

var t = new Teller('http','Blah',{cannot_connect:function(){
  console.log('cannot_connect');
}});
t.ready(function(){
  console.log('ready');
  dodado();
});
t.listen('numberOfConnectedUsersChanged',function(paramobj){
  console.log('cu changed',paramobj);
});
t.listen('aha',function(paramobj,cb){
  console.log('aha invoked with',paramobj);
  cb({e:7,f:8});
});

function dodado(){
  t.tell('nja',{},function(po){
    console.log('got it',po);
  });
}

t.setCommParams('192.168.1.127',12345,'12341234');

