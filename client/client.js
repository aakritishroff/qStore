var QStoreClient = function() {
	this.socket = io();
    this.callbackTable = {};
    if (!window.location.origin)
   		window.location.origin = window.location.protocol+"//"+window.location.host;
    this.qstore = new QStore(window.location.origin);
    this.writeSeqNo = 0; // vulnerable to race conditions

    // TODO: load local store into memory
    this.socket.on('connection', function(msg) {
    	console.log('Connected to: ' + evt.currentTarget.URL);
    });

    this.socket.on('find', function(msg) {

    });

    this.socket.on('update', function(msg) {

    });

    this.socket.on('create', function(msg) {

    });

    // evict doesn't actually need a response
    // this.socket.on('evict', function(msg) {

    // });

    this.socket.on('delete', function(msg) {

    });

    this.socket.on('subscription_update', function(msg) {

    });

    // handles socket errors
    this.socket.onerror = function(error) {
    	console.log('WebSocket Error: ' + error);
    };

    this.socket.onmessage = function(event) {
    	// figure out what type of message it is. 
    	// update qstore appropriately. utilize callback 
    	// function to notify the app. 
    };

    this.socket.onclose = function(event) {
    	console.log('socket closed');
    };
}

// create a new object/entry on the server
QStoreClient.prototype.create = function(data, callback) {
	var qid = this.writeSeqNo;
	this.writeSeqNo += 1;
	var msg = {'qid': qid, 'data': data};
	this.callbackTable[qid] = {'init': callback};
	this.socket.emit('create', msg);
}

// update an object on the server
QStoreClient.prototype.update = function(criteria, data, callback) {
	var qid = this.writeSeqNo;
	this.writeSeqNo += 1;
	var msg = {'qid': qid, 'criteria': criteria, 'data': data};
	this.callbackTable[qid] = {'init': callback};
	this.socket.emit('update', msg);
}

// find all objects that fit the given params
QStoreClient.prototype.find = function(criteria, callback1, callback2) {
	// search qstore. If it's not in qstore the send the query
	// to the server and register the callback function
	// callback1 is called for the initial response to the req
	// callback2 is called for any updates/new data from the server
	var hash = CryptoJS.MD5(JSON.stringify(criteria));
	var qid = hash.toString(CryptoJS.enc.Hex);
	this.callbackTable[qid] = {'init_response': callback1, 'update_response': callback2};
	this.qstore.find(qid, hash);
}

// delete all objects that fit the given params
QStoreClient.prototype.delete = function(criteria, callback) {
	var qid = this.writeSeqNo;
	this.writeSeqNo += 1; 
	var msg = {'qid': qid, 'criteria': criteria};
	this.callbackTable[qid] = {'init_response': callback};
	this.socket.emit('delete', msg);
} 

QStoreClient.prototype.handleQStoreEvent = function(evt_type, data) {
	switch(evt_type) {
		case "query_success":
			var qid = data['qid'];
			this.callbackTable[qid]['init_response'](data['results']);
			break;
		case "query_fail":
			var msg = {'qid': data['qid'], 'criteria': data['criteria']};
			var local_results = data['results'];
			this.callbackTable[data['qid']]['init_response'](local_results);
			this.socket.emit('find', msg);
			break;
		case "query_evicted":
			var msg = {'qid': data['qid']}
			this.socket.emit('evict', msg);
			delete this.callbackTable[data['qid']];
			break;
	}
}