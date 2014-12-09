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
    var numObj = 0;
  	var client1 = io.connect(socketURL, options);

  	client1.on('connect', function(data){
      client1.emit('create', {qid:'1', data:{author:'alice', post:'alicepost1'}});

  	
      var client2 = io.connect(socketURL, options);

      client2.on('connect', function(data){
        client2.emit('create', {qid:'2', data:{author:'bob', post:'alicepost2'}});
        console.log({qid:'2', data:{author:'bob', post:'alicepost2'}});
      });

      client2.on('create', function(response){
        numObj += 1;
        response.qid.should.equal('2');
        console.log(response);
        client2.disconnect();
      });
    });

    client1.on('create', function(response){
    numObj += 1;
    response.qid.should.equal('1');
    response.status.should.equal('OK');
    client1.disconnect();
    done();
   });
  });

  it('Finds results and adds to queryPool correctly', function(done){
    var client1 = io.connect(socketURL, options);
    var client2 = io.connect(socketURL, options);
    var client3 = io.connect(socketURL, options);
    client1.on('connection', function(data){
      client1.emit('find', {qid:'1', criteria:{"author": "alice"}});

      client2.on('connection', function(data){
        client2.emit('find', {qid:'1', criteria:{"author": "alice"}});
      });

      client3.on('connection', function(data){
        client3.emit('find', {qid:'2', criteria:{"author": "bob"}});
      });

    });

    client1.on('find', function(response){
    response.qid.should.equal('1');
    response.status.should.equal('OK');
    var docs = response.data.docs;
    docs[0].should.have.property('author');
    docs[0].author.should.equal('alice');
    client1.disconnect();

   });

  client2.on('find', function(response){
        response.qid.should.equal('1');
        response.status.should.equal('OK');
        var docs = response.data.docs;
        docs[0].should.have.property('author');
        docs[0].author.should.equal('alice');
        client2.disconnect();
  });

  client3.on('find', function(response){
        response.qid.should.equal('2');
        response.status.should.equal('OK');
        var docs = response.data.docs;
        docs[0].should.have.property('author');
        docs[0].author.should.equal('bob');
        client3.disconnect();
        done();
    });
  });

  it('Rerun queries for newly created objects', function(done){
    var client1 = io.connect(socketURL, options);
    var client2 = io.connect(socketURL, options);
    var client3 = io.connect(socketURL, options);
    var numClient3 = 0;
    var numClient1 = 0;
    client1.on('connection', function(data){
      client2.on('connection', function(data){
      client3.on('connection', function(data){
        client2.emit('create', {qid:'4', data:{author:'alice', post:'alicepost3'}});
        client1.emit('create', {qid:'3', data:{author:'alice', post:'alicepost2'}});
        client1.emit('find', {qid:'1', criteria:{"author": "alice"}});
        client3.emit('find', {qid:'1', criteria:{"author": "alice"}});
       });
      });
      
    });

    client1.on('create', function(response){
      response.qid.should.equal('3');
      response.status.should.equal('OK');
    });

    client1.on('find', function(response){
      response.qid.should.equal('1');
      response.status.should.equal('OK');
      var docs = response.data.docs;
      docs[0].should.have.property('author');
      docs[0].author.should.equal('alice');
    });

    client3.on('notify-new', function(response){
      response.status.should.equal('OK');
      var qid = response.data.qid;
      var did = response.data.did;
      var doc = response.data.doc;
      qid.should.equal('1');
      doc.should.have.property('author');
      doc.should.have.property('post');
      doc.author.should.equal('alice');
      numClient3 += 1
      if (numClient1 == 1 & numClient3 == 1){
        client2.disconnect();
        client3.disconnect();
        client2.disconnect();
        done();
      }
    });

    client1.on('notify-new', function(response){
      response.status.should.equal('OK');
      var qid = response.data.qid;
      var did = response.data.did;
      var doc = response.data.doc;
      qid.should.equal('1');
      doc.should.have.property('author');
      doc.should.have.property('post');
      doc.author.should.equal('alice');
      numClient1 += 1;
      if (numClient1 == 1 & numClient3 == 1){
        client2.disconnect();
        client3.disconnect();
        client2.disconnect();
        done();
      }
   
    });

  });

/*  var numObj = 0;
  client1.on('message', function(data){
    numObj += 1;

    if(numObj === 3){
        data.qid.should.equal('1');
        console.log(data);
        client1.disconnect();
        done();
      }
    });*/
});