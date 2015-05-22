requirejs.config({
	baseUrl: "https://s3.amazonaws.com/storefronts/streaming-video/completecourse/js/",
	paths: {
		"jquery": "jquery-2.1.3.min",
	}
});

require(["buildpage"], function (BuildPage) {
	console.log("sample course main is here");

	console.log("Build page = " + BuildPage.build);
});