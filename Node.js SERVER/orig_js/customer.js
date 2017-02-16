'use strict';

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var document = require('mongodb').document;
var BSON = require('mongodb').BSON;
var mycollection = 'customers';
var customerAttributes = {
		"type": { "fix": 1, "value": "customer" },
		"firstname": { "fix": 1, "value": "Change Me" },
		"surname": { "fix": 1, "value": "Change Me" },
		"email": { "fix": 0, "value": "changme@venya.com" },
		"username": { "fix": 0, "value": "changeme" },
		"password": { "fix": 0, "value": "changeme" },
		"address": { "fix": 0, "value": { 
										"street": "N/A",
										"postcode": "N/A",
										"city": "N/A",
										"country": "N/A" 
										} },
		"phone": { "fix": 1, "value": "N/A" },
		"times": { "fix": 0, "value": "N/A" },
		"language": { "fix": 0, "value": "ENG" },
		"notifications": { "fix": 0, "value": 1 },
		"location": { "fix": 0, "value": 1 }
};

function getAttFix(callback) {
	var attFix = {};
	for ( var field in customerAttributes ) {
		//console.log("field = " + field + " -- FIX = " + customerAttributes.mandatory[field].fix + " or " + customerAttributes.mandatory[field]["fix"]);
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
	var firstname = query["firstname"].value;
	var surname = query["surname"].value;
	var checkQuery = { "firstname.value": firstname, "surname.value": surname };
	var insertQuery = query;
	
	doGet(cnx, db, checkQuery, function(attList) {
		if (attList != null) {
			var message = "user already registered";
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
					console.log("collection.insert(" + JSON.stringify(query) + ")");
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
			console.log("Executing update");
			console.log("collection.update(query,{'$set': " + JSON.stringify(updateQuery) + "}, callback(err, " + JSON.stringify(query) + "));");
			collection.update(query,{'$set': updateQuery}, callback(err, query));
		});
}

function doGet (cnx, db, query, callback) {
	var attList = {};
	
	doGetFullData (cnx, db, query, function(document) {
		if (document === null) {
			callback(null);
		} else {
			for ( var field in document ) {
				if (field == "_id"){
					attList["id"] = document[field];
				} else {
					attList[field] = document[field].value;
				}
			}
			callback(attList);
		}
	});
}

function doGetFullData (cnx, db, query, callback) {
	var attList = {};
	
	MongoClient.connect(
		cnx + db,
		function (err, connection) {
			var collection = connection.collection(mycollection);
			
			collection.findOne(query, function (err, document) {
					if (document === null) {
						callback(null);
					} else {
						callback(document);
					}
				});
		});
}

exports.getAttFix = getAttFix;
exports.getAttDefault = getAttDefault;
exports.doInsert = doInsert;
exports.doUpdate = doUpdate;
exports.doGet = doGet;
exports.doGetFullData = doGetFullData;