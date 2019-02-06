var tickets = {
	start: function (beneficiary) {
		tickets.contact = beneficiary;
		tickets.beneficiary = (beneficiary) ? beneficiary.phone : localStorage.uid;
		
		if (tickets.storeLoaded && views.current.id !== "ticketShop") return views.goto("ticketShop");
		
		app.showBusy();
		app.send(app.API + "tickets/", {case: "start", oauth: localStorage.oauth}, tickets.onStartResponse);
	},
	
	onStartResponse: function (data) {
		app.hideBusy();

		if (data.status === 200) {
			tickets.storeLoaded = true;
			tickets.list = data.list;
			tickets.featuredList = data.featured;
			
			var cinema = "", events = "";
			
			for (var i = 0, count = data.list.length; i<count; i++) {
				if (data.list[i].category == "CINEMA") cinema += '<div class="poster" onclick="tickets.fetchSingleTicket(\'' + data.list[i].id + '\')">' +
					'<div class="images"><img src="' + data.list[i].artwork + '" class="artwork" /><img src="images/ticket_placeholder.png" class="placeholder" /></div><div class="title">' + data.list[i].name + '</div></div>';
				else if (data.list[i].category == "EVENT") events += '<div class="poster" onclick="tickets.fetchSingleTicket(\'' + data.list[i].id + '\')">' +
					'<div class="images"><img src="' + data.list[i].artwork + '" class="artwork" /><img src="images/ticket_placeholder.png" class="placeholder" /></div><div class="title">' + data.list[i].name + '</div></div>';
			}

			views.goto("ticketShop", function () {
				if (tickets.featuredList.length) {
					var banner = app.element("ticketShopBanner");
					banner.src = tickets.featuredList[0].banner;
					banner.setAttribute("onClick", "tickets.fetchSingleTicket(\'" + tickets.featuredList[0].id + "\')");
					banner.style.display = "block";
				}
				else app.element("ticketShopBanner").style.display = "none";
				
				app.element("ticketPostersCinema").innerHTML = cinema;
				app.element("ticketPostersEvents").innerHTML = events;
			});
		}
		else app.alert("Error Fetching Tickets", data.message);
	},
	
	browse: function (type) {
		tickets.beneficiary = localStorage.uid;
		tracker.track(type, {name: "LAUNCH"});
		
		if (window["ticketsBrowseCache" + type]) {
			tickets.onBrowseResponse(window["ticketsBrowseCache" + type], type);
			return;
		}
		
		app.showBusy();
		app.send(app.API + "tickets/", {case: "browse", type: type, oauth: localStorage.oauth}, function (data) {
			tickets.onBrowseResponse(data, type);
		});
	},

	onBrowseResponse: function (data, section) {
		app.hideBusy();

		if (data.status === 200) {
			window["ticketsBrowseCache" + section] = data;
			tickets.sublist = data.list;
			tickets.featuredList = data.featured;
			
			var output = "";

			if (section == "EVENT") {
				var poster = "poster wide";
				var placeholder = "busy_bank_image.svg";
			}
			else {
				poster = "poster";
				placeholder = "ticket_placeholder.png";
			}
			
			for (var i = 0, count = data.list.length; i<count; i++) {
				var artwork = (section == "EVENT") ? data.list[i].banner : data.list[i].artwork;

				output += '<div class="' + poster + '" onclick="tickets.fetchSingleTicket(\'' + data.list[i].id + '\')">' +
					'<div class="images"><img src="' + artwork + '" class="artwork" /><img src="images/' + placeholder + '" class="placeholder" /></div><div class="title">' + data.list[i].name + '</div></div>';
			}

			views.goto("ticketShopSection", function () {
				if (tickets.featuredList.length) {
					var banner = app.element("ticketShopSectionBanner");
					banner.src = tickets.featuredList[0].banner;
					banner.setAttribute("onClick", "tickets.fetchSingleTicket('" + tickets.featuredList[0].id + "')");
					banner.style.display = "block";
				}
				else app.element("ticketShopSectionBanner").style.display = "none";
				
				app.element("ticketShotSectionTitle").innerText = section + " Tickets";
				app.element("ticketPosters").innerHTML = output;
			});
		}
		else app.alert("Error Fetching Tickets", data.message);
	},

	fetch: function (index, isFeatured) {
		var list = (views.current.id == "ticketShop") ? tickets.list : tickets.sublist;

		if (isFeatured) {
			var q = tickets.featuredList[index].id;
			for (var i=0, count = list.length; i < count; i++) {
				if (q == list[i].id) {
					tickets.fetch(i, false);
					break;
				}
			}
			return;
		}
		
		var type = list[index].category;
		tickets.index = index;
		tickets.ticketID = list[index].id;
		
		if (type === "CINEMA") {
			views.goto("ticketInfoCinema", function () {
				app.element("ticketInfoArtwork").src = list[index].artwork;
				app.element("ticketInfoTitle").innerText = list[index].name;
				app.element("ticketInfoType").innerText = type;
				app.element("ticketInfoAge").innerText = list[index].ageRestriction;
				app.element("ticketInfoGenre").innerText = list[index].genre.split(",")[0];
				app.element("ticketInfoRuntime").innerText = "Runtime: " + list[index].time;
				app.element("ticketInfoSummary").innerText = list[index].summary;
				
				app.element("ticketInfoSummary").style.display = app.element("ticketBuyButton").style.display = "block";
				app.element("ticketPurchaseArea").style.display =  app.element("selectTicketDate").style.display = 	app.element("selectTicketTime").style.display = app.element("ticketStepperContainer").style.display = "none";
			});
			
			if (window["ticketsFetch" + tickets.ticketID]) {
				tickets.onFetchCinema(window["ticketsFetch" + tickets.ticketID]);
				return;
			}
			
			app.showBusy();
			app.send(app.API + "tickets/", {case: "fetch", oauth: localStorage.oauth, id: tickets.ticketID}, tickets.onFetchCinema);
		}
		else if (type === "EVENT") {
			views.goto("ticketInfoEvent", function () {
				app.element("ticketInfoArtwork").src = list[index].artwork;
				app.element("ticketInfoTitle").innerText = list[index].name;
				app.element("ticketInfoVenue").innerText = list[index].venue;
				app.element("ticketInfoGenre").innerText = list[index].genre;
				app.element("ticketInfoTime").innerText = list[index].time;
				app.element("ticketInfoSummary").innerText = list[index].summary;
				
				app.element("ticketInfoSummary").style.display = app.element("ticketBuyButton").style.display = "block";
				app.element("ticketPurchaseArea").style.display = "none";
			});
			
			if (window["ticketsFetch" + tickets.ticketID]) {
				tickets.onFetchEvent(window["ticketsFetch" + tickets.ticketID]);
				return;
			}
			
			app.showBusy();
			app.send(app.API + "tickets/", {case: "fetch", oauth: localStorage.oauth, id: tickets.ticketID}, tickets.onFetchEvent);
		}
	},
	
	onFetchCinema: function (data) {
		app.hideBusy();
		
		if (data.status === 200) {
			window["ticketsFetch" + tickets.ticketID] = data;
			tickets.available = data.list;
			
			var cinemas = [];
			var output = '<option value="">Select a Cinema</option>';
			
			for (var i=0, count = data.list.length; i < count; i++) {
				var id = data.list[i].uid;
				if (cinemas.indexOf(id) == -1) {
					output += '<option value="' + id + '">' + data.list[i].name + '</option>';
					cinemas.push(id);
				}
			}
			
			app.element("selectTicketCinema").innerHTML = output;
		}
		else app.alert("Error Fetching Ticket", data.message);
	},
	
	onFetchEvent: function (data) {
		app.hideBusy();
		
		if (data.status === 200) {
			window["ticketsFetch" + tickets.ticketID] = data;
			tickets.available = data.list;
			
			var output = '<option value="">Class</option>';
			
			for (var i=0, count = data.list.length; i < count; i++) {
				output += '<option value="' + i + '">' + data.list[i].class + '</option>';
			}
			
			app.element("selectTicketClass").innerHTML = output;
		}
		else app.alert("Error Fetching Ticket", data.message);
	},

	fetchSingleTicket: function (id, showTrailer) {
		tickets.beneficiary = localStorage.uid;
		tickets.showTrailer = showTrailer;
		
		if (window["ticketsFetch" + id]) return tickets.onFetchSingleTicket(window["ticketsFetch" + id]);

		app.showBusy();
		app.send(app.API + "tickets/", {case: "fetch", oauth: localStorage.oauth, id: id}, tickets.onFetchSingleTicket);
	},

	onFetchSingleTicket: function (data) {
		app.hideBusy();

		if (data.status != 200) return app.alert("Error Fetching Ticket", data.message);
		else window["ticketsFetch" + data.id] = data;

		tickets.ticketID = data.id;
		var type = data.category;

		tracker.track(type, {name: data.name});

		if (type === "CINEMA") {
			views.goto("ticketInfoCinema", function () {
				app.element("ticketInfoArtwork").src = data.artwork;
				app.element("ticketInfoTitle").innerText = data.name;
				app.element("ticketInfoType").innerText = "CINEMA";
				app.element("ticketInfoAge").innerText = data.ageRestriction;
				app.element("ticketInfoGenre").innerText = data.genre.split(",")[0];
				app.element("ticketInfoRuntime").innerText = "Runtime: " + data.time;
				app.element("ticketInfoSummary").innerText = data.summary;

				app.element("ticketInfoSummary").style.display = app.element("ticketBuyButton").style.display = "block";
				app.element("ticketPurchaseArea").style.display =  app.element("selectTicketDate").style.display = 	app.element("selectTicketTime").style.display = app.element("ticketStepperContainer").style.display = "none";
				app.element("ticketWatchTrailer").style.display = data.trailer ? "block" : "none";

				tickets.available = data.list;
				tickets.trailerID = data.trailer;

				var cinemas = [];
				var output = '<option value="">Select a Cinema</option>';

				for (var i=0, count = data.list.length; i < count; i++) {
					var id = data.list[i].uid;
					if (cinemas.indexOf(id) == -1) {
						output += '<option value="' + id + '">' + data.list[i].name + '</option>';
						cinemas.push(id);
					}
				}

				app.element("selectTicketCinema").innerHTML = output;

				if (tickets.showTrailer && tickets.trailerID) return tickets.watchTrailer();
			});
		}
		else if (type === "EVENT") {
			views.goto("ticketInfoEvent", function () {
				tickets.isPseudoEvent = data.isPseudoEvent;
				
				app.element("ticketInfoArtwork").src = data.artwork;
				app.element("ticketInfoTitle").innerText = data.name;
				app.element("ticketInfoVenue").innerText = data.venue;
				app.element("ticketInfoGenre").innerText = data.genre;
				app.element("ticketInfoTime").innerText = data.time;
				app.element("ticketInfoSummary").innerText = data.summary;

				app.element("ticketInfoSummary").style.display = app.element("ticketBuyButton").style.display = "block";
				app.element("ticketPurchaseArea").style.display = "none";

				tickets.available = data.list;

				var output = '<option value="">Class</option>';

				for (var i=0, count = data.list.length; i < count; i++) {
					output += '<option value="' + i + '">' + data.list[i].class + '</option>';
				}

				app.element("selectTicketClass").innerHTML = output;
			});
		}
	},
	
	showOptions: function (type) {
		app.element("ticketInfoSummary").style.display = app.element("ticketBuyButton").style.display = "none";
		app.element("ticketPurchaseArea").style.display = "block";
		
		if (type === "CINEMA") {
			app.element("ticketPayButton").style.display = app.element("ticketWatchTrailer").style.display = "none";
			tickets.adultsTotal = tickets.studentsTotal = tickets.childrenTotal = 0;
		}
		else if (type === "EVENT") {
			app.query("currency", localStorage.currency);
			app.element("ticketTotalPrice").innerHTML = app.numberFormat("0.00");
			
			app.element("selectTicketClass").value = "";
			app.element("selectTicketCount").value = "0";
		}
	},
	
	update: function (type) {
		var cinema = app.valueOf("selectTicketCinema");
		var date = app.valueOf("selectTicketDate");
		var timeID = app.valueOf("selectTicketTime");
		
		if (type == "CINEMA") {
			if (cinema == "") {
				app.element("selectTicketDate").style.display = "none";
				app.element("selectTicketTime").style.display = "none";
				return;
			}
			else tickets.uid = cinema;
			
			var dates = [];
			var output = '<option value="">Select Day</option>';
			
			for (var i=0, count = tickets.available.length; i < count; i++) {
				if (tickets.available[i].uid == tickets.uid) {
					var tDate = tickets.available[i].date;
					if (dates.indexOf(tDate) == -1) {
						output += '<option value="' + tDate + '">' + tDate + '</option>';
						dates.push(tDate);
					}
				}
			}
			
			app.element("selectTicketDate").innerHTML = output;
			app.element("selectTicketDate").style.display = "block";

			app.element("selectTicketTime").innerHTML = '<option value="">•••</option>';
			app.element("selectTicketTime").style.display = "block";
		}
		else if (type == "DATE") {
			if (date == "") {
				app.element("selectTicketTime").innerHTML = '<option value="">•••</option>';
				return;
			}
			else tickets.date = date;
			
			output = '<option value="">Select Time</option>';
			
			for (i=0, count = tickets.available.length; i < count; i++) {
				if (tickets.available[i].uid == tickets.uid && tickets.available[i].date == tickets.date) {
					output += '<option value="' + tickets.available[i].id + '">' + tickets.available[i].time + '</option>';
				}
			}
			
			app.element("selectTicketTime").innerHTML = output;
		}
		else if (type == "TIME") {
			if (timeID == "") {
				app.element("ticketStepperContainer").style.display = "none";
				app.element("ticketPayButton").style.display = "none";
				return;
			}
			else tickets.id = timeID;
						
			for (i=0, count = tickets.available.length; i<count; i++) {
				if (tickets.available[i].id == tickets.id) {
					tickets.index = i;
					break;
				}
			}
			
			tickets.ticket = tickets.available[tickets.index];
			
			app.element("ticketAdults").value = app.element("ticketAdultsCount").innerHTML = app.element("ticketStudents").value = app.element("ticketStudentsCount").innerHTML = app.element("ticketChildren").value = app.element("ticketChildrenCount").innerHTML = "0";
			
			app.element("ticketAdultsPrice").innerHTML = app.element("ticketStudentsPrice").innerHTML = app.element("ticketChildrenPrice").innerHTML = app.element("ticketTotalPrice").innerHTML = app.numberFormat(0);
			
			app.query("currency", localStorage.currency);
			app.element("ticketStepperContainer").style.display = "block";
			app.element("ticketPayButton").style.display = "block";
		}
	},
	
	updateEvent: function (target) {
		var tClass = app.valueOf("selectTicketClass");
		var tCount = app.valueOf("selectTicketCount");
		app.query("currency", localStorage.currency);
		
		if (tClass != "" && tCount != "0") {
			var tAmount = tickets.available[tClass].price;
			app.element("ticketTotalPrice").innerHTML = app.numberFormat(tAmount * tCount);
		}
		else app.element("ticketTotalPrice").innerHTML = app.numberFormat("0.00");
	},
	
	count: function (caller) {
		app.element(caller + "Count").innerHTML = app.valueOf(caller);
		
		tickets.adultsTotal = tickets.ticket.adult * Number(app.valueOf("ticketAdults"));
		tickets.studentsTotal = tickets.ticket.student * Number(app.valueOf("ticketStudents"));
		tickets.childrenTotal = tickets.ticket.children * Number(app.valueOf("ticketChildren"));
		
		tickets.total = tickets.adultsTotal + tickets.studentsTotal + tickets.childrenTotal;
		
		app.element("ticketAdultsPrice").innerHTML = app.numberFormat(tickets.adultsTotal);
		app.element("ticketStudentsPrice").innerHTML = app.numberFormat(tickets.studentsTotal);
		app.element("ticketChildrenPrice").innerHTML = app.numberFormat(tickets.childrenTotal);
		
		app.element("ticketTotalPrice").innerHTML = app.numberFormat(tickets.total);
	},
	
	confirm: function () {
		var cinema = app.valueOf("selectTicketCinema");
		var date = app.valueOf("selectTicketDate");
		var time = app.valueOf("selectTicketTime");
		var adultCount = Number(app.valueOf("ticketAdults"));
		var studentCount = Number(app.valueOf("ticketStudents"));
		var childrenCount = Number(app.valueOf("ticketChildren"));
		
		if (cinema == "") {
			app.alert("Please choose a Cinema", "What cinema would you like to see " + app.element("ticketInfoTitle").innerText + "?");
			return;
		}
		else if (date == "") {
			app.alert("Please choose a day", "What day would you like to see this movie?");
			return;
		}
		else if (time == "") {
			app.alert("Please choose a time", "You're required to select an available time from the list to continue.");
			return;
		}
		else if (adultCount + studentCount + childrenCount == 0) {
			app.alert("Please select ticket quantity", "How many digital tickets would you like to buy? Select from available categories.");
			return;
		}
		
		app.EnterPIN('BUY_CINEMA_TICKET');
	},
	
	confirmEvent: function (pin) {
		var tClass = app.valueOf("selectTicketClass");
		var tCount = app.valueOf("selectTicketCount");
		tickets.id = tickets.available[Number(tClass)].id;
		
		if (tClass == "") {
			app.alert("Please select ticket class", "You're required to select an available ticket class from the list to continue.");
			return;
		}
		else if (tCount == "0") {
			app.alert("Please select ticket quantity", "How many digital tickets would you like to buy?");
			return;
		}
		
		if (!pin) {
			app.EnterPIN('BUY_EVENT_TICKET');
			return;
		}
		else {
			app.showBusy();
			
			app.send(app.API + "tickets/", {case: "buyevent", oauth: localStorage.oauth, id: tickets.id, count: tCount, pin: pin, deviceID: localStorage.deviceID, beneficiary: tickets.beneficiary}, function (data) {
				app.hideBusy();
				
				if (data.status === 200) {
					localStorage.tickets = JSON.stringify(data.list);
					localStorage.balance = data.balance;
					localStorage.savings = data.savings;
					localStorage.balanceTime = app.currentTime();
					
					app.alert("Ticket Purchase Successful", data.message);
					
					views.deposeTo("account", function () {
						app.RenderAccount();
						views.clearHistory();
					});
				}
				else app.alert("Ticket Purchase Failed", data.message);
			});
		}
	},
	
	buy: function (pin) {
		var adultCount = app.valueOf("ticketAdults");
		var studentCount = app.valueOf("ticketStudents");
		var childrenCount = app.valueOf("ticketChildren");
				
		app.showBusy();
		
		app.send(app.API + "tickets/", {case: "buy", oauth: localStorage.oauth, id: tickets.id, adults: adultCount, students: studentCount, children: childrenCount, pin: pin, deviceID: localStorage.deviceID, beneficiary: tickets.beneficiary}, function (data) {
			app.hideBusy();
			
			if (data.status === 200) {
				localStorage.tickets = JSON.stringify(data.list);
				localStorage.balance = data.balance;
				localStorage.savings = data.savings;
				localStorage.balanceTime = app.currentTime();
				
				sound.play("complete.mp3", .90);
				ticketMessage = (localStorage.uid == tickets.beneficiary) ? "Your digital ticket has been downloaded to your device. You can find all your tickets in the side menu." : "The digital ticket has been sent to " + tickets.contact.name + ". Thanks for sharing!";
				app.alert("Ticket Purchase Successful", ticketMessage);
				
				views.deposeTo("account", function () {
					app.RenderAccount();
					views.clearHistory();
				});
			}
			else app.alert("Ticket Purchase Failed", data.message);
		});
	},
	
	ShowTickets: function () {
		var output = "";
		
		if (!localStorage.tickets) {
			tickets.myTicketsList = [];
			output = '';
		}
		else tickets.myTicketsList = JSON.parse(localStorage.tickets);

		var list = tickets.myTicketsList;
		
		for (var i=0, count=tickets.myTicketsList.length; i<count; i++) {
			var time = list[i].date.split("|");
			var date = time[1].split(" ");
			
			output += '<div class="ticketList ' + list[i].validity + '" onclick="tickets.showTicketCode('+i+')">' +
				'<div class="date">' +
					'<div class="month">' + date[0] + '</div>' +
					'<div class="date">' + date[1] + '</div>' +
					'<img src="' + list[i].thumbnail + '" class="artwork">' +
				'</div>' +
				'<div class="text">' +
					'<div class="title">' + list[i].title + '</div>' +
					'<div class="day">' + time[0] + " · <b>" + time[2] + '</b></div>' +
					'<div class="subtitle">' + list[i].owner + '</div>' +
				'</div>' +
				'<img src="images/icon_' + list[i].category.toLowerCase() + '.svg" class="icon" />' +
			'</div>';
		}
		
		views.goto("myTicketsList", function () {
			app.element("myTicketsListContent").innerHTML = output;
		});
	},
	
	showTicketCode: function (index) {
		var list = tickets.myTicketsList;
		var subtitle = (list[index].category == "EVENT") ? list[index].venue : list[index].owner;

		tickets.ticketID = list[index].id;
		
		views.goto("ticketBarcodeView", function () {
			app.element("ticketPosterBackground").src = list[index].artwork;
			app.element("ticketInfoTitle").innerText = list[index].title;
			app.element("ticketInfoSubtitle").innerText = subtitle;
			app.element("ticketInfoStatus").innerText = app.element("ticketInfoStatus").className = list[index].validity;
			
			setTimeout (function () {
				//new QRious({element: app.element("qrBox"), value: tickets.ticketID, size: 250, level: "M"});
				//var qrCode = kjua({render: "image", text: tickets.ticketID, ecLevel: "M", size: 250, fill: "#000"});
				//qrBox.src = qrCode.src;

				app.element("qrBox").innerHTML = new QRCode({content: tickets.ticketID, padding: 0, width: 150, height: 150}).svg();
			}, 450);
		});
	},
	
	Refresh: function () {
		app.showBusy();
		
		app.send(app.API + "tickets/", {case: "refresh", oauth: localStorage.oauth, deviceID: localStorage.deviceID}, function (data) {
			app.hideBusy();
			
			if (data.status === 200) {
				localStorage.tickets = JSON.stringify(data.list);
				tickets.ShowTickets();
			}
			else app.alert("Oopsies!", data.message);
		});
	},
	
	transfer: function (index) {
		if (index === 1) {
			contacts.enable();
			
			app.selectContact(function (contact) {
				app.showBusy();
				views.hideOverlay();
				
				app.send(app.API + "tickets/", {case: "transfer", oauth: localStorage.oauth, id: tickets.ticketID, deviceID: localStorage.deviceID, destination: contact.phone}, function (data) {
					app.hideBusy();
					
					if (data.status === 200) {
						localStorage.tickets = JSON.stringify(data.list);
						setTimeout(tickets.ShowTickets, 500);
						views.depose();
						
						app.alert("Digital Ticket Sent.",  "Your ticket has been sent off as a gift. Thanks for sharing!");
					}
					else app.alert("Oopsies!", data.message);
				});
			});
		}
	},

	watchTrailer: function () {
		app.send(app.API + "tickets/", {case: "trailer", oauth: localStorage.oauth, id: tickets.ticketID});

		YoutubeVideoPlayer.openVideo(tickets.trailerID, function () {
			app.toast("Trailers brought to you by Nairabox MOVIES.");
		});
	}
};