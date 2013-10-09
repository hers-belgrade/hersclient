angular.
  module('HERS', []).
  constant('datacopy',new Collection()).
  constant('maxattemptspertimeout',5).
  constant('maxtimeout',3).
  value('sessionobj',{}).
  value('identity',{}).
  factory('querize', function(){
    return function(querystring,queryobj){
      for(var i in queryobj){
        if(querystring.length){
          querystring+='&';
        }
        querystring+=(i+'='+queryobj[i]);
      }
      return querystring;
    };
  }).
  factory('transfer', function($http,url,datacopy,identity,sessionobj,maxattemptspertimeout,maxtimeout){
    return function(command,queryobj,cb){
      var attempts = 0;
      if(sessionobj.name){
        queryobj[sessionobj.name]=sessionobj.value;
        //console.trace();
        //console.log('sessioning',queryobj,(new Date()).getTime());
      }else{
        for(var i in identity){
          queryobj[i]=identity[i];
        }
        //console.log('initiating',queryobj);
      }
      timeout = 1;
      var worker = (function(_cb){
        var cb = _cb;
        var _wrk = function(){
          //$http.get(url+command+querystring).
          if(command&&(command[0]!=='/')){
            command = '/'+command;
          }
          $http.get( url+command, {params:queryobj} ).
          success(function(data){
            //console.log('response for',command,data,data[0]);
            for(var i in data[0]){
              if(sessionobj.name!==i){
                datacopy.reset();
                if(sessionobj.name){
                  sessionobj = {};
                  (typeof cb === 'function') && cb(data.errorcode,data.errorparams,data.errormessage);
                  return;
                }
              }
              sessionobj.name = i;
              if(sessionobj.value!==data[0][i]){
                datacopy.reset();
              }
              sessionobj.value = data[0][i];
            }
            //console.log(sessionname,sessionvalue);
            //data[1]&&data[1][0]&&console.log(data[1][0][2],(new Date()).getTime());
            for(var i in data[1]){
              datacopy.commit(data[1][i]);
            }
            //console.log(datacopy.value());
            (typeof cb === 'function') && cb(data.errorcode,data.errorparams,data.errormessage);
          }).
          error(function(){
            attempts++;
            if(attempts>maxattemptspertimeout){
              attempts=0;
              if(timeout<maxtimeout){
                timeout++;
              }
            }
            setTimeout(_wrk,timeout*1000);
          });
        };
        return _wrk;
      })(cb);
      worker();
    };
  }).
  factory('go',function(transfer){
    return function(){
      //transfer('',{},function(){});
      //return;
      var cb = function(){transfer('',{},cb);};
      console.log('go');
      cb();
    };
  }).
  factory('do_command',function(transfer){
    return function(command,paramobj,statuscb){
      transfer(command,{paramobj:JSON.stringify(paramobj)},statuscb);
    };
  }).
  factory('listen', function(){
    return function($http){
      //console.log('listen');
    };
  });



function SystemCtrl($scope,datacopy){
  $scope.memoryusage=0;
  $scope.memoryavailable=0;
  listenToCollectionField($scope,datacopy,'memoryusage',{setter:function(val){
    this.memoryusage=val;
  }});
  listenToCollectionField($scope,datacopy,'memoryavailable',{setter:function(val){
    this.memoryavailable=val;
  }});
};
function ConsumerCtrl($scope,datacopy){
  $scope.consumercount=0;
  listenToCollectionField($scope,datacopy,'consumercount',{setter:function(val){
    this.consumercount=val;
  }});
};
function DataSnifferCtrl($scope,datacopy){
  $scope.dataDump = '';
  datacopy.txnEnds.attach(function(){
    $scope.dataDump = datacopy.value();
  });
};

