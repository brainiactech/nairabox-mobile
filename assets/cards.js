var cards = {
	fetch: function () {
		app.showBusy();
		app.send(app.API + "cards/", {case: "list", oauth: localStorage.oauth}, function (data) {
			app.hideBusy();

			if (data.status === 200) cards.listCards(data);
			else app.alert("Error Fetching Cards", data.message);
		});
	},

	select: function (index) {
		cards.selected = cards.list[index];
		cards.id = cards.selected.id;

		views.overlay("cardOptions", 40, function () {
			if (cards.selected.id === localStorage.defaultCard) {
				app.element("cardOptionsDefault").innerHTML = "Default Card";
				app.element("cardOptionsDefaultTick").style.display = "block";
			}
			else {
				app.element("cardOptionsDefault").innerHTML = "Set as Default Card";
				app.element("cardOptionsDefaultTick").style.display = "none";
			}

			app.element("cardOptionsLock").innerHTML = (cards.selected.locked === 0) ? "Lock Card" : "Unlock Card";
		});
	},

	options: function (index) {
		if (index == 1) {
			if (cards.selected.locked === 0) app.EnterPIN("LOCK_CARD");
			else app.EnterPIN("UNLOCK_CARD");
		}
		else if (index == 2) app.EnterPIN("REMOVE_CARD");
		else if (index == 3) {
			if (cards.selected.locked === 0) {
				localStorage.defaultCard = cards.selected.id;
				app.element("cardOptionsDefault").innerHTML = "Default Card";
				app.element("cardOptionsDefaultTick").style.display = "block";

				sync.get(localStorage.cardsURI + cards.selected.photo, function (uri) {
					alert("The URI is " + uri);
					localStorage.defaultCardPhoto = uri;
				});
			}
			else app.alert("Unlock Card First", "Sorry, but you can't use this card until you unlock it.");
		}
		else if (index == 4) views.goto("cardSetPIN", function () {
			app.element("cardSetPINNew").value = "";
		});
	},

	startAdd: function (index) {
		if (index == 1) {
			if (app.isLiveApp) {
				cordova.plugins.barcodeScanner.scan(function (data) {
					cards.doValidateCardID(data.text);
				}, function (error) {});
			}
			else cards.doValidateCardID("2BBDFBC5C7");
		}
		else {
			views.goto("addCardByID", function () {
				app.element("addCardID").value = "";
			});
		}
	},

	validateCardID: function () {
		var id = app.valueOf("addCardID");
		if (id.length < 5) {
			app.alert("Enter Valid Card ID", "Please enter a valid Nairabox Card ID. You can find your Card ID printed at the back of your Nairabox Pay Card.");
			return;
		}

		cards.doValidateCardID(id);
	},

	doValidateCardID: function(cardID) {
		if (cardID) {
			app.showBusy();
			app.send(app.API + "cards/", {case: "validate", oauth: localStorage.oauth, id: cardID}, function (data) {
				app.hideBusy();

				if (data.status === 200) {
					views.goto("activateCard", function () {
						app.element("activateCardPhoto").src = data.card.photo;
						app.element("activateCardTitle").innerHTML = data.card.title;
						app.element("activateCardID").innerHTML = cards.id = data.card.id;
					})
				}
				else app.alert("Card Validation Failed", data.message);
			});
		}
	},

	activateCard: function () {
		app.EnterPIN("ADD_CARD");
	},

	add: function (pin) {
		app.showBusy();
		app.send(app.API + "cards/", {case: "add", oauth: localStorage.oauth, id: cards.id, pin: pin}, function (data) {
			app.hideBusy();

			if (data.status === 200) cards.listCards(data);
			else app.alert("Error Adding Card", data.message);
		});
	},

	lock: function (pin) {
		app.showBusy();
		app.send(app.API + "cards/", {case: "lock", oauth: localStorage.oauth, id: cards.id, pin: pin}, function (data) {
			app.hideBusy();

			if (data.status === 200) {
				cards.listCards(data);
				app.alert("Card Locked.", "You've successfully locked your card. This card can't be used until you unlock it.");
			}
			else app.alert("Error Locking Card", data.message);
		});
	},

	unlock: function (pin) {
		app.showBusy();
		app.send(app.API + "cards/", {case: "unlock", oauth: localStorage.oauth, id: cards.id, pin: pin}, function (data) {
			app.hideBusy();

			if (data.status === 200) cards.listCards(data);
			else app.alert("Error Unlocking Card", data.message);
		});
	},

	remove: function (pin) {
		app.showBusy();
		app.send(app.API + "cards/", {case: "remove", oauth: localStorage.oauth, id:cards.id, pin:pin}, function (data) {
			app.hideBusy();

			if (data.status === 200) cards.listCards(data);
			else app.alert("Error Removing Card", data.message);
		});
	},

	listCards: function (data) {
		var output = "";
		cards.list = data.list;
		cards.URI = localStorage.cardsURI = data.uri + "large/";
		localStorage.cards = JSON.stringify(cards.list);

		for (var i=0, count=data.list.length; i<count; i++) {
			if (data.list[i].locked == 1) var status = '<span class="state" style="color:#DC6076">LOCKED</span>';
			else status = '<span class="state" style="color:green">ACTIVE</span>';

			output += '<div class="cardListItem" onclick="cards.select(' + i + ')">' +
			'<img class="image" src="' + data.uri + "thumbs/" + data.list[i].photo + '" />' +
			'<div class="title">' + data.list[i].title + '</div><div class="subtitle">' + cards.mask(data.list[i].id) + '</div>' +
			'<div class="status">' + status + '<span class="date">' + data.list[i].date + '</span></div>' +
			'</div>';
		}

		if (!cards.list.length) {
			localStorage.removeItem("defaultCard");
			localStorage.removeItem("defaultCardPhoto");
		}
		else {
			localStorage.defaultCard = data.list[0].id;
			localStorage.defaultCardPhoto = localStorage.cardsURI + data.list[0].photo;
			cache.download(localStorage.defaultCardPhoto);

			if (data.list.length == 1 && data.list[0].locked == 1) {
				localStorage.removeItem("defaultCard");
				localStorage.removeItem("defaultCardPhoto");
			}
		}

		views.goto("myCards", function () {
			app.element("cardsList").innerHTML = output;
			if (data.list.length) app.element("cardsListEmpty").style.display = "none";
			else app.element("cardsListEmpty").style.display = "block";
		});
	},

	mask: function (id) {
		var prefix = id.substr(0, 3);
		var suffix = id.substr(6, 4);
		return prefix + " ••• " + suffix;
	},

	renderCards: function () {
		var cardsList = JSON.parse(localStorage.cards);
		var output = "";

		for (var i=0, count=cardsList.length; i<count; i++) {
			var image = localStorage.cardsURI + cardsList[i].photo;
			output += '<div class="cardHolder"><img src="' + image + '" class="card" /></div>';
		}
	},

	renderDefaultCard: function () {
		if (localStorage.defaultCardPhoto) {
			cache.get(localStorage.defaultCardPhoto, function (local) {
				app.element("base").src = local;
			});
		}
		else app.element("base").src = "images/default_card.jpg";
	},

	exit: function () {
		views.reverseTo("account", function () {
			cards.renderDefaultCard();
		}, true);
	}
}