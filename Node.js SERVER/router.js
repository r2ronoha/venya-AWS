function route(handle, pathname, response, request, dbcnx, db) {
	console.log("About to route request a for " + pathname + " to dbcnx " + dbcnx + " and db " + db);
	if (typeof handle[pathname] === 'function') {
		handle[pathname](response, request, dbcnx, db); 
	} else {
		console.log("No request handler found for " + pathname); 
		var body = "{\n\"status\": \"ERROR\",\n" +
					"\"errormessage\": \"path " + pathname + " not found\"\n}";
		response.writeHead(404, {"Content-Type": "text/plain", "Access-Control-Allow-Origin" : "*"}); 
		response.write(body);
		response.end();
	}
}

exports.route = route;