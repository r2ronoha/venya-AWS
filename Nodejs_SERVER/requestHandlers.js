var querystring = require("querystring"); 
var url = require("url");
var http = require("http");
var fs = require("fs");
//var formidable = require("formidable");
var sys = require("sys");
var customer = require("./customer.js");
var nodemailer = require("nodemailer");
//var smtpTransport = require("nodemailer-smtp-transport");
var ObjectId = require('mongodb').ObjectId;

var exec = require("child_process").exec;
var myUndefined = [ undefined, "undefined" ];
/*
var attributesFix = {};
customer.getAttFix( function(attFix) {
	attributesFix = attFix;
});
*/
var attributesDefault = {};
customer.getAttDefault( function(attDef) {
	attributesDefault = attDef;
});	

function getFullCustomerData(response, request, dbcnx, db) {	
	console.log("request.url = " + request.url);
	
	var action = url.parse(request.url, true).query.action;
	var username = url.parse(request.url, true).query.username;
	var password = url.parse(request.url, true).query.password;
	var id = url.parse(request.url, true).query.id;
	
	if ( ( myUndefined.indexOf(id) >= 0 && myUndefined.indexOf(username) >= 0 ) || ( action == "login" && ( myUndefined.indexOf(username) >= 0 || myUndefined.indexOf(password) >= 0 ) ) || ( action != "login" && myUndefined.indexOf(id) >= 0 ) ) {
	//if ( ( id == undefined && username == undefined ) || ( action == "login" && ( username == undefined || password == undefined ) ) || ( action != "login" && id == undefined ) ) {
		response.writeHead(400, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
		var body = {};
		body["status"] = "ERROR";
		body["errormessage"] = "Bad URL";
		var respBody = JSON.stringify(body);
		response.write(respBody, function(err) { response.end(); } );
		return;
	}
	
	var noUser = 0;
	var query;	
	var queryUsername = {};
	
	function queryAndRespond(query) {
		customer.doGetFullData(dbcnx, db, query, function(document) {
			if (document != null) {
				response.writeHead(200, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "SUCCESS";
				body["action"] = action;
				//response.write(body);
				for ( var field in document ) {
					body[field] = document[field];
				}
				var respBody = JSON.stringify(body);
				console.log("[requestHandlers.getFullCustomerData.q&R] respBody = " + respBody);
				response.write(respBody, function(err) { response.end(); } );
			} else {
				response.writeHead(401, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "Wrong credentials";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			}
		});
	}
	
	if ( action == "login" ) {
		queryUsername["username.value"] = username;
		customer.doGet(dbcnx, db, queryUsername, function(userAtt) {
			if ( userAtt == null ) {
				noUser = 1;
				response.writeHead(401, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "User not registered";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else {
				query = { 
					"username.value":  username, 
					"password.value": password
				}
				queryAndRespond(query);
			}
		});
	} else {
		console.log("query = { \"_id\": ObjectId(" + id + ") }");
		query = { "_id": ObjectId(id) }
		queryAndRespond(query)
	}
}

function getCustomer(response, request, dbcnx, db) {	
	console.log("request.url = " + request.url);
	
	var action = url.parse(request.url, true).query.action;
	var username = url.parse(request.url, true).query.username;
	var password = url.parse(request.url, true).query.password;
	var id = url.parse(request.url, true).query.id;
	
	if ( ( myUndefined.indexOf(id) >= 0 && myUndefined.indexOf(username) >= 0 ) || ( action == "login" && ( myUndefined.indexOf(username) >= 0 || myUndefined.indexOf(password) >= 0 ) ) || ( action != "login" && myUndefined.indexOf(id) >= 0 ) ) {
	//if ( ( id == undefined && username == undefined ) || ( action == "login" && ( username == undefined || password == undefined ) ) || ( action != "login" && id == undefined ) ) {
		response.writeHead(400, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
		var body = {};
		body["status"] = "ERROR";
		body["errormessage"] = "Bad URL";
		var respBody = JSON.stringify(body);
		response.write(respBody, function(err) { response.end(); } );
		return;
	}
	
	var noUser = 0;
	var query;	
	var queryUsername = {};
	
	function queryAndRespond(query) {
		customer.doGet(dbcnx, db, query, function(attList) {
			if (attList != null) {
				response.writeHead(200, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "SUCCESS";
				body["action"] = action;
				//response.write(body);
				for ( var field in attList ) {
					body[field] = attList[field];
					console.log("[requestHandler.getCustomer.queryandRespond] field: \"" + field + "\" : \"" + JSON.stringify(body[field]) );
				}
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else {
				response.writeHead(401, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "Wrong credentials";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			}
		});
	}
	
	if ( action == "login" ) {
		queryUsername["username.value"] = username;
		customer.doGet(dbcnx, db, queryUsername, function(userAtt) {
			if ( userAtt == null ) {
				noUser = 1;
				response.writeHead(401, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "User not registered";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else {
				query = { 
					"username.value":  username, 
					"password.value": password
				}
				queryAndRespond(query);
			}
		});
	} else {
		console.log("query = { \"_id\": ObjectId(" + id + ") }");
		query = { "_id": ObjectId(id) }
		queryAndRespond(query)
	}
}

function createCustomer(response, request, dbcnx, db) {
	console.log("[requestHandler.createCustomer()] request.url = " + request.url);
	var action = "createcustomer";
	
	var insertQuery = {};
	for ( var field in url.parse(request.url, true).query ) {
		if ( url.parse(request.url, true).query[field] != "" ) {
			//var fieldQuery = { "fix": attributesFix[field], "value": url.parse(request.url, true).query[field] };
			var fieldQuery = { "fix": attributesDefault[field].fix, "value": url.parse(request.url, true).query[field] };
			insertQuery[field] = fieldQuery;
			console.log("[requestHandler.createCustomer()] inserted " + field + " : " + JSON.stringify(insertQuery[field]));
		}
	}
	
	console.log("[requestHandler.createCustomer()] Calling customer.doInsert\n[requestHandler.createCustomer()] dbcnx = " + dbcnx + " -- db = " + db + " insertQuery = " + JSON.stringify(insertQuery))
	
	customer.doInsert(dbcnx, db, insertQuery, function(query,exists,message){
		if ( exists == 0 ) {
			console.log("[requestHandler.createCustomer()] Calling customer.doGet\n[requestHandler.createCustomer()] query = " + JSON.stringify(query))
			customer.doGet(dbcnx, db, query, function(attList) {
				if (attList != null) {
					response.writeHead(200, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
					var body = {};
					body["status"] = "SUCCESS";
					body["action"] = action;
					//response.write(body);
					for ( var field in attList ) {
						body[field] = attList[field];
					}
					var respBody = JSON.stringify(body);
					response.write(respBody, function(err) { response.end(); } );
				} else {
					response.writeHead(500, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
					var body = {};
					body["status"] = "ERROR";
					body["errormessage"] = "Registration error";
					body["action"] = action;
					var respBody = JSON.stringify(body);
					response.write(respBody, function(err) { response.end(); } );
					//response.end();
				}
			})
		} else {
			response.writeHead(401, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
			var body = {};
			body["status"] = "ERROR";
			body["errormessage"] = message;
			body["action"] = action;
			var respBody = JSON.stringify(body);
			response.write(respBody, function(err) { response.end(); } );
		}
	});
}

function register(response, request, dbcnx, db) {
	console.log("request.url = " + request.url);
	var urlParams = url.parse(request.url, true).query;
	var action = urlParams["action"];
	var id = urlParams["id"];
	var surname = urlParams["surname"];
	var username = urlParams["username"];
	var email = urlParams["email"];
	var password = urlParams["password"];
	
	var checkIDquery = { "_id": ObjectId(id) };
	
	var updateQuery = {};
	for ( var field in url.parse(request.url, true).query ) {
		if ( field != "id" ) {
			//var fieldQuery = { "fix": attributesFix[field], "value": url.parse(request.url, true).query[field] };
			var fieldQuery = { "fix": attributesDefault[field].fix, "value": url.parse(request.url, true).query[field] };
			updateQuery[field] = fieldQuery;
		}
	}
	
	var checkUsernameQuery = { "$or": [ { "username.value": username }, { "email.value": email } ] };
	
	customer.doGet(dbcnx, db, checkIDquery, function(attList) {
		if ( attList == null ) {			
			response.writeHead(401, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
			var body = {};
			body["status"] = "ERROR";
			body["errormessage"] = "userid is not in the system. Please contact service provider.";
			body["action"] = action;
			var respBody = JSON.stringify(body);
			response.write(respBody, function(err) { response.end(); } );
		} else {
			if ( attList["surname"] != surname ){
				response.writeHead(401, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "userid and surname do not match (" + attList["surname"] + " vs " + surname + ")";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );				
			} else {
				customer.doGet(dbcnx, db, checkUsernameQuery, function(attList) {
					if ( attList != null && attList["username"] != attributesDefault["username"].value ) {
						var errormessage = ( attList["username"] == username ) ? "username already used" : "email already registered";
						response.writeHead(401, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
						var body = {};
						body["status"] = "ERROR";
						body["errormessage"] = errormessage;
						body["action"] = action;
						var respBody = JSON.stringify(body);
						response.write(respBody, function(err) { response.end(); } );					
					}else{
						customer.doUpdate(dbcnx, db, checkIDquery, updateQuery, function(err,checkIDquery){
							if ( err ) {
								response.writeHead(500, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
								var body = {};
								body["status"] = "ERROR";
								body["errormessage"] = err;
								body["action"] = action;
								var respBody = JSON.stringify(body);
								response.write(respBody, function(err) { response.end(); } );
							}else {
								customer.doGet(dbcnx, db, checkIDquery, function(attList) {
									//var username = urlParams["username"];
									//var email = urlParams["email"];
									//var password = urlParams["password"];
									console.log("[requestHandlers : register] username: " + username + ", password: " + password + ",  email: " + email);
									
									if ( attList != null && attList["username"] == username && attList["email"] == email && attList["password"] == password ) {
										response.writeHead(200, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
										var body = {};
										body["status"] = "SUCCESS";
										body["action"] = action;
										//response.write(body);
										for ( var field in attList ) {
											body[field] = attList[field];
										}
										var respBody = JSON.stringify(body);
										response.write(respBody, function(err) { response.end(); } );
									} else {
										response.writeHead(503, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
										var body = {};
										body["status"] = "ERROR";
										body["errormessage"] = "Registration failure: failed to checked info after update";
										body["action"] = action;
										var respBody = JSON.stringify(body);
										response.write(respBody, function(err) { response.end(); } );
									}
								})
							}
						});
					}
				});	
			}			
				
		}
	});
}

function getLostCredentials(response, request, dbcnx, db) {
	console.log("request.url = " + request.url);
	var optFields = ["name","password","username"];
	var urlParams = url.parse(request.url, true).query;
	
	var name = url.parse(request.url, true).query.name;
	var username = url.parse(request.url, true).query.username;
	var password = url.parse(request.url, true).query.password;
	var email = url.parse(request.url, true).query.email;
	
	//var query = { "email": { "fix": attributesFix["email"], "value": email } };
	var query = { "email.value": email };
	for ( var i = 0; i < optFields.length; i++ ) {
		var field = optFields[i];
		if ( urlParams[field] != undefined ) {
			var queryField = field + ".value";
			query[queryField] = urlParams[field];
		}
	}
	
	var credential = "password";
	if ( username == undefined ) credential = "username";
	console.log("LOOKING FOR : " + credential);
	
	customer.doGet(dbcnx, db, query, function(attList) {
		if ( attList == null ) {
			response.writeHead(401, {"Content-Type": "text/plain", "Access-Control-Allow-Origin" : "*"});
			var body = {};
			body["status"] = "ERROR";
			body["errormessage"] = "Account not found";
			var respBody = JSON.stringify(body);
			response.write(respBody, function(err) { response.end(); } );
		} else {
			var email = attList["email"];
			//var username = attList[credential];	
			// setup e-mail transporter
			var transporter = nodemailer.createTransport(smtpTransport({
				host: "smtp-mail.outlook.com",
				secureConnection: false,
				port: 587,
				auth: {
					user: "arturo_noha@hotmail.com",
					pass: "I1d9a0i6s1a3"
				}
			}));
			// setup e-mail data with unicode symbols
			var mailOptions = {
				from: '"VenYa" <admin@venya.com>', // sender address
				to: email, // list of receivers
				subject: 'Lost ' + credential, // Subject line
				text: 'Your ' + credential + ' is: ' + attList[credential], // plaintext body
				html: '<b>Your ' + credential + ' is ' + attList[credential] + '</b>' // html body
			};

			// send mail with defined transport object
			transporter.sendMail(mailOptions, function(error, info){
				if(error){
					var body = {};
					body["status"] = "ERROR";
					body["errormessage"] = "failed to send email to " + email;
					body[credential] = attList[credential];
					var respBody = JSON.stringify(body);
					response.writeHead(500, {"Content-Type": "text/plain", "Access-Control-Allow-Origin" : "*"});
					response.write(respBody, function(err) { response.end(); });
					return console.log(error);
				}
				console.log('Message sent: ' + info.response);			
				
				var body = {};
				body["status"] = "SUCCESS";
				body["errormessage"] = "credentials sent to " + email;
				body[credential] = attList[credential];
				var respBody = JSON.stringify(body);
				response.writeHead(200, {"Content-Type": "text/plain", "Access-Control-Allow-Origin" : "*"});
				response.write(respBody, function(err) { response.end(); });
			});
		}
	}); 
}

function updateSetting(response, request, dbcnx, db) {
	console.log("request.url = " + request.url);
	var urlParams = url.parse(request.url, true).query;
	var id = urlParams["id"];
	var field = urlParams["field"];
	var newvalue = urlParams["newvalue"];
	var oldvalue = urlParams["oldvalue"];
	var action = urlParams["action"];
	
	var updateQuery = {};
	if ( field == "address" ) {
		var address = newvalue.split(';');
		for ( var i in address ) {
			var part = address[i].split('=')[0];
			var value = address[i].split('=')[1];
			var updateQueryField = "address.value." + part;
			updateQuery[updateQueryField] = value;
		}
		console.log("[requestHandlers : updateSettings] Update address query string = " + JSON.stringify(updateQuery));
	} else {
		var updateQueryField = field + ".value";
		updateQuery[updateQueryField] = newvalue;
	}
	var query = { "_id": ObjectId(id) };
	
	function updateAndRespond(query, updateQuery) {
		customer.doUpdate(dbcnx, db, query, updateQuery, function(err,query) {
			if ( err ) {
				response.writeHead(500, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			}else {
				customer.doGet(dbcnx, db, query, function(attList) {
					var field = urlParams["field"];
					/*
					console.log("field AFTER doGet = " + field);
					console.log("field in URL AFTER doGet = " + urlParams["field"]);
					console.log("Checking after update:");
					console.log("Field: " + field + "\nnewvalue: " + newvalue + "\nattList[field]: " + attList[field]);
					*/
					//if ( attList != null && attList[field] == newvalue ) { ==> REMOVED TO HANDLE ADDRESS AS AN OBJECT
					if ( attList != null ) {
						response.writeHead(200, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
						var body = {};
						body["status"] = "SUCCESS";
						body["action"] = action;
						body["updatefield"] = field;
						//response.write(body);
						for ( var field in attList ) {
							body[field] = attList[field];
							if (field == "address") console.log(JSON.stringify(attList[field]));
						}
						var respBody = JSON.stringify(body);
						response.write(respBody, function(err) { response.end(); } );
					} else {
						response.writeHead(503, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
						var body = {};
						body["status"] = "ERROR";
						body["errormessage"] = "Update failure: failed to checked info after update";
						body["action"] = action;
						var respBody = JSON.stringify(body);
						response.write(respBody, function(err) { response.end(); } );
					}
				})
			}
		});			
	}
	
	if ( oldvalue != undefined ) {
		var checkQuery = { "_id": ObjectId(id) }
		checkQuery[updateQueryField] = oldvalue;
		console.log("\ncheckQuery" + JSON.stringify(checkQuery) + "\n");
		customer.doGet(dbcnx, db, checkQuery, function(attList) {
			if ( attList == null ) {
				noUser = 1;
				response.writeHead(401, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "The info entered does not match";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else {
				updateAndRespond(query, updateQuery);
			}
		});
	} else {
		updateAndRespond(query, updateQuery)
	}
}

function updateSetting_extraManualCheck(response, request, dbcnx, db) {
	console.log("request.url = " + request.url);
	var urlParams = url.parse(request.url, true).query;
	var id = urlParams["id"];
	var field = urlParams["field"];
	var newvalue = urlParams["newvalue"];
	var oldvalue = urlParams["oldvalue"];
	var action = urlParams["action"];
	
	var updateQuery = {};
	if ( field == "address" ) {
		var address = newvalue.split(';');
		for ( var i in address ) {
			var part = address[i].split('=')[0];
			var value = address[i].split('=')[1];
			var updateQueryField = "address.value." + part;
			updateQuery[updateQueryField] = value;
		}
		console.log("[requestHandlers : updateSettings] Update address query string = " + JSON.stringify(updateQuery));
	} else {
		var updateQueryField = field + ".value";
		updateQuery[updateQueryField] = newvalue;
	}
	var query = { "_id": ObjectId(id) };
	
	function updateAndRespond(query, updateQuery) {
		customer.doUpdate(dbcnx, db, query, updateQuery, function(err,query) {
			if ( err ) {
				response.writeHead(500, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			}else {
				customer.doGet(dbcnx, db, query, function(attList) {
					var field = urlParams["field"];
					/*
					console.log("field AFTER doGet = " + field);
					console.log("field in URL AFTER doGet = " + urlParams["field"]);
					console.log("Checking after update:");
					console.log("Field: " + field + "\nnewvalue: " + newvalue + "\nattList[field]: " + attList[field]);
					*/
					if ( attList != null && attList[field] == newvalue ) {
						response.writeHead(200, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
						var body = {};
						body["status"] = "SUCCESS";
						body["action"] = action;
						body["updatefield"] = field;
						//response.write(body);
						for ( var field in attList ) {
							body[field] = attList[field];
						}
						var respBody = JSON.stringify(body);
						response.write(respBody, function(err) { response.end(); } );
					} else {
						response.writeHead(503, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
						var body = {};
						body["status"] = "ERROR";
						body["errormessage"] = "Update failure: failed to checked info after update";
						body["action"] = action;
						var respBody = JSON.stringify(body);
						response.write(respBody, function(err) { response.end(); } );
					}
				})
			}
		});			
	}
	
	if ( oldvalue != undefined ) {
		var checkQuery = { "_id": ObjectId(id) }
		checkQuery[updateQueryField] = oldvalue;
		console.log("\ncheckQuery" + JSON.stringify(checkQuery) + "\n");
		customer.doGet(dbcnx, db, checkQuery, function(attList) {
			if ( attList == null ) {
				noUser = 1;
				response.writeHead(401, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "The info entered does not match";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else {
				updateAndRespond(query, updateQuery);
			}
		});
	} else {
		updateAndRespond(query, updateQuery)
	}
}

exports.getCustomer = getCustomer;
exports.getFullCustomerData = getFullCustomerData;
//exports.checkCredentials = checkCredentials;
exports.register = register;
exports.getLostCredentials = getLostCredentials;
exports.updateSetting = updateSetting;
exports.createCustomer = createCustomer;
