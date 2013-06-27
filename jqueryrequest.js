Request = function (schema,address,port,command,data,cb,errcb,downcb){
	///TODO: INTRODUCE SOME MORE CONFIG DATA, like request type?
  jQuery.ajax({
    type:'POST',
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

