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
      client1.emit('create', {qid:'1', data:JSON.stringify({'author':'alice', 'post':'alicepost1'})});

  	
      var client2 = io.connect(socketURL, options);

      client2.on('connect', function(data){
        client2.emit('create', {qid:'2', data:JSON.stringify({'author':'bob', 'post':'alicepost2'})});
      });

      client2.on('create', function(response){
        numObj += 1;
        response.qid.should.equal('2');
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
      client1.emit('find', {qid:'1', criteria:{'author': 'alice'}});

      client2.on('connection', function(data){
        client2.emit('find', {qid:'1', criteria:{'author': 'alice'}});
      });

      client3.on('connection', function(data){
        client3.emit('find', {qid:'2', criteria:{'author': 'bob'}});
      });

    });

    client1.on('find', function(response){
    response.qid.should.equal('1');
    response.status.should.equal('OK');
    var data = response.data;
    data[0].should.have.property('author');
    data[0].author.should.equal('alice');
    client1.disconnect();

   });

  client2.on('find', function(response){
        response.qid.should.equal('1');
        response.status.should.equal('OK');
        var docs = response.data
        docs[0].should.have.property('author');
        docs[0].author.should.equal('alice');
        client2.disconnect();
  });

  client3.on('find', function(response){
        response.qid.should.equal('2');
        response.status.should.equal('OK');
        var docs = response.data
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
      client1.emit('create', {qid:'100', data:JSON.stringify({author:'alice', post:'alicepost5'})});
      client1.emit('create', {qid:'200', data:JSON.stringify({author:'bob', post:'bob6'})});
      client2.on('connection', function(data){
        client3.on('connection', function(data){
          client1.emit('find', {qid:'10', criteria:{'author': 'alice'}});
          client1.emit('create', {qid:'101', data:JSON.stringify({author:'alice', post:'alicepost7'})});
          client3.emit('find', {qid:'10', criteria:{'author': 'alice'}});
          client1.emit('create', {qid:'102', data:JSON.stringify({author:'alice', post:'alicepost2'})});
          client2.emit('create', {qid:'103', data:JSON.stringify({author:'alice', post:'alicepost3'})});
       });
      });
      
    });

    client1.on('create', function(response){
      //response.qid.should.equal('3');
      response.status.should.equal('OK');
    });

    client1.on('find', function(response){
      response.qid.should.equal('10');
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
      qid.should.equal('10');
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
      qid.should.equal('10');
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

  it('Update queries, and find value', function(done){
    var client1 = io.connect(socketURL, options);
    var numUpdate = 1;
    client1.on('connection', function(data){
      client1.emit('create', {qid:'1', data:JSON.stringify({author:'alice', post:'alicepost1'})});
      client1.emit('create', {qid:'2', data:JSON.stringify({author:'bob', post:'bobpost2'})});
      client1.emit('update', {qid:'3', criteria:{'author': 'alice'}, data:{post:'changed_alicepost1'}});
      client1.emit('update', {qid:'4', criteria:{'author': 'bob'}, data:{post:'changed_bobpost2'}});

    });

    client1.on('update', function(response){
      console.log("here");
      response.status.should.equal('OK');
      numUpdate += 1;
      if (numUpdate == 2){
        client1.disconnect();
        done();
      }
    });
  });

 /* it('Notify-updates work correctly', function(done){
    var client1 = io.connect(socketURL, options);
    var client2 = io.connect(socketURL, options);
    var numClient3 = 0;
    var numClient1 = 0;
    client1.on('connection', function(data){
      //client1.emit('create', {qid:'500', data:JSON.stringify({name:'alice', course: '6858', grade: 'B'})});
      client1.emit('create', {qid:'501', data:JSON.stringify({name:'bob', course: '6858', grade: 'A'})});
      //client1.emit('create', {qid:'502', data:JSON.stringify({name:'alice', course: '6830', grade: 'A'})});
      //client1.emit('create', {qid:'503', data:JSON.stringify({name:'eve', course: '6858', grade: 'B'})});
      client2.on('connection', function(data){
          client2.emit('update', {qid:'504', data:{grade: 'F'}, criteria:{'name': 'bob'}});
          //client2.emit('update', {qid:'505', data:{grade: 'A'}, criteria:{'name': 'alice'}});
          //client2.emit('update', {qid:'506', data:{name:'eve', course:'6830', grade:'F'}, criteria:{'name': 'eve'}});
       });
    });


/*    client2.on('update', function(response){
      console.log("Update received");
      response.status.should.equal('OK');
      var dids = response.dids;
      if (response.qid == 504){
        dids.length.should.equal(1);
      }
     /if (response.qid == 505){
        dids.length.should.equal(2);
      }
      
      if (response.qid == 506){
        dids.length.should.equal(1);
      }
    });
 
    client1.on('notify-update', function(response){
      console.log("Notify-update received");
      client1.disconnect();
      client2.disconnect();
      done();
    });

  });*/


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