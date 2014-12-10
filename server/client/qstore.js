//var jf = requrie("jsonfile");
//var util = require("util");
var QStore = function (appname, qstoreclient) {
	this.appname = appname;
	this.queryTable = {}; // maps query_id to list of obj ids
	this.dataTable = {}; // maps obj_id to it's data
    this.frequencyTable = {};
	this.qstoreclient = qstoreclient;
    this.tableDirty = false;
    console.log(this.queryTable);
    if (typeof(Storage) !== "undefined" && localStorage.queryTable && localStorage.queryTable !== "undefined") {
        console.log("ls: " + localStorage.queryTable);
        this.queryTable = JSON.parse(localStorage.queryTable);
    }
    setInterval(this.dumpToFile, 30000, this);
};

//TODO: Happy

QStore.prototype.dumpToFile = function(qStoreObj) {
    console.log("dumping to file" + JSON.stringify(qStoreObj.queryTable));
//     console.log(qStoreObj.queryTable);
    if (qStoreObj.queryTable.length > 0 && qStoreObj.tableDirty) {
        var dumpData = JSON.stringify(qStoreObj.queryTable);
        localStorage.setItem("queryTable", dumpData);
    }
    // find way to update tableDirty
    qStoreObj.tableDirty = false;
};

QStore.prototype.evictOneQuery = function() {
    var minQueriedTime = Number.MAX_VALUE;
    var qidsToEvict = [];

    for (var qid in this.frequencyTable) {
        if (this.frequencyTable.qid < minQueriedTime) {
            minQueriedTime = this.frequencyTable.qid;
            qidsToEvict = [qid];
        } else if (this.frequencyTable.qid = minQueriedTime) {
            qidsToEvict.push(qid);
        }
    }

    var evictedQid = qidsToEvict[Math.ceil(Math.random() * qidsToEvict.length)];

    var dids = this.queryTable[evictedQid];

    delete this.queryTable[evictedQid];
    delete this.frequencyTable[evictedQid];
    for (var i = 0; i < dids.length; i++) {
        delete this.dataTable[dids[i]];
    }

};

QStore.prototype.find = function(qid, criteria) {

	// check to see if we have run the query before. 
	//   if so then return the data 
	//   else return a null value
    console.log("qstore find begin");

	// check the query format first;
    if (Object.keys(criteria).length !== 1) {
        return "criteria format is not right."
    };
    // check to see if the query has been executed before;

	if (this.queryTable.hasOwnProperty(qid)) {
        this.frequencyTable[qid] += 1;
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
        var results = [];
        var resutlsDids = [];
        for (var did in this.dataTable) {
            if (this.fitCriteria(did, criteria)) {
                results.push(this.dataTable[did]);
                resutlsDids.push(did);
            }
        }
        this.frequencyTable[this.queryTable.length + 1] = 1;
        this.queryTable[this.queryTable.length + 1] = resutlsDids;
        
		var msg = {'qid': qid, 'criteria': criteria, 'results': results};
        console.log(criteria);
        this.addQuery(qid, results);
		this.qstoreclient.handleQStoreEvent('query_fail', msg);
	}
}

QStore.prototype.fitCriteria = function(did, criteria) {
    if (Object.keys(criteria).length !== 1) {
        return "The criteria format is not right";
    };
    var filterKey = Object.keys(criteria)[0];
    if (typeof(criteria[filterKey]) === "number") {
        if (did[filterKey] === criteria[filterKey]) {
            return true;
        }
        else {
            return false;
        }
    } else {
        var relation = Object.keys(criteria[filterKey])[0];
    }
    if (relation === '$gt') {
        if (did[filterKey] > criteria[filterKey][relation]) {
            return true;
        } else {
            return false;
        }
    }
    if (relation === "$lt") {
        if (did[filterKey] < criteria[filterKey][relation]) {
            return true;
        } else {
            return false;
        }
    }
    return false;
};

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
    this.tableDirty = true;
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
    this.frequencyTable[query_id] = 1;
    this.tableDirty = true;
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
    this.tableDirty = true;
}

QStore.prototype.fileErrorHandler = function(error) {
    console.log('Error: ' + error.message);
}
