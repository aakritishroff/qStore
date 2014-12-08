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

QStore.prototype.updateData = function(data) {
	// update the dataTable
	var did = data['id'];
	if (this.dataTable.hasOwnProperty(did)) {
		for (var key in data) {
			if (data.hasOwnProperty(key)) {
				this.dataTable[did][key] = data[key];
			}
		}
	}
}

QStore.prototype.addNewData = function(qid, data) {
	if (this.dataTable.hasOwnProperty(data['id'])) {
		this.dataTable[data['id']]['qids'].push(qid);
	} else {
		data['qids'] = [qid];
		this.dataTable[data['id']] = data;
	}
	this.queryTable[qid].push(data['id']);
}

QStore.prototype.addQuery = function(query_id, data) {
	// addQuery to querytable with obj_ids from data
	// add the data to the dataTable
	// add info to the dataTable about relevant qids
	var dids = [];
	var data_length = data.length;
	for (var i = 0; i < data_length; i++) {
		var current = data[i];
		dids.push(current['id']);
		current['qids'] = query_id;
		this.dataTable[current['id']] = current;
	}
	this.queryTable[query_id] = dids;
}

QStore.prototype.delete = function(list_dids) {
	len_dids = list_dids.length;
	for (var i = 0; i < len_dids; i++) {
		var data = this.dataTable[list_dids[i]];
		var qids = data['qids'];
		for (var j = 0; j < qids.length; j++) {
			var index = qids.indexOf(list_dids[i]);
			if (index > -1) {
				this.queryTable[qids[j]].splice(index, 1);	
			}
		}
		delete this.dataTable[list_dids[i]];
	}
}