var QStore = function (appname) {
	this.appname = appname;
	this.queryTable = {}; // maps query_id to list of obj ids
	this.dataTable = {}; // maps obj_id to it's data
	// load data from file
	// periodically flush to disk
	// need to figure out eviction policy including how to 
	//   maintain a size limit on qstore. 
}

QStore.prototype.find = function(params) {
	// check to see if we have run the query before. 
	//   if so then return the data 
	//   else return a null value
}

QStore.prototype.updateData = function(obj_id, data) {
	// update the dataTable
}

QStore.prototype.addQuery = function(query_id, data) {
	// addQuery to querytable with obj_ids from data
	// add the data to the dataTable
}