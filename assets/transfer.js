var transfer = {
	
	start: function () {
		var faces = "";
		
		if (localStorage.recentNairabox) {
			var recents = JSON.parse(localStorage.recentNairabox);
			for (var key in recents) {
				faces += '<div class="featureBox" onclick="transfer.toPhone(\'' + recents[key].phone + '\', \'' + recents[key].name + '\')"><img src="' + recents[key].photo + '" class="featureBoxFace main" /><img src="images/square.svg" class="featureBoxFace placeholder" /><div class="featureBoxTitle">' + recents[key].name.split(" ")[0] + '</div></div>';
			}
		}

		if (app.allowBankTransfer) var x = 15;
		else x = 0;
		
		var sheetHeight = (faces == "") ? 28 + x : 50 + x;

		views.overlay("transferNairabox", sheetHeight, function () {
			if (faces == "") {
				app.element("transferNairaboxContacts").className = "buttonList";
				app.element("featuredFacesArea").style.display = "none";
			}
			else {
				app.element("transferNairaboxContacts").className = "buttonList topDivider";
				app.element("featuredFaces").innerHTML = faces;
				app.element("featuredFacesArea").style.display = "block";
			}

			if (app.allowBankTransfer) {
				app.element("transferPhoneMenu").className = "buttonList";
				app.element("transferBankMenu").style.display = "block";
			}
			else {
				app.element("transferPhoneMenu").className = "buttonList extended";
				app.element("transferBankMenu").style.display = "none";
			}
		});
	},
	
	selectRoute: function (option) {
		var amount = app.valueOf("transferAmount");
		if (!app.validateAmount(amount)) {
			app.showAmountError();
			return false;
		}
		
		transfer.transferType = option;
		transfer.amount = amount;
		transfer.notes = app.valueOf("transferNotes");
		
		if (option == "NAIRABOX") transfer.prepare();
		else if (option == "BANK") views.overlay("transferBankStart", 38);
		else if (option == "SAVE") {
			transfer.accountNumber = localStorage.uid;
			transfer.destinationID = "NAIRABOX";
			transfer.accountName = "Target Account";
			transfer.photo = "images/disc_active.svg";
			transfer.prepare();
		}
	},
	
	showContacts: function () {
		contacts.enable();
		app.selectContact(function (contact) {
			transfer.to(contact);
		});
	},
	
	enterPhoneNumber: function () {
		views.goto('transferNairaboxNumber', function () {
			app.element("transferPhoneNumber").value = "";
		})
	},
	
	searchPhoneNumber: function () {
		var phone = app.valueOf("transferPhoneNumber");
		if (phone.length < 10) {
			app.alert("Invalid Phone Number", "Please enter a valid mobile phone number to continue.");
			return;
		}
		
		transfer.toPhone(phone, "specified contact");
	},
	
	toPhone: function (phone, name) {
		transfer.to({phone: phone, name: name});
	},
	
	to: function (contact) {
		contact.phone = contacts.format(contact.phone);
		
		if (!contact.phone) {
			contacts.notSupportedError();
			return false;
		}
		
		contacts.find(contact, function (user) {
			if (!user) {
				app.alert("Not on Nairabox", "Sorry, but " + contact.name + " isn't on nairabox with " + contact.phone + ". Please try another number.");
				return false;
			}
			
			transfer.accountNumber = contact.phone;
			transfer.accountName = user.name.split(" ")[0];
			transfer.photo = user.photo;
			
			views.goto("transferStart", function () {
				app.element("transferStartName").innerHTML = transfer.accountName;
				app.element("transferStartPhoto").src = transfer.photo;
				app.element("transferAmount").value = "";
				app.element("transferNotes").value = "";
			});
		});
	},
	
	prepare: function () {
		views.impose("sendConfirmation", function () {
			var photo = app.element("sendConfirmationPhoto");
			
			if (transfer.transferType == "BANK") {
				photo.src = "images/busy_bank_image.svg";
				photo.className = "cover";
			}
			else {
				photo.src = "images/busy_image.svg";
				photo.className = "";
				transfer.saveForLater = false;
			}
			
			setTimeout(function () {
				photo.src = transfer.photo;
			}, 1000);
			
			app.element("sendConfirmationClose").style.display = "block";
			app.element("sendConfirmationButtonContainer").style.display = "block";
			app.element("sendConfirmationBusy").style.display = "none";
			
			app.element("sendConfirmationTitle").innerHTML = transfer.accountName;
			app.element("sendConfirmationSubtitle").innerHTML = transfer.accountNumber;
			app.element("sendConfirmationNotes").innerHTML = transfer.notes;
			app.element("sendConfirmationAmount").innerHTML = app.numberFormat(transfer.amount, localStorage.currency);
			app.element("sendConfirmationFees").innerHTML = "+ FEE: " + localStorage.currency + " " + localStorage.transferFee;
			
			app.element("sendConfirmationCaption").innerHTML = "You're sending cash to";
			app.element("sendConfirmationButton").innerHTML = "SEND CASH NOW";
		});
	},
	
	confirm: function () {
		if (transfer.transferType == "SAVE") transfer.save();
		else if (transfer.transferType == "NAIRABOX" || transfer.transferType == "BANK") app.EnterPIN('SEND_MONEY');
		else if (transfer.transferType == "BILL") app.EnterPIN('BILL_PAYMENT');
		else if (transfer.transferType == "AIRTIME") {
			if (airtime.phone == localStorage.uid) airtime.buy("");
			else app.EnterPIN("BUY_AIRTIME");
		}
	},
	
	send: function (pin) {
		app.send(app.API + "transfer/", {oauth: localStorage.oauth, uid: localStorage.uid, amount: transfer.amount, transferType: transfer.transferType, destinationID: transfer.destinationID, destination: transfer.accountNumber, destinationTitle: transfer.accountName, pin: pin, deviceID: localStorage.deviceID, notes: transfer.notes, saveForLater: transfer.saveForLater}, transfer.onSendResponse);
		
		transfer.showBusy();
	},
	
	save: function () {
		app.send(app.API + "save/", {oauth: localStorage.oauth, uid: localStorage.uid, amount: transfer.amount, deviceID: localStorage.deviceID, notes: transfer.notes}, transfer.onSendResponse);
		
		transfer.showBusy();
	},
	
	onSendResponse: function (data) {
		if (data.status == 200) {
			localStorage.balance = data.balance;
			localStorage.savings = data.savings;
			localStorage.balanceTime = app.currentTime();
			
			views.impose("sendComplete", function () {
				app.element("sendCompleteTitle").innerHTML = transfer.accountName;
				app.element("sendCompleteNotes").innerHTML = transfer.notes;
				app.element("sendCompleteAmount").innerHTML = app.numberFormat(transfer.amount, localStorage.currency);
				app.element("sendCompleteSubtitle").innerHTML = (transfer.transferType == "BANK") ? transfer.bankName + " — " + transfer.accountNumber : transfer.accountNumber;
				
				if (data.transferFee) app.element("sendCompleteFee").innerHTML = "Transfer Fee: " + localStorage.currency + " " + data.transferFee;
				else app.element("sendCompleteFee").innerHTML = "";
				
				app.stopSpin(app.element("sendConfirmationBusy"));
				app.element("sendCompleteCaption").innerHTML = "Cash Sent";
				sound.play("complete.mp3", 0.5);
				
				if (transfer.transferType == "NAIRABOX") contacts.addToRecents(transfer.accountName, transfer.photo, transfer.accountNumber);
			});
		}
		else {
			transfer.hideBusy();
			
			if (data.status == 911) app.alert("Network Error", data.message);
			else app.alert("Cash not sent", data.message);
		}
	},
	
	complete: function () {
		views.deposeTo("account", app.RenderAccountInfo, true);
	},
	
	bankStart: function (index) {
		if (index == 1) beneficiaries.fetch('BANK');
		else views.goto("transferBank", function () {
			app.element("bankTransferBank").value = "";
			app.element("bankTransferAccount").value = "";
		});
	},
	
	prepareBankTransfer: function (data) {
		transfer.accountName = data.name;
		transfer.accountNumber = data.account;
		transfer.destinationID = data.bank;
		transfer.photo = data.photo;
		
		transfer.prepare();
	},
	
	fetchBankAccountName: function () {
		var bankID = app.element("bankTransferBank").value;
		var bankAccount = app.element("bankTransferAccount").value;
		var bankName = app.element("bankTransferBank");
				bankName = bankName.options[bankName.selectedIndex].innerHTML;
		
		if (bankID == "") {
			app.alert("Destination Bank", "Please select the destination bank you want to send cash to.");
			return ;
		}
		
		if (bankAccount.length != 10) {
			app.alert("Enter Account Number", "Please enter a valid " + bankName + " account number.");
			return ;
		}
		
		app.showBusy();
		app.send(app.API + "bank/", {case: "getAccountInfo", bank: bankID, accountNumber: bankAccount, deviceID: localStorage.deviceID, oauth: localStorage.oauth}, function (data) {
			app.hideBusy();
			if (data.status == 200) {
				transfer.bankName = bankName;
				transfer.saveForLater = app.element("bankSave").checked;
				transfer.prepareBankTransfer({name: data.name, account: bankAccount, bank: bankID, photo: data.photo});
			}
			else app.alert("Something went wrong", data.message);
		});
	},
	
	getHistory: function (source) {
		if (views.current.id == "historyView") app.spin(app.element("historyRefresher"));
		else app.showBusy();

		if (!source) source = "CASH";
		
		app.send(app.API + "history/", {oauth: localStorage.oauth, deviceID: localStorage.deviceID, source: source}, function (data) {
			app.hideBusy();

			if (views.current.id == "historyView") app.stopSpin(app.element("historyRefresher"));
			if (data.status == 200) {
				var output = ""; app.resetAlternator();
				for (var i=0, count=data.list.length; i<count; i++) {
					output += '<div class="priceListItem ' + app.alternate() + '">' +
						'<div class="title">' + data.list[i].title + '</div>' +
						'<div class="date">' + data.list[i].date + '</div>' +
						'<div class="notes">' + data.list[i].label + '</div>' +
						'<div class="amount ' + data.list[i].direction + '"><span class="currency">' + data.list[i].currency + '</span> ' + app.numberFormat(data.list[i].amount) + '</div>' +
					'</div>';
				}
				
				if (source === "CASH") {
					views.goto("historyView", function () {
						app.element("historyList").innerHTML = output;
					});
				}
				else {
					app.element("rewardsHistoryList").innerHTML = output;
					app.element("rewardsTotal").innerHTML = app.numberFormat(data.lifetimeRewards, localStorage.currency);
				}
			}
			else app.alert("Something went wrong", data.message);
		});
	},
	
	showBusy: function () {
		app.element("sendConfirmationClose").style.display = "none";
		app.element("sendConfirmationButtonContainer").style.display = "none";
		app.element("sendConfirmationBusy").style.display = "block";
		app.spin(app.element("sendConfirmationBusy"));
	},
	
	hideBusy: function () {
		app.stopSpin(app.element("sendConfirmationBusy"));
		app.element("sendConfirmationClose").style.display = "block";
		app.element("sendConfirmationButtonContainer").style.display = "block";
		app.element("sendConfirmationBusy").style.display = "none";
	}
};