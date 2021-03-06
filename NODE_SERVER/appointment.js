'use strict';

var assert = require('assert');
var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var document = require('mongodb').document;
var BSON = require('mongodb').BSON;
var mycollection = 'appointments';
var appointmentAttributes = {
	"date" : "", // milliseconds from 1 Jan 1970
	"customerid" : "", //customer id
	"providerid" : "", //provider id
	"delay" : 0,
	"status" : "tentative",
	"duration" : 1800000,
	"googleId" : ""
};

function getAttDefault(callback) {
	callback(appointmentAttributes);
}

function doInsert (cnx, db, query, callback) {
	var exists = 0;
	var date = query["date"].value;
	var customerid = query["customerid"].value;
	var providerid = query["providerid"].value;
	var checkQuery = {};
	var insertQuery = query;
	
	checkQuery["date"] = date;
	checkQuery["providerid"] = providerid;
	//console.log("[appointment.doInsert()] cnx = " + cnx + " -- db = " + db + " -- checkQuery = " + JSON.stringify(checkQuery) + " -- query = " + JSON.stringify(query));
	
	doGet(cnx, db, checkQuery, function(err,attList) {
		if (err) {
			callback(null);
		} else if (attList != null) {
			var message = "appointmentalreadyin";
			exists = 1;
			callback(query,exists,message);
		} else {
			MongoClient.connect(
				cnx + db,
				function (err, connection) {
					var collection = connection.collection(mycollection);
					for ( var opt in appointmentAttributes ) {
						if ( ! (opt in query) ) {
							insertQuery[opt] = appointmentAttributes[opt];
						}
					}
					//console.log("[appointment.doInsert] collection.insert(" + JSON.stringify(query) + ")");
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
			//console.log("[appointment.doUpdate] Executing update");
			//console.log("[appointment.doUpdate] collection.update(query,{'$set': " + JSON.stringify(updateQuery) + "}, callback(err, " + JSON.stringify(query) + "));");
			collection.update(query,{'$set': updateQuery}, callback(err, query));
		});
}

function doGet (cnx, db, query, callback) {
	var attList = {};
	
	//console.log("[appointment.doGet()] cnx = " + cnx + " -- db = " + db + " -- query = " + JSON.stringify(query));
	
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
					//console.log("[appointment.doGet] adding " + field + " = " + document[field].value + " to attList");
					attList[field] = document[field];
				}
			}
			callback(err,attList);
		}
	});
}

function doGetFullData (cnx, db, query, callback) {
	var attList = {};
	

	//console.log("[appointment.doGetFullData()] cnx = " + cnx + " -- db = " + db + " -- query = " + JSON.stringify(query));
	
	MongoClient.connect( cnx + db, function (err, connection) {
		//assert.equal(null, err);
		if (err) {
			console.log("[appointment.doGetFullData] Mongo DB connection error: " + err);
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
	
	console.log("[appointment.doGetAll] [DEBUG]");
	console.log("[appointment.doGetAll] cnx = " + cnx + " -- db = " + db + " -- query = " + JSON.stringify(query));
	for ( var field in query ) {
		console.log("\"" + field + "\" : \"" + query[field] + "\"");
	}
	console.log("[appointment.doGetAll] [END DEBUG]");
	
	MongoClient.connect( cnx + db, function (err, connection) {
		//assert.equal(null, err);
		if (err) {
			console.log("[appointment.doGetAll] Mongo DB connection error: " + err);
			callback(err,null);
		} else {
			var collection = connection.collection(mycollection);
			collection.find(query).toArray( function (err, documents) {
				if (documents === null) {
					callback(err,null);
				} else {
					console.log("[appointment.doGetAll] Number of documents = " + documents.length);
					callback(err,documents);
				}
			});
		}
	});
}

exports.getAttDefault = getAttDefault;
exports.doInsert = doInsert;
exports.doUpdate = doUpdate;
exports.doGet = doGet;
exports.doGetFullData = doGetFullData;
exports.doGetAll = doGetAll;
