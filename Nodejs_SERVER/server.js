var http = require("http");
var url = require("url");
var mongodbcnx;
var mongodb;
// required for connection to DB for timestamp management
/*var customer = require('./customer.js');
var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var document = require('mongodb').document;
var BSON = require('mongodb').BSON;
var mycollection = 'customers';*/

/*function sessionTimeoutManagement(dbcnx,db) {

	var timeout = 30 * 60; // timeout = 30 minutes = 30*60 seconds (timestamp in seconds)
	while (true) {
		customer.doGetFullData(dbcnx, db, query, function(documents) {
			if (documents != null) {
				for ( document in documents) {
					var timestamp = document[sessionid].timestamp;
					if ( timestamp != 0 ) {
						var now = Math.round(new Date().getTime() / 1000);
						var sessionTime = now - timestamp;
						if (sessionTime > timeout) {
							var updateQuery = '';
							customer.
						}
					}
				}
			} else {
				console.log("[server.sessionTimeoutManagement] EMPTY document returned by DB");
			}
		}
	}
}*/

function start(route, handle, dbcnx, db) {
	mongodbcnx = dbcnx;
	mongodb = db;
	function onRequest(request, response, mongodbcnx, mongodb) {
		var pathname =  url.parse(request.url).pathname;
		console.log("[server] Request for " + pathname + " received");
		//console.log("[server] request = " + JSON.stringify(request));
		//console.log("[server] response = " + JSON.stringify(response));
		//console.log("[server] pathname = " + pathname);
		for (var field in request) {
			console.log("[server] request." + field);
		}
		route(handle, pathname, response, request, dbcnx, db);
	}
	
	http.createServer(onRequest).listen(8888);
	console.log("Server running at " + mongodbcnx);
	
	var manageSessionPath = "/sessionTimeoutManagemt";
}

exports.start = start;
