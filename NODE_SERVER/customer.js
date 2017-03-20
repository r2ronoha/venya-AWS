'use strict';

var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var document = require('mongodb').document;
var BSON = require('mongodb').BSON;
var mycollection = 'customers';
var customerAttributes = {
		"type": { "fix": 1, "value": "customer" },
		"firstname": { "fix": 1, "value": "Change Me" },
		"surname": { "fix": 1, "value": "Change Me" },
		"dob" : { "fix" : 1, "value" : "ddmmyyyy" },
		"email": { "fix": 0, "value": "changeme" },
		"username": { "fix": 0, "value": "changeme" },
		"password": { "fix": 0, "value": "changeme" },
		"address": { "fix": 0, "value": { 
			"street": "N/A",
			"postcode": "N/A",
			"city": "N/A",
			"country": "N/A" 
		} },
		"phone": { "fix": 0, "value": "N/A" },
		"times": { "fix": 0, "value": "N/A" },
		"language": { "fix": 0, "value": "ENG" },
		"notifications": { "fix": 0, "value": "true" },
		"location": { "fix": 0, "value": "true" },
		"sessionid" : { "fix": 1, "value": "closed", "timestamp": 0 },
		"providers" : { "fix": 1, "value": {} }
};

function getAttFix(callback) {
	var attFix = {};
	for ( var field in customerAttributes ) {
		//console.log("[customer.geetAttFix] field = " + field + " -- FIX = " + customerAttributes.mandatory[field].fix + " or " + customerAttributes.mandatory[field]["fix"]);
		attFix[field] = customerAttributes[field].fix;
	}
	/*
	for ( var field in customerAttributes.optional ) {
		attFix[field] = customerAttributes.optional[field].fix;
	}
	*/
	callback(attFix);
}

function getAttDefault(callback) {
	callback(customerAttributes);
}

function doInsert (cnx, db, query, callback) {
	var exists = 0;
	var firstname;
	var surname;
	var dob;
	try {
		firstname = query["firstname"].value.toLowerCase();
		surname = query["surname"].value.toLowerCase();
		dob = query["dob"].value;
	} catch (err) {
		console.log("[customer.doInsert] " + err);
		callback(null);
		return;

	}
	var checkQuery = { "firstname.value": firstname, "surname.value": surname, "dob.value" : dob };
	var insertQuery = query;
	
	//console.log("[customer.doInsert()] cnx = " + cnx + " -- db = " + db + " -- checkQuery = " + JSON.stringify(checkQuery) + " -- query = " + JSON.stringify(query));
	
	doGet(cnx, db, checkQuery, function(err,attList) {
		if (err) {
			callback(null);
		} else if (attList != null) {
			var message = "alreadyregistered";
			exists = 1;
			callback(query,exists,message);
		} else {
			MongoClient.connect(
				cnx + db,
				function (err, connection) {
					var collection = connection.collection(mycollection);
					for ( var opt in customerAttributes ) {
						if ( ! (opt in query) ) {
							insertQuery[opt] = customerAttributes[opt];
						}
					}
					//console.log("[customer.doInsert] collection.insert(" + JSON.stringify(query) + ")");
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
			//console.log("[customer.doUpdate] Executing update");
			//console.log("[customer.doUpdate] collection.update(query,{'$set': " + JSON.stringify(updateQuery) + "}, callback(err, " + JSON.stringify(query) + "));");
			collection.update(query,{'$set': updateQuery}, callback(err, query));
		});
}

function doGet (cnx, db, query, callback) {
	var attList = {};
	
	//console.log("[customer.doGet()] cnx = " + cnx + " -- db = " + db + " -- query = " + JSON.stringify(query));
	
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
					//console.log("[customer.doGet] adding " + field + " = " + document[field].value + " to attList");
					attList[field] = document[field].value;
				}
			}
			callback(err,attList);
		}
	});
}

function doGetFullData (cnx, db, query, callback) {
	var attList = {};
	
	//console.log("[customer.doGetFullData()] cnx = " + cnx + " -- db = " + db + " -- query = " + JSON.stringify(query));
	
	MongoClient.connect( cnx + db, function (err, connection) {
		//assert.equal(null, err);
		if (err) {
			console.log("[customer.doGetFullData] Mongo DB connection error: " + err);
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
	
	//console.log("[customer.doGetAll()] cnx = " + cnx + " -- db = " + db + " -- query = " + JSON.stringify(query));
	
	MongoClient.connect( cnx + db, function (err, connection) {
		//assert.equal(null, err);
		if (err) {
			console.log("[customer.doGetAll] Mongo DB connection error: " + err);
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
