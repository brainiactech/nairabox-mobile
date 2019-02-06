var tracker = {
	start: function () {
		if (app.isLiveApp) mixpanel.init("aeec25627126941e4dbe5a348b9d087b", tracker.debug, tracker.debugFail);
		else console.log("MIXPANEL: INIT");
	},

	track: function (view, properties) {
		if (app.isLiveApp) mixpanel.track(view, properties, tracker.debug, tracker.debugFail);
		else console.log("MIXPANEL:", view, properties);
	},

	debug: function (e) {
		//app.alert("MIXPANEL", "Success: " + JSON.stringify(e));
	},

	debugFail: function (e) {
		//app.alert("MIXPANEL", "Failed: " + JSON.stringify(e));
	}
};