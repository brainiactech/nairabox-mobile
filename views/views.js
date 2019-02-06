var views = {
	
	navigationDelegate: [],
	speed: 0.5,
	delay: 0.1,
	callbackRenderDelay: 100,
	persistent: [],
	event: false,
	debug: false,
	flashViewCount: 0,
	PEEK: "viewTypePeek", OVERLAY: "viewTypeOverlay",
	started: false,
	
	start:function (view, callback) {
		views.resize(true);

		if (views.started) {
			views.dispose(views.current);
			views.add(window[view]);
			views.current = window[view];
			views.clearHistory();
			
			return TweenLite.set(views.current, {x:0, y:0});
		}
		else views.started = true;

		views.UIController = document.getElementById("UIViews");
		
		while (views.UIController.firstChild) {
			var item = views.UIController.firstChild;
			TweenLite.set(item, {x:views.width, y:0, z:0.1});
			window[item.id] = views.UIController.removeChild(item);
		}
		
		for (var i=0, t=views.persistent.length; i<t; i++) {
			var pv = views.persistent[i];
			views.UIController.appendChild(window[pv]);
			window["persistent"+pv] = true;
		}
		
		views.add(window[view]);
		views.current = window[view];
		views.navigationDelegate.push(views.current.id);
		TweenLite.set(views.current, {x:0, y:0});
		
		views.scrubber = document.createElement("div");
		views.scrubber.setAttribute("id", "scrubber");
		document.body.appendChild(views.scrubber);

		views.revealScrubber = document.createElement("div");
		views.revealScrubber.setAttribute("id", "revealScrubber");
		document.body.appendChild(views.revealScrubber);
		
		var hideModalWindow = function (e) {
			views.hideOverlay();
			e.stopPropagation();
			e.preventDefault();
		};
		
		views.modalShade = document.createElement("div");
		views.modalShade.setAttribute("class", "modalShadeOff");
		views.modalShade.addEventListener("click", hideModalWindow, false);
		views.modalShade.addEventListener("touchstart", hideModalWindow, false);
		
		if (app.platform == "ANDROID") {
			TweenLite.set(views.modalShade, {z:0.1});
			TweenLite.set(views.revealScrubber, {z:0.1});
		}
		
		views.add(views.modalShade);
		
		if (app.platform == "IOS" || !app.isLiveApp) {
			views.scrubber.addEventListener("touchstart", views.scrubStart, false);
			views.scrubber.addEventListener("touchmove", views.scrubbing, false);
			views.scrubber.addEventListener("touchend", views.scrubEnd, false);
		}
		
		views.revealScrubber.addEventListener("touchstart", views.revealStart, false);
		views.revealScrubber.addEventListener("touchmove", views.revealing, false);
		views.revealScrubber.addEventListener("touchend", views.revealEnd, false);
		
		views.margin = document.createElement("img");
		views.margin.setAttribute("id", "viewsMargin");
		views.margin.setAttribute("draggable", "false");
		views.margin.src = "views/views.margin.png";
		document.body.appendChild(views.margin);

		if (!app.isLiveApp) views.debug = true;
		
		if (callback) setTimeout(callback, views.callbackRenderDelay);
		app.changeStatusBarColorTo(app.element(view).getAttribute("data-statusbar"));
		views.updateRoles();
	},
	
	goto: function (view, callback) {
		if (views.isInTransition) {
			if (views.debug) console.log("views.goto(): views.isInTransition. Aborted.");
			return false;
		}

		if (!view) {
			if (views.debug) console.log("views.goto(): No target view specified. Aborted.");
			views.isInTransition = false;

			return false;
		}
		else views.resize();
		
		if (views.modalView) return views.hideOverlay(view, {callback: callback});
		else if (views.revealView) {
			views.isInTransition = true;
			views.previous = views.current;
			views.previous.style.zIndex = 1;
			views.next = views.current = window[view];

			TweenLite.set(views.next, {x:views.width, y:0, height: views.height, zIndex:3});
			TweenLite.set(views.revealScrubber, {left:0, width:22});
			views.navigationDelegate.push(views.current.id);
			views.add(views.next, true);
			
			var exit = TweenLite.to(views.next, views.speed, {x:0, ease:Cubic.easeInOut, delay:views.delay});
			TweenLite.to(views.revealView, views.speed/1.5, {x:-views.width/3, ease:Cubic.easeInOut, delay:views.delay});
			TweenLite.to(views.previous, views.speed, {x:-views.width/2, ease:Cubic.easeInOut, delay:views.delay});
			exit.eventCallback("onComplete", function () {
				views.dispose(views.previous);
				views.dispose(views.revealView);
				views.revealView = views.isInTransition = false;
			});

			if (callback) setTimeout(callback, views.callbackRenderDelay);
			app.changeStatusBarColorTo(app.element(view).getAttribute("data-statusbar"));
			views.updateRoles();
			
			return true;
		}
		
		views.previous = views.current;
		views.previous.style.zIndex = 0;
		views.next = views.current = window[view];
		
		if (views.previous == views.next) {
			if (callback) callback();
			return true;
		}
		else if (views.previous) {
			TweenLite.killTweensOf(views.previous);
			var exit = TweenLite.to(views.previous, views.speed/1.2, {x:-views.width * .3, ease:Cubic.easeInOut, delay:views.delay});
			exit.eventCallback("onComplete", function () {
				views.dispose(views.previous);
				views.modalShade.setAttribute("class", "modalShadeOff");
			});
		}

		views.isInTransition = true;
		
		TweenLite.killTweensOf(views.next);
		TweenLite.set(views.next, {x:views.width, y:0, height: views.height, zIndex:2});
		views.navigationDelegate.push(views.current.id);
		views.add(views.next);
		
		//if (app.platform == "IOS") {
		views.modalShade.setAttribute("class", "modalShadeOn");
		TweenLite.set(views.modalShade, {opacity:0, zIndex:1});
		TweenLite.to(views.modalShade, views.speed/1.8, {opacity:1, ease:Cubic.easeInOut, delay:views.delay});
		//}
		
		var onComplete = TweenLite.to(views.next, views.speed/1.2, {x:0, ease:Cubic.easeInOut, delay:views.delay});
		onComplete.eventCallback("onComplete", function () {
			views.isInTransition = false;
		});
		
		if (callback) setTimeout(callback, views.callbackRenderDelay);
		app.changeStatusBarColorTo(app.element(view).getAttribute("data-statusbar"));
		views.updateRoles();
	},
	
	reverseTo: function (view, callback, pushToNavigator) {
		if (views.isInTransition) {
			if (views.debug) console.log("views.reverseTo(): views.isInTransition. Aborted.");
			return false;
		}

		if (views.modalView) return views.hideOverlay(view, {back: true, callback: callback});
		else if (views.revealView) return views.hideReveal(view, {transition: "reverseTo", callback: callback});
		else views.resize();
		
		views.previous = views.current;
		views.previous.style.zIndex = 2;
		views.next = views.current = window[view];
		
		if (views.previous == views.next) {
			if (callback) return callback();
		}
		else if (views.previous) {
			views.isInTransition = true;
			
			TweenLite.killTweensOf(views.previous);
			var exit = TweenLite.to(views.previous, views.speed/1.6, {x:views.width, ease:Cubic.easeInOut, delay:views.delay});
			exit.eventCallback("onComplete", function () {
				views.isInTransition = false;
				views.dispose(views.previous);
				views.modalShade.setAttribute("class", "modalShadeOff");
			});
		}
		
		TweenLite.killTweensOf(views.next);
		TweenLite.set(views.next, {x:-views.width * .3, y:0, width: views.width, height: views.height, zIndex:0});
		views.add(views.next);
		
		//if (app.platform == "IOS") {
		views.modalShade.setAttribute("class", "modalShadeOn");
		TweenLite.set(views.modalShade, {opacity:1, zIndex:1});
		TweenLite.to(views.modalShade, views.speed/1.6, {opacity:0, ease:Cubic.easeInOut, delay:views.delay});
		//}
		
		TweenLite.to(views.next, views.speed/1.6, {x:0, ease:Cubic.easeInOut, delay:views.delay});
		
		if (pushToNavigator) views.navigationDelegate.push(view);
		if (callback) setTimeout(callback, views.callbackRenderDelay);
		app.changeStatusBarColorTo(views.current.getAttribute("data-statusbar"));
		
		views.updateRoles();
	},
	
	back: function (allowExit, callback, overrideBlock) {
		if (views.isInTransition) {
			console.log("views.back(): views.isInTransition. Aborted.");
			return views.isInTransition = false;
		}
		
		if (!callback) {
			callback = allowExit;
			allowExit = false;
		}
		
		if (views.modalView) {
			views.hideOverlay();
			return;
		}
		else if (app.element(views.current.id).getAttribute("data-lock") == "true" && !overrideBlock) {
			if (allowExit && app.element(views.current.id).getAttribute("data-blockexit") != "true") return app.exitApplication();
			else {
				var key = app.element(views.current.id).getAttribute("data-unlockkey");
				if (key) return eval(key);
				else {
					console.log("views.back(): View locked and exit blocked. Aborted.");
					return false;
				}
			}
		}
		
		if (views.navigationDelegate.length-1) {
			views.navigationDelegate.pop();
			views.reverseTo(views.navigationDelegate[views.navigationDelegate.length-1], callback);
		}
	},
	
	overlay: function (view, size, callback, speedFactor) {
		var viewHeight = Math.round((size * views.height) / 100) + 5;
		var viewTop = views.height - viewHeight;
		var speed = speedFactor ? views.speed * speedFactor : views.speed;
		
		if (!views.modalView) {
			views.locked = true;
			views.modalView = window[view];
			views.modalViewType = views.OVERLAY;
			
			TweenLite.set(views.modalView, {x:0, y:views.height, height:viewHeight, zIndex:200});
			TweenLite.set(views.modalShade, {x:0, height:views.height, opacity:0, zIndex:100});
			TweenLite.set(views.current, {zIndex:1});
			
			views.add(views.modalView, true);
			views.modalShade.className = "modalShadeOn";
			views.modalView.className = "view";
			
			TweenLite.to(views.modalShade, speed/1.3, {opacity:1, delay:views.delay});
			TweenLite.to(views.modalView, speed/1.3, {y:viewTop, delay:views.delay, ease:Cubic.easeInOut});
			
			if (app.platform == "IOS") {
				var opts = {scale:0.9, ease:Cubic.easeInOut};

				TweenLite.to(views.current, speed, opts);
				if (views.revealView) TweenLite.to(views.revealView, speed, opts);
			}
			
			if (callback) setTimeout(callback, views.callbackRenderDelay);
						
			views.restoreStatusBarColor = app.statusBarColor;
			app.changeStatusBarColorTo("white");
		}
		else {
			if (view == views.modalView.id) {
				if (callback) callback();
				return;
			}

			var exit = TweenLite.to(views.modalView, speed/2, {y:views.height, ease:Cubic.easeInOut});
			
			exit.eventCallback("onComplete", function () {
				TweenLite.set(views.modalView, {scale:1});
				views.dispose(views.modalView);
				views.modalView = false;
				
				views.modalView = window[view];
				TweenLite.set(views.modalView, {x:0, y:views.height, height:viewHeight, zIndex:100});
				views.add(views.modalView, true);
				
				TweenLite.to(views.modalView, speed/1.6, {x:0, y:viewTop, ease:Cubic.easeInOut});
				
				if (callback) setTimeout(callback, views.callbackRenderDelay);
				app.changeStatusBarColorTo(app.element(view).getAttribute("data-statusbar"));
			});
		}
	},
	
	hideOverlay: function (view, options) {
		views.resize();

		if (views.modalViewType === views.PEEK) return views.hidePeek(view, options);
		
		if (views.modalView) {
			views.locked = false;

			var opts = {ease: Cubic.easeInOut};
			if (app.platform == "IOS") {
				opts.scale = 1;

				TweenLite.to(views.current, views.speed/1.3, opts);
				if (views.revealView) TweenLite.to(views.revealView, views.speed/1.3, opts);
			}
			
			TweenLite.to(views.modalShade, views.speed/1.3, {opacity: 0});
			var exit = TweenLite.to(views.modalView, views.speed, {y:views.height, ease:Cubic.easeInOut});
			
			exit.eventCallback("onComplete", function () {
				views.modalShade.setAttribute("class", "modalShadeOff");
				views.dispose(views.modalView);
				views.modalView = false;

				if (view) {
					if (options.back) views.reverseTo(view, options.callback);
					else {
						if (options.transition == "reverseTo") views.reverseTo(view, options.callback);
						else if (options.transition == "impose") views.impose(view, options.callback);
						else if (options.transition == "depose") views.deposeTo(view, options.callback);
						else views.goto(view, options.callback);
					}
				}
			});
			
			app.changeStatusBarColorTo(views.restoreStatusBarColor);
		}
	},

	dropDown: function (view, size, callback, speedFactor) {
		views.resize();

		var viewHeight = Math.round((size * views.height) / 100) + 5;
		var speed = speedFactor ? views.speed * speedFactor : views.speed;

		var dropDownView = window[view];
		dropDownView.setAttribute("data-height", viewHeight);
		
		TweenLite.set(dropDownView, {x:0, y:-viewHeight, height:viewHeight, zIndex:200});
		views.add(dropDownView, true);
		
		TweenLite.to(dropDownView, speed/1.3, {y:0, delay:views.delay, ease:Cubic.easeInOut});

		if (callback) setTimeout(callback, views.callbackRenderDelay);

		views.restoreStatusBarColor = app.statusBarColor;
		app.changeStatusBarColorTo(dropDownView.getAttribute("data-statusbar"));
	},
	
	hideDropDown: function (view, callback) {
		views.resize();

		if (!app.element(view)) {
			console.log("views.hideDropDown():", view, "view isn't stacked. Aborted.");
			return false;
		}

		var dropDownView = window[view];
		var options = {y:-dropDownView.getAttribute("data-height"), delay:views.delay, ease:Cubic.easeInOut};
		var exit = TweenLite.to(dropDownView, views.speed, options);
		
		exit.eventCallback("onComplete", function () {
			views.dispose(dropDownView);
		});

		if (callback) setTimeout(callback, views.callbackRenderDelay);

		app.changeStatusBarColorTo(views.restoreStatusBarColor);
	},

	peek: function (view, size, callback, speedFactor) {
		var viewWidth = Math.round((size * views.width) / 100) + 5;
		var viewLeft = views.width - viewWidth;
		var speed = speedFactor ? views.speed * speedFactor : views.speed;
		
		if (!views.modalView) {
			views.modalViewType = views.PEEK;
			views.locked = true;
			views.modalView = window[view];
			
			TweenLite.set(views.modalView, {x:views.width, y:0, width:viewWidth, zIndex:200});
			TweenLite.set(views.modalShade, {x:0, height:views.height, opacity:0, zIndex:100});
			TweenLite.set(views.current, {zIndex:1});
			
			views.add(views.modalView, true);
			views.modalShade.className = "modalShadeOn";
			views.modalView.className = "view";
			
			TweenLite.to(views.modalShade, speed/1.3, {opacity:1, delay:views.delay});
			TweenLite.to(views.modalView, speed/1.3, {x:viewLeft, delay:views.delay, ease:Cubic.easeInOut});
			
			if (app.platform == "IOS") {
				TweenLite.to(views.current, speed, {scale:0.9, ease:Cubic.easeInOut});
				if (views.revealView) TweenLite.to(views.revealView, speed, {scale:0.9, ease:Cubic.easeInOut});
			}
			else {
				TweenLite.to(views.current, speed, {x:-40, ease:Cubic.easeInOut});
				if (views.revealView) TweenLite.to(views.revealView, speed, {x:-20, ease:Cubic.easeInOut});
			}
			
			if (callback) setTimeout(callback, views.callbackRenderDelay);
						
			views.restoreStatusBarColor = app.statusBarColor;
			app.changeStatusBarColorTo("white");
		}
		else {
			if (view == views.modalView.id) {
				if (callback) callback();
				return;
			}
			
			var exitOptions = (views.modalViewType == views.PEEK) ? {x:views.width} : {y:views.height};
			exitOptions.ease = Cubic.easeInOut;
			var exit = TweenLite.to(views.modalView, speed/2, exitOptions);
			
			exit.eventCallback("onComplete", function () {
				TweenLite.set(views.modalView, {scale:1});
				views.dispose(views.modalView);
				views.modalView = false;
				
				views.modalView = window[view];
				TweenLite.set(views.modalView, {x:views.width, y:0, width:viewWidth, zIndex:200});
				views.add(views.modalView, true);
				
				TweenLite.to(views.modalView, speed/1.6, {x:viewLeft, ease:Cubic.easeInOut});
				
				if (callback) setTimeout(callback, views.callbackRenderDelay);
				app.changeStatusBarColorTo(app.element(view).getAttribute("data-statusbar"));
			});
		}
	},
	
	hidePeek: function (view, options) {
		views.resize();
		
		if (views.modalView) {
			views.locked = false;

			var opts = {ease: Cubic.easeInOut};
			if (app.platform == "IOS") {
				opts.scale = 1;
				if (views.revealView) TweenLite.to(views.revealView, views.speed/1.3, opts);
			}
			else {
				opts.x = 0;
				if (views.revealView) TweenLite.to(views.revealView, views.speed/1.3, opts);
			}
			
			TweenLite.to(views.current, views.speed/1.3, opts);
			TweenLite.to(views.modalShade, views.speed/1.3, {opacity: 0});
			var exit = TweenLite.to(views.modalView, views.speed, {x:views.width, ease:Cubic.easeInOut});
			
			exit.eventCallback("onComplete", function () {
				views.modalShade.setAttribute("class", "modalShadeOff");
				views.dispose(views.modalView);
				views.modalView = false;

				if (view) {
					if (options.back) views.reverseTo(view, options.callback);
					else {
						if (options.transition == "impose") views.impose(view, options.callback);
						else if (options.transition == "depose") views.deposeTo(view, options.callback);
						else views.goto(view, options.callback);
					}
				}
			});
			
			app.changeStatusBarColorTo(views.restoreStatusBarColor);
		}
	},
	
	reveal: function (view) {
		views.resize();
		
		if (!views.revealView) {
			views.revealView = window[view];
			views.revealMaxPosition = views.width * 0.8;
			
			TweenLite.set(views.current, {zIndex:2});
			TweenLite.set(views.revealView, {x:-views.width/2, y:0, zIndex:0});
			TweenLite.set(views.revealScrubber, {left:views.revealMaxPosition, width:views.width * .2});
			views.add(views.revealView);
			
			TweenLite.to(views.revealView, views.speed / 1.8, {x:0, ease:Cubic.easeInOut});
			var complete = TweenLite.to(views.current, views.speed * 1.2, {x:views.revealMaxPosition, ease:Elastic.easeOut.config(0.8, 1)});
			complete.eventCallback("onComplete", function () {
				//views.revealView.style.pointerEvents = "auto";
				views.updateRoles();
			});
			
			app.changeStatusBarColorTo(views.revealView.getAttribute("data-statusbar"));
		}
		else views.hideReveal();
	},
	
	hideReveal: function (view, options, silent) {
		if (!views.revealView) return false;
		
		TweenLite.killTweensOf(views.revealView);
		TweenLite.killTweensOf(views.current);

		if (silent) {
			var modeSpeed = views.speed / 1.8;
			var modeOptions = {x:0, ease:Cubic.easeInOut};
		}
		else {
			modeSpeed = views.speed * 1.5;
			modeOptions = {x:0, ease:Elastic.easeOut.config(0.8, 1)};
		}

		var exit = TweenLite.to(views.revealView, views.speed / 1.8, {x:-views.width/3, ease:Quad.easeOut});
		TweenLite.to(views.current, modeSpeed, modeOptions);
		TweenLite.set(views.revealScrubber, {left:0, width:22});

		exit.eventCallback("onComplete", function () {
			views.dispose(views.revealView);
			views.revealView = false;

			if (view) {
				if (options.back) views.reverseTo(view, options.callback);
				else {
					if (options.transition == "reverseTo") views.reverseTo(view, options.callback);
					else if (options.transition == "impose") views.impose(view, options.callback);
					else if (options.transition == "depose") views.deposeTo(view, options.callback);
					else if (options.transition == "overlay") views.overlay(view, options.size, options.callback);
					else views.goto(view, options.callback);
				}
			}
			else views.updateRoles();
		});

		app.changeStatusBarColorTo(views.current.getAttribute("data-statusbar"));
	},
	
	impose: function (view, callback) {
		views.resize();
		
		if (views.modalView) {
			views.hideOverlay(view, {transition: "impose", callback: callback});
			return ;
		}
		else if (views.revealView) {
			views.hideReveal(view, {transition: "impose", callback: callback}, true);
			return ;
		}
		
		views.previous = views.current;
		views.previous.style.zIndex = 0;
		views.next = views.current = window[view];
		
		if (views.previous == views.next) {
			if (callback) callback();
			return ;
		}
		
		TweenLite.set(views.next, {x:0, y:0, scale:1.25, opacity:0, height: views.height, zIndex:1});
		views.navigationDelegate.push(views.next.id);
		views.add(views.next);
		
		TweenLite.killTweensOf(views.next);
		TweenLite.to(views.next, views.speed/1.8, {opacity:1, scale:1, ease:Cubic.easeInOut, delay:views.delay});
		
		TweenLite.killTweensOf(views.previous);
		var exit = TweenLite.to(views.previous, views.speed/1.8, {scale:0.75, opacity: 0.1, ease:Cubic.easeInOut, delay:views.delay});
		exit.eventCallback("onComplete", function () {
			TweenLite.set(views.previous, {x:views.width, y:0, opacity:1, scale:1});
			views.dispose(views.previous);
		});
		
		if (callback) setTimeout(callback, views.callbackRenderDelay);
		app.changeStatusBarColorTo(app.element(view).getAttribute("data-statusbar"));
		views.updateRoles();
	},
	
	depose: function (callback) {
		if (views.navigationDelegate.length-1) {
			views.navigationDelegate.pop();
			views.deposeTo(views.navigationDelegate[views.navigationDelegate.length-1]);
		}
		
		if (callback) setTimeout(callback, views.callbackRenderDelay);
	},
	
	deposeTo: function (view, callback, pushToNavigator) {
		views.resize();
		
		views.previous = views.current;
		views.previous.style.zIndex = 0;
		views.next = views.current = window[view];
		
		if (views.previous == views.next) return false;
		
		TweenLite.killTweensOf(views.next);
		TweenLite.killTweensOf(views.previous);
		
		TweenLite.set(views.next, {x:0, y:0, scale:0.75, opacity:0, height: views.height, zIndex:1});
		views.add(views.next);
		if (pushToNavigator) views.navigationDelegate.push(views.next.id);
		
		TweenLite.to(views.next, views.speed/1.8, {opacity:1, scale:1, ease:Cubic.easeInOut, delay:views.delay});
		
		var exit = TweenLite.to(views.previous, views.speed/1.8, {scale:1.25, opacity: 0, ease:Cubic.easeInOut, delay:views.delay});
		exit.eventCallback("onComplete", function () {
			TweenLite.set(views.previous, {x:views.width, y:0, opacity:1, scale:1});
			views.dispose(views.previous);
		});
		
		if (callback) setTimeout(callback, views.callbackRenderDelay);
		app.changeStatusBarColorTo(app.element(view).getAttribute("data-statusbar"));
		views.updateRoles();
	},

	flash: function (view, callback) {
		if (!window["flashViewCount" + view] || window["flashViewCount" + view] == 0) window["flashViewCount" + view] = 1;
		else window["flashViewCount" + view]++;

		views.flashViewCount++;
		
		var flashView = window[view];
		TweenLite.set(flashView, {x:0, y:0, zIndex:500});
		views.add(flashView, true);

		app.changeStatusBarColorTo(flashView.getAttribute("data-statusbar"));
		if (callback) setTimeout(callback, views.callbackRenderDelay/10);
		views.updateRoles();

		if (views.debug) console.log("views.flashViewCount:", views.flashViewCount);
	},

	hideFlash: function (view) {
		views.flashViewCount -= window["flashViewCount" + view];
		
		try {
			views.dispose(window[view]);
		}
		catch (e) {
			console.log(e);
		}

		if (!views.flashViewCount || views.flashViewCount < 0) views.flashViewCount = 0;
		
		app.changeStatusBarColorTo(views.current.getAttribute("data-statusbar"));
		
		views.updateRoles();
		if (views.debug) console.log("views.flashViewCount:", views.flashViewCount);
	},
	
	resize: function (firstCall) {
		if (firstCall) {
			views.width = window.innerWidth;
			views.height = window.innerHeight;
		}
	},
	
	clearHistory: function () {
		views.navigationDelegate = [views.current.id];
		if (views.debug) console.log("views.clearHistory(): navigationDelegate rebased to", views.current.id);
	},
	
	prepare: function (view) {
		views.add(window[view]);
	},
	
	add: function (view, behind) {
		if (!views.isPersistentView(view.id)) {
			if (behind) views.UIController.insertBefore(view, views.UIController.lastChild);
			else views.UIController.appendChild(view);
			if (views.debug) console.log("views.add(): Added", view.id, "to stack");
		}
	},
	
	dispose: function (view) {
		if (!views.isPersistentView(view.id)) {
			views.UIController.removeChild(view);
			if (views.debug) console.log("views.dispose(): Removed", view.id, "from stack");
		}
	},
	
	updateViewElement: function (view, update) {
		var view = window[view];
		view.style.display = "none";
		views.add(view);
		
		document.getElementById(update.id).style.display = update.value;
		views.dispose(view);
		view.style.display = "inherit";
	},
	
	isPersistentView: function (view) {
		if (window["persistent"+view]) return true;
		else return false;
	},
	
	update: function (view, callback) {
		var view = window[view];
		view.style.display = "none";
		views.add(view);
		
		setTimeout(callback, views.callbackRenderDelay/5);
		setTimeout(function () {
			views.dispose(view);
			view.style.display = "inherit";
		}, views.callbackRenderDelay);
	},
	
	isPersistentView: function (view) {
		if (window["persistent"+view]) return true;
		else return false;
	},
	
	updateRoles: function () {
		if (views.current.getAttribute("data-type") == "controller") {
			if (!window[views.current.id + "__reveal__"]) {
				window[views.current.id + "__reveal__"] = true;
				
				views.current.addEventListener("touchstart", views.swipeStart, false);
				views.current.addEventListener("touchmove", views.swiping, false);
				views.current.addEventListener("touchend", views.swipeEnd, false);
			}
			
			views.revealScrubber.style.display = "block";
			views.scrubber.style.display = "none";
		}
		else {
			views.revealScrubber.style.display = "none";
			if (views.current.getAttribute("data-lock") == "true") views.scrubber.style.display = "none";
			else views.scrubber.style.display = "block";
		}
	},
	
	scrubStart: function (event) {
		event.preventDefault();
		
		if (views.current.getAttribute("data-lock") == "true" || views.navigationDelegate.length == 1 || views.locked) views.allowScrub = false;
		else {
			views.allowScrub = true;
			views.lastScrubPosition = 0;
			
			var view = views.navigationDelegate[views.navigationDelegate.length-2];
			views.next = window[view];
			
			views.add(views.next);
			
			TweenLite.killTweensOf(views.next);
			TweenLite.killTweensOf(views.modalShade);
			
			views.modalShade.setAttribute("class", "modalShadeOn");
			
			TweenLite.set(views.modalShade, {opacity:1, zIndex:1});
			TweenLite.set(views.next, {x:-views.width * .3, y:0, height: views.height, zIndex:0});
			TweenLite.set(views.current, {zIndex:2});
			TweenLite.set(views.margin, {x:-10, width:10, display:"block"});
		}
	},
	
	scrubbing: function (event) {
		event.preventDefault();
		
		if (views.allowScrub) {
			views.lastScrubPosition = views.scrubPosition;

			var currentX = views.scrubPosition = event.touches[0].pageX-10;
			var alpha = (100-(currentX * 100 / views.width))/100;
			var marginWidth = (currentX * 100)/views.width;
			
			views.scrubber.style.left = currentX;

			TweenLite.set(views.margin, {x:currentX-marginWidth, opacity:alpha, width:10 + marginWidth});
			TweenLite.set(views.modalShade, {opacity:alpha});
			TweenLite.set(views.current, {x:currentX});
			TweenLite.set(views.next, {x:(currentX * .3)-(views.width * .3)});
		}
	},
	
	scrubEnd: function (event) {
		if (views.allowScrub) {
			views.allowScrub = false;
			
			TweenLite.killTweensOf(views.current);
			TweenLite.killTweensOf(views.next);
			
			var currentX = views.current._gsTransform.x;
			if (views.scrubPosition > views.lastScrubPosition || currentX > views.width * 0.5) {
				views.previous = views.current;
				views.current = views.next;
				
				TweenLite.to(views.margin, views.speed/4, {x:views.width+10, opacity:0.1});
				TweenLite.to(views.modalShade, views.speed/4, {opacity:0});
				TweenLite.to(views.next, views.speed/4, {x:0});
				
				var exit = TweenLite.to(views.previous, views.speed/4, {x:views.width});
				exit.eventCallback("onComplete", function () {
					views.dispose(views.previous);
					views.scrubber.style.left = 0;
					views.modalShade.setAttribute("class", "modalShadeOff");
					
					TweenLite.set(views.margin, {x:-10, width:10, display:"none", opacity:1});
					views.updateRoles();
				});
				
				views.navigationDelegate.pop();
				app.changeStatusBarColorTo(views.current.getAttribute("data-statusbar"));
			}
			else {
				TweenLite.to(views.margin, views.speed/3, {x:-10, width:10});
				TweenLite.to(views.current, views.speed/3, {x:0});
				
				var exit = TweenLite.to(views.next, views.speed/3, {x:-views.width * .3});
				exit.eventCallback("onComplete", function () {
					views.dispose(views.next);
					views.scrubber.style.left = 0;
					views.modalShade.setAttribute("class", "modalShadeOff");
					
					TweenLite.set(views.margin, {x:-10, display:"none", opacity:1});
				});
			}
		}
	},
	
	revealStart: function (event) {
		event.preventDefault();
		
		views.revealView = window[views.current.getAttribute("data-target")];
		views.isRevealing = false;
		views.allowReveal = true;
		
		var currentX = event.touches[0].pageX;
		views.revealMaxPosition = views.width * 0.8;
		views.startRevealPosition = views.revealView._gsTransform.x;
		
		if (currentX > views.revealMaxPosition) currentX = views.revealMaxPosition;
		
		views.add(views.revealView);
		
		TweenLite.killTweensOf(views.revealView);
		TweenLite.set(views.revealView, {x:(currentX-views.revealMaxPosition) * 100/views.revealMaxPosition, y:0, height: views.height, zIndex:0});
		TweenLite.set(views.current, {zIndex:1});
	},
	
	revealing: function (event) {
		event.preventDefault();
		
		if (views.allowReveal) {
			views.lastScrubPosition = views.scrubPosition;
			var currentX = views.scrubPosition = event.touches[0].pageX-10;
			if (currentX > views.revealMaxPosition) currentX = views.revealMaxPosition;
			
			views.revealScrubber.style.left = currentX;			
			
			TweenLite.set(views.current, {x:currentX});
			TweenLite.set(views.revealView, {x:(currentX-views.revealMaxPosition) * 100/views.revealMaxPosition});
		}
	},
	
	revealEnd: function (event) {
		if (views.allowReveal) {
			views.allowReveal = false;
			var currentX = views.revealView._gsTransform.x;
			if (currentX == views.startRevealPosition) {
				views.hideReveal();
				return;
			}
			
			TweenLite.killTweensOf(views.revealView);
			TweenLite.killTweensOf(views.current);
			TweenLite.killTweensOf(views.revealScrubber);
			
			if (views.scrubPosition > views.lastScrubPosition) {
				TweenLite.set(views.revealScrubber, {left:views.revealMaxPosition, width:views.width * .2});
				
				TweenLite.to(views.revealView, views.speed/4, {x:0, ease:Quad.easeOut});
				TweenLite.to(views.current, views.speed/4, {x:views.revealMaxPosition});
				
				app.changeStatusBarColorTo(views.revealView.getAttribute("data-statusbar"));
			}
			else views.hideReveal();
		}
	},
	
	swipeStart: function (event) {
		views.isRevealing = views.allowReveal = false;
		
		var currentX = event.touches[0].pageX;
		views.revealMaxPosition = views.width * 0.8;
		views.revealMinPosition = 0;
		views.swipeOrigin = currentX;
		views.swipeStartX = views.current._gsTransform.x;
		
		if (currentX > views.revealMaxPosition) currentX = views.revealMaxPosition;
	},
	
	swiping: function (event) {
		event.preventDefault();

		views.lastScrubPosition = views.scrubPosition;
		views.scrubPosition = views.current._gsTransform.x;

		var currentX = event.touches[0].pageX-views.swipeOrigin;

		if (!views.allowReveal && currentX > 3 || !views.allowReveal && currentX < 3) {
			views.allowReveal = true;
			views.revealView = window[views.current.getAttribute("data-target")];
			views.add(views.revealView);
			views.startRevealPosition = views.revealView._gsTransform.x;

			TweenLite.killTweensOf(views.revealView);
			TweenLite.set(views.revealView, {x:(currentX-views.revealMaxPosition) * 100/views.revealMaxPosition, y:0, height: views.height, zIndex:0});
			TweenLite.set(views.current, {zIndex:1});
		}
		else {
			var targetX = 0;
			if (currentX > views.revealMaxPosition) targetX = views.revealMaxPosition;
			else if (currentX < views.revealMinPosition) targetX = currentX = views.revealMinPosition;
			else targetX = currentX;
			
			TweenLite.set(views.current, {x:currentX});
			TweenLite.set(views.revealView, {x:(targetX-views.revealMaxPosition) * 100/views.revealMaxPosition});
		}
	},
	
	swipeEnd: function (event) {
		if (views.allowReveal) {
			views.allowReveal = false;
			var currentX = views.revealView._gsTransform.x;
			
			if (currentX == views.startRevealPosition) {
				views.hideReveal();
				return;
			}
			
			TweenLite.killTweensOf(views.revealView);
			TweenLite.killTweensOf(views.current);
			
			if (views.current._gsTransform.x > views.lastScrubPosition) {
				TweenLite.set(views.revealScrubber, {left:views.revealMaxPosition, width:views.width * .2});

				TweenLite.to(views.revealView, views.speed / 1.8, {x:0, ease:Cubic.easeOut});
				TweenLite.to(views.current, views.speed * 1.2, {x:views.revealMaxPosition, ease:Elastic.easeOut.config(0.8, 1)});
				
				app.changeStatusBarColorTo(views.revealView.getAttribute("data-statusbar"));
			}
			else views.hideReveal();
		}
	}
};