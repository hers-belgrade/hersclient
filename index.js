HookCollection = require('./hersutils/hookcollection');
var c = require('./HERSClient');
var r = require('./noderequest');
var dc = require('./datacopy');
var clctn = dc.Collection;
var pl = require('./datalistener');

module.exports = {
  createClient : function(url,id_params,cb_map){
    return new c(new clctn(),url,id_params,cb_map);
  },
  Collection : dc.Collection,
  listenToCollectionField : pl.listenToCollectionField,
  listenToDataFields: pl.listenToDataFields
};
