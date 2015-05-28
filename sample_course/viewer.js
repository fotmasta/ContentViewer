var baseURL;

if (window.location.hostname == "localhost") {
	baseURL = "../completecourse/";
} else {
	baseURL = "https://s3.amazonaws.com/storefronts/streaming-video/completecourse/";
}

requirejs.config({
	baseUrl: baseURL + "js/"
});

require(["./manifest.js", "buildpage"], function (manifest, BuildPage) {
	BuildPage.build(manifest);
});