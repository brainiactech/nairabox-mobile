var sound = {
	start: function () {
		sound.defaultVolume = 0.65;

		if (app.platform === "IOS") {
			/*window.plugins.NativeAudio.preloadSimple('complete', 'assets/sounds/complete.mp3');
			window.plugins.NativeAudio.preloadSimple('beam', 'assets/sounds/beam.mp3');
			window.plugins.NativeAudio.preloadSimple('failed', 'assets/sounds/failed.mp3');*/
		}
		else sound.player = app.element("soundPlayer");
	},
	
	play: function (source, volume) {
		if (app.platform === "IOS") {
			//source = source.replace(".mp3", "");
			//window.plugins.NativeAudio.play(source);

			var sVol = volume || sound.defaultVolume;
			var media;

			media = new Media("assets/sounds/" + source, function () {
				media.release();
			});
			
			media.setVolume(sVol);
			media.play();
		}
		else {
			sound.player.src = "assets/sounds/" + source;
			sound.player.volume = volume || sound.defaultVolume;
			sound.player.play();
		}
	}
};