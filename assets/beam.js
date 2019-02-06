var beam = {
	delay: 20000,
	swapModesTimer: 10000,
	isAvailable: false,
	peerBroadcastName: "NBX_BTX_HOST",

	init: function () {
		BTX.addEventListener("onReceive", beam.onReceive);
		BTX.addEventListener("onConnect", beam.onConnect);
		BTX.addEventListener("onStopBroadcast", beam.onBeamStatus);
		BTX.addEventListener("onDisconnect", beam.onBeamStatus);

		beam.listenersRegistered = true;
	},

	start: function () {
		if (!beam.isAvailable) {
			beam.showPaymentCode();
			return false;
		}

		if (app.isLiveApp) setTimeout(function () {
			beam.broadcast(beam.peerBroadcastName);
		}, 750);

		views.goto("beamProgress", function () {
			app.element("beamProgressStatus").innerHTML = "READY TO PAY";
			app.element("beamProgressMessage").innerHTML = "Awaiting payment information from the cashier.";
			app.element("beamProgressTick").style.display = "none";
			app.element("beamProgressBeam").style.display = "block";
			app.element("beamProgress").style.background = "#03335B";

			app.element("beamProgressButton").style.display = app.element("beamProgressCancel").style.display = "block";
			app.element("beamProgressDone").style.display = "none";
			
			setTimeout(function () {
				beam.showBusy();
			}, 300);
		});
	},

	accept: function () {
		views.goto("beamProgress", function () {
			app.element("beamProgressStatus").innerHTML = "SEARCHING";
			app.element("beamProgressMessage").innerHTML = "Looking for customer's phone... Please tell customer to tap the \"PAY\" button.";
			app.element("beamProgressTick").style.display = "none";
			app.element("beamProgressBeam").style.display = "block";
			app.element("beamProgress").style.background = "#03335B";
			app.element("beamProgressButtonLabel").innerHTML = "SCAN BARCODE";

			app.element("beamProgressButton").style.display = app.element("beamProgressCancel").style.display = "block";
			app.element("beamProgressDone").style.display = "none";
			
			setTimeout(function () {
				beam.showBusy();
				beam.connect(beam.peerBroadcastName);
			}, 300);
		});
	},

	showBusy: function () {
		app.element("beamProgressRing1").style.display =
		app.element("beamProgressRing2").style.display =
		app.element("beamProgressRing3").style.display = "block";

		setTimeout(function () {app.element("beamProgressRing1").className = "beamProgressRing beaming";}, 250);
		setTimeout(function () {app.element("beamProgressRing2").className = "beamProgressRing beaming";}, 750);
		setTimeout(function () {app.element("beamProgressRing3").className = "beamProgressRing beaming";}, 1250);
	},

	hideBusy: function () {
		app.element("beamProgressRing1").className =
		app.element("beamProgressRing2").className =
		app.element("beamProgressRing3").className = "beamProgressRing";

		app.element("beamProgressRing1").style.display =
		app.element("beamProgressRing2").style.display =
		app.element("beamProgressRing3").style.display = "none";
	},

	broadcast: function (name) {
		beam.isBroadcaster = true;

		if (!app.isLiveApp) return false;
		else if (!beam.listenersRegistered) beam.init();

		BTX.broadcast(name, function (data) {
			//alert(data);
        }, function (error) {
			alert(JSON.stringify(error));
			beam.swapModes();
        });
	},

	connect: function (name) {
		//alert("Connecting to " + name);
		if (!app.isLiveApp) return false;
		else if (!beam.listenersRegistered) beam.init();

		beam.timeout = setTimeout(beam.swapModes, beam.swapModesTimer);

		BTX.connect(name, function (data) {
			//alert(data);
			if (data === "ENABLE_LOCATION_SERVICE") {
				BTX.enableLocationService(function (data) {
					//alert("enableLocationService A: " + JSON.stringify(data));
				}, function (data) {
					//alert("enableLocationService F: " + JSON.stringify(data));
				});
			}
			else if (data === "HOST_ALREADY_CONNECTED") {
				alert(data);
				beam.onConnect("1: " + data);
			}
		}, function (data) {
			if (data === "HOST_ALREADY_CONNECTED") {
				alert("2: " + data);
				beam.onConnect(data);
			}
			else beam.swapModes();
		});
	},

	onReceive: function (data) {
		//alert('RECEIVED: ' + data);
		data = JSON.parse(data);

		if (data.status === "ACCEPT_CONFIRM_PIN") { //ON USER DEVICE
			app.element("beamProgressStatus").innerHTML = "CONNECTED";
			app.element("beamProgressMessage").innerHTML = "Please enter your PIN to authorize this payment";

			app.ShowPriceBar(data.payload.title, data.payload.currency, data.payload.amount);
			app.EnterPIN("BEAM_PAYMENT");

			beam.hideBusy();
		}
		else if (data.status === "PIN_CONFIRMED") { //ON MERCHANT TERMINAL
			if (data.payload.pin && data.payload.token) {
				merchant.tokenString = data.payload.token;
				merchant.ProcessPayment(data.payload.pin, true);

				app.element("beamProgressStatus").innerHTML = "PROCESSING...";
				app.element("beamProgressMessage").innerHTML = "Transaction in progress. Awaiting payment approval from nairabox...";
				app.element("beamProgressButton").style.display = app.element("beamProgressCancel").style.display = "none";

				TweenLite.killTweensOf("beamProgress");
				TweenLite.to(app.element("beamProgress"), 1, {backgroundColor: "#34534"});
			}
		}
		else if (data.status === "PAYMENT_STATUS") {
			if (data.payload.status === "SUCCESS") {
				app.element("beamProgressStatus").innerHTML = "APPROVED";
				app.element("beamProgressMessage").innerHTML = "Your payment of <b>" + app.numberFormat(data.payload.amount, data.payload.currency) + "</b> to " + data.payload.title + " was successful. Thanks for using nairabox.";

				app.element("beamProgressButton").style.display = app.element("beamProgressCancel").style.display = "none";
				app.element("beamProgressDone").style.display = "block";
				
				TweenLite.killTweensOf("beamProgress");
				TweenLite.to(app.element("beamProgress"), 1, {backgroundColor: "#28B75E"});

				sound.play("complete.mp3", 0.9);

				setTimeout(function () {
					BTX.stopBroadcast();
					BTX.disconnect();
				}, 1000);
			}
			else {
				app.element("beamProgressStatus").innerHTML = "PAYMENT FAILED";
				app.element("beamProgressMessage").innerHTML = data.payload.message;
				app.element("beamProgressDone").style.display = "block";

				TweenLite.killTweensOf("beamProgress");
				TweenLite.to(app.element("beamProgress"), 1, {backgroundColor: "#B74B59"});

				sound.play("failed.mp3", 0.50);

				setTimeout(function () {
					BTX.stopBroadcast();
					BTX.disconnect();
				}, 1000);
			}
		}
		else if (data.status === "SWAP_MODES") beam.swapModes(true);
	},

	onConnect: function (data) {
		clearTimeout(beam.timeout);
		beam.isConnected = true;
		
		if (!beam.isBroadcaster) {
			//alert('WILL SEND: {"status":"ACCEPT_CONFIRM_PIN", "payload":{"title":"' + localStorage.name + '", "currency":"' + localStorage.currency + '", "amount":"' + merchant.amount + '"}}');
			app.element("beamProgressStatus").innerHTML = "CONNECTED";
			app.element("beamProgressMessage").innerHTML = "Awaiting PIN entry and confirmation from customer.";

			TweenLite.killTweensOf("beamProgress");
			TweenLite.to(app.element("beamProgress"), 1, {backgroundColor: "#D68D26"});

			sound.play("beam.mp3");

			setTimeout(function () {
				BTX.send('{"status":"ACCEPT_CONFIRM_PIN", "payload":{"title":"' + localStorage.name + '", "currency":"' + localStorage.currency + '", "amount":"' + merchant.amount + '"}}');
			}, 100);
		}
	},

	onBeamStatus: function (data) {
		//alert(JSON.stringify(data));
	},

	pay: function (pin) {
		BTX.send('{"status":"PIN_CONFIRMED", "payload":{"token":"' + localStorage.token + '", "pin":"' + pin + '"}}');

		app.element("beamProgressStatus").innerHTML = "PAYMENT SENT";
		app.element("beamProgressMessage").innerHTML = "Transaction in progress. Awaiting payment approval from nairabox...";
		app.element("beamProgressTick").style.display = "block";
		app.element("beamProgressBeam").style.display = "none";

		app.element("beamProgressButton").style.display = app.element("beamProgressCancel").style.display = "none";
		app.element("beamProgressDone").style.display = "block";

		TweenLite.to(app.element("beamProgress"), 1, {backgroundColor: "#34534"});

		sound.play("beam.mp3");
		app.HidePriceBar();
	},

	cancel: function () {
		beam.isConnected = false;

		if (app.isLiveApp) {
			BTX.stopBroadcast();
			BTX.disconnect();
		}

		beam.hideBusy();
		views.back();
	},
	
	showPaymentCode: function () {
		if (beam.isAvailable) {
			beam.hideBusy();
			clearTimeout(beam.timeout);

			return views.overlay("barcodeView", 100, action, 200);
		}

		var action = function () {
			var qrBox = app.element("qrBox");
			var qrPlaceholder = app.element("qrPlaceholder");
			var qrBeamStatus = app.element("qrBeamStatus");

			qrBox.style.opacity = 0;
			qrPlaceholder.style.opacity = 1;
			qrBeamStatus.innerHTML = "•••";
			
			setTimeout(function () {
				var beamCode = (localStorage.defaultCard) ? localStorage.defaultCard : localStorage.token;
				//var qrCode = kjua({render: "image", text: beamCode, ecLevel: "M", size: 250, fill: "#000"});
				//new QRious({element: app.element("qrBox"), value: beamCode, size: 250, level: "M"});
				//qrBox.src = qrCode.src;

				/*if (!beam.paymentCode) beam.paymentCode = new QRCode(document.getElementById("qrBox"));
				beam.paymentCode.makeCode({
					text: beamCode,
					width: 128,
					height: 128,
					colorDark : "#000000",
					colorLight : "#ffffff",
					useSVG: true,
					correctLevel : QRCode.CorrectLevel.M
				});*/

				var vP = views.width/1.55;
				qrBox.innerHTML = new QRCode({content: beamCode, padding: 0, width: vP, height: vP}).svg();
				qrBeamStatus.innerHTML = "You're ready to pay";

				TweenLite.to(qrBox, 0.5, {opacity: 1});
				TweenLite.to(qrPlaceholder, 0.5, {opacity: 0});

				beam.timeout = setTimeout(beam.hidePaymentCode, beam.delay);
			}, 1000);
		};

		return views.overlay("barcodeView", 100, action, 2);
	},
	
	hidePaymentCode: function () {
		if (beam.timeout) clearTimeout(beam.timeout);
		return views.hideOverlay();
		
		if (app.isAuthenticated) {
			views.navigationDelegate.pop();
			views.hideOverlay();
		}
		else app.Logout();
	},

	swapModes: function (stopLoop) {
		if (beam.timeout) clearTimeout(beam.timeout);
		if (!stopLoop && beam.isConnected) BTX.send('{"status":"SWAP_MODES"}');
		
		beam.isConnected = false;

		setTimeout(function () {
			BTX.stopBroadcast();
			BTX.disconnect();
		}, 500);

		if (beam.isBroadcaster) beam.showPaymentCode();
		else merchant.launchScanner();
	},
	
	showOfflineOptions: function () {
		var balanceStatus = !(localStorage.disableOfflineBalance) ? "block" : "none";
		var viewHeight = (balanceStatus == "none") ? 35 : 53;
		
		views.overlay("unlockBeam", viewHeight, function () {
			var profilePicture = app.element("unlockBeamPhoto");
			profilePicture.onerror = app.onProfilePictureError;
			profilePicture.src = app.getUserPhoto();

			app.element("unlockBeamName").innerHTML = localStorage.firstname;
			app.element("unlockBalanceTime").innerHTML = localStorage.balanceTime;
			app.element("unlockCurrency").innerHTML = localStorage.currency;
			app.element("unlockBalance").innerHTML = app.numberFormat(localStorage.balance);
			
			app.element("unlockOfflineBalance").style.display = balanceStatus;
		});
	},

	complete: function () {
		if (app.isAuthenticated) app.RenderAccount(true);
		else {
			if (beam.isBroadcaster) app.EnterPIN("UNLOCK", true);
			else merchant.GoHome();
		}
	}
};