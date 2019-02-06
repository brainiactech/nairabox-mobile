var app = {
	isLiveApp: false,
	platform: "DEVEL_PLATFORM",
	pushToken: "DEVEL_TOKEN",
	timeoutPeriod: 300000,
	versionNumber: "9",
	buildNumber: 1773,

	start: function () {
		app.base = "https://mapp.nairabox.com:8443/";
		//app.base = "https://revision.nairabox.com/";
		//app.base = "http://localhost/nairabox-fep/";
		app.API = app.base + "api/v9.5/";
		app.withWalletAPI = app.base + "api/FoodWithWallet/";

		if (app.isLiveApp) document.addEventListener("deviceready", app.SetDefaults, false);
		else app.SetDefaults();
	},

	SetDefaults: function () {
		app.showBusy();
		app.element("splashOverlayMessage").innerText = app.generateRandomMessage();

		if (app.isLiveApp) {
			tracker.start();
			navigator.splashscreen.hide();

			var vW = window.innerWidth;
			var vH = window.innerHeight;

			app.platform = device.platform.toUpperCase();

			if (app.platform == "IOS") {
				StatusBar.overlaysWebView(true);

				if (vW > 480) app.headerPercent = 0.065;
				else app.headerPercent = 0.1;
			}
			else {
				if (vW > 480) app.headerPercent = 0.05;
				else app.headerPercent = 0.078;

				document.addEventListener("backbutton", app.onBackButton, false);
			}

			app.headerHeight = vH * app.headerPercent;
			app.scrollHeight = vH - app.headerHeight;

			push.init();
		}
		else {
			app.headerPercent = 0.08;
			app.headerHeight = window.innerHeight * app.headerPercent;
			app.scrollHeight = window.innerHeight - app.headerHeight;
		}

		updater.checkForUpdate();
		//app.LaunchApp();
	},

	CalculateViewPort: function () {
		var headers = document.getElementsByClassName("header");
		for (var i = 0, max = headers.length; i < max; i++) {
			headers[i].style.height = app.headerHeight;
		}

		var scrollViews = document.getElementsByClassName("scrollView");
		for (var i = 0, max = scrollViews.length; i < max; i++) {
			scrollViews[i].style.top = app.headerHeight;
			scrollViews[i].style.height = app.scrollHeight;
		}

		var scrollViewsFull = document.getElementsByClassName("scrollViewFull");
		for (var i = 0, max = scrollViewsFull.length; i < max; i++) {
			scrollViewsFull[i].style.paddingTop = app.headerHeight;
		}

		window.addEventListener("keyup", function (event) {
			if (event.keyCode === 13) Keyboard.hide();
		});
	},

	LaunchApp: function () {
		sound.start();
		app.CalculateViewPort();

		//views.start("ticketStart"); return app.GetReady();

		if (localStorage.progress == "activate") views.start("activate", function () {
			app.element("activationPhone").innerHTML = localStorage.activationPhone;
		});
		else if (localStorage.progress == "authorize") views.start("authorize");
		else if (localStorage.progress == "selfie") views.start("selfie");
		else if (localStorage.progress == "complete") {
			if (localStorage.accountType == "B") merchant.start(true);
			else {
				if (localStorage.isPushRegistered == "YES") {
					app.EnterPIN("UNLOCK", true);
					setTimeout(geolocation.start, 5000);
				}
				else app.RequestPushPermission("start");
			}
		}
		else app.Welcome(true);

		if (!app.isReady) app.GetReady();
	},

	GetReady: function () {
		app.isReady = true;
		//tracker.track("LAUNCH_APP");

		app.hasLoaded = true;
		if (push.isAvailable) push.trigger();

		setTimeout(function () {
			app.hideBusy();

			var splash = document.getElementById("splashOverlay");
			var tween = TweenLite.to(splash, 0.35, {opacity:0});
			tween.eventCallback("onComplete", function () {
				clearTimeout(app.splashTimeout);
				splash.parentNode.removeChild(splash);
			});

			if (app.isLiveApp && localStorage.progress == "complete") {
				if (app.platform === "IOS") {
					if (window.plugins.touchid.isAvailable) {
						if (!localStorage.disableTouchID) app.ShowTouchID();
					}
				}
				else {
					FingerprintAuth.isAvailable(function (result) {
						if (result.isAvailable && result.hasEnrolledFingerprints) app.ShowAndroidFingerprint();
					});
				}
			}
		}, 500);
	},

	onBackButton: function (e) {
		if (views.flashViewCount >= 1) {
			console.log("flashViewCount");
		}
		else if (views.modalView) views.hideOverlay();
		else if (views.current.id == "account") {
			if (!views.revealView) app.ShowMenu();
			else app.exitApplication();
		}
		else if (views.current.id == "myCards") cards.exit();
		else if (views.current.id == "welcome") app.exitApplication();
		else if (views.current.id == "musicPlayer") music.exit();
		else views.back(true, e);

		e.preventDefault();
	},

	//•••••• APP LOGIC GOES HERE ••••••/

	Welcome: function (isNewSession) {
		if (isNewSession) views.start("welcome", app.RenderWelcome);
		else {
			views.reverseTo("welcome", app.RenderWelcome);
			setTimeout(views.clearHistory, 500);
		}
	},

	RenderWelcome: function () {
		app.element("slideDots").innerHTML = app.DrawSlideDots(0, 5);
		app.swipe = Swipe(app.element("welcomeSlides"), {
			continuous: true,
			startSlide: 0,
			callback: function (index) {
				app.element("slideDots").innerHTML = app.DrawSlideDots(index, 5);
			}
		});
	},

	SignUp: function (gender) {
		var firstname = app.valueOf("sFname");
		var lastname = app.valueOf("sLname");
		var uid = app.valueOf("sPhone");
		var email = app.valueOf("sEmail");
		var year = app.valueOf("sYear");
		var month = app.valueOf("sMonth");
		var day = app.valueOf("sDay");

		if (firstname.length < 2) return app.alert("Your first name", "Please enter your First Name to continue.");
		else if (lastname.length < 2) return app.alert("Your last name", "Please enter your Last Name/Surname to continue.");
		else if (uid.length < 11) return app.alert("Your phone number", "Please enter a valid GSM Mobile Phone Number to continue.");
		else if (!app.isValidEmail(email)) return app.alert("Check Email Address", "Please enter a valid email address to sign up.");
		else if (day == "" || !app.validateAmount(day)) return app.alert("Your birthday", "Please enter your birth day to continue, e.g. 21");
		else if (month == "") return app.alert("Your birthday", "Please select your birth month to continue.");
		else if (year.length !== 4 || !app.validateAmount(year)) return app.alert("Your birthday", "Please enter your birth year in full, e.g. 1985");

		if (!gender) return views.overlay("signUpGender", 100-(app.headerPercent * 100), function () {
			setTimeout(function () {
				app.element("sInvite").focus();
			}, 900);
		});
		else {
			var inviteCode = app.valueOf("sInvite");
			views.hideOverlay();
		}

		if (day.length < 2 && Number(day) < 10) day = "0" + day;

		app.send(app.API + "register/", {
			uid: uid,
			firstname: firstname,
			lastname: lastname,
			email: email,
			gender: gender,
			birthday: year + "-" + month + "-" + day,
			accountType: "C",
			platform: app.platform,
			invitedBy: inviteCode
		}, function (data) {
			app.hideBusy();

			if (data.status == 200) {
				localStorage.registrationID = data.registrationID;
				localStorage.progress = "activate";
				localStorage.activationPhone = uid;

				views.goto("activate", function () {
					app.element("activationPhone").innerHTML = localStorage.activationPhone;
					app.element("activationCode").value = "";
				});
			}
			else if (data.status == 1000) {
				localStorage.registrationID = data.registrationID;
				localStorage.progress = "activate";
				localStorage.activationPhone = uid;

				views.goto("activateWithCall", function () {
					app.element("activationPhone").innerHTML = localStorage.activationPhone;
					app.element("activationCode").value = "";
				});
			}
			else if (data.status == 300) {
				app.alert("You already have an account", data.message);
				views.goto("signIn", function () {
					app.element("loginPhone").value = uid;
				});
			}
			else app.alert("Sign Up Failed", data.message);
		});

		app.showBusy();
		tracker.track("SIGN_UP");
	},

	ShowDatePicker: function (fieldID) {
		var months = ["JANUARY", "FEBRUARY", "MARCH", "APRIL", "MAY", "JUNE", "JULY", "AUGUST", "SEPTEMBER", "OCTOBER", "NOVEMBER", "DECEMBER"];
		var element = app.element(fieldID);
		var options = {
			allowFutureDates: false,
			doneButtonColor: "#1C6AC4",
			cancelButtonColor: "#D0021B",
			mode: 'date',
			date: new Date()
		};

		if (app.isLiveApp) {
			datePicker.show(options, function (date) {
				element.setAttribute("data-value", date.toISOString().substr(0, 10));
				element.innerHTML = date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear();
			}, function (error) {
				app.alert("Couldn't Get Date", error);
			});
		}
		else {
			date = new Date();
			element.setAttribute("data-value", date.toISOString().substr(0, 10));
			element.innerHTML = date.getDate() + " " + months[date.getMonth()] + " " + date.getFullYear();
		}
	},

	RequestCallMe: function (index) {
		if (!index) {
			views.overlay('activateCall', 40, function () {
				app.element("activateCallInitial").style.display = "block";
				app.element("activateCallProgress").style.display = "none";
			});
			return false;
		}

		app.element("activateCallInitial").style.display = "none";
		app.element("activateCallProgress").style.display = "block";
		app.showBusy();

		app.send(app.API + "activate/", {case: "callme", registrationID: localStorage.registrationID}, function (data) {
			app.hideBusy();
			views.hideOverlay();

			if (data.status == "0") {
				app.element("activateStatus").innerHTML = "You'll get a call or SMS shortly. Please enter your activation code below when you get it.";
				app.element("activationCodeArea").style.display = "block";
				app.element("callMeButton").className = "grey";
				app.element("callMeLabel").innerHTML = "Call Me Again";

				app.toast("Call Requested", true);
				tracker.track("CALL_REQUESTED");
			}
			else app.alert("Couldn't Request Call", data.message);
		});

		tracker.track("REQUEST_CALL");
	},

	isValidEmail: function (email) {
		if (email == "") return false;
		var regex = /^([\w-]+(?:\.[\w-]+)*)@((?:[\w-]+\.)*\w[\w-]{0,66})\.([a-z]{2,6}(?:\.[a-z]{2})?)$/i;
		if (regex.test(email)) return true;
		else return false;
	},

	Activate: function (index) {
		if (index == 0) {
			var code = app.valueOf("activationCode");
			if (code.length < 4) {
				app.alert("Check Activation Code", "Please enter the activation code we gave your via the phone call. If you don't have it, please request a call.");
				return ;
			}

			app.activationCode = code;
			views.goto("activateComplete");
			return true;
		}

		var code = app.activationCode;
		var pin = app.valueOf("activationPIN");
		var pinConfirm = app.valueOf("activationPINConfirm");

		if (pin.length != 4) {
			app.alert("Account PIN", "Please choose a 4-digit account PIN to confirm future payments.");
			return ;
		}

		else if (pin.length != pinConfirm.length) {
			app.alert("PIN Mismatch", "Your account PIN and Confirmation PIN don't match. Please check your entry and try again.");
			return ;
		}

		app.send(app.API + "activate/", {
			case: "activate",
			registrationID: localStorage.registrationID,
			code: code,
			pin: pin,
			pinConfirm: pinConfirm,
			version: app.versionNumber
		}, app.onActivate);

		app.showBusy();
	},

	onActivate: function (data) {
		app.hideBusy();
		app.isAuthenticated = true;

		if (data.status == 200) {
			localStorage.uid = data.uid;
			localStorage.oauth = data.oauth;
			localStorage.firstname = data.firstname;
			localStorage.photo = data.photo;
			localStorage.gender = data.gender;
			localStorage.token = data.token;
			localStorage.currency = data.currency;
			localStorage.balance = data.balance;
			localStorage.balanceTime = app.currentTime();
			localStorage.savings = data.savings;
			localStorage.deviceID = data.deviceID;
			localStorage.accountType = "C";
			localStorage.contribution = data.contribution;
			localStorage.uberStatus = data.uberStatus;
			localStorage.tickets = JSON.stringify(data.tickets.list);
			localStorage.bankCards = JSON.stringify(data.cards);
			localStorage.inviteCode = data.referrals.code;
			localStorage.inviteCount = data.referrals.count;
			localStorage.inviteRewards = data.referrals.rewards;
			localStorage.billsFee = data.fees.bills;
			localStorage.transferFee = data.fees.transfer;

			ads.content = data.ad;

			if (localStorage.photo == "") {
				localStorage.progress = "selfie";
				localStorage.photo = "images/no_selfie.jpg";

				views.goto("selfie", function () {
					if (app.platform == "ANDROID") app.element("selfieFromPhotos").style.display = "none";
				});
			}
			else app.RequestPushPermission();

			geolocation.start();
			friends.showInviteCode(true);
		}
		else app.alert("Authorization Failed", data.message);
	},

	CancelActivation: function () {
		app.Deauthorize();
	},

	SignIn: function () {
		var uid = app.valueOf("loginPhone");
		var pin = app.valueOf("loginPIN");

		app.element("loginPIN").value = "";

		if (uid.length < 10) {
			app.alert("Your phone number", "Please enter a valid GSM Mobile Phone number to continue.");
			return ;
		}
		else if (pin.length < 4) {
			app.alert("Your account PIN", "Please enter your 4-digit Account PIN to continue.");
			return ;
		}

		var uuid = app.isLiveApp ? device.uuid : "DEBUG_UUID";

		app.send(app.API + "login/", {uid: uid, pin: pin, uuid: uuid}, function (data) {
			app.hideBusy();

			if (data.status === 200) app.onActivate(data);
			else if (data.status === 201) {
				localStorage.progress = "authorize";
				localStorage.tempID = data.tempID;

				views.goto("authorize");
			}
			else app.alert("Sign in Failed", data.message);
		});
		app.showBusy();
	},

	Authorize: function () {
		var authCode = app.valueOf("authCode");

		if (authCode.length < 4) {
			app.alert("Authorization code", "Please enter the authorization code we sent you via Email or SMS.");
			return ;
		}

		app.send(app.API + "authorize/", {
			case: "customer",
			tempID: localStorage.tempID,
			authCode: authCode,
			version: app.versionNumber,
		}, app.onActivate);
		app.showBusy();
	},

	Deauthorize: function () {
		localStorage.clear();
		app.Welcome(false);

		setTimeout(views.clearHistory, 300);
	},

	Logout: function (isUserLogoutAction) {
		app.isAuthenticated = false;
		app.stopIdleTimer();
		app.EnterPIN("UNLOCK", true, isUserLogoutAction);
	},

	SignOut: function () {
		app.Deauthorize();
		app.toast("You've securely signed out of your Nairabox account on this device.", true);
	},

	EnterPIN: function (pinDisposition, disableTouchID, isUserLogoutAction) {
		app.pinData = "";
		app.pinDisposition = pinDisposition ? pinDisposition : "UNLOCK";

		var callback = function () {
			app.ResetPINData();

			if (!app.isPINPadRendered) {
				app.isPINPadRendered = true;

				app.enableTouch("pinkey1", 1);
				app.enableTouch("pinkey2", 2);
				app.enableTouch("pinkey3", 3);
				app.enableTouch("pinkey4", 4);
				app.enableTouch("pinkey5", 5);
				app.enableTouch("pinkey6", 6);
				app.enableTouch("pinkey7", 7);
				app.enableTouch("pinkey8", 8);
				app.enableTouch("pinkey9", 9);
				app.enableTouch("pinkey0", 0);
				app.enableTouch("pinkeyDelete", '<');
			}

			if (app.pinDisposition == "UNLOCK") {
				app.element("pinStatus").innerHTML = "Enter your PIN to login";
				app.element("pinHelp").style.display = "block";
				app.element("pinOptions").style.display = "block";
				app.element("pinCancel").style.display = "none";
				app.element("pinTouchID").style.display = "none";
				app.element("pinPay").style.display = (views.height > 480) ? "block" : "none";

				setTimeout(views.clearHistory, 500);

				if (app.isLiveApp) {
					if (app.platform == "IOS") {
						if (window.plugins.touchid.isAvailable) {
							//if (!disableTouchID && !localStorage.disableTouchID) app.ShowTouchID();
							if (localStorage.disableTouchID) app.element("pinTouchID").style.display = "none";
							else app.element("pinTouchID").style.display = "inline";
						}
						else app.element("pinTouchID").style.display = "none";
					}
					else FingerprintAuth.isAvailable(function (result) {
						if (!result.isAvailable) return false;

						//if (!disableTouchID && !localStorage.disableTouchID) app.ShowAndroidFingerprint();
						if (localStorage.disableTouchID) app.element("pinTouchID").style.display = "none";
						else {
							app.element("pinTouchID").style.display = "inline";
							app.element("pinTouchID").src = "images/icon_fingerprint.png";
						}
					}, function (e) {app.toast("ERROR " + JSON.stringify(e));});
				}
			}
			else {
				var status;

				if (app.pinDisposition == "SEND_MONEY") status = "Enter your PIN to send money";
				else if (app.pinDisposition == "BILL_PAYMENT") status = "Enter your PIN to make payment";
				else if (app.pinDisposition == "BUY_AIRTIME") status = "Enter your PIN to buy airtime";
				else if (app.pinDisposition == "BUY_CINEMA_TICKET" || app.pinDisposition == "BUY_EVENT_TICKET") status = "Enter your PIN to buy ticket";
				else if (app.pinDisposition == "AUTO_RECHARGE") status = "Enter your PIN for Auto-Recharge";
				else if (app.pinDisposition == "USE_TOKEN") status = "You're paying <b>" + localStorage.currency + " " + app.numberFormat(merchant.amount) + "</b>";
				else if (app.pinDisposition == "MAKE_DONATION") status = "Enter your PIN to make donation";
				else if (app.pinDisposition == "ADD_CARD") status = "Enter your PIN to activate card";
				else if (app.pinDisposition == "LOCK_CARD") status = "Enter your PIN to lock this card";
				else if (app.pinDisposition == "UNLOCK_CARD") status = "Enter your PIN to unlock this card";
				else if (app.pinDisposition == "REMOVE_CARD") status = "Enter your PIN to remove this card";
				else if (app.pinDisposition == "CONNECT_UBER") status = "Enter your PIN to connect UBER";
				else if (app.pinDisposition == "BEAM_PAYMENT") status = "Enter your PIN to make payment";
				else if (app.pinDisposition == "BUY_MUSIC") status = "Enter your PIN to buy music";
				else if (app.pinDisposition == "ADD_BANK_CARD") status = "Enter your ATM/Bank Card PIN";
				else if (app.pinDisposition == "ADD_CASH_CARD") status = "Enter your nairabox PIN";
				else if (app.pinDisposition == "REMOVE_CASH_CARD") status = "Enter your nairabox PIN";
				else if (app.pinDisposition == "BUY_FOOD") status = "Enter your PIN to pay";

				app.element("pinStatus").innerHTML = status;
				app.element("pinHelp").style.display = app.element("pinTouchID").style.display = app.element("pinPay").style.display = app.element("pinOptions").style.display = "none";
				app.element("pinCancel").style.display = "block";
			}
		};

		if (!views.navigationDelegate.length) views.start("unlock", callback);
		else if (app.pinDisposition == "UNLOCK") {
			if (isUserLogoutAction) views.goto("unlock", callback);
			else views.reverseTo("unlock", callback);
		}
		else if (app.pinDisposition == "BEAM_PAYMENT") views.overlay("unlock", 100, callback);
		else views.overlay("unlock", 85, callback);
	},

	AuthenticateWithPIN: function (pin) {
		if (pin.length < 4) return ;

		tracker.track(app.pinDisposition);

		if (app.pinDisposition == "UNLOCK") {
			app.showBusy();

			app.send(app.API + "authenticate/", {case: "pin", oauth: localStorage.oauth, deviceID: localStorage.deviceID, pin: pin}, app.onAuthentication, function () {
				app.hideBusy();
				app.ResetPINData();

				beam.showOfflineOptions();
			});

			return true;
		}
		else if (app.pinDisposition == "SEND_MONEY") transfer.send(pin);
		else if (app.pinDisposition == "BILL_PAYMENT") bills.pay(pin);
		else if (app.pinDisposition == "BUY_AIRTIME") airtime.buy(pin);
		else if (app.pinDisposition == "BUY_CINEMA_TICKET") tickets.buy(pin);
		else if (app.pinDisposition == "BUY_EVENT_TICKET") tickets.confirmEvent(pin);
		else if (app.pinDisposition == "AUTO_RECHARGE") airtime.confirmAutoRecharge(pin);
		else if (app.pinDisposition == "USE_TOKEN") merchant.ProcessPayment(pin);
		else if (app.pinDisposition == "MAKE_DONATION") give.send(pin);
		else if (app.pinDisposition == "ADD_CARD") cards.add(pin);
		else if (app.pinDisposition == "LOCK_CARD") cards.lock(pin);
		else if (app.pinDisposition == "UNLOCK_CARD") cards.unlock(pin);
		else if (app.pinDisposition == "REMOVE_CARD") cards.remove(pin);
		else if (app.pinDisposition == "CONNECT_UBER") uber.connect(pin);
		else if (app.pinDisposition == "BEAM_PAYMENT") beam.pay(pin);
		else if (app.pinDisposition == "BUY_MUSIC") ads.buyMusic(pin);
		else if (app.pinDisposition == "ADD_BANK_CARD") wallet.addBankCard(pin);
		else if (app.pinDisposition == "ADD_CASH_CARD") wallet.process(1, pin);
		else if (app.pinDisposition == "REMOVE_CASH_CARD") wallet.removeCard(pin);
		else if (app.pinDisposition == "BUY_FOOD") food.checkout(pin);
		//else if (app.pinDisposition == "BUY_FOOD") food.checkoutWithWallet(pin);

		views.hideOverlay();
		app.HidePriceBar();
	},

	AuthenticateWithTouchID: function () {
		app.send(app.API + "authenticate/", {case: "touchid", oauth: localStorage.oauth, deviceID: localStorage.deviceID}, app.onAuthentication);
		app.showBusy();

		app.DrawPINDots(4);

		tracker.track("UNLOCK");
	},

	onAuthentication: function (data) {
		app.hideBusy();

		if (data.status == 200) {
			app.isAuthenticated = true;
			localStorage.oauth = data.oauth;
			localStorage.gender = data.gender;
			localStorage.currency = data.currency;
			localStorage.balance = data.balance;
			localStorage.balanceTime = app.currentTime();
			localStorage.savings = data.savings;
			localStorage.contribution = data.contribution;
			localStorage.uberStatus = data.uberStatus;
			localStorage.token = data.token;
			localStorage.tickets = JSON.stringify(data.tickets.list);
			localStorage.bankCards = JSON.stringify(data.cards);
			localStorage.inviteCode = data.referrals.code;
			localStorage.inviteCount = data.referrals.count;
			localStorage.inviteRewards = data.referrals.rewards;
			localStorage.billsFee = data.fees.bills;
			localStorage.transferFee = data.fees.transfer;

			ads.content = data.ad;

			app.startIdleTimer();
			app.RenderAccount(true);

			if (localStorage.isPushRegistered == "YES") push.RegisterDevice();
		}
		else {
			app.DrawPINDots(0);
			app.pinData = "";

			if (data.status == 0) {
				app.Deauthorize();
				app.alert("Session expired", data.message);
			}
			else app.alert("Authentication Failed", data.message);
		}
	},

	PinEntry: function (key) {
		if (key == "<") {
			app.pinData = app.pinData.substr(0, app.pinData.length-1);
		}
		else {
			app.pinData += key;
			if (app.pinData.length == 4) {
				setTimeout(function () {
					app.AuthenticateWithPIN(app.pinData);
				}, 100);
			}
		}

		app.DrawPINDots(app.pinData.length);
	},

	DrawPINDots: function (count) {
		var dots = "";
		var active = "<img src='images/disc_active.svg' class='pinDisc' />";
		var inactive = "<img src='images/disc_inactive.svg' class='pinDisc' />";

		for (var i=0; i<4; i++) {
			if (i < count) dots += active;
			else dots += inactive;
		}

		app.element("pinDiscArea").innerHTML = dots;
	},

	ResetPINData: function () {
		app.pinData = "";
		app.DrawPINDots(0);
	},

	HidePinPadOverlay: function () {
		views.hideOverlay();
		app.HidePriceBar();

		if (views.current.id === "beamProgress") {
			beam.showPaymentCode();
		}
	},

	ShowTouchID: function () {
		window.plugins.touchid.verifyFingerprintWithCustomPasswordFallbackAndEnterPasswordLabel(
			"Hi, " + localStorage.firstname + ". Unlock your account with Touch ID or enter your PIN.",
			"Enter PIN",
			app.AuthenticateWithTouchID);
		},

		ShowAndroidFingerprint: function () {
			FingerprintAuth.encrypt({
				clientId: "nairabox",
				clientSecret: "46CF5E434B2C32B4",
				dialogTitle: "Sign In",
				dialogMessage: "Hi, " + localStorage.firstname + ". Unlock your account with your fingerprint or enter your PIN."
			}, app.AuthenticateWithTouchID);
		},

		ShowBiometricDialog: function () {
			if (app.platform == "IOS") app.ShowTouchID();
			else if (app.platform == "ANDROID") app.ShowAndroidFingerprint();
		},

		RenderAccount: function (isNavigationRequired) {
			wallet.advertise();

			if (isNavigationRequired) views.goto("account", function () {
				if (app.platform == "IOS") {
					app.element("accountHeader").style.height = "11%";
					app.element("card").style.top = "4.75em";
				}
				else if (app.platform == "ANDROID" && window.innerWidth > 475) {
					app.element("accountHeader").style.height = "11%";
					app.element("card").style.top = "4.75em";
				}
				else app.element("accountHeader").style.height = "9%";

				app.RenderAccountInfo();
			});
			else app.RenderAccountInfo();

			var giveStatus = (localStorage.contribution == "1") ? "block" : "none";
			var uberStatus = (localStorage.uberStatus == "1") ? "block" : "none";

			views.update("accountMenu", function () {
				app.element("giveMenuButton").style.display = giveStatus;
				app.element("uberMenuButton").style.display = uberStatus;
			});
		},

		RenderAccountInfo: function () {
			var profilePicture = app.element("accountPhoto");
			profilePicture.onerror = app.onProfilePictureError;
			profilePicture.src = app.getUserPhoto();

			app.element("accountName").innerHTML = localStorage.firstname;
			app.element("balanceCurrency").innerHTML = localStorage.currency;
			app.element("balanceAmount").innerHTML = app.numberFormat(localStorage.balance);
			app.element("balanceTime").innerHTML = localStorage.balanceTime;

			ads.RenderAd();
		},

		ShowMenu: function () {
			views.reveal("accountMenu");
		},

		HideMenu: function () {
			views.hideReveal();
		},

		RefreshBalance: function () {
			var isAccountView = (views.current.id == "account");
			if (isAccountView) app.spin(app.element("accountRefresher"));

			app.isRefreshing = true;

			app.send(app.API + "refresh/", {case: "balance", oauth: localStorage.oauth, deviceID: localStorage.deviceID}, function (data) {
				app.isRefreshing = false;
				if (isAccountView) app.stopSpin(app.element("accountRefresher"));

				if (data.status == 200) {
					localStorage.balance = data.balance;
					localStorage.savings = data.savings;
					localStorage.currency = data.currency;
					localStorage.balanceTime = app.currentTime();

					if (isAccountView) app.RenderAccountInfo();
				}
				else app.alert("Refresh failed", data.message);
			});
		},

		RequestPushPermission: function (status) {
			localStorage.progress = "complete";

			if (!app.isLiveApp) {
				if (app.isAuthenticated) app.RenderAccount(true);
				else app.EnterPIN("UNLOCK", true);

				return;
			}

			if (status == true || localStorage.pushToken) {
				push.RegisterDevice();

				if (app.isAuthenticated) app.RenderAccount(true);
				else app.EnterPIN("UNLOCK", true);
			}
			else {
				if (app.platform == "IOS") {
					if (status === "start") views.start("pushPermission");
					else views.goto("pushPermission");
				}
				else {
					push.RegisterDevice();

					if (app.isAuthenticated) app.RenderAccount(true);
					else app.EnterPIN("UNLOCK", true);
				}
			}
		},

		SkipPushPermission: function () {
			if (app.isAuthenticated) app.RenderAccount(true);
			else app.EnterPIN("UNLOCK");
		},

		ReplacePhoto: function () {
			//return views.overlay('accountPhotoOptions', 28);
			if (app.platform == "IOS") views.overlay('accountPhotoOptions', 28);
			else app.SelectPhoto(1);
		},

		onProfilePictureError: function (element) {
			element.target.src = "images/busy_image.svg";
		},

		SelectPhoto: function (type, overlay) {
			if (overlay) setTimeout(views.hideOverlay, 1000);

			var options = {
				quality: 50,
				destinationType: Camera.DestinationType.FILE_URI,
				targetWidth: 640,
				encodingType: Camera.EncodingType.JPEG,
				sourceType: type,
			};

			if (app.platform == "IOS") {
				options.allowEdit = true;
				options.targetHeight = 640;
			}

			options.allowEdit = true;
			options.targetHeight = 640;

			/*if (app.platform == "ANDROID") {
			if (type == 1) navigator.camera.getPicture(app.startPhotoCrop, function (error) {}, options);
			else {
			options = {
			quality: 50,
			maximumImagesCount: 1,
			width: 640
		};

		window.imagePicker.getPictures(function (result) {
		if (result.length) app.startPhotoCrop(result[0]);
	}, function (error) {
	app.alert("Error selecting photo", "An error occurred while processing your photo. " + JSON.stringify(error));
}, options);
}
}
else*/
navigator.camera.getPicture(app.onSelectPhoto, function (error) {
	app.toast("No photo was selected.");
}, options);
},

startPhotoCrop: function (image) {
	plugins.crop(app.onSelectPhoto, function (e) {
		app.toast("Unable to crop your beautiful picture. Sorry.");
	}, image, {quality: 90});
},

onSelectPhoto: function (image) {
	if (views.current.id == "account") app.element("accountPhoto").src = image;

	var options = new FileUploadOptions();
	options.fileKey = "photo";
	options.fileName = localStorage.uid + image.substr(image.lastIndexOf('/')+1);
	options.mimeType = "image/jpeg";
	options.params = {oauth: localStorage.oauth};
	options.chunkedMode = false;

	app.showBusy();

	var ft = new FileTransfer();
	ft.upload(image, app.API + "selfie/",
	function (result) {
		app.hideBusy();
		var data = JSON.parse(result.response);
		if (data.status == 200) {
			localStorage.photo = data.photo;

			if (views.current.id == "selfie") app.RequestPushPermission();
		}
		else if (data.status == -1) app.Deauthorize();
		else app.alert("Upload failed", data.message);
	}, function (error) {
		app.hideBusy();
		app.alert("Upload failed", "Selfie upload didn't happen. Please check your internet access and try again.");
	}, options);
},

selectContact: function (callback) {
	if (app.isLiveApp) {
		navigator.contacts.pickContact(function (contact) {
			var list = "";
			var phoneNumbers = contact.phoneNumbers;
			contacts.selectedContactName = contact.name.formatted;

			if (!phoneNumbers.length) callback({phone: "", name: contacts.selectedContactName});
			else if (phoneNumbers.length == 1) callback({phone: phoneNumbers[0].value, name: contacts.selectedContactName});
			else if (phoneNumbers.length) {
				app.selectContactCallback = callback;
				for (var i = 0; i < phoneNumbers.length; i++) {
					list += '<div class="buttonList" onclick="app.onSelectContact(\'' + phoneNumbers[i].value + '\')">' + phoneNumbers[i].value + '</div>';
				}

				list += '<div class="buttonList" onclick="views.hideOverlay()"><img class="icon" src="images/button_close.svg" /><span class="label">Cancel</span></div>';

				views.overlay("contactPicker", 55, function () {
					app.element("contactPickerName").innerHTML = contacts.selectedContactName;
					app.element("contactPickerContacts").innerHTML = list;
				});
			}
		});
	}
	else callback({phone: "08179999998", name: "Damilola"});
},

onSelectContact: function (phone) {
	app.selectContactCallback({phone: phone, name: contacts.selectedContactName});
},

getUserPhoto: function () {
	return (localStorage.photo == "" || localStorage.photo == "images/no_selfie.jpg") ? "images/no_selfie.jpg" : localStorage.photo;
},

//•••••• APP LOGIC ENDS HERE ••••••/

valueOf: function (element) {
	return app.element(element).value;
},

send: function (url, data, callback, errorCallback) {
	var xhttp = new XMLHttpRequest();
	xhttp.onreadystatechange = function() {
		if (xhttp.readyState == 4) {
			if (xhttp.status == 200) {
				if (app.debugMode) console.log(xhttp.responseText);
				if (callback) callback(JSON.parse(xhttp.responseText));
			}
			else return errorCallback ? errorCallback() : app.offline(xhttp.status);
		}
	};

	var request = "";
	var i = 0;
	var length = Object.keys(data).length;

	for (var key in data) {
		var ampersand = (i === length-1) ? "" : "&";
		request += (key+"="+encodeURIComponent(data[key]) + ampersand);
		i++;
	}

	xhttp.open("POST", url + "?t=" + new Date().getTime(), true);
	xhttp.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
	xhttp.send(request);
},

showBusy: function () {
	views.locked = true;
	clearInterval(app.busyBlipInterval);

	app.blipIndex = 0;
	app.blipArray = ["#FF0000", "#2283F6", "#FFCC00", "#66B76F"];
	app.element("busyUIView").style.display = "block";

	var blip = app.element("busyBlip");
	blip.className = "blip";

	app.busyBlipInterval = setInterval(function () {
		blip.style.backgroundColor = app.blipArray[app.blipIndex];
		if (app.blipIndex == 3) app.blipIndex = 0;
		else app.blipIndex++;
	}, 350);
},

hideBusy: function () {
	views.locked = false;
	clearInterval(app.busyBlipInterval);

	app.element("busyUIView").style.display = "none";
	app.element("busyBlip").className = "";
},

ShowPriceBar: function (title, currency, amount) {
	var PriceUIView = app.element("PriceUIView");

	TweenLite.killTweensOf(PriceUIView);
	TweenLite.set(PriceUIView, {y:-200});

	app.element("PriceUIViewTitle").innerHTML = title;
	app.element("PriceUIViewAmountCurrency").innerHTML = currency;
	app.element("PriceUIViewAmount").innerHTML = app.numberFormat(amount);

	PriceUIView.style.display = "block";

	TweenLite.to(PriceUIView, 0.5, {y:0});

	app.isPriceUIViewVisible = true;
},

HidePriceBar: function () {
	if (app.isPriceUIViewVisible) {
		TweenLite.killTweensOf(PriceUIView);

		var exit = TweenLite.to(app.element("PriceUIView"), 0.5, {y:-200});
		exit.eventCallback("onComplete", function () {
			PriceUIView.style.display = "none";
		});
	}

	app.isPriceUIViewVisible = false;
},

alert: function (caption, message) {
	if (app.isLiveApp) {
		setTimeout(function () {
			navigator.notification.alert(message, function (){}, caption, 'Okay');
		}, 50);
	}
	else alert(message);
},

toast: function (message, long) {
	var duration = long ? 4000 : 2000;
	var offset = (app.platform == "ANDROID") ? -100 : 0;
	var options = {
		message: message,
		duration: duration,
		position: "bottom",
		addPixelsY: offset,
	};

	if (app.isLiveApp) window.plugins.toast.showWithOptions(options);
	else console.log(options.message);
},

offline: function () {
	app.hideBusy();
	var showMessage = true;

	if (views.current.id == "account") {
		app.isRefreshing = false;
		app.stopSpin(app.element("accountRefresher"));
	}
	else if (views.current.id == "sendConfirmation") {
		showMessage = false;

		var status;
		switch (app.pinDisposition) {
			default: status = "transaction"; break;
			case "SEND_MONEY": status = "transfer to " + transfer.accountName; break;
			case "BUY_AIRTIME": status = "airtime purchase"; break;
			case "BILL_PAYMENT": status = bills.title + " payment"; break;
		}

		transfer.onSendResponse({status:911, message:"Your Internet fizzled while trying your " + status + ". Please check your history before trying again."});
	}

	if (showMessage) app.alert("Can't reach nairabox", "You may be offline. Please check your internet connection and try again.");
},

element: function (element) {
	return document.getElementById(element);
	if (window[element]) return window[element];
	return window[element] = document.getElementById(element);
},

query: function (className, value) {
	var items = document.getElementsByClassName(className);
	for (var i=0, count=items.length; i<count; i++) {
		items[i].innerHTML = value;
	}
},

startIdleTimer: function () {
	if (!app.isSetupIdleTimer) document.addEventListener("click", app.logIdleTouch, false);
	else app.isSetupIdleTimer = true;

	clearInterval(app.idleTimeout);

	app.idleTimeout = setInterval(function () {
		if (new Date().getTime() - app.timerLastTouch >= app.timeoutPeriod) app.Logout();
	}, 30000);

	app.timerLastTouch = new Date().getTime();
},

stopIdleTimer: function () {
	clearInterval(app.idleTimeout);
},

logIdleTouch: function (e) {
	app.timerLastTouch = new Date().getTime();
},

currentTime: function () {
	var date = new Date();
	var hours = date.getHours();
	var minutes = date.getMinutes();
	var ampm = hours >= 12 ? 'PM' : 'AM';
	var months = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

	hours = hours % 12;
	hours = hours ? hours : 12;
	hours = (hours >= 10) ? hours : '0' + hours;
	minutes = minutes < 10 ? '0' + minutes : minutes;

	var time = hours + ':' + minutes + ' ' + ampm;
	return months[date.getMonth()] + " " + date.getDate() + " @ " + time;
},

changeStatusBarColorTo: function (color) {
	if (app.isLiveApp && app.statusBarColor != color) {
		if (color == "black") {
			/*if (app.platform == "ANDROID") StatusBar.backgroundColorByName("white");
			else*/ if (app.platform == "IOS") StatusBar.styleDefault();
		}
		else if (color == "white") {
			/*if (app.platform == "ANDROID") StatusBar.backgroundColorByName("black");
			else*/ if (app.platform == "IOS") StatusBar.styleLightContent();
		}
		app.statusBarColor = color;
	}
},

enableTouch: function (id, index) {
	if (app.isLiveApp) {
		app.element(id).addEventListener("touchstart", function () {
			app.PinEntry(index);
		});
	}
	else {
		app.element(id).addEventListener("mousedown", function () {
			app.PinEntry(index);
		});
	}
},

spin: function (element) {
	element.className += " spin";
},

stopSpin: function (element) {
	element.className = element.className.replace(" spin", "");
},

DrawSlideDots: function (index, total) {
	index;
	//if (index == -1 || index == total) app.changeStatusBarColorTo("black");
	//else app.changeStatusBarColorTo("white");

	var dots = "";
	var active = "<img src='images/dot.svg' class='slideDot' />";
	var inactive = "<img src='images/dot.svg' class='slideDot inactive' />";

	for (var i=0; i<total; i++) {
		if (index == -1) dots += inactive;
		else {
			if (i == index) dots += active;
			else dots += inactive;
		}
	}

	return dots;
},

SlideTo: function (index) {
	app.swipe.slide(index, 300);
},

validateAmount: function (amount) {
	if (amount == 0 || amount < 1) return false;
	return new RegExp('^[0-9.]+$').test(amount);
},

showAmountError: function () {
	app.alert("Invalid Amount", "Please enter a valid amount.\n· Amount must be numbers only\n· Amount must be more than " + localStorage.currency + " 1");
},

numberFormat: function (amount, currency, decimal) {
	amount = Number(amount).toFixed(2).toString();

	var x = amount.split('.');
	var x1 = x[0], x2 = x[1];

	if (!x2) x2 = "00";
	else if (x2.length == 1) x2 = x2 + "0";
	if (decimal) {
		//if (!x2) x2 = "00";
		x2 = "." + x2;
	}
	else x2 = '<span class="powerDecimals">.' + x2 + '</span>';

	var rgx = /(\d+)(\d{3})/;
	while (rgx.test(x1)) {
		x1 = x1.replace(rgx, '$1' + ',' + '$2');
	}

	if (currency) {
		currency = '<span class="currency">' + currency + '</span>';

		if (!decimal) return currency + " " + x1 + x2;
		else return currency + x1 + x2;
	}
	else return x1 + x2;
},

isPlural: function (count, term, plural) {
	if (count == 1) return count + " " + term;
	else return count + " " + ((plural) ? plural : term + "s");
},

htmlText: function (string) {
	return string.replace(/(?:\r\n|\r|\n)/g, '<br />');
},

resetAlternator: function () {
	app.alternateTurn = false;
},

alternate: function () {
	if (app.alternateTurn) {
		app.alternateTurn = false;
		return "";
	}

	app.alternateTurn = true;
	return " alt";
},

generateRandomMessage: function () {
	var list = ["Downloading pure awesomeness...", "Hello from the other side :)", "Easy. Safe. Convenient.", "Today is a great day!", "Wishing you a great time!", "Cheers to you!", "You're my favourite person.", "Getting ready to roll...", "Calculating π(√16384(1/ß))^10...", "Wait for it...", "3, 2, 1... Ignition!", "Opening the box...", "Doing some hi-tech stuff...", "Getting ready for you...", "You're awesome. Seriously!", "Placing bells and whistles...", "Dotting I's and crossing T's...", "The door is opening...", "Ah! You're welcome!", "Lights... Camera... Action!", "The band is marching...", "You're here again! Correct!", "Strolling in the garden...", "Screenshot this message. Tag me... 😊", "😀😀😀😀😀😀😀😀"];

	var index = Math.floor(Math.random() * (list.length - 1 + 1)) + 0;
	return list[index];
},

generateShareMessage: function () {
	var list = ["Igwe thanks for sharing! I hail oooo!", "Thanks for sharing. 5 stars for you!", "Thank you! I have alerted the elders about your generousity.", "You're my best friend. 😊😊😊😊😊😊😊😊😊😊😊😊😊😊😊😊", "If you can screenshot this message and tag me, I'll give you a gift.", "Na you dey reign o!", "Three gbosa for you! Gbosa! Gbosa!! Gbosa!!!", "Haha! That was nice!", "I love people like you. Honestly.", "I can't lie. If I were a person, I'd love to meet you.", "Ah! You're welcome!", "You're a superstar. I know you're a superstar. You must be a super person!", "Me too. I love you.", "Mwah! Thank you.", "You're a correct friend.", "You're now my 'bestest' friend. Ever!"];

	var index = Math.floor(Math.random() * (list.length - 1 + 1)) + 0;
	return list[index];
},

exitApplication: function () {
	if (!app.isLiveApp) console.log("Application Closed.")
	else navigator.app.exitApp();
}
};

function handleOpenURL(url) {
	setTimeout(function() {
		var data = url.split("://");
		var uri = data[1].split("/");

		if (uri[0] === "resetpin") settings.ResetPINFromEmail(uri[1]);
		else if (uri[0] === "verifyemail") {

		}
	}, 1);
}

window.addEventListener('load', function() {
	FastClick.attach(document.body);
}, false);

app.start();
