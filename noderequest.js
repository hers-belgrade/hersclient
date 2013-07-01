var schemas = {
	'https' : require('https'),
	'http'  : require('http')
}

Request = function (schema, address, port, command, rq_method, data, cb, errcb, downcb) {
	var options = {
		hostname: address,
		port: port,
		path: command,
		method: rq_method || 'POST'
	};

	if ('function' !== typeof(errcb)) errcb = function () {}
	if ('function' !== typeof(downcb))downcb= function () {}
	var s = schemas[schema];
	if (!s) {
		throw "Invalid schema "+schema;
		return;
	}

	var req = s.request (options, function (res) {
		var status_code = res.statusCode;
		var data = '';
		res.on('data', function (chunk) { data+=chunk; });
		res.on('end' , function () { if ('function' === typeof(cb)) cb(data); });
		res.on('close', downcb);
	});


	//If any error is encountered during the request (be that with DNS resolution, TCP level errors, or actual HTTP parse errors)  ,... pretpostavljam da bih tu morao da uvalim i downcb
	req.on('error', function (e) {errcb(e.message);});
	req.end();
}

module.exports = {
	Request : Request,
}
