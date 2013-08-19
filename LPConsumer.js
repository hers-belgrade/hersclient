LongPollConsumer = function (cb_map) {
	this.last = undefined;
	this.buffer = [];
	this.sid = undefined;
	this.sid_name = undefined;
	this.cbs = cb_map || {};
}

LongPollConsumer.prototype.consume = function (update) {
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

LongPollConsumer.prototype.next = function () {return (this.buffer.length)?this.buffer.shift():undefined;}

module.exports = {
	LongPollConsumer : LongPollConsumer
}
