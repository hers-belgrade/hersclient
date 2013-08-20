HookCollection = require('./hersutils/hookcollection');
var c = require('./HERSClient');
var r = require('./noderequest');
var clctn = require('./datacopy').Collection;

module.exports = function(url,id_params,cb_map){
  return new c(new clctn(),url,id_params,cb_map);
}
