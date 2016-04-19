var http = require('http');
var net = require('net');
var path = require('path');
var fs = require('fs');
var randomstring = require('randomstring');
var mysql = require("mysql");

//Create Database
var pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: 'pl,okmijn',
    database: 'status',
    debug: false,
    connectionLimit: 1000000
});

var connection = mysql.createConnection(
    {
        host: 'localhost',
        user: 'root',
        password: 'pl,okmijn@',
        database: 'Status',
    });

var httpPort = 4446;

var _socket;

// Create an HTTP server.
var srv = http.createServer(function (req, res) {
    console.log('request starting...');

    var filePath = '.' + req.url;
    console.log('filePath: ' + req.url);
    if (filePath == './')
        filePath = './realtime-demo.html';

    var extname = path.extname(filePath);
    var contentType = 'text/html';
    switch (extname) {
        case '.js':
            contentType = 'text/javascript';
            break;
        case '.css':
            contentType = 'text/css';
            break;
    }

    fs.exists(filePath, function (exists) {
        if (exists) {
            fs.readFile(filePath, function (error, content) {
                if (error) {
                    res.writeHead(500);
                    res.end();
                } else {
                    res.writeHead(200, {
                        'Content-Type': contentType
                    });
                    res.end(content, 'utf-8');
                }
            });
        } else {
            res.writeHead(404);
            res.end();
        }
    });
});

gw_srv = require('socket.io').listen(srv);
srv.listen(httpPort);
console.log('http server started on port: ' + httpPort);

gw_srv.sockets.on('connection', function (socket) {
    _socket = socket;

    // //send all status from database to client
    // get_all_status(socket);
    socket.on('init', function () {
        console.log('init');
        get_all_status(_socket);
    });

    socket.on('disconnect', function () {
        console.log('closing');
        // gw_srv.close();
        //srv.close();
    });

}); // On connection

//tcp server
var tcpClients = [];
var dataReceived = [];
var tcpPort = 4445;
var tcpServer = net.createServer(function (client) {
    tcpClients.push(client);
    //client.write("Wellcome!");
    ////client info
    var ip = client.remoteAddress;

    // Waiting for data from the client.
    client.on('data', function (data) {
        console.log('received data: ' + data.toString());

        //parse data
        var parsed = data.toString().split(",");
        var status = parsed[1];
        if (status.toUpperCase() == 'BP') {
            var id = parsed[0];
            var lp = parsed[2];
            var hp = parsed[3];
            var hr = parsed[4];
            var ptime = new Date().toLocaleString();
            add_p_status(id, lp, hp, hr, ptime, function(res)
            {
                if (res) {
                    console.log('saved: ' + data);
                } else {
                    console.log('save ' + data + 'error');
                }

                // Write data to the http client.
                if (_socket) {
                    var _time = new Date().toLocaleString();
                    _socket.volatile.emit('pdata', {
                        id: id,
                        lowP: lp,
                        highP: hp,
                        heartrate: hr,
                        time: ptime
                    });
                }
            });
        } else if (status.toUpperCase() == 'TEMP') {
            var id = parsed[0];
            var temp = parsed[2];
            var ttime = new Date().toLocaleString();
            add_t_status(id, temp, ttime, function(res)
            {
                if (res) {
                    console.log('saved: ' + data);
                } else {
                    console.log('save ' + data + 'error');
                }

                // Write data to the http client.
                if (_socket) {
                    var _time = new Date().toLocaleString();
                    _socket.volatile.emit('tdata', {
                        id: id,
                        temp: temp,
                        time: ttime
                    });
                }
            });
        }
    });

    // Closed socket event from the client.
    client.on('end', function () {
        tcpClients.splice(tcpClients.indexOf(client), 1);
        console.log('client disconnected');
    });
});

tcpServer.on('error', function (err) {
    console.log(err);
    tcpServer.close();
});

tcpServer.listen(tcpPort);
console.log('tcp server started on port: ' + tcpPort);

//get all status from database
var get_all_status = function (socket) {
    // var result = '';
    if (!socket)
        console.log('socket null');

    pool.getConnection(function (err, connection) {
        if (err) {
            return;
        }

        connection.query("select * from tcpstatus", function (err, rows) {
            if (!err) {
                console.log("query ok");
            }
            socket.volatile.emit('begin', rows);
            // console.log(rows);
        });

        connection.on('error', function (err) {
            return;
        });
    });

    // return result;
};

//case: pressure
var add_p_status = function (id, lowP, highP, heartrate, ptime, callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            // connection.release();
            callback(false);
            return;
        }

        //check id exist
        connection.query("select id from `newstatus` where id='" + id + "'", function (err, rows) {
            if (rows[0] != null) {
                connection.query("update newstatus set `lp` = '" + lowP + "', `hp` = '" + highP + "', `hr` = '" + heartrate + "', `ptime` = '" + ptime + "' where `id` = '" + id + "'", function (err, rows) {
                    if (!err) {
                        callback(true);
                    }
                });
            } else {
                connection.query("INSERT INTO `newstatus` (`id`,`lp`,`hp`,`hr`,`ptime`) VALUES ('" +
                    id + "','" + lowP + "','" + highP + "','" + heartrate + "','" + ptime + "')", function (err, rows) {
                    if (!err) {
                        callback(true);
                    }
                });
            }
        });

        connection.on('error', function (err) {
            callback(false);
            return;
        });
    });
};

//case: temperature
var add_t_status = function (id, temp, ttime, callback) {
    pool.getConnection(function (err, connection) {
        if (err) {
            // connection.release();
            callback(false);
            return;
        }

        //check id exist
        connection.query("select id from `newstatus` where id='" + id + "'", function (err, rows) {
            if (rows[0] != null) {
                connection.query("update newstatus set `temp` = '" + temp + "', `ttime` = '" + ttime + "' where `id` = '" + id + "'", function (err, rows) {
                    if (!err) {
                        callback(true);
                    }
                });
            } else {
                connection.query("INSERT INTO `newstatus` (`id`,`temp`,`ttime`) VALUES ('" + id + "','" + temp + "','" + ttime + "')", function (err, rows) {
                    if (!err) {
                        callback(true);
                    }
                });
            }
        });

        connection.on('error', function (err) {
            callback(false);
            return;
        });
    });
};
