var merchant = {
	Authorize: function () {
		var uid = app.valueOf("merchantUID");
		var pin = app.valueOf("merchantPIN");
		var deviceID = app.valueOf("merchantTID");
		
		if (!uid || !pin) {
			app.alert("Missing Data", "All fields are required to sign into this merchant account.");
			return;
		}
		
		app.showBusy();
		app.send(app.API + "authorize/", {case: "merchant", uid: uid, pin: pin, deviceID: deviceID}, function (data) {
			app.hideBusy();
			if (data.status === 200) {
				localStorage.accountType = "B";
				localStorage.uid = data.uid;
				localStorage.oauth = data.oauth;
				localStorage.deviceID = data.deviceID;
				localStorage.photo = data.photo;
				localStorage.name = data.name;
				localStorage.currency = data.currency;
				localStorage.progress = "complete";
				
				merchant.start();
			}
			else app.alert("Authorization Failed", data.message);
		});
	},
	
	start: function (isNewSession) {
		var callback = function () {
			app.element("merchantLogo").src = localStorage.photo;
			app.element("merchantName").innerHTML = localStorage.name;
		};
		
		if (isNewSession) views.start("merchantStart", callback);
		else views.goto("merchantStart", callback);
	},
	
	startPayment: function () {
		views.goto("merchantPayment", function () {
			app.element("merchantPaymentAmount").value = "";
			setTimeout(function () {
				app.element("merchantPaymentAmount").focus();
			}, 650);
		});
	},
	
	scanToken: function () {
		var amount = app.valueOf("merchantPaymentAmount");
		if (!app.validateAmount(amount)) {
			app.showAmountError();
			return false;
		}
		else merchant.amount = amount;

		if (!beam.isAvailable) merchant.launchScanner();
		else beam.accept();
	},

	launchScanner: function () {
		if (app.isLiveApp) {
			cordova.plugins.barcodeScanner.scan(merchant.onScanToken, 
			function (error) {
				app.alert("Scanning Failed", error);
			});
		}
	},
	
	onScanToken: function (data) {
		var token = data.text;
		if (token.length >= 10) {
			merchant.tokenString = token;
			app.EnterPIN("USE_TOKEN");
		}
		else if (token.length) {
			sound.play("failed.mp3");
			app.alert("Invalid Beam Code", "This code isn't a valid nairabox beam code. Please check and try again.");
		}
	},
	
	ProcessPayment: function (pin, isP2P) {
		if (!isP2P) app.showBusy();
		merchant.isP2P = isP2P;

		app.send(app.API + "usetoken/", {oauth: localStorage.oauth, uid: localStorage.uid, amount: merchant.amount, deviceID: localStorage.deviceID, token: merchant.tokenString, pin: pin}, merchant.onPaymentComplete);
	},

	onPaymentComplete: function (data) {
		app.hideBusy();

		if (data.status === 200) {
			views.impose("merchantPaymentComplete", function () {
				app.element("paymentStatusPhoto").src = data.photo;
				app.element("paymentStatusName").innerHTML = data.name;
				app.element("paymentStatusCurrency").innerHTML = data.currency;
				app.element("paymentStatusAmount").innerHTML = app.numberFormat(data.amount);

				if (data.birthday === 1) {
					app.element("paymentStatusBirthday").innerHTML = "It's " + data.name + "'s birthday today. Please give a warm birthday shoutout.";
					app.element("paymentStatusBirthday").style.display = "block";
				}
				else app.element("paymentStatusBirthday").style.display = "none";

				sound.play("complete.mp3", .90);

				if (merchant.isP2P) {
					BTX.send('{"status":"PAYMENT_STATUS", "payload":{"status":"SUCCESS", "title":"' + localStorage.name + '", "currency":"' + data.currency + '", "amount":"' + data.amount + '"}}');
				}
			});
		}
		else {
			if (merchant.isP2P) {
				app.element("beamProgressButton").style.display = app.element("beamProgressCancel").style.display = "true";
				app.element("beamProgressStatus").innerHTML = "PAYMENT FAILED";
				app.element("beamProgressMessage").innerHTML = data.message;
				app.element("beamProgressDone").style.display = "block";

				TweenLite.killTweensOf("beamProgress");
				TweenLite.to(app.element("beamProgress"), 1, {backgroundColor: "#B74B59"});

				sound.play("failed.mp3", .90);

				BTX.send('{"status":"PAYMENT_STATUS", "payload":{"status":"FAILED", "message":"' + data.message + '"}}');
			}
			else {
				merchant.GoHome();
				app.alert("Payment Failed", data.message);
			}
		}
	},
	
	FindTicket: function (index) {
		if (index == 1) {
			if (app.isLiveApp) {
				cordova.plugins.barcodeScanner.scan(merchant.onScanTicket, 
				function (error) {
					app.alert("Scanning Failed", error);
				});
			}
		}
		else {
			views.goto("merchantTicketPhone", function () {
				app.element("merchantTicketPhoneNumber").value = "";
				setTimeout(function () {
					app.element("merchantTicketPhoneNumber").focus();
				}, 1000);
			});
		}
	},
	
	onScanTicket: function (data) {
		var id = data.text;
		if (id.length > 20) {
			app.showBusy();
			
			app.send(app.API + "tickets/", {case: "validate", oauth: localStorage.oauth, deviceID: localStorage.deviceID, id: id}, merchant.onTicketResponse);
		}
		else {
			sound.play("failed.mp3");
			app.alert("Invalid Ticket", "This code isn't for a valid nairabox ticket. Please check your ticket and try again.");
		}
	},
	
	onTicketResponse: function (data) {
		app.hideBusy();
		
		if (data.status === 200) {
			merchant.ticketList = data.list;
			
			if (data.list.length == 1) merchant.ShowUserTicket(0);
			else if (data.list.length > 1) {
				var output = ""; app.resetAlternator();
				for (var i = 0, count = data.list.length; i < count; i++) {
					output += '<div class="priceListItem ' + app.alternate() + '" onclick="merchant.ShowUserTicket('+i+')">' +
						'<div class="title">' + data.list[i].title + '</div>' +
						'<div class="price">' + data.list[i].date.split(".")[2] + '</div>' +
					'</div>';
				}
				
				views.goto("list", function () {
					app.element("listTitle").innerHTML = "Multiple Tickets";
					app.element("listContent").innerHTML = output;
				});
			}
			else app.alert("Couldn't Validate Ticket", data.message);
		}
		else app.alert("Couldn't Validate Ticket", data.message);
	},
	
	ShowUserTicket: function (index) {
		var ticket = merchant.ticketList[index];
		
		views.impose("merchantTicketInfo", function () {
			merchant.ticketID = ticket.id;
			var date = ticket.date.split(".");
			
			app.element("merchantTicketTitle").innerHTML = ticket.title;
			app.element("merchantTicketDate").innerHTML = date[0] + ", " + date[1] + "<br /><b>" + date[2] + "</b>";
			app.element("merchantTicketValidity").innerHTML = app.element("merchantTicketValidity").className = ticket.validity;
			
			if (ticket.validity == "VALID") {
				app.element("merchantTicketRedeem").style.display = "block";
				sound.play("complete.mp3", .90);
			}
			else {
				app.element("merchantTicketRedeem").style.display = "none";
				sound.play("failed.mp3", .75);
			}
			
			var output = "";
			for (var key in ticket.tickets) {
				if (ticket.tickets[key] != 0) output += '<div class="ticketBar"><div class="title">' + key.toUpperCase() + '</div><div class="count">' + ticket.tickets[key] + '</div></div>';
			}
			
			app.element("merchantTicketList").innerHTML = output;
		});
	},
	
	DoFindTicket: function () {
		var phone = app.valueOf("merchantTicketPhoneNumber");
		if (phone.length < 11) {
			app.alert("Invalid Phone Number", "The phone number provided is invalid. Please check the phone number and try again.");
			return;
		}
		
		app.showBusy();
		app.send(app.API + "tickets/", {case: "validate", oauth: localStorage.oauth, deviceID: localStorage.deviceID, phone: phone}, merchant.onTicketResponse);
	},
	
	RedeemTicket: function () {
		app.showBusy();
		app.send(app.API + "tickets/", {case: "issue", oauth: localStorage.oauth, deviceID: localStorage.deviceID, id: merchant.ticketID}, function (data) {
			app.hideBusy();
			
			if (data.status === 200) {
				app.alert("Ticket Issued", data.message);
				views.deposeTo("merchantStart");
			}
			else app.alert("Unable to Issue Ticket", data.message);
		});
	},
	
	GoHome: function () {
		views.deposeTo("merchantStart", function () {
			views.clearHistory();
		});
	},
};