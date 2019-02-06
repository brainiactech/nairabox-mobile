var friends = {
	showInviteCode: function (flash) {
		var action = function () {
			app.element("inviteCode").innerHTML = localStorage.inviteCode;
			//app.element("inviteCount").innerHTML = app.isPlural(localStorage.inviteCount, "friend");
			//app.element("inviteReward").innerHTML = app.numberFormat(localStorage.inviteRewards, localStorage.currency);

			if (!friends.loadedMessage) {
				app.send(app.API + "friends/", {case: "message", oauth: localStorage.oauth}, function (data) {
					if (data.status == 200) {
						friends.loadedMessage = true;
						app.element("inviteMessage").innerHTML = data.message;
					}
				}, true);
			}
		};

		if (flash) {
			views.flash("invite", function () {
				action();
				app.element("skipInviteLabel").innerHTML = "NOT NOW";
			});
			return friends.isFlashInvite = true;
		}
		
		views.goto("invite", function () {
			action();
			app.element("skipInviteLabel").innerHTML = "OKAY";
		});
		return friends.isFlashInvite = false;
	},

	hideInviteCode: function () {
		if (friends.isFlashInvite) views.hideFlash("invite");
		else views.back();
	},

	shareInviteCode: function () {
		app.showBusy();
		app.send(app.API + "friends/", {case: "share", oauth: localStorage.oauth}, function () {}, true);

		var image = (!localStorage.gender || localStorage.gender == "O" || localStorage.gender == "F") ? "www/images/invite/invite_female.jpg" : "www/images/invite/invite_male.jpg";

		var options = {
			files: [image],
			message: "Download nairabox now and use my Invite Code " + localStorage.inviteCode + ". Enjoy freedom buying cinema tickets, pay bills and purchase airtime with the app. Download https://bit.ly/2bvKE0v",
			subject: "Join me on nairabox now!",
			link: "https://bit.ly/2bvKE0v"
		};

		window.plugins.socialsharing.shareWithOptions(options, function () {
			app.hideBusy();
			app.toast(app.generateShareMessage());

			if (friends.isFlashInvite) return views.hideFlash("invite");
		}, app.hideBusy);
	}
};