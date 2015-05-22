requirejs.config({
	baseUrl: "../completecourse/js",
});

require(["./manifest.js", "buildpage"], function (manifest, BuildPage) {
	BuildPage.build(manifest);
});