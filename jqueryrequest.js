Request = function (schema,address,port,command,data,cb,errcb,downcb){
	///TODO: INTRODUCE SOME MORE CONFIG DATA
  jQuery.ajax({
    type:'GET',
    url:schema+'://'+address+':'+port+command,
    data:data,
    dataType:'json',
    success:function(data,textStatus,jqXHR){
      if(typeof cb==='function'){
        cb(data);
      }
    },
		error:function ( jqXHR, textStatus, errorThrown ) {
			if('function' == typeof(errcb)) errcb(errorThrown);
		}
  });
}

