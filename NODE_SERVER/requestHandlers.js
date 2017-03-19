var querystring = require("querystring"); 
var url = require("url");
var http = require("http");
var fs = require("fs");
//var formidable = require("formidable");
var sys = require("sys");
var customer = require("./customer.js");
var provider = require("./provider.js");
var appointment = require("./appointment.js");
var nodemailer = require("nodemailer");
var smtpTransport = require("nodemailer-smtp-transport");
var ObjectId = require('mongodb').ObjectId;
var subscriberTypes = [ "customer" , "provider" ];
var default_provider = "venyadefault";

var exec = require("child_process").exec;
var myUndefined = [ undefined, "undefined" ];
var notCaseSensitive = [ "name","surname","email","address" ];

var responseHeadParams =  { "Content-Type" : "text/plain" , "Access-Control-Allow-Origin" : "*" };
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

var customerAttributesDefault = {};
customer.getAttDefault( function(attDef) {
	customerAttributesDefault = attDef;
});	

var providerAttributesDefault = {};
provider.getAttDefault( function(attDef) {
	providerAttributesDefault = attDef;
});	

var appointmentAttributesDefault = {};
appointment.getAttDefault( function(attDef) {
	providerAttributesDefault = attDef;
});	

function printError(tag,message,err) {
	try {
		console.log("[requestHandlers." + tag + "] !!!ERROR!!! " + message + ". Error: \"" + err + "\"");
	} catch (e) {
		console.log("[requestHandlers.printError] " + e.stack);
	}
}

function writeErrorResponse(response,statuscode,errormessage,action) {
	response.writeHead(statuscode, responseHeadParams);
	var body = {};
	body["status"] = "ERROR";
	body["errormessage"] = errormessage;
	body["action"] = action;
	var respBody = JSON.stringify(body);
	response.write(respBody, function(err) { response.end(); });
}

function writeSuccessResponse(response,body) {
	response.writeHead(200, responseHeadParams);
	body["status"] = "SUCCESS";
	var respBody = JSON.stringify(body);
	response.write(respBody, function(err) { response.end(); });
}

function doGetHandler(response,err, attList, action, callback) {
	if (err) {
		writeErrorResponse(response,500,err,action);
	} else if (attList == null) {
		writeErrorResponse(response,401,"nullfromserver",action);
	} else {
		callback();
	}
}

function getFullCustomerData(response, request, dbcnx, db) {	
	var TAG = "getfullcustomerdata";
	//console.log("[requestHandlres.getFullCustomerData] " + Math.round(new Date().getTime() / 1000) + " request.url = " + request.url);
	
	var action = url.parse(request.url, true).query.action;
	var username = url.parse(request.url, true).query.username;
	var password = url.parse(request.url, true).query.password;
	var id = url.parse(request.url, true).query.id;
	action = ( myUndefined.indexOf(action) >= 0 || action == "" ) ? "getfullcustomerdata" : action;
	
	if ( ( myUndefined.indexOf(id) >= 0 && myUndefined.indexOf(username) >= 0 ) || ( action == "login" && ( myUndefined.indexOf(username) >= 0 || myUndefined.indexOf(password) >= 0 ) ) || ( action != "login" && myUndefined.indexOf(id) >= 0 ) ) {
		printError(TAG,"Wrong parameters provided in URL",JSON.stringify(url.parse(request.url, true)));
		writeErrorResponse(response,400,"badrequest",action);
		return;
	}
	
	var noUser = 0;
	var query;	
	var queryUsername = {};
	
	function queryAndRespond(query) {
		customer.doGetFullData(dbcnx, db, query, function(err,document) {
			if (err) {
				printError(TAG,"FAiled to get customer data",err);
				writeErrorResponse(response,500,err,action);
			} else if (document != null) {
				var body = {};
				body["action"] = action;
				for ( var field in document ) {
					body[field] = document[field];
				}
				writeSuccessResponse(response,body);
			} else {
				printError(TAG,"Failed to get customer dats","NULL response from DB (wrongcredentials?)");
				writeErrorResponse(response,401,"wrongcredentials",action);
			}
		});
	}
	
	if ( action == "login" ) {
		queryUsername["username.value"] = username;
		customer.doGet(dbcnx, db, queryUsername, function(err,userAtt) {
			if (err) {
				printError(TAG,"FAiled to get customer data for login",err);
				writeErrorResponse(response,500,err,action);
			} else if ( userAtt == null ) {
				noUser = 1;
				printError(TAG,"FAiled to get customer data for login","notregistered");
				writeErrorResponse(response,500,"notregistered",action);
				response.writeHead(401, responseHeadParams);
			} else {
				query = { 
					"username.value":  username, 
					"password.value": password
				}
				queryAndRespond(query);
			}
		});
	} else {
		//console.log("[requestHandlres.getFullCustomerData] " + Math.round(new Date().getTime() / 1000) + " query = { \"_id\": ObjectId(" + id + ") }");
		query = { "_id": ObjectId(id) }
		queryAndRespond(query)
	}
}
function getFullSubscriberData(response, request, dbcnx, db) {	
	var TAG = "getFullSubscriberData";
	//console.log("[requestHandlres.getFullProviderData] " + Math.round(new Date().getTime() / 1000) + " request.url = " + request.url);
	
	var action = url.parse(request.url, true).query.action;
	var surname = url.parse(request.url, true).query.surname;
	var firstname = url.parse(request.url, true).query.firstname;
	var dob = url.parse(request.url, true).query.dob;
	var username = url.parse(request.url, true).query.username;
	var password = url.parse(request.url, true).query.password;
	var id = url.parse(request.url, true).query.id;
	var type = url.parse(request.url, true).query.type;

	action = ( myUndefined.indexOf(action) >= 0 ) ? "getfullsubscriberdata" : action;

	if ( myUndefined.indexOf(type) >= 0 || subscriberTypes.indexOf(type) < 0 ) {
		printError(TAG,"Missing required parameters in URL",JSON.stringify(url.parse(request.url, true).query));
		writeErrorResponse(response,400,"badrequest",action);
		return;
	}
	var subscriber = ( type == "customer" ) ? customer : provider;

	if ( ( (["register","getid"].indexOf(action) >= 0 && (myUndefined.indexOf(surname) >= 0 || myUndefined.indexOf(firstname) >= 0 || myUndefined.indexOf(dob) >= 0)) || ["register","getid"].indexOf(action) < 0 && (( myUndefined.indexOf(id) >= 0 && myUndefined.indexOf(username) >= 0 ) || ( action == "login" && ( myUndefined.indexOf(username) >= 0 || myUndefined.indexOf(password) >= 0 ) ) || ( action != "login" && myUndefined.indexOf(id) >= 0 ))) ) {
		printError(TAG,"wrong parameters passed in URL",JSON.stringify(url.parse(request.url, true).query));
		writeErrorResponse(response,400,"badrequest",action);
		return;
	}
	
	var noUser = 0;
	var query;	
	var queryUsername = {};
	
	function queryAndRespond(query) {
		subscriber.doGetFullData(dbcnx, db, query, function(err,document) {
			if (err) {
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else if (document != null) {
				response.writeHead(200, responseHeadParams);
				var body = {};
				body["status"] = "SUCCESS";
				body["action"] = action;
				//response.write(body);
				for ( var field in document ) {
					body[field] = document[field];
				}
				var respBody = JSON.stringify(body);
				//console.log("[requestHandlers.getFullCustomerData.q&R] " + Math.round(new Date().getTime() / 1000) + " respBody = " + respBody);
				response.write(respBody, function(err) { response.end(); } );
			} else {
				response.writeHead(401, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "wrongcredentials";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			}
		});
	}
	
	if ( ["register","getid"].indexOf(action) >= 0 ) {
		queryUsername["firstname.value"] = firstname;
		queryUsername["surname.value"] = surname;
		queryUsername["dob.value"] = dob;
		//console.log("queryUsername = " + JSON.stringify(queryUsername));
		customer.doGet(dbcnx, db, queryUsername, function(err,userAtt) {
			if (err) {
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else if ( userAtt == null ) {
				noUser = 1;
				response.writeHead(401, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "notcreated";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else if ( userAtt["username"] != customerAttributesDefault["username"].value ) {
				//console.log("[requestHandlers.getCustomer] action = " + action + " - username = " + userAtt["username"] + " (default: " + customerAttributesDefault["username"].value);
				response.writeHead(401, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "accountalreadycreated";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else {
				queryAndRespond(queryUsername);
			}
		});
	} else if ( action == "login" ) {
		queryUsername["username.value"] = username;
		subscriber.doGet(dbcnx, db, queryUsername, function(err,userAtt) {
			if (err) {
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else if ( userAtt == null ) {
				noUser = 1;
				response.writeHead(401, responseHeadParams);
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
		//console.log("[requestHandlres.getFullCustomerData] " + Math.round(new Date().getTime() / 1000) + " query = { \"_id\": ObjectId(" + id + ") }");
		query = { "_id": ObjectId(id) }
		queryAndRespond(query)
	}
}

function sleep(ms) {
	//console.log("[sleep] " + Math.round(new Date().getTime() / 1000) + " Sleeping");
	return new Promise((resolve) => setTimeout(resolve,ms));
}

function sessionTimeoutManagement(dbcnx, db) {

	var timeout = 30*60; //timeout = 30 minutes = 30*60 sec (timestamp of session id is set in seconds)

	//console.log("[requestHAndlers.sessionTimeoutMgt] " + Math.round(new Date().getTime() / 1000) + " starting session management");
	var query = {'sessionid.timestamp':{$gt: 0}};
	customer.doGetAll(dbcnx, db, query, function(err,customerList) {
		if (err) {
			console.log("[requestHandler.sessionTimeoutMgt] " + Math.round(new Date().getTime() / 1000) + " DB ERROR: " + err);
		} else if (customerList == null) {
			console.log("[requestHandler.sessionTimeoutMgt] " + Math.round(new Date().getTime() / 1000) + " NULL list of customers returned by DB");
			//setTimeout(sessionTimeoutManagement,60000,dbcnx,db);
		} else {
			if ( customerList.length > 0 ) {
				//console.log("[requestHandler.sessionTimeoutMgt] " + Math.round(new Date().getTime() / 1000) + " LIST OF CUSTOMERS with open sessions: " + JSON.stringify(customerList));
				for ( var i in customerList ) {
					var mycustomer = customerList[i];
					var mycustomerID = mycustomer["_id"];
					//console.log("[requestHandler.sessionTimeoutMgt] " + Math.round(new Date().getTime() / 1000) + " " + JSON.stringify(mycustomer));
					var now = Math.round(new Date().getTime() / 1000);
					var sessionInit = mycustomer.sessionid.timestamp;
					//console.log("[requestHandler.sessionTimeoutMgt] " + Math.round(new Date().getTime() / 1000) + " session init timestamp = " + sessionInit);
					var sessionTime = now - sessionInit;
					//console.log("[requestHandler.sessionTimeoutMgt] " + Math.round(new Date().getTime() / 1000) + " mycustomer ID = " + mycustomerID + " -- session time = " + sessionTime);
					if ( sessionInit != 0 && sessionTime > timeout ) {
						console.log("[requestHandler.sessionTimeoutMgt] " + Math.round(new Date().getTime() / 1000) + " session (" + sessionInit + ") EXPIRED for mycustomer id " + mycustomerID);
						// update sessionid to "closed" + 0 timeout
						var myquery = { '_id' : ObjectId(mycustomerID) };
						var updateQuery = { '_id' : ObjectId(mycustomerID) };
						updateQuery['sessionid.value'] = 'closed';
						updateQuery['sessionid.timestamp'] = 0;
						
						//console.log("[requestHandlers.sessionTimeoutMgtupdate.clearSession] " + Math.round(new Date().getTime() / 1000) + " calling customer.doUpadte with query: " + JSON.stringify(updateQuery));
						customer.doUpdate(dbcnx, db, myquery, updateQuery, function(err,myquery) {
							if ( err ) {
								console.log("[requestHandler.sessionTimeoutMgt] " + Math.round(new Date().getTime() / 1000) + " failed to clear session for customerID " + mycustomerID);
								//setTimeout(sessionTimeoutManagement,900000,dbcnx,db);
							} else {
								console.log("[requestHandler.sessionTimeoutMgt] " + Math.round(new Date().getTime() / 1000) + " Session successfully cleared for customerID " + mycustomerID);
								//setTimeout(sessionTimeoutManagement,900000,dbcnx,db);
							}
						});


						//setTimeout(sessionTimeoutManagement,60000,dbcnx,db);
					} /*else {
						console.log("[requestHandler.sessionTimeoutMgt] " + Math.round(new Date().getTime() / 1000) + " session (" + sessionInit + ")not expired yet for customer id " + mycustomerID);
						//setTimeout(sessionTimeoutManagement,60000,dbcnx,db);
					}*/ 
				}
			} /*else {
				console.log("[requestHandler.sessionTimeoutMgt] " + Math.round(new Date().getTime() / 1000) + " NO CUSTOMERS with open sessions");
				//setTimeout(sessionTimeoutManagement,60000,dbcnx,db);
			}*/
		}
		setTimeout(sessionTimeoutManagement,1800000,dbcnx,db);
	});
}

function getSubscriber(response,request,dbcnx,db) {
	var type = url.parse(request.url, true).query.type;

	if ( myUndefined.indexOf(type) >= 0 || subscriberTypes.indexOf(type) < 0 ) {
		response.writeHead(500, responseHeadParams);
		var body = {};
		body["status"] = "ERROR";
		body["errormessage"] = "badrequest";
		var respBody = JSON.stringify(body);
		response.write(respBody, function(err) { response.end(); } );
		return;
	}
	
	switch (type) {
		case "customer":
			getCustomer(response, request, dbcnx, db);
			break;
		case "provider":
			getProvider(response, request, dbcnx, db);
			break;
	}
}

function getCustomer(response, request, dbcnx, db) {	
	//console.log("[requestHandlers.getCustomer] " + Math.round(new Date().getTime() / 1000) + " request.url = " + request.url);
	
	var action = url.parse(request.url, true).query.action;
	var username = url.parse(request.url, true).query.username;
	var password = url.parse(request.url, true).query.password;
	var id = url.parse(request.url, true).query.id;
	var surname = url.parse(request.url, true).query.surname;
	var firstname = url.parse(request.url, true).query.firstname;
	var dob = url.parse(request.url, true).query.dob;
	var sessionid = url.parse(request.url, true).query.sessionid;
	
	//console.log("action = " + action + " - username = " + username + " - password = " + password);
	//if ( ( ((action == "register" || action == "getid" ) && (myUndefined.indexOf(surname) >= 0 || myUndefined.indexOf(firstname)) >= 0) || (action != "register") && (( myUndefined.indexOf(id) >= 0 && myUndefined.indexOf(username) >= 0 ) || ( action == "login" && ( myUndefined.indexOf(username) >= 0 || myUndefined.indexOf(password) >= 0 ) ) || ( action != "login" && myUndefined.indexOf(id) >= 0 ))) ) {
	if ( ( (["register","getid"].indexOf(action) >= 0 && (myUndefined.indexOf(surname) >= 0 || myUndefined.indexOf(firstname) >= 0 || myUndefined.indexOf(dob) >= 0)) || 
		( action == "getidfromsessionid" && myUndefined.indexOf(sessionid) >= 0 ) ||
		["register","getid","getidfromsessionid"].indexOf(action) < 0 && (
			( myUndefined.indexOf(id) >= 0 && myUndefined.indexOf(username) >= 0 ) || 
			( action == "login" && ( myUndefined.indexOf(username) >= 0 || myUndefined.indexOf(password) >= 0 ) ) || 
			( action != "login" && myUndefined.indexOf(id) >= 0 ))) ) {
		console.log("[requestHandlers.getCustomer] bad request based on action : \n- action: \"" + action + "\"\n- username: \"" + username + "\"\n- password: \"" + password);

		writeErrorResponse(response,400,"badrequest",action);
/*
		response.writeHead(400, responseHeadParams);
		var body = {};
		body["status"] = "ERROR";
		body["errormessage"] = "badrequest";
		var respBody = JSON.stringify(body);
		response.write(respBody, function(err) { response.end(); } );
*/
		return;
	}
	
	var noUser = 0;
	var query;	
	var queryUsername = {};
	var registerCheckQuery ={};
	
	function queryAndRespond(query) {
		customer.doGet(dbcnx, db, query, function(err,attList) {
			if (err) {
				writeErrorResponse(response,500,err,action);
				/*
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
				*/
			}else if (attList != null) {
				response.writeHead(200, responseHeadParams);
				var body = {};
				body["status"] = "SUCCESS";
				body["action"] = action;
				//response.write(body);
				for ( var field in attList ) {
					body[field] = attList[field];
					//console.log("[requestHandler.getCustomer.queryandRespond] " + Math.round(new Date().getTime() / 1000) + " field: \"" + field + "\" : \"" + JSON.stringify(body[field]) );
				}
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else {
				respErrorMessage = ( action == "getidfromsessionid" ) ? "invalidsessionid" : "wrongcredentials";
				writeErrorResponse(response,401,respErrorMessage,action);
				/*
				response.writeHead(401, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = ( action == "getidfromsessionid" ) ? "invalidsessionid" : "wrongcredentials";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
				*/
			}
		});
	}
	
	if ( ["register","getid"].indexOf(action) >= 0 ) {
		registerCheckQuery["firstname.value"] = firstname;
		registerCheckQuery["surname.value"] = surname;
		registerCheckQuery["dob.value"] = dob;
		//console.log("registerCheckQuery = " + JSON.stringify(registerCheckQuery));
		customer.doGet(dbcnx, db, registerCheckQuery, function(err,userAtt) {
			if (err) {
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else if ( userAtt == null ) {
				noUser = 1;
				response.writeHead(401, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "notregistered";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else if ( userAtt["username"] != customerAttributesDefault["username"].value ) {
				//console.log("[requestHandlers.getCustomer] action = " + action + " - username = " + userAtt["username"] + " (default: " + customerAttributesDefault["username"].value);
				response.writeHead(401, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "accountalreadycreated";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else {
				queryAndRespond(registerCheckQuery);
			}
		});
	} else if ( action == "login" ) {
		queryUsername["username.value"] = username;
		customer.doGet(dbcnx, db, queryUsername, function(err,userAtt) {
			if (err) {
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else if ( userAtt == null ) {
				noUser = 1;
				response.writeHead(401, responseHeadParams);
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
		//console.log("[requestHandlers.getCustomer] " + Math.round(new Date().getTime() / 1000) + "query = { \"_id\": ObjectId(" + id + ") }");
		query = ( myUndefined.indexOf(sessionid) >= 0 ) ? { "_id": ObjectId(id) } : { "sessionid.value" : sessionid };
		queryAndRespond(query);
	}
}

function createCustomer(response, request, dbcnx, db) {
	//console.log("[requestHandler.createCustomer()] " + Math.round(new Date().getTime() / 1000) + " request.url = " + request.url);
	var action = "createcustomer";
	
	var insertQuery = {};
	for ( var field in url.parse(request.url, true).query ) {
		if ( url.parse(request.url, true).query[field] != "" ) {
			//var fieldQuery = { "fix": attributesFix[field], "value": url.parse(request.url, true).query[field] };
			var value = url.parse(request.url, true).query[field].toLowerCase();
			if ( field == "providerid" ) {
				var myprovider = {}
				myprovider[value] = true;
				value = myprovider;
				field = "providers";
			}
			var fieldQuery = { "fix": customerAttributesDefault[field].fix, "value": value };
			insertQuery[field] = fieldQuery;
			console.log("[requestHandler.createCustomer()] " + Math.round(new Date().getTime() / 1000) + " added " + field + " : " + JSON.stringify(insertQuery[field]) + " to insertQuery");
		}
	}

	//set provider to VenyaDefault if no provider sent (i.e. created via self customer creation during development/testing phase
	if ( !( "providers" in insertQuery ) ) {
		console.log("Getting default provider info");
		//var providername = default_provider;
		var getProviderQuery = { 'name.value' : default_provider };
		console.log(JSON.stringify(getProviderQuery));
		provider.doGet(dbcnx, db, getProviderQuery, function(err, attList) {
			if(err) {
				console.log("[createProvider] error : " + err);
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
				return;
			} else if (attList == null) {
				console.log("[createProvider] error : NULL FROM DB");
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "unknownprovider";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
				return;
			} else {
				var providerid = attList["id"];
				console.log("default provider id = " + providerid);
				var value = {};
				value[providerid] = true;
				insertQuery["providers"] = { "fix" : customerAttributesDefault["providers"].fix, "value" : value };
				console.log("[reqHandler.createCustomer] Inserting : " + JSON.stringify(insertQuery));
				insert(dbcnx, db, insertQuery)
			}
		});
	} else {
		console.log("[reqHandler.createCustomer] Inserting : " + JSON.stringify(insertQuery));
		insert(dbcnx, db, insertQuery)
	}
	
	//console.log("[requestHandler.createCustomer()] " + Math.round(new Date().getTime() / 1000) + " Calling customer.doInsert\n[requestHandler.createCustomer()] dbcnx = " + dbcnx + " -- db = " + db + " insertQuery = " + JSON.stringify(insertQuery))
	function insert(dbcnx, db, insertQuery) {
		customer.doInsert(dbcnx, db, insertQuery, function(query,exists,message){
			if ( exists == 0 ) {
				//console.log("[requestHandler.createCustomer()] " + Math.round(new Date().getTime() / 1000) + " Calling customer.doGet\n[requestHandler.createCustomer()] query = " + JSON.stringify(query))
				customer.doGet(dbcnx, db, query, function(err,attList) {
					if (err) {
						response.writeHead(500, responseHeadParams);
						var body = {};
						body["status"] = "ERROR";
						body["errormessage"] = err;
						body["action"] = action;
						var respBody = JSON.stringify(body);
						response.write(respBody, function(err) { response.end(); } );
					} else if (attList != null) {
						response.writeHead(200, responseHeadParams);
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
						response.writeHead(500, responseHeadParams);
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
				response.writeHead(401, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = message;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			}
		});
	}
}

function getProvider(response, request, dbcnx, db) {	
	console.log("[requestHandlers.getProvider] " + Math.round(new Date().getTime() / 1000) + " request.url = " + request.url);
	
	var action = url.parse(request.url, true).query.action;
	var username = url.parse(request.url, true).query.username;
	var password = url.parse(request.url, true).query.password;
	var id = url.parse(request.url, true).query.id;
	var surname = url.parse(request.url, true).query.surname;
	var firstname = url.parse(request.url, true).query.firstname;
	var sessionid = url.parse(request.url, true).query.sessionid;
	
	//if ( ( myUndefined.indexOf(id) >= 0 && myUndefined.indexOf(username) >= 0 ) || ( action == "login" && ( myUndefined.indexOf(username) >= 0 || myUndefined.indexOf(password) >= 0 ) ) || ( action != "login" && myUndefined.indexOf(id) >= 0 ) ) {
	if ( (action == "register" && (myUndefined.indexOf(surname) >= 0 || myUndefined.indexOf(firstname) >= 0) || 
		(action == "getidfromsessionid" && myUndefined.indexOf(sessionid) >= 0 ) ||
		( ["register","getidfromsessionid"].indexOf(action) < 0 ) && (
			( myUndefined.indexOf(id) >= 0 && myUndefined.indexOf(username) >= 0 ) || 
			( action == "login" && ( myUndefined.indexOf(username) >= 0 || myUndefined.indexOf(password) >= 0 ) ) || 
			( action != "login" && myUndefined.indexOf(id) >= 0 ))) ) {
		console.log("[reqHandler.getProvider] [DEBUG] action = " + action + " -- id = " + id);
		response.writeHead(400, responseHeadParams);
		var body = {};
		body["status"] = "ERROR";
		body["errormessage"] = "badrequest";
		var respBody = JSON.stringify(body);
		response.write(respBody, function(err) { response.end(); } );
		return;
	}
	
	var noUser = 0;
	var query;	
	var queryUsername = {};
	var registerCheckQuery ={};
	
	function queryAndRespond(query) {
		provider.doGet(dbcnx, db, query, function(err,attList) {
			if (err) {
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			}else if (attList != null) {
				response.writeHead(200, responseHeadParams);
				var body = {};
				body["status"] = "SUCCESS";
				body["action"] = action;
				//response.write(body);
				for ( var field in attList ) {
					body[field] = attList[field];
					//console.log("[requestHandler.getProvider.queryandRespond] " + Math.round(new Date().getTime() / 1000) + " field: \"" + field + "\" : \"" + JSON.stringify(body[field]) );
				}
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else {
				response.writeHead(401, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = ( action == "getidfromsessionid" ) ? "invalidsessionid" : "wrongcredentials";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			}
		});
	}
	
	if ( action == "register" ) {
		registerCheckQuery["firstname.value"] = firstname;
		registerCheckQuery["surname.value"] = surname;
		//console.log("registerCheckQuery = " + JSON.stringify(registerCheckQuery));
		provider.doGet(dbcnx, db, registerCheckQuery, function(err,userAtt) {
			if (err) {
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else if ( userAtt == null ) {
				noUser = 1;
				response.writeHead(401, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "notregistered";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else if ( userAtt["username"] != providerAttributesDefault["username"] ) {
				response.writeHead(401, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "accountalreadycreated";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else {
				queryAndRespond(registerCheckQuery);
			}
		});
	} else if ( action == "login" ) {
		queryUsername["username.value"] = username;
		provider.doGet(dbcnx, db, queryUsername, function(err,userAtt) {
			if (err) {
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else if ( userAtt == null ) {
				noUser = 1;
				response.writeHead(401, responseHeadParams);
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
		//console.log("[requestHandlers.getProvider] " + Math.round(new Date().getTime() / 1000) + "query = { \"_id\": ObjectId(" + id + ") }");
		query = ( myUndefined.indexOf(sessionid) >= 0 ) ? { "_id": ObjectId(id) } : { "sessionid.value" : sessionid };
		queryAndRespond(query);
	}
}

function createProvider(response, request, dbcnx, db) {
	//console.log("[requestHandler.createProvider()] " + Math.round(new Date().getTime() / 1000) + " request.url = " + request.url);
	var action = "createprovider";
	
	var insertQuery = {};
	for ( var field in url.parse(request.url, true).query ) {
		if ( url.parse(request.url, true).query[field] != "" ) {
			//var fieldQuery = { "fix": attributesFix[field], "value": url.parse(request.url, true).query[field] };
			var value;
			if ( notCaseSensitive.indexOf(field) > -1 ) {
				value = url.parse(request.url, true).query[field].toLowerCase();
			} else {
				value = url.parse(request.url, true).query[field];
			}
			var fieldQuery = { "fix": providerAttributesDefault[field].fix, "value": value };
			insertQuery[field] = fieldQuery;
			//console.log("[requestHandler.createCustomer()] " + Math.round(new Date().getTime() / 1000) + " added " + field + " : " + JSON.stringify(insertQuery[field]) + " to insertQuery");
		}
	}
	
	//console.log("[requestHandler.createCustomer()] " + Math.round(new Date().getTime() / 1000) + " Calling provider.doInsert\n[requestHandler.createCustomer()] dbcnx = " + dbcnx + " -- db = " + db + " insertQuery = " + JSON.stringify(insertQuery))
	
	provider.doInsert(dbcnx, db, insertQuery, function(query,exists,message){
		if ( exists == 0 ) {
			//console.log("[requestHandler.createCustomer()] " + Math.round(new Date().getTime() / 1000) + " Calling provider.doGet\n[requestHandler.createCustomer()] query = " + JSON.stringify(query))
			provider.doGet(dbcnx, db, query, function(err,attList) {
				if (err) {
					response.writeHead(500, responseHeadParams);
					var body = {};
					body["status"] = "ERROR";
					body["errormessage"] = err;
					body["action"] = action;
					var respBody = JSON.stringify(body);
					response.write(respBody, function(err) { response.end(); } );
				} else if (attList != null) {
					response.writeHead(200, responseHeadParams);
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
					response.writeHead(500, responseHeadParams);
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
			response.writeHead(401, responseHeadParams);
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
	//console.log("[requestHandlers.register] " + Math.round(new Date().getTime() / 1000) + " request.url = " + request.url);
	var urlParams = url.parse(request.url, true).query;
	var action = urlParams["action"];
	var id = urlParams["id"];
	var surname = urlParams["surname"];
	var username = urlParams["username"];
	var dob = urlParams["dob"];
	var email = urlParams["email"];
	var password = urlParams["password"];
	
	var checkIDquery = { "_id": ObjectId(id) };
	
	var updateQuery = {};
	for ( var field in url.parse(request.url, true).query ) {
		if ( field != "id" ) {
			//var fieldQuery = { "fix": attributesFix[field], "value": url.parse(request.url, true).query[field] };
			var fieldQuery = { "fix": customerAttributesDefault[field].fix, "value": url.parse(request.url, true).query[field] };
			updateQuery[field] = fieldQuery;
		}
	}
	
	var checkUsernameQuery = { "$or": [ { "username.value": username }, { "email.value": email } ] };
	
	customer.doGet(dbcnx, db, checkIDquery, function(err,attList) {
		if (err) {
			response.writeHead(500, responseHeadParams);
			var body = {};
			body["status"] = "ERROR";
			body["errormessage"] = err;
			body["action"] = action;
			var respBody = JSON.stringify(body);
			response.write(respBody, function(err) { response.end(); } );
		} else if ( attList == null ) {			
			response.writeHead(401, responseHeadParams);
			var body = {};
			body["status"] = "ERROR";
			body["errormessage"] = "idnotinsystem";
			body["action"] = action;
			var respBody = JSON.stringify(body);
			response.write(respBody, function(err) { response.end(); } );
		} else {
			//check id the id and the surname and the DOB provided match
			if ( attList["surname"].toLowerCase() != surname.toLowerCase() || attList["dob"] != dob ){
				response.writeHead(401, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = "infonotmatch";
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );				
			//check if the user account has already been created for the id-name pair
			} else if ( attList["username"] != customerAttributesDefault["username"].value || attList["email"] != customerAttributesDefault["email"].value ) {
						response.writeHead(401, responseHeadParams);
						var body = {};
						body["status"] = "ERROR";
						body["errormessage"] = "accountalreadycreated"
						body["action"] = action;
						var respBody = JSON.stringify(body);
						response.write(respBody, function(err) { response.end(); } );					
			} else {
				//verify if the username and/or email are already in use by any account
				customer.doGet(dbcnx, db, checkUsernameQuery, function(err,attList) {
					if (err) {
						response.writeHead(500, responseHeadParams);
						var body = {};
						body["status"] = "ERROR";
						body["errormessage"] = err;
						body["action"] = action;
						var respBody = JSON.stringify(body);
						response.write(respBody, function(err) { response.end(); } );
					} else if ( attList != null && attList["username"] != customerAttributesDefault["username"].value ) {
						var errormessage = ( attList["username"] == username ) ? "usernameexists" : "emailregistered";
						response.writeHead(401, responseHeadParams);
						var body = {};
						body["status"] = "ERROR";
						body["errormessage"] = errormessage;
						body["action"] = action;
						var respBody = JSON.stringify(body);
						response.write(respBody, function(err) { response.end(); } );					
					}else{
						customer.doUpdate(dbcnx, db, checkIDquery, updateQuery, function(err,checkIDquery){
							if ( err ) {
								response.writeHead(500, responseHeadParams);
								var body = {};
								body["status"] = "ERROR";
								body["errormessage"] = err;
								body["action"] = action;
								var respBody = JSON.stringify(body);
								response.write(respBody, function(err) { response.end(); } );
							}else {
								customer.doGet(dbcnx, db, checkIDquery, function(err,attList) {
									//var username = urlParams["username"];
									//var email = urlParams["email"];
									//var password = urlParams["password"];
									//console.log("[requestHandlers.register] " + Math.round(new Date().getTime() / 1000) + " username: " + username + ", password: " + password + ",  email: " + email);
									if (err) {	
										response.writeHead(500, responseHeadParams);
										var body = {};
										body["status"] = "ERROR";
										body["errormessage"] = err;
										body["action"] = action;
										var respBody = JSON.stringify(body);
										response.write(respBody, function(err) { response.end(); } );
									} else if ( attList != null && attList["username"] == username && attList["email"] == email && attList["password"] == password ) {
										response.writeHead(200, responseHeadParams);
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
										response.writeHead(503, responseHeadParams);
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
	//console.log("[requestHandlers.getLostCredentials] " + Math.round(new Date().getTime() / 1000) + " request.url = " + request.url);
	var optFields = ["surname","name","password","username"];
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
	//console.log("[requestHandlers.getLostCredentials] " + Math.round(new Date().getTime() / 1000) + " LOOKING FOR : " + credential);
	
	customer.doGet(dbcnx, db, query, function(err,attList) {
		if (err) {
			response.writeHead(500, responseHeadParams);
			var body = {};
			body["status"] = "ERROR";
			body["errormessage"] = "err";
			var respBody = JSON.stringify(body);
			response.write(respBody, function(err) { response.end(); } );
		} else if (attList == null) {
			response.writeHead(401, responseHeadParams);
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
					// Send customer data to redirect directly to signin page
					for ( var field in attList ) {
						if ( field != "email" ) {
							body[field] = attList[field];
							console.log("[requestHandler.getCustomer.queryandRespond] " + Math.round(new Date().getTime() / 1000) + " field: \"" + field + "\" : \"" + JSON.stringify(body[field]) );
						}
					}
					//body[credential] = attList[credential];
					var respBody = JSON.stringify(body);
					response.writeHead(500, responseHeadParams);
					response.write(respBody, function(err) { response.end(); });
					return console.log(error);
				}
				console.log("[requestHandlers.getLostCredential] " + Math.round(new Date().getTime() / 1000) + " Email sent: " + info.response);			
				
				var body = {};
				body["status"] = "SUCCESS";
				body["errormessage"] = "credentialssent";
				body["email"] = email;
				//body[credential] = attList[credential];
				var respBody = JSON.stringify(body);
				response.writeHead(200, responseHeadParams);
				response.write(respBody, function(err) { response.end(); });
			});
		}
	}); 
}

function updateSetting(response, request, dbcnx, db) {
	//console.log("[requestHandlers.updasteSetting] " + Math.round(new Date().getTime() / 1000) + " request.url = " + request.url);
	var urlParams = url.parse(request.url, true).query;
	var id = urlParams["id"];
	var password = urlParams["password"];
	var username = urlParams["username"];
	var field = urlParams["field"];
	var newvalue = urlParams["newvalue"];
	var oldvalue = urlParams["oldvalue"];
	var action = urlParams["action"];
	var type = urlParams["type"];
	var sessionid = urlParams["sessionid"];

	var mycollection;
	if ( type == "customer" ) {
		//mycollection = require("./mycollection.js");
		mycollection = customer;
	} else if ( type == "provider" ) {
		mycollection = provider;
	} else {
		console.log("[requestHandlers.updateSetting] " + Math.round(new Date().getTime() / 1000) + " type " + type + " not supported");
		response.writeHead(500, responseHeadParams);
		var body = {};
		body["status"] = "ERROR";
		body["errormessage"] = "badrequest";
		body["action"] = action;
		var respBody = JSON.stringify(body);
		response.write(respBody, function(err) { response.end(); } );
		return;
	}
	
	var updateQuery = {};
	if ( field == "address" ) {
		var address = newvalue.split(';');
		for ( var i in address ) {
			var part = address[i].split('=')[0];
			var value = address[i].split('=')[1];
			var updateQueryField = "address.value." + part;
			updateQuery[updateQueryField] = value.toLowerCase();
		}
		//console.log("[requestHandlers.updateSetting] " + Math.round(new Date().getTime() / 1000) + " Update address query string = " + JSON.stringify(updateQuery));
	} else if ( field == "providers" ) {
		var provid = newvalue.split('=')[0];
		var active = newvalue.split('=')[1];
		var updateQueryField = "providers.value." + provid;
		updateQuery[updateQueryField] = ( active == "true" );
	} else {
		var updateQueryField = field + ".value";
		if ( notCaseSensitive.indexOf(field) > -1 ) {
			newvalue = newvalue.toLowerCase();
		}
		updateQuery[updateQueryField] = newvalue;
		if ( field == "sessionid") {
			var timestamp = ( newvalue == "closed" ) ? 0 : Math.round(new Date().getTime()/1000); // get timestamp in seconds
			updateQuery['sessionid.timestamp'] = timestamp;
		}
	}
	var query = ( myUndefined.indexOf(sessionid) < 0 ) ? { "sessionid.value" : sessionid } : { "_id": ObjectId(id) };
	
	function updateAndRespond(query, updateQuery) {
		console.log("[requestHandlers.updateSetting] " + Math.round(new Date().getTime() / 1000) + " calling mycollection.doUpadte with query: " + JSON.stringify(updateQuery));
		mycollection.doUpdate(dbcnx, db, query, updateQuery, function(err,query) {
			if ( err ) {
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			}else {
				//console.log("[requestHandlers.updateSetting] " + Math.round(new Date().getTime() / 1000) + " Update successful. Getting customer details");
				mycollection.doGet(dbcnx, db, query, function(err,attList) {
					var field = urlParams["field"];
					if (err) {
						response.writeHead(500, responseHeadParams);
						var body = {};
						body["status"] = "ERROR";
						body["errormessage"] = err;
						body["action"] = action;
						var respBody = JSON.stringify(body);
						response.write(respBody, function(err) { response.end(); } );
					} else if ( attList != null ) {
						response.writeHead(200, responseHeadParams);
						var body = {};
						body["status"] = "SUCCESS";
						body["action"] = action;
						body["updatefield"] = field;
						//response.write(body);
						for ( var field in attList ) {
							body[field] = attList[field];
							//if (field == "address") console.log(JSON.stringify(attList[field]));
						}
						var respBody = JSON.stringify(body);
						response.write(respBody, function(err) { response.end(); } );
					} else {
						response.writeHead(503, responseHeadParams);
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

		if ( myUndefined.indexOf(password) < 0 && !("password" in checkQuery)) {
			checkQuery["password.value"] = password;
		}

		if ( myUndefined.indexOf(username) < 0 && !("username" in checkQuery)) {
			checkQuery["username.value"] = username;
		}
		//console.log("\ncheckQuery" + JSON.stringify(checkQuery) + "\n");
		mycollection.doGet(dbcnx, db, checkQuery, function(err,attList) {
			if (err) {
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else if ( attList == null ) {
				noUser = 1;
				response.writeHead(401, responseHeadParams);
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
	//console.log("[requestHandlres.updateSettings] " + Math.round(new Date().getTime() / 1000) + " request.url = " + request.url);
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
		//console.log("[requestHandlers : updateSettings] " + Math.round(new Date().getTime() / 1000) + " Update address query string = " + JSON.stringify(updateQuery));
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
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			}else {
				customer.doGet(dbcnx, db, query, function(err,attList) {
					var field = urlParams["field"];
					if (err) {
						response.writeHead(500, responseHeadParams);
						var body = {};
						body["status"] = "ERROR";
						body["errormessage"] = err;
						body["action"] = action;
						var respBody = JSON.stringify(body);
						response.write(respBody, function(err) { response.end(); } );
					} else if ( attList != null && attList[field] == newvalue ) {
						response.writeHead(200, responseHeadParams);
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
						response.writeHead(503, responseHeadParams);
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
		//console.log("\ncheckQuery" + JSON.stringify(checkQuery) + "\n");
		customer.doGet(dbcnx, db, checkQuery, function(err,attList) {
			if (err) {
				response.writeHead(500, responseHeadParams);
				var body = {};
				body["status"] = "ERROR";
				body["errormessage"] = err;
				body["action"] = action;
				var respBody = JSON.stringify(body);
				response.write(respBody, function(err) { response.end(); } );
			} else if ( attList == null ) {
				noUser = 1;
				response.writeHead(401, responseHeadParams);
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
		updateAndRespond(query, updateQuery);
	}
}

function getCustomerProviders(response, request, dbcnx, db) {
// Get the info for all providers that a customer is registerd with
// Called based either on the customer's id or the current sessionid

	var sessionid = url.parse(request.url, true).query.sessionid;
	var customerid = url.parse(request.url, true).query.id;
	var action = url.parse(request.url, true).query.action;

	if ( myUndefined.indexOf(sessionid) >= 0 && myUndefined.indexOf(customerid) >= 0 ) { //at least one them needs to be privided to query the DB
		response.writeHead(500, responseHeadParams);
	}

	if ( myUndefined.indexOf(action) >= 0 ) action = "getcustomerproviders"; // if no action is passed default to getcustomerproviders

	// if we have a sessionid,, we use it as field for the request. Otherwise we'll use the customer id
	var getQuery = ( myUndefined.indexOf(sessionid) < 0 ) ? { "sessionid.value" : sessionid } : { "_id" : ObjectId(customerid) };
	console.log("[reqHandlers.getCustomerProviders] getQuery = " + JSON.stringify(getQuery));

	/*
		1. get the information for the customer based on the sessionid or customerid
		2. extract the list of providers linked to it
		3. get the info for each provider
	*/
	customer.doGetFullData(dbcnx, db, getQuery, function (err, attList) {
		if (err) {
			writeErrorResponse(response,500,err,action);
		} else if (attList == null) {
			writeErrorResponse(response,401,"nullfromserver",action);
		} else {
			var providers = attList["providers"].value;
			console.log("Providers = " + JSON.stringify(providers));
			if ( myUndefined.indexOf(providers) >= 0 || providers.length <= 0 ) {
				writeErrorResponse(response,400,"noprovider",action);
			} else {
				var queryList = [];
				//for ( var providerid in Object.keys(providers) ) {
				for ( var providerid in providers ) {
					console.log("Providerid = " + providerid + " (" + providers[providerid] + ")");
					if ( providers[providerid] ) {
						console.log("Pushing to queryList");
						queryList.push({ "_id" : ObjectId(providerid) });
					}
				}
				if ( queryList.length > 0 ) {
					var query = { "$or" : queryList };
					console.log("[reqHandlers.getCustProvs] queryProvIds = " + JSON.stringify(query));
					provider.doGetAll(dbcnx, db, query, function(err, attList) {
						doGetHandler(response,err,attList,action, function() {
							var body = {};
							var providersList = {};
							for ( var prov in attList ) {
								var myProvider = {};
								var provId = attList[prov]._id;
								myProvider["name"] = attList[prov].name.value;
								myProvider["email"] = attList[prov].email.value;
								myProvider["address"] = attList[prov].address.value;
								myProvider["phone"] = attList[prov].phone.value;
								providersList[provId] = myProvider;
							}
							body["providers"] = providersList;
							writeSuccessResponse(response,body);	
						});
						/*
						if (err) {
							writeErrorResponse(response,500,err,action);
						} else if (attList == null) {
							writeErrorResponse(response,401,"nullfromserver",action);
						} else {
							writeSuccessResponse(response,respBody);
						}
						*/
					});
				} else {
					writeErrorResponse(response,400,"noprovider",action);
				}

			}
		}
	});
}

function getAllSubscribers(response, request, dbcnx, db) {
	var type = url.parse(request.url, true).query.type;
	var action = url.parse(request.url, true).query.action;
	var subscriber;

	switch (type) {
		case "customer":
			subscriber = customer;
			break;
		case "provider":
			subscriber = provider;
			break;
		default:
			response.writeHead(500, responseHeadParams);
			var body = {};
			body["status"] = "ERROR";
			body["errormessage"] = "badrequest";
			body["action"] = action;
			var respBody = JSON.stringify(body);
			response.write(respBody, function(err) { response.end(); });
			return;
	}


}

function insertAppointment(response, request, dbcnx, db) {
	var customerid = url.parse(request.url, true).query.customerid;
	var sessionid = url.parse(request.url, true).query.sessionid;
	var providerid = url.parse(request.url, true).query.providerid;
	var date = url.parse(request.url, true).query.date;
	var action = url.parse(request.url, true).query.action;

	if ( myUndefined.indexOf(action) >= 1 ) { action = "insertappointment"; }

	/* 
		the insertion requester (customer/provider) may provide sessionid or his id (customerid,providerid).
		A combination of customerid/prov-sessionid -- cust-sessionid/provideid -- custoemrid/providerid must be prvided
		along with appointment date
	*/

	if ( ( myUndefined.indexOf(sessionid) >= 0 && ( myUndefined.indexOf(customerid) >= 0 && myUndefined.indexOf(providerid) >= 0 ) ) ||
		( myUndefined.indexOf(sessionid) < 0 && ( myUndefined.indexOf(customerid) >= 0 || myUndefined.indexOf(providerid) >=0 ) ) ||
		myUndefined.indexOf(date) >= 0 || date == "" ) {

		writeErrorResponse(response, 400, "badrequest", action);
		return;
	}

	var insertQuery = {};
	insertQuery["customerid"] = customerid;
	insertQuery["providerid"] = providerid;
	insertQuery["date"] = date;

	// check that both customer and provider exist
	var customerCheckQuery = ( myUndefined.indexOf(customerid) >= 0 ) ? { "sessionid.value" : sessionid } : { "_id" : ObjectId(customerid) };
	var providerCheckQuery = ( myUndefined.indexOf(providerid) >= 0 ) ? { "sessionid.value" : sessionid } : { "_id" : ObjectId(providerid) };

	customer.doGet(dbcnx, db, customerCheckQuery, function(err,attList) {
		if ( err || attList == null ) {
			writeErrorResponse(response, 404, "accountnotfound", action);
		} else {
			provider.doGet(dbcnx, db, providerCheckQuery, function(err,attList) {
				if ( err || attList == null ) {
					writeErrorResponse(response, 404, "unknownprovider", action);
				} else {
					appointment.doInsert(dbcnx, db, insertQuery, function(query,exists,message) {
						if ( exists == 1 ) {
							writeErrorResponse(response, 401, message, action);
						} else if ( exists ==0 ) {
							appointment.doGet(dbcnx, db, query, function(err,attList) {
								if (err) {
									writeErrorResponse(response,500,err,action);
								} else if (attList == null) {
									writeErrorResponse(response,404,"nullfromserver",action);
								} else { 
									var body = {};
									body["action"] = action;
									body["id"] = attList["id"];
									writeSuccessResponse(response,body);
								}
							});
						} else {
							writeErrorResponse(response, 500, "dbcnxerror", action);
						}
					});
				}
			});
		}
	});
}

function getCustomerAppointments(response, request, dbcnx, db) {
	var TAG = arguments.callee.name;

	var customerid = url.parse(request.url, true).query.customerid;
	var sessionid = url.parse(request.url, true).query.sessionid;
	var action = url.parse(request.url, true).query.action;

	if ( myUndefined.indexOf(action) >= 0 ) { action = "getcustomerappointments"; }
	
	if ( myUndefined.indexOf(customerid) >= 0 && myUndefined.indexOf(sessionid) >= 0 ) {
		printError(TAG,"wrong request received",request.url);
		writeErrorResponse(response, 400, "badrequest", action);
	} else {
		if ( myUndefined.indexOf(sessionid) < 0 ) {
			var getCustomeridQuery = { "sessionid.value" : sessionid };
			customer.doGet(dbcnx, db, getCustomeridQuery, function(err, attList) {
				if (err || attList == null) {
					printError(TAG,"no customer found for this sessionid","invalidsessionid");
				} else {
					customerid = attList["id"];
					console.log(TAG + " [DEBUG] customerid = " + customerid);
					getCustomeridAppointments(customerid);
				}

			});
		} else {
			getCustomeridAppointments(customerid);
		}
	}

	function getCustomeridAppointments(customerid) {
		var getQuery = { "customerid" : customerid };
		console.log(TAG + " [DEBUG] getting appointments with query: " + JSON.stringify(getQuery));
		if ( ! /^[a-z0-9]{24}/.test(customerid) ) {  console.log(TAG + " [DEBUG] BAD FORMAT OF CUSTOMERID " + customerid); }
		appointment.doGetAll(dbcnx, db, getQuery, function(err,appList) {
			if (err) {
				writeErrorResponse(response,500,err,action);
			} else if (appList == null) {
				writeErrorResponse(response,404,"nullfromserver",action);
			} else {
				var body = {};
				var appointments = {};
				console.log(TAG + " [DEBUG] starting appointments loop. Length = " + appList.length);
				for ( var i in appList ) {
					var appt = appList[i];
					var appid = appt["_id"];
					console.log(TAG + " [DEBUG] i = " + i + " -- appid = " + appt["_id"]);
					appointments[appid] = appt;
				}
				body["appointments"] = appointments;
				writeSuccessResponse(response,body);
			}
		});
	}
}

function updateAppointment(response, request, dbcnx, db) {
	var TAG = arguments.callee.name;

	var urlQuery = url.parse(request.url, true).query;
	var id = urlQuery["id"];
	var customerid = urlQuery["customerid"];
	var providerid = urlQuery["providerid"];
	var date = urlQuery["date"];
	var appStatus = urlQuery["status"];
	var delay = urlQuery["delay"];
	var action = urlQuery["action"];

	if ( myUndefined.indexOf(action) >= 0 || action == "" ) { action = "update"; }

	// either id or (customerid + providerid + date) need to be provided to locate the appointment
	if ( 
		((myUndefined.indexOf(id) >=0 || id == "" ) && ( myUndefined.indexOf(customerid) >= 0 || customerid == "" || myUndefined.indexOf(providerid) >= 0 || providerid == "" || myUndefined.idexOf(date) >= 0 || date == "")) 

	) {
		printError(TAG,"Missing required parameters in URL",JSON.stringify(urlQuery));
		writeErrorResponse(response, 400, "badrequest", action);
	} else {
		/*
			query to search for the appointment and verify it exists. if id is provided, use it as unique identifier.
			if no id is privided, the unique identifier is the combination of customerid + providerid + date
		*/
		var checkQuery = {}; 
		if ( myUndefined.indexOf(id) < 0 && id != "" ) { 
			checkQuery["_id"] = ObjectId(id);
		} else {
			checkQuery["customerid"] = customerid;
			checkQuery["providerid"] = providerid;
			checkQuery["date"] = date;
		}

		var updateQuery = {};
		for ( var field in urlQuery ) {
			if ( ["id","customerid","providerid"].indexOf(field) < 0 ) { //add only the fields provided that are not fixed (id, customer, provider) for update
				updateQuery[field] = urlQuery[field];
			}
		}

		// verify that the update query is not empty. i.e. no updatable fields sent in the url
		if ( Object.keys(updateQuery).length <= 0 ) {
			printError(TAG,"No updatable parameters provided",JSON.stringify(urlQuery));
			writeErrorResponse(response, 400, "badrequest", action);
		} else {
			appointment.doUpdate(dbcnx, db, checkQuery, updateQuery, function(err,query) {
				if (err) {
					console.log(TAG,"Failed to perform update",err);
					writeErrorResponse(response, 500, err, action);
				} else {
					appointment.doGet(dbcnx, db, query, function(err,attList) {
						if (err){
							printError(TAG,"Failed to perform appointment check after update.",err);
							writeErrorResponse(response, 500, err, action);
						} else if ( attList == null ) {
							printError(TAG,"NULL response from server when checking updated appointment","NULL");
							writeErrorResponse(response, 500, "nullfromserver", action);
						} else {
							var body = {};
							var appId = attList["id"];
							body[appId] = attList;
							writeSuccessResponse(response,body);
						}
					});
				}
			});
		}
	}
}

function getProvidersList (response, request, dbcnx, db, callback) {
	var TAG = arguments.callee.name;
	var action = url.parse(request.url, true).query.action;
	if ( myUndefined.indexOf(action) >= 0 ) action = "getproviderslist";

	var getQuery = {};
	provider.doGetAll(dbcnx, db, getQuery, function(err,provList){
		if (err) {
			printError(TAG,"Failed to get the list of providers.",err);
			writeErrorResponse(response, 500, err, action);
		} else if ( provList == null ) {
			printError(TAG,"NULL response from server getting providers list","NULL");
			writeErrorResponse(response, 500, "nullfromserver", action);
		} else {
			var body = {};
			var providers = {};
			for ( var i in provList ) {
				var providerid = provList[i]["_id"];
				providers[providerid] = provList[i];
			}
			body["providers"] = providers;
			writeSuccessResponse(response,body);
		}
	});
}

exports.getCustomer = getCustomer;
exports.getFullCustomerData = getFullCustomerData;
//exports.checkCredentials = checkCredentials;
exports.register = register;
exports.getLostCredentials = getLostCredentials;
exports.updateSetting = updateSetting;
exports.createCustomer = createCustomer;
exports.sessionTimeoutManagement = sessionTimeoutManagement;
exports.getProvider = getProvider;
exports.createProvider = createProvider;
exports.getFullSubscriberData = getFullSubscriberData;
exports.getSubscriber = getSubscriber;
exports.getCustomerProviders = getCustomerProviders;
exports.insertAppointment = insertAppointment;
exports.getCustomerAppointments = getCustomerAppointments;
exports.updateAppointment = updateAppointment;
exports.getProvidersList = getProvidersList;
