var coke = {
	start: function () {
		if (app.isLiveApp) cordova.plugins.barcodeScanner.scan(coke.onScanCode);
		else return coke.onScanCode({text: "TEST_COKE"});
	},

	onScanCode: function (data) {
		if (data.text) {
			app.alert("Coke Everywhere", "You've just got a Coke Reward! #CokeEverywhere #nairabox");
		}
	}
}