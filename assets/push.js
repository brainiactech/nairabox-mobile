var push = {
	debug: false,
	
	init: function () {
		push.device = device.platform.toUpperCase();
	},
	
	RegisterDevice: function () {
		var notification = PushNotification.init({
			android: {senderID: "107189282291", icon: "notif"},
			ios: {alert: true, badge: true, sound: true},
			windows: {}
		});
		
		notification.on('registration', function (data) {
			localStorage.pushToken = data.registrationId;
			localStorage.isPushRegistered = "YES";
			
			var model = device.model;
			var os = device.version;

			app.send(app.API + "pushtoken/", {oauth: localStorage.oauth, platform: push.device, pushToken: localStorage.pushToken, model: model, os: os, build: app.versionNumber}, function (data) {
				if (push.debug) alert(data.message);
			});

			mixpanel.people.setPushId(localStorage.pushToken, tracker.debug, tracker.debugFail);
		});
		
		notification.on('notification', function (data) {
			if (data.message) {
				push.trigger = function () {
					var title = (data.title) ? data.title : "Hello, " + localStorage.firstname + ".";

					views.flash("pushMessage", function () {
						app.element("pushMessageTitle").innerHTML = title;
						app.element("pushMessageText").innerHTML = data.message.replace("\n", "<br />");
					});

					sound.play("beam.mp3", 0.5);
				}

				if (app.hasLoaded === true) push.trigger();
				else push.isAvailable = true;
			}
			
			if (data.additionalData) {
				//push.handle(JSON.parse(data.additionalData));
			}
		});
		
		notification.on('error', function (e) {
			if (push.debug) alert(e.message);
		});
	},

	handle: function (data) {
		
	}
};