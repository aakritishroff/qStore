'use strict'

var express = require('express');
var app = express();


var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var _ = require('underscore')

var dict = require('dict');

var allClients = [] //list of socket.id
var connCounter = 0;

var queryPool = dict();
var subscriptions = dict(); //dids -> clients
var subscribedTo = dict(); //client -> dids

//helper functions

function logMessage(msg) {
    console.log((new Date()) + ' > ' + msg);
}

function fatalError(err) {
    if (err) {
        logMessage("*** Fatal Error " + err);
        throw (err);
    }
}

var addQuery = function(qid, qString, client){
	var qData = queryPool.get(qid);
	if (qData != undefined) {
		if (qData.clients.indexOf(client) == -1){
			qData.clients.push(client);
		}
	}
	else {
		queryPool.set(qid, new Query(qString, client));
	}
};

var Query = function(qString, client){
	this.qString = qString;
	this.clients = []
	this.clients.push(client);
};

//setup mongodb

var mongo = require('mongodb'),
	ObjectId = require('mongodb').ObjectID,
	dbName = 'test-db',
	dbHost = 'localhost',
	dbPort = 27017,
	mongoServer = new mongo.Server(dbHost,dbPort,{}),
	db = new mongo.Db(dbName, mongoServer, {w: 'majority', auto_reconnect: true}),
	testData;
var tempData;
var qStoreData;


//init
db.open(function(err){
	fatalError(err);
	db.createCollection("testData", function(err2, collection){
		fatalError(err2);
		testData = collection;
	});

	db.createCollection("qStoreData", function(err3, collection){
		fatalError(err3);
		qStoreData = collection;
	});

	db.createCollection("tempData", function(err3, collection){
		fatalError(err3);
		tempData = collection;
	});


});



/**
 * 	Server listening on port 8000
 */
var port = process.env.PORT || 8000;
server.listen(port, function() {
    logMessage('Server running on port' + port);
});


/**
 * 	Serving client connections
 */
io.sockets.on('connection', function(socket){
	logMessage('New Client connected with socket.id: '+ socket.id);
	allClients.push(socket.id);
	++connCounter;
	subscribedTo.set(socket.id, []);
	logMessage('Total connections:' + connCounter);
	socket.emit('connection', {status:'OK'});

	socket.on('create', function(query){
		logMessage('Recieved Create query with qid: ' + query.qid + 'data: ' + JSON.stringify(query.data));
		testData.insert(query.data, {w:1}, function(err, result){
			fatalError(err);
			var newdid = new ObjectId(result[0]._id);
			var clist = []
			subscriptions.set(newdid.toHexString(), clist.push(socket.id));
			subscribedTo.set(socket.id, newdid);

			//INSERT INTO TEMP COLLECTION TO RERUN QUERIES
			tempData.insert(query.data, {w:1}, function(temperr, tempresult){
				fatalError(err);
				socket.emit('create', {qid: query.qid, data: {did: newdid.toHexString(), doc: result[0]}, status: 'OK'});
				queryPool.forEach(function(value, key){
					var repeatQ = value.qString;
					var toNotify = value.clients;

					//RERUN QUERIES
					tempData.find(repeatQ.criteria).toArray(function(err, valNotify){
						fatalError(err);
						if (valNotify.length != 0){
							console.log(value);
							console.log(key);
							toNotify.forEach(function(entry){
								logMessage("Notifying client: " + entry);
								io.sockets.to(entry).emit('notify-new', { seq: 1, data: {qid: key, did: newdid.toHexString(), doc: valNotify[0] }, status: 'OK' });
							});
							
						}
					});
				});
				tempData.remove({}, {w:1}, function(rm_rr, numRemoved){
					logMessage("Num records removed from tempData: " + numRemoved);
				});
			});
		});
	});

	socket.on('find', function(query){
		logMessage('Recieved Find query with qid: ' + query.qid + ' data: ' + JSON.stringify(query.criteria));
		testData.find(query.criteria).toArray(function(err, result){
				fatalError(err);
				addQuery(query.qid, query, socket.id);
				socket.emit('find', {qid: query.qid, data: {docs: result}, status: 'OK'});
		});
		
		
		//console.log(queryPool.size);

		/*else {
			logMessage('Found query with qid:' + query.qid);
			var result = queryPool.get(query.qid);
			socket.emit('message', {qid: query.qid, docs: result, status: 'OK'});
			addQuery(query.qid, query, socket.id, result);
			
		}*/

		/*				var count = tempData.count({}, function(e, c){
						logMessage('After insert num of objects in tempData. Count: ' + c);
					}); */

				/*,function(err_rm, numRemoved){
					fatalError(err_rm);
					var count = tempData.count({}, function(e, c){
						logMessage('Removed all objects from tempData. numRemoved: ' + numRemoved);
					});	
				});*/
				
	});


	socket.on('update', function(query){

	});

	socket.on('delete', function(query){

	});


	socket.on('disconnect', function(){
		logMessage('Client disconnected. Socket id: ' + socket.id + '\n');
		var i = allClients.indexOf(socket.id);
		if(i != -1) {allClients.splice(i, 1);}
		--connCounter;
	});
});

	
/*	socket.on('connection name', 
		function(user){
			testData.insert({client:user.name});
			testData.find().toArray(function(err, docs){
			fatalError(err);
			logMessage('Found docs');
			console.dir(docs);
		}); 
		io.sockets.emit('new user', user.name + " has joined.");
	});*/





