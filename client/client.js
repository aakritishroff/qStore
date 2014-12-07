var QStoreClient = function(socketurl) {
	this.socket = new WebSocket(socketurl);
    this.callbackTable = {};
    if (!window.location.origin)
   		window.location.origin = window.location.protocol+"//"+window.location.host;
    this.qstore = new QStore(window.location.origin);

    // TODO: load local store into memory
    this.socket.onopen = function(evt) {
    	console.log('Connected to: ' + evt.currentTarget.URL);
    };

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
QStoreClient.prototype.create = function(data) {

}

// update an object on the server
QStoreClient.prototype.update = function(obj_id, data) {

}

// find all objects that fit the given params
QStoreClient.prototype.find = function(params, callbackTable) {
	// search qstore. If it's not in qstore the send the query
	// to the server and register the callback function
}

// delete all objects that fit the given params
QStoreClient.prototype.delete = function(params) {

}