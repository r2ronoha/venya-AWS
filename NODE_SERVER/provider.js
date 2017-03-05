'use strict';

var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var document = require('mongodb').document;
var BSON = require('mongodb').BSON;
var mycollection = 'providers';
var providerAttributes = {
		"type": { "fix": 1, "value": "provider" },
		"name": { "fix": 1, "value": "Change Me" }, // person name, company name, practice...
		//"firstname": { "fix": 1, "value": "Change Me" },
		//"surname": { "fix": 1, "value": "Change Me" },
		"email": { "fix": 0, "value": "changeme@venya.com" },
		"username": { "fix": 0, "value": "changeme" },
		"password": { "fix": 0, "value": "changeme" },
		"address": { "fix": 0, "value": { 
			"street": "N/A",
			"postcode": "N/A",
			"city": "N/A",
			"country": "N/A" 
		} },
		"phone": { "fix": 0, "value": "N/A" },
		"language": { "fix": 0, "value": "ENG" },
		"sessionid" : { "fix": 1, "value": "closed", "timestamp": 0 }
};

function getAttFix(callback) {
	var attFix = {};
	for ( var field in providerAttributes ) {
		//console.log("[provider.geetAttFix] field = " + field + " -- FIX = " + providerAttributes.mandatory[field].fix + " or " + providerAttributes.mandatory[field]["fix"]);
		attFix[field] = providerAttributes[field].fix;
	}
	/*
	for ( var field in providerAttributes.optional ) {
		attFix[field] = providerAttributes.optional[field].fix;
	}
	*/
	callback(attFix);
}

function getAttDefault(callback) {
	callback(providerAttributes);
}

function doInsert (cnx, db, query, callback) {
	var exists = 0;
	var name;
	try {
		name = query["name"].value.toLowerCase();
	} catch (err) {
		console.log("[provider.createProvider] " + err);
		callback(null);
		return;
	}	
	var checkQuery = { "name.value" : name };
	var insertQuery = query;
	
	//console.log("[provider.doInsert()] cnx = " + cnx + " -- db = " + db + " -- checkQuery = " + JSON.stringify(checkQuery) + " -- query = " + JSON.stringify(query));
	
	doGet(cnx, db, checkQuery, function(err,attList) {
		if (err) {
			callback(null);
		} else if (attList != null) {
			var message = "provideralreadyregistered";
			exists = 1;
			callback(query,exists,message);
		} else {
			MongoClient.connect(
				cnx + db,
				function (err, connection) {
					var collection = connection.collection(mycollection);
					for ( var opt in providerAttributes ) {
						if ( ! (opt in query) ) {
							insertQuery[opt] = providerAttributes[opt];
						}
					}
					//console.log("[provider.doInsert] collection.insert(" + JSON.stringify(query) + ")");
					collection.insert(insertQuery, callback(query,exists));
				});
		}
	});
}

function doUpdate (cnx, db, query, updateQuery, callback) {
	MongoClient.connect(
		cnx + db,
		function (err, connection) {
			var collection = connection.collection(mycollection);
			//console.log("[provider.doUpdate] Executing update");
			//console.log("[provider.doUpdate] collection.update(query,{'$set': " + JSON.stringify(updateQuery) + "}, callback(err, " + JSON.stringify(query) + "));");
			collection.update(query,{'$set': updateQuery}, callback(err, query));
		});
}

function doGet (cnx, db, query, callback) {
	var attList = {};
	
	//console.log("[provider.doGet()] cnx = " + cnx + " -- db = " + db + " -- query = " + JSON.stringify(query));
	
	doGetFullData (cnx, db, query, function(err, document) {
		if (err) {
			callback(err,null);
		} else if (document === null) {
			callback(err,null);
		} else {
			for ( var field in document ) {
				if (field == "_id"){
					attList["id"] = document[field];
				} else {
					//console.log("[provider.doGet] adding " + field + " = " + document[field].value + " to attList");
					attList[field] = document[field].value;
				}
			}
			callback(err,attList);
		}
	});
}

function doGetFullData (cnx, db, query, callback) {
	var attList = {};
	
	//console.log("[provider.doGetFullData()] cnx = " + cnx + " -- db = " + db + " -- query = " + JSON.stringify(query));
	
	MongoClient.connect( cnx + db, function (err, connection) {
		//assert.equal(null, err);
		if (err) {
			console.log("[provider.doGetFullData] Mongo DB connection error: " + err);
			err = "dbcnxerror";
			callback(err,null);
		} else {
			var collection = connection.collection(mycollection);
			collection.findOne(query, function (err, document) {
				if (document === null) {
					callback(err,null);
				} else {
					callback(err,document);
				}
			});
		}
	});
}

function doGetAll (cnx, db, query, callback) {
	var attList = {};
	
	//console.log("[provider.doGetAll()] cnx = " + cnx + " -- db = " + db + " -- query = " + JSON.stringify(query));
	
	MongoClient.connect( cnx + db, function (err, connection) {
		//assert.equal(null, err);
		if (err) {
			console.log("[provider.doGetAll] Mongo DB connection error: " + err);
			callback(err,null);
		} else {
			var collection = connection.collection(mycollection);
			collection.find(query).toArray( function (err, documents) {
				if (documents === null) {
					callback(err,null);
				} else {
					callback(err,documents);
				}
			});
		}
	});
}

exports.getAttFix = getAttFix;
exports.getAttDefault = getAttDefault;
exports.doInsert = doInsert;
exports.doUpdate = doUpdate;
exports.doGet = doGet;
exports.doGetFullData = doGetFullData;
exports.doGetAll = doGetAll;
