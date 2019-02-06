var beneficiaries = {
	fetch: function (type) {
		app.send(app.API + "beneficiaries/", {oauth: localStorage.oauth, deviceID: localStorage.deviceID, type: type}, function (data) {
			app.hideBusy();
			
			if (data.status == 200) {
				beneficiaries.list = data.list;
				
				var output = ""; app.resetAlternator();
				for (var i=0, count=data.list.length; i<count; i++) {
					var label;
					switch (data.list[i].type) {
						case "BANK":
							label = data.list[i].bank.name;
						break;
						
						case "BILL":
							label = data.list[i].details.subtitle;
						break;
					}
					
					output += '<div class="priceListItem ' + app.alternate() + '" onclick="beneficiaries.interact('+i+')">' +
						'<div class="title">' + data.list[i].details.title + '</div>' +
						'<div class="date">' + label + " › " + data.list[i].details.destination + '</div>' +
					'</div>';
				}
				
				if (type == "BANK") var listTitle = "Saved Bank Accounts";
				else if (type == "BILL") listTitle = "My Saved Bills";
				else listTitle = "Saved For Later";
				
				views.goto("list", function () {
					app.element("listTitle").innerHTML = listTitle;
					app.element("listContent").innerHTML = output;
				});
			}
			else app.alert("Couldn't Fetch Beneficiaries", data.message);
		});
		
		app.showBusy();
	},
	
	interact: function (index) {
		var item = beneficiaries.list[index];
		
		switch (item.type) {
			case "BANK":
				transfer.bankName = item.bank.name;
				transfer.prepareBankTransfer({name: item.details.title, account: item.details.destination, bank: item.details.id, photo: item.bank.photo});
			break;
			
			case "BILL":
				var data = item.details;
				var ids = data.id.split("|");
				bills.parentID = ids[0];
				bills.billID = ids[1];
				bills.title = data.title;
				bills.subtitle = data.subtitle;
				bills.photo = item.photo;
				
				views.goto("billPayment", function () {
					app.element("billAccount").value = data.destination;
					app.element("billAccount").setAttribute("placeholder", data.customerAccountLabel);
					app.element("billAmount").value = data.amount;
					app.element("billAmount").disabled = false;
					app.element("billTitle").innerHTML = data.title;
					app.element("billSubtitle").innerHTML = data.subtitle;
					app.element("billSave").checked = false;
					app.element("billSave").disabled = true;
				});
			break;
		}
	}
};