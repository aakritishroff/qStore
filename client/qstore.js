var QStore = function (appname, qstoreclient) {
	this.appname = appname;
	this.queryTable = {}; // maps query_id to list of obj ids
	this.dataTable = {}; // maps obj_id to it's data
	this.qstoreclient = qstoreclient;
	// load data from file
	// periodically flush to disk
	// need to figure out eviction policy including how to 
	//   maintain a size limit on qstore. 
}

QStore.prototype.find = function(qid, criteria) {
	// check to see if we have run the query before. 
	//   if so then return the data 
	//   else return a null value
	if (this.queryTable.hasOwnProperty(qid)) {
		var dids = queryTable[qid];
		var dids_len = dids.length;
		var results = [];
		for (var i = 0; i < dids_len; i++) {
			results.push(this.dataTable[dids[i]]);
		}
		var msg = {'qid': qid, 'results': results};
		this.qstoreclient.handleQStoreEvent('query_success', msg);
	} else {
		// run search locally
		var msg = {'qid': qid, 'criteria': criteria, 'results': results};
		this.qstoreclient.handleQStoreEvent('query_fail', msg);
	}
}

QStore.prototype.updateData = function(obj_id, data) {
	// update the dataTable
}

QStore.prototype.addQuery = function(query_id, data) {
	// addQuery to querytable with obj_ids from data
	// add the data to the dataTable
}
