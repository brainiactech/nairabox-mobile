var contacts = {
	start: function () {
		if (localStorage.availableContacts) contacts.available = JSON.parse(localStorage.availableContacts);
		else contacts.available = [];
	},
	
	enableContext: '<div class="contactsPermission">You can request and send money directly to your phone contacts here.<button class="orange" onclick="contacts.enable()">Show my Contacts</button></div>',
	
	hasPermission: function () {
		return !!(localStorage.contactsEnabled);
	},
	
	enable: function () {
		localStorage.contactsEnabled = true;
		//contacts.sync();
	},
	
	sync: function () {
		if (contacts.hasPermission() && !contacts.synched) {
			var fields = [navigator.contacts.fieldType.name, navigator.contacts.fieldType.phoneNumbers];
			var options = new ContactFindOptions();
			options.multiple = true;
			options.hasPhoneNumber = true;
			
			navigator.contacts.find(fields, function (contactList) {
				var string = "";
				
				for (var i = 0; i < contactList.length; i++) {
					var phoneNumbers = contactList[i].phoneNumbers;
					if (phoneNumbers) {
						for (var j = 0; j < phoneNumbers.length; j++) {
								string += (contactList[i].name.formatted + "~~~" + phoneNumbers[j].value + "|||");
						}
					}
				}
				
				contacts.synched = true;
				
				app.send(app.API + 'contacts/', {case: "save", oauth: localStorage.oauth, list: string}, function (data) {
					if (data.status == 200) {
						contacts.available = data.list;
						localStorage.availableContacts = JSON.stringify(data.list);
					}
					else app.alert("Contact Sync Failed", data.message);
				});
			}, contacts.onError, options);
		}
	},
	
	onError: function (error) {
		app.hideBusy();
		alert(error);
	},
	
	render: function (refresh) {
		if (contacts.renderedList && !refresh) return contacts.renderedList;
		else if (!contacts.hasPermission()) return contacts.enableContext;
		
		var user, output = "";
		var list = contacts.list;
		contacts.length = contacts.list.length;
		if (!contacts.length) return contacts.empty;
		
		for (var i=0; i<contacts.length; i++) {
			if (user = contacts.find(list[i].phone)) {
				output += '<div class="listItem" onclick="transfer.to(\'' + list[i].phone + '\')"><img src="' + user.photo + '" class="listItemPhoto" /><img src="images/busy_image.svg" class="listItemPhoto placeholder" /><div class="listItemTitle">' + list[i].name + '</div><div class="listItemSubtitle">' + list[i].phone + '</div></div>';
			}
			else output += '<div class="listItem" onclick="transfer.to(\'' + list[i].phone + '\')"><img src="images/add.svg" class="listItemPhoto placeholder" /><div class="listItemTitle">' + list[i].name + '</div><div class="listItemSubtitle">' + list[i].phone + '</div></div>';
		}
		
		contacts.renderedList = output;
		return output;
	},
	
	find: function (contact, callback) {
		var isUserFound = false;
		
		if (contacts.available) {
			var count = contacts.available.length;
			for (var i = 0; i < count; i++) {
				if (contacts.available[i].phone == contact.phone) {
					var result = {phone: contact.phone, name: contacts.available[i].name, photo: contacts.available[i].photo};
					
					isUserFound = true;
					if (callback) {
						callback(result);
						return;
					}
					else return result;
					break;
				}
			}
		}
		
		if (!callback) return false;
		else if (isUserFound) return true;
		
		else app.showBusy();
		
		app.send(app.API + 'contacts/', {case: "find", uid: contact.phone, name: contact.name, oauth: localStorage.oauth, deviceID: localStorage.deviceID}, function (data) {
			app.hideBusy();
			
			if (data.status == 200) {
				var result = {phone: data.user.uid, name: data.user.name, photo: data.user.photo};
				if (callback) {
					callback(result);
					return true;
				}
				else return result;
			}
			else {
				if (callback) {
					callback(false);
					return false;
				}
				else return false;
			}
		});
	},
	
	addToRecents: function (name, photo, phone) {
		var contact = {"name": name, "photo": photo, "phone": phone, "time": new Date().getTime()};
		
		if (localStorage.recentNairabox) {
			var recents = JSON.parse(localStorage.recentNairabox);
			recents[phone] = contact;
			var sorted = Object.keys(recents).sort(function (a,b) {
				return recents[b].time-recents[a].time;
			});
			var list = {};
			var count = (sorted.length >= 10) ? 10 : sorted.length;
			for (var i = 0; i < count; i++) {
				var key = sorted[i];
				list[key] = recents[key];
			}
			localStorage.recentNairabox = JSON.stringify(list);
		}
		else {
			recents = {};
			recents[phone] = contact;
			localStorage.recentNairabox = JSON.stringify(recents);
		}
	},
	
	getNameFromList: function (phone) {
		var count = contacts.list.length;
		for (var i=0; i<count; i++) {
			if (contacts.list[i].phone == phone) return contacts.list[i].name;
		}
	},
	
	format: function (number) {
		number = number.replace(/\D/g, "");
		if (number.substr(0, 4) == "2340") number = "0" + number.substr(4);
		else if (number.substr(0, 3) == "234") number = "0" + number.substr(3);

		if (number.substr(0, 2) == "07" || number.substr(0, 2) == "08" || number.substr(0, 2) == "09") return number;
		else return false;
	},
	
	show: function () {
		contacts.enable();
		
		app.selectContact(function (contact) {
			var phone = contacts.format(contact.phone);
			if (!phone) {
				contacts.notSupportedError();
				return ;
			}
			else contact.phone = phone;
			
			contacts.selectedContact = contact;
			views.overlay("contactOptions", 60, function () {
				app.element("contactOptionsName").innerHTML = contact.name;
				app.element("contactOptionsPhone").innerHTML = contact.phone;
				app.element("contactOptionPhoto").src = "images/icon_contact.svg";
				
				contacts.find(contact, function (user) {
					if (!user) {
						app.element("contactOptionInvite").innerText = "Invite to Nairabox";
						app.element("contactOptionInvite").setAttribute("data-role", "INVITE");
					}
					else {
						setTimeout(function () {
							app.element("contactOptionPhoto").src = user.photo;
						}, 1000);
						app.element("contactOptionInvite").innerText = "Send Money";
						app.element("contactOptionInvite").setAttribute("data-role", "TRANSFER");
					}
				})
			});
		});
	},
	
	interact: function (type) {
		var contact = contacts.selectedContact;
		
		if (type == "AIRTIME") {
			airtime.prepare({name: contact.name, phone: contact.phone, network: ""});
			return;
		}
		else if (type == "TICKET") {
			tickets.start(contact);
			return;
		}
		else if (type == "INVITE") {
			var role = app.element("contactOptionInvite").getAttribute("data-role");
			
			if (role == "TRANSFER") {
				transfer.to(contact);
				return ;
			}
			
			app.showBusy();
			
			app.send(app.API + "contacts/", {case: "invite", oauth: localStorage.oauth, deviceID: localStorage.deviceID, phone: contact.phone, name: contact.name}, function (data) {
				app.hideBusy();
				
				if (data.status === 200) app.alert("Contact Invited", data.message);
				else app.alert("Contact Invitation Failed", data.message);
			});
		}
	},
	
	notSupportedError: function () {
		app.alert("Unrecognized Number", "The phone number you've selected is not supported at the moment. Please select a Nigerian mobile phone number to continue.");
	}
};

contacts.start();