var jf = requrie("jsonfile");
var util = require("util");
var QStore = function (appname, qstoreclient) {
	this.appname = appname;
	this.queryTable = {}; // maps query_id to list of obj ids
	this.dataTable = {}; // maps obj_id to it's data
    this.frequencyTable = {}
	this.qstoreclient = qstoreclient;
    // Down here the code from Shaun
    var reader = new FileReader();
    reader.onload = function(e) {
        var text = reader.result;
        var qDF = JSON.parse(text);
        this.queryTable = qDF['queryTable'];
        this.dataTable = qDF['dataTable'];
        this.frequencyTable = qDF['frequencyTable']
    };

    reader.readAsText("LocalFile.json")

    setInterval(this.dumpToFile, 1e7);
};

//TODO: Happy

QStore.prototype.dumpToFile = function() {
    var dumpJson = {'queryTable': this.queryTable,
                    'dataTable': this.dataTable,
                    'frequencyTable': this.frequencyTable};
    var dumpString = JSON.stringify(dumpJson);

    function onInitFs(fs) {

    fs.root.getFile('log.txt', {create: true}, function(fileEntry) {

    // Create a FileWriter object for our FileEntry (log.txt).
    fileEntry.createWriter(function(fileWriter) {

      fileWriter.onwriteend = function(e) {
        console.log('Write completed.');
      };

      fileWriter.onerror = function(e) {
        console.log('Write failed: ' + e.toString());
      };

      // Create a new Blob and write it to log.txt.
      var blob = new Blob(['Lorem Ipsum'], {type: 'text/plain'});

      fileWriter.write(blob);

    }, errorHandler);

  }, errorHandler);

}

window.requestFileSystem(window.PERMANENT, 1024*1024, onInitFs, errorHandler);

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
    this.frequencyTable[query_id] = 1;
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