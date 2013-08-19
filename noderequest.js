var querystring = require('querystring');
var request = require('request');
var schemas = {
	'https' : require('https'),
	'http'  : require('http')
}

Request = function (schema, address, port, command, rq_method, data, cb, errcb) {

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
		url : url,
		method : rq_method
	}

	if ('function' !== typeof(cb)) cb = function () {console.log(arguments)};
	if ('function' !== typeof(errcb)) errcb = function () {console.log(arguments)};

	if ('POST' === rq_method) setup.json = data;
	if ('GET'  === rq_method) setup.qs = data;

	request(setup, function (error, res, body) {
		if (error) return errcb(error);
		if (res.statusCode && res.statusCode != 200) return errcb (parseInt(res.statusCode), body);
		try {
			body = JSON.parse(body);
		}catch (e) {}
		cb(body);
	});
}

module.exports = Request;
