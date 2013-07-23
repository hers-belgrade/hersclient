Request = function (schema,address,port,command, rq_method, data,cb,errcb,downcb){
	///TODO: INTRODUCE SOME MORE CONFIG DATA, like request type?
  jQuery.ajax({
    type: rq_method || 'POST',
    url:schema+'://'+address+':'+port+command,
    data:data,
    //dataType:'json',
    success:function(data,textStatus,jqXHR){
      if(typeof cb==='function'){
				try {
        cb(JSON.parse(data));
				}catch (e){};
      }
    },
		error:function ( jqXHR, textStatus, errorThrown ) {
			if('function' == typeof(errcb)) errcb(errorThrown);
		}
  });
}

