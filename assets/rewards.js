var rewards = {
	RenderAccount: function () {
		views.goto("rewardsAccount", function () {
			app.element("rewardsCardBalance").innerHTML = app.numberFormat(localStorage.savings, localStorage.currency);
			app.element("rewardsBalanceDate").innerHTML = localStorage.balanceTime;
			
			transfer.getHistory("REWARDS");
			tracker.track("REWARDS_ACCOUNT");
		});
	},

	startWithdrawal: function () {
		views.overlay("withdraw", 90, function () {
			app.element("withdrawAmount").value = "";
		});
	},
	
	withdraw: function () {
		var amount = app.element("withdrawAmount").value;
		if (!app.validateAmount(amount)) {
			app.showAmountError();
			return false;
		}

		app.showBusy();
		
		app.send(app.API + "withdraw/", {oauth: localStorage.oauth, uid: localStorage.uid, amount: amount, deviceID: localStorage.deviceID}, function (data) {
			app.hideBusy();
			
			if (data.status == 200) {
				localStorage.balance = data.balance;
				localStorage.savings = data.savings;
				localStorage.balanceTime = app.currentTime();

				views.impose("sendComplete", function () {
					app.element("sendCompleteTitle").innerHTML = "";
					app.element("sendCompleteNotes").innerHTML = "You have " + app.numberFormat(data.savings, localStorage.currency) + " left in your Rewards Account.";
					app.element("sendCompleteAmount").innerHTML = app.numberFormat(amount, localStorage.currency);
					app.element("sendCompleteSubtitle").innerHTML = "Withdrawn to Cash Account";
					app.element("sendCompleteFee").innerHTML = "";

					app.element("sendCompleteCaption").innerHTML = "Withdrawal Complete";
					sound.play("complete.mp3", 0.5);
				});
			}
			else {
				if (data.status == 911) app.alert("Network Error", data.message);
				else app.alert("Withdrawal Failed", data.message);
			}
		});
	}
};