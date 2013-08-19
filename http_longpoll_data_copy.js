// stable version
function HTTPLongPollDataCopy (url, cb_map) {
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
