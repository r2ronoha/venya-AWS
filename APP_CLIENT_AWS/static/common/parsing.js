var urlParams = {};
var customerDetails = {};
var customerId;
var venya_server_ip;
var venya_server_port = 8888;
//var emailFormat = new RegExp("^[^@]+@[^@]+\\.[^@]+$","g");
//var emailFormat = new RegExp("[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?","g");
var emailFormat = new RegExp("^\\w+([\\.-_]?\\w+)*@\\w+([\\.-_]?\\w+)*(\\.\\w{2,3})+$","g");
var usernameFormat = new RegExp("^\\w{8,}$","g");
var passwordFormat = new RegExp("^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{6,}$","g");
var phoneFormat = new RegExp("^(\\+|00)?[0-9]+$","g");
var objectidFormat = new RegExp("^[0-9a-fA-F]{24}$");
var postcodeFormat = new RegExp("^\\w+([\\s-]*\\w*)?$");
//var postcodeFormat = new RegExp("^[0-9]+$");

var pages = {
	"signin": "signin.html",
	"home": "home.html",
	"register": "register.html",
	"settings": "settings.html",
	"changeSettings": "changeSettings.html",
	"appointments": "appointments.html",
	"notifications": "notifications.html",
	"settingsPages": {
		"email": "changeEmail.html",
		"password": "changePassword.html",
		"times": "changeTimes.html",
		"username": "changeUsername.html",
		"address": "changeAddress.html",
		"times": "chamgeTimes.html"
	},
	"webcreatecustomer" : "web_create_customer.html",
	"webnewappointment" : "web_new_appointment.html"
}
var booleanField = {0: 0, "0": "0", 1: 1, "1": "1"};

var languages = ["ENG","ESP","FRA","GER"];

function parseUrl(callback){
	venya_server_ip = document.location.hostname; 
	//console.log("document.location.hostname = " + document.location.hostname);
	var params = document.location.search.replace(/^\?/,'').split('&');
	for (var i=0; i < params.length; i++) {
		var field = params[i].split('=')[0];
		var value = params[i].split('=')[1];
		urlParams[field] = value;
	}
	customerId = urlParams["id"];
	if ( callback ) {
		callback();
	}
	//return venya_server_ip;
}

function setHeader(headType,message){
	var header = document.createElement(headType);
	header.appendChild(document.createTextNode(unescape(message)));
	//header.appendChild(document.createTextNode(unescape(message.toUpperCase())));
	document.body.appendChild(header);
}

function goTo(page,params) {
	var target = "./" + page + "?";
	for (var param in params) {
		target += param + "=" + params[param] + "&";
	}
	location.href = target.replace(/[?&]$/,'');
}

function createDataTable(tableData){
	if ( tableData == null ) tableData = urlParams;
	var table = document.createElement("table");
	table.className = "settings";
	for (var field in tableData) {
		if (field != "action") {
			var row = document.createElement("tr");
			
			var fieldCell = document.createElement("td");
			fieldCell.appendChild(document.createTextNode(field));
			fieldCell.className = "field";
			row.appendChild(fieldCell);
			
			var valueCell = document.createElement("td");
			
			var value = tableData[field];
			if ( field == "firstname" || field == "surname" ) {
				value = value[0].toUpperCase() + value.substring(1);
			}
			if ( field == "address" ) {
				var myAddress = "";
				for ( var elt in value ) {
					if ( value[elt] != "N/A" ) {
						console.log("[parsing.creatDataTable] Adding value[elt] " + value[elt] + " to user address");
						myAddress += value[elt] + ", ";
					}
				}
				value = myAddress.replace(/, $/,'');				
				if ( value == "" ) { value = "N/A"; }
			}
			
			//valueCell.appendChild(document.createTextNode(unescape(tableData[field])));
			valueCell.appendChild(document.createTextNode(unescape(value)));
			valueCell.className = "value";
			row.appendChild(valueCell);
			
			table.appendChild(row);
		}
	}
	document.body.appendChild(table);
}

function getCustomerDetails(action,id,callback) {
	venya_server_ip = document.location.hostname;
	var myUrl = "http://" + venya_server_ip + ":" + venya_server_port + "/getCustomer?action=" + action + "&id=" + id;
	var xhr = new XMLHttpRequest();
	xhr.open('GET',myUrl,true);
	xhr.send();
	xhr.onreadystatechange = processRequest;
	
	function processRequest(e) {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				console.log(xhr.responseText);
				var response = JSON.parse(xhr.responseText);
				for (var field in response) {
					if ( field != "status" ) {
						var value = response[field];
						if ( value == undefined ) value = "N/A";
						customerDetails[field] = response[field];
					}
				}
				callback();
			} else {
				var response = JSON.parse(xhr.responseText);
				var errorUrl = "./signin.html?status=" + response["status"] + "&errormessage=" + escape(response["errormessage"]);
				location.href=errorUrl;
			}
		}
	}
}

function getCustomerFullDetails(action,id,callback) {
	venya_server_ip = document.location.hostname;
	var myUrl = "http://" + venya_server_ip + ":" + venya_server_port + "/getFullCustomerData?action=" + action + "&id=" + id;
	console.log("[parsing.getCustomerFullDetails] myUrl : " + myUrl);
	var xhr = new XMLHttpRequest();
	xhr.open('GET',myUrl,true);
	xhr.send();
	xhr.onreadystatechange = processRequest;
	
	function processRequest(e) {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				console.log("[parsing.getCustomerFullDetails] xhr.responseText: " + xhr.responseText);
				var response = JSON.parse(xhr.responseText);
				for (var field in response) {
					if ( field != "status" ) {
						var value = response[field];
						if ( value == undefined ) value = "N/A";
						customerDetails[field] = response[field];
						console.log("[parsing.getCustomerFullDetails] field: \"" + field + "\" : " + JSON.stringify(customerDetails[field]));
					}
				}
				callback();
			} else {
				var response = JSON.parse(xhr.responseText);
				var errorUrl = "./signin.html?status=" + response["status"] + "&errormessage=" + escape(response["errormessage"]);
				location.href=errorUrl;
			}
		}
	}
}

function randomSessionID(id,min,max) {
	var sufix = Math.floor( Math.random()*(max - min + 1) + min );
	var sessionId = id + sufix.toString().replace(/^([0-9])$/,"0$1");
	console.log("[parsing.randomSessionID] Session ID = " + sessionId );
	return sessionId;
}
