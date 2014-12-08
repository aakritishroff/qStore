'use strict'

var express = require('express');
var app = express();


var server = require('http').createServer(app);
var io = require('socket.io').listen(server);

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

var addQuery = function(qid, qString, client, docs){
	var qData = queryPool.get(qid);
	if (qData != undefined) {
		console.log(qData);
		qData.clients.push(client);
	}
	queryPool.set(qid, new Query(qString, client, docs));
};

var Query = function(qString, client, docs){
	this.qString = qString;
	this.clients = []//new Set();
	this.clients.push(client);
	this.docs = docs;
};

//setup mongodb

var mongo = require('mongodb'),
	ObjectId = require('mongodb').ObjectID,
	dbName = 'test-db',
	dbHost = 'localhost',
	dbPort = 27017,
	mongoServer = new mongo.Server(dbHost,dbPort,{}),
	db = new mongo.Db(dbName, mongoServer, {w: 'majority', auto_reconnect: true}),
	testData,
	qStoreData;


//init
db.open(function(err){
	fatalError(err);
	db.collection("testData", function(err2, collection){
		fatalError(err2);
		testData = collection;
	});

	db.collection("qStoreData", function(err3, collection){
		fatalError(err3);
		qStoreData = collection;
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
	logMessage('New Client connected...\n'+socket.id);
	allClients.push(socket.id);
	++connCounter;
	subscribedTo.set(socket.id, []);
	logMessage('Total connections:' + connCounter);

	socket.on('create', function(query){
		if (query.op !== 'create'){ fatalError('Op mismatch. Incorrect op specified in create query.'); }
		logMessage('Recieved Create query with qid:' + query.qid + 'data: ' + query.data);
		testData.insert(query.data, {w:1}, function(err, result){
			fatalError(err);
			console.log(result[0]._id);
			var newdid = new ObjectId(result[0]._id);
			var clist = []//new Set();
			subscriptions.set(newdid.toHexString(), clist.push(socket.id));
			subscribedTo.set(socket.id, newdid);
			socket.emit('message', {qid: query.qid, did: newdid.toHexString(), status: 'OK'});
			//rerun queries
			/*queryPool.forEach(function(value, key){

			});*/
		});

	});

	socket.on('find', function(query){
		if (query.op !== 'find'){ fatalError('Op mismatch. Incorrect op specified in find query.'); }
		logMessage('Recieved Find query with qid:' + query.qid + 'data: ' + query.data);
		
		if (!queryPool.has(query.qid)){
			testData.find(query.data).toArray(function(err, result){
				fatalError(err);
				socket.emit('message', {qid: query.qid, docs: result, status: 'OK'});
				addQuery(query.qid, query, socket.id, result);
				console.dir(result);
			});
		} else {
			var result = queryPool.get(query.qid);
			socket.emit('message', {qid: query.qid, docs: result, status: 'OK'});
			addQuery(query.qid, query, socket.id, result);
			console.dir(result);
		}
	});

	socket.on('update', function(query){

	});

	socket.on('delete', function(query){

	});


	socket.on('disconnect', function(){
		logMessage(queryPool.get('3'));
		logMessage('Client disconnected...\n');
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





