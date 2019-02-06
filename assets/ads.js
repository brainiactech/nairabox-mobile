var ads = {
	RenderAd: function () {
		if (ads.content.status === 200) {
			ads.selected = ads.content.info;
			ads.bannerLoaded = false;

			var banner = app.element("base");
			banner.src = "images/default_card.jpg";

			if (!ads.isRendered) {
				banner.onload = ads.onBannerLoad;
				banner.onerror = ads.onBannerError;
				ads.isRendered = true;
			}

			banner.src = ads.selected.image;

			app.element("accountPromoButton").style.display = ads.content.promo ? "block" : "none";
		}
		else app.element("base").src = "images/default_card.jpg";
	},

	onBannerLoad: function () {
		var banner = app.element("base");
		if (banner.src != "images/default_card.jpg") ads.bannerLoaded = true;
		console.log("Banner Loaded: " + ads.bannerLoaded);
	},

	onBannerError: function () {
		var banner = app.element("base");
		banner.src = "images/default_card.jpg";
		console.log("Banner Load Failed");
	},

	go: function() {
		if (ads.content.status !== 200 || !ads.bannerLoaded) return false;

		if (ads.selected.type == "TICKET") return tickets.fetchSingleTicket(ads.selected.id, true);
		else if (ads.selected.type == "URL") return browser.open(ads.selected.url);
		else if (ads.selected.type == "MUSIC") {
			if (ads.selected.price == 0 || ads.musicPurchased) music.start(ads.selected.source, ads.selected.artiste, ads.selected.title, ads.selected.artwork);
			else {
				app.ShowPriceBar(ads.selected.title + " — " + ads.selected.artiste, ads.selected.currency, ads.selected.price);
				app.EnterPIN("BUY_MUSIC");
			}
		}
		else if (ads.selected.type == "CINEMA") return tickets.browse('CINEMA');
		else if (ads.selected.type == "TRAILER") return ads.watchTrailer();
		else if (ads.selected.type == "EVENTS") return tickets.browse('EVENT');
		else if (ads.selected.type == "BILLS") return bills.open();
		else if (ads.selected.type == "AIRTIME") return airtime.launch();
		else if (ads.selected.type == "FOOD") return food.start();
	},

	buyMusic: function (pin) {
		app.showBusy();
		
		app.send(app.API + "music/", {case: "buy", oauth: localStorage.oauth, pin: pin, id: ads.selected.id}, function (data) {
			app.hideBusy();
			
			if (data.status === 200) {
				localStorage.balance = data.balance;
				localStorage.savings = data.savings;
				localStorage.balanceTime = app.currentTime();

				if (views.current.id === "account") app.RenderAccountInfo();

				ads.musicPurchased = true;
				music.start(ads.selected.source, ads.selected.artiste, ads.selected.title, ads.selected.artwork);
			}
			else app.alert("Payment Failed", data.message);
		});
	},

	watchTrailer: function () {
		YoutubeVideoPlayer.openVideo(ads.selected.trailer, function () {
			app.toast("Trailers brought to you by Nairabox MOVIES.");
		});
	},

	launchPromo: function () {
		tickets.fetchSingleTicket(ads.content.promo);
	}
}