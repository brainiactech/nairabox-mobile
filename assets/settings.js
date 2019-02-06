var settings = {
	show: function () {
		views.goto("settingsView", function () {
			if (app.platform == "IOS") {
				app.element("settingsEnableTouchID").checked = !(localStorage.disableTouchID);
			}
			else app.element("settingsTouchID").style.display = "none";
			
			app.element("settingsOfflineBalance").checked = !(localStorage.disableOfflineBalance);
		});
	},
	
	showVersionInformation: function () {
		app.alert("App Version Info", "Nairabox for " + app.platform + ";\nVersion Number: " + app.versionNumber + ";\nBuild: " + app.buildNumber);
	},
	
	toggleTouchID: function () {
		var status = app.element("settingsEnableTouchID").checked;
		if (status) localStorage.removeItem("disableTouchID");
		else localStorage.disableTouchID = "YES";
	},
	
	toggleOfflineBalance: function () {
		var status = app.element("settingsOfflineBalance").checked;
		if (status) localStorage.removeItem("disableOfflineBalance");
		else localStorage.disableOfflineBalance = "YES";
	},

	startChangePIN: function () {
		views.goto("changePin", function () {
			app.element("changeOldPin").value = app.element("changeNewPin").value = app.element("changeNewPinConfirm").value = "";
		});
	},
	
	ChangePIN: function () {
		var oldPin = app.valueOf("changeOldPin");
		var newPin = app.valueOf("changeNewPin");
		var newPinConfirm = app.valueOf("changeNewPinConfirm");
		
		if (oldPin.length != 4 || !app.validateAmount(oldPin)) {
			app.alert("Invalid Current PIN", "Please enter your current 4-digit account PIN to continue.");
			return ;
		}
		else if (newPin.length != 4 || !app.validateAmount(newPin)) {
			app.alert("Invalid New PIN", "Please choose a new 4-digit account PIN to continue. Your new PIN must contain only numbers.");
			return ;
		}
		else if (newPin != newPinConfirm) {
			app.alert("PIN Mismatch", "Your new PIN and confirmation PIN don't match. Please check your entry and try again.");
			return ;
		}
		
		app.send(app.API + 'changepin/', {oauth: localStorage.oauth, deviceID: localStorage.deviceID, oldPin: oldPin, newPin: newPin, newPinConfirm: newPinConfirm},
				function (data) {
					if (data.status == 200) app.element("changeOldPin").value = app.element("changeNewPin").value = app.element("changeNewPinConfirm").value = "";
					settings.onChangePIN(data);
				});
		app.showBusy();
	},

	startResetPIN: function (index) {
		if (!index) {
			var uid = app.valueOf("resetPinPhone");

			if (uid.length < 10) {
				app.alert("Reset PIN", "Please enter your Phone Number you registered on Nairabox to proceed.");
				return false;
			}
			else {
				settings.uid = uid;
				views.overlay("startResetPin", 40);
			}
		}
		else {
			var tempUID = "";

			if (views.current.id === "signIn") tempUID = app.valueOf("loginPhone");

			views.goto("resetPin", function () {
				if (index === 1) {
					app.element("resetPinPhone").value = tempUID;

					app.element("resetPinEnterPhone").style.display = "block";
					app.element("resetPinWithEmail").style.display =
					app.element("resetPinWithBirthday").style.display =
					app.element("resetPinComplete").style.display = "none";
				}
				else if (index === 2) {
					app.element("resetBirthDay").value = app.element("resetBirthMonth").value = app.element("resetBirthYear").value = "";

					app.element("resetPinWithBirthday").style.display = "block";
					app.element("resetPinEnterPhone").style.display =
					app.element("resetPinWithEmail").style.display =
					app.element("resetPinComplete").style.display = "none";
				}
			});
		}
	},

	ResetPIN: function (index) {
		if (index === 1) {
			var emailCode = app.valueOf("emailCode");

			if (emailCode.length < 4) {
				app.alert("Invalid Code", "Please enter the Account Recovery Code we sent to your email. Check your SPAM/Junk folder if you didn't get it in your inbox.");
			}
			else settings.ResetPINFromEmail(emailCode);

			return false;
		}
		else if (index === 2) {
			var day = app.valueOf("resetBirthDay");
			var month = app.valueOf("resetBirthMonth");
			var year = app.valueOf("resetBirthYear");

			if (day == "" || !app.validateAmount(day)) {
				app.alert("Birth Day", "Please enter your birth day to continue, e.g. 21");
				return;
			}
			else if (month == "") {
				app.alert("Birth Month", "Please select your birth month to continue.");
				return;
			}
			else if (year.length !== 4 || !app.validateAmount(year)) {
				app.alert("Birth Year", "Please enter your birth year in full, e.g. 1985");
				return;
			}
			else {
				if (day < 10) day = "0" + day;
				
				settings.resetValue = year + "-" + month + "-" + day;
				settings.resetType = "BIRTHDAY";

				app.element("resetPinWithBirthday").style.display = "none";
				app.element("resetPinComplete").style.display = "block";
			}

			return false;
		}
		else if (index === 3) {
			app.showBusy();

			app.send(app.API + "resetpin/" , {case : "sendEmailCode", uid: settings.uid}, function (data) {
				app.hideBusy();

				if (data.status === 200) {
					views.goto("resetPin", function () {
						app.element("resetPinEmailMessage").innerHTML = data.message;
						app.element("emailCode").value = "";

						app.element("resetPinEnterPhone").style.display = "none";
						app.element("resetPinWithEmail").style.display = "block";
						app.element("resetPinWithBirthday").style.display = "none";
						app.element("resetPinComplete").style.display = "none";
					});
				}
				else app.alert("Oops! Something went wrong.", data.message);
			});
		}
		else if (index === 4) {
			var newPin = app.valueOf("resetNewPin");
			var newPinConfirm = app.valueOf("resetNewPinConfirm");

			if (newPin.length != 4 || !app.validateAmount(newPin)) {
				app.alert("Invalid New PIN", "Please choose a new 4-digit account PIN to continue. Your new PIN must contain only numbers.");
				return ;
			}
			else if (newPin != newPinConfirm) {
				app.alert("PIN Mismatch", "Your new PIN and confirmation PIN don't match. Please check your entry and try again.");
				return ;
			}

			var post = {
				case: "DoResetPIN",
				uid: settings.uid,
				newPin: newPin,
				newPinConfirm: newPinConfirm,
				resetType: settings.resetType,
				resetValue: settings.resetValue
			};

			app.showBusy();

			app.send(app.API + 'resetpin/', post, function (data) {
				app.hideBusy();

				if (data.status == 200) {
					app.element("resetNewPin").value = app.element("resetNewPinConfirm").value = "";
					app.alert("PIN Reset Successful", data.message);
					app.Deauthorize();
				}
				else app.alert("Error Resetting PIN", data.message);
			});
		}
		else if (index === 5) {

		}
	},

	ResetPINFromEmail: function (code) {
		settings.resetValue = code;
		settings.resetType = "EMAIL";

		app.element("emailCode").value = "";
		app.element("resetPinWithEmail").style.display = "none";
		app.element("resetPinComplete").style.display = "block";
	},

	onChangePIN: function (data) {
		app.hideBusy();

		if (data.status == 200) {
			app.alert("PIN Reset Successful", data.message);
			app.Logout();
		}
		else app.alert("PIN Reset Failed", data.message);
	},
	
	startFeedback: function () {
		views.overlay("feedback", 87);
	},
	
	SendFeedback: function () {
		var text = app.valueOf("feedbackText");
		if (!text.length) {
			app.alert("Send Feedback", "Please either describe a problem you are experiencing on nairabox, or any other suggestions you may have.");
			return ;
		}
		
		app.send(app.API + "feedback/", {oauth: localStorage.oauth, deviceID: localStorage.deviceID, feedback: text, platform: app.platform, build: app.buildNumber, version: app.versionNumber}, function (data) {
			app.hideBusy();
			
			if (data.status == 200) {
				app.element("feedbackText").value = "";
				app.alert("Feedback Sent", data.message);
				views.hideOverlay();
			}
			else app.alert("Couldn't Send Feedback", data.message);
		});
		
		app.showBusy();
	},
	
	contact: function (index) {
		if (index == 1) window.location = "tel:+234 908 0000 381";
		else window.location = "mailto:support@nairabox.com?subject=Mobile App Support&body=** PLEASE LEAVE INTACT * Platform: " + app.platform + "; Version Number: " + app.versionNumber + "; Build: " + app.buildNumber + "; **";
	}
};