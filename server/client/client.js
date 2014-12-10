
var QStoreClient = function() {
	this.socket = io("http://localhost:8000");
    this.callbackTable = {};
    if (!window.location.origin)
   		window.location.origin = window.location.protocol+"//"+window.location.host;
    this.qstore = new QStore(window.location.origin, this);
    this.writeSeqNo = 0; // vulnerable to race conditions
    this.init();
}

QStoreClient.prototype.init = function() {
    // TODO: load local store into memory
    that = this;
    this.socket.on('connection', function(msg) {
        console.log('Connected to server');
    });
    
    this.socket.on('find', function(msg) {
        var init_callback = that.callbackTable[msg['qid']]['init_response'];
        init_callback(msg['status'], msg['data']);
        if (msg['status'] === 'OK') {
            that.qstore.addQuery(msg['qid'], msg['data']['docs']);  
        }
    });
    
    this.socket.on('update', function(msg) {
        var init_callback = that.callbackTable[msg['qid']]['init_response'];
        init_callback(msg['status'], msg['data']);
    });
    
    this.socket.on('create', function(msg) {
        console.log('create response received');
        console.log('callback table: ' + JSON.stringify(that.callbackTable));
        var init_callback = that.callbackTable[msg['qid']]['init_response'];
        init_callback(msg['status'], msg['data']);
    });
    
    // evict doesn't actually need a response
    // this.socket.on('evict', function(msg) {
    
    // });
    
    this.socket.on('delete', function(msg) {
        var init_callback = that.callbackTable[msg['qid']]['init_response'];
        init_callback(msg['status'], msg['data']);
        delete that.callbackTable[msg['qid']];
        if (msg['status'] === 'OK') {
            that.qstore.delete(msg['data']);
        }
    });
    
    this.socket.on('notify_change', function(msg) {
        var update_callback = that.callbackTable[msg['qid']]['update_response'];
        update_callback(msg['data']);
        that.qstore.updateData(msg['data']);
    });
    
    this.socket.on('notify_new', function(msg) {
        var update_callback = that.callbackTable[msg['qid']]['update_response'];
        update_callback(msg['data']);
        that.qstore.addNewData(msg['qid'], msg['data']);
    });
}
    
// create a new object/entry on the server
QStoreClient.prototype.create = function(data, callback) {
    console.log('create function executed');
	var qid = this.writeSeqNo;
	this.writeSeqNo += 1;
    //console.log(data);
	var msg = {'qid': qid, 'data': JSON.stringify(data)};
	this.callbackTable[qid] = {'init_response': callback};
	this.socket.emit('create', msg);
}

// update an object on the server
QStoreClient.prototype.update = function(criteria, data, callback) {
	var qid = this.writeSeqNo;
	this.writeSeqNo += 1;
	var msg = {'qid': qid, 'criteria': criteria, 'data': data};
	this.callbackTable[qid] = {'init_response': callback};
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
	this.qstore.find(qid, criteria);
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
            console.log('query_fail');
			var msg = {'qid': data['qid'], 'criteria': data['criteria']};
			var local_results = data['results'];
			this.callbackTable[data['qid']]['init_response']('success', local_results);
			this.socket.emit('find', msg);
			break;
		case "query_evicted":
			var msg = {'qid': data['qid']}
			this.socket.emit('evict', msg);
			delete this.callbackTable[data['qid']];
			break;
	}
}
