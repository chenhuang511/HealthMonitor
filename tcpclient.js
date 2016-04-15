var serverPort = 4445;
var server = 'localhost';
var net = require('net');

var ids = Array('d11', 'c22', 'f54', 'y45');
var status = Array('BP', 'TEMP');

console.log('connecting to server...');
var client = net.connect({server:server,port:serverPort},function(){
	console.log('client connected');
	console.log('send data to server');
	var id = ids[Math.floor(Math.random()*ids.length)];
	//client.write(id + ',BP' + ',' + Math.random() * 100 + ',' + Math.random() * 100 + ',' + Math.random() * 100);
	client.write(id + ',TEMP' + ',' + Math.random() * 100);
	client.end();
});

client.on('data', function(data) {
	console.log('received data: ' + data.toString());
	client.end();
});

client.on('error',function(err){
	console.log(err);
});

client.on('end', function() {
	console.log('client disconnected');
});
