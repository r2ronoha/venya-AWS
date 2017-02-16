'use strict';

var MongoClient = require('mongodb').MongoClient;
var ObjectId = require('mongodb').ObjectId;
var document = require('mongodb').document;
var BSON = require('mongodb').BSON;
var mycollection = 'specialists';

function doInsert (cnx, db, query, callback) {
	var exists = 0;
	var username = query["username"];
	var password = query["password"];
	var email = query["email"];
	var checkQuery = { "username": username };
	
	doGet(cnx, db, checkQuery, function(attList) {
		if (attList != null) {
			var message = "username already registered";
			exists = 1;
			callback(username,password,exists,message);
		} else {
			checkQuery = { "email": email };
			doGet(cnx, db, checkQuery, function(attList) {
				if (attList != null) {
					var message = "email already registered";
					exists = 1;
					callback(username,password,exists,message);
				} else {
					MongoClient.connect(
						cnx + db,
						function (err, connection) {
							var collection = connection.collection(mycollection);
							collection.insert(query, callback(username,password,exists));
						});
				}
			});
		}
	});
}

function doUpdate (cnx, db, query, updateQuery, value) {
	MongoClient.connect(
		cnx + db,
		function (err, connection) {
			var collection = connection.collection(mycollection);
			collection.update(query,{'$set': updateQuery}, function(err) {connection.close()});
		});
}

function doGet (cnx, db, query, callback) {
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

exports.doInsert = doInsert;
exports.doUpdate = doUpdate;
exports.doGet = doGet;