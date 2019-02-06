var uber = {
	start: function () {
		if (localStorage.uberConnected) uber.renderAccount();
		else {
			app.showBusy();
			app.send(app.API + "uber/", {oauth: localStorage.oauth, case: "find"}, function (data) {
				app.hideBusy();

				if (data.status === 200) {
					localStorage.uberName = data.name;
					localStorage.uberPhoto = data.photo;
					localStorage.uberConnected = uber.isConnected = true;

					uber.renderAccount();
				}
				else if (data.status === 404) views.overlay("uberStart", 100, function () {}, 2);
				else app.alert("Something went wrong", data.message);
			});
		}
	},

	renderAccount: function () {
		views.goto("uberAccount", function () {
			app.element("uberName").innerHTML = localStorage.uberName;
			app.element("uberPhoto").src = localStorage.uberPhoto;
		});
	},

	linkAccount: function () {
		browser.open(app.API + "uber/connect/", uber.linkAccountStatus);
	},

	linkAccountStatus: function (event) {
		var response = event.url.split("/?");
		
		if (response[0] === "http://success") {
			browser.close();

			uber.code = response[1];
			app.EnterPIN("CONNECT_UBER");
		}
		else if (response[0] === "http://failure") {
			views.hideOverlay("uberStart");
			browser.close();

			app.alert("Error Connecting UBER", response[1]);
		}
	},

	connect: function (pin) {
		app.showBusy();
		app.send(app.API + "uber/", {case: "connect", oauth: localStorage.oauth, code: uber.code, pin: pin}, function (data) {
			app.hideBusy();

			if (data.status === 200) {
				localStorage.uberName = data.name;
				localStorage.uberPhoto = data.photo;
				localStorage.uberConnected = 1;
				
				uber.renderAccount();
			}
			else app.alert("Error Connecting UBER", data.message);
		});
	},

	requestRide: function () {
		window.open("uber://", "_system");
	}
}