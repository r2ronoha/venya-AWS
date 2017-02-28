var querystring = require("querystring"); 
var url = require("url");
var http = require("http");
var fs = require("fs");
//var formidable = require("formidable");
var sys = require("sys");
var customer = require("./customer.js");
var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
var ObjectId = require('mongodb').ObjectId;

var exec = require("child_process").exec;
var myUndefined = [ undefined, "undefined" ];
var notCaseSensitive = [ "name","username","surname","email","address" ];
/*
//imports to support aws email
// load aws sdk
var aws = require('aws-sdk');

// load aws config
aws.config.loadFromPath('config.json');

// load AWS SES
var ses = new aws.SES({apiVersion: '2010-12-01'});

// send to list
var to = []

// this must relate to a verified SES account
var from = 'admin@venya.es'
*/
var awsSesSmtpHost = "email-smtp.eu-west-1.amazonaws.com";
var awsSesSmtpPort = 25;
var awsSesSmtpUsername = "AKIAJ2I2C3GMX7QBSLMA";
var awsSesSmtpPwd = "AgXxQlXS2LW8UNf8eAgJd9fdKv+2X0qJeclR1IjMbsnF";

var attributesDefault = {};
customer.getAttDefault( function(attDef) {
	attributesDefault = attDef;
});	
/*
function sendEmailAws(destEmail, emailSubject, message) {
	ses.sendEmail( 
		{
			Source: from,
			Destination: { ToAddresses: destEmail },
			Message: {
				Subject:Source {
					Data: emailSubject
				},
				Body: {
					Text: {
						Data: message,
					}
				}
			}

		}, function(err,data) {
			if(err) throw err
				console.log('[requestHandler.sendEmailAws] Email sent:');
				console.log(data)console;
		}
	);
}
*/
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
				body["errormessage"] = "wrongcredentials";
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
				body["errormessage"] = "notregistered";
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
					//console.log("[requestHandler.getCustomer.queryandRespond] field: \"" + field + "\" : \"" + JSON.stringify(body[field]) );
				}
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else {
				response.writeHead(401, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "wrongcredentials";
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
				body["errormessage"] = "notregistered";
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
			var fieldQuery = { "fix": attributesDefault[field].fix, "value": url.parse(request.url, true).query[field].toLowerCase() };
			insertQuery[field] = fieldQuery;
			console.log("[requestHandler.createCustomer()] added " + field + " : " + JSON.stringify(insertQuery[field]) + " to insertQuery");
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
					body["errormessage"] = "createcheckfail";
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
			body["errormessage"] = "idnotinsystem";
			body["action"] = action;
			var respBody = JSON.stringify(body);
			response.write(respBody, function(err) { response.end(); } );
		} else {
			if ( attList["surname"].toLowerCase() != surname.toLowerCase() ){
				response.writeHead(401, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "idnamenotmatch";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );				
			} else {
				customer.doGet(dbcnx, db, checkUsernameQuery, function(attList) {
					if ( attList != null && attList["username"] != attributesDefault["username"].value ) {
						var errormessage = ( attList["username"] == username ) ? "usernameexists" : "emailregistered";
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
									console.log("[requestHandlers.register] username: " + username + ", password: " + password + ",  email: " + email);
									
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
										body["errormessage"] = "regdatacheckfail";
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
	var email = url.parse(request.url, true).query.email
	
	//var query = { "email": { "fix": attributesFix["email"], "value": email } };
	var query = { "email.value": email.toLowerCase() };
	for ( var i = 0; i < optFields.length; i++ ) {
		var field = optFields[i];
		if ( urlParams[field] != undefined ) {
			var queryField = field + ".value";
			var fieldValue = urlParams[field];
			if ( notCaseSensitive.indexOf(field) > -1 ) {
				fieldValue = fieldValue.toLowerCase();
			}
			query[queryField] = fieldValue;
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
			body["errormessage"] = "accountnotfound";
			var respBody = JSON.stringify(body);
			response.write(respBody, function(err) { response.end(); } );
		} else {
			var email = attList["email"];
			var subject = 'Lost ' + credential;
			var emailContent = 'Your ' + credential + ' is: ' + attList[credential];
			var emailContentHtml = '<b>Your ' + credential + ' is ' + attList[credential] + '</b>';

			//sendEmailAws([email],subject,emailContent);
			//var username = attList[credential];	
			// setup e-mail transporter
			var transporter = nodemailer.createTransport(smtpTransport({
				host: awsSesSmtpHost,
				secureConnection: false,
				//port: 587,
				port: awsSesSmtpPort,
				auth: {
					user: awsSesSmtpUsername,
					pass: awsSesSmtpPwd
				}
			}));
			// setup e-mail data with unicode symbols
			var mailOptions = {
				from: '"VenYa" <admin@venya.es>', // sender address
				to: email, // list of receivers
				subject: 'Lost ' + credential, // Subject line
				text: 'Your ' + credential + ' is: ' + attList[credential], // plaintext body
				html: '<b>Your ' + credential + ' is ' + attList[credential] + '</b>' // html body
			};

			// send mail with defined transport object
			transporter.sendMail(mailOptions, function(error, info){
				if(error){
					var body = {};
					body["status"] = "ERRORMAIL";
					body["errormessage"] = "emailfailed";
					body["email"] = email;
					//body[credential] = attList[credential];
					var respBody = JSON.stringify(body);
					response.writeHead(500, {"Content-Type": "text/plain", "Access-Control-Allow-Origin" : "*"});
					response.write(respBody, function(err) { response.end(); });
					return console.log(error);
				}
				console.log('Message sent: ' + info.response);			
				
				var body = {};
				body["status"] = "SUCCESS";
				body["errormessage"] = "credentialssent";
				body["email"] = email;
				//body[credential] = attList[credential];
				var respBody = JSON.stringify(body);
				response.writeHead(200, {"Content-Type": "text/plain", "Access-Control-Allow-Origin" : "*"});
				response.write(respBody, function(err) { response.end(); });
			});
		}
	}); 
}

function updateSetting(response, request, dbcnx, db) {
	console.log("[requestHandlers.updasteSetting] request.url = " + request.url);
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
			updateQuery[updateQueryField] = value.toLowerCase();
		}
		console.log("[requestHandlers.updateSetting] Update address query string = " + JSON.stringify(updateQuery));
	} else {
		var updateQueryField = field + ".value";
		if ( notCaseSensitive.indexOf(field) > -1 ) {
			newvalue = newvalue.toLowerCase();
		}
		updateQuery[updateQueryField] = newvalue;
	}
	var query = { "_id": ObjectId(id) };
	
	function updateAndRespond(query, updateQuery) {
		console.log("[requestHandlers.updateSetting] calling customer.doUpadte with query: " + JSON.stringify(updateQuery));
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
				console.log("[requestHandlers.updateSetting] Update successful. Getting customer details");
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
						body["errormessage"] = "updatedatacheckfail";
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
		if ( notCaseSensitive.indexOf(field) > -1 ) {
			oldvalue = oldvalue.toLowerCase();
		}
		checkQuery[updateQueryField] = oldvalue;
		console.log("\ncheckQuery" + JSON.stringify(checkQuery) + "\n");
		customer.doGet(dbcnx, db, checkQuery, function(attList) {
			if ( attList == null ) {
				noUser = 1;
				response.writeHead(401, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "infonotmatch";
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
			updateQuery[updateQueryField] = value.toLowerCase();
		}
		console.log("[requestHandlers : updateSettings] Update address query string = " + JSON.stringify(updateQuery));
	} else {
		var updateQueryField = field + ".value";
		if ( notCaseSensitive.indexOf(field) > -1 ) {
			newvalue = newvalue.toLowerCase();
		}
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
						body["errormessage"] = "updatedatacheckfail";
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
		if ( notCaseSensitive.indexOf(field) > -1 ) {
			oldvalue = oldvalue.toLowerCase();
		}
		checkQuery[updateQueryField] = oldvalue;
		console.log("\ncheckQuery" + JSON.stringify(checkQuery) + "\n");
		customer.doGet(dbcnx, db, checkQuery, function(attList) {
			if ( attList == null ) {
				noUser = 1;
				response.writeHead(401, {"Content-Type" : "text/plain", "Access-Control-Allow-Origin" : "*"});
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "infonotmatch";
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
