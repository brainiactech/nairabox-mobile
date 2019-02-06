var bills = {
	fee: 100,

	open: function () {
		views.overlay('billStart', 30);
	},

	start: function (type) {
		if (type == 1) {
			if (window["billsStartCache"]) {
				bills.onFetchBillers(window["billsStartCache"]);
				return;
			}

			app.showBusy();
			app.send(app.API + "bills/", {case: "fetch", oauth: localStorage.oauth, deviceID: localStorage.deviceID}, bills.onFetchBillers);
		}
		else if (type == 2) beneficiaries.fetch('BILL');
		else if (type == 3) bills.loadDirectDebit();
	},

	onFetchBillers: function (data) {
		app.hideBusy();

		if (data.status === 200) {
			window["billsStartCache"] = data;

			var output = '<div class="center" style="padding:1em 0;">';

			for (var i=0, count=data.list.length; i<count; i++) {
				output += '<div class="tileIcon" onclick="bills.selectBiller('+i+')">' +
					'<img src="' + data.list[i].icon + '" class="icon">' +
					'<div class="title">' + data.list[i].title + '</div>' +
				'</div>';
			}

			bills.list = data.list;

			views.goto("list", function () {
				app.element("listTitle").innerHTML = "Select a Bill";
				app.element("listContent").innerHTML = output + '</div>';
			});
		}
		else app.alert("Couldn't Fetch Bills", data.message);
	},

	selectBiller: function (index) {
		var output = ""; app.resetAlternator();
		var options = bills.list[index].options;

		for (var i = 0, count = options.length; i < count; i++) {
			if (options[i].price != 0) var price = '<span class="currency">' + localStorage.currency + '</span> ' + app.numberFormat(options[i].price);
			else price = "";
			output += '<div class="priceListItem ' + app.alternate() + '" onclick="bills.prepareOption('+i+')">' +
				'<div class="title">' + options[i].title + '</div>' +
				'<div class="price">' + price + '</div>' +
			'</div>';
		}

		views.goto("subList", function () {
			bills.billerIndex = index;
			app.element("subListTitle").innerHTML = bills.list[index].title;
			app.element("subListContent").innerHTML = output;
		});
	},

	prepareOption: function (index) {
		var option = bills.list[bills.billerIndex].options[index];
		bills.prepare({id: option.id, title: bills.list[bills.billerIndex].title, subtitle: option.title, amount: option.price, customerAccountNumber: "", customerAccountLabel: bills.list[bills.billerIndex].customerAccountLabel, disableSave: false});
	},

	prepare: function (data) {
		var amount, isAmountDisabled;
		if (data.amount == "0") {
			amount = "";
			isAmountDisabled = false;
		}
		else {
			amount = data.amount;
			isAmountDisabled = true;
		}

		bills.parentID = bills.list[bills.billerIndex].id;
		bills.billID = data.id;
		bills.title = data.title;
		bills.subtitle = data.subtitle;
		bills.photo = bills.list[bills.billerIndex].photo;

		views.goto("billPayment", function () {
			app.element("billAccount").value = data.customerAccountNumber;
			app.element("billAccount").setAttribute("placeholder", data.customerAccountLabel);
			app.element("billAmount").value = amount;
			app.element("billAmount").disabled = isAmountDisabled;
			app.element("billTitle").innerHTML = data.title;
			app.element("billSubtitle").innerHTML = data.subtitle;
			app.element("billSave").checked = false;
			app.element("billSave").disabled = data.disableSave;
		});
	},

	verify: function () {
		var amount = app.valueOf("billAmount");
		var account = app.valueOf("billAccount");
		var accountLabel = app.element("billAccount").getAttribute("placeholder");

		if (!app.validateAmount(amount)) {
			app.showAmountError();
			return false;
		}

		if (!account.length) {
			app.alert(accountLabel, "Please enter a valid " + accountLabel + " to proceed.");
			return false;
		}

		bills.amount = amount;
		bills.account = account;
		bills.saveForLater = app.element("billSave").checked;

		app.showBusy();
		app.send(app.API + "bills/", {case: "validate", billerCode: bills.billID, customerID: bills.account}, function (data) {
			app.hideBusy();

			if (data.status === 200) {
				views.impose("sendConfirmation", function () {
					var photo = app.element("sendConfirmationPhoto");
					photo.src = "images/busy_bank_image.svg";
					photo.className = "cover";

					setTimeout(function () {
						photo.src = bills.photo;
					}, 1000);

					app.element("sendConfirmationClose").style.display = "block";
					app.element("sendConfirmationButton").style.display = "block";
					app.element("sendConfirmationBusy").style.display = "none";

					app.element("sendConfirmationTitle").innerHTML = data.name;
					app.element("sendConfirmationSubtitle").innerHTML = bills.account;
					app.element("sendConfirmationNotes").innerHTML = bills.subtitle;
					app.element("sendConfirmationAmount").innerHTML = app.numberFormat(bills.amount, localStorage.currency);
					app.element("sendConfirmationFees").innerHTML = "+ FEE: " + localStorage.currency + " " + localStorage.billsFee;

					app.element("sendConfirmationCaption").innerHTML = "You're making a payment to";
					app.element("sendConfirmationButton").innerHTML = "PAY NOW";
					transfer.transferType = "BILL";
				});
			}
			else app.alert("Customer Validation Failed", data.message);
		});
	},

	pay: function (pin) {
		transfer.showBusy();

		var post = {};
		post.id = bills.parentID;
		post.billID = bills.billID;
		post.account = bills.account;
		post.amount = bills.amount;
		post.title = bills.title;
		post.subtitle = bills.subtitle;
		post.photo = bills.photo;
		post.oauth = localStorage.oauth;
		post.pin = pin;
		post.saveForLater = bills.saveForLater;
		post.deviceID = localStorage.deviceID;
		post.case = "pay";

		app.send(app.API + "bills/", post, function (data) {
			transfer.hideBusy();
			if (data.status == 200) {
				localStorage.balance = data.balance;
				localStorage.savings = data.savings;
				localStorage.balanceTime = app.currentTime();

				views.impose("sendComplete", function () {
					app.element("sendCompleteTitle").innerHTML = bills.subtitle;
					app.element("sendCompleteNotes").innerHTML = data.notes;
					app.element("sendCompleteAmount").innerHTML = app.numberFormat(bills.amount, localStorage.currency);
					app.element("sendCompleteSubtitle").innerHTML = bills.title + " — " + bills.account;

					app.element("sendCompleteFee").innerHTML = "Fee: " + localStorage.currency + " " + data.transferFee;

					app.element("sendCompleteCaption").innerHTML = "Payment Complete";
					app.stopSpin(app.element("sendConfirmationBusy"));
					sound.play("complete.mp3", .90);
				});
			}
			else app.alert("Bill Payment Failed", data.message);
		});
	},

	loadDirectDebit: function () {
		app.showBusy();
		app.send(app.API + "bills/", {case: "list", oauth: localStorage.oauth, deviceID: localStorage.deviceID}, function (data) {
			app.hideBusy();

			if (data.status === 200) bills.listDirectDebit(data);
			else app.alert("Automatic Bills", data.message);
		});
	},

	listDirectDebit: function (data, ignoreNavigation) {
		var output = "";

		for (var i = 0, count = data.list.length; i < count; i++) {
			var item = data.list[i];
			output += '<div class="priceListItem ' + app.alternate() + '" onclick="bills.startRemoveDirectDebit(\'' + item.id + '\')">' +
				'<div class="title">' + item.bill.subtitle + '</div>' +
				'<div class="type">' + item.date + '</div>' +
				'<div class="price">' + app.numberFormat(item.amount, localStorage.currency) + '</div>' +
			'</div>';
		}

		var displayList = function () {
			app.element("directDebitList").innerHTML = output;
			if (data.list.length) app.element("directDebitEmpty").style.display = "none";
			else app.element("directDebitEmpty").style.display = "block";
		};

		if (ignoreNavigation) displayList();
		else views.goto("directDebit", displayList);
	},
};
