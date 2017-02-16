var http = require("http");
var url = require("url");
var mongodbcnx;
var mongodb;

function start(route, handle, dbcnx, db) {
	mongodbcnx = dbcnx;
	mongodb = db;
	function onRequest(request, response, mongodbcnx, mongodb) {
		var pathname =  url.parse(request.url).pathname;
		console.log("Request for " + pathname + " received");
		route(handle, pathname, response, request, dbcnx, db);
	}
	
	http.createServer(onRequest).listen(8888);
	console.log("Server running at " + mongodbcnx);
}

exports.start = start;
