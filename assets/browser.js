var browser = {
	options: {
		statusbar: {
			color: "#000000FF"
		},
		toolbar: {
			height: 44,
			color: "#000000FF"
		},
		title: {
			color: "#FFFFFFFF",
			showPageTitle: true
		},
		closeButton: {
			wwwImage: 'images/browser_close.png',
			wwwImagePressed: 'images/browser_close_over.png',
			wwwImageDensity: 3,
			align: 'right',
			event: 'onClose'
		},
		backButtonCanClose: true
	},

	open: function (URL, callback) {
		app.stopIdleTimer();
		browser.url = URL;
		
		if (app.platform === "IOS" || app.platform === "ANDROID") {
			browser.active = cordova.ThemeableBrowser.open(URL, "_blank", browser.options);
		}
		else browser.active = window.open(URL, "_blank");
		
		if (callback) {
			setTimeout(function () {
				browser.active.addEventListener("loadstart", callback);
			}, 150);
		}
	},

	close: function () {
		browser.active.close();
	}
};