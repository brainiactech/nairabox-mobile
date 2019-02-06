var airtime = {
	launch: function () {
		var h = localStorage.lastRecharge ? 65 : 45;

		views.overlay('airtimeStart', h, function () {
			if (localStorage.lastRecharge) {
				var recharge = JSON.parse(localStorage.lastRecharge);
				console.log(recharge);

				app.element("lastRecharge").style.display = "block";
				app.element("lastRechargeNetwork").src = "images/networks/icon_" + recharge.network.toLowerCase() + ".jpg";
				app.element("lastRechargeName").innerHTML = recharge.name;
				app.element("lastRechargePhone").innerHTML = recharge.phone;
				app.element("lastRechargeAmount").innerHTML = app.numberFormat(recharge.amount, localStorage.currency);
			}
			else app.element("lastRecharge").style.display = "none";
		});
	},

	start: function (index) {
		if (index == 1) airtime.prepare({name: "Myself", phone: localStorage.uid, network: localStorage.myNetwork});
		else if (index == 2) app.selectContact(function (contact) {
			airtime.prepare({name: contact.name, phone: contact.phone, network: ""});
		});
		else if (index == 3) airtime.prepare({name: "Others", phone: "", network: ""});
		else if (index == 4) airtime.loadAutoRecharge();
		else if (index == 5) {
			var recharge = JSON.parse(localStorage.lastRecharge);

			airtime.name = recharge.name;
			airtime.network = recharge.network;
			airtime.phone = recharge.phone;
			airtime.amount = recharge.amount;

			airtime.confirmAirtime();
		}
	},

	prepare: function (data) {
		var phone = data.phone;

		if (phone != "") {
			phone = contacts.format(phone);
			if (!phone) {
				app.alert("Unrecognized Number", "The phone number you've selected may not be supported at the moment. Please verify number before you continue.");
				phone = data.phone;
			}
		}

		views.goto("airtimePayment", function () {
			app.element("airtimeName").innerHTML = data.name;
			airtime.setNetwork((data.network != "" && data.network != null) ? data.network : airtime.guessNetwork(phone));
			app.element("airtimePhone").value = phone;
			app.element("airtimeAmount").value = "";
		});
	},

	setNetwork: function(network) {
		app.element("airtimeNetwork").innerHTML = network ? network : "Select a Network";
		app.element("airtimeNetwork").setAttribute("data-value", network);

		var networks = ["AIRTEL", "9MOBILE", "GLO", "MTN"];

		for (var i=0; i<networks.length; i++) {
			if (networks[i] == network) {
				app.element("at" + networks[i]).className = (networks[i] == "MTN") ? "network end selected" : "network selected";
			}
			else {
				app.element("at" + networks[i]).className = (networks[i] == "MTN") ? "network end" : "network";
			}
		}
	},

	guessNetwork: function (phone) {
		if (phone == "") return "";

		prefix = phone.substring(0, 4);

		var networks = {
			"0703": "MTN", "0706": "MTN", "0803": "MTN", "0806": "MTN", "0810": "MTN", "0813": "MTN", "0814": "MTN", "0816": "MTN", "0903": "MTN",
			"0701": "AIRTEL", "0708": "AIRTEL", "0802": "AIRTEL", "0808": "AIRTEL", "0812": "AIRTEL", "0902": "AIRTEL",
			"0705": "GLO", "0805": "GLO", "0807": "GLO", "0811": "GLO", "0815": "GLO", "0905": "GLO",
			"0809": "9MOBILE", "0815": "9MOBILE", "0817": "9MOBILE", "0818": "9MOBILE", "0908": "9MOBILE", "0909": "9MOBILE"
		};

		var network = networks[prefix];
		if (!network) return "";
		else return network;
	},

	verify: function () {
		var name = app.element("airtimeName").innerHTML;
		var network = app.element("airtimeNetwork").getAttribute("data-value");
		var phone = app.element("airtimePhone").value;
		var amount = app.element("airtimeAmount").value;

		if (network == "") {
			app.alert("Select Network", "Please select the network for the airtime you're trying to buy.");
			return;
		}
		else if (phone == "") {
			app.alert("Enter Phone Number", "Please enter the phone number you're trying to buy airtime for.");
			return;
		}
		else if (amount == "") {
			app.alert("Enter Amount", "Please enter the amount of airtime you're trying to buy for " + ((name == "Myself") ? "yourself" : name) + ".");
			return;
		}
		else if (!app.validateAmount(amount)) {
			app.showAmountError();
			return false;
		}

		airtime.name = name;
		airtime.network = network;
		airtime.phone = phone;
		airtime.amount = amount;

		airtime.confirmAirtime();
	},

	confirmAirtime: function () {
		views.impose("sendConfirmation", function () {
			app.element("sendConfirmationPhoto").src = "images/networks/" + airtime.network.toLowerCase() + ".jpg";
			app.element("sendConfirmationPhoto").className = "cover";
			app.element("sendConfirmationClose").style.display = "block";
			app.element("sendConfirmationButtonContainer").style.display = "block";
			app.element("sendConfirmationBusy").style.display = "none";

			app.element("sendConfirmationTitle").innerHTML = airtime.name;
			app.element("sendConfirmationSubtitle").innerHTML = airtime.phone;
			app.element("sendConfirmationNotes").innerHTML = "";
			app.element("sendConfirmationAmount").innerHTML = app.numberFormat(airtime.amount, localStorage.currency);
			app.element("sendConfirmationFees").innerHTML = "";

			app.element("sendConfirmationCaption").innerHTML = "You're buying airtime for";
			app.element("sendConfirmationButton").innerHTML = "BUY NOW";
			transfer.transferType = "AIRTIME";
		});
	},

	buy: function (pin) {
		transfer.showBusy();

		var post = {};
		post.case = "buy";
		post.network = airtime.network;
		post.amount = airtime.amount;
		post.title = airtime.name;
		post.phone = airtime.phone;
		post.pin = pin;
		post.deviceID = localStorage.deviceID;
		post.oauth = localStorage.oauth;

		app.send(app.API + "airtime/", post, function (data) {
			transfer.hideBusy();
			if (data.status == 200) {
				localStorage.balance = data.balance;
				localStorage.savings = data.savings;
				localStorage.balanceTime = app.currentTime();

				if (airtime.phone == localStorage.uid) localStorage.myNetwork = airtime.network;

				localStorage.lastRecharge = JSON.stringify({network: airtime.network, phone:airtime.phone, amount: airtime.amount, name: airtime.name});

				views.impose("sendComplete", function () {
					app.element("sendCompleteTitle").innerHTML = airtime.name;
					app.element("sendCompleteNotes").innerHTML = data.notes;
					app.element("sendCompleteAmount").innerHTML = app.numberFormat(airtime.amount, localStorage.currency);
					app.element("sendCompleteSubtitle").innerHTML = airtime.network + " — " + airtime.phone;
					app.element("sendCompleteFee").innerHTML = "";

					app.element("sendCompleteCaption").innerHTML = "Airtime Sent";
					app.stopSpin(app.element("sendConfirmationBusy"));
					sound.play("complete.mp3", .90);
				});
			}
			else app.alert("Airtime Purchase Failed", data.message);
		});
	},

	loadAutoRecharge: function () {
		app.showBusy();

		app.send(app.API + "airtime/", {case: "list", oauth: localStorage.oauth, deviceID: localStorage.deviceID}, function (data) {
			app.hideBusy();

			if (data.status === 200) airtime.listAutoRecharge(data);
			else app.alert("Auto-Recharge", data.message);
		});
	},

	listAutoRecharge: function (data, ignoreNavigation) {
		var output = "";

		for (var i = 0, count = data.list.length; i < count; i++) {
			var item = data.list[i];
			output += '<div class="priceListItem ' + app.alternate() + '" onclick="airtime.startRemoveAutoRecharge(\'' + item.id + '\')">' +
				'<div class="title">' + item.contact + '</div>' +
				'<div class="type">' + item.period + '</div>' +
				'<div class="price">' + app.numberFormat(item.amount, localStorage.currency) + '</div>' +
			'</div>';
		}

		var displayList = function () {
			app.element("autoRechargeList").innerHTML = output;
			if (data.list.length) app.element("autoRechargeEmpty").style.display = "none";
			else app.element("autoRechargeEmpty").style.display = "block";
		};

		if (ignoreNavigation) displayList();
		else views.goto("autoRecharge", displayList);
	},

	startAddAutoRecharge: function (myself) {
		views.goto("addAutoRecharge", function () {
			if (myself) {
				var data = "MYSELF: " + localStorage.uid;
				app.element("autoRechargePhone").innerHTML = data
				app.element("autoRechargePhone").setAttribute("data-value", data);
				app.element("autoRechargeNetwork").value = airtime.guessNetwork(localStorage.uid);
			}
			else {
				app.element("autoRechargePhone").innerHTML = "Select a Contact";
				app.element("autoRechargePhone").setAttribute("data-value", "");
				app.element("autoRechargeNetwork").value = "";
			}

			app.element("autoRechargeDay").style.display = app.element("autoRechargeDate").style.display = "none";

			app.element("autoRechargeAmount").value = app.element("autoRechargeFrequency").value = app.element("autoRechargeDay").value = app.element("autoRechargeDate").value = "";
		});
	},

	selectAutoRechargeContact: function () {
		app.selectContact(function (contact) {
			var phone = contacts.format(contact.phone);
			if (!phone) {
				app.alert("Unrecognized Number", "The phone number you've selected may not be supported at the moment. Please verify number before you continue.");
				phone = contact.phone;
			}

			var data = contact.name + ": " + phone;
			app.element("autoRechargePhone").innerHTML = data;
			app.element("autoRechargePhone").setAttribute("data-value", data);

			app.element("autoRechargeNetwork").value = airtime.guessNetwork(phone);
			views.hideOverlay();
		})
	},

	selectAutoRechargeFrequency: function () {
		var frequency = app.valueOf("autoRechargeFrequency");

		if (frequency == "DAILY") app.element("autoRechargeDay").style.display = app.element("autoRechargeDate").style.display = "none";
		else if (frequency == "WEEKLY") {
			app.element("autoRechargeDay").style.display = "block";
			app.element("autoRechargeDate").style.display = "none";
		}
		else if (frequency == "MONTHLY") {
			app.element("autoRechargeDay").style.display = "none";
			app.element("autoRechargeDate").style.display = "block";
		}
	},

	saveAutoRecharge: function () {
		var contact = app.element("autoRechargePhone").getAttribute("data-value");
		var network = app.valueOf("autoRechargeNetwork");
		var amount = app.valueOf("autoRechargeAmount");
		var frequency = app.valueOf("autoRechargeFrequency");
		var day = app.valueOf("autoRechargeDay");
		var date = app.valueOf("autoRechargeDate");

		if (contact == "" || !contact) {
			app.alert("Select a Contact", "You need to select a contact from your phone to continue.");
			return;
		}
		else if (network == "") {
			app.alert("Select Network", "Please select the network to Auto-Recharge " + contact);
			return;
		}
		else if (amount == "") {
			app.alert("Enter Amount to Recharge", "Please enter the amount of airtime you'd like to Auto-Recharge for " + contact.split(": ")[0] + ".");
			return;
		}
		else if (!app.validateAmount(amount)) {
			app.showAmountError();
			return;
		}
		else if (frequency == "") {
			app.alert("Select Recharge Frequency", "How often would you like to Auto-Recharge " + contact.split(": ")[0] + "?");
			return;
		}
		else if (frequency == "WEEKLY" && day == "") {
			app.alert("Select Day to Recharge", "What day of the week would you like to process this Auto-Recharge?");
			return;
		}
		else if (frequency == "MONTHLY" && date == "") {
			app.alert("Select Date to Recharge", "What date of the month would you like to process this Auto-Recharge?");
			return;
		}

		airtime.transaction = {case: "add", oauth: localStorage.oauth, deviceID: localStorage.deviceID, contact: contact, network: network, amount: amount, frequency: frequency, day: day, date: date};

		app.EnterPIN('AUTO_RECHARGE');
	},

	confirmAutoRecharge: function (pin) {
		app.showBusy();
		airtime.transaction.pin = pin;

		app.send(app.API + "airtime/", airtime.transaction, function (data) {
			app.hideBusy();

			if (data.status === 200) {
				app.alert("Auto-Recharge Added", data.message);
				views.back(function () {
					airtime.listAutoRecharge(data, true);
				});
			}
			else app.alert("Auto-Recharge Failed", data.message);
		});
	},

	startRemoveAutoRecharge: function (id) {
		views.overlay("removeAutoRecharge", 20, function () {
			app.element("removeAutoRechargeID").setAttribute("onclick", "airtime.removeAutoRecharge('" + id + "')");
		});
	},

	removeAutoRecharge: function (id) {
		app.showBusy();

		app.send(app.API + "airtime/", {case: "remove", id: id, oauth: localStorage.oauth, deviceID: localStorage.deviceID}, function (data) {
			app.hideBusy();

			if (data.status === 200) airtime.listAutoRecharge(data);
			else app.alert("Couldn't Delete Entry", data.message);
		});
	}
};
