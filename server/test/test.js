var should = require('should');
var io = require('socket.io-client');

var socketURL = 'http://localhost:8000';

var options ={
  transports: ['websocket'],
  'force new connection': true
};

var chatUser1 = {'name':'Alice'};
var chatUser2 = {'name':'Bob'};
var chatUser3 = {'name':'Dana'};

describe("Test Server",function(){
	it('Creates 2 objects correctly', function(done){
  		var client1 = io.connect(socketURL, options);

  	client1.on('connect', function(data){
    //client1.emit('create', {op: 'create', qid:'1', data:{author:'alice', post:'helloworld!'}});
    //client1.emit('create', {op: 'create', qid:'2', data:{author:'bob', post:'post2'}});
    client1.emit('find', {op: 'find', qid:'3', data:{}});


	/* Since first client is connected, we connect
    the second client. 
    var client2 = io.connect(socketURL, options);

    client2.on('connect', function(data){
      client2.emit('connection name', chatUser2);
    });

    client2.on('new user', function(usersName){
      usersName.should.equal(chatUser2.name + " has joined.");
      client2.disconnect();
    });*/

  });

  var numObj = 0;
  client1.on('message', function(data){
    numObj += 1;

    if(numObj === 3){
      data.qid.should.equal('3');
      console.log(data);
      client1.disconnect();
      done();
    }
  });
});
});