var wallet = {
	launch: function () {
		wallet.advertise();

		var cards = JSON.parse(localStorage.bankCards);
		var h = (cards.length) ? 65 : 55;

		views.overlay('walletStart', h, function () {
			if (cards.length) {
				var card = cards[0];

				app.element("linkedCardTitle").innerHTML = "Add Cash from this Card ›";
				app.element("linkedCardType").src = "images/networks/icon_" + card.type.toLowerCase() + ".png";
				app.element("linkedCardBank").innerHTML = card.bank;
				app.element("linkedCardPAN").innerHTML = "•••• " + card.last4;
				app.element("otherCard").style.display = app.element("linkedCardButton").style.display = "block";
			}
			else {
				app.element("linkedCardTitle").innerHTML = "Add your ATM/Bank card ›";
				app.element("linkedCardType").src = "images/add.svg";
				app.element("linkedCardBank").innerHTML = "MasterCard / Visa / Verve";
				app.element("linkedCardPAN").innerHTML = "Add ATM/Bank Card";
				app.element("otherCard").style.display = app.element("linkedCardButton").style.display = "none";
			}
		});
	},

	start: function (index) {
		if (index === 1) wallet.addFundsWith(0);
		else if (index === 2) views.goto("addFundsQT", function () {
			app.element("addFundsQTPhone").innerText = localStorage.uid;
		});
		else if (index === 3) views.goto("addFundsBank", function () {});
		else if (index === 4) views.goto("addFundsATM", function () {});
		else if (index === 5) {
			views.hideFlash("advertiseBankCard");

			views.goto("addBankCard", function () {
				if (!wallet.addBankCardListeners) {
					wallet.addBankCardListeners = true;
					wallet.cardNumber = app.element("addBankCardNumber");

					app.element("addBankCardCharge").innerHTML = localStorage.currency + " " + 50;

					var cardMM = app.element("addBankCardMM");
					var cardYY = app.element("addBankCardYY");
					var cardCVV = app.element("addBankCardCVV");

					wallet.cardNumber.addEventListener("keyup", wallet.formatCardNumber);

					cardMM.addEventListener("keyup", function () {
						if (cardMM.value.length == 2) cardYY.focus();
					});
					cardYY.addEventListener("keyup", function () {
						if (cardYY.value.length == 2) app.element("addBankCardCVV").focus();
					});
					cardCVV.addEventListener("keyup", function () {
						if (cardCVV.value.length == 3) app.element("addBankCardPIN").focus();
					});
				}

				app.element("addBankCardNumber").className = "textBox box";
				app.element("addBankCardNumber").value =
				app.element("addBankCardMM").value =
				app.element("addBankCardYY").value =
				app.element("addBankCardCVV").value =
				app.element("addBankCardPIN").value = "";
			});
		}
		else if (index === 6) wallet.listCards(1);
	},
	
	process: function (index, pin) {
		if (index == 1) {
			var amount = app.valueOf("addCashCardAmount");
			
			if (!app.validateAmount(amount)) return app.alert("Specify amount", "How much cash would you like to add to your nairabox account?");
			else if (!pin) return app.EnterPIN('ADD_CASH_CARD');

			app.showBusy();
			app.send(app.API + "cards/", {case: "charge", pin: pin, id: wallet.cardID, amount: amount, oauth: localStorage.oauth}, wallet.onCardDebitResponse);
		}
		else if (index == 2) browser.open(app.base + "3P/quickteller/", browser.handleStatus);
	},

	handleStatus: function (url) {
		var status = url.split("//")[1];
		var messages = status.split("/");

		if (messages[0] == "success") {
			browser.close();

			views.impose("sendComplete", function () {
				app.element("sendCompleteTitle").innerHTML = "Account Funded";
				app.element("sendCompleteNotes").innerHTML = messages[2];
				app.element("sendCompleteAmount").innerHTML = app.numberFormat(messages[1], localStorage.currency);
				app.element("sendCompleteSubtitle").innerHTML = "";
				app.element("sendCompleteFee").innerHTML = "";

				app.element("sendCompleteCaption").innerHTML = "PAYMENT SUCCESSFUL";
				sound.play("complete.mp3");
			});
		}
		else if (messages[0] == "failed") {
			browser.close();
			app.alert("Account Funding Failed", message[1]);
		}
	},

	listCards: function (context) {
		var cards = JSON.parse(localStorage.bankCards);
		var output = '<div class="buttonList padded" onclick="wallet.start(5)">Add a new ATM/Bank Card <img class="rightIcon" src="images/icon_forward.svg" /></div>';

		for (var i=0, t=cards.length; i<t; i++) {
			output += '<div class="featuredList padded" onclick="wallet.triggerCardContext(' + context + ', ' + i + ')">' +
				'<img src="images/networks/icon_' + cards[i].type.toLowerCase() + '.png" class="image" />' +
				'<div class="subtitle padded">' + cards[i].bank + '</div><div class="caption padded">' + cards[i].type + ' ···· ' + cards[i].last4 + '</div>' +
			'</div>';
		}

		views.goto("walletCardList", function () {
			app.element("walletCardListContent").innerHTML = output;
		});
	},

	triggerCardContext: function (context, index) {
		if (context === 1) wallet.addFundsWith(index);
		else if (context === 2) wallet.showWalletOptions(index);
	},

	addBankCard: function () {
		var number = app.valueOf("addBankCardNumber").replace(/\s/g, "");
		var mm = app.valueOf("addBankCardMM");
		var yy = app.valueOf("addBankCardYY");
		var cvv = app.valueOf("addBankCardCVV");
		var cardPin = app.valueOf("addBankCardPIN");

		if (!wallet.verifyCard(number)) {
			app.alert("Invalid Card Number", "Please verify your card number and try again.");
			return false;
		}
		else if (mm.length != 2) {
			app.alert("Card Expiry Month", "Please enter your card expiry month as it appears on your card.");
			return false;
		}
		else if (yy.length != 2) {
			app.alert("Card Expiry Month", "Please enter your card expiry year as it appears on your card.");
			return false;
		}
		else if (cvv.length != 3) {
			app.alert("Enter Card CVV", "Please enter your card CVV number as it appears on behind your card.");
			return false;
		}
		else if (cardPin.length != 4) {
			app.alert("Enter Card PIN", "Please enter your card PIN to authorize this operation.");
			return false;
		}

		app.element("addBankCardPIN").value = "";

		var post = {
			case: "add",
			number: encrypt(number, localStorage.oauth),
			expiryMM: encrypt(mm, localStorage.oauth),
			expiryYY: encrypt(yy, localStorage.oauth),
			cvv: encrypt(cvv, localStorage.oauth),
			pin: encrypt(cardPin, localStorage.oauth),
			oauth: localStorage.oauth,
			deviceID: localStorage.deviceID
		};

		app.showBusy();
		app.send(app.API + "cards/", post, wallet.onAddCardResponse);
	},

	addFundsWith: function (index) {
		var cards = JSON.parse(localStorage.bankCards);

		if (cards.length) views.goto("addCashCard", function () {
			if (!wallet.addFundsListener)
			{
				wallet.addFundsListener = true;
				
				var amount = app.element("addCashCardAmount");
				var fee = app.element("gatewayFee");
				var total = app.element("totalDebit");

				amount.addEventListener("keyup", function () {
					var num = Number(amount.value);
					
					if (!num) var feeAmount = 0;
					else feeAmount = num * .01;
					
					fee.innerHTML = app.numberFormat(feeAmount, localStorage.currency);
					total.innerHTML = app.numberFormat(num+feeAmount, localStorage.currency);
				});
			}

			var card = cards[index];

			wallet.cardID = card.id;
			wallet.amount = app.valueOf("addCashCardAmount");

			app.element("addCashCardBank").innerHTML = card.bank;
			app.element("addCashCardSource").innerHTML = card.type + " ···· " + card.last4;
			app.element("addCashCardAmount").value = "";
			app.element("gatewayFee").innerHTML = app.element("totalDebit").innerHTML = app.numberFormat(0, localStorage.currency);
		});
		else wallet.start(5);
	},

	showWalletOptions: function (index) {
		var cards = JSON.parse(localStorage.bankCards);
		var card = cards[index];

		wallet.cardID = card.id;
		wallet.cardIndex = index;

		views.overlay("walletOptions", 30);
	},

	selectWalletOption: function (index) {
		if (index === 1) return wallet.addFundsWith(wallet.cardIndex);
		else if (index === 2) return app.EnterPIN("REMOVE_CASH_CARD");
	},

	removeCard: function (pin) {
		app.showBusy();
		app.send(app.API + "cards/", {case: "remove", id: wallet.cardID, oauth: localStorage.oauth, pin: pin}, function (data) {
			app.hideBusy();

			if (data.status === 200) {
				localStorage.bankCards = JSON.stringify(data.cards);
				
				wallet.listCards(2);
				app.toast(data.message);
			}
			else app.alert("Error Removing Card", data.message);
		});
	},

	formatCardNumber: function () {
		var element = wallet.cardNumber;
		if (element.value == "") return false;

		var groups = element.value.match(/\d{1,4}/g);
		var value = groups.join(" ");
		element.value = value;

		if (value.length === 19) {
			if (wallet.verifyCard(value.replace(/\s/g, ""))) {
				app.element("addBankCardMM").focus();
				element.className = "textBox box valid";
			}
			else element.className = "textBox box invalid";
		}
		else if (value.length === 23) {
			if (wallet.verifyCard(value.replace(/\s/g, ""))) {
				app.element("addBankCardMM").focus();
				element.className = "textBox box valid";
			}
			else element.className = "textBox box invalid";
		}
		else element.className = "textBox box";
	},

	verifyCard: function(a) {
		if (a.length === 19) {
			var prefix = a.substr(0, 6);
			if (prefix >= 506099 &&  prefix <= 506198 || prefix >= 650002 &&  prefix <= 650027) return true;
			else return false;
		}
		return function(c){for(var l=c.length,b=1,s=0,v;l;)v=parseInt(c.charAt(--l),10),s+=(b^=1)?a[v]:v;return s&&0===s%10}}([0,2,4,6,8,1,3,5,7,9]),

	onAddCardResponse: function (data) {
		app.hideBusy();

		if (data.status === 200 || data.status === 204 || data.status === 206) {
			if (views.current.id == "addBankCard") {
				app.element("addBankCardNumber").value =
				app.element("addBankCardMM").value = app.element("addBankCardYY").value =
				app.element("addBankCardCVV").value = "";
			}
		}

		if (data.status === 200) {
			localStorage.bankCards = JSON.stringify(data.cards);
			localStorage.balance = data.balance;
			localStorage.savings = data.savings;
			localStorage.balanceTime = app.currentTime();

			wallet.showSuccessPage("You've Got Cash!", data.amount, data.balance, data.fee, data.notes, data.cardType, data.cardNumber, data.bank);
		}
		else if (data.status === 204) {
			localStorage.cardPending = "true";
			localStorage.otpLabel = data.otpLabel ? data.otpLabel : "Enter OTP";
			localStorage.otpid = data.otpid;
			localStorage.otpMessage = data.message;

			views.goto("bankCardOTP", function () {
				app.element("bankCardOTPMessage").innerHTML = localStorage.otpMessage;
				app.element("bankCardOTPInput").value = "";
				app.element("bankCardOTPInput").setAttribute("placeholder", localStorage.otpLabel);
			});
		}
		else if (data.status === 206) {
			wallet.transactionReference = data.ref;

			browser.open(data.url, function (event) {
				if (event.url === data.completeURL) browser.close();
			});

			browser.active.addEventListener('onClose', wallet.check3DStatus);
		}
		else {
			app.alert("Error Adding Card", data.message);
			localStorage.removeItem("cardPending");
		}
	},

	check3DStatus: function () {
		app.toast("Please wait while we verify your payment.");
		app.showBusy();

		app.send(app.API + "cards/", {
			case: "check",
			oauth: localStorage.oauth,
			ref: wallet.transactionReference
		},
		function (data) {
			if (data.status === 200 || data.status === 400) wallet.onAddCardResponse(data);
			else wallet.check3DStatus();
		});
	},

	onCardDebitResponse: function (data) {
		app.hideBusy();

		if (data.status === 200) {
			localStorage.balance = data.balance;
			localStorage.savings = data.savings;
			localStorage.balanceTime = app.currentTime();

			wallet.showSuccessPage("You've Got Cash!", data.amount, data.balance, data.fee, data.notes, data.cardType, data.cardNumber, data.bank);
		}
		else if (data.status === 204) {
			var otpLabel = data.otpLabel ? data.otpLabel : "Enter OTP";
			wallet.otpid = data.otpid;

			views.goto("bankCardOTP", function () {
				app.element("bankCardOTPMessage").innerHTML = data.message;
				app.element("bankCardOTPInput").value = "";
				app.element("bankCardOTPInput").setAttribute("placeholder", otpLabel);
				app.element("bankCardOTPCancel").style.display = "none";
			});
		}
		else if (data.status === 206) {
			wallet.transactionReference = data.ref;

			browser.open(data.url, function (event) {
				if (event.url === data.completeURL) browser.close();
			});

			browser.active.addEventListener('onClose', wallet.check3DStatus);
		}
		else if (data.status === 220) {
			views.goto("bankCardAuth", function () {
				app.element("bankCardAuthMessage").innerHTML = data.message;
				app.element("bankCardAuthCVV").value = "";
				app.element("bankCardAuthPIN").value = "";
			});
		}
		else if (data.status === 230) {
			views.goto("bankCardPINChallenge", function () {
				app.element("bankCardPINChallengeMessage").innerHTML = data.message;
				app.element("bankCardPINChallengePIN").value = "";
			});
		}
		else app.alert("Card Debit Failed", data.message);
	},

	confirmCardOTP: function (isCancelRequest) {
		var otp = app.valueOf("bankCardOTPInput");

		if (isCancelRequest) otp = "0.00";

		if (!otp.length) return app.alert("Enter OTP.", "Please enter the OTP to verify this card.");

		app.showBusy();
		app.send(app.API + "cards/", {case: "otp", otpid: localStorage.otpid, otp: otp, oauth: localStorage.oauth}, wallet.onAddCardResponse);
	},

	confirmCardAuth: function () {
		var cvv = app.valueOf("bankCardAuthCVV");
		var pin = app.valueOf("bankCardAuthPIN");

		if (cvv.length != 3) {
			app.alert("Enter Card CVV", "Please enter your card CVV number as it appears on behind your card.");
			return false;
		}
		else if (pin.length != 4) {
			app.alert("Enter Card PIN", "Please enter your card PIN to authorize this operation.");
			return false;
		}

		app.showBusy();
		app.send(app.API + "cards/", {
			case: "auth",
			id: wallet.cardID,
			amount: wallet.amount,
			cvv: encrypt(cvv, localStorage.oauth),
			pin: encrypt(pin, localStorage.oauth),
			oauth: localStorage.oauth
		}, wallet.onAddCardResponse);
	},

	confirmCardPIN: function () {
		var pin = app.valueOf("bankCardPINChallengePIN");

		if (pin.length != 4) {
			app.alert("Enter Card PIN", "Please enter your card PIN to authorize this operation.");
			return false;
		}

		app.showBusy();
		app.send(app.API + "cards/", {
			case: "pin",
			id: wallet.cardID,
			amount: wallet.amount,
			pin: encrypt(pin, localStorage.oauth),
			oauth: localStorage.oauth
		}, wallet.onAddCardResponse);
	},

	showSuccessPage: function (title, amount, balance, fee, notes, cardType, cardNumber, bank) {
		views.goto("transactionComplete", function () {
			app.element("transactionTitle").innerHTML = title;
			app.element("transactionAmount").innerHTML = app.numberFormat(amount, localStorage.currency);
			app.element("transactionBalance").innerHTML = "Available Balance: " + app.numberFormat(balance, localStorage.currency);
			
			if (fee) app.element("transactionFees").innerHTML = "Gateway Fees: " + app.numberFormat(fee, localStorage.currency);
			else app.element("transactionFees").innerHTML = "";

			if (notes) app.element("transactionNotes").innerHTML = notes;
			else app.element("transactionNotes").innerHTML = "";

			if (bank) app.element("transactionSourceBank").innerHTML = bank;
			else app.element("transactionSourceBank").innerHTML = "";

			if (cardType) app.element("transactionSourceType").src = "images/networks/icon_" + cardType.toLowerCase() + ".png";
			else app.element("transactionSourceType").src = "";

			if (cardNumber) app.element("transactionSourceInfo").innerHTML = cardType + " ···· " + cardNumber;
			else app.element("transactionSourceInfo").innerHTML = "";

			localStorage.removeItem("cardPending");
			
			sound.play("complete.mp3");
		});
	},

	showCVVHelp: function () {
		views.overlay("cardCVVHelp", 65);
	},

	advertise: function () {
		if (localStorage.cardPending) {
			return navigator.notification.confirm(
				"It seems you were trying to add a card sometime ago. Have you received the debit alert from your bank?",
				wallet.continueCardOTP,
				"Continue Adding Card?",
				["Yes, Continue", "No, Not Yet", "Cancel & Delete Card"]
			);
		}

		if (localStorage.walletAdvertShown) return false;
		else localStorage.walletAdvertShown = true;

		var cards = JSON.parse(localStorage.bankCards);
		if (!cards.length) views.flash("advertiseBankCard");
	},

	continueCardOTP: function (option) {
		if (option == 1) {
			views.goto("bankCardOTP", function () {
				app.element("bankCardOTPMessage").innerHTML = localStorage.otpMessage;
				app.element("bankCardOTPInput").value = "";
				app.element("bankCardOTPInput").setAttribute("placeholder", localStorage.otpLabel);
				app.element("bankCardOTPCancel").style.display = "block";
			});
		}
		else if (option == 3) {
			localStorage.removeItem("cardPending");
			wallet.confirmCardOTP(true);
		}
	},

	cancelCardOTP: function () {
		localStorage.removeItem("cardPending");
		wallet.confirmCardOTP(true);
		
		views.back();
	}
};