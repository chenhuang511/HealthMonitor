var net = require('net');

var tcpPort = 4445;
var tcpServer = net.createServer(function(client) {
	
	client.write("Wellcome!");
	var ip = client.remoteAddress;

	// Waiting for data from the client.
	client.on('data', function(data) {
		console.log('received data: ' + data.toString());
	});

	// Closed socket event from the client.
	client.on('end', function() {
		console.log('client disconnected');
	});
});

tcpServer.on('error',function(err){
	console.log(err);
	tcpServer.close();
});

tcpServer.listen(tcpPort);
console.log('tcp server started on port: ' + tcpPort);