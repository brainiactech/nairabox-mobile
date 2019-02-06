var updater = {
	timeoutDelay: 5000,
	failedAttempt: 0,
	
	checkForUpdate: function () {
		updater.timeout = setTimeout(function () {
			console.log("updater timed out");
			updater.exit(false);
		}, updater.timeoutDelay);

		app.send(app.API + "updater/", {version: app.versionNumber, build: app.buildNumber, platform: app.platform}, function (data) {
			if (updater.ended) return false;
			else clearTimeout(updater.timeout);

			if (data.status === 200) {
				if (data.type === "APP") {
					updater.URL = data.url;
					
					views.start("updateAvailable", function () {
						app.element("updateAvailableMessage").innerHTML = app.htmlText(data.message);
						app.element("updateAvailableSkip").style.display = (data.force === "true") ? "none" : "block";
					});
				}
				else {
					views.start("updateProgress", function () {
						app.element("updateProgressSpinner").className = "spin";
						app.element("updateProgressStatus").innerHTML = "FLASH UPDATE";
						app.element("updateProgressMessage").innerHTML = data.message;
						app.element("updateProgressCount").innerHTML = "0%";

						codePush.sync(function (status) {
							if (status === SyncStatus.DOWNLOADING_PACKAGE) app.element("updateProgressStatus").innerHTML = "DOWNLOADING...";
							else if (status === SyncStatus.INSTALLING_UPDATE) app.element("updateProgressStatus").innerHTML = "INSTALLING...";
							else if (status === SyncStatus.UPDATE_INSTALLED) app.element("updateProgressStatus").innerHTML = "RESTARTING...";
							else if (status === SyncStatus.ERROR || status === SyncStatus.UP_TO_DATE) updater.exit();
						}, {installMode: InstallMode.IMMEDIATE},
						function (e) {
							app.element("updateProgressCount").innerHTML = Math.round((e.receivedBytes/e.totalBytes) * 100) + "%";
						});
					});
				}

				app.GetReady();
			}
			else updater.exit(false);
		}, updater.exit);
	},

	startUpdate: function () {
		window.open(updater.URL, "_system");
	},

	exit: function (status) {
		if (updater.ended) return false;
		else updater.ended = true;
		app.LaunchApp();
	}
};