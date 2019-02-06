var music = {
	start: function (source, artiste, title, artwork) {
		music.artiste = artiste;
		music.title = title;
		music.artwork = artwork;

		views.goto("musicPlayer", function () {
			if (app.platform === "IOS") app.element("musicContainer").style.top = "2.35em";

			app.element("musicArtwork").src = "images/busy_image.svg";
			app.element("musicTitle").innerHTML = title;
			app.element("musicArtiste").innerHTML = artiste;
			app.element("musicControl").src = "images/button_buffer.svg";
			app.element("musicProgressBar").style.width = "0%";
			//app.element("musicTimeElapsed").innerHTML = app.element("musicTimeDuration").innerHTML = "";

			setTimeout(function () {
				app.element("musicArtwork").src = artwork;
				app.showBusy();

				music.duration = 0;
				music.stream = new Media(source, music.onComplete, music.onError, music.onMediaStatus);
				music.stream.play({playAudioWhenScreenIsLocked: true});
			}, 500);

			music.isPlaying = true;
			music.isExited = false;

			window.plugins.insomnia.keepAwake();
		});
	},

	onMediaStatus: function (status) {
		if (status === Media.MEDIA_STARTING || status === Media.MEDIA_NONE) {
			app.element("musicControl").src = "images/button_buffer.svg";
		}
		else if (status === Media.MEDIA_PAUSED) app.element("musicControl").src = "images/button_play.svg";
		else if (status === Media.MEDIA_RUNNING) {
			app.hideBusy();

			if (!music.duration) {
				setTimeout(function () {
					music.duration = music.stream.getDuration();
					music.interval = setInterval(music.onTimer, 100);

					if (app.platform === "IOS") {
						var info = {
							'title': music.title,
							'albumTitle': music.artiste,
							'artwork': music.artwork,
							'albumTrackCount': 1,
							'albumTrackNumber': 1,
							'playbackDuration': music.duration,
							'playbackPosition': 0,
							'playbackRate': 1.0, 

							/*these are used for the skip FW & BW events. It these are missing, the events are not handled and the skip buttons will not be shown in the lock screen.*/
							//'skipForwardValue':30,
							//'skipBackwardValue':30,
							/*set these to 1 if you want to handle the next/previous track events. 0: do not handle these events*/
							'receiveNextTrackEvent': 0,
							'receivePrevTrackEvent': 0
						};

						music.remoteInfo = new RemoteCmdPlayingInfo(info, music.remoteControlsEvent);
					}
					else if (app.platform === "ANDROID") {

					}
				}, 1000);
			}

			app.element("musicControl").src = "images/button_pause.svg";
		}
		else if (status === Media.MEDIA_STOPPED) app.hideBusy();
	},

	onComplete: function () {
		if (!music.isExited) {
			app.send(app.API + "music/", {case: "count", id: ads.selected.id, oauth: localStorage.oauth}, function () {}, true);
			
			music.exit();
		}
	},

	onError: function () {
		views.back();

		app.hideBusy();
		app.alert("Error Playing Music", "Is your connection okay? Please tap the music banner to try again.");
	},

	playPause: function () {
		if (music.isPlaying) music.pause();
		else music.resume();
	},

	pause: function () {
		music.stream.pause();
		music.isPlaying = false;

		clearInterval(music.interval);
	},

	resume: function () {
		music.stream.play();
		music.isPlaying = true;
		music.interval = setInterval(music.onTimer, 100);
	},

	onTimer: function () {
		if (music.duration) {
			music.stream.getCurrentPosition(function (position) {
				app.element("musicProgressBar").style.width = (position/music.duration*100) + "%";
				//app.element("musicTimeElapsed").innerHTML = music.formatTime(position);
			});
		}
		else {
			app.element("musicProgressBar").style.width = "0%";
			//app.element("musicTimeElapsed").innerHTML = "00:00";
		}
	},

	exit: function () {
		app.hideBusy();
		views.back(false, function () {}, true);

		clearInterval(music.interval);

		music.isPlaying = false;
		music.isExited = true;
		music.stream.release();

		window.plugins.insomnia.allowSleepAgain();

		if (app.platform === "IOS") remoteCmdPlayingInfo.release(1);
		else if (app.platform === "ANDROID") console.log(0);
	},

	like: function () {
		app.send(app.API + "music/", {case: "like", id: ads.selected.id, oauth: localStorage.oauth}, function () {}, true);
		app.element("musicLike").src = "images/button_like_active.svg";
	},

	share: function () {
		app.showBusy();
		app.send(app.API + "music/", {case: "share", id: ads.selected.id, oauth: localStorage.oauth}, function () {}, true);

		var options = {
			message: "I'm listening to " + music.title + " by " + music.artiste + " on Nairabox Music. Download the Nairabox app now at nairabox.com",
			subject: "Nairabox Music",
			files: [music.artwork]
		};

		window.plugins.socialsharing.shareWithOptions(options, function () {
			app.hideBusy();
			app.toast(app.generateShareMessage());
		}, app.hideBusy);
	},

	formatTime: function (time) {
		var str_pad_left = function (string) {
			return (new Array(3).join("0")+string).slice(-2);
		}

		var minutes = Math.floor(time / 60);
		var seconds = time - minutes * 60;
		
		return str_pad_left(minutes)+':'+str_pad_left(seconds);
	},

	remoteControlsEvent: function (event) {
		switch (event) {
			case RemoteCmdPlayingInfo.EVENT_PLAY:
				music.playPause();
			break;

			case RemoteCmdPlayingInfo.EVENT_PAUSE:
				music.playPause();
			break;

			case RemoteCmdPlayingInfo.EVENT_TOGGLE_PLAY_PAUSE:
				music.playPause();
			break;
		}
	}
};