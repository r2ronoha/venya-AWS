var http = require("http");
var url = require("url");
var mongodbcnx;
var mongodb;
var requestHandlers = require("./requestHandlers.js");

function start(route, handle, dbcnx, db) {
	mongodbcnx = dbcnx;
	mongodb = db;
	function onRequest(request, response, mongodbcnx, mongodb) {
		var pathname =  url.parse(request.url).pathname;
		console.log("[server] " + Math.round(new Date().getTime() / 1000) + " Request for " + pathname + " received");
		route(handle, pathname, response, request, dbcnx, db);
	}
	
	http.createServer(onRequest).listen(8888);
	//console.log("[server] " + Math.round(new Date().getTime() / 1000) + " Server running at " + mongodbcnx);
	
	//setTimeout(requestHandlers.sessionTimeoutManagement,15000,dbcnx,db);
	requestHandlers.sessionTimeoutManagement(dbcnx,db);
}

exports.start = start;
