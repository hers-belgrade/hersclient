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
        console.trace();
        console.log('sessioning',queryobj,(new Date()).getTime());
      }else{
        for(var i in identity){
          queryobj[i]=identity[i];
        }
        console.log('initiating',queryobj);
      }
      timeout = 1;
      var worker = function(){
        //$http.get(url+command+querystring).
        $http.get( url+command, {params:queryobj} ).
        success(function(data){
          for(var i in data[0]){
            sessionobj.name = i;
            sessionobj.value = data[0][i];
          }
          //console.log(sessionname,sessionvalue);
          data[1]&&data[1][0]&&console.log(data[1][0][2],(new Date()).getTime());
          for(var i in data[1]){
            datacopy.commit(data[1][i]);
          }
          //console.log(datacopy.value());
          setTimeout(cb,10000);
        }).
        error(function(){
          attempts++;
          if(attempts>maxattemptspertimeout){
            attempts=0;
            if(timeout<maxtimeout){
              timeout++;
            }
          }
          setTimeout(worker,timeout*1000);
        });
      };
      worker();
    };
  }).
  factory('go',function(transfer){
    return function(){
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



function SystemCtrl($scope,datacopy,go){
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

