var urlParams = {};
var customerDetails = {};
var customerId;
var idLength = 24;
var sessionidLength = idLength + 2;
var venya_node_server = document.location.hostname;
var venya_node_port = 8888;
var nameFields = ['firstname','surname'];
var upperCaseFields = ['postcode','language','notifications','location'];
var booleanFields = ['notifications','location'];
var booleanValues = {'true' : 'on', 'false' : 'off'};
var privateFields = ['id','sessionid','type','action'];
var secretFields = ['password'];
//var emailFormat = new RegExp("^[^@]+@[^@]+\\.[^@]+$","g");
//var emailFormat = new RegExp("[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?","g");
var emailFormat = new RegExp("^\\w+([\\.-_]?\\w+)*@\\w+([\\.-_]?\\w+)*(\\.\\w{2,3})+$","g");
var usernameFormat = new RegExp("^\\w{8,}$","g");
var passwordFormat = new RegExp("^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z]).{6,}$","g");
var phoneFormat = new RegExp("^(\\+|00)?[0-9]{4,}$","g");
var objectidFormat = new RegExp("^[0-9a-fA-F]{24}$");
var postcodeFormat = new RegExp("^\\w+([\\s-]*\\w*)?$");
//var postcodeFormat = new RegExp("^[0-9]+$");
var defaultUsername = "changeme";

var pages = {
	"choosesite_esp" : "choose_site_esp.html",
	"choosesite_eng" : "choose_site_eng.html",
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
		"times": "changeTimes.html",
		"phone": "changePhone.html"
	},
	"lostusername" : "lostUsername.html",
	"lostpassword" : "lostPassword.html",
	"webcreatecustomer" : "web_create_customer.html",
	"webnewappointment" : "web_new_appointment.html",
	"showlostinfo" : "show_lost_info.html",
	"logout" : "logout.html"
}


//var languages = ["eng","esp","fra","ger"];
var languages = ["eng","esp"];
var default_lang = "eng";

function parseUrl(callback){
	venya_node_server = document.location.hostname; 
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
	//return venya_node_server;
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

function formatName(value) {
	var nameparts = value.split(" ");
	for (var part in nameparts) {
		nameparts[part] = nameparts[part][0].toUpperCase() + nameparts[part].substring(1);
	}
	return nameparts.join(' ');
}

function hideValue(value) {
	return value.replace(/./g,'*');
}

function createDataTable(tableData, lang, action){
	if ( tableData == null ) tableData = urlParams;
	if ( lang == null || languages.indexOf(lang) < 0 ) {
		console.log("[parsing.createDataTable] language " + lang + " not supported. Setting it to " + default_lang);
		lang = default_lang;
	}
	if ( action == null ) action = "home";

	var table = document.createElement("table");
	table.className = "settings";
	for (var field in tableData) {
		//console.log("[parsing.createDataTable] field to process : " + field);
		if ( privateFields.indexOf(field) < 0 ) {
			var row = document.createElement("tr");
			
			var fieldCell = document.createElement("td");
			var fieldTag = languages_text[lang]["customer"][field];
			fieldCell.appendChild(document.createTextNode(fieldTag));
			fieldCell.className = "field";
			row.appendChild(fieldCell);
			
			var valueCell = document.createElement("td");
			
			var value = tableData[field];
			//console.log("[parsing.createDataTable] value = " + value);
			
			if ( booleanFields.indexOf(field) > -1 ) {
				value = booleanValues[value];
			}

			if ( secretFields.indexOf(field) > -1 ) {
				value = hideValue(value);
			} else if ( nameFields.indexOf(field) > -1 ) {
				value = formatName(value);
			} else if ( upperCaseFields.indexOf(field) > -1 ) {
				value = value.toUpperCase();
			}

			if ( field == "address" ) {
				var myAddress = "";
				for ( var elt in value ) {
					if ( value[elt].toLowerCase() != "n/a" ) {
						//console.log("[parsing.creatDataTable] Adding value[elt] " + value[elt] + " to user address");
						if ( upperCaseFields.indexOf(elt) > -1 ) { 
							myAddress += value[elt].toUpperCase() + ", "
						} else { myAddress += formatName(value[elt]) + ", "; }
					}
				}
				value = myAddress.replace(/, $/,'');				
				if ( value == "" ) { value = "N/A"; }
				//else value = formatName(value);
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

function getCustomerSessionidDetails(action,sessionid,callback) {
	venya_node_server = document.location.hostname;
	var myUrl = "http://" + venya_node_server + ":" + venya_node_port + "/getCustomer?action=" + action + "&sessionid=" + sessionid;
	var xhr = new XMLHttpRequest();
	xhr.open('GET',myUrl,true);
	xhr.send();
	xhr.onreadystatechange = processRequest;
	
	function processRequest(e) {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				//console.log(xhr.responseText);
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
				var params = {};
				params["status"] = response["status"];
				params["errormessage"] = response["errormessage"];
				goTo(pages.signin,params);
				//var errorUrl = "./signin.html?status=" + response["status"] + "&errormessage=" + escape(response["errormessage"]);
				//location.href=errorUrl;
			}
		}
	}
}

function getCustomerSessionidFullDetails(action,sessionid,callback) {
	venya_node_server = document.location.hostname;
	var myUrl = "http://" + venya_node_server + ":" + venya_node_port + "/getFullCustomerData?action=" + action + "&sessionid=" + sessionid;
	//console.log("[parsing.getCustomerFullDetails] myUrl : " + myUrl);
	var xhr = new XMLHttpRequest();
	xhr.open('GET',myUrl,true);
	xhr.send();
	xhr.onreadystatechange = processRequest;
	
	function processRequest(e) {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				//console.log("[parsing.getCustomerFullDetails] xhr.responseText: " + xhr.responseText);
				var response = JSON.parse(xhr.responseText);
				for (var field in response) {
					if ( field != "status" ) {
						var value = response[field];
						if ( value == undefined ) value = "N/A";
						customerDetails[field] = response[field];
						//console.log("[parsing.getCustomerFullDetails] field: \"" + field + "\" : " + JSON.stringify(customerDetails[field]));
					}
				}
				callback();
			} else {
				var response = JSON.parse(xhr.responseText);
				var params = {};
				params["status"] = response["status"];
				params["errormessage"] = response["errormessage"];
				goTo(pages.signin,params);
				//var errorUrl = "./signin.html?status=" + response["status"] + "&errormessage=" + escape(response["errormessage"]);
				//location.href=errorUrl;
			}
		}
	}
}

function getCustomerDetails(action,id,callback) {
	venya_node_server = document.location.hostname;
	var myUrl = "http://" + venya_node_server + ":" + venya_node_port + "/getCustomer?action=" + action + "&id=" + id;
	var xhr = new XMLHttpRequest();
	xhr.open('GET',myUrl,true);
	xhr.send();
	xhr.onreadystatechange = processRequest;
	
	function processRequest(e) {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				//console.log(xhr.responseText);
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
				var params = {};
				params["status"] = response["status"];
				params["errormessage"] = response["errormessage"];
				goTo(pages.signin,params);
				//var errorUrl = "./signin.html?status=" + response["status"] + "&errormessage=" + escape(response["errormessage"]);
				//location.href=errorUrl;
			}
		}
	}
}

function getCustomerFullDetails(action,id,callback) {
	venya_node_server = document.location.hostname;
	var myUrl = "http://" + venya_node_server + ":" + venya_node_port + "/getFullCustomerData?action=" + action + "&id=" + id;
	//console.log("[parsing.getCustomerFullDetails] myUrl : " + myUrl);
	var xhr = new XMLHttpRequest();
	xhr.open('GET',myUrl,true);
	xhr.send();
	xhr.onreadystatechange = processRequest;
	
	function processRequest(e) {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				//console.log("[parsing.getCustomerFullDetails] xhr.responseText: " + xhr.responseText);
				var response = JSON.parse(xhr.responseText);
				for (var field in response) {
					if ( field != "status" ) {
						var value = response[field];
						if ( value == undefined ) value = "N/A";
						customerDetails[field] = response[field];
						//console.log("[parsing.getCustomerFullDetails] field: \"" + field + "\" : " + JSON.stringify(customerDetails[field]));
					}
				}
				callback();
			} else {
				var response = JSON.parse(xhr.responseText);
				var params = {};
				params["status"] = response["status"];
				params["errormessage"] = response["errormessage"];
				goTo(pages.signin,params);
				//var errorUrl = "./signin.html?status=" + response["status"] + "&errormessage=" + escape(response["errormessage"]);
				//location.href=errorUrl;
			}
		}
	}
}

function randomSessionID(id,min,max) {
	var sufix = Math.floor( Math.random()*(max - min + 1) + min );
	var sessionId = id + sufix.toString().replace(/^([0-9])$/,"0$1");
	//console.log("[parsing.randomSessionID] Session ID = " + sessionId );
	return sessionId;
}

function displayMenu(targetId,text) {
	document.getElementById(targetId).innerHTML = text[0].toUpperCase() + text.substring(1);
}

function displayForm(targetId,text) {
	var displayText = text[0].toUpperCase() + text.substring(1);
	var myField = document.getElementById(targetId);
	myField.innerHTML = displayText;
	if ( myField.placeholder != undefined ) { 
		myField.placeholder = displayText;
	}
}

function formatMessage(messages) {
	var formatedMsg = "";
	for ( msg in messages ) {
		formatedMsg += messages[msg] + " ";
	}
	return formatedMsg = formatedMsg[0].toUpperCase() + formatedMsg.substring(1).replace(/ $/,"");
}

function setFormErrorHeader(params,langTexts) {
	var notErrorFields = { "status": "status", "errormessage": "errormessage", "action": "action", "sessionid": "sessionid", "lang": "lang" };

	if (params["status"] == "ERROR") {
		if (params["errormessage"] == "input") {
			setHeader("h2",formatMessage([langTexts["errors"]["badfields"]]));
			for (var field in params) {
				if ( field != "status" && !(field in notErrorFields)) {
					var headText = formatMessage([langTexts["customer"][field],":",params[field]]);
					setHeader("h5",headText);
				}
			}
		} else {
			setHeader("h3",formatMessage([langTexts["errors"][params["errormessage"]]]));
		}
	}
}

function getCredentialsProcessRequest(url,credential,lang,errorid) {
	var email;
	var message;
	var myCredential;
	var respStatus;
	var langTexts = languages_text[lang];
	
	var xhr = new XMLHttpRequest();
	xhr.open('GET',url,true);
	//xhr.setRequestHeader('Access-Control-Allow-Origin','*');
	xhr.send();
	xhr.onreadystatechange = processRequest;

	function processRequest(e) {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				//console.log(xhr.responseText);
				var response = JSON.parse(xhr.responseText);
				var params = {};
				params["lang"] = lang;
				params["status"] = "SUCCESS";
				params["message"] = response["errormessage"];
				params["email"] = response["email"];
				params["info"] = credential;
				params["credential"] = response[credential];
				goTo(pages.showlostinfo,params);
			} else {
				try {
					var response = JSON.parse(xhr.responseText);
					var params = {};
					params["lang"] = lang;
					params["status"] = response["status"];
					params["message"] = response["errormessage"];
					params["email"] = response["email"];
					document.getElementById(errorid).innerHTML = formatMessage([langTexts["errors"][response["errormessage"]]]);
					//goTo(errUrl,params);
				} catch (err) {
					document.getElementById(errorid).innerHTML = formatMessage([langTexts["errors"]["dbcnxerror"]]);
				}
			}
			
		}
	}
}

function verifySessionId(sessionid,callback) {
	//console.log("[parsing.verifySessionID] checking sessionid");
	if ( sessionid.length != sessionidLength ) {
		console.log("[parsing.verifySessionID] session id FAILED. Wrong length." );
		var urlParams = {};
		urlParams["lang"] = default_lang;
		urlParams["status"] = "ERROR";
		urlParams["errormessage"] = "invalidsessionid";
		goTo(pages.signin,urlParams);
	} else {
		var customerid = sessionid.substring(0,sessionid.length - 2);
		getCustomerDetails("checksessionid",customerid,function() {
			var currentSessionid = customerDetails["sessionid"];
			if ( sessionid != currentSessionid ) {
				console.log("[parsing.verifySessionID] session id FAILED");
				var urlParams = {};
				urlParams["lang"] = customerDetails["language"];
				urlParams["status"] = "ERROR";
				urlParams["errormessage"] = "invalidsessionid";
				goTo(pages.signin,urlParams);
			} else {
				//console.log("[parsing.verifySessionID] session id verified. Callback");
				callback();
			}
		});
	}
}

function setSessionId(values,urlParams) {
//function update(values) {
	var id = values["id"];
	var field = values["field"];
	var oldvalue = values["oldvalue"];
	var newvalue = values["newvalue"];

	var xhr = new XMLHttpRequest();
	var myUrl = "http://" + venya_node_server + ":" + venya_node_port + "/updateSetting?action=update&id=" + id + "&field=" + field + "&newvalue=" + newvalue;
	if ( oldvalue != undefined ) myUrl += "&oldvalue=" + oldvalue;
	xhr.open('GET',myUrl,true);
	xhr.send();
	xhr.onreadystatechange = processRequest;

	function processRequest(e) {
		if (xhr.readyState == 4) {
			if (xhr.status == 200) {
				goTo(pages.home,urlParams);
			} else {
				var response = JSON.parse(xhr.responseText);
				var gotoParams = {};
				gotoParams["action"] = urlParams["action"];
				gotoParams["status"] = response["status"];
				gotoParams["errormessage"] = response["errormessage"];
				gotoParams["lang"] = urlParams["lang"];
				goTo(pages.signin,gotoParams);
			}
		}
	}
}
