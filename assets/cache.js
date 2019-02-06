var cache = {
	download: function (uri, callback) {
		var fileName = uri.split("/").pop();
		var fileTransfer = new FileTransfer();
		var local = "cdvfile://localhost/persistent/" + fileName;

		fileTransfer.download(encodeURI(uri), local,
			function (entry) {
				var path = entry.toURL().replace("file://", "");
				localStorage[fileName] = path;
				if (callback) callback(path);
			},
			function (error) {
				console.log("download error code " + error.code);
			}
		);
	},

	get: function (uri, callback, overwrite) {
		if (!overwrite) {
			var fileName = uri.split("/").pop();
			if (localStorage[fileName]) {
				if (callback) return callback(localStorage[fileName]);
				else return localStorage[fileName];
			}
		}
		
		cache.download(uri, callback);
	}
};