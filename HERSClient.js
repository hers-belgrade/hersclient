HERSConsumer = function (cb_map) {
	this.last = undefined;
	this.buffer = [];
	this.sid = undefined;
	this.sid_name = undefined;
	this.cbs = cb_map || {};
}

HERSConsumer.prototype.consume = function (update) {
	if (!update || !(update instanceof Array) || !update.length) return;

	var skd = update.shift();
	if (!skd || 'object' != typeof(skd))  {
		console.log('invalid session key, session ID map ...',skd);
		return;
	}

	var old_sid_name = this.sid_name;

	for (var name in skd) {
		this.sid_name = name;
		this.sid = skd[name];
		break;
	}

	if (old_sid_name && old_sid_name != this.sid_name) {
		if ('function' === typeof(this.cbs.reset_cb)) this.cbs.reset_cb.call(this);
	}

	var ul = update.shift();
	if (!ul  || !ul.length) {
		console.log('invalid update array ...', ul);
		return;
	}
	while (ul.length) {
		this.buffer.push (ul.shift());
	}
	return this.buffer.length;
}

HERSConsumer.prototype.next = function () {return (this.buffer.length)?this.buffer.shift():undefined;}

HERSClient = function (url,id_params,cb_map) {
	var self = this;
	var url = url || {};

	var address = url.address || 'localhost';
	var port = url.port || 80;
	var schema = url.schema || 'http';
	var method = url.method || 'POST';

	var consumer = new HERSConsumer({reset_cb: function () {
		delete this.sid_name;
		delete this.sid;
		self.check();
	}});
	var cb_map = cb_map || {};


	var error_to = undefined;
	var error_cnt = 0;
	var error_reconnect_sec = 1;

	//var update_cb =  ('function' === typeof(cb_map.update)) ? cb_map.update : function (update) {console.log(update)};
	function is_buffer_ready_valid () {
		return ('function' === typeof(cb_map.buffer_ready));
	}

	function safe_cb (cb) {
		if ('function' === typeof(cb)) return cb.apply(null, Array.prototype.slice.call(arguments, 1));
		return undefined;
	}

	this.check = function () {
		var self = this;
		var data = {};

		id_params = id_params || {name:'', roles:[]};

		if (!consumer.sid_name) {
			data.name = id_params.name;
			data.roles= id_params.roles;
		}else{
			data[consumer.sid_name] = consumer.sid;
		}

		var command = '/';
	
		var old_sid_name = consumer.sid_name;	
		var request = Request (schema, address, port, command, method, data, function (resp) {
			var bfr = consumer.buffer.length;
			if (consumer.consume(resp)) {
				safe_cb(cb_map[(bfr == 0)?'buffer_ready':'buffer_updated'], consumer);
			}

			consumer.consume(resp) && is_buffer_ready_valid() && cb_map.buffer_ready(consumer.buffer.length);

			error_cnt = 0;
			error_reconnect_sec = 1;
			if (old_sid_name && consumer.sid_name != old_sid_name) {
				console.log('you should ignore this one and never again ask for check ....');
			 	return;
			}
			self.check();
		},
		function () {
			error_cnt ++;
			if (error_cnt >= 5) {
				error_cnt = 0;
        if(error_reconnect_sec<3){
          error_reconnect_sec++;
        }
			}

			console.log('will try again in '+error_reconnect_sec+' seconds');
			error_to = setTimeout(function () {self.check()}, error_reconnect_sec*1000);
		});
	}

	this.do_command = function (request, data, cb) {
		var self = this;

		var command = '/'+request;
		data = data || {};
		data[consumer.sid_name] = consumer.sid;
		Request (schema, address, port, command, method, data); //response callback is irrelevant until proven otherwise
	}

	this.check ();
	this.next = function () {return consumer.next();}
}

function HERSDataCopy (url, cb_map) {
	this.datacpy = new Collection();
	var sbs = this.datacpy.subscribe_bunch(cb_map);
	var self = this;

	this.go = function (id_params) {
		self.client = new HTTP_LongPollClient (url,id_params, {
			buffer_ready : function (consumer) {
				var u ;
				while (u = consumer.next()){
					self.datacpy.commit(u);
				}
			}
		});
	}
}

module.exports = HERSClient;
