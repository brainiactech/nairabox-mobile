var give = {
	start: function () {
		if (give.list) {
			give.render(give.list);
			return;
		}
		
		app.showBusy();
		app.send(app.API + "give/", {case: "browse", oauth: localStorage.oauth, deviceID: localStorage.deviceID}, function (data) {
			app.hideBusy();
			
			if (data.status === 200) {
				give.list = data.list;
				give.render(give.list);
			}
		});
	},
	
	render: function (list) {
		var output = "";
		
		for (var i = 0, count = list.length; i < count; i++) {
			output += '<div class="cause"><div class="bannerArea"><img class="banner" src="' + list[i].banner + '" /><img class="photo" src="' + list[i].photo + '" /></div><div class="title">' + list[i].name + '</div><div class="caption">' + list[i].tagline + '</div><div class="buttons"><button class="donate" onclick="give.to(' + i + ')">Donate to this Charity</button><button class="info" onclick="give.info(' + i + ')">Learn More</button></div></div>';
		}
		
		views.goto("list", function () {
			app.element("listTitle").innerHTML = "Donate";
			app.element("listContent").innerHTML = output;
		});
	},
	
	to: function (index) {
		give.selectedIndex = index;
			
		views.goto("donateComplete", function () {
			app.element("donationCharityPhoto").src = give.list[index].photo;
			app.element("donationCharityName").innerHTML = give.list[index].name;
			app.element("donationAmount").value = app.element("donationComment").value = "";
		});
	},
	
	info: function (index) {
		give.selectedIndex = index;
		views.overlay("donateInfo", 60, function () {
			app.element("donateInfoTitle").innerHTML = "About " + give.list[index].name;
			app.element("donateInfoSummary").innerHTML = give.list[index].summary;
		});
	},
	
	interact: function (index) {
		if (index == 1) give.to(give.selectedIndex);
		else browser.open(give.list[give.selectedIndex].website);
	},
	
	send: function (pin) {
		var amount = app.element("donationAmount").value;
		var comment = app.element("donationComment").value;
		
		if (!app.validateAmount(amount)) app.showAmountError();
		else if (!pin) app.EnterPIN("MAKE_DONATION");
		else {
			app.showBusy();
			
			var destination = give.list[give.selectedIndex].uid;
			var destinationTitle = give.list[give.selectedIndex].name;
			
			app.send(app.API + "give/", {case: "send", amount: amount, destination: destination, destinationTitle: destinationTitle, comment: comment, pin: pin, oauth: localStorage.oauth, deviceID: localStorage.deviceID}, function (data) {
				app.hideBusy();
				
				if (data.status === 200) {
					localStorage.balance = data.balance;
					localStorage.savings = data.savings;
					localStorage.balanceTime = app.currentTime();
					
					views.impose("sendComplete", function () {
						app.element("sendCompleteTitle").innerHTML = give.list[give.selectedIndex].name;
						app.element("sendCompleteNotes").innerHTML = data.thanks;
						app.element("sendCompleteAmount").innerHTML = app.numberFormat(amount, localStorage.currency);
						app.element("sendCompleteSubtitle").innerHTML = "Your donation has been sent";
						
						app.element("sendCompleteFee").innerHTML = "";
						app.element("sendCompleteCaption").innerHTML = "Thanks for Giving!";
						sound.play("complete.mp3", .90);
					});
				}
				else app.alert("Donation failed", data.message);
			});
		}
	}
}