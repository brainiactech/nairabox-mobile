var food = {
	start: function (isError) {
		if (isError) return app.alert("Turn on Location", "Geolocation is required to access nairabox food.");
		else app.showBusy();

		return geolocation.getCurrentPosition(food.loadStores, food.showLocationSelector);
	},

	showLocationSelector: function () {
		app.showBusy();

		if (food.citiesList) food.onShowLocationSelector(food.citiesList);
		else app.send(app.API + "food/", {case: "locations", oauth: localStorage.oauth}, food.onShowLocationSelector);
	},

	onShowLocationSelector: function (data) {
		app.hideBusy();

		if (data.status === 200) {
			food.citiesList = data;

			var output = '<div class="listItem sectional">Select a Location</div>';

			for (var i=0; i<data.list.length; i++) {
				output += '<div class="listItem padded" onclick="food.changeCityTo(' + i + ')">' +
				'<div class="title">' + data.list[i].city + '</div>' +
				'</div>';
			}

			views.overlay("foodLocator", 100, function () {
				app.element("foodLocatorList").innerHTML = output;
			}, 1.75);
		}
		else app.alert("Error Fetching Locations", data.message);
	},

	changeCityTo: function (index) {
		views.hideOverlay();

		app.showBusy();
		app.send(app.API + "food/", {case: "browseCity", oauth: localStorage.oauth, city: food.citiesList.list[index].id}, food.onLoadStores);
	},

	loadStores: function (position) {
		app.showBusy();

		var data = {case: "browse", oauth: localStorage.oauth, latitude: position.coords.latitude, longitude: position.coords.longitude};
		app.send(app.API + "food/", data, food.onLoadStores);
	},

	onLoadStores: function (data) {
		app.hideBusy();

		if (data.status === 200) {
			food.stores = data.list;
			food.deliveryCost = data.deliveryCost;
			food.cities = data.cities;
			food.addresses = data.addresses;

			var output = "";

			for (var i=0; i<data.list.length; i++) {

				var status = (data.list[i].status == "STORE_OPEN") ? '' : '<span class="closed">CLOSED</span>';

				output += '<div class="foodBanner" onclick="food.showMenu(' + i + ')">' +
				'<img class="banner" src="' + data.list[i].image + '">' + status +
				'<img class="placeholder" src="images/food_banner_placeholder.svg">' +
				'<div class="textArea">' +
				'<div class="title">' + data.list[i].name + '</div>' +
				'<div class="subtitle">' + data.list[i].type + '</div>' +
				'<img class="timeClock" src="images/icon_clock.svg">' +
				'<div class="deliveryTitle">DELIVERY</div>' +
				'<div class="time">' + data.list[i].deliveryTime + '</div>' +
				'</div>' +
				'</div>';
			}

			views.goto("foodStores", function () {
				app.element("foodUserLocation").innerHTML = data.city + ' <span style="color:##FFAF69">›</span>';
				app.element("foodUserPoints").innerHTML = app.isPlural(data.points, "Point");
				app.element("foodStoresArea").innerHTML = output;
			});
		}
		else app.alert("Error fetching stores", data.message);
	},

	showMenu: function (index) {
		food.storeIndex = index;
		food.storeName = food.stores[index].name;
		food.storeID = food.stores[index].id;
		food.storeStatus = food.stores[index].status;

		var status = food.stores[index].hours;
		if (food.storeStatus != "STORE_OPEN") app.alert("Store Closed", "Sorry, we're currently closed, but feel free to browse our menu. Please check back from " + status["opening"] + " — " + status["closing"] + " daily.");

		if (!window["foodcart" + food.storeIndex]) window["foodcart" + food.storeIndex] = [];

		if (window["foodMenu" + food.storeID]) return food.onShowMenu(window["foodMenu" + food.storeID]);
		else {
			app.showBusy();
			app.send(app.API + "food/", {case: "menu", id: food.storeID, oauth: localStorage.oauth}, food.onShowMenu);
		}
	},

	onShowMenu: function (data) {
		app.hideBusy();

		if (data.status === 200) {
			window["foodMenu" + food.storeID] = data;
			food.menu = data.list;

			var output = "";

			for (var i=0; i<data.list.length; i++) {
				output += '<div class="foodMenuItem">' +
				'<img class="image" src="' + data.list[i].image + '" onclick="food.showFood(' + i + ')">' +
				'<img class="placeholder" src="images/food_menu_placeholder.svg">' +
				'<div class="title">' + data.list[i].name + '</div>' +
				'<div class="price">' + app.numberFormat(data.list[i].price, localStorage.currency) + '</div>' +
				'<img src="images/icon_add_bag.svg" class="add" onclick="food.addFoodToBasket(' + i + ')">' +
				'</div>';
			}

			views.goto("foodStoreMenu", function () {
				app.element("foodStoreTitle").innerHTML = food.storeName;
				app.element("foodMenuArea").innerHTML = output;

				food.updateBasketTotals();
			});
		}
		else app.alert("Error fetching menu", data.message);
	},

	showFood: function (index) {
		views.overlay("foodDescription", 70, function () {
			food.activeFoodIndex = index;

			app.element("foodDescriptionImage").src = "";
			app.element("foodDescriptionImage").src = food.menu[index].largeImage;
			app.element("foodDescriptionTitle").innerHTML = food.menu[index].name;
			app.element("foodDescriptionSummary").innerHTML = food.menu[index].summary;
		});
	},

	share: function () {
		app.showBusy();
		var i = food.activeFoodIndex;

		var options = {
			message: "Buy " + food.menu[i].name + " from " + food.storeName + " on Nairabox Food. Download the Nairabox app now at nairabox.com",
			subject: "Nairabox Food",
			files: [food.menu[i].image]
		};

		window.plugins.socialsharing.shareWithOptions(options, function () {
			app.hideBusy();
			app.toast(app.generateShareMessage());
		}, app.hideBusy);
	},

	addFoodToBasket: function (index) {
		if (food.storeStatus != "STORE_OPEN") return app.alert("Store Closed", "Sorry we're currently closed. Please check back later.");

		var basket = window["foodcart" + food.storeIndex];
		if (!basket) basket = [];
		console.log(basket, index);

		basket.push({
			index: index,
			id: food.menu[index].id,
			name: food.menu[index].name,
			image: food.menu[index].image,
			price: food.menu[index].price,
			points: food.menu[index].points
		});

		window["foodcart" + food.storeIndex] = basket;

		app.toast("Food added to bag. Select CHECKOUT when you're ready to buy.");
		return food.updateBasketTotals();
	},

	addToBasket: function () {
		views.hideOverlay();
		return food.addFoodToBasket(food.activeFoodIndex);
	},

	calculateBasket: function () {
		var basket = window["foodcart" + food.storeIndex];
		var total = 0, items = 0, points = 0;

		if (!basket) basket = [];

		for (var i=0; i<basket.length; i++) {
			total += basket[i].price;
			points += basket[i].points;
			items ++;
		}

		return {total: total, points: points, items: items};
	},

	updateBasketTotals: function () {
		var totals = food.calculateBasket();

		if (app.element("foodBarPrice")) {
			app.element("foodBarPrice").innerHTML = app.numberFormat(totals.total, localStorage.currency);
			app.element("foodBarCount").innerHTML = app.isPlural(totals.items, "ITEM");
		}
	},

	showBasket: function () {
		var basket = window["foodcart" + food.storeIndex];
		var output = "";

		for (var i=0; i<basket.length; i++) {
			output += '<div class="foodListItem">' +
			'<img class="image" src="' + basket[i].image + '">' +
			'<div class="textArea">' +
			'<div class="title">' + basket[i].name + '</div>' +
			'<div class="price">' + app.numberFormat(basket[i].price, localStorage.currency) + '</div>' +
			'<div class="points">You get +' + app.isPlural(basket[i].points, "Point") + '</div>' +
			'</div>' +
			'<img class="remove" src="images/button_close.svg" onclick="food.removeFromBasket(' + i + ')">' +
			'</div>';
		}

		var totals = food.calculateBasket();

		views.goto("foodBasket", function () {
			app.element("foodBasketDeliveryCost").innerHTML = app.numberFormat(food.deliveryCost, localStorage.currency);
			app.element("foodBasketTotal").innerHTML = app.numberFormat(totals.total + food.deliveryCost, localStorage.currency);
			app.element("foodBasketList").innerHTML = output;
		});
	},

	removeFromBasket: function (index) {
		var basket = window["foodcart" + food.storeIndex];
		basket.splice(index, 1);

		window["foodcart" + food.storeIndex] = basket;
		return food.showBasket();
	},

	showCheckoutOptions:function(){
		var output = '<div class="checkout-options-container"><span>SELECT PAYMENT METHOD</span><div class="checkout-options-list" onclick="food.checkout()"><p>Pay On Delivery</p><p class="checkout-options-list-description">CHOOSE THIS TO PAY WHEN YOUR FOOD IS DELIVERED</p></div></div>';

		views.overlay("checkoutOptions", 20, function () {
			app.element("checkoutOptionsList").innerHTML = output;
		});
	},

	// selectCheckoutOptions:function (option) {
	// 	if (option == 1) {
	// 		console.log("it was one");
	// 		food.checkout();
	// 	}
	//
	// 	if (option == 2) {
	// 		console.log("TWO TWO");
	// 		food.checkoutWithWallet()
	// 	}
	// },

	checkout: function (pin) {
		console.log("Pay on Delivery");
		var basket = window["foodcart" + food.storeIndex];
		var addressID = app.element("toAddress").getAttribute("data-addressid");

		if (!basket.length) return app.alert("Bag is Empty", "You have to add items to your bag before you can buy.");
		else if (addressID == "") return app.alert("Choose Delivery Address", "You have to tell us where to deliver your food. Tap on \"Choose Delivery Address\"");

		if (!pin) return app.EnterPIN("BUY_FOOD");
		else var bag = "";

		for (var i=0; i<basket.length; i++) {
			bag += basket[i].id;
			if (i < basket.length-1) bag += ",";
		}

		app.send(app.API + "food/", {case: "buy", bag: bag, address: addressID, store: food.storeID, oauth: localStorage.oauth, pin: pin}, function (data) {
			app.hideBusy();

			// debugger;

			if (data.status === 200) {
				views.goto("foodOrderComplete", function () {
					app.element("foodOrderCompleteCaption").innerHTML = data.message;
					app.element("foodOrderCompleteTime").innerHTML = data.time;

					localStorage.balance = data.balance;
					localStorage.balanceTime = app.currentTime();
					localStorage.savings = data.savings;
				});

				sound.play("complete.mp3");
				window["foodcart" + food.storeIndex] = [];
			}
			else app.alert("Order Failed", data.message);
		});

		app.showBusy();
	},

	// checkoutWithWallet:function(pin){
	// 	console.log("Pay with Wallet");
	// 	// debugger;
	// 	var basket = window["foodcart" + food.storeIndex];
	// 	var addressID = app.element("toAddress").getAttribute("data-addressid");
	//
	// 	if (!basket.length) return app.alert("Bag is Empty", "You have to add items to your bag before you can buy.");
	// 	else if (addressID == "") return app.alert("Choose Delivery Address", "You have to tell us where to deliver your food. Tap on \"Choose Delivery Address\"");
	//
	// 	if (!pin) return app.EnterPIN("BUY_FOOD");
	// 	else var bag = "";
	//
	// 	for (var i=0; i<basket.length; i++) {
	// 		bag += basket[i].id;
	// 		if (i < basket.length-1) bag += ",";
	// 	}
	//
	// 	app.send(app.withWalletAPI + "food/", {case: "buy", bag: bag, address: addressID, store: food.storeID, oauth: localStorage.oauth, pin: pin}, function (data) {
	// 		app.hideBusy();
	//
	// 		// debugger;
	//
	// 		if (data.status === 200) {
	// 			views.goto("foodOrderComplete", function () {
	// 				app.element("foodOrderCompleteCaption").innerHTML = data.message;
	// 				app.element("foodOrderCompleteTime").innerHTML = data.time;
	//
	// 				localStorage.balance = data.balance;
	// 				localStorage.balanceTime = app.currentTime();
	// 				localStorage.savings = data.savings;
	// 			});
	//
	// 			sound.play("complete.mp3");
	// 			window["foodcart" + food.storeIndex] = [];
	// 		}
	// 		else app.alert("Order Failed", data.message);
	// 	});
	//
	// 	app.showBusy();
	// },

	cancelCheckout: function () {
		views.back(false, food.updateBasketTotals, true);
	},

	showAddressBook: function () {
		var output = '<div class="foodListItem" onclick="food.addAddress()">' +
		'<div class="textArea noImage"><div class="title">Add a new Address</div></div></div>';

		for (var i=0; i<food.addresses.length; i++) {
			output += '<div class="foodListItem">' +
			'<div class="textArea noImage" onclick="food.selectAddress(' + i + ')">' +
			'<div class="title">' +
			'<div>' + food.addresses[i].street + '</div>' +
			'<div>' + food.addresses[i].city + ', ' + '</div>' +
			'<div>' + food.addresses[i].state + '</div>' +
			'</div>' +
			'</div>' +
			'<img class="remove" src="images/button_close.svg" onclick="food.removeAddress(' + i + ')">' +
			'</div>';
		}

		views.overlay("foodAddressBook", 75, function () {
			app.element("foodAddressBookList").innerHTML = output;
		});
	},

	selectAddress: function (index) {
		views.hideOverlay();
		views.hideDropDown("foodAddAddress");

		app.element("toAddress").innerHTML = food.addresses[index].street + ", " + food.addresses[index].city;
		app.element("toAddress").setAttribute("data-addressid", food.addresses[index].id);
	},

	addAddress: function (status) {
		if (!status) {
			var cities = '<option value="">Select a City</option>';

			for (var i=0; i<food.cities.length; i++) {
				cities += '<option value="' + food.cities[i] + '">' + food.cities[i] + '</option>';
			}

			return views.dropDown("foodAddAddress", 65, function () {
				app.element("addAddressStreet").value = "";
				app.element("addAddressCity").innerHTML = cities;

				setTimeout(function () {
					if (app.platform == "ANDROID") app.element("addAddressStreet").focus();
				}, 1000);
			});
		}

		var street = app.element("addAddressStreet").value;
		var city = app.element("addAddressCity").value;
		var state = app.element("addAddressState").value;

		if (street == "" || city == "") return app.alert("Enter Valid Address", "Please enter a valid street and city for this address.");

		app.showBusy();
		app.send(app.API + "food/", {case: "addAddress", street: street, city: city, state: state, oauth: localStorage.oauth}, food.onAddress);
	},

	removeAddress: function (index) {
		var id = app.element("toAddress").getAttribute("data-addressid");

		if (id == food.addresses[index].id) {
			app.element("toAddress").innerHTML = "Choose Delivery Address";
			app.element("toAddress").setAttribute("data-addressid", "");
		}

		app.showBusy();
		app.send(app.API + "food/", {case: "removeAddress", id: food.addresses[index].id, oauth: localStorage.oauth}, food.onAddress);
	},

	onAddress: function (data) {
		app.hideBusy();

		if (data.status === 200) {
			food.addresses = data.addresses;
			views.hideDropDown("foodAddAddress");

			return food.showAddressBook();
		}
		else app.alert("Error Adding Address", data.message);
	}
};
