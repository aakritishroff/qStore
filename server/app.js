'use strict'

var express = require('express');
var path = require('path');
var app = function(req, res) {
    var filePath = '.' + req.url;
    if (filePath == './') {
        filePath = './index.html';
    }
    
    path.exists(filePath, function(exists) {
        if (exists) {
            fs.readFile(filePath, function(err, data) {
                if (err) {
                    res.writeHead(500);
                    res.end('Error loading index.html');
                } else {                
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end(data, 'utf-8');
                }
            });
        } else {
            res.writeHead(404);
            res.end();
        }
    });
}


var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
var _ = require('underscore');
var fs = require('fs');

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

var addClient = function(did, client){
	if (subscriptions.has(did)){
		var clients = subscriptions.get(did);
		if (clients.indexOf(client) == -1){
			clients.push(client);
			subscriptions.set(did, clients);
		}
	} else {
		var clients = [];
		clients.push(client);
		subscriptions.set(did, clients);
	}
};

var addDid = function(client, did){
	if (subscribedTo.has(client)){
		var dids = subscribedTo.get(client);
		if (dids.indexOf(did) == -1){
			dids.push(did);
			subscribedTo.set(client, dids);
		}
	} else {
		var dids = [];
		dids.push(did);
		subscribedTo.set(did, dids);
	}
}

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
		testData.insert(JSON.parse(query.data), {w:1}, function(err, result){
			fatalError(err);
			var newdid = new ObjectId(result[0]._id);
			var clist = [];
			clist.push(socket.id);
			subscriptions.set(newdid.toHexString(), clist);
			addDid(socket.id, newdid.toHexString());
			//subscribedTo.set(socket.id, newdid);

			//INSERT INTO TEMP COLLECTION TO RERUN QUERIES
			tempData.insert(query.data, {w:1}, function(temperr, tempresult){
				fatalError(err);
				socket.emit('create', {qid: query.qid, data: result[0], status: 'OK'});
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
								logMessage("Notifying client about new object: " + entry);
								if (subscribedTo.has(entry)){
									io.sockets.to(entry).emit('notify-new', {qid: key, data: valNotify[0], status: 'OK' });
								}	
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
                logMessage('status: ' + err + ' result: ' + JSON.stringify(result));
				fatalError(err);
				addQuery(query.qid, query, socket.id);
				socket.emit('find', {qid: query.qid, data: result, status: 'OK'});
				result.forEach(function(entry){
					var newObj = new ObjectId(entry._id);
					var newdid = newObj.toHexString();
					addClient(newdid, socket.id);
					addDid(socket.id, newdid); 
				});
		});			
	});


	socket.on('update', function(query){
		logMessage('Recieved Update query with qid: ' + query.qid + ' data: ' + JSON.stringify(query.data) + ' criteria: ' + JSON.stringify(query.criteria));
		var dids = [];
		testData.find(query.criteria).toArray(function(err2, before){
			before.forEach(function(entry){
				dids.push(entry._id);
			});
		});
		testData.update(criteria, {$set: query.data}, {multi:true}).toArray(function(err, writeset){
			fatalError(err);
			socket.emit('update', {qid: query.qid, status: 'OK'});
			dids.forEach(function(id){
				testData.find({_id: id}).toArray(function(errfind, newEntry){
					fatalError(errfind);
					if (subscriptions.has(id.toHexString())){
						var toNotify = subscriptions.get(id.toHexString())
						toNotify.forEach(function(client){
							logMessage("Notifying client about update: " + client);
							if (subscribedTo.has(client)){
								io.sockets.to(client).emit('notify-update', {data: newEntry[0], status: 'OK' });
							}	
						});
					}
				});
			});
		});
	});
			
	socket.on('delete', function(query){

	});


	socket.on('disconnect', function(){
		logMessage('Client disconnected. Socket id: ' + socket.id + '\n');
		var i = allClients.indexOf(socket.id);
		if(i != -1) {allClients.splice(i, 1);}
		subscribedTo.delete(socket.id);
		--connCounter;
	});
});

	


