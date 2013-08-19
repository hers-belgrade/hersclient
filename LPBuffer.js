var Crypto = require('crypto');

LongPollBuffer = function (init_state_cb) {
	this.last_hash = null;
	this.queue = [];
	this.responder = null;

	this.initState = function () {
		return ('function' === typeof(init_state_cb)) ? init_state_cb() : {};
	}
}

/*
 * reset whole state ...
 */
LongPollBuffer.prototype.reset = function () {
	this.queue = [];
	this.last_hash = null;
	return this.send(this.initState(), true);
}

LongPollBuffer.prototype.isValidResponder = function () {
	return ('function' === typeof(this.responder));
}

/*
 * send updates or init?
 */
LongPollBuffer.prototype.check = function (responder, last) {
	//if responder is called with undefined, just release responder ...
	if (this.isValidResponder()) this.responder();
	console.log('WILL CHECK');
	this.responder = responder;
	return (last && this.last_hash === last) ? this.send() : this.reset();
}


/*
 * will send updates to responder or keep quiet
 */
LongPollBuffer.prototype.send = function (data, is_init) {
	if (data) {
		var ud = JSON.stringify(data);
		var hash = Crypto.createHash ('sha256')
			.update(ud, 'utf8')
			//prevent same messages problem, gimme some sugar, baby .... :D
			.update(Crypto.randomBytes(256).toString())
			.digest('hex');
		this.queue.push ({data:ud, hash:hash, is_init : is_init});
	}
	console.log('to send ... ', this.queue.length,' valid responder? ',this.isValidResponder());
	if (0 == this.queue.length) return 0; ///nothing to be done, keep it quiet
	if (!this.isValidResponder()) return 0; 				/// no sender, nothing to be done, keep it quiet
	var update = [];
	var last;
	while(this.queue.length) {
		var l = this.queue.shift();
		update.push(l);
		last = l.hash;
	}

	this.last_hash = last;
	this.responder(update);
	delete this.responder;
	return update.length;
}

module.exports = {
	LongPollBuffer : LongPollBuffer,
}
