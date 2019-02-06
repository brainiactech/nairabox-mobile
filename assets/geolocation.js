var geolocation = {
	requestPosition: function (status, callback) {
		localStorage.geolocationRequested = "TRUE";

		geolocation.callback = callback ? callback : null;
		
		if (!status && !localStorage.geolocation) return views.flash("geolocationRequest");
		else return geolocation.getPosition();
	},

	getPosition: function (isUserInteraction) {
		if (isUserInteraction) views.hideFlash('geolocationRequest');

		return geolocation.getCurrentPosition(geolocation.onGetResponse);
	},

	getCurrentPosition: function (callback, errorCallback) {
		return navigator.geolocation.getCurrentPosition(callback, function (error) {
			if (errorCallback) errorCallback(error.message);
			else app.hideBusy();
		}, {maximumAge: 3000, timeout: 5000, enableHighAccuracy: true});
	},

	onGetResponse: function (position) {
		localStorage.geolocation = "ENABLED";

		app.send(app.API + "geolocation/", {
			oauth: localStorage.oauth,
			latitude: position.coords.latitude,
			longitude: position.coords.longitude
		}, function (data) {
			if (data.status === 200) {
				var lastSeenLocation = localStorage.currentLocation ? localStorage.currentLocation : null;
				localStorage.currentLocation = data.geolocation.state;
				geolocation.location = data.geolocation;

				if (localStorage.currentLocation != lastSeenLocation && lastSeenLocation != null) {
					views.flash("geolocationUpdate", function () {
						app.element("geolocationUpdateLocation").innerHTML = localStorage.currentLocation;
						app.element("geolocationUpdateMessage").innerHTML = data.message;
					});
				}

				if (geolocation.callback) geolocation.callback(data.geolocation);
			}
		}, function () {});
	},

	start: function () {
		if (localStorage.geolocation || localStorage.geolocationRequested) return geolocation.getPosition();
		else return geolocation.requestPosition();
	}
};